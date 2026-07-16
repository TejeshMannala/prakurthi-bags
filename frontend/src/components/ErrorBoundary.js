import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, isChunkError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error) {
    const isChunkError = error.name === 'ChunkLoadError' ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('ChunkLoadError') ||
      (error.name === 'TypeError' && error.message?.includes('Failed to fetch dynamically imported module'));
    return { hasError: true, error, isChunkError };
  }

  componentDidCatch(error, errorInfo) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    }
    if (this.state.isChunkError) {
      const retries = this.state.retryCount;
      if (retries < 2) {
        setTimeout(() => {
          this.setState({ retryCount: retries + 1, hasError: false, error: null });
          window.location.reload();
        }, 2000);
      }
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.state.isChunkError) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 24, textAlign: 'center' }}>
            <div className="spinner" />
            <h3 style={{ marginTop: 20, color: '#374151' }}>Loading update...</h3>
            <p style={{ color: '#6b7280', fontSize: 14, marginTop: 8 }}>
              {this.state.retryCount < 2 ? 'Refreshing to load latest version...' : 'Having trouble loading. Please try again.'}
            </p>
            {this.state.retryCount >= 2 && (
              <button
                onClick={() => { this.setState({ retryCount: 0, hasError: false, error: null }); window.location.reload(); }}
                style={{
                  marginTop: 16, padding: '10px 24px', background: '#2E5A44', color: '#fff',
                  border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
                }}
              >
                Reload Page
              </button>
            )}
          </div>
        );
      }
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 24, textAlign: 'center' }}>
          <p style={{ color: '#6b7280', fontSize: 15, marginBottom: 8 }}>
            Something went wrong while loading this section.
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
              marginBottom: 16,
              textAlign: 'left',
              color: '#991b1b',
            }}>
              {this.state.error.stack || this.state.error.message}
            </pre>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              style={{
                padding: '10px 24px', background: '#2E5A44', color: '#fff',
                border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
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

export default ErrorBoundary;
