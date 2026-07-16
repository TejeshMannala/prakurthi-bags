import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback, useMemo } from 'react';
import api from '../utils/axios';

const CartContext = createContext();

const STORAGE_KEY = 'prakruthi_cart_v2';
const WISHLIST_KEY = 'prakruthi_wishlist_v2';
const BC_CHANNEL = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('prakruthi_sync') : null;

const isValidCartItem = (item) => {
  return item && item._id && typeof item.price === 'number' && item.price >= 0;
};

const deduplicate = (items) => {
  const seen = new Map();
  items.forEach((item) => {
    if (item && item._id) {
      const key = item._id + '|' + (item.size || '') + '|' + (item.color || '');
      if (!seen.has(key)) {
        seen.set(key, item);
      }
    }
  });
  return Array.from(seen.values());
};

const loadFromStorage = (key) => {
  try {
    const data = localStorage.getItem(key);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return deduplicate(parsed.filter(isValidCartItem));
  } catch {
    return [];
  }
};

const saveToStorage = (key, data) => {
  try {
    const valid = Array.isArray(data) ? data.filter(isValidCartItem) : [];
    localStorage.setItem(key, JSON.stringify(valid));
  } catch {}
};

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_TO_CART': {
      if (!action.payload || !action.payload._id) return state;
      const qty = action.payload._qty || 1;
      const { _qty, ...cleanProduct } = action.payload;
      const existing = state.cart.find((item) => item._id === cleanProduct._id);
      if (existing) {
        return { ...state, cart: state.cart.map((item) => item._id === cleanProduct._id ? { ...item, quantity: item.quantity + qty } : item) };
      }
      return { ...state, cart: [...state.cart, { ...cleanProduct, quantity: qty }] };
    }
    case 'REMOVE_FROM_CART':
      return { ...state, cart: state.cart.filter((item) => item._id !== action.payload) };
    case 'UPDATE_QUANTITY':
      return { ...state, cart: state.cart.map((item) => item._id === action.payload.id ? { ...item, quantity: Math.max(1, action.payload.qty) } : item) };
    case 'CLEAR_CART':
      return { ...state, cart: [] };
    case 'SET_CART':
      return { ...state, cart: Array.isArray(action.payload) ? deduplicate(action.payload.filter(isValidCartItem)) : [] };
    case 'SET_WISHLIST':
      return { ...state, wishlist: Array.isArray(action.payload) ? action.payload : [] };
    case 'TOGGLE_WISHLIST': {
      if (!action.payload || !action.payload._id) return state;
      const exists = state.wishlist.find((item) => item._id === action.payload._id);
      if (exists) {
        return { ...state, wishlist: state.wishlist.filter((item) => item._id !== action.payload._id) };
      }
      return { ...state, wishlist: [...state.wishlist, action.payload] };
    }
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_SESSION_READY':
      return { ...state, sessionReady: true };
    case 'LOGOUT':
      saveToStorage(STORAGE_KEY, []);
      saveToStorage(WISHLIST_KEY, []);
      return { ...state, user: null, cart: [], wishlist: [] };
    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, {
    cart: [],
    wishlist: [],
    user: null,
    sessionReady: false,
  });
  const didBootstrap = useRef(false);
  const syncInProgress = useRef(false);
  const lastToken = useRef(localStorage.getItem('token'));
  // Timestamp of the last server push so we don't echo it straight back to the
  // API (which would re-emit cart:updated and create an infinite loop).
  const lastServerSync = useRef(0);
  const lastWishlistSync = useRef(0);

  useEffect(() => {
    const initialWishlist = loadFromStorage(WISHLIST_KEY);
    if (initialWishlist.length > 0) {
      dispatch({ type: 'SET_WISHLIST', payload: initialWishlist });
    }
  }, []);

  useEffect(() => {
    const bootstrapSession = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        dispatch({ type: 'SET_USER', payload: null });
        didBootstrap.current = true;
        dispatch({ type: 'SET_SESSION_READY' });
        return;
      }
      try {
        const { data: profile } = await api.get('/api/auth/profile');
        dispatch({ type: 'SET_USER', payload: profile });
        try {
          const { data: wishlistData } = await api.get('/api/wishlist');
          dispatch({ type: 'SET_WISHLIST', payload: wishlistData.products || wishlistData || [] });
        } catch (err) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[CartContext] wishlist fetch failed:', err?.response?.status || err?.message);
          }
        }
      } catch (err) {
        const status = err?.response?.status;
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[CartContext] bootstrap session failed:', status || err?.response?.data?.message || err?.message);
        }
        if (status === 401 || status === 403 || !err?.response) {
          localStorage.removeItem('token');
          dispatch({ type: 'SET_USER', payload: null });
        }
      } finally {
        didBootstrap.current = true;
        dispatch({ type: 'SET_SESSION_READY' });
      }
    };
    bootstrapSession();
  }, []);

  const prevUserRef = useRef(state.user);

  useEffect(() => {
    const prevUser = prevUserRef.current;
    prevUserRef.current = state.user;
    if (!didBootstrap.current) return;
    if (state.user && !prevUser) {
      const mergeCart = async () => {
        const localItems = loadFromStorage(STORAGE_KEY);
        if (localItems.length > 0) {
          syncInProgress.current = true;
          try {
            await api.put('/api/cart', {
              items: localItems.map((item) => ({ product: item._id, quantity: item.quantity, size: item.size || '', color: item.color || '' })),
            });
          } catch {}
          const { data: cartData } = await api.get('/api/cart');
          const mappedCart = (cartData.items || []).map((item) => ({
            ...(item.product || item), quantity: item.quantity || 1, size: item.size || '', color: item.color || '',
          }));
          dispatch({ type: 'SET_CART', payload: mappedCart });
          syncInProgress.current = false;
        }
        try {
          const { data: wishlistData } = await api.get('/api/wishlist');
          dispatch({ type: 'SET_WISHLIST', payload: wishlistData.products || [] });
        } catch {}
      };
      mergeCart();
      return;
    }
    if (!state.user) {
      saveToStorage(STORAGE_KEY, []);
      saveToStorage(WISHLIST_KEY, []);
      return;
    }
  }, [state.user]);

  useEffect(() => {
    saveToStorage(STORAGE_KEY, state.cart);
    if (BC_CHANNEL) {
      try { BC_CHANNEL.postMessage({ type: 'cart_updated', cart: state.cart }); } catch {}
    }
  }, [state.cart]);

  useEffect(() => {
    if (state.user && didBootstrap.current && !syncInProgress.current && state.cart.length > 0) {
      // Skip the echo of a cart we just received from the server.
      if (Date.now() - lastServerSync.current < 1500) return;
      const timer = setTimeout(() => {
        api.put('/api/cart', {
          items: state.cart.map((item) => ({ product: item._id, quantity: item.quantity, size: item.size || '', color: item.color || '' })),
        }).catch(() => {});
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [state.cart, state.user]);

  useEffect(() => {
    saveToStorage(WISHLIST_KEY, state.wishlist);
    if (BC_CHANNEL) {
      try { BC_CHANNEL.postMessage({ type: 'wishlist_updated', wishlist: state.wishlist }); } catch {}
    }
    if (state.user && didBootstrap.current) {
      if (Date.now() - lastWishlistSync.current < 1500) return;
      const timer = setTimeout(() => {
        api.put('/api/wishlist', { products: state.wishlist.map((item) => item._id) }).catch(() => {});
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [state.wishlist, state.user]);

  const addToCart = useCallback((product, qty = 1) => dispatch({ type: 'ADD_TO_CART', payload: { ...product, _qty: qty } }), []);
  const removeFromCart = useCallback((id) => dispatch({ type: 'REMOVE_FROM_CART', payload: id }), []);
  const updateQuantity = useCallback((id, qty) => dispatch({ type: 'UPDATE_QUANTITY', payload: { id, qty } }), []);
  const clearCart = useCallback(() => dispatch({ type: 'CLEAR_CART' }), []);
  const toggleWishlist = useCallback((product) => dispatch({ type: 'TOGGLE_WISHLIST', payload: product }), []);
  const setUser = useCallback((user) => dispatch({ type: 'SET_USER', payload: user }), []);
  const logout = useCallback(() => dispatch({ type: 'LOGOUT' }), []);

  useEffect(() => {
    if (!BC_CHANNEL) return;
    const handler = (event) => {
      if (!event.data) return;
      if (event.data.type === 'cart_updated') {
        lastServerSync.current = Date.now();
        dispatch({ type: 'SET_CART', payload: event.data.cart || [] });
      } else if (event.data.type === 'wishlist_updated') {
        lastWishlistSync.current = Date.now();
        dispatch({ type: 'SET_WISHLIST', payload: event.data.wishlist || [] });
      }
    };
    BC_CHANNEL.addEventListener('message', handler);
    return () => BC_CHANNEL.removeEventListener('message', handler);
  }, []);

  // Apply a server-authoritative cart snapshot pushed over the socket in real
  // time (e.g. after another tab updates the cart or an order clears it).
  // `syncInProgress` suppresses the debounced PUT so we don't echo it back.
  const setCartFromServer = useCallback((serverItems) => {
    const mapped = (serverItems || []).map((item) => ({
      ...(item.product || item),
      quantity: item.quantity || 1,
      size: item.size || '',
      color: item.color || '',
    }));
    lastServerSync.current = Date.now();
    dispatch({ type: 'SET_CART', payload: mapped });
  }, []);

  const setWishlistFromServer = useCallback((products) => {
    lastWishlistSync.current = Date.now();
    dispatch({ type: 'SET_WISHLIST', payload: Array.isArray(products) ? products : [] });
  }, []);

  const cartCount = useMemo(() => state.cart.reduce((sum, item) => sum + item.quantity, 0), [state.cart]);
  const wishlistCount = useMemo(() => state.wishlist.length, [state.wishlist]);
  const cartTotal = useMemo(() => state.cart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0), [state.cart]);

  // Watch for token appearing (after login via Login.js). If the token is
  // newly set and user is still null, dispatch SET_USER so ProtectedRoute
  // does not briefly show the login modal for pages that render *after*
  // the Login page navigates away but before CartContext's worker has
  // processed the next state update.
  useEffect(() => {
    const currentToken = localStorage.getItem('token');
    const prevToken = lastToken.current;
    lastToken.current = currentToken;
    if (currentToken && !prevToken && !state.user) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[CartContext] token detected post-login, re-bootstrapping');
      }
      const quickFetch = async () => {
        try {
          const { data: profile } = await api.get('/api/auth/profile');
          if (profile) dispatch({ type: 'SET_USER', payload: profile });
        } catch {
          // stale token — keep on null
        }
      };
      quickFetch();
    }
    if (!currentToken && prevToken) {
      localStorage.removeItem('token');
      dispatch({ type: 'SET_USER', payload: null });
    }
  });

  const contextValue = useMemo(() => ({
    cart: state.cart, wishlist: state.wishlist, user: state.user, sessionReady: state.sessionReady,
    cartCount, wishlistCount, cartTotal, addToCart, removeFromCart, updateQuantity, clearCart, toggleWishlist,     setUser, logout,
    setCartFromServer, setWishlistFromServer,
  }), [state.cart, state.wishlist, state.user, state.sessionReady, cartCount, wishlistCount, cartTotal, addToCart, removeFromCart, updateQuantity, clearCart, toggleWishlist, setUser, logout, setCartFromServer, setWishlistFromServer]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
