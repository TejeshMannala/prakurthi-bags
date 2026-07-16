const { Router } = require('express');
const {
  getAll, getById, getBySlug, getTrending, getBestSellers, getNewArrivals, searchProducts,
  getRelatedProducts, create, update, remove, uploadImages,
} = require('../controllers/productController');
const { protect, adminOnly } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

const router = Router();

router.get('/', getAll);
router.get('/search', searchProducts);
router.get('/trending', getTrending);
router.get('/best-sellers', getBestSellers);
router.get('/new-arrivals', getNewArrivals);
router.get('/:id/related', getRelatedProducts);
router.get('/:id', getById);
router.post('/', protect, adminOnly, create);
router.put('/:id', protect, adminOnly, update);
router.delete('/:id', protect, adminOnly, remove);
router.post('/upload-images', protect, adminOnly, upload.array('images', 10), uploadImages);

module.exports = router;
