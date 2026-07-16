const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getLocations,
} = require('../controllers/addressController');

router.get('/locations', getLocations);
router.get('/', protect, getAddresses);
router.get('/:id', protect, getAddressById);
router.post('/', protect, createAddress);
router.put('/:id', protect, updateAddress);
router.delete('/:id', protect, deleteAddress);
router.patch('/:id/default', protect, setDefaultAddress);

module.exports = router;
