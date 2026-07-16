const { Router } = require('express');
const { getAddresses, createAddress, updateAddress, deleteAddress } = require('../controllers/addressController');
const { protect } = require('../middleware/auth');

const router = Router();

router.get('/', protect, getAddresses);
router.post('/', protect, createAddress);
router.put('/:id', protect, updateAddress);
router.delete('/:id', protect, deleteAddress);

module.exports = router;
