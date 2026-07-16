import { io } from 'socket.io-client';

let socket = null;

export const getAdminSocket = () => {
  if (socket) return socket;

  const envUrl = import.meta.env.VITE_API_URL;
  let serverUrl;
  if (envUrl && envUrl.trim()) {
    serverUrl = envUrl.trim().replace(/\/api\/?$/, '');
  } else if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    serverUrl = window.location.origin;
  } else {
    serverUrl = 'http://localhost:5000';
  }

  const token = localStorage.getItem('adminToken') || localStorage.getItem('token');

  socket = io(serverUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });

  socket.on('connect', () => {
    socket.emit('admin:join');
  });

  return socket;
};

export const disconnectAdminSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default getAdminSocket;
