import React from 'react';
import { motion } from 'framer-motion';

/**
 * Premium star rating control.
 * - readOnly mode renders accessible rating summary.
 * - interactive mode lets the user pick a star (with hover preview + pop).
 */
const StarRating = ({ value = 0, onChange, size = 18, readOnly = false, count, className = '' }) => {
  const [hover, setHover] = React.useState(0);
  const display = hover || value;

  return (
    <div
      className={`inline-flex items-center gap-0.5 ${className}`}
      role={readOnly ? 'img' : 'radiogroup'}
      aria-label={`Rating ${Number(value).toFixed(1)} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= Math.round(display);
        return (
          <motion.button
            key={star}
            type="button"
            disabled={readOnly}
            aria-label={`${star} star`}
            onMouseEnter={() => !readOnly && setHover(star)}
            onMouseLeave={() => !readOnly && setHover(0)}
            onClick={() => !readOnly && onChange && onChange(star)}
            whileTap={readOnly ? undefined : { scale: 0.75 }}
            whileHover={readOnly ? undefined : { scale: 1.25 }}
            className={readOnly ? 'cursor-default' : 'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-gold/60 rounded'}
            style={{ background: 'none', border: 'none', padding: 0, lineHeight: 0 }}
          >
            <svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill={active ? '#D4A853' : 'none'}
              stroke={active ? '#D4A853' : '#D8CFC0'}
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path
                d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.9 6.2 20.95l1.1-6.45-4.7-4.6 6.5-.95z"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
          </motion.button>
        );
      })}
      {count !== undefined && (
        <span className="ml-1 text-xs font-medium text-neutral-500">({count})</span>
      )}
    </div>
  );
};

export default React.memo(StarRating);
