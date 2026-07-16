import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiGift, FiX, FiChevronRight, FiLock, FiUnlock } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { applyCoupon } from '../features/coupons/couponSlice';
import { useNotification } from '../context/NotificationContext';

const STORAGE_KEY = 'shown_milestone_coupons';

const getShown = () => {
  try { return new Set(JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]')); }
  catch { return new Set(); }
};

const markShown = (code) => {
  try {
    const s = getShown();
    s.add(code);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...s]));
  } catch {}
};

// Build a display config from a dynamic milestone coupon coming from MongoDB.
const buildConfig = (coupon) => {
  const discount = coupon.discountValue || 0;
  const label = coupon.discountType === 'percentage'
    ? `${discount}% OFF`
    : `₹${discount} OFF`;
  return {
    code: coupon.code,
    title: coupon.unlockTitle || 'Congratulations!',
    subtitle: `Coupon ${coupon.code} Activated`,
    label,
    discount,
    emoji: coupon.unlockEmoji || '🎉',
    gradient: coupon.unlockGradient || 'from-purple-600 via-purple-500 to-pink-500',
    description: coupon.description || '',
  };
};

export default function CouponMilestonePopup({ milestones = [], cartTotal = 0, onApplied }) {
  const dispatch = useDispatch();
  const { showNotification } = useNotification();
  const { appliedCoupon } = useSelector((state) => state.coupons);

  const [activePopup, setActivePopup] = useState(null);
  const [confetti, setConfetti] = useState(false);
  const [shown, setShown] = useState(() => getShown());

  // When a new milestone coupon becomes unlocked, surface its popup once.
  useEffect(() => {
    if (appliedCoupon) return;
    const latest = [...milestones]
      .filter((m) => m.unlocked && !shown.has(m.code))
      .sort((a, b) => (b.minimumOrderAmount || 0) - (a.minimumOrderAmount || 0))[0];

    if (latest) {
      setActivePopup(buildConfig(latest));
      setConfetti(true);
      setShown((prev) => {
        const next = new Set(prev);
        next.add(latest.code);
        markShown(latest.code);
        return next;
      });
      const t = setTimeout(() => setConfetti(false), 3000);
      return () => clearTimeout(t);
    }
  }, [milestones, appliedCoupon, shown]);

  // Auto-hide after 4 seconds (spec requirement).
  useEffect(() => {
    if (!activePopup) return;
    const timer = setTimeout(() => setActivePopup(null), 4000);
    return () => clearTimeout(timer);
  }, [activePopup]);

  const handleApply = () => {
    if (!activePopup) return;
    dispatch(applyCoupon({ code: activePopup.code, orderAmount: cartTotal }))
      .unwrap()
      .then(() => {
        showNotification('coupon', `${activePopup.code} applied! You saved ${activePopup.label}`);
        setActivePopup(null);
        if (onApplied) onApplied(activePopup.code);
      })
      .catch((err) => {
        showNotification('checkoutLogin', typeof err === 'string' ? err : 'Failed to apply coupon');
      });
  };

  if (!activePopup) return null;

  return (
    <AnimatePresence>
      {activePopup && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 50 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed top-24 right-4 z-[100] max-w-sm w-[calc(100%-2rem)]"
        >
          <div
            className={`relative bg-gradient-to-br ${activePopup.gradient} rounded-2xl p-6 shadow-2xl border border-white/20 backdrop-blur-xl overflow-hidden`}
          >
            {/* Progress ring animation */}
            <motion.div
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1 }}
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(circle at 80% 0%, rgba(255,255,255,0.25), transparent 60%)' }}
            />

            {confetti && (
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(24)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 1, y: 0, x: 0, scale: 0 }}
                    animate={{
                      opacity: 0,
                      y: -200 - Math.random() * 200,
                      x: (Math.random() - 0.5) * 220,
                      scale: 1,
                      rotate: Math.random() * 720,
                    }}
                    transition={{ duration: 1.5 + Math.random(), delay: Math.random() * 0.5 }}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      left: `${30 + Math.random() * 40}%`,
                      top: '50%',
                      background: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][i % 6],
                    }}
                  />
                ))}
              </div>
            )}

            <button
              onClick={() => setActivePopup(null)}
              className="absolute top-3 right-3 text-white/60 hover:text-white transition-colors"
            >
              <FiX size={18} />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm"
              >
                <span className="text-2xl">{activePopup.emoji}</span>
              </motion.div>
              <div>
                <h3 className="text-white font-extrabold text-lg">{activePopup.title}</h3>
                <p className="text-white/80 text-sm font-medium">{activePopup.subtitle}</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-sm">You unlocked</span>
                <span className="text-white font-black text-2xl">{activePopup.label}</span>
              </div>
              <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-yellow-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleApply}
                className="flex-1 bg-white text-purple-700 font-bold py-3 px-4 rounded-xl hover:bg-white/90 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <FiUnlock size={16} /> Apply Coupon
              </motion.button>
              <button
                onClick={() => setActivePopup(null)}
                className="px-4 py-3 text-white/70 hover:text-white font-medium text-sm transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
