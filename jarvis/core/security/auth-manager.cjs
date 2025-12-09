// core/security/auth-manager.cjs
// Sistema de Autenticación y Autorización

const EventEmitter = require('events');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

/**
 * Authentication Manager
 *
 * Sistema completo de autenticación y autorización
 *
 * Características:
 * - Login/Logout con JWT tokens
 * - User management con roles
 * - Password hashing con bcrypt
 * - Session management
 * - Role-based access control (RBAC)
 * - Audit logging
 */
class AuthManager extends EventEmitter {
  constructor(options = {}) {
    super();

    this.projectRoot = options.projectRoot || process.cwd();
    this.usersFile = options.usersFile || path.join(this.projectRoot, 'config', 'users.json');
    this.sessionsFile = options.sessionsFile || path.join(this.projectRoot, 'config', 'sessions.json');
    this.auditFile = options.auditFile || path.join(this.projectRoot, 'logs', 'security-audit.log');

    // JWT configuration
    this.jwtSecret = options.jwtSecret || this.generateSecret();
    this.jwtExpiration = options.jwtExpiration || '24h';
    this.refreshExpiration = options.refreshExpiration || '7d';

    // Security configuration
    this.maxLoginAttempts = options.maxLoginAttempts || 5;
    this.lockoutDuration = options.lockoutDuration || 15 * 60 * 1000; // 15 minutos
    this.sessionTimeout = options.sessionTimeout || 24 * 60 * 60 * 1000; // 24 horas

    // Estado
    this.users = new Map();
    this.sessions = new Map();
    this.loginAttempts = new Map();
    this.lockedAccounts = new Map();

    // Roles y permisos
    this.roles = {
      admin: {
        name: 'Admin',
        permissions: ['*'] // Todos los permisos
      },
      developer: {
        name: 'Developer',
        permissions: [
          'autonomous:execute',
          'code:search',
          'code:read',
          'docs:generate',
          'tasks:create',
          'tasks:execute',
          'logs:read',
          'settings:read',
          'settings:write',
          'backup:create',
          'backup:restore',
          'tests:run'
        ]
      },
      viewer: {
        name: 'Viewer',
        permissions: [
          'code:search',
          'code:read',
          'docs:read',
          'tasks:read',
          'logs:read',
          'settings:read'
        ]
      },
      guest: {
        name: 'Guest',
        permissions: [
          'code:read',
          'docs:read'
        ]
      }
    };

    this.isInitialized = false;
  }

  /**
   * Genera un secret para JWT
   */
  generateSecret() {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Inicializa el auth manager
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('🔐 [Auth Manager] Inicializando...');

    // Asegurar directorios
    await fs.ensureDir(path.dirname(this.usersFile));
    await fs.ensureDir(path.dirname(this.sessionsFile));
    await fs.ensureDir(path.dirname(this.auditFile));

    // Cargar usuarios
    await this.loadUsers();

    // Crear usuario admin por defecto si no existe
    if (this.users.size === 0) {
      await this.createDefaultAdmin();
    }

    // Cargar sesiones
    await this.loadSessions();

    // Cleanup de sesiones expiradas
    this.startSessionCleanup();

    this.isInitialized = true;
    console.log('✅ [Auth Manager] Sistema de seguridad listo');
    console.log(`   👥 Usuarios: ${this.users.size}`);

    this.emit('initialized');
  }

  /**
   * Crea el usuario admin por defecto
   */
  async createDefaultAdmin() {
    console.log('🔧 [Auth Manager] Creando usuario admin por defecto...');

    const defaultPassword = 'jarvis2024';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const admin = {
      id: 'admin',
      username: 'admin',
      email: 'admin@jarvis.local',
      password: hashedPassword,
      role: 'admin',
      enabled: true,
      createdAt: Date.now(),
      lastLogin: null,
      mustChangePassword: true
    };

    this.users.set('admin', admin);
    await this.saveUsers();

    console.log('✅ [Auth Manager] Usuario admin creado');
    console.log('   👤 Username: admin');
    console.log('   🔑 Password: jarvis2024');
    console.log('   ⚠️  IMPORTANTE: Cambiar contraseña en primer login');
  }

