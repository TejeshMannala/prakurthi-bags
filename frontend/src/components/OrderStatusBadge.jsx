import React from 'react';
import { motion } from 'framer-motion';
import {
  FiClock, FiCheckCircle, FiBox, FiTruck, FiMapPin, FiCheck,
  FiXCircle, FiRotateCcw, FiDollarSign, FiPackage, FiStar,
} from 'react-icons/fi';

// Central source of truth for every order status used across the app.
// Each entry carries accessible label, icon and Tailwind classes (bg + text).
export const STATUS_CONFIG = {
  Pending: { label: 'Pending', icon: FiClock, cls: 'bg-amber-100 text-amber-700 ring-amber-200' },
  Processing: { label: 'Processing', icon: FiPackage, cls: 'bg-blue-100 text-blue-700 ring-blue-200' },
  Confirmed: { label: 'Confirmed', icon: FiCheckCircle, cls: 'bg-indigo-100 text-indigo-700 ring-indigo-200' },
  Packed: { label: 'Packed', icon: FiBox, cls: 'bg-purple-100 text-purple-700 ring-purple-200' },
  Shipped: { label: 'Shipped', icon: FiTruck, cls: 'bg-cyan-100 text-cyan-700 ring-cyan-200' },
  'Out For Delivery': { label: 'Out For Delivery', icon: FiMapPin, cls: 'bg-orange-100 text-orange-700 ring-orange-200' },
  Delivered: { label: 'Delivered', icon: FiCheck, cls: 'bg-emerald-100 text-emerald-700 ring-emerald-200' },
  Completed: { label: 'Completed', icon: FiStar, cls: 'bg-emerald-100 text-emerald-700 ring-emerald-200' },
  Cancelled: { label: 'Cancelled', icon: FiXCircle, cls: 'bg-rose-100 text-rose-700 ring-rose-200' },
  Returned: { label: 'Returned', icon: FiRotateCcw, cls: 'bg-pink-100 text-pink-700 ring-pink-200' },
  Refunded: { label: 'Refunded', icon: FiDollarSign, cls: 'bg-teal-100 text-teal-700 ring-teal-200' },
};

const DEFAULT = { label: 'Unknown', icon: FiClock, cls: 'bg-gray-100 text-gray-600 ring-gray-200' };

const OrderStatusBadge = ({ status, size = 'md', pulse = false, className = '' }) => {
  const conf = STATUS_CONFIG[status] || DEFAULT;
  const Icon = conf.icon;

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-3 py-1 gap-1.5',
    lg: 'text-sm px-4 py-1.5 gap-2',
  };
  const iconSizes = { sm: 11, md: 13, lg: 16 };

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.06 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      role="status"
      aria-label={`Order status: ${conf.label}`}
      className={`relative inline-flex items-center rounded-full font-bold ring-1 ring-inset ${conf.cls} ${sizes[size]} ${className}`}
    >
      {pulse && (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ boxShadow: '0 0 0 0 currentColor' }}
          animate={{ boxShadow: ['0 0 0 0px rgba(0,0,0,0)', '0 0 0 6px rgba(0,0,0,0.08)', '0 0 0 0px rgba(0,0,0,0)'] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <Icon size={iconSizes[size]} aria-hidden="true" />
      {conf.label}
    </motion.span>
  );
};

export default OrderStatusBadge;
