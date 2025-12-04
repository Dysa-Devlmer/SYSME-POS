// web-interface/backend/auth-integration.cjs
// Integración del Auth Manager con Socket.io

const AuthManager = require('../../core/security/auth-manager.cjs');
const path = require('path');

/**
 * Integración de Authentication con Socket.io
 */
class AuthIntegration {
  constructor(io, options = {}) {
    this.io = io;
    this.options = options;
    this.authManager = null;
    this.isInitialized = false;
  }

  /**
   * Inicializa el auth manager
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('🔐 [Auth Integration] Inicializando...');

    this.authManager = new AuthManager({
      projectRoot: process.cwd(),
      usersFile: path.join(process.cwd(), 'config', 'users.json'),
      sessionsFile: path.join(process.cwd(), 'config', 'sessions.json'),
      auditFile: path.join(process.cwd(), 'logs', 'security-audit.log'),
      jwtExpiration: '24h',
      refreshExpiration: '7d',
      maxLoginAttempts: 5,
      lockoutDuration: 15 * 60 * 1000
    });

    await this.authManager.initialize();

    // Escuchar eventos
    this.setupEventListeners();

    this.isInitialized = true;
    console.log('✅ [Auth Integration] Listo');
  }

  /**
   * Setup de event listeners
   */
  setupEventListeners() {
    this.authManager.on('login', (data) => {
      this.io.emit('auth:login', data);
      console.log(`🔐 [Auth] Login: ${data.username}`);
    });

    this.authManager.on('logout', (data) => {
      this.io.emit('auth:logout', data);
      console.log(`🔐 [Auth] Logout: ${data.username}`);
    });

    this.authManager.on('user_created', (data) => {
      this.io.emit('auth:user-created', data);
      console.log(`👤 [Auth] Usuario creado: ${data.username}`);
    });

    this.authManager.on('user_updated', (data) => {
      this.io.emit('auth:user-updated', data);
      console.log(`✏️ [Auth] Usuario actualizado: ${data.username}`);
    });

    this.authManager.on('user_deleted', (data) => {
      this.io.emit('auth:user-deleted', data);
      console.log(`🗑️ [Auth] Usuario eliminado: ${data.username}`);
    });

    this.authManager.on('account_locked', (data) => {
      this.io.emit('auth:account-locked', data);
      console.log(`🔒 [Auth] Cuenta bloqueada: ${data.username}`);
    });
  }

  /**
   * Setup de handlers de socket
   */
  setupSocketHandlers(socket) {
    // Login
    socket.on('auth:login', async (data) => {
      try {
        if (!this.authManager) {
          throw new Error('Auth manager no disponible');
        }

        const { username, password } = data;

        console.log(`🔐 [Auth Integration] Login attempt: ${username}`);

        const result = await this.authManager.login(username, password, {
          ip: socket.handshake.address,
          userAgent: socket.handshake.headers['user-agent']
        });

        socket.emit('auth:login-success', result);

      } catch (error) {
        console.error('Error en login:', error);
        socket.emit('auth:login-error', { message: error.message });
      }
    });

    // Logout
    socket.on('auth:logout', async (sessionId) => {
      try {
        if (!this.authManager) {
          throw new Error('Auth manager no disponible');
        }

        await this.authManager.logout(sessionId, {
          ip: socket.handshake.address
        });

        socket.emit('auth:logout-success');

      } catch (error) {
        console.error('Error en logout:', error);
        socket.emit('auth:error', { message: error.message });
      }
    });

    // Verify token
    socket.on('auth:verify-token', (token) => {
      try {
        if (!this.authManager) {
          socket.emit('auth:token-invalid');
          return;
        }

        const decoded = this.authManager.verifyAccessToken(token);
        socket.emit('auth:token-valid', decoded);

      } catch (error) {
        socket.emit('auth:token-invalid');
      }
    });

    // Refresh token
    socket.on('auth:refresh-token', async (refreshToken) => {
      try {
        if (!this.authManager) {
          throw new Error('Auth manager no disponible');
        }

        const result = await this.authManager.refreshAccessToken(refreshToken);
        socket.emit('auth:token-refreshed', result);

      } catch (error) {
        console.error('Error refrescando token:', error);
        socket.emit('auth:error', { message: error.message });
      }
    });

    // Get users
    socket.on('auth:get-users', () => {
      try {
        if (!this.authManager) {
          socket.emit('auth:users', []);
          return;
        }

        const users = this.authManager.getUsers();
        socket.emit('auth:users', users);

      } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        socket.emit('auth:error', { message: error.message });
      }
    });

