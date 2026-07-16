const ReturnPolicy = require('../models/ReturnPolicy');
const ExchangePolicy = require('../models/ExchangePolicy');

const getReturnPolicy = async (req, res) => {
  try {
    const policy = await ReturnPolicy.findOne({ active: true }).sort({ createdAt: -1 }).lean();
    if (!policy) return res.json(null);
    res.json(policy);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getExchangePolicy = async (req, res) => {
  try {
    const policy = await ExchangePolicy.findOne({ active: true }).sort({ createdAt: -1 }).lean();
    if (!policy) return res.json(null);
    res.json(policy);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getReturnPolicy, getExchangePolicy };
