import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft } from 'react-icons/fi';

const BackButton = ({ to, label = 'Back', className = '', style = {} }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to);
    } else {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/');
      }
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: -3 }}
      whileTap={{ scale: 0.95 }}
      className={`back-button ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 20px',
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 100,
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 500,
        color: '#374151',
        transition: 'all 0.2s',
        marginBottom: 20,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        ...style,
      }}
    >
      <FiArrowLeft size={16} />
      {label}
    </motion.button>
  );
};

export default BackButton;
