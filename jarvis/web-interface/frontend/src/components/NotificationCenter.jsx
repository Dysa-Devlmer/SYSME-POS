// web-interface/frontend/src/components/NotificationCenter.jsx
// Centro de Notificaciones Push para JARVIS

import React, { useState, useEffect, useRef } from 'react';

const NotificationCenter = ({ socket }) => {
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({ total: 0, unread: 0, read: 0 });
  const [filter, setFilter] = useState('all'); // all, unread, info, success, warning, error
  const [isOpen, setIsOpen] = useState(false);
  const [preferences, setPreferences] = useState(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const audioRef = useRef(null);

  // Configuración de iconos y colores por prioridad
  const priorityConfig = {
    info: { icon: 'ℹ️', color: 'blue', bgColor: 'bg-blue-500' },
    success: { icon: '✅', color: 'green', bgColor: 'bg-green-500' },
    warning: { icon: '⚠️', color: 'yellow', bgColor: 'bg-yellow-500' },
    error: { icon: '❌', color: 'red', bgColor: 'bg-red-500' },
    critical: { icon: '🚨', color: 'red', bgColor: 'bg-red-600' }
  };

  useEffect(() => {
    if (!socket) return;

    // Solicitar notificaciones iniciales
    socket.emit('notifications:get');
    socket.emit('notifications:get-stats');
    socket.emit('notifications:get-preferences');

    // Escuchar nueva notificación
    socket.on('notification:new', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      updateStats();

      // Notificación del navegador
      if (preferences?.pushEnabled !== false && Notification.permission === 'granted') {
        showBrowserNotification(notification);
      }

      // Sonido (opcional)
      if (preferences?.soundEnabled && audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
    });

    // Escuchar lista de notificaciones
    socket.on('notifications:list', (list) => {
      setNotifications(list);
    });

    // Escuchar estadísticas
    socket.on('notifications:stats', (newStats) => {
      setStats(newStats);
    });

    // Escuchar preferencias
    socket.on('notifications:preferences', (prefs) => {
      setPreferences(prefs);
    });

    // Escuchar notificación leída
    socket.on('notification:read', (notification) => {
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );
      updateStats();
    });

    // Escuchar todas leídas
    socket.on('notification:all-read', () => {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      updateStats();
    });

    // Escuchar notificación descartada
    socket.on('notification:dismissed', (notification) => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
      updateStats();
    });

    // Escuchar todas descartadas
    socket.on('notification:all-dismissed', () => {
      setNotifications([]);
      updateStats();
    });

    // Solicitar permiso para notificaciones del navegador
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      socket.off('notification:new');
      socket.off('notifications:list');
      socket.off('notifications:stats');
      socket.off('notifications:preferences');
      socket.off('notification:read');
      socket.off('notification:all-read');
      socket.off('notification:dismissed');
      socket.off('notification:all-dismissed');
    };
  }, [socket, preferences]);

  const updateStats = () => {
    if (socket) {
      socket.emit('notifications:get-stats');
    }
  };

  const showBrowserNotification = (notification) => {
    try {
      const config = priorityConfig[notification.priority] || priorityConfig.info;
      new Notification(`${config.icon} ${notification.title}`, {
        body: notification.message,
        icon: '/jarvis-icon.png',
        tag: `jarvis-${notification.id}`,
        requireInteraction: notification.priority === 'critical'
      });
    } catch (error) {
      console.error('Error mostrando notificación del navegador:', error);
    }
  };

  const handleMarkAsRead = (notificationId) => {
    socket.emit('notifications:mark-read', notificationId);
  };

  const handleMarkAllAsRead = () => {
    socket.emit('notifications:mark-all-read');
  };

  const handleDismiss = (notificationId) => {
    socket.emit('notifications:dismiss', notificationId);
  };

  const handleDismissAll = () => {
    if (confirm('¿Descartar todas las notificaciones?')) {
      socket.emit('notifications:dismiss-all');
    }
  };

  const handleUpdatePreferences = (updates) => {
    socket.emit('notifications:update-preferences', updates);
  };

  const formatTime = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes}m`;
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${days}d`;
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    return n.priority === filter;
  });

  const unreadCount = stats.unread || 0;

  return (
    <>
      {/* Botón de notificaciones en la esquina */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-full shadow-lg hover:from-cyan-700 hover:to-blue-700 transition-all"
        >
          <span className="text-2xl">🔔</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Panel de notificaciones */}
      {isOpen && (
        <div className="fixed top-20 right-4 w-96 bg-gray-800 rounded-lg shadow-2xl border border-gray-700 z-50 max-h-[600px] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-white">🔔 Notificaciones</h3>
              <button
                onClick={() => setShowPreferences(!showPreferences)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ⚙️
              </button>
            </div>

            {/* Estadísticas */}
            <div className="flex space-x-4 text-sm">
              <span className="text-gray-400">
                Total: <span className="text-white font-semibold">{stats.total}</span>
              </span>
              <span className="text-gray-400">
                No leídas: <span className="text-cyan-400 font-semibold">{stats.unread}</span>
              </span>
            </div>
          </div>

          {/* Preferencias (expandible) */}
          {showPreferences && preferences && (
            <div className="p-4 bg-gray-750 border-b border-gray-700">
              <h4 className="text-white font-semibold mb-3">Preferencias</h4>

              <div className="space-y-2">
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Push Notifications</span>
                  <input
                    type="checkbox"
                    checked={preferences.pushEnabled !== false}
                    onChange={(e) => handleUpdatePreferences({ pushEnabled: e.target.checked })}
                    className="form-checkbox h-5 w-5 text-cyan-600"
                  />
                </label>

                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Sonido</span>
                  <input
                    type="checkbox"
                    checked={preferences.soundEnabled === true}
                    onChange={(e) => handleUpdatePreferences({ soundEnabled: e.target.checked })}
                    className="form-checkbox h-5 w-5 text-cyan-600"
                  />
                </label>

                <div>
                  <label className="text-sm text-gray-300 block mb-1">Prioridad Mínima</label>
                  <select
                    value={preferences.minPriority || 'info'}
                    onChange={(e) => handleUpdatePreferences({ minPriority: e.target.value })}
                    className="w-full bg-gray-700 text-white text-sm rounded px-2 py-1"
                  >
                    <option value="info">Info</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Filtros */}
          <div className="p-3 bg-gray-750 border-b border-gray-700 flex space-x-2 overflow-x-auto">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap ${
                filter === 'all' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap ${
                filter === 'unread' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              No leídas ({unreadCount})
            </button>
            {Object.keys(priorityConfig).map(priority => {
              const count = notifications.filter(n => n.priority === priority).length;
              if (count === 0) return null;
              return (
                <button
                  key={priority}
                  onClick={() => setFilter(priority)}
                  className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap ${
                    filter === priority ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {priorityConfig[priority].icon} ({count})
                </button>
              );
            })}
          </div>

          {/* Acciones */}
          {notifications.length > 0 && (
            <div className="p-2 bg-gray-750 border-b border-gray-700 flex space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                >
                  ✓ Marcar todas leídas
                </button>
              )}
              <button
                onClick={handleDismissAll}
                className="flex-1 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
              >
                🗑️ Descartar todas
              </button>
            </div>
          )}

          {/* Lista de notificaciones */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p className="text-4xl mb-2">🔕</p>
                <p>No hay notificaciones</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {filteredNotifications.map((notification) => {
                  const config = priorityConfig[notification.priority] || priorityConfig.info;
                  return (
                    <div
                      key={notification.id}
                      className={`p-3 hover:bg-gray-750 transition-colors cursor-pointer ${
                        !notification.read ? 'bg-gray-750 border-l-4 ' + config.bgColor : ''
                      }`}
                      onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                    >
                      <div className="flex items-start">
                        <span className="text-2xl mr-3 flex-shrink-0">{config.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className={`text-sm font-semibold ${
                              !notification.read ? 'text-white' : 'text-gray-300'
                            }`}>
                              {notification.title}
                            </h4>
                            <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                              {formatTime(notification.timestamp)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mb-2">{notification.message}</p>

                          {/* Datos adicionales */}
                          {notification.data && (
                            <div className="text-xs text-gray-500 bg-gray-700 rounded p-2 mb-2">
                              {notification.data.subtaskCount && (
                                <div>Sub-tareas: {notification.data.subtaskCount}</div>
                              )}
                              {notification.data.score !== undefined && (
                                <div>Score: {notification.data.score}%</div>
                              )}
                              {notification.data.duration !== undefined && (
                                <div>Duración: {notification.data.duration}s</div>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span className={`text-xs px-2 py-1 rounded ${config.bgColor} bg-opacity-20 text-${config.color}-400`}>
                              {notification.category}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDismiss(notification.id);
                              }}
                              className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                            >
                              🗑️ Descartar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audio para notificaciones (opcional) */}
      <audio ref={audioRef} src="/notification-sound.mp3" />
    </>
  );
};

export default NotificationCenter;
