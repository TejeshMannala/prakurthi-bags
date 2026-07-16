import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useCart } from './CartContext';
import { triggerProductsChanged } from '../utils/productSync';
import { triggerContentChanged } from '../utils/contentSync';
import { emitRealtime } from '../utils/realtime';
import { emitNotificationReceived } from '../utils/notificationSync';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, setCartFromServer, setWishlistFromServer } = useCart();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !user) return;

    let serverUrl;
    const apiUrl = (process.env.REACT_APP_API_URL || '').trim();
    if (apiUrl) {
      serverUrl = apiUrl.replace(/\/api\/?$/, '');
    } else if (process.env.NODE_ENV === 'production') {
      serverUrl = window.location.origin;
    } else {
      serverUrl = 'http://localhost:5000';
    }

    const socket = io(serverUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join', { userId: user._id });
      if (user.role === 'admin') {
        socket.emit('admin:join');
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('product:updated', (payload) => {
      triggerProductsChanged({ reason: 'socket', ...(payload || {}) });
    });

    // Forward admin content edits so any open storefront session refreshes
    // (categories, banners, pages/policies, settings, testimonials, contact).
    const contentEvents = [
      'category:updated', 'banner:updated', 'page:updated',
      'settings:updated', 'testimonial:updated', 'contact:updated',
    ];
    contentEvents.forEach((evt) => {
      socket.on(evt, (payload) => {
        triggerContentChanged(evt, { reason: 'socket', ...(payload || {}) });
      });
    });

    // ---- Real-time cart sync ----
    socket.on('cart:updated', (data) => {
      if (data && Array.isArray(data.items)) {
        setCartFromServer(data.items);
      }
    });

    // ---- Real-time wishlist sync ----
    socket.on('wishlist:updated', (data) => {
      if (data && Array.isArray(data.products)) {
        setWishlistFromServer(data.products);
      }
    });

    // ---- Real-time stock updates (refetch product lists/detail) ----
    socket.on('product:stock', (data) => {
      triggerProductsChanged({ reason: 'stock', ...(data || {}) });
    });

    // ---- Real-time order status + notifications ----
    socket.on('order:updated', (data) => {
      emitRealtime('order:updated', data);
    });
    socket.on('notification', (notif) => {
      emitNotificationReceived(notif);
    });

    // ---- Coupons become available instantly ----
    socket.on('coupon:updated', () => {
      emitRealtime('coupon:updated', {});
      triggerContentChanged('coupon:updated', { reason: 'socket' });
    });

    // ---- Live product view count ----
    socket.on('product:viewers', (data) => {
      emitRealtime('product:viewers', data);
    });

    // ---- Online/offline presence ----
    socket.on('presence:update', (data) => {
      emitRealtime('presence', data);
    });

    socketRef.current = socket;

    return () => {
      socket.close();
    };
  }, [user?._id, user?.role]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  return ctx || { socket: null, connected: false };
};
