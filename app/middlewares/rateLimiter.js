const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

// Logger for rate-limited requests
const logRateLimit = (req, type = 'general') => {
  const logMessage = `[${new Date().toISOString()}] ${type} rate limit exceeded for IP: ${req.ip} on ${req.originalUrl}\n`;
  fs.appendFile(path.join(__dirname, 'rate-limit.log'), logMessage, err => {
    if (err) console.error('Error logging rate limit:', err);
  });
};

// Allowlist IPs (e.g., for internal/dev)
const allowlist = ['127.0.0.1', '::1'];

// General Rate Limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 100,
  message: (req, res) => ({
    status: 429,
    error: 'Too Many Requests',
    message: `You have exceeded the 100 requests in 15 mins limit.`,
  }),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logRateLimit(req, 'general');
    res.status(options.statusCode).json(options.message(req, res));
  },
  skip: (req, res) => allowlist.includes(req.ip) || process.env.NODE_ENV === 'test',
});

// Login Rate Limiter (Stricter)
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 mins
  max: 5, // only 5 attempts allowed
  message: (req, res) => ({
    status: 429,
    error: 'Too Many Login Attempts',
    message: `Too many failed login attempts. Please try again after 5 minutes.`,
  }),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logRateLimit(req, 'login');
    res.status(options.statusCode).json(options.message(req, res));
  },
  skip: (req, res) => allowlist.includes(req.ip) || process.env.NODE_ENV === 'test',
});

module.exports = {
  generalLimiter,
  loginLimiter,
};
