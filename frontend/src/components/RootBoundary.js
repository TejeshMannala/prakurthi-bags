import React from 'react';

class RootBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, isNetworkError: false };
  }

  static getDerivedStateFromError(error) {
    const isNetworkError = !navigator.onLine ||
      error.message?.includes('Network') ||
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('Load failed');
    return { hasError: true, error, isNetworkError };
  }

  componentDidCatch(error, errorInfo) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[RootBoundary] Caught error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.state.isNetworkError) {
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
            background: '#f8faf8',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: '#fef3c7', color: '#f59e0b',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, marginBottom: 20,
            }}>
              !
            </div>
            <h2 style={{ color: '#374151', marginBottom: 8, fontSize: 20 }}>
              Connection Problem
            </h2>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20, maxWidth: 400 }}>
              It looks like you're offline or the server is unreachable. Please check your internet connection and try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 24px',
                background: '#2E5A44',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Try Again
            </button>
          </div>
        );
      }

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
          background: '#f8faf8',
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
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                window.location.href = '/';
              }}
              style={{
                padding: '10px 24px',
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Clear Data & Reload
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 24px',
                background: '#2E5A44',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default RootBoundary;