    // Get roles
    socket.on('auth:get-roles', () => {
      try {
        if (!this.authManager) {
          socket.emit('auth:roles', []);
          return;
        }

        const roles = this.authManager.getRoles();
        socket.emit('auth:roles', roles);

      } catch (error) {
        console.error('Error obteniendo roles:', error);
        socket.emit('auth:error', { message: error.message });
      }
    });

    // Get stats
    socket.on('auth:get-stats', () => {
      try {
        if (!this.authManager) {
          socket.emit('auth:stats', null);
          return;
        }

        const stats = this.authManager.getStats();
        socket.emit('auth:stats', stats);

      } catch (error) {
        console.error('Error obteniendo stats:', error);
        socket.emit('auth:error', { message: error.message });
      }
    });

    // Get sessions
    socket.on('auth:get-sessions', () => {
      try {
        if (!this.authManager) {
          socket.emit('auth:sessions', []);
          return;
        }

        const sessions = Array.from(this.authManager.sessions.values());
        socket.emit('auth:sessions', sessions);

      } catch (error) {
        console.error('Error obteniendo sesiones:', error);
        socket.emit('auth:error', { message: error.message });
      }
    });

    // Create user
    socket.on('auth:create-user', async (userData) => {
      try {
        if (!this.authManager) {
          throw new Error('Auth manager no disponible');
        }

        console.log('👤 [Auth Integration] Creando usuario:', userData.username);

        const user = await this.authManager.createUser(userData);

        socket.emit('auth:user-created', user);

      } catch (error) {
        console.error('Error creando usuario:', error);
        socket.emit('auth:error', { message: error.message });
      }
    });

    // Update user
    socket.on('auth:update-user', async (data) => {
      try {
        if (!this.authManager) {
          throw new Error('Auth manager no disponible');
        }

        const { username, updates } = data;

        console.log('✏️ [Auth Integration] Actualizando usuario:', username);

        const user = await this.authManager.updateUser(username, updates);

        socket.emit('auth:user-updated', user);

      } catch (error) {
        console.error('Error actualizando usuario:', error);
        socket.emit('auth:error', { message: error.message });
      }
    });

    // Delete user
    socket.on('auth:delete-user', async (username) => {
      try {
        if (!this.authManager) {
          throw new Error('Auth manager no disponible');
        }

        console.log('🗑️ [Auth Integration] Eliminando usuario:', username);

        await this.authManager.deleteUser(username);

        socket.emit('auth:user-deleted', { username });

      } catch (error) {
        console.error('Error eliminando usuario:', error);
        socket.emit('auth:error', { message: error.message });
      }
    });

    // Check permission
    socket.on('auth:check-permission', (data) => {
      try {
        if (!this.authManager) {
          socket.emit('auth:permission-result', { allowed: false });
          return;
        }

        const { user, permission } = data;

        const allowed = this.authManager.hasPermission(user, permission);

        socket.emit('auth:permission-result', { allowed });

      } catch (error) {
        console.error('Error verificando permiso:', error);
        socket.emit('auth:error', { message: error.message });
      }
    });
  }

  /**
   * Middleware de autenticación para Express
   */
  getExpressMiddleware() {
    return async (req, res, next) => {
      try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = this.authManager.verifyAccessToken(token);
        req.user = decoded;

        next();

      } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    };
  }

  /**
   * Middleware de autorización
   */
  requirePermission(permission) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!this.authManager.hasPermission(req.user, permission)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      next();
    };
  }

  /**
   * Obtiene el auth manager
   */
  getAuthManager() {
    return this.authManager;
  }
}

module.exports = AuthIntegration;
