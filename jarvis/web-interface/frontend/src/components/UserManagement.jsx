// web-interface/frontend/src/components/UserManagement.jsx
// Gestión de Usuarios y Seguridad

import React, { useState, useEffect } from 'react';

const UserManagement = ({ socket, currentUser }) => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activeView, setActiveView] = useState('users'); // 'users', 'sessions', 'audit'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'viewer'
  });

  useEffect(() => {
    if (!socket) return;

    // Event listeners
    socket.on('auth:users', (data) => {
      setUsers(data);
    });

    socket.on('auth:roles', (data) => {
      setRoles(data);
    });

    socket.on('auth:stats', (data) => {
      setStats(data);
    });

    socket.on('auth:sessions', (data) => {
      setSessions(data);
    });

    socket.on('auth:user-created', () => {
      setShowCreateModal(false);
      resetForm();
      socket.emit('auth:get-users');
      socket.emit('auth:get-stats');
    });

    socket.on('auth:user-updated', () => {
      setShowEditModal(false);
      setSelectedUser(null);
      socket.emit('auth:get-users');
    });

    socket.on('auth:user-deleted', () => {
      socket.emit('auth:get-users');
      socket.emit('auth:get-stats');
    });

    socket.on('auth:error', (data) => {
      alert(`❌ Error: ${data.message}`);
    });

    // Initial load
    socket.emit('auth:get-users');
    socket.emit('auth:get-roles');
    socket.emit('auth:get-stats');
    socket.emit('auth:get-sessions');

    return () => {
      socket.off('auth:users');
      socket.off('auth:roles');
      socket.off('auth:stats');
      socket.off('auth:sessions');
      socket.off('auth:user-created');
      socket.off('auth:user-updated');
      socket.off('auth:user-deleted');
      socket.off('auth:error');
    };
  }, [socket]);

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'viewer'
    });
  };

  const handleCreateUser = () => {
    if (!formData.username || !formData.email || !formData.password) {
      alert('Todos los campos son requeridos');
      return;
    }

    socket.emit('auth:create-user', formData);
  };

  const handleUpdateUser = () => {
    if (!selectedUser) return;

    const updates = {
      email: formData.email,
      role: formData.role,
      enabled: formData.enabled
    };

    if (formData.password) {
      updates.password = formData.password;
    }

    socket.emit('auth:update-user', {
      username: selectedUser.username,
      updates
    });
  };

  const handleDeleteUser = (username) => {
    if (!confirm(`¿Eliminar usuario ${username}?`)) return;

    socket.emit('auth:delete-user', username);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
      enabled: user.enabled
    });
    setShowEditModal(true);
  };

  const getRoleBadge = (roleId) => {
    const colors = {
      admin: 'bg-red-600',
      developer: 'bg-blue-600',
      viewer: 'bg-green-600',
      guest: 'bg-gray-600'
    };

    return colors[roleId] || 'bg-gray-600';
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Nunca';
    return new Date(timestamp).toLocaleString('es-ES');
  };

  const renderUsers = () => {
    return (
      <div className="space-y-4">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Total Usuarios</div>
              <div className="text-2xl font-bold text-white">{stats.totalUsers}</div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Sesiones Activas</div>
              <div className="text-2xl font-bold text-cyan-400">{stats.activeSessions}</div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Cuentas Bloqueadas</div>
              <div className="text-2xl font-bold text-red-400">{stats.lockedAccounts}</div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Admins</div>
              <div className="text-2xl font-bold text-purple-400">{stats.roleDistribution?.admin || 0}</div>
            </div>
          </div>
        )}

        {/* Users list */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">👥 Usuarios</h3>

            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
            >
              ➕ Crear Usuario
            </button>
          </div>

          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.username} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-bold text-white">{user.username}</h4>
                      <span className={`px-2 py-1 ${getRoleBadge(user.role)} text-white rounded text-xs font-semibold`}>
                        {user.role}
                      </span>
                      {!user.enabled && (
                        <span className="px-2 py-1 bg-red-600 text-white rounded text-xs font-semibold">
                          Deshabilitado
                        </span>
                      )}
                      {user.mustChangePassword && (
                        <span className="px-2 py-1 bg-yellow-600 text-white rounded text-xs font-semibold">
                          Cambiar Password
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-gray-400 space-y-1">
                      <p>📧 {user.email}</p>
                      <p>🕐 Creado: {formatDate(user.createdAt)}</p>
                      <p>🔐 Último login: {formatDate(user.lastLogin)}</p>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-semibold"
                    >
                      ✏️ Editar
                    </button>

                    {user.username !== 'admin' && user.username !== currentUser?.username && (
                      <button
                        onClick={() => handleDeleteUser(user.username)}
                        className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-semibold"
                      >
                        🗑️ Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Roles info */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4">🎭 Roles y Permisos</h3>

          <div className="grid grid-cols-2 gap-4">
            {roles.map((role) => (
              <div key={role.id} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <span className={`px-3 py-1 ${getRoleBadge(role.id)} text-white rounded font-semibold`}>
                    {role.name}
                  </span>
                </div>

                <div className="text-sm text-gray-400">
                  <p className="font-semibold mb-2">Permisos:</p>
                  <div className="space-y-1">
                    {role.permissions.slice(0, 5).map((perm, idx) => (
                      <p key={idx} className="text-xs">• {perm}</p>
                    ))}
                    {role.permissions.length > 5 && (
                      <p className="text-xs text-cyan-400">+ {role.permissions.length - 5} más...</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderSessions = () => {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-4">🔑 Sesiones Activas</h3>

        {sessions.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No hay sesiones activas</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.id} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-bold text-white">{session.username}</h4>
                      <span className={`px-2 py-1 ${getRoleBadge(session.role)} text-white rounded text-xs font-semibold`}>
                        {session.role}
                      </span>
                    </div>

                    <div className="text-sm text-gray-400 space-y-1">
                      <p>🆔 Session ID: {session.id.substring(0, 16)}...</p>
                      <p>🕐 Creada: {formatDate(session.createdAt)}</p>
                      <p>⏰ Expira: {formatDate(session.expiresAt)}</p>
                      <p>📍 IP: {session.metadata?.ip || 'N/A'}</p>
                      <p>🌐 User Agent: {session.metadata?.userAgent?.substring(0, 50) || 'N/A'}...</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Modal de crear usuario
  const CreateModal = () => {
    if (!showCreateModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
          <h3 className="text-xl font-bold text-white mb-4">➕ Crear Usuario</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Usuario</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Contraseña</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Rol</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 font-semibold"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateUser}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
            >
              Crear
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Modal de editar usuario
  const EditModal = () => {
    if (!showEditModal || !selectedUser) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
          <h3 className="text-xl font-bold text-white mb-4">✏️ Editar Usuario: {selectedUser.username}</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Nueva Contraseña (dejar vacío para no cambiar)</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Nueva contraseña"
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Rol</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="w-5 h-5"
                />
                <span className="text-white">Usuario habilitado</span>
              </label>
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              onClick={() => {
                setShowEditModal(false);
                setSelectedUser(null);
                resetForm();
              }}
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 font-semibold"
            >
              Cancelar
            </button>
            <button
              onClick={handleUpdateUser}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Actualizar
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">🔐 Seguridad & Usuarios</h2>
          <p className="text-gray-400 text-sm mt-1">
            Gestión de usuarios, roles y sesiones
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex space-x-2">
        <button
          onClick={() => setActiveView('users')}
          className={`px-4 py-2 rounded-lg font-semibold ${
            activeView === 'users'
              ? 'bg-cyan-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          👥 Usuarios
        </button>
        <button
          onClick={() => setActiveView('sessions')}
          className={`px-4 py-2 rounded-lg font-semibold ${
            activeView === 'sessions'
              ? 'bg-cyan-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          🔑 Sesiones
        </button>
      </div>

      {/* Content */}
      {activeView === 'users' && renderUsers()}
      {activeView === 'sessions' && renderSessions()}

      {/* Modals */}
      <CreateModal />
      <EditModal />
    </div>
  );
};

export default UserManagement;
