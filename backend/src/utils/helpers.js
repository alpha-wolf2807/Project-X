// utils/helpers.js
const crypto = require('crypto');

const generateOTP = (length = 6) => {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
};

const generateSecureToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
};

const calculateSavings = (mrp, price) => {
  const savings = mrp - price;
  const percent = Math.round((savings / mrp) * 100);
  return { savings, percent };
};

const paginationResponse = (data, total, page, limit) => ({
  data,
  pagination: {
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    pages: Math.ceil(total / limit),
    hasMore: page * limit < total,
  },
});

module.exports = { generateOTP, generateSecureToken, formatCurrency, calculateSavings, paginationResponse };
