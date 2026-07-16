const Notification = require('../models/Notification');
const { getIO } = require('../socket/socketHandler');

// Create a Notification document AND push it over the socket in real time.
// `user`   -> target user id (string/ObjectId) for a user-facing notification
// `forAdmin` -> send to the admin room instead (or in addition)
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
    console.error('[notify] failed to create/emit notification:', err.message);
    return null;
  }
}

module.exports = { pushNotification };
