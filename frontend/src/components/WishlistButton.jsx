import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiHeart } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { useNotification } from '../context/NotificationContext';

/**
 * Floating wishlist heart with a "pop" animation on toggle.
 * Reads wishlist membership straight from CartContext so it stays in sync
 * everywhere (navbar, cards, detail page).
 */
const WishlistButton = ({ product, className = '', size = 18 }) => {
  const { wishlist, toggleWishlist } = useCart();
  const { showNotification } = useNotification();
  const [pop, setPop] = useState(false);

  const active = wishlist.some((p) => p && p._id === product._id);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const wasActive = active;
    toggleWishlist(product);
    setPop(true);
    setTimeout(() => setPop(false), 450);
    showNotification(wasActive ? 'remove' : 'wishlist');
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileTap={{ scale: 0.82 }}
      aria-pressed={active}
      aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
      className={`relative grid place-items-center rounded-full border border-white/60 bg-white/70 shadow-md backdrop-blur-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-rose-300 ${
        active ? 'text-rose-500' : 'text-neutral-600 hover:text-rose-500'
      } ${className}`}
    >
      <AnimatePresence>
        {pop && (
          <motion.span
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ scale: 1.8, opacity: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.45 }}
            className="absolute inset-0 rounded-full bg-rose-200"
          />
        )}
      </AnimatePresence>
      <motion.span animate={pop ? { scale: [1, 1.45, 1] } : {}} transition={{ duration: 0.45 }}>
        <FiHeart size={size} fill={active ? '#f43f5e' : 'none'} />
      </motion.span>
    </motion.button>
  );
};

export default React.memo(WishlistButton);
