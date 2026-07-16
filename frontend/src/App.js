import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import { SocketProvider } from './context/SocketContext';
import CouponEngine from './components/CouponEngine';
import { useSettings } from './utils/useSettings';
import { setCurrency } from './utils/formatPrice';

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

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
    <div className="spinner" />
  </div>
);

function App() {
  return (
    <SocketProvider>
      <div className="app-wrapper">
        <SettingsBootstrap />
        <ScrollToTop />
        <Navbar />
        <main className="main-content">
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
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
  );
}

export default App;
