require('dotenv').config();

const config = {
  app: {
    name: process.env.APP_NAME || 'GUITMAN',
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 8080,
  },
  email: {
    service: process.env.EMAIL_SERVICE || 'Gmail',
    adminEmail: process.env.SUPPORT_EMAIL,
    adminPassword: process.env.APP_PASS,
    supportEmail: process.env.SUPPORT_EMAIL
  },
  contact: {
    phone: process.env.CONTACT_PHONE || '123-456-7890',
  },
  company: {
    address: process.env.COMPANY_ADDRESS || '123 Main St, City, Country',
  },
  social: {
    facebook: process.env.SOCIAL_FACEBOOK || '',
    twitter: process.env.SOCIAL_TWITTER || '',
    instagram: process.env.SOCIAL_INSTAGRAM || '',
    linkedin: process.env.SOCIAL_LINKEDIN  || '',
  },
};

module.exports = config;