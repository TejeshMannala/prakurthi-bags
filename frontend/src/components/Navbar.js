import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSearch, FiHeart, FiShoppingBag, FiUser, FiMenu, FiX, FiLogOut, FiPackage,
  FiStar, FiChevronDown, FiShield, FiHeadphones, FiGrid, FiBook, FiBriefcase,
  FiGift, FiShoppingCart, FiCloud, FiTruck, FiMapPin,
} from 'react-icons/fi';
import { FaLaptop as FiLaptop } from 'react-icons/fa';
import api from '../utils/axios';
import { useCart } from '../context/CartContext';
import NotificationBell from './NotificationBell';
import AuthPopup from './AuthPopup';
import { useSettings } from '../utils/useSettings';
import { onContentChanged } from '../utils/contentSync';

const ANNOUNCEMENTS = [
  '🌿 Together We Have Replaced 125,000 Plastic Bags',
  '🚚 Free Shipping Above ₹999',
  '♻️ Choose Reusable. Save Nature.',
  '🌱 Every Bag You Buy Plants A Greener Tomorrow',
];

const catIcon = (name = '') => {
  const n = name.toLowerCase();
  if (n.includes('school')) return FiBook;
  if (n.includes('college') || n.includes('student')) return FiBook;
  if (n.includes('office') || n.includes('laptop')) return FiLaptop;
  if (n.includes('jute')) return FiShoppingCart;
  if (n.includes('gift')) return FiGift;
  if (n.includes('shop')) return FiShoppingCart;
  if (n.includes('travel') || n.includes('duffel') || n.includes('backpack')) return FiCloud;
  if (n.includes('hand') || n.includes('tote')) return FiShoppingBag;
  return FiBriefcase;
};

const FALLBACK_CATS = [
  'School Bags', 'College Bags', 'Office Bags', 'Jute Bags',
  'Gift Jute Bags', 'Shopping Bags', 'Laptop Bags', 'Hand Bags',
  'Tote Bags', 'Backpack Bags', 'Sling Bags', 'Duffel Bags',
];

