// Cross-surface content-change signaling for the customer storefront.
//
// Mirrors utils/productSync.js but for non-product content (categories,
// banners, pages/policies, settings, testimonials, team, faqs, contact).
//
// Two triggers feed this:
//   1. Live socket events forwarded by SocketContext:
//        'category:updated', 'banner:updated', 'page:updated',
//        'settings:updated', 'testimonial:updated', 'contact:updated'.
//      These fire whenever an admin creates/updates/deletes that content.
//   2. Window focus / tab-visibility — covers guest users (no socket)
//      and the common case where the admin edits in one tab and the
//      customer views the storefront in another tab.
//
// Consumers subscribe via onContentChanged(type, cb); cb receives the event
// payload and should refetch the relevant data.

const listeners = new Map(); // type -> Set<cb>
let visibilityBound = false;

export const onContentChanged = (type, cb) => {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type).add(cb);
  bindVisibility();
  return () => {
    const set = listeners.get(type);
    if (set) set.delete(cb);
  };
};

export const triggerContentChanged = (type, detail) => {
  const set = listeners.get(type);
  if (!set) return;
  set.forEach((cb) => {
    try {
      cb(detail);
    } catch (err) { /* listener error */ }
  });
};

const bindVisibility = () => {
  if (visibilityBound || typeof window === 'undefined') return;
  visibilityBound = true;
  const fireAll = () => {
    ['category', 'banner', 'page', 'settings', 'testimonial', 'contact', 'team', 'faq'].forEach(
      (t) => triggerContentChanged(`${t}:updated`, { reason: 'visibility' })
    );
  };
  window.addEventListener('focus', fireAll);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') fireAll();
  });
};
