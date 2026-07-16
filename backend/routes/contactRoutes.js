const express = require('express');
const router = express.Router();
const ContactMessage = require('../models/ContactMessage');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const escapeRegex = require('../utils/escapeRegex');

router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Name, email, and message are required.' });
    }
    const contact = await ContactMessage.create({ name, email, subject, message });
    res.status(201).json(contact);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { search, read } = req.query;
    const filter = {};
    if (search) {
      const safeSearch = escapeRegex(search);
      filter.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
        { subject: { $regex: safeSearch, $options: 'i' } },
      ];
    }
    if (read === 'true') filter.read = true;
    else if (read === 'false') filter.read = false;
    const messages = await ContactMessage.find(filter).sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', protect, adminOnly, async (req, res) => {
  try {
    const message = await ContactMessage.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found.' });
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { reply, read } = req.body;
    const update = {};
    if (reply !== undefined) {
      update.reply = reply;
      update.replied = true;
      update.repliedAt = new Date();
    }
    if (read !== undefined) update.read = read;
    const message = await ContactMessage.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!message) return res.status(404).json({ message: 'Message not found.' });
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const message = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found.' });
    res.json({ message: 'Message deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
