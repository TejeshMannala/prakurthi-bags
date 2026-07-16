import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiFileText, FiInbox } from 'react-icons/fi';
import BackButton from '../components/BackButton';
import api from '../utils/axios';
import { sanitize } from '../utils/sanitize';

const Terms = () => {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/pages/terms')
      .then((res) => setPage(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const hasContent = page?.sections?.length > 0 || page?.content;

  if (loading) {
    return (
      <div className="container" style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!hasContent) {
    return (
      <div className="container" style={{ padding: '60px 24px', maxWidth: 800, margin: '0 auto' }}>
        <BackButton />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center" style={{ padding: '60px 20px' }}>
          <FiInbox size={64} style={{ color: '#A3C9A8', marginBottom: 16 }} />
          <h2 style={{ fontFamily: "'Playfair Display', serif", color: '#2E5A44', marginBottom: 8 }}>Terms & Conditions</h2>
          <p style={{ color: '#9ca3af', fontSize: 15 }}>Terms and conditions are not available yet. Please check back later.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '60px 24px', maxWidth: 800, margin: '0 auto' }}>
      <BackButton />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center" style={{ marginBottom: 48 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px', background: 'rgba(46,90,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2E5A44' }}>
          <FiFileText size={28} />
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", color: '#2E5A44', marginBottom: 8 }}>{page?.title || 'Terms & Conditions'}</h1>
        {page?.updatedAt && <p style={{ color: '#6b7280', fontSize: 14 }}>Last updated: {new Date(page.updatedAt).toLocaleDateString('en-IN')}</p>}
      </motion.div>

      {page?.content && <div style={{ color: '#6b7280', lineHeight: 1.8, marginBottom: 32 }} dangerouslySetInnerHTML={{ __html: sanitize(page.content) }} />}

      {page?.sections?.map((section, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
          style={{ marginBottom: 28, padding: 28, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', marginBottom: 12, paddingBottom: 12, borderBottom: '2px solid rgba(46,90,68,0.1)' }}>{section.heading}</h2>
          <p style={{ color: '#6b7280', fontSize: 15, lineHeight: 1.8 }}>{section.body}</p>
        </motion.div>
      ))}

      <div style={{ marginTop: 40, padding: 24, background: '#f0f7f1', borderRadius: 12, textAlign: 'center' }}>
        <p style={{ color: '#2E5A44', fontSize: 14, lineHeight: 1.6 }}>
          For questions about these terms, please <a href="/contact" style={{ color: '#2E5A44', fontWeight: 600, textDecoration: 'underline' }}>contact our support team</a>.
        </p>
      </div>
    </div>
  );
};

export default Terms;
