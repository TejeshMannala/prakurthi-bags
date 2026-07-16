const { validateIndianPincode } = require('./indianLocations');

const INVALID_PATTERNS = [
  /^(.)\1+$/, /^(?:test|dummy|asdf|qwerty|abc|xyz|xxx|random|demo|null|undefined)$/i,
  /^\d{1,3}$/, /^[^a-zA-Z0-9\s]+$/,
];

const isShortOrInvalid = (val, minLen = 2) => {
  if (!val || typeof val !== 'string') return true;
  const trimmed = val.trim();
  if (trimmed.length < minLen) return true;
  if (INVALID_PATTERNS.some(p => p.test(trimmed))) return true;
  return false;
};

const validateFullName = (name) => {
  if (!name || typeof name !== 'string') return 'Full name is required.';
  const trimmed = name.trim();
  if (trimmed.length < 2) return 'Full name must be at least 2 characters.';
  if (trimmed.length > 100) return 'Full name is too long.';
  if (INVALID_PATTERNS.some(p => p.test(trimmed))) return 'Invalid full name.';
  if (!/^[a-zA-Z\s.'-]+$/.test(trimmed)) return 'Full name contains invalid characters.';
  return null;
};

const validateMobile = (mobile) => {
  if (!mobile || typeof mobile !== 'string') return 'Mobile number is required.';
  const cleaned = mobile.replace(/\s+/g, '');
  if (!/^[6-9]\d{9}$/.test(cleaned)) return 'Invalid mobile number. Must be a valid 10-digit Indian mobile number.';
  return null;
};

const validateAlternateMobile = (mobile) => {
  if (!mobile || !mobile.trim()) return null;
  const cleaned = mobile.replace(/\s+/g, '');
  if (!/^[6-9]\d{9}$/.test(cleaned)) return 'Invalid alternate mobile number.';
  return null;
};

const validateEmail = (email) => {
  if (!email || !email.trim()) return null;
  const trimmed = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Invalid email address.';
  if (trimmed.length > 100) return 'Email is too long.';
  return null;
};

const validateHouseNo = (houseNo) => {
  if (!houseNo || typeof houseNo !== 'string') return 'House / Flat number is required.';
  const trimmed = houseNo.trim();
  if (trimmed.length < 1) return 'House / Flat number is required.';
  if (trimmed.length > 50) return 'House / Flat number is too long.';
  if (INVALID_PATTERNS.some(p => p.test(trimmed)) && /^\d+$/.test(trimmed) && trimmed.length < 3) return 'Invalid house number.';
  return null;
};

const validateStreet = (street) => {
  if (!street || typeof street !== 'string') return 'Street is required.';
  const trimmed = street.trim();
  if (trimmed.length < 3) return 'Street must be at least 3 characters.';
  if (trimmed.length > 200) return 'Street is too long.';
  if (INVALID_PATTERNS.some(p => p.test(trimmed))) return 'Invalid street.';
  return null;
};

const validateArea = (area) => {
  if (!area || !area.trim()) return null;
  const trimmed = area.trim();
  if (trimmed.length < 2 && trimmed.length > 0) return 'Invalid area.';
  if (trimmed.length > 100) return 'Area is too long.';
  if (INVALID_PATTERNS.some(p => p.test(trimmed))) return 'Invalid area.';
  return null;
};

const validateLandmark = (landmark) => {
  if (!landmark || !landmark.trim()) return null;
  const trimmed = landmark.trim();
  if (isShortOrInvalid(trimmed, 2)) return 'Invalid landmark.';
  if (trimmed.length > 200) return 'Landmark is too long.';
  if (INVALID_PATTERNS.some(p => p.test(trimmed))) return 'Invalid landmark.';
  return null;
};

const validateCity = (city) => {
  if (!city || typeof city !== 'string') return 'City is required.';
  const trimmed = city.trim();
  if (trimmed.length < 2) return 'Invalid city.';
  if (trimmed.length > 100) return 'City name is too long.';
  if (!/^[a-zA-Z\s.-]+$/.test(trimmed)) return 'City name contains invalid characters.';
  if (INVALID_PATTERNS.some(p => p.test(trimmed))) return 'Invalid city.';
  if (/\d/.test(trimmed)) return 'City name cannot contain numbers.';
  return null;
};

const validateDistrict = (district) => {
  if (!district || !district.trim()) return null;
  const trimmed = district.trim();
  if (trimmed.length < 2) return 'Invalid district.';
  if (trimmed.length > 100) return 'District name is too long.';
  if (!/^[a-zA-Z\s.-]+$/.test(trimmed)) return 'District name contains invalid characters.';
  if (INVALID_PATTERNS.some(p => p.test(trimmed))) return 'Invalid district.';
  if (/\d/.test(trimmed)) return 'District name cannot contain numbers.';
  return null;
};

const validateState = (state) => {
  if (!state || typeof state !== 'string') return 'State is required.';
  const trimmed = state.trim();
  if (trimmed.length < 2) return 'Invalid state.';
  if (trimmed.length > 100) return 'State name is too long.';
  if (INVALID_PATTERNS.some(p => p.test(trimmed))) return 'Invalid state.';
  if (/\d/.test(trimmed)) return 'State name cannot contain numbers.';
  return null;
};

const validateCountry = (country) => {
  if (!country || typeof country !== 'string') return 'Country is required.';
  const trimmed = country.trim();
  if (trimmed.length < 2) return 'Invalid country.';
  if (INVALID_PATTERNS.some(p => p.test(trimmed))) return 'Invalid country.';
  if (trimmed.length > 100) return 'Country name is too long.';
  return null;
};

const validatePincode = (pincode, state, city) => {
  if (!pincode || typeof pincode !== 'string') return 'PIN Code is required.';
  const trimmed = pincode.trim();
  if (!/^[1-9][0-9]{5}$/.test(trimmed)) return 'Invalid PIN Code. Must be a 6-digit number not starting with 0.';
  if (!validateIndianPincode(trimmed)) return 'Invalid PIN Code.';
  const { getStateFromPincode } = require('./indianLocations');
  const possibleStates = getStateFromPincode(trimmed);
  if (possibleStates && state) {
    if (Array.isArray(possibleStates)) {
      if (!possibleStates.some(s => s.toLowerCase() === state.toLowerCase())) {
        return 'This PIN Code does not belong to the selected state.';
      }
    } else if (possibleStates.toLowerCase() !== state.toLowerCase()) {
      return 'This PIN Code does not belong to the selected state.';
    }
  }
  return null;
};

const validateAddress = (data, options = {}) => {
  const errors = {};

  const nameErr = validateFullName(data.fullName);
  if (nameErr) errors.fullName = nameErr;

  const mobileErr = validateMobile(data.mobile);
  if (mobileErr) errors.mobile = mobileErr;

  const altMobileErr = validateAlternateMobile(data.alternateMobile);
  if (altMobileErr) errors.alternateMobile = altMobileErr;

  const emailErr = validateEmail(data.email);
  if (emailErr) errors.email = emailErr;

  const houseErr = validateHouseNo(data.houseNo);
  if (houseErr) errors.houseNo = houseErr;

  const streetErr = validateStreet(data.street);
  if (streetErr) errors.street = streetErr;

  const areaErr = validateArea(data.area);
  if (areaErr) errors.area = areaErr;

  const landmarkErr = validateLandmark(data.landmark);
  if (landmarkErr) errors.landmark = landmarkErr;

  const cityErr = validateCity(data.city);
  if (cityErr) errors.city = cityErr;

  const districtErr = validateDistrict(data.district);
  if (districtErr) errors.district = districtErr;

  const stateErr = validateState(data.state);
  if (stateErr) errors.state = stateErr;

  const countryErr = validateCountry(data.country);
  if (countryErr) errors.country = countryErr;

  const pincodeErr = validatePincode(data.pincode, data.state, data.city);
  if (pincodeErr) errors.pincode = pincodeErr;

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

module.exports = {
  validateAddress,
  validateFullName,
  validateMobile,
  validateAlternateMobile,
  validateEmail,
  validateHouseNo,
  validateStreet,
  validateArea,
  validateLandmark,
  validateCity,
  validateDistrict,
  validateState,
  validateCountry,
  validatePincode,
};
