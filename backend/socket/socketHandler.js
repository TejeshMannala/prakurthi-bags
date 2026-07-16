const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Product = require('../models/Product');

let io;

// In-memory presence + live product view counters (non-persistent, fast).
const onlineUsers = new Map(); // userId -> Set of socketIds
const productViewers = new Map(); // productId -> Set of socketIds

function setupSocket(server) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const adminUrl = process.env.ADMIN_URL || 'http://localhost:5173';

  io = new Server(server, {
    cors: {
      origin: [frontendUrl, adminUrl, 'http://localhost:3000', 'http://localhost:5173', 'http://localhost:4173'].filter(Boolean),
      credentials: true,
    },
  });

  // ---- Auth middleware: every socket must present a valid JWT ----
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return next(new Error('User not found'));
      }
      socket.user = user;
      next();
    } catch (error) {
      return next(new Error('Invalid token'));
    }
  });

  // ---- Presence helpers ----
  const broadcastPresence = () => {
    if (!io) return;
    io.to('admin').emit('admin:presence', { onlineCount: onlineUsers.size });
  };

  const markOnline = (socket, user) => {
    const userId = user._id.toString();
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);
    socket.join(`user_${userId}`);
    if (user.role === 'admin') socket.join('admin');
    io.to('admin').emit('presence:update', {
      userId,
      online: true,
      onlineCount: onlineUsers.size,
    });
    broadcastPresence();
  };

  const markOffline = (socket, user) => {
    const userId = user._id.toString();
    const set = onlineUsers.get(userId);
    if (set) {
      set.delete(socket.id);
      if (set.size === 0) {
        onlineUsers.delete(userId);
        io.to('admin').emit('presence:update', {
          userId,
          online: false,
          onlineCount: onlineUsers.size,
        });
      }
    }
    broadcastPresence();
  };

  // ---- Live product view count helpers ----
  const broadcastViewers = (productId) => {
    if (!io) return;
    const count = productViewers.get(productId)?.size || 0;
    io.to(`product_view_${productId}`).emit('product:viewers', { productId, count });
  };

  io.on('connection', (socket) => {
    const user = socket.user;
    const userId = user._id.toString();

    markOnline(socket, user);

    // Explicit join to a user room (used by admin support streams).
    socket.on('join', (data) => {
      const targetUserId = data?.userId || data;
      if (targetUserId && (targetUserId === userId || user.role === 'admin')) {
        socket.join(`user_${targetUserId}`);
      }
    });

    socket.on('admin:join', () => {
      socket.join('admin');
    });

    // ---- Live support chat ----
    socket.on('send_message', (data) => {
      const { ticketId, message } = data;
      if (!ticketId || !message) return;

      const messageData = {
        ticketId,
        message: {
          text: message.text || message,
          sender: user.role === 'admin' ? 'admin' : 'user',
          createdAt: new Date(),
        },
        sentBy: userId,
      };

      io.to(`user_${userId}`).emit('new_message', messageData);
      io.to('admin').emit('new_message', messageData);
      io.to('admin').emit('admin:support', messageData);
    });

    socket.on('typing', (data) => {
      const { ticketId, isTyping } = data;
      if (user.role === 'admin') {
        socket.to(`user_${data.targetUser || ''}`).emit('typing', { ticketId, userId, isTyping });
      } else {
        socket.to('admin').emit('typing', { ticketId, userId, isTyping });
      }
    });

    // ---- Live product view tracking ----
    socket.on('product:view', (data) => {
      const productId = data?.productId || data;
      if (!productId) return;
      const room = `product_view_${productId}`;
      // Leave any previously tracked product for this socket.
      if (socket._viewingProduct && socket._viewingProduct !== productId) {
        const prev = socket._viewingProduct;
        socket.leave(`product_view_${prev}`);
        const prevSet = productViewers.get(prev);
        if (prevSet) {
          prevSet.delete(socket.id);
          if (prevSet.size === 0) productViewers.delete(prev);
        }
        broadcastViewers(prev);
      }
      socket.join(room);
      socket._viewingProduct = productId;
      if (!productViewers.has(productId)) productViewers.set(productId, new Set());
      productViewers.get(productId).add(socket.id);
      broadcastViewers(productId);
    });

    socket.on('product:view:leave', (data) => {
      const productId = data?.productId || data || socket._viewingProduct;
      if (!productId) return;
      socket.leave(`product_view_${productId}`);
      const set = productViewers.get(productId);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) productViewers.delete(productId);
      }
      broadcastViewers(productId);
      socket._viewingProduct = null;
    });

    socket.on('disconnect', () => {
      if (socket._viewingProduct) {
        const pid = socket._viewingProduct;
        const set = productViewers.get(pid);
        if (set) {
          set.delete(socket.id);
          if (set.size === 0) productViewers.delete(pid);
        }
        broadcastViewers(pid);
      }
      markOffline(socket, user);
    });
  });

  return io;
}

// ============================================================
// Centralized emit helpers (safe to call from any controller)
// ============================================================
function emitToUser(userId, event, data) {
  if (!io || !userId) return;
  io.to(`user_${userId}`).emit(event, data);
}

function emitToAdmin(event, data) {
  if (!io) return;
  io.to('admin').emit(event, data);
}

function emitSupportUpdate(ticketId, messageData) {
  if (!io) return;
  io.to('admin').emit('admin:support', { ticketId, ...messageData });
  if (messageData.user) {
    io.to(`user_${messageData.user}`).emit('support_update', { ticketId, ...messageData });
  }
}

// Broadcast a content change to every connected storefront session.
function emitContent(event, data) {
  if (!io) return;
  io.emit(event, data || {});
}

function getIO() {
  return io;
}

function getOnlineCount() {
  return onlineUsers.size;
}

module.exports = {
  setupSocket,
  emitToUser,
  emitToAdmin,
  emitSupportUpdate,
  emitContent,
  getIO,
  getOnlineCount,
};
