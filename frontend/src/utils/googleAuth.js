// Singleton Google Identity Services (GIS) initializer.
// `google.accounts.id.initialize()` must be called exactly ONCE per page load;
// calling it multiple times triggers the "initialize called multiple times"
// console warning and can double-fire the backend login. This module caches
// the client id and the initialized state so the GIS script + library are set
// up a single time, regardless of how many components mount/unmount.
//
// Performance: The script is preloaded via <link rel="preload"> when the Login
// page mounts, so by the time the user clicks "Continue with Google", the SDK
// is already cached in the browser. The prompt opens instantly.

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

// Preload the Google Identity Services script so it's ready when the user
// clicks the Google button. Call this when the Login page mounts.
export const preloadGoogleScript = () => {
  loadGsiScript().catch(() => {});
};

// Initialize GIS once. `onCredential` is invoked with the JWT credential.
// Uses use_fedcm_for_prompt: false for broader compatibility and faster popup.
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
      // use_fedcm_for_prompt: false ensures the traditional popup flow is used,
      // which is more broadly supported and opens faster than FedCM.
      use_fedcm_for_prompt: false,
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
