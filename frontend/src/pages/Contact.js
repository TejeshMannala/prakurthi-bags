import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiPhone, FiMail, FiMapPin, FiInstagram, FiGlobe, FiYoutube, FiLinkedin, FiTwitter, FiExternalLink } from 'react-icons/fi';
import api from '../utils/axios';
import BackButton from '../components/BackButton';

const Contact = () => {
  const [contactInfo, setContactInfo] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/contact-info')
      .then((res) => setContactInfo(res.data || {}))
      .catch(() => setContactInfo({}))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F9F9F6] via-white to-[#f0f7f1] flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  const infoItems = [
    { icon: <FiMail size={22} />, label: 'Email', value: contactInfo.email || contactInfo.supportEmail || 'hello@prakruthibags.com', href: `mailto:${contactInfo.email || contactInfo.supportEmail || 'hello@prakruthibags.com'}` },
    { icon: <FiPhone size={22} />, label: 'Phone', value: contactInfo.phone || '+91 98765 43210', href: `tel:${contactInfo.phone || '+919876543210'}` },
    { icon: <FiMapPin size={22} />, label: 'Address', value: contactInfo.address || 'Visakhapatnam, Andhra Pradesh, India' },
    { icon: <FiExternalLink size={22} />, label: 'Website', value: contactInfo.website || 'https://prakruthibags.com', href: contactInfo.website || 'https://prakruthibags.com' },
  ];

  const socialLinks = [
    { icon: <FiGlobe size={18} />, label: 'Facebook', href: contactInfo.facebook, color: '#1877F2' },
    { icon: <FiInstagram size={18} />, label: 'Instagram', href: contactInfo.instagram, color: '#E4405F' },
    { icon: <FiLinkedin size={18} />, label: 'LinkedIn', href: contactInfo.linkedin, color: '#0A66C2' },
    { icon: <FiTwitter size={18} />, label: 'Twitter (X)', href: contactInfo.twitter, color: '#1DA1F2' },
    { icon: <FiYoutube size={18} />, label: 'YouTube', href: contactInfo.youtube, color: '#FF0000' },
  ].filter((s) => s.href && s.href !== '#' && s.href !== '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9F9F6] via-white to-[#f0f7f1]">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f1a0f] via-[#1a2a1a] to-[#0d1f0d] py-16 lg:py-20">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[80%] bg-[radial-gradient(circle,rgba(46,90,68,0.2)_0%,transparent_70%)]" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <BackButton />
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-3xl lg:text-4xl font-bold text-white font-serif mb-2 mt-8">
            Contact Us
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-gray-400 max-w-lg mx-auto text-sm">
            Get in touch with Prakruthi Bags
          </motion.p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 -mt-10 relative z-20 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {infoItems.map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6 text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[rgba(46,90,68,0.08)] text-[#2E5A44] flex items-center justify-center transition-all duration-300 group-hover:bg-[#2E5A44] group-hover:text-white">
                {item.icon}
              </div>
              <h3 className="font-semibold text-gray-800 text-sm mb-1">{item.label}</h3>
              {item.href ? (
                <a href={item.href} className="text-[#2E5A44] font-medium text-sm hover:underline break-all">{item.value}</a>
              ) : (
                <p className="text-gray-600 text-sm">{item.value}</p>
              )}
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6 md:p-8 text-center">
          <h2 className="font-bold text-gray-800 text-lg mb-2">Prakruthi Bags</h2>
          <p className="text-gray-400 text-sm mb-6">Handcrafted eco-friendly bags for a sustainable future.</p>

          {socialLinks.length > 0 && (
            <>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-medium">Follow Us</p>
              <div className="flex justify-center gap-3">
                {socialLinks.map((social, i) => (
                  <a key={i} href={social.href} target="_blank" rel="noopener noreferrer" title={social.label}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all hover:scale-110 hover:shadow-lg"
                    style={{ background: social.color }}>
                    {social.icon}
                  </a>
                ))}
              </div>
            </>
          )}

        </motion.div>

        {contactInfo?.googleMap && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="mt-6 bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-4">
            <div className="rounded-xl overflow-hidden h-52 bg-gray-100">
              <iframe src={contactInfo.googleMap} width="100%" height="100%" style={{ border: 0 }} allowFullScreen="" loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Google Map" />
            </div>
          </motion.div>
        )}
      </section>
    </div>
  );
};

export default Contact;
