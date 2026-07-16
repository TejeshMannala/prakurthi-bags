// Generic real-time event bus for the admin dashboard. The admin socket
// connection (utils/socket.js) forwards backend events here; dashboard, orders,
// notifications and other pages subscribe to the ones they care about.
const listeners = new Map();

export const onAdminRealtime = (event, cb) => {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(cb);
  return () => {
    const set = listeners.get(event);
    if (set) set.delete(cb);
  };
};

export const emitAdminRealtime = (event, data) => {
  const set = listeners.get(event);
  if (!set) return;
  set.forEach((cb) => {
    try {
      cb(data);
    } catch (err) {
      console.error('[adminRealtime] listener error', err);
    }
  });
};
