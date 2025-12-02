/**
 * Socket.IO Client Service
 * Real-time communication with backend
 */

import { io, Socket } from 'socket.io-client';

// Socket instance
let socketInstance: Socket | null = null;

// Initialize socket connection
const initSocket = (): Socket => {
  if (socketInstance && socketInstance.connected) {
    return socketInstance;
  }

  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

  socketInstance = io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    transports: ['websocket', 'polling'],
  });

  socketInstance.on('connect', () => {
    console.log('✅ Socket connected:', socketInstance?.id);
  });

  socketInstance.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
  });

  socketInstance.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socketInstance;
};

// Get socket instance (lazy initialization)
export const getSocket = (): Socket => {
  if (!socketInstance) {
    return initSocket();
  }
  return socketInstance;
};

// Export singleton instance
export const socket = getSocket();

// Disconnect socket
export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

export default socket;
