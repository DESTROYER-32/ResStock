const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env in project root if available
dotenv.config({ path: path.join(__dirname, '../.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

const config = {
  NODE_ENV,
  isProduction,
  PORT: parseInt(process.env.PORT || '5000', 10),
  JWT_SECRET: process.env.JWT_SECRET || 'restaurant-stock-secret-key-2026',

  // Production Admin Account Configuration
  ADMIN_USERNAME: (process.env.ADMIN_USERNAME || process.env.ADMIN_USER || 'admin').trim(),
  ADMIN_PASSWORD: (process.env.ADMIN_PASSWORD || (isProduction ? 'adminpassword' : 'admin123')).trim(),
  ADMIN_NAME: (process.env.ADMIN_NAME || (isProduction ? 'Restaurant General Manager' : 'Alex Vance (General Manager)')).trim(),

  // Demo / Sample Data Configuration
  ENABLE_DEMO_LOGINS: process.env.ENABLE_DEMO_LOGINS !== undefined
    ? process.env.ENABLE_DEMO_LOGINS === 'true'
    : !isProduction,

  SEED_DEMO_DATA: process.env.SEED_DEMO_DATA !== undefined
    ? process.env.SEED_DEMO_DATA === 'true'
    : !isProduction,

  DEFAULT_CURRENCY: process.env.DEFAULT_CURRENCY || '₹'
};

module.exports = config;
