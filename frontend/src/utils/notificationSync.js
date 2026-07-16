// Pub-sub for real-time user notifications pushed over the socket.
// SocketContext emits here; NotificationBell subscribes to refresh its list
// and surface a toast without polling.
const listeners = new Set();

export const onNotificationReceived = (cb) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export const emitNotificationReceived = (notif) => {
  listeners.forEach((cb) => {
    try {
      cb(notif);
    } catch (err) { /* listener error */ }
  });
};
