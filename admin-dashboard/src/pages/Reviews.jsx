import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiStar, FiAlertTriangle, FiCheck, FiX, FiTrash2, FiChevronLeft, FiChevronRight, FiEye, FiEyeOff, FiImage, FiCalendar } from 'react-icons/fi';
import api from '../utils/axios';
import { onAdminRealtime } from '../utils/adminRealtime';

function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [products, setProducts] = useState([]);
  const [lightboxImg, setLightboxImg] = useState(null);

  useEffect(() => {
    api.get('/api/admin/products?limit=200')
      .then(({ data }) => setProducts(Array.isArray(data) ? data : (data.products || [])))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchReviews(); }, [page, ratingFilter, statusFilter, productFilter, dateFrom, dateTo]);

  // Real-time: new customer reviews appear instantly in the moderation queue.
  useEffect(() => onAdminRealtime('admin:review:new', () => fetchReviews()), []);

  const fetchReviews = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', '20');
      if (ratingFilter !== 'all') params.set('rating', ratingFilter);
      if (statusFilter === 'reported') params.set('reported', 'true');
      else if (statusFilter !== 'all') params.set('status', statusFilter);
      if (productFilter !== 'all') params.set('productId', productFilter);
      if (dateFrom) params.set('startDate', new Date(dateFrom).toISOString());
      if (dateTo) params.set('endDate', new Date(dateTo).toISOString());
      if (search.trim()) params.set('search', search.trim());

      const { data } = await api.get(`/api/admin/reviews?${params}`);
      if (Array.isArray(data)) {
        setReviews(data);
        setTotal(data.length);
        setPages(1);
      } else {
        setReviews(data.reviews || []);
        setTotal(data.total || 0);
        setPages(data.pages || 1);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) fetchReviews();
      else setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/api/admin/reviews/${id}`, { status });
      setReviews((prev) => prev.map((r) => (r._id === id ? { ...r, status } : r)));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update review');
    }
  };

  const toggleVisibility = async (id, current) => {
    try {
      await api.put(`/api/admin/reviews/${id}`, { visible: !current });
      setReviews((prev) => prev.map((r) => (r._id === id ? { ...r, visible: !current } : r)));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update review');
    }
  };

  const togglePin = async (id, current) => {
    try {
      await api.put(`/api/admin/reviews/${id}`, { pinned: !current });
      setReviews((prev) => prev.map((r) => (r._id === id ? { ...r, pinned: !current } : r)));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to pin review');
    }
  };

  const toggleFeature = async (id, current) => {
    try {
      await api.put(`/api/admin/reviews/${id}`, { featured: !current });
      setReviews((prev) => prev.map((r) => (r._id === id ? { ...r, featured: !current } : r)));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to feature review');
    }
  };

  const replyToReview = async (id) => {
    const text = window.prompt('Admin reply to this review:');
    if (!text || !text.trim()) return;
    try {
      await api.put(`/api/admin/reviews/${id}`, { adminReply: text.trim() });
      setReviews((prev) => prev.map((r) => (r._id === id ? { ...r, adminReply: { text: text.trim() } } : r)));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reply');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this review permanently?')) return;
    try {
      await api.delete(`/api/admin/reviews/${id}`);
      setReviews((prev) => prev.filter((r) => r._id !== id));
      setTotal((t) => t - 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete review');
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <FiStar key={i} size={14} fill={i < rating ? '#f59e0b' : 'none'} color={i < rating ? '#f59e0b' : '#d1d5db'} />
    ));
  };

  const getStatusBadge = (status) => {
    const styles = {
      approved: { background: '#F0FDF4', color: '#166534' },
      pending: { background: '#FEF3C7', color: '#92400E' },
      rejected: { background: '#FEF2F2', color: '#991B1B' },
    };
    const s = styles[status] || styles.pending;
    return <span className={`status-badge`} style={s}>{status || 'pending'}</span>;
  };

  if (loading && reviews.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner" /><p>Loading reviews...</p>
      </div>
    );
  }

  if (error && reviews.length === 0) {
    return (
      <div className="error-container">
        <FiAlertTriangle size={48} /><h3>Error</h3><p>{error}</p>
        <button className="btn btn-primary" onClick={fetchReviews}>Retry</button>
      </div>
    );
  }

  return (
    <motion.div className="page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header">
        <div>
          <h1>Reviews</h1>
          <p>Manage product reviews{total > 0 ? ` (${total} total)` : ''}</p>
        </div>
      </div>

      {error && <div className="toast toast-error">{error}</div>}

      <div className="filters-row">
        <div className="search-bar">
          <FiSearch />
          <input placeholder="Search by user, product, or content..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
          <option value="all">All Status</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
          <option value="reported">Reported</option>
        </select>
        <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)} className="filter-select">
          <option value="all">All Ratings</option>
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>{r} Star{r > 1 ? 's' : ''}</option>
          ))}
        </select>
        <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} className="filter-select">
          <option value="all">All Products</option>
          {products.map((p) => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
        <div className="search-bar" style={{ maxWidth: 160 }}>
          <FiCalendar />
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="From date" />
        </div>
        <div className="search-bar" style={{ maxWidth: 160 }}>
          <FiCalendar />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="To date" />
        </div>
      </div>

      {reviews.length > 0 ? (
        <>
          <div className="reviews-list">
            {reviews.map((r, i) => (
              <motion.div
                key={r._id || i}
                className="review-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <div className="review-header">
                  <div className="review-user">
                    <div className="user-avatar-sm">
                      {(r.user?.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <strong>{r.user?.name || 'Anonymous'}</strong>
                      <span className="review-product">on {r.product?.name || 'Unknown Product'}</span>
                    </div>
                  </div>
                  <div className="review-rating">{renderStars(r.rating)}</div>
                </div>
                {r.title && <h4 style={{ marginBottom: 4, fontSize: 14, fontWeight: 600 }}>{r.title}</h4>}
                <div className="review-body">
                  <p>{r.review || 'No comment'}</p>
                </div>
                {r.adminReply?.text && (
                  <div style={{ marginTop: 8, padding: '8px 10px', background: '#EFF6FF', borderLeft: '3px solid #2563EB', borderRadius: 6, fontSize: 12, color: '#1E3A8A' }}>
                    <strong>Admin:</strong> {r.adminReply.text}
                  </div>
                )}
                {r.images?.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {r.images.map((img, i) => (
                      <img
                        key={i}
                        src={img.url || img}
                        alt="Review"
                        onClick={() => setLightboxImg(img.url || img)}
                        style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, border: '1px solid #E5E7EB', cursor: 'pointer' }}
                      />
                    ))}
                  </div>
                )}
                <div className="review-meta" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
                  {getStatusBadge(r.status)}
                  {r.verifiedPurchase && <span style={{ color: '#10B981', fontWeight: 600 }}>Verified Purchase</span>}
                  <span>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}</span>
                  <span>Helpful: {r.helpfulVotes?.length || 0}</span>
                </div>
                <div className="review-footer">
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-sm" onClick={() => togglePin(r._id, r.pinned)} style={{ background: r.pinned ? '#FEF3C7' : '#F3F4F6', color: r.pinned ? '#92400E' : '#374151', border: '1px solid #D1D5DB', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                      📌 {r.pinned ? 'Pinned' : 'Pin'}
                    </button>
                    <button className="btn btn-sm" onClick={() => toggleFeature(r._id, r.featured)} style={{ background: r.featured ? '#DBEAFE' : '#F3F4F6', color: r.featured ? '#1E40AF' : '#374151', border: '1px solid #D1D5DB', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                      ⭐ {r.featured ? 'Featured' : 'Feature'}
                    </button>
                    <button className="btn btn-sm" onClick={() => replyToReview(r._id)} style={{ background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                      💬 Reply
                    </button>
                    {r.status !== 'approved' && (
                      <button className="btn btn-sm btn-success" onClick={() => updateStatus(r._id, 'approved')} style={{ background: '#166534', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <FiCheck size={14} /> Approve
                      </button>
                    )}
                    {r.status !== 'rejected' && (
                      <button className="btn btn-sm" onClick={() => updateStatus(r._id, 'rejected')} style={{ background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <FiX size={14} /> Reject
                      </button>
                    )}
                    <button className="btn btn-sm" onClick={() => toggleVisibility(r._id, r.visible !== false)}
                      style={{ background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {r.visible !== false ? <><FiEyeOff size={14} /> Hide</> : <><FiEye size={14} /> Show</>}
                    </button>
                    <button className="btn btn-sm" onClick={() => handleDelete(r._id)}
                      style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FiTrash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          {pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 24 }}>
              <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <FiChevronLeft /> Previous
              </button>
              <span style={{ fontSize: 14, color: '#64748b' }}>
                Page {page} of {pages}
              </span>
              <button className="btn btn-secondary btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                Next <FiChevronRight />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">
          <FiStar size={48} />
          <h3>{search || ratingFilter !== 'all' || statusFilter !== 'all' || productFilter !== 'all' || dateFrom || dateTo ? 'No reviews found' : 'No reviews yet'}</h3>
          <p>{search || ratingFilter !== 'all' || statusFilter !== 'all' || productFilter !== 'all' || dateFrom || dateTo ? 'Try adjusting your filters' : 'Reviews will appear here once customers leave feedback'}</p>
        </div>
      )}

      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 24 }}
        >
          <img src={lightboxImg} alt="Review" style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: 12 }} />
          <button onClick={() => setLightboxImg(null)} aria-label="Close" style={{ position: 'absolute', top: 24, right: 24, background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', borderRadius: '50%', width: 40, height: 40, fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>
      )}
    </motion.div>
  );
}

export default Reviews;
