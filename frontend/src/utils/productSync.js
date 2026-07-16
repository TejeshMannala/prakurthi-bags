// Cross-surface product-change signaling for the customer storefront.
//
// Two triggers feed this:
//   1. A live socket event (`product:updated`) emitted by the backend whenever
//      an admin creates/updates/deletes a product — only reaches logged-in users
//      whose socket is connected.
//   2. Window focus / tab-visibility — covers guest users (no socket) and the
//      common case where the admin edits in one tab and the customer views the
//      storefront in another tab.
//
// Any page that lists or renders products can subscribe via `onProductsChanged`
// and refetch. `triggerProductsChanged` is called from the SocketContext.
const listeners = new Set();
let visibilityBound = false;

export const onProductsChanged = (cb) => {
  listeners.add(cb);
  bindVisibility();
  return () => listeners.delete(cb);
};

export const triggerProductsChanged = (detail) => {
  listeners.forEach((cb) => {
    try {
      cb(detail);
    } catch (err) { /* listener error */ }
  });
};

const bindVisibility = () => {
  if (visibilityBound || typeof window === 'undefined') return;
  visibilityBound = true;
  const fire = () => triggerProductsChanged({ reason: 'visibility' });
  window.addEventListener('focus', fire);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') fire();
  });
};
