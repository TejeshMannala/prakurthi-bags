import React, { useState, useEffect, useRef } from 'react';

/**
 * Branded app loading screen.
 *
 * Shown while:
 *  - React is initializing (replaces the HTML loader in index.html)
 *  - Session is bootstrapping (CartContext)
 *  - Lazy chunks are loading (Suspense)
 *
 * The component matches the HTML loader in index.html exactly so the
 * transition from "pre-React HTML" -> "React mounted but still loading"
 * is completely seamless (no flash, no layout shift).
 *
 * Props:
 *   visible  — when false, triggers a 400ms fade-out then unmounts
 *   children — optional; rendered after fade-out completes (not used here,
 *              App.js handles its own render after loader unmounts)
 */
const AppLoader = ({ visible = true }) => {
  const [fadeOut, setFadeOut] = useState(false);
  const [mounted, setMounted] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!visible) {
      setFadeOut(true);
      timerRef.current = setTimeout(() => setMounted(false), 450);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  if (!mounted) return null;

  return (
    <div
      className={`app-loader ${fadeOut ? 'fade-out' : ''}`}
      role="status"
      aria-label="Loading"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F8F5EE',
        transition: 'opacity 0.4s ease, visibility 0.4s ease',
        opacity: fadeOut ? 0 : 1,
        visibility: fadeOut ? 'hidden' : 'visible',
      }}
    >
      {/* Logo with animated ring */}
      <div style={{ position: 'relative', width: 88, height: 88, marginBottom: 24 }}>
        <img
          src={process.env.PUBLIC_URL + '/icon-192.png'}
          alt="Prakruthi Bags"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextElementSibling.style.display = 'flex';
          }}
          style={{
            width: 88,
            height: 88,
            borderRadius: 22,
            objectFit: 'cover',
            boxShadow: '0 8px 32px rgba(46,90,68,0.18)',
            animation: 'appLoaderPulse 2s ease-in-out infinite',
          }}
        />
        {/* Fallback logo */}
        <div
          style={{
            display: 'none',
            width: 88,
            height: 88,
            borderRadius: 22,
            background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 50%, #81C784 100%)',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontFamily: "'Playfair Display', serif",
            fontSize: 36,
            fontWeight: 800,
            boxShadow: '0 8px 32px rgba(46,90,68,0.18)',
            animation: 'appLoaderPulse 2s ease-in-out infinite',
          }}
        >
          P
        </div>
        {/* Spinning ring */}
        <div
          style={{
            position: 'absolute',
            inset: -6,
            border: '3px solid transparent',
            borderTopColor: '#2E5A44',
            borderRightColor: '#81C784',
            borderRadius: '50%',
            animation: 'appLoaderSpin 1.2s linear infinite',
          }}
        />
      </div>

      {/* Brand name */}
      <div
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 22,
          fontWeight: 700,
          color: '#1B5E20',
          letterSpacing: 0.5,
          marginBottom: 6,
        }}
      >
        Prakruthi Bags
      </div>

      {/* Tagline */}
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 12,
          fontWeight: 500,
          color: '#9ca3af',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          marginBottom: 32,
        }}
      >
        Carry Nature. Carry the Future.
      </div>

      {/* Bouncing dots */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[0, 0.16, 0.32].map((delay, i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#2E5A44',
              animation: `appLoaderBounce 1.4s ease-in-out ${delay}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default AppLoader;
