import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '50vh',
      padding: 24,
      textAlign: 'center',
    }}>
      <h1 style={{
        fontSize: 72,
        fontWeight: 300,
        color: '#2E5A44',
        margin: 0,
        lineHeight: 1,
      }}>404</h1>
      <p style={{
        color: '#6b7280',
        fontSize: 16,
        margin: '12px 0 24px',
      }}>
        The page you're looking for doesn't exist.
      </p>
      <Link
        to="/"
        className="btn btn-primary"
      >
        Go Home
      </Link>
    </div>
  );
};

export default NotFound;
