const express = require('express');
const router = express.Router();
const ReturnRequest = require('../models/ReturnRequest');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.post('/', protect, async (req, res) => {
  try {
    const { order, orderItem, reason, images, pickUpAddress } = req.body;
    if (!order || !reason) {
      return res.status(400).json({ message: 'Order ID and reason are required.' });
    }
    const existing = await ReturnRequest.findOne({ user: req.user._id, order, status: { $in: ['pending', 'approved', 'picked_up', 'received'] } });
    if (existing) {
      return res.status(409).json({ message: 'A return request already exists for this order.' });
    }
    const returnReq = await ReturnRequest.create({
      user: req.user._id, order, orderItem, reason, images, pickUpAddress,
    });
    res.status(201).json(returnReq);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/my', protect, async (req, res) => {
  try {
    const returns = await ReturnRequest.find({ user: req.user._id })
      .populate('order', 'orderStatus totalPrice')
      .sort({ createdAt: -1 });
    res.json(returns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const returnReq = await ReturnRequest.findOne({ _id: req.params.id, user: req.user._id })
      .populate('order');
    if (!returnReq) return res.status(404).json({ message: 'Return request not found.' });
    res.json(returnReq);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const returns = await ReturnRequest.find(filter)
      .populate('user', 'name email')
      .populate('order', 'orderStatus totalPrice')
      .sort({ createdAt: -1 });
    res.json(returns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { status, adminNote, refundAmount, refundMethod } = req.body;
    const update = { status };
    if (adminNote !== undefined) update.adminNote = adminNote;
    if (refundAmount !== undefined) update.refundAmount = refundAmount;
    if (refundMethod) update.refundMethod = refundMethod;
    if (['refunded', 'rejected'].includes(status)) update.resolvedAt = new Date();
    const returnReq = await ReturnRequest.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!returnReq) return res.status(404).json({ message: 'Return request not found.' });
    res.json(returnReq);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
