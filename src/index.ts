import initWhatsapp, { currentQRImage } from './main';
import scrap from './scraper';
import express, { Request, Response } from 'express';
import QRCode from 'qrcode';
import { config } from './config';

const app = express();

// QR Code endpoint (production only - for Render deployment)
if (process.env.NODE_ENV === 'production') {
  app.get('/qr', async (req: Request, res: Response) => {
    if (currentQRImage) {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>WhatsApp Scraper - QR Code</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
              text-align: center;
              max-width: 500px;
            }
            h1 {
              color: #333;
              margin-bottom: 10px;
            }
            p {
              color: #666;
              font-size: 14px;
            }
            img {
              width: 100%;
              max-width: 400px;
              height: auto;
              margin: 20px 0;
              border: 2px solid #667eea;
              border-radius: 5px;
            }
            .instructions {
              background: #f0f0f0;
              padding: 15px;
              border-radius: 5px;
              margin-top: 20px;
              text-align: left;
              font-size: 13px;
            }
            .instructions ol {
              margin: 10px 0;
              padding-left: 20px;
            }
            .instructions li {
              margin: 8px 0;
            }
            .status {
              margin-top: 20px;
              padding: 10px;
              background: #e3f2fd;
              border-left: 4px solid #2196f3;
              border-radius: 3px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>📱 WhatsApp Scraper Authentication</h1>
            <p>Scan this QR code with your WhatsApp phone to authenticate</p>
            <img src="${currentQRImage}" alt="WhatsApp QR Code" />
            <div class="instructions">
              <strong>How to scan:</strong>
              <ol>
                <li>Open WhatsApp on your phone</li>
                <li>Go to Settings → Linked Devices</li>
                <li>Tap "Link a Device"</li>
                <li>Point your camera at the QR code above</li>
                <li>Wait for the green checkmark</li>
              </ol>
            </div>
            <div class="status">
              <strong>Status:</strong> Waiting for authentication...
              <p>Once you scan the QR code, the scraper will automatically start.</p>
            </div>
          </div>
          <script>
            // Auto-refresh every 5 seconds to check status
            setTimeout(() => location.reload(), 5000);
          </script>
        </body>
        </html>
      `);
    } else {
      res.send(`
        <html>
        <body style="font-family: Arial; text-align: center; padding: 50px; background: #f5f5f5;">
          <h1>⏳ Waiting for QR Code...</h1>
          <p>The WhatsApp client is initializing.</p>
          <p>This page will automatically refresh in 3 seconds.</p>
          <script>
            setTimeout(() => location.reload(), 3000);
          </script>
        </body>
        </html>
      `);
    }
  });
}

// Health check endpoint
app.get('/status', (req: Request, res: Response) => {
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
