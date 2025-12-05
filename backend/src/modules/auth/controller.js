/**
 * Authentication Controller
 * Handles user authentication, registration, and profile management
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { dbService } from '../../config/database.js';
import { redisService } from '../../config/redis.js';
import { logger, logAuditEvent, logSecurityEvent } from '../../config/logger.js';
import {
  generateToken,
  generateRefreshToken,
  blacklistToken
} from '../../middleware/auth.js';
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ConflictError,
  NotFoundError
} from '../../middleware/errorHandler.js';

// POS Login (Employee selection + PIN) - Replicates legacy behavior
export const posLogin = async (req, res) => {
  const { employee_id, pin } = req.body;
  const ip = req.ip;
  const userAgent = req.get('User-Agent');

  try {
    let employee;

    // If employee_id provided, search by ID (legacy behavior)
    if (employee_id) {
      employee = await dbService.raw(`
        SELECT
          id,
          username,
          email,
          (first_name || ' ' || last_name) as name,
          role,
          pin_code,
          is_active as active,
          permissions,
          assigned_tpv,
          assigned_almacen
        FROM users
        WHERE id = ? AND is_active = 1 AND pin_code IS NOT NULL
      `, [employee_id]);
    } else {
      // New simplified behavior: search only by PIN among active employees
      employee = await dbService.raw(`
        SELECT
          id,
          username,
          email,
          (first_name || ' ' || last_name) as name,
          role,
          pin_code,
          is_active as active,
          permissions,
          assigned_tpv,
          assigned_almacen
        FROM users
        WHERE is_active = 1 AND pin_code IS NOT NULL AND role = 'waiter'
      `);
    }

    if (!employee.length) {
      logSecurityEvent('POS_LOGIN_FAILED', { employee_id, pin: '***', ip, reason: 'Employee not found' });
      throw new UnauthorizedError('Invalid PIN or employee not found');
    }

    // If searching by PIN only, verify against all active employees
    let user = null;
    if (!employee_id) {
      for (const emp of employee) {
        const isPinValid = await bcrypt.compare(pin.toString(), emp.pin_code);
        if (isPinValid) {
          user = emp;
          break;
        }
      }

      if (!user) {
        logSecurityEvent('POS_LOGIN_FAILED', { pin: '***', ip, reason: 'Invalid PIN' });
        throw new UnauthorizedError('Invalid PIN');
      }
    } else {
      user = employee[0];

      // Verify PIN (equivalent to clavecamarero in legacy)
      const isPinValid = await bcrypt.compare(pin.toString(), user.pin_code);
      if (!isPinValid) {
        logSecurityEvent('POS_LOGIN_FAILED', { employee_id, ip, reason: 'Invalid PIN' });
        throw new UnauthorizedError('Invalid PIN');
      }
    }

    // Generate tokens with correct user structure for modern schema
    const tokenUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    const token = generateToken(tokenUser);
    const refreshToken = generateRefreshToken(user.id);

    // Store session in cache (replicating PHP session behavior)
    const sessionData = {
      user_id: user.id,
      employee_name: user.name,
      role: user.role,
      permissions: JSON.parse(user.permissions || '{}'),
      assigned_tpv: user.assigned_tpv || 'TPV1',
      assigned_almacen: user.assigned_almacen || 'Local',
      login_time: new Date(),
      ip_address: ip,
      user_agent: userAgent
    };

    await redisService.set(`pos_session:${user.id}`, sessionData, 8 * 60 * 60); // 8 hours

    // Log successful login
    logAuditEvent('POS_LOGIN_SUCCESS', user.id, { ip, userAgent, tpv: user.assigned_tpv });

    res.json({
      success: true,
      message: 'POS login successful',
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        permissions: JSON.parse(user.permissions || '{}'),
        assigned_tpv: user.assigned_tpv,
        assigned_almacen: user.assigned_almacen
      }
    });

  } catch (error) {
    logger.error('POS login error:', error);

    if (error instanceof UnauthorizedError) {
      return res.status(401).json({
        success: false,
        message: error.message
      });
    }

    throw error;
  }
};

// Get POS employees list (for selection screen)
export const getPosEmployees = async (req, res) => {
  try {
    const employees = await dbService.raw(`
      SELECT
        id,
        (first_name || ' ' || last_name) as name,
        role,
        is_active as active,
        assigned_tpv
      FROM users
      WHERE is_active = 1 AND pin_code IS NOT NULL
      ORDER BY first_name ASC
    `);

    res.json({
      success: true,
      employees: employees
    });

  } catch (error) {
    logger.error('Error fetching POS employees:', error);
    throw error;
  }
};

// Login user (traditional web login)
export const login = async (req, res) => {
  const { username, password, rememberMe } = req.body;
  const ip = req.ip;
  const userAgent = req.get('User-Agent');

  try {
    // Find user by username or email
    const user = await dbService.findByField('users', 'username', username) ||
                  await dbService.findByField('users', 'email', username);

    if (!user) {
      // Log failed login attempt
      await logFailedLoginAttempt(ip, username, 'User not found');
      
      logSecurityEvent('LOGIN_FAILED', {
        username,
        ip,
        userAgent,
        reason: 'User not found'
      });
      
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      logSecurityEvent('LOGIN_ATTEMPT_LOCKED_ACCOUNT', {
        userId: user.id,
        username: user.username,
        ip,
        userAgent,
        lockedUntil: user.locked_until
      });
      
      throw new UnauthorizedError('Account is temporarily locked due to too many failed attempts');
    }

    // Check if user is active
    if (user.is_active !== 1) {
      logSecurityEvent('LOGIN_ATTEMPT_INACTIVE_ACCOUNT', {
        userId: user.id,
        username: user.username,
        ip,
        userAgent
      });
      
      throw new UnauthorizedError('Account is disabled');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      await handleFailedLogin(user.id, ip, username);
      
      logSecurityEvent('LOGIN_FAILED', {
        userId: user.id,
        username: user.username,
        ip,
        userAgent,
        reason: 'Invalid password'
      });
      
      throw new UnauthorizedError('Invalid credentials');
    }

    // Reset failed attempts on successful login
    await resetFailedAttempts(user.id);

    // Generate tokens
    const tokenExpiry = rememberMe ? '30d' : '24h';
    const accessToken = generateToken(user, tokenExpiry);
    const refreshToken = generateRefreshToken(user);

    // Update user login info
    await dbService.update('users', user.id, {
      last_login_at: new Date(),
      last_login_ip: ip,
      failed_login_attempts: 0,
      locked_until: null
    });

    // Store refresh token in Redis
    await redisService.set(
      `refresh_token:${user.id}`, 
      refreshToken, 
      30 * 24 * 3600 // 30 days
    );

    // Store session information
    const sessionId = crypto.randomUUID();
    await redisService.set(`session:${sessionId}`, {
      userId: user.id,
      username: user.username,
      ip,
      userAgent,
      createdAt: new Date().toISOString()
    }, 86400); // 24 hours

    // Log successful login
    logAuditEvent('LOGIN_SUCCESS', user, {
      ip,
      userAgent,
      sessionId
    });

    logSecurityEvent('LOGIN_SUCCESS', {
      userId: user.id,
      username: user.username,
      ip,
      userAgent
    });

    // Return user data without sensitive information
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      name: `${user.first_name} ${user.last_name}`,
      role: user.role,
      language: 'es',
      lastLogin: user.last_login_at,
      sessionId
    };

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userData,
        accessToken,
        refreshToken,
        expiresIn: rememberMe ? '30d' : '24h'
      }
    });

  } catch (error) {
    logger.error('Login error:', error);
    throw error;
  }
};

// Register new user
export const register = async (req, res) => {
  const { username, email, password, name, phone, role } = req.body;
  const ip = req.ip;

  try {
    // Check if user already exists
    const existingUser = await dbService.findByField('users', 'username', username);
    if (existingUser) {
      throw new ConflictError('Username already exists');
    }

    const existingEmail = await dbService.findByField('users', 'email', email);
    if (existingEmail) {
      throw new ConflictError('Email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);

    // Parse name into first_name and last_name
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    // Create user with CORRECT schema (modern table structure)
    const userData = {
      username: username,
      email: email,
      password: passwordHash,
      first_name: firstName,
      last_name: lastName,
      phone: phone || null,
      role: role || 'waiter',
      is_active: 1,
      language: 'es',
      created_at: new Date(),
      updated_at: new Date()
    };

    const newUser = await dbService.create('users', userData);

    // Log user registration
    logAuditEvent('USER_REGISTERED', newUser, {
      ip,
      registeredBy: 'self'
    });

    // Generate welcome tokens
    const accessToken = generateToken(newUser);
    const refreshToken = generateRefreshToken(newUser);

    // Store refresh token
    await redisService.set(
      `refresh_token:${newUser.id}`,
      refreshToken,
      30 * 24 * 3600
    );

    const userData_response = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      name: `${newUser.first_name} ${newUser.last_name}`.trim(),
      role: newUser.role
    };

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: userData_response,
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    logger.error('Registration error:', error);
    throw error;
  }
};

// Logout user
export const logout = async (req, res) => {
  const { user } = req;
  const authHeader = req.headers.authorization;
  const token = authHeader?.substring(7);

  try {
    // Blacklist the current token
    if (token) {
      await blacklistToken(token, 86400);
    }

    // Remove refresh token
    await redisService.del(`refresh_token:${user.id}`);

    // Remove all user sessions
    await redisService.invalidatePattern(`session:*:${user.id}`);

    // Log logout
    logAuditEvent('LOGOUT', user, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    logger.error('Logout error:', error);
    throw error;
  }
};

// Refresh access token
export const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ValidationError('Refresh token is required');
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    if (decoded.type !== 'refresh') {
      throw new UnauthorizedError('Invalid token type');
    }

    // Check if refresh token exists in Redis
    const storedToken = await redisService.get(`refresh_token:${decoded.userId}`);
    if (!storedToken || storedToken !== refreshToken) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Get user
    const user = await dbService.findById('users', decoded.userId);
    if (!user || user.is_active !== 1) {
      throw new UnauthorizedError('Invalid user');
    }

    // Generate new access token
    const newAccessToken = generateToken(user);

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        expiresIn: '24h'
      }
    });

  } catch (error) {
    logger.error('Token refresh error:', error);
    throw new UnauthorizedError('Invalid refresh token');
  }
};

// Get user profile
export const getProfile = async (req, res) => {
  const { user } = req;

  try {
    // Get fresh user data
    const userData = await dbService.findById('users', user.id);

    if (!userData) {
      throw new NotFoundError('User');
    }

    const profile = {
      id: userData.id,
      username: userData.username,
      email: userData.email,
      name: `${userData.first_name} ${userData.last_name}`.trim(),
      firstName: userData.first_name,
      lastName: userData.last_name,
      phone: userData.phone,
      role: userData.role,
      language: userData.language,
      lastLogin: userData.last_login_at,
      lastLoginIp: userData.last_login_ip,
      twoFactorEnabled: userData.two_factor_enabled === 1,
      createdAt: userData.created_at
    };

    res.json({
      success: true,
      data: { user: profile }
    });

  } catch (error) {
    logger.error('Get profile error:', error);
    throw error;
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  const { user } = req;
  const updateData = req.body;

  try {
    // Remove sensitive fields
    delete updateData.password;
    delete updateData.role;
    delete updateData.id;

    // Map field names if using old schema names in request
    const mappedData = {};
    if (updateData.first_name) mappedData.first_name = updateData.first_name;
    if (updateData.last_name) mappedData.last_name = updateData.last_name;
    if (updateData.firstName) mappedData.first_name = updateData.firstName;
    if (updateData.lastName) mappedData.last_name = updateData.lastName;
    if (updateData.email) mappedData.email = updateData.email;
    if (updateData.phone) mappedData.phone = updateData.phone;
    if (updateData.language) mappedData.language = updateData.language;

    // Update user
    const updatedUser = await dbService.update('users', user.id, {
      ...mappedData,
      updated_at: new Date()
    });

    logAuditEvent('PROFILE_UPDATED', user, {
      updatedFields: Object.keys(mappedData),
      ip: req.ip
    });

    const profile = {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      name: `${updatedUser.first_name} ${updatedUser.last_name}`.trim(),
      firstName: updatedUser.first_name,
      lastName: updatedUser.last_name,
      phone: updatedUser.phone,
      language: updatedUser.language
    };

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: profile }
    });

  } catch (error) {
    logger.error('Update profile error:', error);
    throw error;
  }
};

// Change password
export const changePassword = async (req, res) => {
  const { user } = req;
  const { currentPassword, newPassword } = req.body;

  try {
    // Get current user data
    const userData = await dbService.findById('users', user.id);
    if (!userData) {
      throw new NotFoundError('User');
    }

    // Verify current password
    const isValidPassword = userData.password_hash 
      ? await bcrypt.compare(currentPassword, userData.password_hash)
      : userData.password === currentPassword;

    if (!isValidPassword) {
      logSecurityEvent('PASSWORD_CHANGE_FAILED', {
        userId: user.id,
        username: user.username,
        ip: req.ip,
        reason: 'Invalid current password'
      });
      
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);

    // Update password
    await dbService.update('users', user.id, {
      password_hash: newPasswordHash,
      password: '', // Clear old password
      updated_at: new Date()
    });

    // Invalidate all refresh tokens
    await redisService.del(`refresh_token:${user.id}`);

    logAuditEvent('PASSWORD_CHANGED', user, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    logSecurityEvent('PASSWORD_CHANGED', {
      userId: user.id,
      username: user.username,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    logger.error('Change password error:', error);
    throw error;
  }
};

// Placeholder functions for 2FA and other features
export const forgotPassword = async (req, res) => {
  res.json({ success: true, message: 'Password reset email sent (placeholder)' });
};

export const resetPassword = async (req, res) => {
  res.json({ success: true, message: 'Password reset successful (placeholder)' });
};

export const getUserSessions = async (req, res) => {
  res.json({ success: true, data: { sessions: [] } });
};

export const revokeSession = async (req, res) => {
  res.json({ success: true, message: 'Session revoked (placeholder)' });
};

export const enable2FA = async (req, res) => {
  res.json({ success: true, message: '2FA enabled (placeholder)' });
};

export const verify2FA = async (req, res) => {
  res.json({ success: true, message: '2FA verified (placeholder)' });
};

export const disable2FA = async (req, res) => {
  res.json({ success: true, message: '2FA disabled (placeholder)' });
};

// Helper functions
async function logFailedLoginAttempt(ip, username, reason) {
  try {
    await dbService.create('login_attempts', {
      ip_address: ip,
      username,
      success: false,
      created_at: new Date()
    });
  } catch (error) {
    logger.error('Failed to log login attempt:', error);
  }
}

async function handleFailedLogin(userId, ip, username) {
  try {
    // Increment failed attempts
    const user = await dbService.findById('users', userId);
    const attempts = (user.failed_login_attempts || 0) + 1;
    const maxAttempts = 5;
    
    let updateData = {
      failed_login_attempts: attempts,
      updated_at: new Date()
    };

    // Lock account if max attempts reached
    if (attempts >= maxAttempts) {
      const lockDuration = 15 * 60 * 1000; // 15 minutes
      updateData.locked_until = new Date(Date.now() + lockDuration);
    }

    await dbService.update('users', userId, updateData);
    await logFailedLoginAttempt(ip, username, 'Invalid password');

  } catch (error) {
    logger.error('Failed to handle failed login:', error);
  }
}

async function resetFailedAttempts(userId) {
  try {
    await dbService.update('users', userId, {
      failed_login_attempts: 0,
      locked_until: null,
      updated_at: new Date()
    });
  } catch (error) {
    logger.error('Failed to reset login attempts:', error);
  }
}