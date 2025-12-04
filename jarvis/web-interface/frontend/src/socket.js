/**
 * Socket.io client singleton
 * Para reutilizar la conexión en toda la app
 */

import io from 'socket.io-client';

// Usar el puerto del backend (7777)
const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:7777';

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10
});

// Logging para desarrollo
if (import.meta.env.DEV) {
  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error);
  });
}

export default socket;
