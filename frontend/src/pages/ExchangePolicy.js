import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiRefreshCw, FiInbox, FiCalendar, FiChevronRight } from 'react-icons/fi';
import BackButton from '../components/BackButton';
import api from '../utils/axios';
import { sanitize } from '../utils/sanitize';

const ExchangePolicy = () => {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/policies/exchange')
      .then((res) => setPolicy(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F9F9F6] via-white to-[#f0f7f1] flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F9F9F6] via-white to-[#f0f7f1]">
        <div className="max-w-3xl mx-auto px-6 py-20">
          <BackButton />
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[rgba(46,90,68,0.06)] flex items-center justify-center">
              <FiInbox size={40} className="text-[#A3C9A8]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 font-serif mb-3">Exchange Policy</h2>
            <p className="text-gray-400 max-w-md mx-auto mb-8">Exchange policy information is not available yet. Please check back later or contact our support team for assistance.</p>
            <a href="/contact" className="inline-flex items-center gap-2 px-6 py-3 bg-[#2E5A44] text-white rounded-xl hover:bg-[#1f3d2e] transition-all font-medium text-sm">
              Contact Support <FiChevronRight size={16} />
            </a>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9F9F6] via-white to-[#f0f7f1]">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f1a0f] via-[#1a2a1a] to-[#0d1f0d] py-20 lg:py-28">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[80%] bg-[radial-gradient(circle,rgba(46,90,68,0.2)_0%,transparent_70%)]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[60%] bg-[radial-gradient(circle,rgba(212,168,83,0.08)_0%,transparent_70%)]" />
        <div className="relative z-10 max-w-4xl mx-auto px-6">
          <BackButton />
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mt-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[rgba(46,90,68,0.2)] mb-6">
              <FiRefreshCw size={30} className="text-[#A3C9A8]" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-white font-serif mb-4">{policy.title || 'Exchange Policy'}</h1>
            {policy.createdAt && (
              <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                <FiCalendar size={14} />
                <span>Last updated: {new Date(policy.updatedAt || policy.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 -mt-16 relative z-20 pb-20">
        {policy.content && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-8 mb-6 prose prose-sm max-w-none text-gray-600 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: sanitize(policy.content) }}
          />
        )}

        {policy.sections?.length > 0 && (
          <div className="space-y-6">
            {policy.sections.sort((a, b) => (a.order || 0) - (b.order || 0)).map((section, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6 lg:p-8 hover:shadow-xl transition-all duration-300">
                <h2 className="text-lg font-bold text-gray-800 mb-3 pb-3 border-b-2 border-[rgba(46,90,68,0.1)]">{section.heading}</h2>
                <p className="text-gray-600 text-sm leading-relaxed">{section.body}</p>
              </motion.div>
            ))}
          </div>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-12 p-6 bg-gradient-to-br from-[#f0f7f1] to-[#e8f0e9] rounded-2xl text-center border border-[rgba(46,90,68,0.1)]">
          <p className="text-[#2E5A44] text-sm font-medium">Need help with an exchange?</p>
          <a href="/contact" className="inline-flex items-center gap-2 mt-3 px-5 py-2.5 bg-[#2E5A44] text-white rounded-xl hover:bg-[#1f3d2e] transition-all text-sm font-medium">
            Contact Support <FiChevronRight size={14} />
          </a>
        </motion.div>
      </section>
    </div>
  );
};

export default ExchangePolicy;
