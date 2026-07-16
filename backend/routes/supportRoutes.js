const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createTicket,
  getMyTickets,
  getTicketDetail,
  replyToTicket,
} = require('../controllers/supportController');

router.post('/', protect, createTicket);
router.get('/mytickets', protect, getMyTickets);
router.get('/:id', protect, getTicketDetail);
router.post('/:id/reply', protect, replyToTicket);

module.exports = router;
