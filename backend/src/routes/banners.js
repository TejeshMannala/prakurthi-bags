const { Router } = require('express');
const { getAll, getAllAdmin, create, update, remove } = require('../controllers/bannerController');
const { protect, adminOnly } = require('../middleware/auth');

const router = Router();

router.get('/', getAll);
router.get('/admin', protect, adminOnly, getAllAdmin);
router.post('/', protect, adminOnly, create);
router.put('/:id', protect, adminOnly, update);
router.delete('/:id', protect, adminOnly, remove);

module.exports = router;