  /**
   * Login de usuario
   */
  async login(username, password, metadata = {}) {
    console.log(`🔐 [Auth Manager] Intento de login: ${username}`);

    // Verificar si la cuenta está bloqueada
    if (this.isAccountLocked(username)) {
      const lockInfo = this.lockedAccounts.get(username);
      const remainingTime = Math.ceil((lockInfo.until - Date.now()) / 1000 / 60);

      await this.logAudit('login_blocked', username, {
        reason: 'Account locked',
        remainingMinutes: remainingTime,
        ...metadata
      });

      throw new Error(`Cuenta bloqueada. Intente nuevamente en ${remainingTime} minutos.`);
    }

    // Buscar usuario
    const user = this.users.get(username);

    if (!user) {
      await this.handleFailedLogin(username, 'User not found', metadata);
      throw new Error('Usuario o contraseña incorrectos');
    }

    if (!user.enabled) {
      await this.logAudit('login_failed', username, {
        reason: 'Account disabled',
        ...metadata
      });
      throw new Error('Cuenta deshabilitada');
    }

    // Verificar password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      await this.handleFailedLogin(username, 'Invalid password', metadata);
      throw new Error('Usuario o contraseña incorrectos');
    }

    // Login exitoso - limpiar intentos fallidos
    this.loginAttempts.delete(username);

    // Generar tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Crear sesión
    const session = {
      id: crypto.randomBytes(16).toString('hex'),
      userId: user.id,
      username: user.username,
      role: user.role,
      accessToken,
      refreshToken,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.sessionTimeout,
      lastActivity: Date.now(),
      metadata
    };

    this.sessions.set(session.id, session);
    await this.saveSessions();

    // Actualizar usuario
    user.lastLogin = Date.now();
    await this.saveUsers();

    // Audit log
    await this.logAudit('login_success', username, metadata);

    console.log(`✅ [Auth Manager] Login exitoso: ${username}`);

    this.emit('login', { username, session });

