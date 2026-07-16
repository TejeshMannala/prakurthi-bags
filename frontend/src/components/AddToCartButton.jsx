import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiShoppingBag, FiCheck } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { useNotification } from '../context/NotificationContext';

/**
 * Animated "Add to Cart" button with a ripple effect on click.
 * variant="full" -> labelled pill; variant="icon" -> round icon button.
 */
const AddToCartButton = ({ product, quantity = 1, variant = 'full', className = '', label }) => {
  const { addToCart } = useCart();
  const { showNotification } = useNotification();
  const [ripples, setRipples] = useState([]);
  const [added, setAdded] = useState(false);

  const outOfStock = !product.stock || product.stock <= 0;

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const id = Date.now();
    setRipples((r) => [...r, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples((r) => r.filter((rp) => rp.id !== id)), 600);

    addToCart({ ...product, _qty: quantity });
    showNotification('addToCart');

    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  if (variant === 'icon') {
    return (
      <motion.button
        type="button"
        onClick={handleClick}
        whileTap={{ scale: 0.85 }}
        whileHover={{ scale: 1.08 }}
        disabled={outOfStock}
        aria-label={outOfStock ? 'Out of stock' : 'Add to cart'}
        className={`relative grid place-items-center overflow-hidden rounded-full bg-primary text-white shadow-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:bg-neutral-300 ${className}`}
      >
        {added ? <FiCheck size={18} /> : <FiShoppingBag size={18} />}
        <RippleLayer ripples={ripples} />
      </motion.button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileTap={{ scale: 0.97 }}
      disabled={outOfStock}
      aria-label={outOfStock ? 'Out of stock' : 'Add to cart'}
      className={`relative flex items-center justify-center gap-2 overflow-hidden rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:bg-[#264c40] hover:shadow-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:shadow-none ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {added ? (
          <motion.span key="done" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="flex items-center gap-2">
            <FiCheck size={16} /> Added
          </motion.span>
        ) : (
          <motion.span key="idle" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="flex items-center gap-2">
            <FiShoppingBag size={16} /> {label || (outOfStock ? 'Sold Out' : 'Add to Cart')}
          </motion.span>
        )}
      </AnimatePresence>
      <RippleLayer ripples={ripples} />
    </motion.button>
  );
};

const RippleLayer = ({ ripples }) => (
  <span className="pointer-events-none absolute inset-0">
    <AnimatePresence>
      {ripples.map((r) => (
        <motion.span
          key={r.id}
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: 4, opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            position: 'absolute',
            left: r.x,
            top: r.y,
            width: 12,
            height: 12,
            marginLeft: -6,
            marginTop: -6,
            borderRadius: '9999px',
            background: 'rgba(255,255,255,0.6)',
          }}
        />
      ))}
    </AnimatePresence>
  </span>
);

export default React.memo(AddToCartButton);
