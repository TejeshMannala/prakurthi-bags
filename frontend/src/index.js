import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Provider } from 'react-redux';
import App from './App';
import { store } from './store';
import { CartProvider } from './context/CartContext';
import { NotificationProvider } from './context/NotificationContext';
import RootBoundary from './components/RootBoundary';
import './styles/theme.css';
import './styles/home.css';
import './index.css';

const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <RootBoundary>
    <BrowserRouter>
      <GoogleOAuthProvider clientId={googleClientId}>
        <Provider store={store}>
          <CartProvider>
            <NotificationProvider>
              <App />
            </NotificationProvider>
          </CartProvider>
        </Provider>
      </GoogleOAuthProvider>
    </BrowserRouter>
  </RootBoundary>
);
