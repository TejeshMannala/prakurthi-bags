import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiX,
  FiCheck,
  FiHeart,
  FiShoppingBag,
  FiTrash2,
  FiAlertTriangle,
} from "react-icons/fi";
import { FaStar } from "react-icons/fa";

const NotificationContext = createContext();

const notifications = {
  login: {
    icon: <FiCheck />,
    message: "Welcome to the Prakruthi Family",
    color: "#2E5A44",
  },

  addToCart: {
    icon: <FiShoppingBag />,
    message: "Product added to your basket",
    color: "#2E5A44",
  },

  wishlist: {
    icon: <FiHeart />,
    message: "Added to wishlist",
    color: "#dc2626",
  },

  remove: {
    icon: <FiTrash2 />,
    message: "Product removed",
    color: "#dc2626",
  },

  checkoutLogin: {
    icon: <FiAlertTriangle />,
    message: "Please login first",
    color: "#f59e0b",
  },

  order: {
    icon: <FiCheck />,
    message: "Order placed successfully!",
    color: "#2E5A44",
  },

  coupon: {
    icon: <FiCheck />,
    message: "Coupon applied successfully!",
    color: "#D4A853",
  },

  orderShipped: {
    icon: <FiShoppingBag />,
    message: "Your order has been shipped!",
    color: "#2E5A44",
  },

  ticketReply: {
    icon: <FiCheck />,
    message: "New reply on your support ticket",
    color: "#2E5A44",
  },

  reviewApproved: {
    icon: <FaStar />,
    message: "Your review has been approved",
    color: "#2E5A44",
  },

  error: {
    icon: <FiAlertTriangle />,
    message: "Something went wrong",
    color: "#dc2626",
  },
};

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState(null);

  const showNotification = useCallback((type, customMessage) => {
    const config = notifications[type] || notifications.addToCart;

    setNotification({
      icon: config.icon,
      message: customMessage || config.message,
      color: config.color,
      id: Date.now(),
    });

    setTimeout(() => {
      setNotification(null);
    }, 3500);
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification }}>
      {children}

      <AnimatePresence>
        {notification && (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: -50, x: "-50%", scale: 0.9 }}
            animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
            exit={{ opacity: 0, y: -50, x: "-50%", scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            style={{
              position: "fixed",
              top: 100,
              left: "50%",
              zIndex: 10000,
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "16px 28px",
              borderRadius: 16,
              background: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.3)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              fontSize: 15,
              fontWeight: 600,
              color: "#1a1a1a",
              whiteSpace: "nowrap",
              cursor: "pointer",
            }}
            onClick={hideNotification}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: notification.color,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              {notification.icon}
            </div>

            <span>{notification.message}</span>

            <FiX
              style={{
                marginLeft: 8,
                opacity: 0.5,
                fontSize: 14,
                cursor: "pointer",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const ctx = useContext(NotificationContext);

  if (!ctx) {
    throw new Error("useNotification must be used within NotificationProvider");
  }

  return ctx;
};