const Navbar = () => {
  const { cartCount, wishlistCount, user, logout } = useCart();
  const { settings } = useSettings();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const profileRef = useRef(null);
  const catRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let active = true;
    const load = () => {
      api.get('/api/categories').then(({ data }) => {
        if (active && Array.isArray(data)) setCategories(data);
      }).catch(() => {});
    };
    load();
    const off = onContentChanged('category:updated', load);
    return () => { active = false; off(); };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (catRef.current && !catRef.current.contains(e.target)) setCatDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change and reset the scrolled state so the navbar
  // style is consistent (and not stuck in its "scrolled" look) on a fresh page.
  useEffect(() => {
    setMenuOpen(false);
    setCatDropdownOpen(false);
    setProfileOpen(false);
    setSearchOpen(false);
    setScrolled(false);
  }, [location.pathname]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    setSearchOpen(false);
    setSearchQuery('');
  };

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
      await api.delete('/api/cart');
    } catch {}
    localStorage.removeItem('token');
    logout();
    setProfileOpen(false);
    navigate('/');
  };

  const transparent = isHome && !scrolled;
  const catList = categories.length
    ? categories.map((c) => ({ name: c.name }))
    : FALLBACK_CATS.map((name) => ({ name }));

  return (
    <>
      {/* Animated Announcement Bar — admin-configured message takes priority */}
      <div className="announce-bar" aria-hidden="true">
        <div className="announce-track">
          {settings?.announcement
            ? [...Array(4)].map((_, i) => (
                <span className="announce-item" key={i}>
                  <span className="dot">●</span> {settings.announcement}
                </span>
              ))
            : [...ANNOUNCEMENTS, ...ANNOUNCEMENTS].map((text, i) => (
                <span className="announce-item" key={i}>
                  <span className="dot">●</span> {text}
                </span>
              ))}
        </div>
      </div>

      <header className={`navbar${scrolled ? ' scrolled' : ''}${transparent ? ' transparent' : ''}`}>
        <div className="navbar-inner">
          <Link to="/" className="navbar-logo" aria-label="Prakruthi Bags home">
            {settings?.logo ? (
              <img src={settings.logo} alt={settings.companyName || 'Home'} className="navbar-logo-img" />
            ) : (
              <>{settings?.companyName?.split(' ')[0] || 'Prakruthi'}<span>.</span></>
            )}
          </Link>

          <nav className={`navbar-nav${menuOpen ? ' open' : ''}`}>
            <div className="nav-category-dropdown" ref={catRef}>
              {/* <button
                className="nav-category-trigger"
                onClick={() => setCatDropdownOpen(!catDropdownOpen)}
                aria-expanded={catDropdownOpen}
              >
                Shop <FiChevronDown size={14} style={{ marginLeft: 4 }} />
              </button> */}
              {catDropdownOpen && (
                <div className="nav-mega">
                  {catList.map((cat) => {
                    const Icon = catIcon(cat.name);
                    return (
                      <Link
                        key={cat.name}
                        to={`/products?category=${encodeURIComponent(cat.name)}`}
                        className="nav-mega-item"
                        onClick={() => { setMenuOpen(false); setCatDropdownOpen(false); }}
                      >
                        <span className="nav-mega-icon"><Icon /></span>
                        <span>
                          <span className="nav-mega-label" style={{ display: 'block' }}>{cat.name}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
            <NavLink to="/about" onClick={() => setMenuOpen(false)}>About</NavLink>
            <NavLink to="/products" onClick={() => setMenuOpen(false)}>All Bags</NavLink>
            {user && <NavLink to="/support" onClick={() => setMenuOpen(false)}><FiHeadphones size={14} /> Support</NavLink>}
          </nav>

          <div className="navbar-actions">
            {/* <button className="cart-icon" aria-label="Search" onClick={() => setSearchOpen(true)}>
              <FiSearch />
            </button> */}
            <Link to="/wishlist" className="cart-icon" aria-label="Wishlist">
              <FiHeart />
              {wishlistCount > 0 && <span className="badge">{wishlistCount}</span>}
            </Link>
            <Link to="/cart" className="cart-icon" aria-label="Shopping Bag">
              <FiShoppingBag />
              {cartCount > 0 && <span className="badge">{cartCount}</span>}
            </Link>

            <NotificationBell />

            <div className="profile-dropdown" ref={profileRef}>
              <button className="profile-trigger" onClick={() => setProfileOpen(!profileOpen)} aria-label="User Profile">
                <FiUser />
                {user && <FiChevronDown size={14} style={{ marginLeft: 2 }} />}
              </button>
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    className="profile-menu"
                    style={{ color: '#1F2937' }}
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                  >
                    {user ? (
                      <>
                        <div className="profile-menu-header">
                          <strong style={{ color: '#1F2937' }}>{user.name}</strong>
                          <span style={{ color: '#6B7280', fontSize: 12 }}>{user.email}</span>
                        </div>
                        <div className="profile-menu-divider" />
                        <Link to="/profile" className="profile-menu-item" style={{ color: '#1F2937' }} onClick={() => setProfileOpen(false)}>
                          <FiUser size={16} style={{ color: '#1B5E20', flexShrink: 0 }} /> <span>Profile</span>
                        </Link>
                        <Link to="/profile" className="profile-menu-item" style={{ color: '#1F2937' }} onClick={() => setProfileOpen(false)}>
                          <FiPackage size={16} style={{ color: '#1B5E20', flexShrink: 0 }} /> <span>Orders</span>
                        </Link>
                        <Link to="/support" className="profile-menu-item" style={{ color: '#1F2937' }} onClick={() => setProfileOpen(false)}>
                          <FiHeadphones size={16} style={{ color: '#1B5E20', flexShrink: 0 }} /> <span>Support</span>
                        </Link>
                        <Link to="/wishlist" className="profile-menu-item" style={{ color: '#1F2937' }} onClick={() => setProfileOpen(false)}>
                          <FiStar size={16} style={{ color: '#1B5E20', flexShrink: 0 }} /> <span>Wishlist</span>
                        </Link>
                        {user.role === 'admin' && (
                          <a
                            href={`${process.env.REACT_APP_API_URL || window.location.origin}/admin`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="profile-menu-item"
                            style={{ color: '#1F2937' }}
                            onClick={() => setProfileOpen(false)}
                          >
                            <FiShield size={16} style={{ color: '#1B5E20', flexShrink: 0 }} /> <span>Admin Panel</span>
                          </a>
                        )}
                        <div className="profile-menu-divider" />
                        <button className="profile-menu-item" style={{ color: '#1F2937' }} onClick={handleLogout}>
                          <FiLogOut size={16} style={{ color: '#1B5E20', flexShrink: 0 }} /> <span>Logout</span>
                        </button>
                      </>
                    ) : (
                      <AuthPopup onNavigate={() => setProfileOpen(false)} />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button className="mobile-menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
              {menuOpen ? <FiX /> : <FiMenu />}
            </button>
          </div>
        </div>
      </header>

      {searchOpen && (
        <div className="search-overlay" onClick={() => setSearchOpen(false)}>
          <form onSubmit={handleSearch} onClick={(e) => e.stopPropagation()} className="search-form">
            <input
              autoFocus
              type="text"
              placeholder="Search eco bags by name, category, or material..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="search-submit-btn">Search</button>
          </form>
        </div>
      )}
    </>
  );
};

export default Navbar;
