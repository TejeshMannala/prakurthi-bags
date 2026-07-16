// Production-ready payment validation helpers.
// Sensitive data (CVV, OTP, PIN) is validated but NEVER stored.

const luhnCheck = (number) => {
  const digits = String(number).replace(/\D/g, '');
  if (digits.length !== 16) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
};

const detectCardBrand = (number) => {
  const digits = String(number).replace(/\D/g, '');
  if (/^4/.test(digits)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'MasterCard';
  if (/^3[47]/.test(digits)) return 'Amex';
  if (/^6(011|5)/.test(digits)) return 'Discover';
  if (/^(508|60|65|81|82)/.test(digits)) return 'Rupay';
  return 'Unknown';
};

const validateCardNumber = (value) => {
  if (!value) return 'Card number is required.';
  const digits = String(value).replace(/\D/g, '');
  if (digits.length !== 16) return 'Card number must be 16 digits.';
  if (!luhnCheck(digits)) return 'Invalid card number.';
  return null;
};

const validateCardHolder = (value) => {
  if (!value || !value.trim()) return 'Card holder name is required.';
  if (value.trim().length < 3) return 'Card holder name is too short.';
  if (!/^[A-Za-z\s.]+$/.test(value.trim())) return 'Card holder name must contain only letters and spaces.';
  return null;
};

const validateExpiry = (value) => {
  if (!value) return 'Expiry date is required.';
  const match = /^(\d{2})\/(\d{2})$/.exec(value.trim());
  if (!match) return 'Use MM/YY format.';
  const month = parseInt(match[1], 10);
  const year = 2000 + parseInt(match[2], 10);
  if (month < 1 || month > 12) return 'Invalid month.';
  const now = new Date();
  const expiry = new Date(year, month, 0, 23, 59, 59);
  if (expiry < now) return 'Card has expired.';
  return null;
};

const validateCVV = (value, brand = 'Unknown') => {
  if (!value) return 'CVV is required.';
  const digits = String(value).replace(/\D/g, '');
  const expected = brand === 'Amex' ? 4 : 3;
  if (digits.length !== expected) return `CVV must be ${expected} digits.`;
  return null;
};

const validateUPI = (value) => {
  if (!value) return 'UPI ID is required.';
  const v = value.trim().toLowerCase();
  if (!/^[a-zA-Z0-9.\-_]+@[a-zA-Z]{2,}$/.test(v)) return 'Invalid UPI ID (e.g. name@ybl).';
  return null;
};

const validateMobile = (value) => {
  if (!value) return 'Mobile number is required.';
  const digits = String(value).replace(/\D/g, '');
  if (digits.length !== 10) return 'Mobile number must be 10 digits.';
  if (!/^[6-9]/.test(digits)) return 'Invalid mobile number.';
  return null;
};

// Validates the payment object for a given method. Returns { valid, error }.
const validatePayment = (method, payment = {}) => {
  const cardMethods = ['Credit Card', 'Debit Card'];
  if (cardMethods.includes(method)) {
    const numErr = validateCardNumber(payment.cardNumber);
    if (numErr) return { valid: false, error: numErr };
    const holderErr = validateCardHolder(payment.cardHolder);
    if (holderErr) return { valid: false, error: holderErr };
    const expErr = validateExpiry(payment.expiry);
    if (expErr) return { valid: false, error: expErr };
    const cvvErr = validateCVV(payment.cvv, detectCardBrand(payment.cardNumber));
    if (cvvErr) return { valid: false, error: cvvErr };
    return { valid: true };
  }
  if (method === 'UPI' || method === 'Google Pay' || method === 'PhonePe' || method === 'Paytm' || method === 'Amazon Pay') {
    const upiErr = validateUPI(payment.upiId);
    if (upiErr) return { valid: false, error: upiErr };
    return { valid: true };
  }
  if (method === 'NetBanking') {
    if (!payment.bank) return { valid: false, error: 'Please select a bank.' };
    return { valid: true };
  }
  if (method === 'COD') {
    return { valid: true };
  }
  return { valid: false, error: 'Unsupported payment method.' };
};

module.exports = {
  luhnCheck,
  detectCardBrand,
  validateCardNumber,
  validateCardHolder,
  validateExpiry,
  validateCVV,
  validateUPI,
  validateMobile,
  validatePayment,
};
