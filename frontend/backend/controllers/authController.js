/**
 * =====================================================
 * SYSME POS - Authentication Controller
 * =====================================================
 * Handles user authentication, registration, and token management
 *
 * @module authController
 * @author JARVIS AI Assistant
 * @date 2025-11-20
 */

const bcrypt = require('bcryptjs');
const db = require('../config/database');
const logger = require('../utils/logger');
const {
    generateTokenPair,
    verifyToken,
    generateAccessToken
} = require('../middleware/auth');

// Salt rounds for bcrypt
const SALT_ROUNDS = 10;

/**
 * Register new user
 * POST /api/auth/register
 */
exports.register = async (req, res) => {
    try {
        const {
            username,
            email,
            password,
            full_name,
            role = 'cashier'
        } = req.body;

        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username, email y password son requeridos'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Formato de email inválido'
            });
        }

        // Validate password strength
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'La contraseña debe tener al menos 8 caracteres'
            });
        }

        // Check if user exists
        const existingUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);

        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'Usuario o email ya existe'
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Create user
        const stmt = db.prepare(`
            INSERT INTO users (username, email, password_hash, full_name, role, is_active)
            VALUES (?, ?, ?, ?, ?, 1)
        `);

        const result = stmt.run(username, email, passwordHash, full_name, role);

        // Get created user
        const user = db.prepare('SELECT id, username, email, full_name, role FROM users WHERE id = ?').get(result.lastInsertRowid);

        // Generate tokens
        const tokens = generateTokenPair(user);

        logger.info(`New user registered: ${username}`);

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            user,
            ...tokens
        });

    } catch (error) {
        logger.error('Error in register:', error);
        res.status(500).json({
            success: false,
            error: 'Error al registrar usuario',
            details: error.message
        });
    }
};

/**
 * Login user
 * POST /api/auth/login
 */
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validation
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username y password son requeridos'
            });
        }

        // Get user (allow login with username or email)
        const user = db.prepare(`
            SELECT id, username, email, password_hash, full_name, role, is_active
            FROM users
            WHERE username = ? OR email = ?
        `).get(username, username);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Credenciales inválidas',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Check if user is active
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                error: 'Usuario inactivo',
                code: 'USER_INACTIVE'
            });
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            // Log failed attempt
            logger.warn(`Failed login attempt for user: ${username}`);

            return res.status(401).json({
                success: false,
                error: 'Credenciales inválidas',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Remove password hash from response
        delete user.password_hash;

        // Generate tokens
        const tokens = generateTokenPair(user);

        // Update last login
        db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

        logger.info(`User logged in: ${username}`);

        res.json({
            success: true,
            message: 'Login exitoso',
            user,
            ...tokens
        });

    } catch (error) {
        logger.error('Error in login:', error);
        res.status(500).json({
            success: false,
            error: 'Error al iniciar sesión',
            details: error.message
        });
    }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: 'Refresh token requerido'
            });
        }

        // Verify refresh token
        const decoded = verifyToken(refreshToken);

        if (decoded.type !== 'refresh') {
            return res.status(401).json({
                success: false,
                error: 'Token inválido',
                code: 'INVALID_TOKEN_TYPE'
            });
        }

        // Get user
        const user = db.prepare(`
            SELECT id, username, email, full_name, role, is_active
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

        // Generate new access token
        const accessToken = generateAccessToken(user);

        res.json({
            success: true,
            accessToken
        });

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Refresh token expirado',
                code: 'TOKEN_EXPIRED'
            });
        }

        logger.error('Error in refresh token:', error);
        res.status(500).json({
            success: false,
            error: 'Error al refrescar token',
            details: error.message
        });
    }
};

/**
 * Get current user info
 * GET /api/auth/me
 */
exports.getCurrentUser = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'No autenticado'
            });
        }

        // Get full user details
        const user = db.prepare(`
            SELECT id, username, email, full_name, role, is_active, created_at, last_login
            FROM users
            WHERE id = ?
        `).get(req.user.id);

        res.json({
            success: true,
            user
        });

    } catch (error) {
        logger.error('Error getting current user:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener usuario',
            details: error.message
        });
    }
};

/**
 * Change password
 * POST /api/auth/change-password
 */
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Current password y new password son requeridos'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'La nueva contraseña debe tener al menos 8 caracteres'
            });
        }

        // Get current user with password hash
        const user = db.prepare('SELECT id, password_hash FROM users WHERE id = ?').get(req.user.id);

        // Verify current password
        const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                error: 'Contraseña actual incorrecta'
            });
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        // Update password
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newPasswordHash, user.id);

        logger.info(`Password changed for user: ${req.user.username}`);

        res.json({
            success: true,
            message: 'Contraseña actualizada exitosamente'
        });

    } catch (error) {
        logger.error('Error changing password:', error);
        res.status(500).json({
            success: false,
            error: 'Error al cambiar contraseña',
            details: error.message
        });
    }
};

/**
 * Logout (optional - for token blacklisting)
 * POST /api/auth/logout
 */
exports.logout = async (req, res) => {
    try {
        // In a production system, you would:
        // 1. Add token to blacklist/revocation list
        // 2. Store in Redis with expiration
        // 3. Clear any session data

        logger.info(`User logged out: ${req.user?.username || 'unknown'}`);

        res.json({
            success: true,
            message: 'Logout exitoso'
        });

    } catch (error) {
        logger.error('Error in logout:', error);
        res.status(500).json({
            success: false,
            error: 'Error al cerrar sesión',
            details: error.message
        });
    }
};

/**
 * Request password reset (would send email in production)
 * POST /api/auth/forgot-password
 */
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email es requerido'
            });
        }

        const user = db.prepare('SELECT id, username, email FROM users WHERE email = ?').get(email);

        // Don't reveal if email exists (security)
        if (!user) {
            return res.json({
                success: true,
                message: 'Si el email existe, recibirás instrucciones para resetear tu contraseña'
            });
        }

        // In production, you would:
        // 1. Generate reset token
        // 2. Store in database with expiration
        // 3. Send email with reset link

        logger.info(`Password reset requested for: ${email}`);

        res.json({
            success: true,
            message: 'Si el email existe, recibirás instrucciones para resetear tu contraseña'
        });

    } catch (error) {
        logger.error('Error in forgot password:', error);
        res.status(500).json({
            success: false,
            error: 'Error al procesar solicitud',
            details: error.message
        });
    }
};

module.exports = exports;
