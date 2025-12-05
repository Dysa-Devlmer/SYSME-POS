/**
 * =====================================================
 * SYSME POS - Authentication Routes
 * =====================================================
 * Rutas para autenticación y gestión de usuarios
 *
 * @module authRoutes
 * @author JARVIS AI Assistant
 * @date 2025-11-20
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, authorizeRole, rateLimitPerUser } = require('../middleware/auth');

// ====================================
// PUBLIC ROUTES (No authentication required)
// ====================================

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 * @body    { username, email, password, full_name, role }
 */
router.post('/register', authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and get tokens
 * @access  Public
 * @body    { username, password }
 * @returns { user, accessToken, refreshToken }
 */
router.post('/login', authController.login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 * @body    { refreshToken }
 * @returns { accessToken }
 */
router.post('/refresh', authController.refreshToken);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 * @body    { email }
 */
router.post('/forgot-password', authController.forgotPassword);

// ====================================
// PROTECTED ROUTES (Authentication required)
// ====================================

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info
 * @access  Private
 * @returns { user }
 */
router.get('/me', authenticateToken, authController.getCurrentUser);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password for current user
 * @access  Private
 * @body    { currentPassword, newPassword }
 */
router.post('/change-password', authenticateToken, authController.changePassword);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout current user
 * @access  Private
 */
router.post('/logout', authenticateToken, authController.logout);

// ====================================
// ADMIN ROUTES (Admin only)
// ====================================

/**
 * @route   GET /api/auth/users
 * @desc    Get all users (admin only)
 * @access  Private (Admin)
 */
router.get('/users',
    authenticateToken,
    authorizeRole(['admin']),
    (req, res) => {
        const db = require('../config/database');
        const users = db.prepare('SELECT id, username, email, full_name, role, is_active, created_at, last_login FROM users').all();
        res.json({ success: true, data: users });
    }
);

/**
 * @route   PUT /api/auth/users/:id/role
 * @desc    Update user role (admin only)
 * @access  Private (Admin)
 */
router.put('/users/:id/role',
    authenticateToken,
    authorizeRole(['admin']),
    (req, res) => {
        const db = require('../config/database');
        const { id } = req.params;
        const { role } = req.body;

        const validRoles = ['admin', 'manager', 'chef', 'cashier', 'waiter'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ success: false, error: 'Invalid role' });
        }

        db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
        res.json({ success: true, message: 'Role updated successfully' });
    }
);

/**
 * @route   PUT /api/auth/users/:id/status
 * @desc    Activate/deactivate user (admin only)
 * @access  Private (Admin)
 */
router.put('/users/:id/status',
    authenticateToken,
    authorizeRole(['admin']),
    (req, res) => {
        const db = require('../config/database');
        const { id } = req.params;
        const { is_active } = req.body;

        db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(is_active ? 1 : 0, id);
        res.json({ success: true, message: 'User status updated successfully' });
    }
);

module.exports = router;
