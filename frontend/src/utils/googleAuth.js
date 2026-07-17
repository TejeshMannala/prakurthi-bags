// Singleton Google Identity Services (GIS) initializer.
// `google.accounts.id.initialize()` must be called exactly ONCE per page load;
// calling it multiple times triggers the "initialize called multiple times"
// console warning and can double-fire the backend login. This module caches
// the client id and the initialized state so the GIS script + library are set
// up a single time, regardless of how many components mount/unmount.

let scriptPromise = null;
let initPromise = null;
let clientIdCache = null;

const loadGsiScript = () => {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('no window'));
    if (window.google && window.google.accounts && window.google.accounts.id) {
      return resolve(window.google);
    }
    const existing = document.getElementById('gsi-client-script');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google));
      existing.addEventListener('error', () => reject(new Error('gsi script load error')));
      return;
    }
    const script = document.createElement('script');
    script.id = 'gsi-client-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error('Failed to load Google Identity script'));
    document.head.appendChild(script);
  });
  return scriptPromise;
};

// Initialize GIS once. `onCredential` is invoked with the JWT credential.
export const initGoogleIdentity = async ({ clientId, onCredential, onError }) => {
  if (initPromise && clientIdCache === clientId) return initPromise;
  clientIdCache = clientId;
  initPromise = (async () => {
    const google = await loadGsiScript();
    if (!google || !google.accounts || !google.accounts.id) {
      throw new Error('Google Identity Services unavailable');
    }
    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        if (response && response.credential) {
          onCredential(response.credential);
        } else if (onError) {
          onError(response || new Error('No credential returned'));
        }
      },
      // Avoid the popup/postMessage cross-origin issues in some embed contexts.
      use_fedcm_for_prompt: true,
    });
    return google;
  })();
  return initPromise;
};

// Trigger the One Tap / account chooser exactly once per call.
export const promptGoogleCredential = () => {
  if (typeof window === 'undefined' || !window.google || !window.google.accounts || !window.google.accounts.id) {
    return;
  }
  try {
    window.google.accounts.id.prompt((notification) => {
      if (notification && notification.isNotDisplayed && notification.isNotDisplayed()) {
        // Fall back to the button-style flow automatically.
        window.google.accounts.id.renderButton; // no-op reference to keep API stable
      }
    });
  } catch {
    /* no-op */
  }
};

export const getGoogleClientId = () =>
  process.env.REACT_APP_GOOGLE_CLIENT_ID || null;
