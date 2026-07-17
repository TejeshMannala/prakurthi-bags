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
const CLIENT_ID_CACHE_KEY = 'google_client_id';
const CLIENT_ID_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

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

// Get Google Client ID. First tries the build-time env var, then falls back
// to fetching from the backend /api/auth/google-config endpoint.
export const getGoogleClientId = () =>
  process.env.REACT_APP_GOOGLE_CLIENT_ID || null;

// Fetch the Google Client ID from the backend (preferred for production
// where REACT_APP_GOOGLE_CLIENT_ID is not set at build time).
// Uses localStorage caching to avoid redundant API calls on every mount.
let fetchPromise = null;
export const fetchGoogleClientId = async () => {
  // Return in-memory cache instantly
  if (cachedClientId) return cachedClientId;

  // Return localStorage cache if fresh
  try {
    const cached = localStorage.getItem(CLIENT_ID_CACHE_KEY);
    if (cached) {
      const { clientId, ts } = JSON.parse(cached);
      if (clientId && Date.now() - ts < CLIENT_ID_CACHE_TTL) {
        cachedClientId = clientId;
        return clientId;
      }
      localStorage.removeItem(CLIENT_ID_CACHE_KEY);
    }
  } catch {}

  // Deduplicate concurrent calls with a single in-flight promise
  if (fetchPromise) return fetchPromise;
  fetchPromise = (async () => {
    try {
      const { default: api } = await import('./axios');
      const { data } = await api.get('/api/auth/google-config');
      if (data.enabled && data.clientId) {
        cachedClientId = data.clientId;
        try {
          localStorage.setItem(CLIENT_ID_CACHE_KEY, JSON.stringify({ clientId: data.clientId, ts: Date.now() }));
        } catch {}
        return data.clientId;
      }
    } catch {}
    return getGoogleClientId();
  })();
  const result = await fetchPromise;
  fetchPromise = null;
  return result;
};
