const express = require('express');
const router = express.Router();
const { verifyAdmin } = require('../middleware/authMiddleware');
const {
  adminLogin,
  getDashboardMetrics,
  getAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  getCategoryDistribution,
  getAdminOrders,
  updateAdminOrder,
  deleteAdminOrder,
  getAdminPayments,
  getAdminUsers,
  updateAdminUser,
  deleteAdminUser,
  getAdminCoupons,
  createAdminCoupon,
  updateAdminCoupon,
  deleteAdminCoupon,
  getAdminReviews,
  updateAdminReview,
  deleteAdminReview,
  getAdminNotifications,
  getAdminSupportTickets,
  getAdminSupportTicketById,
  updateAdminSupportTicket,
  deleteAdminSupportTicket,
  replyAdminSupportTicket,
  getAdminReturns,
  updateAdminReturn,
  deleteAdminReturn,
  getAdminFaqs,
  createAdminFaq,
  updateAdminFaq,
  deleteAdminFaq,
  getAdminPages,
  upsertAdminPage,
  getAdminTeamMembers,
  createAdminTeamMember,
  updateAdminTeamMember,
  deleteAdminTeamMember,
  getAdminBanners,
  createAdminBanner,
  updateAdminBanner,
  deleteAdminBanner,
  getAdminContactMessages,
  updateAdminContactMessage,
  getAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  getAdminReturnPolicies,
  createAdminReturnPolicy,
  updateAdminReturnPolicy,
  deleteAdminReturnPolicy,
  getAdminExchangePolicies,
  createAdminExchangePolicy,
  updateAdminExchangePolicy,
  deleteAdminExchangePolicy,
  getAdminContactInfo,
  updateAdminContactInfo,
} = require('../controllers/adminController');
const {
  getAdminTestimonials, createTestimonial, updateTestimonial, deleteTestimonial,
} = require('../controllers/testimonialController');

router.post('/login', adminLogin);
router.use(verifyAdmin);

router.get('/metrics', getDashboardMetrics);
router.get('/dashboard', getDashboardMetrics);
router.get('/products/category-distribution', getCategoryDistribution);

router.get('/products', getAdminProducts);
router.post('/products', createAdminProduct);
router.put('/products/:id', updateAdminProduct);
router.delete('/products/:id', deleteAdminProduct);

router.get('/orders', getAdminOrders);
router.put('/orders/:id', updateAdminOrder);
router.delete('/orders/:id', deleteAdminOrder);

router.get('/payments', getAdminPayments);

router.get('/users', getAdminUsers);
router.put('/users/:id', updateAdminUser);
router.delete('/users/:id', deleteAdminUser);

router.get('/coupons', getAdminCoupons);
router.post('/coupons', createAdminCoupon);
router.put('/coupons/:id', updateAdminCoupon);
router.delete('/coupons/:id', deleteAdminCoupon);

router.get('/reviews', getAdminReviews);
router.put('/reviews/:id', updateAdminReview);
router.delete('/reviews/:id', deleteAdminReview);

router.get('/notifications', getAdminNotifications);

router.get('/support', getAdminSupportTickets);
router.get('/support/:id', getAdminSupportTicketById);
router.put('/support/:id', updateAdminSupportTicket);
router.post('/support/:id/reply', replyAdminSupportTicket);
router.delete('/support/:id', deleteAdminSupportTicket);

router.get('/returns', getAdminReturns);
router.put('/returns/:id', updateAdminReturn);
router.delete('/returns/:id', deleteAdminReturn);

router.get('/faqs', getAdminFaqs);
router.post('/faqs', createAdminFaq);
router.put('/faqs/:id', updateAdminFaq);
router.delete('/faqs/:id', deleteAdminFaq);

router.get('/pages', getAdminPages);
router.put('/pages/:page', upsertAdminPage);

router.get('/team/all', getAdminTeamMembers);
router.post('/team', createAdminTeamMember);
router.put('/team/:id', updateAdminTeamMember);
router.delete('/team/:id', deleteAdminTeamMember);

router.get('/banners/all', getAdminBanners);
router.post('/banners', createAdminBanner);
router.put('/banners/:id', updateAdminBanner);
router.delete('/banners/:id', deleteAdminBanner);

router.get('/contact-messages', getAdminContactMessages);
router.put('/contact-messages/:id', updateAdminContactMessage);

router.get('/categories', getAdminCategories);
router.post('/categories', createAdminCategory);
router.put('/categories/:id', updateAdminCategory);
router.delete('/categories/:id', deleteAdminCategory);

router.get('/return-policies', getAdminReturnPolicies);
router.post('/return-policies', createAdminReturnPolicy);
router.put('/return-policies/:id', updateAdminReturnPolicy);
router.delete('/return-policies/:id', deleteAdminReturnPolicy);

router.get('/exchange-policies', getAdminExchangePolicies);
router.post('/exchange-policies', createAdminExchangePolicy);
router.put('/exchange-policies/:id', updateAdminExchangePolicy);
router.delete('/exchange-policies/:id', deleteAdminExchangePolicy);

router.get('/contact-info', getAdminContactInfo);
router.put('/contact-info', updateAdminContactInfo);

router.get('/testimonials/all', getAdminTestimonials);
router.post('/testimonials', createTestimonial);
router.put('/testimonials/:id', updateTestimonial);
router.delete('/testimonials/:id', deleteTestimonial);

module.exports = router;
