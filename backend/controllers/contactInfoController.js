const ContactInfo = require('../models/ContactInfo');

const getContactInfo = async (req, res) => {
  try {
    let info = await ContactInfo.findOne().sort({ createdAt: -1 }).lean();
    if (!info) {
      info = await ContactInfo.create({});
    }
    res.json(info);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getContactInfo };
