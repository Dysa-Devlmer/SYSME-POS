// web-interface/frontend/src/components/NotificationToast.jsx
// Sistema de notificaciones toast estilo Iron Man

import React, { useState, useEffect } from 'react';

export default function NotificationToast({ socket }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!socket) return;

    // Escuchar eventos del sistema
    socket.on('notification', (data) => {
      addNotification(data.message, data.type || 'info', data.duration || 4000);
    });

    socket.on('task:created', (task) => {
      addNotification(`Nueva tarea creada: "${task.title}"`, 'success', 3000);
    });

    socket.on('task:completed', (task) => {
      addNotification(`¡Tarea completada! "${task.title}"`, 'success', 3000);
    });

    socket.on('task:deleted', () => {
      addNotification('Tarea eliminada', 'info', 2000);
    });

    socket.on('memory:saved', () => {
      addNotification('Memoria guardada correctamente', 'success', 2500);
    });

    socket.on('connect', () => {
      addNotification('Conectado a JARVIS', 'success', 2000);
    });

    socket.on('disconnect', () => {
      addNotification('Desconectado del servidor', 'error', 3000);
    });

    return () => {
      socket.off('notification');
      socket.off('task:created');
      socket.off('task:completed');
      socket.off('task:deleted');
      socket.off('memory:saved');
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [socket]);

  const addNotification = (message, type = 'info', duration = 4000) => {
    const id = Date.now();
    const newNotification = { id, message, type };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove después de duration
    setTimeout(() => {
      removeNotification(id);
    }, duration);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationStyles = (type) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-gradient-to-r from-green-600 to-green-700',
          border: 'border-green-400',
          icon: '✅',
          shadow: 'shadow-green-500/50'
        };
      case 'error':
        return {
          bg: 'bg-gradient-to-r from-red-600 to-red-700',
          border: 'border-red-400',
          icon: '❌',
          shadow: 'shadow-red-500/50'
        };
      case 'warning':
        return {
          bg: 'bg-gradient-to-r from-yellow-600 to-yellow-700',
          border: 'border-yellow-400',
          icon: '⚠️',
          shadow: 'shadow-yellow-500/50'
        };
      case 'info':
      default:
        return {
          bg: 'bg-gradient-to-r from-blue-600 to-blue-700',
          border: 'border-blue-400',
          icon: 'ℹ️',
          shadow: 'shadow-blue-500/50'
        };
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 pointer-events-none">
      {notifications.map((notification) => {
        const styles = getNotificationStyles(notification.type);
        return (
          <div
            key={notification.id}
            className={`${styles.bg} ${styles.shadow} border-l-4 ${styles.border} rounded-lg p-4 shadow-2xl transform transition-all duration-300 animate-slide-in-right pointer-events-auto max-w-sm`}
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl flex-shrink-0">{styles.icon}</div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{notification.message}</p>
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="text-white text-opacity-70 hover:text-opacity-100 transition-opacity flex-shrink-0"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
