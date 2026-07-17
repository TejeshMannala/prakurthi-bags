import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import App from './App';
import { store } from './store';
import { fetchProfile } from './features/auth/authSlice';
import { CartProvider } from './context/CartContext';
import { NotificationProvider } from './context/NotificationContext';
import RootBoundary from './components/RootBoundary';
import './styles/theme.css';
import './styles/home.css';
import './index.css';

// Restore the Redux auth slice on startup so a valid JWT in localStorage
// re-hydrates the user immediately after a page refresh (no logout flash).
if (localStorage.getItem('token')) {
  store.dispatch(fetchProfile());
}

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