    return {
      user: this.sanitizeUser(user),
      session: {
        sessionId: session.id,
        accessToken,
        refreshToken,
        expiresAt: session.expiresAt
      }
    };
  }

  /**
   * Logout de usuario
   */
  async logout(sessionId, metadata = {}) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error('Sesión no encontrada');
    }

    console.log(`🔐 [Auth Manager] Logout: ${session.username}`);

    // Eliminar sesión
    this.sessions.delete(sessionId);
    await this.saveSessions();

    // Audit log
    await this.logAudit('logout', session.username, metadata);

    this.emit('logout', { username: session.username, sessionId });

    return { success: true };
  }

  /**
   * Verifica un token de acceso
   */
  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      return decoded;
    } catch (error) {
      throw new Error('Token inválido o expirado');
    }
  }

  /**
   * Refresca un access token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtSecret);

      const user = this.users.get(decoded.username);
      if (!user || !user.enabled) {
        throw new Error('Usuario no válido');
      }

      // Generar nuevo access token
      const newAccessToken = this.generateAccessToken(user);

      console.log(`🔄 [Auth Manager] Token refrescado: ${user.username}`);

      return {
        accessToken: newAccessToken,
        user: this.sanitizeUser(user)
      };

    } catch (error) {
      throw new Error('Refresh token inválido o expirado');
    }
  }

  /**
   * Genera un access token
   */
  generateAccessToken(user) {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        type: 'access'
      },
      this.jwtSecret,
      { expiresIn: this.jwtExpiration }
    );
  }

  /**
   * Genera un refresh token
   */
  generateRefreshToken(user) {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        type: 'refresh'
      },
      this.jwtSecret,
      { expiresIn: this.refreshExpiration }
    );
  }

  /**
   * Verifica permisos
   */
  hasPermission(user, permission) {
    const role = this.roles[user.role];

    if (!role) return false;

    // Admin tiene todos los permisos
    if (role.permissions.includes('*')) return true;

    // Verificar permiso específico
    return role.permissions.includes(permission);
  }

  /**
   * Verifica si una sesión es válida
   */
  isSessionValid(sessionId) {
    const session = this.sessions.get(sessionId);

    if (!session) return false;

    // Verificar expiración
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return false;
    }

    // Actualizar última actividad
    session.lastActivity = Date.now();

    return true;
  }

  /**
   * Obtiene sesión
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  /**
   * Maneja login fallido
   */
  async handleFailedLogin(username, reason, metadata) {
    const attempts = this.loginAttempts.get(username) || {
      count: 0,
      firstAttempt: Date.now(),
      lastAttempt: Date.now()
    };

    attempts.count++;
    attempts.lastAttempt = Date.now();

    this.loginAttempts.set(username, attempts);

    // Bloquear cuenta si excede intentos
    if (attempts.count >= this.maxLoginAttempts) {
      this.lockedAccounts.set(username, {
        until: Date.now() + this.lockoutDuration,
        attempts: attempts.count
      });

      await this.logAudit('account_locked', username, {
        attempts: attempts.count,
        ...metadata
      });

      console.log(`🔒 [Auth Manager] Cuenta bloqueada: ${username} (${attempts.count} intentos)`);

      this.emit('account_locked', { username, attempts: attempts.count });
    }

    await this.logAudit('login_failed', username, {
      reason,
      attempts: attempts.count,
      ...metadata
    });
  }

  /**
   * Verifica si una cuenta está bloqueada
   */
  isAccountLocked(username) {
    const lockInfo = this.lockedAccounts.get(username);

    if (!lockInfo) return false;

    // Verificar si el bloqueo expiró
    if (Date.now() > lockInfo.until) {
      this.lockedAccounts.delete(username);
      this.loginAttempts.delete(username);
      return false;
    }

    return true;
  }

  /**
   * Crea un nuevo usuario
   */
  async createUser(userData) {
    const { username, email, password, role = 'viewer' } = userData;

    if (this.users.has(username)) {
      throw new Error('Usuario ya existe');
    }

    if (!this.roles[role]) {
      throw new Error('Rol inválido');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = {
      id: username,
      username,
      email,
      password: hashedPassword,
      role,
      enabled: true,
      createdAt: Date.now(),
      lastLogin: null,
      mustChangePassword: false
    };

    this.users.set(username, user);
    await this.saveUsers();

    await this.logAudit('user_created', username, { role, email });

    console.log(`✅ [Auth Manager] Usuario creado: ${username} (${role})`);

    this.emit('user_created', { username, role });

    return this.sanitizeUser(user);
  }

  /**
   * Actualiza un usuario
   */
  async updateUser(username, updates) {
    const user = this.users.get(username);

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Actualizar campos permitidos
    if (updates.email) user.email = updates.email;
    if (updates.role && this.roles[updates.role]) user.role = updates.role;
    if (typeof updates.enabled === 'boolean') user.enabled = updates.enabled;

    // Cambiar password si se proporciona
    if (updates.password) {
      user.password = await bcrypt.hash(updates.password, 10);
      user.mustChangePassword = false;
    }

    await this.saveUsers();

    await this.logAudit('user_updated', username, updates);

    console.log(`✅ [Auth Manager] Usuario actualizado: ${username}`);

    this.emit('user_updated', { username, updates });

    return this.sanitizeUser(user);
  }

  /**
   * Elimina un usuario
   */
  async deleteUser(username) {
    if (username === 'admin') {
      throw new Error('No se puede eliminar el usuario admin');
    }

    const user = this.users.get(username);

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    this.users.delete(username);
    await this.saveUsers();

    // Eliminar sesiones del usuario
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.username === username) {
        this.sessions.delete(sessionId);
      }
    }
    await this.saveSessions();

    await this.logAudit('user_deleted', username, {});

    console.log(`✅ [Auth Manager] Usuario eliminado: ${username}`);

    this.emit('user_deleted', { username });

    return { success: true };
  }

  /**
   * Obtiene lista de usuarios
   */
  getUsers() {
    return Array.from(this.users.values()).map(u => this.sanitizeUser(u));
  }

  /**
   * Obtiene un usuario
   */
  getUser(username) {
    const user = this.users.get(username);
    return user ? this.sanitizeUser(user) : null;
  }

  /**
   * Sanitiza objeto de usuario (remueve password)
   */
  sanitizeUser(user) {
    const { password, ...sanitized } = user;
    return sanitized;
  }

  /**
   * Obtiene lista de roles
   */
  getRoles() {
    return Object.entries(this.roles).map(([id, role]) => ({
      id,
      ...role
    }));
  }

  /**
   * Obtiene estadísticas
   */
  getStats() {
    return {
      totalUsers: this.users.size,
      activeSessions: this.sessions.size,
      lockedAccounts: this.lockedAccounts.size,
      roleDistribution: this.getRoleDistribution()
    };
  }

  /**
   * Obtiene distribución de roles
   */
  getRoleDistribution() {
    const distribution = {};

    for (const user of this.users.values()) {
      distribution[user.role] = (distribution[user.role] || 0) + 1;
    }

    return distribution;
  }

  /**
   * Log de auditoría
   */
  async logAudit(event, username, data) {
    const entry = {
      timestamp: new Date().toISOString(),
      event,
      username,
      data
    };

    const line = JSON.stringify(entry) + '\n';

    try {
      await fs.appendFile(this.auditFile, line);
      this.emit('audit', entry);
    } catch (error) {
      console.error('Error escribiendo audit log:', error);
    }
  }

  /**
   * Limpieza de sesiones expiradas
   */
  startSessionCleanup() {
    setInterval(() => {
      let cleaned = 0;

      for (const [sessionId, session] of this.sessions.entries()) {
        if (Date.now() > session.expiresAt) {
          this.sessions.delete(sessionId);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(`🧹 [Auth Manager] ${cleaned} sesiones expiradas eliminadas`);
        this.saveSessions();
      }
    }, 60 * 60 * 1000); // Cada hora
  }

  /**
   * Guarda usuarios
   */
  async saveUsers() {
    const data = Array.from(this.users.values());
    await fs.writeJson(this.usersFile, data, { spaces: 2 });
  }

  /**
   * Carga usuarios
   */
  async loadUsers() {
    try {
      if (await fs.pathExists(this.usersFile)) {
        const data = await fs.readJson(this.usersFile);
        this.users = new Map(data.map(u => [u.username, u]));
        console.log(`   👥 ${this.users.size} usuarios cargados`);
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    }
  }

  /**
   * Guarda sesiones
   */
  async saveSessions() {
    const data = Array.from(this.sessions.values());
    await fs.writeJson(this.sessionsFile, data, { spaces: 2 });
  }

  /**
   * Carga sesiones
   */
  async loadSessions() {
    try {
      if (await fs.pathExists(this.sessionsFile)) {
        const data = await fs.readJson(this.sessionsFile);
        this.sessions = new Map(data.map(s => [s.id, s]));

        // Limpiar sesiones expiradas
        for (const [sessionId, session] of this.sessions.entries()) {
          if (Date.now() > session.expiresAt) {
            this.sessions.delete(sessionId);
          }
        }

        console.log(`   🔑 ${this.sessions.size} sesiones activas`);
      }
    } catch (error) {
      console.error('Error cargando sesiones:', error);
    }
  }
}

module.exports = AuthManager;
