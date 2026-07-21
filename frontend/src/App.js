import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import { SocketProvider } from './context/SocketContext';
import { useCart } from './context/CartContext';
import CouponEngine from './components/CouponEngine';
import { useSettings } from './utils/useSettings';
import { setCurrency } from './utils/formatPrice';
import AppLoader from './components/AppLoader';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Login = lazy(() => import('./pages/Login'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Contact = lazy(() => import('./pages/Contact'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Terms = lazy(() => import('./pages/Terms'));
const FAQ = lazy(() => import('./pages/FAQ'));
const TrackOrder = lazy(() => import('./pages/TrackOrder'));
const ReturnPolicy = lazy(() => import('./pages/ReturnPolicy'));
const ExchangePolicy = lazy(() => import('./pages/ExchangePolicy'));
const ShippingPolicy = lazy(() => import('./pages/ShippingPolicy'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Loads global storefront settings once and keeps the currency symbol in sync.
const SettingsBootstrap = () => {
  const { settings } = useSettings();
  useEffect(() => {
    if (settings?.currency) setCurrency(settings.currency);
  }, [settings?.currency]);
  return null;
};

// Reset the window scroll position to the top on every route change so that
// banners and page headers are always visible immediately (no landing scrolled
// down) and there is no layout shift carried over between pages.
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
};


const Products = lazy(() => import('./pages/Products'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Profile = lazy(() => import('./pages/Profile'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
const OrderTracking = lazy(() => import('./pages/OrderTracking'));
const OrderDetails = lazy(() => import('./pages/OrderDetails'));
const Returns = lazy(() => import('./pages/Returns'));
const SupportTickets = lazy(() => import('./pages/SupportTickets'));

// Branded Suspense fallback — matches the AppLoader design so chunk loads
// show the same branded spinner rather than a plain white-centered div.
const ChunkLoader = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: 16,
  }}>
    <div style={{ position: 'relative', width: 52, height: 52 }}>
      <div className="spinner" style={{ width: 52, height: 52, borderWidth: 3 }} />
    </div>
    <p style={{
      fontFamily: "'Inter', sans-serif",
      fontSize: 13,
      fontWeight: 500,
      color: '#9ca3af',
      letterSpacing: 1,
    }}>
      Loading...
    </p>
  </div>
);

function App() {
  const { sessionReady } = useCart();
  const [showLoader, setShowLoader] = useState(true);

  // Remove the HTML loader from index.html as soon as React mounts.
  // This prevents a flash where both the HTML loader and React content
  // exist in the DOM simultaneously.
  useEffect(() => {
    const htmlLoader = document.getElementById('app-initial-loader');
    if (htmlLoader) {
      htmlLoader.remove();
    }
  }, []);

  // Once session is bootstrapped, fade out the branded loader with a short
  // delay so the fade-out animation is visible (feels smooth, not jarring).
  useEffect(() => {
    if (sessionReady) {
      const timer = setTimeout(() => setShowLoader(false), 300);
      return () => clearTimeout(timer);
    }
  }, [sessionReady]);

  return (
    <>
      {/* Branded loading screen — visible until session is ready */}
      <AppLoader visible={showLoader} />

      <SocketProvider>
        <div className="app-wrapper" style={{
          // Hide the app layout until the loader finishes fading out
          // to prevent a flash of unstyled/partial content
          opacity: showLoader ? 0 : 1,
          transition: 'opacity 0.3s ease 0.1s',
        }}>
          <SettingsBootstrap />
          <ScrollToTop />
          <Navbar />
          <main className="main-content">
            <ErrorBoundary>
              <Suspense fallback={<ChunkLoader />}>
                <CouponEngine>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/products/:id" element={<ProductDetail />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/wishlist" element={<Wishlist />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/track-order" element={<TrackOrder />} />
                  <Route path="/return-policy" element={<ReturnPolicy />} />
                  <Route path="/exchange-policy" element={<ExchangePolicy />} />
                  <Route path="/shipping-policy" element={<ShippingPolicy />} />
                  <Route element={<ProtectedRoute />}>
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/order-success/:id" element={<OrderSuccess />} />
                    <Route path="/order-tracking/:id" element={<OrderTracking />} />
                    <Route path="/orders/:id" element={<OrderDetails />} />
                    <Route path="/returns" element={<Returns />} />
                    <Route path="/support" element={<SupportTickets />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
                </CouponEngine>
              </Suspense>
            </ErrorBoundary>
          </main>
          <Footer />
        </div>
      </SocketProvider>
    </>
  );
}

export default App;
