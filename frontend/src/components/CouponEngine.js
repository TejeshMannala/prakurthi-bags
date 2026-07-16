import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useCart } from '../context/CartContext';
import api from '../utils/axios';
import CouponMilestonePopup from './CouponMilestonePopup';

export function useCouponEngine() {
  const { cartTotal: contextCartTotal } = useCart();
  const reduxTotal = useSelector((state) => state.cart.cartTotalAmount);
  const cartTotal = typeof reduxTotal === 'number' && reduxTotal > 0 ? reduxTotal : contextCartTotal;

  const [milestones, setMilestones] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const total = typeof cartTotal === 'number' && !isNaN(cartTotal) ? cartTotal : 0;
        const { data } = await api.get(`/api/coupons/milestones?subtotal=${total}`);
        if (!cancelled) setMilestones(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setMilestones([]);
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [cartTotal]);

  return { milestones, cartTotal };
}

const CouponEngine = ({ children }) => {
  const { milestones, cartTotal } = useCouponEngine();
  const appliedRef = useRef(null);

  return (
    <>
      {children}
      <CouponMilestonePopup
        milestones={milestones}
        cartTotal={cartTotal}
        onApplied={(code) => { appliedRef.current = code; }}
      />
    </>
  );
};

export default CouponEngine;
