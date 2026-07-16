const express = require('express');
const router = express.Router();
const {
  getProducts,
  getFilterOptions,
  getProductById,
  getProductBySlug,
  getFeaturedProducts,
  getTrendingProducts,
  searchSuggestions,
  getCategories,
  getRelatedProducts,
} = require('../controllers/productController');
router.get("/", getProducts);
router.get('/trending', getTrendingProducts);
router.get('/featured/all', getFeaturedProducts);
router.get('/search/suggestions', searchSuggestions);
router.get('/categories/summary', getCategories);
router.get('/categories', getCategories);
router.get('/filters', getFilterOptions);
router.get('/slug/:slug', getProductBySlug);
router.get('/:id', getProductById);
router.get('/:id/related', getRelatedProducts);

module.exports = router;
