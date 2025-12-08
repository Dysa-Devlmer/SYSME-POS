/**
 * Authentication Middleware
 * JWT-based authentication with Redis session management
 */

import jwt from 'jsonwebtoken';
import { logger, logSecurityEvent, logAuditEvent } from '../config/logger.js';
import { redisService } from '../config/redis.js';
import { dbService } from '../config/database.js';

// Verify JWT token
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl
      });
      
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if token is blacklisted
    const isBlacklisted = await redisService.exists(`blacklist:${token}`);
    if (isBlacklisted) {
      logSecurityEvent('BLACKLISTED_TOKEN_ATTEMPT', {
        userId: decoded.userId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json({
        success: false,
        error: 'Token has been revoked'
      });
    }
    
    // Get user from database
    const user = await dbService.findById('users', decoded.userId);
    if (!user) {
      logSecurityEvent('INVALID_USER_TOKEN', {
        userId: decoded.userId,
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        error: 'Invalid user token'
      });
    }
    
    // Check if user is active (handle both legacy and modern schema)
    const isActive = user.activo === 'S' || user.is_active === 1 || user.is_active === true;
    if (!isActive) {
      logSecurityEvent('INACTIVE_USER_ACCESS', {
        userId: user.id_usuario || user.id,
        username: user.login || user.username,
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        error: 'Account is disabled'
      });
    }
    
    // Check if user account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      logSecurityEvent('LOCKED_ACCOUNT_ACCESS', {
        userId: user.id_usuario,
        username: user.login,
        lockedUntil: user.locked_until,
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        error: 'Account is temporarily locked'
      });
    }
    
    // Update last activity (handle both schemas)
    const userId = user.id_usuario || user.id;
    await updateUserActivity(userId, req);

    // Add user to request object (handle both legacy and modern schema)
    req.user = {
      id: userId,
      username: user.login || user.username,
      email: user.e_mail || user.email,
      name: user.nombre || `${user.first_name} ${user.last_name}` || user.name,
      role: user.nivel || user.role,
      permissions: await getUserPermissions(userId)
    };
    
    next();
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logSecurityEvent('EXPIRED_TOKEN_ACCESS', {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json({
        success: false,
        error: 'Token has expired'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      logSecurityEvent('INVALID_TOKEN_ACCESS', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        error: error.message
      });
      
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    logger.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication service error'
    });
  }
};

// Optional authentication (for public endpoints that can use auth if available)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }
    
    // Use the authenticate middleware
    await authenticate(req, res, next);
  } catch (error) {
    // If authentication fails, continue without user
    req.user = null;
    next();
  }
};

// Role-based authorization
export const authorize = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    const userRole = req.user.role;
    const allowedRoles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    
    if (!allowedRoles.includes(userRole)) {
      logSecurityEvent('UNAUTHORIZED_ROLE_ACCESS', {
        userId: req.user.id,
        username: req.user.username,
        userRole: userRole,
        requiredRoles: allowedRoles,
        url: req.originalUrl,
        ip: req.ip
      });
      
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }
    
    next();
  };
};

// Permission-based authorization
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    if (!req.user.permissions.includes(permission)) {
      logSecurityEvent('PERMISSION_DENIED', {
        userId: req.user.id,
        username: req.user.username,
        requiredPermission: permission,
        userPermissions: req.user.permissions,
        url: req.originalUrl,
        ip: req.ip
      });
      
      return res.status(403).json({
        success: false,
        error: `Permission required: ${permission}`
      });
    }
    
    next();
  };
};

// Rate limiting by user
export const userRateLimit = (maxRequests = 1000, windowInSeconds = 3600) => {
  return async (req, res, next) => {
    if (!req.user) {
      return next();
    }
    
    const key = `rate_limit:user:${req.user.id}`;
    const result = await redisService.rateLimitCheck(key, maxRequests, windowInSeconds);
    
    if (!result.allowed) {
      logSecurityEvent('USER_RATE_LIMIT_EXCEEDED', {
        userId: req.user.id,
        username: req.user.username,
        ip: req.ip,
        maxRequests,
        windowInSeconds
      });
      
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        resetIn: result.resetIn
      });
    }
    
    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': result.remaining,
      'X-RateLimit-Reset': new Date(Date.now() + result.resetIn * 1000).toISOString()
    });
    
    next();
  };
};

// Helper function to update user activity
async function updateUserActivity(userId, req) {
  try {
    // Update last activity in database
    await dbService.update('users', userId, {
      last_login_at: new Date(),
      last_login_ip: req.ip
    });
    
    // Store activity in Redis for real-time tracking
    await redisService.set(`user_activity:${userId}`, {
      lastActive: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }, 86400); // 24 hours
    
  } catch (error) {
    logger.error('Failed to update user activity:', error);
  }
}

// Helper function to get user permissions
async function getUserPermissions(userId) {
  try {
    // Check cache first
    const cacheKey = `user_permissions:${userId}`;
    const cached = await redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    let permissionList = [];

    try {
      // Try modern schema first (users table with JSON permissions)
      const user = await dbService.findById('users', userId);
      if (user && user.permissions) {
        const permissions = typeof user.permissions === 'string'
          ? JSON.parse(user.permissions)
          : user.permissions;

        // Convert object permissions to array
        permissionList = Object.keys(permissions).filter(key => permissions[key] === true);
      }
    } catch (modernError) {
      // Fall back to legacy schema
      logger.warn('Modern permissions failed, trying legacy schema');

      try {
        const permissions = await dbService.raw(`
          SELECT DISTINCT p.codigo_privilegio as permission
          FROM usuario u
          JOIN usu_gru ug ON u.id_usuario = ug.id_usuario
          JOIN grupo g ON ug.id_grupo = g.id_grupo
          JOIN gru_pri_a gpa ON g.id_grupo = gpa.id_grupo
          JOIN privilegios_a p ON gpa.id_privilegio = p.id_privilegio
          WHERE u.id_usuario = ? AND u.activo = 'S' AND g.activo = 'S'
        `, [userId]);

        permissionList = permissions.map(row => row.permission);
      } catch (legacyError) {
        logger.error('Failed to get permissions from legacy schema:', legacyError);
      }
    }

    // Cache permissions for 1 hour
    await redisService.set(cacheKey, permissionList, 3600);

    return permissionList;

  } catch (error) {
    logger.error('Failed to get user permissions:', error);
    return [];
  }
}

// Generate JWT token
export function generateToken(user, expiresIn = '24h') {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn }
  );
}

// Generate refresh token
export function generateRefreshToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      type: 'refresh'
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
}

// Blacklist token
export async function blacklistToken(token, expiresIn = 86400) {
  try {
    await redisService.set(`blacklist:${token}`, true, expiresIn);
    return true;
  } catch (error) {
    logger.error('Failed to blacklist token:', error);
    return false;
  }
}

// Alias for backward compatibility
export const optionalAuthenticate = optionalAuth;

export default {
  authenticate,
  optionalAuth,
  optionalAuthenticate,
  authorize,
  requirePermission,
  userRateLimit,
  generateToken,
  generateRefreshToken,
  blacklistToken
};