const express = require('express');
const router = express.Router();
const { getCategories, getCategoryBySlug, getCategoryProducts } = require('../controllers/categoryController');

router.get('/', getCategories);
router.get('/:slug', getCategoryBySlug);
router.get('/:slug/products', getCategoryProducts);

module.exports = router;
