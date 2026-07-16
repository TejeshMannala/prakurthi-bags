import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiSend, FiInstagram, FiFacebook, FiTwitter, FiLinkedin, FiMapPin, FiMail, FiPhone } from 'react-icons/fi';
import api from '../utils/axios';
import { useSettings } from '../utils/useSettings';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const { settings: s } = useSettings();

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    try {
      await api.post('/api/newsletter', { email });
      setSubscribed(true);
      setEmail('');
    } catch {
      setSubscribed(true);
      setEmail('');
    }
  };

  const companyName = s?.companyName || 'Prakruthi Bags';
  const social = s?.socialLinks || {};
  const contact = s?.contact || {};
  const footerText = s?.footerText || 'Carry Nature. Carry the Future.';

  const footerCats = ['School Bags', 'College Bags', 'Office Bags', 'Jute Bags', 'Gift Bags', 'Shopping Bags', 'Laptop Bags', 'Travel Bags'];

  return (
    <footer className="footer">
      <svg className="wave-divider" viewBox="0 0 1440 70" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,32 C240,80 480,0 720,28 C960,56 1200,80 1440,36 L1440,70 L0,70 Z" />
      </svg>
      <div className="footer-inner">
        <div className="footer-brand">
          <h3>{companyName}</h3>
          <p style={{ fontWeight: 600, color: '#81C784', marginBottom: 8, fontStyle: 'italic' }}>Carry Nature. Carry the Future.</p>
          <p>Handcrafted eco-friendly bags made from jute, cotton, and sustainable textiles. Every purchase supports a greener planet and replaces single-use plastic.</p>
          {contact.address && (
            <p style={{ fontSize: 13, opacity: 0.7, display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <FiMapPin size={14} /> {contact.address}
            </p>
          )}
          <div style={{ marginTop: 16, display: 'flex', gap: 12, fontSize: 20 }}>
            {social.instagram && <a href={social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><FiInstagram /></a>}
            {social.facebook && <a href={social.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><FiFacebook /></a>}
            {social.twitter && <a href={social.twitter} target="_blank" rel="noopener noreferrer" aria-label="Twitter"><FiTwitter /></a>}
            {social.linkedin && <a href={social.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><FiLinkedin /></a>}
          </div>
        </div>

        <div className="footer-col">
          <h4>Quick Links</h4>
          <Link to="/about">About Us</Link>
          <Link to="/products">All Bags</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/faq">FAQ</Link>
          <Link to="/support">Support</Link>
        </div>

        {/* <div className="footer-col">
          <h4>Categories</h4>
          {footerCats.map((c) => (
            <Link key={c} to={`/products?category=${encodeURIComponent(c)}`}>{c}</Link>
          ))}
        </div> */}

        <div className="footer-col">
          <h4>Policies</h4>
          <Link to="/privacy-policy">Privacy Policy</Link>
          <Link to="/terms">Terms & Conditions</Link>
          <Link to="/shipping-policy">Shipping Policy</Link>
          <Link to="/return-policy">Return Policy</Link>
          <Link to="/exchange-policy">Exchange Policy</Link>
        </div>

        <div className="footer-col">
          <h4>Newsletter</h4>
          <p style={{ fontSize: 14, opacity: 0.8, marginBottom: 12 }}>Get eco-tips & exclusive offers.</p>
          {subscribed ? (
            <p style={{ color: '#81C784', fontWeight: 600 }}>Thanks for subscribing!</p>
          ) : (
            <form className="footer-newsletter" onSubmit={handleSubscribe}>
              <input type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <button type="submit"><FiSend /></button>
            </form>
          )}
          {contact.email && <p style={{ fontSize: 13, opacity: 0.7, marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}><FiMail size={14} /> {contact.email}</p>}
          {contact.phone && <p style={{ fontSize: 13, opacity: 0.7, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}><FiPhone size={14} /> {contact.phone}</p>}
        </div>
      </div>

      <div className="footer-bottom">
        &copy; {new Date().getFullYear()} {companyName}. {footerText}
      </div>
    </footer>
  );
};

export default Footer;
