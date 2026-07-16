// Currency-aware price formatting. Falls back to ₹ when the global
// settings have not loaded yet.
let currencySymbol = '₹';

export const setCurrency = (symbol) => {
  if (symbol) currencySymbol = symbol;
};

export const getCurrency = () => currencySymbol;

export const formatPrice = (amount, symbol) => {
  const sym = symbol || currencySymbol || '₹';
  const num = Number(amount) || 0;
  return `${sym} ${num.toLocaleString('en-IN')}`;
};
