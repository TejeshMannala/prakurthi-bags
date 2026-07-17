import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import App from './App';
import { store } from './store';
import { CartProvider } from './context/CartContext';
import { NotificationProvider } from './context/NotificationContext';
import RootBoundary from './components/RootBoundary';
import './styles/theme.css';
import './styles/home.css';
import './index.css';

// Session bootstrap is handled by CartContext (bootstrapSession) which calls
// GET /api/auth/profile on mount. Do NOT dispatch fetchProfile() here as it
// creates a DUPLICATE profile request on every page load (both Redux and
// CartContext would fire simultaneously), contributing to 429 rate-limit
// errors on the backend.

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <RootBoundary>
    <BrowserRouter>
      <Provider store={store}>
        <CartProvider>
          <NotificationProvider>
            <App />
          </NotificationProvider>
        </CartProvider>
      </Provider>
    </BrowserRouter>
  </RootBoundary>
);
