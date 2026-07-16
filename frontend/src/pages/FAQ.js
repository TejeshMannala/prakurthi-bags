import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown, FiHelpCircle, FiInbox } from 'react-icons/fi';
import BackButton from '../components/BackButton';
import api from '../utils/axios';

const FAQ = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [category, setCategory] = useState('all');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setLoading(true); setError('');
    const params = category !== 'all' ? `?category=${category}` : '';
    api.get(`/api/faqs${params}`)
      .then((res) => setFaqs(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError('Failed to load FAQs.'))
      .finally(() => setLoading(false));
  }, [category, retryKey]);

  const categories = [...new Set(faqs.map(f => f.category).filter(Boolean))];

  return (
    <div className="container" style={{ padding: '60px 24px', maxWidth: 800, margin: '0 auto' }}>
      <BackButton />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center" style={{ marginBottom: 40 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px', background: 'rgba(46,90,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2E5A44' }}>
          <FiHelpCircle size={28} />
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", color: '#2E5A44', marginBottom: 8 }}>Frequently Asked Questions</h1>
        <p style={{ color: '#6b7280', fontSize: 15 }}>Find answers to common questions about our products, orders, and services.</p>
      </motion.div>

      {categories.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 32 }}>
          <button onClick={() => setCategory('all')} style={{ padding: '8px 18px', borderRadius: 100, border: '1px solid #e5e7eb', background: category === 'all' ? '#2E5A44' : '#fff', color: category === 'all' ? '#fff' : '#6b7280', fontWeight: 600, fontSize: 13, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.2s' }}>All</button>
          {categories.map((cat) => (
            <button key={cat} onClick={() => setCategory(cat)} style={{ padding: '8px 18px', borderRadius: 100, border: '1px solid #e5e7eb', background: category === cat ? '#2E5A44' : '#fff', color: category === cat ? '#fff' : '#6b7280', fontWeight: 600, fontSize: 13, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.2s' }}>{cat}</button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3, 4].map((i) => (<div key={i} className="skeleton" style={{ height: 60, borderRadius: 10 }} />))}
        </div>
      ) : error ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center" style={{ padding: '60px 20px' }}>
          <FiInbox size={64} style={{ color: '#f87171', marginBottom: 16 }} />
          <p style={{ color: '#ef4444', fontSize: 15, marginBottom: 16 }}>{error}</p>
          <button onClick={() => setRetryKey((k) => k + 1)} style={{ padding: '10px 24px', borderRadius: 100, border: '1px solid #e5e7eb', background: '#2E5A44', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Retry</button>
        </motion.div>
      ) : faqs.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center" style={{ padding: '60px 20px' }}>
          <FiInbox size={64} style={{ color: '#A3C9A8', marginBottom: 16 }} />
          <p style={{ color: '#9ca3af', fontSize: 15 }}>No FAQs available yet.</p>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {faqs.map((faq) => (
            <motion.div key={faq._id} layout style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb', cursor: 'pointer' }} onClick={() => setOpenId(openId === faq._id ? null : faq._id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', fontWeight: 600, fontSize: 15, color: '#1a1a1a' }}>
                <span>{faq.question}</span>
                <motion.div animate={{ rotate: openId === faq._id ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ color: '#2E5A44', flexShrink: 0 }}>
                  <FiChevronDown size={18} />
                </motion.div>
              </div>
              <AnimatePresence>
                {openId === faq._id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '0 24px 18px', color: '#6b7280', fontSize: 14, lineHeight: 1.7, borderTop: '1px solid #f3f4f6', paddingTop: 16 }}>{faq.answer}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 40, padding: 28, background: '#f0f7f1', borderRadius: 12, textAlign: 'center' }}>
        <p style={{ color: '#2E5A44', fontSize: 14, lineHeight: 1.6 }}>
          Still have questions? <a href="/contact" style={{ color: '#2E5A44', fontWeight: 600, textDecoration: 'underline' }}>Contact our support team</a> and we'll be happy to help.
        </p>
      </div>
    </div>
  );
};

export default FAQ;
