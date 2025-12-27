import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // WhatsApp Configuration
  WHATSAPP_PHONE_NUMBER: process.env.WHATSAPP_PHONE_NUMBER || '917200632341@c.us',
  WHATSAPP_NOTIFICATION_START: process.env.WHATSAPP_NOTIFICATION_START === 'true',
  
  // Scraper Configuration
  TARGET_URL: process.env.TARGET_URL || 'https://roobai.com/',
  SCRAPE_INTERVAL: parseInt(process.env.SCRAPE_INTERVAL || '30000'), // 30 seconds in ms
  
  // Filter Configuration
  MIN_DISCOUNT_PERCENTAGE: parseInt(process.env.MIN_DISCOUNT_PERCENTAGE || '80'),
  PRODUCT_KEYWORDS: (process.env.PRODUCT_KEYWORDS || '')
    .split(',')
    .map(k => k.trim())
    .filter(k => k.length > 0),  // Remove empty strings
  
  // Server Configuration
  SERVER_PORT: parseInt(process.env.SERVER_PORT || '8080'),
  
  // Logging
  DEBUG_MODE: process.env.DEBUG_MODE === 'true',
};

export default config;
