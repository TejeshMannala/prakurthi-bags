import React from 'react';

class RootBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[RootBoundary] Caught error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: 24,
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <h2 style={{ color: '#dc2626', marginBottom: 8, fontSize: 22 }}>
            Something went wrong
          </h2>
          <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20, maxWidth: 400 }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <pre style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 6,
              padding: 12,
              fontSize: 12,
              maxWidth: '90vw',
              overflow: 'auto',
              marginBottom: 20,
              textAlign: 'left',
              color: '#991b1b',
            }}>
              {this.state.error.stack || this.state.error.message}
            </pre>
          )}
          <button
            onClick={() => {
              localStorage.removeItem('token');
              window.location.reload();
            }}
            style={{
              padding: '10px 24px',
              background: '#2E5A44',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default RootBoundary;
