const express = require('express');
const router = express.Router();
const TeamMember = require('../models/TeamMember');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/', async (req, res) => {
  try {
    const members = await TeamMember.find({ active: true }).sort({ order: 1, createdAt: -1 }).lean();
    res.json(members);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    const members = await TeamMember.find().sort({ order: 1 }).lean();
    res.json(members);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, position, bio, photo, socialLinks, order } = req.body;
    if (!name || !position) return res.status(400).json({ message: 'Name and position are required.' });
    const member = await TeamMember.create({ name, position, bio, photo, socialLinks, order });
    res.status(201).json(member);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, position, bio, photo, socialLinks, order, active } = req.body;
    const member = await TeamMember.findByIdAndUpdate(
      req.params.id, { name, position, bio, photo, socialLinks, order, active },
      { new: true, runValidators: true }
    );
    if (!member) return res.status(404).json({ message: 'Team member not found.' });
    res.json(member);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const member = await TeamMember.findByIdAndDelete(req.params.id);
    if (!member) return res.status(404).json({ message: 'Team member not found.' });
    res.json({ message: 'Team member deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
