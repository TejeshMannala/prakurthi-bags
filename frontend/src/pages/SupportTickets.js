import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiHeadphones, FiSend, FiPlus, FiMessageSquare, FiClock, FiCheck, FiX, FiInbox, FiAlertCircle, FiPaperclip, FiUser, FiMail, FiTag, FiFlag, FiImage, FiChevronDown } from 'react-icons/fi';
import BackButton from '../components/BackButton';
import api from '../utils/axios';
import { useSocket } from '../context/SocketContext';

const statusIcons = { open: <FiMessageSquare size={14} />, 'in-progress': <FiClock size={14} />, resolved: <FiCheck size={14} />, closed: <FiX size={14} /> };
const statusColors = { open: { bg: '#fef3c7', color: '#92400e' }, 'in-progress': { bg: '#dbeafe', color: '#1e40af' }, resolved: { bg: '#d1fae5', color: '#065f46' }, closed: { bg: '#f3f4f6', color: '#6b7280' } };
const priorityColors = { low: { bg: '#d1fae5', color: '#065f46' }, medium: { bg: '#fef3c7', color: '#92400e' }, high: { bg: '#fef2f2', color: '#991b1b' } };
const categoryLabels = { order: 'Order Issue', product: 'Product Question', payment: 'Payment Issue', shipping: 'Shipping', other: 'Other' };

