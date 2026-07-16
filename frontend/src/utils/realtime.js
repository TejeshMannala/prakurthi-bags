// Generic lightweight real-time event bus for the customer storefront.
// SocketContext forwards backend socket events here; any component (order
// detail, product page, checkout, presence indicators) can subscribe.
const listeners = new Map();

export const onRealtime = (event, cb) => {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(cb);
  return () => {
    const set = listeners.get(event);
    if (set) set.delete(cb);
  };
};

export const emitRealtime = (event, data) => {
  const set = listeners.get(event);
  if (!set) return;
  set.forEach((cb) => {
    try {
      cb(data);
    } catch (err) { /* listener error */ }
  });
};
