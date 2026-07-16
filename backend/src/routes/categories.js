const { Router } = require('express');
const { getAll, getBySlug, create, update, remove } = require('../controllers/categoryController');
const { protect, adminOnly } = require('../middleware/auth');

const router = Router();

router.get('/', getAll);
router.get('/:slug', getBySlug);
router.post('/', protect, adminOnly, create);
router.put('/:id', protect, adminOnly, update);
router.delete('/:id', protect, adminOnly, remove);

module.exports = router;
