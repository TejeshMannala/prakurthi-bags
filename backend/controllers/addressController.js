const Address = require('../models/Address');
const { validateAddress } = require('../utils/addressValidator');
const { indianStates, getDistricts, getCities } = require('../utils/indianLocations');

const getAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user._id })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();
    res.json(addresses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAddressById = async (req, res) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, user: req.user._id }).lean();
    if (!address) return res.status(404).json({ message: 'Address not found.' });
    res.json(address);
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid address ID.' });
    res.status(500).json({ message: error.message });
  }
};

const createAddress = async (req, res) => {
  try {
    const validation = validateAddress(req.body);
    if (!validation.valid) {
      return res.status(400).json({ message: Object.values(validation.errors)[0], errors: validation.errors });
    }

    const existing = await Address.countDocuments({ user: req.user._id });

    const addressData = {
      user: req.user._id,
      fullName: req.body.fullName.trim(),
      mobile: req.body.mobile.trim(),
      alternateMobile: req.body.alternateMobile?.trim() || '',
      email: req.body.email?.trim() || '',
      houseNo: req.body.houseNo.trim(),
      street: req.body.street.trim(),
      area: req.body.area?.trim() || '',
      landmark: req.body.landmark?.trim() || '',
      city: req.body.city.trim(),
      district: req.body.district.trim(),
      state: req.body.state.trim(),
      country: req.body.country?.trim() || 'India',
      pincode: req.body.pincode.trim(),
      addressType: req.body.addressType || 'Home',
      isDefault: existing === 0 ? true : !!req.body.isDefault,
    };

    if (addressData.isDefault) {
      await Address.updateMany({ user: req.user._id }, { isDefault: false });
    }

    const address = await Address.create(addressData);
    res.status(201).json(address);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join('. ') });
    }
    res.status(500).json({ message: error.message });
  }
};

const updateAddress = async (req, res) => {
  try {
    const existing = await Address.findOne({ _id: req.params.id, user: req.user._id });
    if (!existing) return res.status(404).json({ message: 'Address not found.' });

    const validation = validateAddress({ ...existing.toObject(), ...req.body });
    if (!validation.valid) {
      return res.status(400).json({ message: Object.values(validation.errors)[0], errors: validation.errors });
    }

    const updateData = {};
    const fields = ['fullName', 'mobile', 'alternateMobile', 'email', 'houseNo', 'street', 'area', 'landmark', 'city', 'district', 'state', 'country', 'pincode', 'addressType'];
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updateData[field] = typeof req.body[field] === 'string' ? req.body[field].trim() : req.body[field];
      }
    }

    if (req.body.isDefault) {
      await Address.updateMany({ user: req.user._id }, { isDefault: false });
      updateData.isDefault = true;
    }

    const updated = await Address.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    res.json(updated);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join('. ') });
    }
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid address ID.' });
    res.status(500).json({ message: error.message });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const address = await Address.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!address) return res.status(404).json({ message: 'Address not found.' });

    if (address.isDefault) {
      const first = await Address.findOne({ user: req.user._id }).sort({ createdAt: -1 });
      if (first) {
        first.isDefault = true;
        await first.save();
      }
    }

    res.json({ message: 'Address deleted successfully.' });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid address ID.' });
    res.status(500).json({ message: error.message });
  }
};

const setDefaultAddress = async (req, res) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
    if (!address) return res.status(404).json({ message: 'Address not found.' });

    await Address.updateMany({ user: req.user._id }, { isDefault: false });
    address.isDefault = true;
    await address.save();

    res.json({ message: 'Default address updated.', address });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid address ID.' });
    res.status(500).json({ message: error.message });
  }
};

const getLocations = async (req, res) => {
  try {
    const { state, district } = req.query;
    if (state && district) {
      return res.json({ cities: getCities(district) });
    }
    if (state) {
      return res.json({ districts: getDistricts(state) });
    }
    res.json({ states: indianStates });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getLocations,
};
