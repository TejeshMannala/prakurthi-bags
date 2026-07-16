import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiLogIn, FiUserPlus } from 'react-icons/fi';
import { FaLeaf } from 'react-icons/fa';

const AuthPopup = ({ onNavigate }) => {
  const close = () => onNavigate && onNavigate();

  return (
    <motion.div
      role="dialog"
      aria-label="Sign in or create an account"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="p-4"
    >
      {/* brand mark */}
      <div className="mb-3 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#1B5E20] shadow-md shadow-[#1B5E20]/20">
          <FaLeaf size={16} className="text-white" />
        </span>
        <div className="leading-snug">
          <p className="text-[14px] font-bold text-[#1F2937]">Prakruthi Bags</p>
          <p className="text-[11px] font-medium text-[#6B7280]">Eco-friendly by nature</p>
        </div>
      </div>

      <h2 className="text-[18px] font-bold text-[#1F2937]">Sign In</h2>
      <p className="mb-4 mt-0.5 text-[13px] text-[#6B7280]">
        Welcome back to the eco-movement.
      </p>

      {/* Primary: Sign In */}
      <Link
        to="/login"
        onClick={close}
        aria-label="Sign in to your account"
        className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2E7D32] to-[#1B5E20] px-4 py-3 text-[15px] font-semibold text-white shadow-lg shadow-[#1B5E20]/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#1B5E20]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5E20]/50 active:scale-[0.97]"
      >
        <FiLogIn size={17} /> Sign In
      </Link>

      {/* Divider */}
      <div className="my-3 flex items-center gap-3">
        <span className="h-px flex-1 bg-[#E5E7EB]" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">or</span>
        <span className="h-px flex-1 bg-[#E5E7EB]" />
      </div>

      {/* Secondary: Create Account */}
      <Link
        to="/login?signup=1"
        onClick={close}
        aria-label="Create a new account"
        className="flex items-center justify-center gap-2 rounded-xl border-2 border-[#1B5E20] bg-white px-4 py-3 text-[15px] font-semibold text-[#1B5E20] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1B5E20] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5E20]/50 active:scale-[0.97]"
      >
        <FiUserPlus size={17} /> Create Account
      </Link>

      <p className="mt-4 text-center text-[13px] text-[#6B7280]">
        New here?{' '}
        <Link
          to="/login?signup=1"
          onClick={close}
          className="font-bold text-[#1B5E20] transition-colors duration-200 hover:text-[#14421A] hover:underline focus-visible:outline-none focus-visible:underline"
        >
          Join the family
        </Link>
      </p>
    </motion.div>
  );
};

export default AuthPopup;
