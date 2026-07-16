const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, async (req, res) => {
  try {
    const filter = req.user.role === 'admin'
      ? { forAdmin: true }
      : { user: req.user._id, forAdmin: false };
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/read', protect, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ message: 'Marked as read.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/read-all', protect, async (req, res) => {
  try {
    const filter = req.user.role === 'admin'
      ? { forAdmin: true, read: false }
      : { user: req.user._id, read: false };
    await Notification.updateMany(filter, { read: true });
    res.json({ message: 'All marked as read.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
