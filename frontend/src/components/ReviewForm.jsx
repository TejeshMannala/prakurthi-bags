import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiStar, FiImage, FiX, FiCheck, FiLogIn } from 'react-icons/fi';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/axios';
import { useCart } from '../context/CartContext';
import { useNotification } from '../context/NotificationContext';
import StarRating from './StarRating';

const MAX_IMAGES = 5;
const MAX_TITLE = 100;
const MAX_REVIEW = 1000;

/**
 * Review submission form. Opens inline inside ReviewModal.
 * - Not logged in -> prompts login.
 * - Logged in -> star rating + title + review + image URLs.
 * On success it fires `onSuccess` (parent refetches) and a global
 * `review-updated` event so other views (product detail) refresh live.
 */
const ReviewForm = ({ productId, existingReview, onSuccess, onCancel, canSubmit, blockReason }) => {
  const { user } = useCart();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const [rating, setRating] = useState(existingReview?.rating || 5);
  const [title, setTitle] = useState(existingReview?.title || '');
  const [review, setReview] = useState(existingReview?.review || '');
  const [images, setImages] = useState(existingReview?.images || []);
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!existingReview;

  const addImage = () => {
    const url = imageUrl.trim();
    if (!url) return;
    if (images.length >= MAX_IMAGES) {
      setError(`You can add up to ${MAX_IMAGES} images.`);
      return;
    }
    setImages((prev) => [...prev, { url, publicId: '' }]);
    setImageUrl('');
    setError('');
  };

  const removeImage = (idx) => setImages((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    // Defense in depth: the backend enforces purchase + delivered, but we also
    // block the UI when the server-reported eligibility disallows submission.
    if (!existingReview && canSubmit === false) {
      setError(blockReason || 'You are not eligible to review this product yet.');
      return;
    }
    if (!rating || rating < 1) return setError('Please select a rating.');
    if (!review.trim()) return setError('Please write your review.');

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        product: productId,
        rating,
        title: title.trim(),
        review: review.trim(),
        images,
      };
      if (isEdit) {
        await api.put(`/api/reviews/${existingReview._id}`, payload);
        showNotification('reviewApproved', 'Review updated');
      } else {
        await api.post('/api/reviews', payload);
        showNotification('reviewApproved', 'Review submitted');
      }
      if (onSuccess) onSuccess();
      window.dispatchEvent(new CustomEvent('review-updated', { detail: { productId } }));
    } catch (err) {
      const msg = err.response?.data?.message || (isEdit ? 'Failed to update review.' : 'Failed to submit review.');
      setError(msg);
      showNotification('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="rounded-2xl border border-earth/20 bg-beige/60 p-6 text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
          <FiLogIn size={22} />
        </div>
        <p className="mb-1 font-semibold text-neutral-800">Please log in to write a review</p>
        <p className="mb-4 text-sm text-neutral-500">Share your experience with this handcrafted piece.</p>
        <Link
          to="/login"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#264c40]"
        >
          <FiLogIn size={16} /> Login to Review
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-semibold text-neutral-700">Your Rating</p>
        <StarRating value={rating} onChange={setRating} size={34} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-neutral-700">Title (optional)</label>
        <input
          value={title}
          maxLength={MAX_TITLE}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Summarize your experience"
          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-neutral-700">Your Review</label>
        <textarea
          value={review}
          maxLength={MAX_REVIEW}
          rows={4}
          onChange={(e) => setReview(e.target.value)}
          placeholder="Tell others what you loved about this bag…"
          className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
        />
        <p className="mt-1 text-right text-xs text-neutral-400">{review.length}/{MAX_REVIEW}</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-neutral-700">Add Photos (optional)</label>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Paste image URL"
            className="flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={addImage}
            className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-white px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
          >
            <FiImage size={15} /> Add
          </button>
        </div>
        {images.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {images.map((img, i) => (
              <div key={i} className="relative">
                <img src={img.url} alt="" className="h-16 w-16 rounded-lg object-cover ring-1 ring-black/5" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -right-1.5 -top-1.5 grid h-7 w-7 place-items-center rounded-full bg-rose-500 text-white shadow-sm"
                  aria-label="Remove image"
                >
                  <FiX size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-600">{error}</p>
      )}

      {!existingReview && canSubmit === false && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700">
          {blockReason || 'You can review this product after you have purchased and received it.'}
        </p>
      )}

      <div className="flex items-center justify-end gap-3 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-neutral-500 transition-colors hover:text-neutral-800"
          >
            Cancel
          </button>
        )}
        <motion.button
          type="submit"
          disabled={submitting || (!existingReview && canSubmit === false)}
          whileTap={{ scale: 0.97 }}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-[#264c40] disabled:opacity-60"
        >
          <FiCheck size={16} /> {submitting ? 'Submitting…' : isEdit ? 'Update Review' : 'Submit Review'}
        </motion.button>
      </div>
    </form>
  );
};

export default ReviewForm;
