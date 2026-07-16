import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiStar, FiCheck, FiImage } from 'react-icons/fi';
import api from '../utils/axios';
import StarRating from './StarRating';
import ReviewForm from './ReviewForm';
import { getProductImage } from '../utils/productImage';

/**
 * Premium review modal.
 * Shows overall rating, a rating breakdown, customer photos, verified badges
 * and the review list. "Write a Review" opens ReviewForm inline.
 * Compatible with the existing call sites (ProductCard + ProductDetail's
 * ReviewSection) — it accepts `open`, `onClose`, `product`, optional
 * `existingReview` and `onSuccess`.
 */
const ReviewModal = ({ open, onClose, product, existingReview, onSuccess, canWrite, blockReason }) => {
  const productId = product?._id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const { data: res } = await api.get(`/api/reviews/product/${productId}?limit=12&sort=-createdAt`);
      setData(res);
    } catch {
      setData({ reviews: [], averageRating: 0, totalReviews: 0, ratingDistribution: [0, 0, 0, 0, 0] });
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (open) {
      setShowForm(false);
      load();
    }
  }, [open, load]);

  // Refresh after a new review is submitted elsewhere.
  useEffect(() => {
    const handler = () => load();
    window.addEventListener('review-updated', handler);
    return () => window.removeEventListener('review-updated', handler);
  }, [load]);

  if (!open) return null;

  const avg = data?.averageRating || 0;
  const total = data?.totalReviews || 0;
  const dist = data?.ratingDistribution || [0, 0, 0, 0, 0];
  const reviews = data?.reviews || [];
  const customerImages = reviews
    .flatMap((r) => (r.images || []).map((img) => (typeof img === 'string' ? img : img.url)).filter(Boolean))
    .slice(0, 8);
  const maxDist = Math.max(1, ...dist);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[1000] flex items-end justify-center bg-neutral-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-label={`Reviews for ${product?.name}`}
      >
        <motion.div
          initial={{ y: 40, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0, scale: 0.98 }}
          transition={{ type: 'spring', damping: 26, stiffness: 240 }}
          onClick={(e) => e.stopPropagation()}
          className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-cream shadow-2xl sm:rounded-3xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-earth/15 bg-white/60 px-6 py-4">
            <div className="flex items-center gap-3">
              <img
                src={getProductImage(product)}
                alt=""
                className="h-12 w-12 rounded-xl object-cover ring-1 ring-black/5"
                loading="lazy"
              />
              <div>
                <p className="text-xs uppercase tracking-wide text-leaf">Customer Reviews</p>
                <h3 className="line-clamp-1 text-base font-bold text-neutral-800">{product?.name}</h3>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close reviews"
              className="grid h-9 w-9 place-items-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
            >
              <FiX size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {showForm ? (
              <ReviewForm
                productId={productId}
                existingReview={existingReview}
                canSubmit={existingReview ? true : (canWrite !== false)}
                blockReason={blockReason}
                onCancel={() => setShowForm(false)}
                onSuccess={() => {
                  setShowForm(false);
                  load();
                  if (onSuccess) onSuccess();
                }}
              />
            ) : (
              <>
                {/* Summary */}
                <div className="grid grid-cols-1 gap-6 rounded-2xl bg-white/70 p-5 sm:grid-cols-[auto,1fr]">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="text-5xl font-black text-neutral-900">{Number(avg).toFixed(1)}</div>
                    <StarRating value={avg} readOnly size={18} className="mt-1" />
                    <div className="mt-1 text-sm text-neutral-500">
                      {total} review{total !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = dist[star - 1] || 0;
                      const pct = (count / maxDist) * 100;
                      return (
                        <div key={star} className="flex items-center gap-2 text-sm">
                          <span className="w-3 text-neutral-500">{star}</span>
                          <FiStar size={12} className="text-gold" fill="#D4A853" />
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.7, ease: 'easeOut' }}
                              className="h-full rounded-full bg-gradient-to-r from-gold to-earth"
                            />
                          </div>
                          <span className="w-8 text-right text-xs text-neutral-400">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Customer photos */}
                {customerImages.length > 0 && (
                  <div className="mt-5">
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-neutral-700">
                      <FiImage size={15} /> Customer Photos
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {customerImages.map((src, i) => (
                        <img
                          key={i}
                          src={src}
                          alt="Customer photo"
                          loading="lazy"
                          className="h-16 w-16 rounded-xl object-cover ring-1 ring-black/5"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Reviews list */}
                <div className="mt-5 space-y-3">
                  {loading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/70" />
                      ))}
                    </div>
                  ) : reviews.length === 0 ? (
                    <p className="rounded-2xl bg-white/70 px-4 py-8 text-center text-sm text-neutral-500">
                      No reviews yet. Be the first to share your experience!
                    </p>
                  ) : (
                    reviews.map((r) => (
                      <div key={r._id} className="rounded-2xl bg-white/70 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={r.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.user?.name || 'A')}&background=2E5E4E&color=fff&size=80`}
                              alt=""
                              className="h-9 w-9 rounded-full object-cover ring-1 ring-black/5"
                              loading="lazy"
                            />
                            <div>
                              <p className="text-sm font-semibold text-neutral-800">{r.user?.name || 'Anonymous'}</p>
                              <StarRating value={r.rating} readOnly size={13} />
                            </div>
                          </div>
                          {r.verifiedPurchase && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-leaf/10 px-2.5 py-1 text-xs font-bold text-leaf">
                              <FiCheck size={11} strokeWidth={3} /> Verified
                            </span>
                          )}
                        </div>
                        {r.title && <p className="mt-2 text-sm font-semibold text-neutral-800">{r.title}</p>}
                        {r.review && <p className="mt-0.5 text-sm leading-relaxed text-neutral-600">{r.review}</p>}
                        {r.images?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {r.images.map((img, i) => (
                              <img
                                key={i}
                                src={typeof img === 'string' ? img : img.url}
                                alt=""
                                loading="lazy"
                                className="h-14 w-14 rounded-lg object-cover ring-1 ring-black/5"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {!showForm && (
            <div className="border-t border-earth/15 bg-white/60 px-6 py-4">
              {(!canWrite && !existingReview) ? (
                <button
                  disabled
                  title={blockReason || 'Review not available yet'}
                  className="w-full cursor-not-allowed rounded-full bg-neutral-200 py-3 text-sm font-semibold text-neutral-400"
                >
                  {blockReason || 'Review not available'}
                </button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowForm(true)}
                  className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-[#264c40]"
                >
                  {existingReview ? 'Edit Your Review' : 'Write a Review'}
                </motion.button>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ReviewModal;
