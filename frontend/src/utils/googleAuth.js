// Singleton Google Identity Services (GIS) initializer.
// `google.accounts.id.initialize()` must be called exactly ONCE per page load;
// calling it multiple times triggers the "initialize called multiple times"
// console warning and can double-fire the backend login. This module caches
// the client id and the initialized state so the GIS script + library are set
// up a single time, regardless of how many components mount/unmount.
//
// Flow used here:
//  - `google.accounts.id.renderButton()` is attached to the REAL "Continue
//    with Google" button element. Clicking it opens the genuine Google account
//    chooser (popup) and, on selection, invokes the SAME `callback` passed to
//    `initialize()` — which delivers `response.credential` (a real id_token).
//  - We deliberately do NOT rely on `google.accounts.id.prompt()` (One Tap).
//    One Tap only fires its callback when the overlay is actually shown and the
//    user clicks it; if it is suppressed/aborted (very common when a manual
//    button is also present, or with FedCM quirks), the credential callback
//    never fires and login silently fails. Driving the flow from renderButton
//    guarantees the account chooser opens on click and the id_token is returned.

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
export const initGoogleIdentity = async ({ clientId, onCredential, onError }) => {
  if (initPromise && clientIdCache === clientId) return initPromise;
  clientIdCache = clientId;
  initPromise = (async () => {
    const google = await loadGsiScript();
    if (!google || !google.accounts || !google.accounts.id) {
      throw new Error('Google Identity Services unavailable');
    }
    lastOnCredential = onCredential;
    lastOnError = onError;
    google.accounts.id.initialize({
      client_id: clientId,
      // We drive the flow from renderButton on the actual button element, so the
      // One-Tap overlay is never auto-shown. ux_mode 'popup' makes the account
      // chooser a real popup window under our control.
      ux_mode: 'popup',
      // Keep FedCM out of the picture for maximum reliability; the legacy popup
      // path is the most predictable across browsers.
      use_fedcm_for_prompt: false,
      // itp_support improves reliability in Safari / anti-tracking browsers.
      itp_support: true,
      callback: (response) => {
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[Google] credential callback fired', !!response?.credential);
        }
        if (response && response.credential) {
          onCredential(response.credential);
        } else if (onError) {
          onError(response || new Error('No credential returned'));
        }
      },
    });
    return google;
  })();
  return initPromise;
};

// Keep references so the explicit button path can deliver the credential.
let lastOnCredential = null;
let lastOnError = null;

// Attach the Google Sign-In button to the provided DOM element. This renders
// the official "Continue with Google" button INSIDE the provided container and
// wires its click to the account chooser. The credential is delivered through
// the `callback` registered in `initGoogleIdentity`, which calls `onCredential`
// — so the backend login always runs on a real, user-selected id_token.
//
// Returns true if the button was rendered, false if GIS is unavailable.
export const renderGoogleButton = (element, { type = 'standard', theme = 'outline', size = 'large', text = 'continue_with' } = {}) => {
  if (typeof window === 'undefined' || !window.google || !window.google.accounts) return false;
  try {
    console.debug('[Google] rendering Sign-In With Google button');
    window.google.accounts.id.renderButton(element, {
      type,
      theme,
      size,
      text,
      logo_alignment: 'left',
      width: element.clientWidth || undefined,
    });
    return true;
  } catch (e) {
    console.error('[Google] renderButton failed:', e);
    if (lastOnError) lastOnError(e);
    return false;
  }
};

// Get Google Client ID from build-time env var (CRA bakes REACT_APP_* at build).
export const getGoogleClientId = () => {
  return process.env.REACT_APP_GOOGLE_CLIENT_ID || null;
};

// Fetch the Google Client ID from the backend (preferred for production
// where REACT_APP_GOOGLE_CLIENT_ID is not set at build time).
// Uses localStorage caching to avoid redundant API calls on every mount.
let cachedClientId = null;
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
    } catch {
      // google-config fetch failed — will fall back to env var
    }
    return getGoogleClientId();
  })();
  const result = await fetchPromise;
  fetchPromise = null;
  return result;
};

// Fetch the backend Google config and verify the frontend's build-time
// REACT_APP_GOOGLE_CLIENT_ID matches the backend's GOOGLE_CLIENT_ID. A mismatch
// is the #1 cause of `invalid_client` / origin_mismatch errors in production.
export const verifyGoogleClientIdMatch = async () => {
  try {
    const { default: api } = await import('./axios');
    const { data } = await api.get('/api/auth/google-config');
    const buildId = getGoogleClientId();
    const backendId = data?.clientId || null;
    const match = !buildId || !backendId || buildId === backendId;
    return {
      enabled: !!data?.enabled && !!backendId,
      backendId,
      buildId,
      match,
      message: match
        ? null
        : 'Frontend REACT_APP_GOOGLE_CLIENT_ID does not match the backend GOOGLE_CLIENT_ID. Google login will fail with invalid_client.',
    };
  } catch {
    return { enabled: false, backendId: null, buildId: getGoogleClientId(), match: true, message: null };
  }
};
