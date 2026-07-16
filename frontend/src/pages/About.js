import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiArrowRight, FiHeart, FiShield, FiUsers, FiAward, FiStar, FiMapPin, FiMail } from 'react-icons/fi';
import { FaLeaf } from 'react-icons/fa';
import BackButton from '../components/BackButton';
import api from '../utils/axios';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' } }) };

const About = () => {
  const [page, setPage] = useState(null);
  const [team, setTeam] = useState([]);

  useEffect(() => {
    api.get('/api/pages/about')
      .then((res) => setPage(res.data))
      .catch(() => {});
    api.get('/api/team')
      .then((res) => setTeam(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, []);

  const sections = page?.sections || [];

  const highlights = [
    { icon: FaLeaf, title: 'Eco-Friendly', desc: '100% natural jute & sustainable materials' },
    { icon: FiHeart, title: 'Handcrafted', desc: 'Made with love by skilled artisans' },
    { icon: FiShield, title: 'Premium Quality', desc: 'Durable & long-lasting products' },
    { icon: FiUsers, title: '200+ Artisans', desc: 'Supporting rural communities' },
  ];

  return (
    <div>
      <div className="container" style={{ padding: '40px 24px 0' }}>
        <BackButton />
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f1a0f] via-[#1a2a1a] to-[#0d1f0d] py-20 lg:py-28">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[80%] bg-[radial-gradient(circle,rgba(46,90,68,0.2)_0%,transparent_70%)]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[60%] bg-[radial-gradient(circle,rgba(212,168,83,0.08)_0%,transparent_70%)]" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[rgba(46,90,68,0.2)] mb-5">
              <FaLeaf size={32} className="text-[#A3C9A8]" />
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold text-white font-serif mb-4">
              {page?.title || 'Prakruthi Bags'}
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              {page?.content || 'Visakhapatnam\'s premier eco-friendly jute bags manufacturer. Handcrafted with care for a sustainable tomorrow.'}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Highlights */}
      <section className="max-w-6xl mx-auto px-6 -mt-16 relative z-20 pb-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {highlights.map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6 text-center hover:shadow-xl transition-all">
              <div className="w-12 h-12 rounded-xl bg-[rgba(46,90,68,0.08)] text-[#2E5A44] flex items-center justify-center mx-auto mb-3">
                <item.icon size={24} />
              </div>
              <h4 className="font-semibold text-gray-800 text-sm mb-1">{item.title}</h4>
              <p className="text-gray-500 text-xs">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Dynamic Sections */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        {sections.map((section, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
            className="mb-12">
            <h2 className="text-2xl lg:text-3xl font-bold text-[#2E5A44] font-serif mb-4">{section.heading}</h2>
            <p className="text-gray-600 leading-relaxed text-base">{section.body}</p>
          </motion.div>
        ))}

        {/* Default sections if admin hasn't added any */}
        {sections.length === 0 && (
          <>
            {[
              { heading: 'Our Story', body: 'Founded in Visakhapatnam, Prakruthi Bags began with a simple vision: to create beautiful, functional bags while protecting our planet. What started as a small workshop has grown into a trusted brand serving customers across India, all while staying true to our eco-friendly roots.' },
              { heading: 'Our Mission', body: 'To provide high-quality, sustainable bag alternatives to plastic and synthetic materials. We aim to reduce environmental impact while empowering local artisans and promoting traditional craftsmanship.' },
              { heading: 'Our Vision', body: 'A world where sustainable choices are the norm, not the exception. We envision a future where every bag tells a story of environmental consciousness and social responsibility.' },
              { heading: 'Sustainability', body: 'Every Prakruthi bag is made from natural, biodegradable materials. We use eco-friendly dyes, minimize waste in our production process, and ensure fair wages for all our artisans. For every product sold, we plant a tree.' },
            ].map((section, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="mb-12">
                <h2 className="text-2xl lg:text-3xl font-bold text-[#2E5A44] font-serif mb-4">{section.heading}</h2>
                <p className="text-gray-600 leading-relaxed text-base">{section.body}</p>
              </motion.div>
            ))}
          </>
        )}
      </section>

      {/* Team */}
      {team.length > 0 && (
        <section className="bg-[#f5f5f0] py-20">
          <div className="max-w-6xl mx-auto px-6">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-[#2E5A44] font-serif mb-4">Meet Our Team</h2>
              <p className="text-gray-500">The passionate people behind Prakruthi Bags.</p>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {team.map((member, i) => (
                <motion.div key={member._id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100 hover:shadow-md transition-all">
                  <img src={member.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=2E5A44&color=fff&size=128`}
                    alt={member.name} className="w-24 h-24 rounded-full mx-auto mb-4 object-cover" />
                  <h4 className="font-semibold text-gray-800">{member.name}</h4>
                  <p className="text-gray-500 text-sm">{member.position}</p>
                  {member.bio && <p className="text-gray-400 text-xs mt-2">{member.bio}</p>}
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-[#0f1a0f] to-[#1a2a1a] text-center">
        <div className="max-w-2xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl lg:text-4xl font-bold text-white font-serif mb-4">Ready to Go Green?</h2>
            <p className="text-gray-400 mb-8">Join thousands of customers choosing sustainable style.</p>
            <a href="/products" className="inline-flex items-center gap-2 bg-[#D4A853] text-black font-bold px-8 py-3 rounded-lg hover:bg-[#c49a3f] transition-all">
              Explore Collection <FiArrowRight />
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default About;
