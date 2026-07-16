import api from './axios';

// Returns review-eligibility for a single product. Guests (401) are mapped to a
// safe "not logged in" shape so the UI can render a login prompt without throwing.
export const getReviewEligibility = async (productId) => {
  try {
    const { data } = await api.get(`/api/reviews/eligibility/${productId}`);
    return { loggedIn: true, ...data };
  } catch (err) {
    if (err.response?.status === 401) {
      return { loggedIn: false, canReview: false, reason: 'login', purchased: false, delivered: false, alreadyReviewed: false, review: null };
    }
    return { loggedIn: true, canReview: false, reason: 'error', purchased: false, delivered: false, alreadyReviewed: false, review: null };
  }
};

// Bulk variant for the order-tracking page (many products at once).
export const getBulkEligibility = async (ids = []) => {
  const clean = ids.filter(Boolean);
  if (clean.length === 0) return { loggedIn: true, map: {} };
  try {
    const { data } = await api.get(`/api/reviews/eligibility?productIds=${clean.join(',')}`);
    return { loggedIn: true, map: data.map || {} };
  } catch (err) {
    if (err.response?.status === 401) return { loggedIn: false, map: {} };
    return { loggedIn: true, map: {} };
  }
};

export const eligibilityReasonText = (reason) => {
  switch (reason) {
    case 'delivery':
      return 'You can review this product after it has been delivered.';
    case 'purchase':
      return 'Purchase this product to write a review.';
    case 'already':
      return 'You have already reviewed this product.';
    case 'login':
      return 'Please log in to write a review.';
    default:
      return 'You can review this product after you have purchased and received it.';
  }
};