const SupportTickets = () => {
  const [view, setView] = useState('list');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTicket, setActiveTicket] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', category: 'other', priority: 'medium', orderId: '' });
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const messagesEndRef = useRef(null);
  const { socket } = useSocket();

  const fetchTickets = useCallback(async () => {
    try {
      const { data } = await api.get('/api/support/mytickets');
      setTickets(Array.isArray(data?.tickets) ? data.tickets : Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load tickets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeTicket?.messages]);

  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = (data) => {
      if (data.ticketId === activeTicket?._id) {
        setActiveTicket(prev => prev ? { ...prev, messages: [...(prev.messages || []), data.message] } : prev);
      }
      setTickets(prev => prev.map(t => t._id === data.ticketId ? { ...t, messages: [...(t.messages || []), data.message], status: data.message.sender === 'admin' ? 'in-progress' : t.status } : t));
    };
    socket.on('new_message', handleNewMessage);
    return () => { socket.off('new_message', handleNewMessage); };
  }, [socket, activeTicket?._id]);

  const createTicket = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const payload = { subject: form.subject, message: form.message, category: form.category, priority: form.priority };
      if (form.orderId) payload.orderRef = form.orderId;
      const { data } = await api.post('/api/support', payload);
      setTickets(prev => [data, ...prev]);
      setActiveTicket(data);
      setShowModal(false);
      setView('detail');
      setForm({ name: '', email: '', subject: '', message: '', category: 'other', priority: 'medium', orderId: '' });
      if (socket) {
        socket.emit('send_message', { ticketId: data._id, message: data.messages?.[0] || { text: form.message, sender: 'user' } });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create ticket.');
    } finally {
      setSending(false);
    }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !activeTicket) return;
    setSending(true);
    try {
      const { data } = await api.post(`/api/support/${activeTicket._id}/reply`, { message: replyText });
      setActiveTicket(data);
      setTickets(prev => prev.map(t => t._id === data._id ? data : t));
      if (socket) {
        socket.emit('send_message', { ticketId: data._id, message: { text: replyText, sender: 'user', createdAt: new Date().toISOString() } });
      }
      setReplyText('');
    } catch {
      setError('Failed to send reply.');
    } finally {
      setSending(false);
    }
  };

  const loadTicket = async (ticket) => {
    try {
      const { data } = await api.get(`/api/support/${ticket._id}`);
      setActiveTicket(data);
      setView('detail');
    } catch {
      setActiveTicket(ticket);
      setView('detail');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-[#F9F9F6] via-white to-[#f0f7f1] flex items-center justify-center"><div className="spinner" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9F9F6] via-white to-[#f0f7f1]">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f1a0f] via-[#1a2a1a] to-[#0d1f0d] py-16 lg:py-20">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[80%] bg-[radial-gradient(circle,rgba(46,90,68,0.2)_0%,transparent_70%)]" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <BackButton />
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[rgba(46,90,68,0.2)] mb-5">
              <FiHeadphones size={30} className="text-[#A3C9A8]" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white font-serif mb-2">Support Center</h1>
            <p className="text-gray-400 max-w-lg mx-auto text-sm">We're here to help. Create a ticket and our team will get back to you.</p>
          </motion.div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 -mt-10 relative z-20 pb-20">
        <div className="flex flex-wrap gap-3 mb-8 justify-center">
          <button onClick={() => { setView('list'); setActiveTicket(null); }}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${view === 'list' ? 'bg-[#2E5A44] text-white shadow-lg' : 'bg-white text-gray-600 border border-gray-200 hover:border-[#2E5A44]'}`}>
            <FiMessageSquare className="inline mr-1.5" size={15} /> Previous Tickets
          </button>
          <button onClick={() => { setShowModal(true); }}
            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-white text-gray-600 border border-gray-200 hover:border-[#2E5A44] hover:text-[#2E5A44] transition-all">
            <FiPlus className="inline mr-1.5" size={15} /> Create New Ticket
          </button>
          <a href="/faq" className="px-5 py-2.5 rounded-xl text-sm font-medium bg-white text-gray-600 border border-gray-200 hover:border-[#2E5A44] transition-all">
            <FiAlertCircle className="inline mr-1.5" size={15} /> FAQ
          </a>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-3 mb-6">
            <FiAlertCircle size={16} /> {error}
            <button onClick={() => setError('')} className="ml-auto"><FiX size={16} /></button>
          </motion.div>
        )}

        {view === 'list' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6 lg:p-8">
              <h3 className="text-lg font-bold text-gray-800 mb-6">Your Tickets ({tickets.length})</h3>
              {tickets.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[rgba(46,90,68,0.06)] flex items-center justify-center">
                    <FiInbox size={32} className="text-gray-300" />
                  </div>
                  <p className="text-gray-400 mb-2">No support tickets yet.</p>
                  <p className="text-gray-400 text-sm">Create one to get help from our team.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map((t) => (
                    <motion.div key={t._id} whileHover={{ x: 3 }}
                      onClick={() => loadTicket(t)}
                      className="p-5 rounded-xl bg-white border border-gray-100 hover:border-[rgba(46,90,68,0.2)] hover:shadow-md cursor-pointer transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-800 text-sm truncate">{t.subject}</h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
                              style={{ background: statusColors[t.status]?.bg, color: statusColors[t.status]?.color }}>
                              {statusIcons[t.status]} {t.status}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs"
                              style={{ background: priorityColors[t.priority]?.bg, color: priorityColors[t.priority]?.color }}>
                              <FiFlag size={10} /> {t.priority}
                            </span>
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{categoryLabels[t.category] || t.category}</span>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap ml-3">{new Date(t.createdAt).toLocaleDateString('en-IN')}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span><FiClock size={12} className="inline mr-1" />{new Date(t.updatedAt || t.createdAt).toLocaleString('en-IN')}</span>
                        <span>{t.messages?.length || 0} message{(t.messages?.length || 0) !== 1 ? 's' : ''}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {view === 'detail' && activeTicket && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <button onClick={() => setView('list')} className="text-sm text-[#2E5A44] font-medium mb-4 hover:underline">&larr; Back to Tickets</button>
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-800">{activeTicket.subject}</h3>
                  <div className="flex gap-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
                      style={{ background: statusColors[activeTicket.status]?.bg, color: statusColors[activeTicket.status]?.color }}>
                      {statusIcons[activeTicket.status]} {activeTicket.status}
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs"
                      style={{ background: priorityColors[activeTicket.priority]?.bg, color: priorityColors[activeTicket.priority]?.color }}>
                      <FiFlag size={10} /> {activeTicket.priority}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                  <span><FiTag size={12} className="inline mr-1" />{categoryLabels[activeTicket.category] || activeTicket.category}</span>
                  {activeTicket.orderRef && <span>Order: #{activeTicket.orderRef}</span>}
                  <span><FiClock size={12} className="inline mr-1" />Created {new Date(activeTicket.createdAt).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="p-6 h-[400px] overflow-y-auto space-y-4" style={{ background: '#fafafa' }}>
                {activeTicket.messages?.map((msg, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] ${msg.sender === 'user' ? 'order-1' : 'order-1'}`}>
                      <div className={`p-4 rounded-2xl ${msg.sender === 'user' ? 'bg-[#2E5A44] text-white rounded-br-md' : 'bg-white border border-gray-200 rounded-bl-md'}`}>
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                      </div>
                      <div className={`flex items-center gap-2 mt-1.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-xs text-gray-400">{msg.sender === 'user' ? 'You' : 'Support Team'}</span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-400">{msg.createdAt ? new Date(msg.createdAt).toLocaleString('en-IN') : ''}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {activeTicket.status !== 'closed' && activeTicket.status !== 'resolved' && (
                <div className="p-4 border-t border-gray-100 bg-white">
                  <div className="flex gap-3">
                    <input value={replyText} onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendReply())}
                      placeholder="Type your reply..." rows={1}
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:border-[#2E5A44] focus:ring-2 focus:ring-[rgba(46,90,68,0.1)] outline-none text-sm transition-all" />
                    <button onClick={sendReply} disabled={sending || !replyText.trim()}
                      className="px-5 py-3 bg-[#2E5A44] text-white rounded-xl hover:bg-[#1f3d2e] disabled:opacity-50 transition-all flex items-center gap-2 text-sm font-medium">
                      <FiSend size={16} /> Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {showModal && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setShowModal(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-base font-bold text-gray-800"><FiPlus className="inline mr-2" size={16} />Create Ticket</h3>
                    <button onClick={() => setShowModal(false)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600">
                      <FiX size={14} />
                    </button>
                  </div>
                  <form onSubmit={createTicket} className="p-5 space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                      <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#2E5A44] outline-none text-sm bg-white">
                        <option value="order">Order Issue</option>
                        <option value="product">Product Question</option>
                        <option value="payment">Payment Issue</option>
                        <option value="shipping">Shipping</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
                        <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#2E5A44] outline-none text-sm bg-white">
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Order ID</label>
                        <input value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#2E5A44] outline-none text-sm" placeholder="e.g. ORD-20260709" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Subject *</label>
                      <input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#2E5A44] outline-none text-sm" placeholder="Brief summary" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Description *</label>
                      <textarea required rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#2E5A44] outline-none text-sm resize-none" placeholder="Describe your issue..." />
                    </div>
                    <button type="submit" disabled={sending}
                      className="w-full py-2.5 bg-gradient-to-r from-[#2E5A44] to-[#1f3d2e] text-white rounded-lg font-semibold text-sm hover:shadow-lg transition-all disabled:opacity-60">
                      {sending ? 'Creating Ticket...' : 'Submit Ticket'}
                    </button>
                  </form>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
};

export default SupportTickets;
