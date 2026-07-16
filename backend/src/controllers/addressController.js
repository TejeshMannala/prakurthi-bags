const Address = require('../models/Address');

const getAddresses = async (req, res) => {
  const addresses = await Address.find({ user: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
  res.json({ success: true, data: addresses });
};

const createAddress = async (req, res) => {
  const { fullName, phone, street, city, state, pincode, isDefault } = req.body;

  if (isDefault) {
    await Address.updateMany({ user: req.user._id }, { isDefault: false });
  }

  const address = await Address.create({
    user: req.user._id,
    fullName, phone, street, city, state, pincode,
    isDefault: isDefault || false,
  });

  res.status(201).json({ success: true, data: address });
};

const updateAddress = async (req, res) => {
  const { id } = req.params;
  const { fullName, phone, street, city, state, pincode, isDefault } = req.body;

  const address = await Address.findOne({ _id: id, user: req.user._id });
  if (!address) {
    return res.status(404).json({ success: false, message: 'Address not found.' });
  }

  if (isDefault) {
    await Address.updateMany({ user: req.user._id, _id: { $ne: id } }, { isDefault: false });
  }

  Object.assign(address, { fullName, phone, street, city, state, pincode, isDefault });
  await address.save();

  res.json({ success: true, data: address });
};

const deleteAddress = async (req, res) => {
  const { id } = req.params;
  const address = await Address.findOneAndDelete({ _id: id, user: req.user._id });
  if (!address) {
    return res.status(404).json({ success: false, message: 'Address not found.' });
  }
  res.json({ success: true, message: 'Address deleted.' });
};

module.exports = { getAddresses, createAddress, updateAddress, deleteAddress };
