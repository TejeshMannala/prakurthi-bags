const Notification = require('../models/Notification');
const { getIO } = require('../socket/socketHandler');
const logger = require('./logger');

// Create a Notification document AND push it over the socket in real time.
async function pushNotification({
  type = 'info',
  title,
  message,
  user,
  forAdmin = false,
  link = '',
  data = {},
} = {}) {
  try {
    const notif = await Notification.create({
      type,
      title,
      message,
      user: user || undefined,
      forAdmin,
      link,
      data,
    });

    const io = getIO();
    if (io) {
      if (forAdmin) {
        io.to('admin').emit('admin:notification', notif);
      }
      if (user) {
        io.to(`user_${user}`).emit('notification', notif);
      }
    }
    return notif;
  } catch (err) {
    logger.error('Failed to create/emit notification:', err.message);
    return null;
  }
}

module.exports = { pushNotification };
