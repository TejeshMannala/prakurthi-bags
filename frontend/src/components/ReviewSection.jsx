import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiStar, FiThumbsUp, FiCamera, FiCheck, FiX, FiTrash2, FiEdit2, FiUser, FiLogIn, FiFlag } from 'react-icons/fi';
import api from '../utils/axios';
import { useCart } from '../context/CartContext';
import ReviewModal from './ReviewModal';

const StarDisplay = ({ rating, size = 16 }) => (
  <span style={{ display: 'inline-flex', gap: 2, verticalAlign: 'middle' }}>
    {[1, 2, 3, 4, 5].map((s) => (
      <FiStar key={s} size={size} fill={s <= rating ? '#F59E0B' : 'none'} color={s <= rating ? '#F59E0B' : '#D1D5DB'} />
    ))}
  </span>
);

const StarSelector = ({ rating, onChange, size = 28 }) => (
  <div style={{ display: 'flex', gap: 4 }}>
    {[1, 2, 3, 4, 5].map((s) => (
      <button key={s} type="button" onClick={() => onChange(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, transition: 'transform 0.15s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
        <FiStar size={size} fill={s <= rating ? '#F59E0B' : 'none'} color={s <= rating ? '#F59E0B' : '#D1D5DB'} />
      </button>
    ))}
  </div>
);

const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

const uniqueById = (arr) => {
  const seen = new Set();
  return (arr || []).filter((r) => {
    if (!r?._id || seen.has(r._id)) return false;
    seen.add(r._id);
    return true;
  });
};

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function ReviewSection({ productId, user: userProp, onReviewChange }) {
  // Prefer the reliably-bootstrapped CartContext user, then Redux, then the
  // passed prop. This guarantees a logged-in user (valid JWT session) is never
  // mistaken for "logged out" just because one auth store lagged behind.
  const { user: ctxUser } = useCart();
  const { user: reduxUser } = useSelector(state => state.auth);
  const user = userProp || ctxUser || reduxUser;
  const navigate = useNavigate();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [ratingDist, setRatingDist] = useState([0, 0, 0, 0, 0]);
  const [sortBy, setSortBy] = useState('latest');
  const [filterRating, setFilterRating] = useState(0);
  const [userHasReviewed, setUserHasReviewed] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [editingReview, setEditingReview] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formRating, setFormRating] = useState(5);
  const [formTitle, setFormTitle] = useState('');
  const [formReview, setFormReview] = useState('');
  const [formImages, setFormImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [editingId, setEditingId] = useState(null);

  const fetchReviews = useCallback(async (p = 1, sort = sortBy) => {
    if (!productId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 5, sort });
      const { data } = await api.get(`/api/reviews/product/${productId}?${params}`);
      setReviews(uniqueById(data.reviews));
      setTotal(data.total || 0);
      setTotalPages(data.pages || 1);
      setPage(data.page || 1);
      setAvgRating(data.averageRating || 0);
      setRatingDist(data.ratingDistribution || [0, 0, 0, 0, 0]);
      if (user) {
        const hasReviewed = (data.reviews || []).some(r => r.user?._id === user._id);
        setUserHasReviewed(hasReviewed);
      }
      setError(null);
    } catch {
      setError('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [productId, user]);

  useEffect(() => {
    fetchReviews(1, sortBy);
  }, [fetchReviews, sortBy]);

  useEffect(() => {
    const onUpdated = () => fetchReviews(1, sortBy);
    window.addEventListener('review-updated', onUpdated);
    return () => window.removeEventListener('review-updated', onUpdated);
  }, [fetchReviews, sortBy]);

  const handleFilterRating = (r) => {
    setFilterRating(r === filterRating ? 0 : r);
  };

  const filteredReviews = filterRating
    ? reviews.filter((rv) => Math.round(rv.rating) === filterRating)
    : reviews;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setFormError('Please log in to submit a review.');
      return;
    }
    if (!formRating || formRating < 1) {
      setFormError('Please select a rating.');
      return;
    }
    if (!formReview.trim()) {
      setFormError('Please enter a review comment.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    setFormSuccess('');
    try {
      const formattedImages = formImages.map(img => {
        if (typeof img === 'string') return { url: img, publicId: '' };
        return img;
      });
      const payload = { product: productId, rating: formRating, title: formTitle, review: formReview, images: formattedImages };
      if (editingId) {
        await api.put(`/api/reviews/${editingId}`, payload);
        setFormSuccess('Review updated successfully!');
      } else {
        await api.post('/api/reviews', payload);
        setFormSuccess('Review submitted successfully!');
        setUserHasReviewed(true);
      }
      setFormOpen(false);
      setFormTitle('');
      setFormReview('');
      setFormImages([]);
      setFormRating(5);
      setEditingId(null);
      setTimeout(() => fetchReviews(1, sortBy), 300);
      if (onReviewChange) onReviewChange();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (review) => {
    if (!user) return;
    setEditingReview(review);
    setReviewOpen(true);
  };

  const handleDelete = async (id, isAdminDelete = false) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      if (isAdminDelete) {
        await api.delete(`/api/admin/reviews/${id}`);
      } else {
        await api.delete(`/api/reviews/${id}`);
        setUserHasReviewed(false);
      }
      fetchReviews(1, sortBy);
      if (onReviewChange) onReviewChange();
    } catch {
      setError('Failed to delete review');
    }
  };

  const handleHelpful = async (id) => {
    try {
      await api.post(`/api/reviews/${id}/helpful`);
      fetchReviews(page, sortBy);
    } catch { /* ignore */ }
  };

  const handleReport = async (id) => {
    const reason = window.prompt('Report this review (optional reason):');
    if (reason === null) return;
    try {
      await api.post(`/api/reviews/${id}/report`, { reason });
      setFormSuccess('Review reported. Our team will review it.');
      setTimeout(() => setFormSuccess(''), 3000);
    } catch {
      setFormError('Failed to report review.');
    }
  };

  const totalStars = ratingDist.reduce((a, b) => a + b, 0);

  if (!productId) return null;

  return (
     <div className="mt-12 border-t border-gray-100 pt-10">
      {/* Section Header */}
      {/* <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-extrabold text-gray-900">Customer Reviews</h2>
        {user && !userHasReviewed && !editingId && (
          <button onClick={() => { setReviewOpen(true); setEditingReview(null); }}
            className="px-5 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-all shadow-md shadow-purple-600/20 hover:-translate-y-0.5">
            Write a Review
          </button>
        )}
      </div> */}

      {/* Rating Summary - Amazon Style */}
      {total > 0 && (
        <div className="flex flex-col md:flex-row gap-8 p-6 bg-gray-50 rounded-2xl mb-8 border border-gray-100">
          {/* Left: Big rating */}
          <div className="flex flex-col items-center justify-center min-w-[140px]">
            <div className="text-5xl font-black text-gray-900 leading-none">{avgRating.toFixed(1)}</div>
            <div className="mt-2"><StarDisplay rating={Math.round(avgRating)} size={18} /></div>
            <div className="mt-1 text-sm text-gray-500 font-medium">{total} review{total !== 1 ? 's' : ''}</div>
          </div>
          {/* Right: Distribution bars */}
          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingDist[star - 1] || 0;
              const pct = totalStars > 0 ? (count / totalStars) * 100 : 0;
              return (
                <button key={star} onClick={() => handleFilterRating(star)}
                  className={`flex items-center gap-3 w-full group rounded-lg px-2 py-1 transition-colors ${filterRating === star ? 'bg-yellow-50' : 'hover:bg-gray-100'}`}>
                  <span className="text-sm font-medium text-gray-600 w-3 text-right">{star}</span>
                  <FiStar size={13} fill="#F59E0B" color="#F59E0B" />
                  <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={`h-full rounded-full ${filterRating === star ? 'bg-yellow-500' : 'bg-yellow-400 group-hover:bg-yellow-500'}`} />
                  </div>
                  <span className="text-xs text-gray-400 w-6 text-right">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Write Review Form / Login Prompt */}
      {/* Login prompt when not authenticated */}
      {!user && !formOpen && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-8 mb-8 border border-purple-100 text-center">
          <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
            <FiUser size={28} className="text-purple-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Please log in to write a review.</h3>
          <p className="text-gray-500 text-sm mb-5">Share your experience and help other customers make better decisions.</p>
          <button onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20 hover:-translate-y-0.5">
            <FiLogIn size={16} /> Login to Review
          </button>
        </div>
      )}

      {/* Sort + Filter Bar */}
      {total > 0 && (
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {filterRating > 0 && (
              <button onClick={() => setFilterRating(0)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-full text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors">
                {filterRating}★ <FiX size={12} />
              </button>
            )}
          </div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500">
            <option value="latest">Most Recent</option>
            <option value="oldest">Oldest First</option>
            <option value="rating_high">Highest Rated</option>
            <option value="rating_low">Lowest Rated</option>
            <option value="helpful">Most Helpful</option>
          </select>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !reviews.length ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-50 rounded-2xl p-6 animate-pulse border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gray-200" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24" />
                  <div className="h-3 bg-gray-200 rounded w-16" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-red-50 rounded-2xl border border-red-100">
          <p className="text-red-500 font-medium">{error}</p>
          <button onClick={() => fetchReviews(1, sortBy)} className="mt-3 text-sm text-red-600 font-bold hover:underline">Retry</button>
        </div>
      ) : total === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-100">
          <FiStar size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-700 mb-1">No Reviews Yet</h3>
          <p className="text-gray-400 text-sm">Be the first to review this product!</p>
        </div>
      ) : (
        <>
          {/* Reviews List */}
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <motion.div key={review._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                {/* Review Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <img src={review.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.user?.name || 'A')}&background=7c3aed&color=fff&size=80`}
                      alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100" />
                    <div>
                      <p className="font-bold text-sm text-gray-900">{review.user?.name || 'Anonymous'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StarDisplay rating={review.rating} size={12} />
                        <span className="text-xs text-gray-400">{timeAgo(review.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {review.verifiedPurchase && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold border border-green-100">
                        <FiCheck size={11} strokeWidth={3} /> Verified Purchase
                      </span>
                    )}
                    {user && review.user?._id === user._id && (
                      <>
                        <button onClick={() => handleEdit(review)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                          <FiEdit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(review._id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                          <FiTrash2 size={14} />
                        </button>
                      </>
                    )}
                    {user && user.role === 'admin' && review.user?._id !== user._id && (
                      <button onClick={() => handleDelete(review._id, true)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors" title="Admin: Delete review">
                        <FiTrash2 size={14} />
                      </button>
                    )}
                    {user && review.user?._id !== user._id && (
                      <button onClick={() => handleReport(review._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-orange-600 transition-colors" title="Report review">
                        <FiFlag size={14} />
                      </button>
                    )}
                  </div>
                </div>
                {/* Review Title */}
                {review.title && <h4 className="font-bold text-gray-900 text-sm mb-1.5">{review.title}</h4>}
                {/* Review Body */}
                <p className="text-gray-600 text-sm leading-relaxed mb-3">{review.review || ''}</p>
                {review.adminReply?.text && (
                  <div className="mb-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                    <p className="text-xs font-bold text-blue-700 mb-0.5">Response from Seller</p>
                    <p className="text-sm text-blue-900">{review.adminReply.text}</p>
                  </div>
                )}
                {/* Review Images */}
                {review.images?.length > 0 && (
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {review.images.map((img, i) => (
                      <img key={i} src={img.url || img} alt="Review" className="w-16 h-16 rounded-xl object-cover border border-gray-100 hover:scale-110 transition-transform cursor-pointer" />
                    ))}
                  </div>
                )}
                {/* Helpful */}
                <button onClick={() => handleHelpful(review._id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-full text-xs font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors">
                  <FiThumbsUp size={12} /> Helpful{((review.helpfulCount ?? review.helpfulVotes?.length ?? 0) > 0) ? ` (${review.helpfulCount ?? review.helpfulVotes?.length ?? 0})` : ''}
                </button>
              </motion.div>
            ))}
          </div>

          {/* Load More */}
          {page < totalPages && (
            <div className="text-center mt-8">
              <button onClick={() => fetchReviews(page + 1, sortBy)}
                className="px-8 py-3 border-2 border-purple-600 text-purple-600 rounded-xl font-bold text-sm hover:bg-purple-50 transition-colors">
                Load More Reviews ({total - page * 5} remaining)
              </button>
            </div>
          )}
        </>
      )}
      <ReviewModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        product={{ _id: productId, name: '', price: '' }}
        existingReview={editingReview}
        onSuccess={() => fetchReviews(1, sortBy)}
      />
    </div>
  );
}
