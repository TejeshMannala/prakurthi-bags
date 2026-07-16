import { io } from 'socket.io-client';

// Singleton admin socket connection. Authenticates with the admin JWT so the
// backend places this session in the `admin` room and pushes order/notification
// /stats events in real time.
let socket = null;

export const getAdminSocket = () => {
  if (socket) return socket;
  const base = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const serverUrl = base.replace(/\/api\/?$/, '');
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
