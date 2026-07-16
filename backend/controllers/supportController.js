const mongoose = require('mongoose');
const Support = require('../models/Support');
const Notification = require('../models/Notification');
const { emitToAdmin } = require('../socket/socketHandler');
const { pushNotification } = require('../utils/notify');

const createTicket = async (req, res) => {
  try {
    const { subject, message, category, priority, orderRef } = req.body;

    if (!subject || !subject.trim()) {
      return res.status(400).json({ message: 'Subject is required.' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required.' });
    }

    const ticket = await Support.create({
      user: req.user._id,
      subject: subject.trim(),
      category: category || 'other',
      priority: priority || 'medium',
      orderRef: orderRef || undefined,
      messages: [{ text: message.trim(), sender: 'user' }],
    });

    await pushNotification({
      type: 'general',
      title: 'New Support Ticket',
      message: `New ticket: "${ticket.subject}"`,
      link: `/admin/support/${ticket._id}`,
      forAdmin: true,
    });
    emitToAdmin('admin:support', {
      ticketId: ticket._id,
      subject: ticket.subject,
      message: { text: message.trim(), sender: 'user' },
    });
    emitToAdmin('admin:notification', {
      type: 'general',
      title: 'New Support Ticket',
      message: `New ticket: "${ticket.subject}"`,
      link: `/admin/support/${ticket._id}`,
      forAdmin: true,
    });

    const populated = await Support.findById(ticket._id).lean();
    res.status(201).json(populated);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join('. ') });
    }
    res.status(500).json({ message: error.message });
  }
};

const getMyTickets = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const filter = { user: req.user._id };
    if (status && status !== 'all') filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [tickets, total] = await Promise.all([
      Support.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Support.countDocuments(filter),
    ]);

    res.json({
      tickets,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTicketDetail = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid ticket ID.' });
    }

    const ticket = await Support.findOne({ _id: id, user: req.user._id }).lean();
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const replyToTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required.' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid ticket ID.' });
    }

    const ticket = await Support.findOneAndUpdate(
      { _id: id, user: req.user._id },
      {
        $push: { messages: { text: message.trim(), sender: 'user' } },
        $set: { status: 'open' },
      },
      { new: true }
    ).lean();

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    await pushNotification({
      type: 'support_reply',
      title: 'User Replied to Support Ticket',
      message: `User replied to "${ticket.subject}".`,
      link: `/admin/support/${ticket._id}`,
      forAdmin: true,
    });
    emitToAdmin('admin:support', {
      ticketId: ticket._id,
      message: { text: message.trim(), sender: 'user' },
    });
    emitToAdmin('new_message', {
      ticketId: ticket._id,
      message: { text: message.trim(), sender: 'user' },
    });

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createTicket,
  getMyTickets,
  getTicketDetail,
  replyToTicket,
};
