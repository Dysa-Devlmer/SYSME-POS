/**
 * =====================================================
 * SYSME POS - Authentication & Authorization Middleware
 * =====================================================
 * JWT-based authentication and role-based authorization
 *
 * @module authMiddleware
 * @author JARVIS AI Assistant
 * @date 2025-11-20
 */

const jwt = require('jsonwebtoken');
const db = require('../config/database');
const logger = require('../utils/logger');

// Secret key from environment (use strong secret in production)
const JWT_SECRET = process.env.JWT_SECRET || 'sysme-pos-super-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Generate JWT access token
 * @param {Object} user - User object with id, username, role
 * @returns {String} JWT token
 */
const generateAccessToken = (user) => {
    const payload = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        type: 'access'
    };

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'sysme-pos',
        audience: 'sysme-pos-users'
    });
};

/**
 * Generate JWT refresh token
 * @param {Object} user - User object
 * @returns {String} Refresh token
 */
const generateRefreshToken = (user) => {
    const payload = {
        id: user.id,
        username: user.username,
        type: 'refresh'
    };

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_REFRESH_EXPIRES_IN,
        issuer: 'sysme-pos',
        audience: 'sysme-pos-users'
    });
};

/**
 * Generate both access and refresh tokens
 * @param {Object} user - User object
 * @returns {Object} { accessToken, refreshToken }
 */
const generateTokenPair = (user) => {
    return {
        accessToken: generateAccessToken(user),
        refreshToken: generateRefreshToken(user),
        expiresIn: JWT_EXPIRES_IN
    };
};

/**
 * Verify and decode JWT token
 * @param {String} token - JWT token
 * @returns {Object} Decoded payload
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET, {
            issuer: 'sysme-pos',
            audience: 'sysme-pos-users'
        });
    } catch (error) {
        throw error;
    }
};

/**
 * Middleware: Authenticate JWT token
 * Verifies token and attaches user info to request
 */
const authenticateToken = (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Token de autenticación requerido',
                code: 'NO_TOKEN'
            });
        }

        // Verify token
        const decoded = verifyToken(token);

        // Check if it's an access token
        if (decoded.type !== 'access') {
            return res.status(401).json({
                success: false,
                error: 'Token inválido',
                code: 'INVALID_TOKEN_TYPE'
            });
        }

        // Get fresh user data from database
        const user = db.prepare(`
            SELECT id, username, email, role, is_active
            FROM users
            WHERE id = ?
        `).get(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Usuario no encontrado',
                code: 'USER_NOT_FOUND'
            });
        }

        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                error: 'Usuario inactivo',
                code: 'USER_INACTIVE'
            });
        }

        // Attach user to request
        req.user = user;

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expirado',
                code: 'TOKEN_EXPIRED',
                expiredAt: error.expiredAt
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Token inválido',
                code: 'INVALID_TOKEN'
            });
        }

        logger.error('Error in authentication middleware:', error);
        return res.status(500).json({
            success: false,
            error: 'Error al autenticar',
            code: 'AUTH_ERROR'
        });
    }
};

/**
 * Middleware: Optional authentication
 * Attaches user if token is present and valid, but doesn't require it
 */
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            // No token, continue without user
            return next();
        }

        const decoded = verifyToken(token);

        if (decoded.type === 'access') {
            const user = db.prepare('SELECT id, username, email, role FROM users WHERE id = ? AND is_active = 1').get(decoded.id);
            if (user) {
                req.user = user;
            }
        }

        next();
    } catch (error) {
        // Token invalid, continue without user
        next();
    }
};

/**
 * Middleware: Authorize by role
 * @param {Array} allowedRoles - Array of allowed role names
 * @returns {Function} Middleware function
 */
const authorizeRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Autenticación requerida',
                code: 'AUTHENTICATION_REQUIRED'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            logger.warn(`Authorization failed for user ${req.user.username} (${req.user.role}). Required: ${allowedRoles.join(', ')}`);

            return res.status(403).json({
                success: false,
                error: 'No tiene permisos para realizar esta acción',
                code: 'INSUFFICIENT_PERMISSIONS',
                required: allowedRoles,
                current: req.user.role
            });
        }

        next();
    };
};

/**
 * Middleware: Authorize by permission
 * @param {Array} requiredPermissions - Array of required permissions
 * @returns {Function} Middleware function
 */
const authorizePermission = (requiredPermissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Autenticación requerida',
                code: 'AUTHENTICATION_REQUIRED'
            });
        }

        // Get user permissions from database
        const userPermissions = db.prepare(`
            SELECT p.name
            FROM permissions p
            INNER JOIN role_permissions rp ON p.id = rp.permission_id
            INNER JOIN users u ON rp.role_id = u.role_id
            WHERE u.id = ?
        `).all(req.user.id).map(p => p.name);

        // Check if user has all required permissions
        const hasAllPermissions = requiredPermissions.every(perm =>
            userPermissions.includes(perm)
        );

        if (!hasAllPermissions) {
            logger.warn(`Permission check failed for user ${req.user.username}. Required: ${requiredPermissions.join(', ')}`);

            return res.status(403).json({
                success: false,
                error: 'Permisos insuficientes',
                code: 'INSUFFICIENT_PERMISSIONS',
                required: requiredPermissions
            });
        }

        next();
    };
};

/**
 * Middleware: Rate limiting per user
 * @param {Number} maxRequests - Max requests per window
 * @param {Number} windowMs - Time window in milliseconds
 * @returns {Function} Middleware function
 */
const rateLimitPerUser = (maxRequests = 100, windowMs = 60000) => {
    const userRequests = new Map();

    return (req, res, next) => {
        if (!req.user) {
            return next();
        }

        const userId = req.user.id;
        const now = Date.now();

        if (!userRequests.has(userId)) {
            userRequests.set(userId, []);
        }

        const requests = userRequests.get(userId);

        // Remove old requests outside window
        const validRequests = requests.filter(timestamp => now - timestamp < windowMs);

        if (validRequests.length >= maxRequests) {
            return res.status(429).json({
                success: false,
                error: 'Demasiadas solicitudes',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000)
            });
        }

        validRequests.push(now);
        userRequests.set(userId, validRequests);

        // Clean up old entries periodically
        if (Math.random() < 0.01) { // 1% chance
            for (const [key, value] of userRequests.entries()) {
                if (value.length === 0 || now - value[value.length - 1] > windowMs) {
                    userRequests.delete(key);
                }
            }
        }

        next();
    };
};

/**
 * Middleware: Validate resource ownership
 * Ensures user can only access their own resources
 * @param {String} resourceIdParam - Parameter name containing resource ID
 * @param {String} ownerField - Field name in user object that identifies ownership
 * @returns {Function} Middleware function
 */
const validateOwnership = (resourceIdParam, ownerField = 'id') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Autenticación requerida',
                code: 'AUTHENTICATION_REQUIRED'
            });
        }

        const resourceId = req.params[resourceIdParam];
        const ownerId = req.user[ownerField];

        // Admin can access all resources
        if (req.user.role === 'admin') {
            return next();
        }

        if (parseInt(resourceId) !== parseInt(ownerId)) {
            return res.status(403).json({
                success: false,
                error: 'No tiene permisos para acceder a este recurso',
                code: 'RESOURCE_FORBIDDEN'
            });
        }

        next();
    };
};

module.exports = {
    // Token generation
    generateAccessToken,
    generateRefreshToken,
    generateTokenPair,
    verifyToken,

    // Middleware
    authenticateToken,
    optionalAuth,
    authorizeRole,
    authorizePermission,
    rateLimitPerUser,
    validateOwnership,

    // Constants
    JWT_SECRET,
    JWT_EXPIRES_IN,
    JWT_REFRESH_EXPIRES_IN
};
