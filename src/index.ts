import initWhatsapp from './main';
import scrap from './scraper';
import express from 'express';
import { config } from './config';

const app = express();

// Health check endpoint
app.get('/status', (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    config: {
      targetUrl: config.TARGET_URL,
      scrapeInterval: config.SCRAPE_INTERVAL,
      minDiscountPercentage: config.MIN_DISCOUNT_PERCENTAGE,
      productKeywords: config.PRODUCT_KEYWORDS,
    },
  });
});

// Start server
const PORT = config.SERVER_PORT;
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`✓ Express server is listening on port ${PORT}`);
  console.log(`✓ Visit http://localhost:${PORT}/status for status`);
  console.log(`${'='.repeat(50)}\n`);
});

// Initialize and start scraper
(async () => {
  try {
    console.log('Starting Roobai WhatsApp Scraper...\n');

    const whatsappClient = await initWhatsapp();

    // Start scraping when WhatsApp client is ready
    whatsappClient.on('ready', async () => {
      console.log('\n========================================');
      console.log('Starting web scraper...');
      console.log('========================================\n');
      
      // Run scraper in background
      scrap(whatsappClient).catch((error) => {
        console.error('Fatal scraper error:', error);
        process.exit(1);
      });
    });
  } catch (error) {
    console.error('Failed to initialize WhatsApp client:', error);
    process.exit(1);
  }
})();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\nShutting down gracefully...');
  process.exit(0);
});
