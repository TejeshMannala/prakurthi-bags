import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiLock, FiUnlock, FiCheck } from 'react-icons/fi';
import api from '../utils/axios';

const CouponMilestonePanel = ({ subtotal = 0, onApply }) => {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const total = typeof subtotal === 'number' && !isNaN(subtotal) ? subtotal : 0;
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(`/api/coupons/milestones?subtotal=${total}`);
        if (!cancelled) setMilestones(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setMilestones([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [subtotal]);

  if (loading) return null;
  if (milestones.length === 0) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#2E5A44', marginBottom: 12 }}>
        Unlock Rewards
      </h3>
      <div style={{ display: 'grid', gap: 12 }}>
        {milestones.map((c) => {
          const pct = Math.min(100, c.progress || 0);
          const unlocked = c.unlocked;
          const amount = c.discountValue || 0;
          const label = c.discountType === 'percentage' ? `${amount}% OFF` : `₹${amount} OFF`;
          return (
            <motion.div
              key={c.code}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="coupon-milestone-card"
              style={{
                position: 'relative',
                padding: '14px 16px',
                borderRadius: 16,
                border: `1.5px solid ${unlocked ? '#10b981' : 'rgba(0,0,0,0.08)'}`,
                background: unlocked
                  ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.04))'
                  : 'rgba(255,255,255,0.6)',
                boxShadow: unlocked ? '0 0 0 3px rgba(16,185,129,0.12)' : 'none',
                filter: unlocked ? 'none' : 'blur(0.3px)',
                overflow: 'hidden',
              }}
            >
              {unlocked && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="coupon-glow"
                  style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    background: 'radial-gradient(circle at 90% 10%, rgba(16,185,129,0.18), transparent 55%)',
                  }}
                />
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 38, height: 38, borderRadius: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: unlocked ? '#10b981' : 'rgba(0,0,0,0.05)',
                      color: unlocked ? '#fff' : '#9ca3af',
                    }}
                  >
                    {unlocked ? <FiUnlock size={18} /> : <FiLock size={18} />}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{label}</p>
                    <p style={{ fontSize: 12, color: '#6b7280' }}>{c.code}</p>
                  </div>
                </div>
                {unlocked ? (
                  <button
                    onClick={() => onApply && onApply(c.code)}
                    style={{
                      padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      background: '#10b981', color: '#fff', fontWeight: 700, fontSize: 13,
                    }}
                  >
                    Apply
                  </button>
                ) : (
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af' }}>
                    Spend ₹{c.remaining?.toLocaleString()} more
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div style={{ marginTop: 10, height: 6, background: 'rgba(0,0,0,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    background: unlocked ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#a855f7,#6366f1)',
                    borderRadius: 999,
                  }}
                />
              </div>
              {unlocked && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, color: '#059669', fontSize: 11, fontWeight: 600 }}>
                  <FiCheck size={12} /> Unlocked
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default CouponMilestonePanel;
