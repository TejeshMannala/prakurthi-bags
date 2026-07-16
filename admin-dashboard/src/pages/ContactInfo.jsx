import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiMail, FiPhone, FiMapPin, FiGlobe, FiClock, FiSave, FiAlertTriangle } from 'react-icons/fi';
import api from '../utils/axios';

const initialForm = {
  email: '', supportEmail: '', phone: '', whatsapp: '', address: '',
  googleMap: '', facebook: '', instagram: '', linkedin: '', twitter: '', youtube: '', website: '', workingHours: '',
};

function ContactInfo() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get('/api/admin/contact-info')
      .then(({ data }) => {
        if (data) {
          const f = {};
          Object.keys(initialForm).forEach((key) => { f[key] = data[key] || ''; });
          setForm(f);
        }
      })
      .catch(() => setError('Failed to load contact info'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.put('/api/admin/contact-info', form);
      setSuccess('Contact information updated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-container"><div className="spinner" /></div>;

  return (
    <motion.div className="page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header">
        <div><h1>Contact Information</h1><p>Manage website contact details displayed on the Contact page</p></div>
      </div>

      {error && <div className="toast toast-error">{error}</div>}
      {success && <div className="toast toast-success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><FiMail /> Email & Phone</h3>
          <div className="form-row">
            <div className="form-group"><label>Website Email</label><input name="email" value={form.email} onChange={handleChange} placeholder="hello@prakruthibags.com" /></div>
            <div className="form-group"><label>Support Email</label><input name="supportEmail" value={form.supportEmail} onChange={handleChange} placeholder="support@prakruthibags.com" /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label><FiPhone /> Phone</label><input name="phone" value={form.phone} onChange={handleChange} placeholder="+91 98765 43210" /></div>
            <div className="form-group"><label>WhatsApp</label><input name="whatsapp" value={form.whatsapp} onChange={handleChange} placeholder="+91 98765 43210" /></div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><FiMapPin /> Address & Map</h3>
          <div className="form-group"><label>Office Address</label><input name="address" value={form.address} onChange={handleChange} placeholder="Visakhapatnam, Andhra Pradesh" /></div>
          <div className="form-group"><label>Google Map Embed URL</label><input name="googleMap" value={form.googleMap} onChange={handleChange} placeholder="https://www.google.com/maps/embed?pb=..." /></div>
          <div className="form-group"><label><FiClock /> Working Hours</label><input name="workingHours" value={form.workingHours} onChange={handleChange} placeholder="Mon – Sat: 9:00 AM – 6:00 PM IST" /></div>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><FiGlobe /> Social Media Links</h3>
          <div className="form-row">
            <div className="form-group"><label>Facebook URL</label><input name="facebook" value={form.facebook} onChange={handleChange} placeholder="https://facebook.com/..." /></div>
            <div className="form-group"><label>Instagram URL</label><input name="instagram" value={form.instagram} onChange={handleChange} placeholder="https://instagram.com/..." /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>LinkedIn URL</label><input name="linkedin" value={form.linkedin} onChange={handleChange} placeholder="https://linkedin.com/..." /></div>
            <div className="form-group"><label>Twitter (X) URL</label><input name="twitter" value={form.twitter} onChange={handleChange} placeholder="https://twitter.com/..." /></div>
          </div>
          <div className="form-group"><label>YouTube URL</label><input name="youtube" value={form.youtube} onChange={handleChange} placeholder="https://youtube.com/..." /></div>
          <div className="form-group"><label>Website URL</label><input name="website" value={form.website} onChange={handleChange} placeholder="https://prakruthibags.com" /></div>
        </div>

        <motion.button type="submit" className="btn btn-primary" disabled={saving} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 32px' }}>
          <FiSave /> {saving ? 'Saving...' : 'Save Changes'}
        </motion.button>
      </form>
    </motion.div>
  );
}

export default ContactInfo;
