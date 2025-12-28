import initWhatsapp, { currentQRImage } from './main';
import scrap from './scraper';
import express, { Request, Response } from 'express';
import QRCode from 'qrcode';
import { config } from './config';
import { getConfig, updateConfig, updateConfigBatch, resetConfig } from './configManager';

const app = express();

// Middleware
app.use(express.json());

// ==================== CONFIG API ENDPOINTS ====================

// GET current config
app.get('/api/config', (req: Request, res: Response) => {
  res.json({
    success: true,
    config: getConfig(),
    message: 'Current runtime configuration',
  });
});

// UPDATE single config value
// POST /api/config/update?key=MIN_DISCOUNT_PERCENTAGE&value=95
// or POST /api/config/update with body: { key: "MIN_DISCOUNT_PERCENTAGE", value: 95 }
app.post('/api/config/update', (req: Request, res: Response) => {
  try {
    let key: string;
    let value: any;

    // Support both query params and body
    if (req.body.key && req.body.value !== undefined) {
      key = req.body.key;
      value = req.body.value;
    } else if (req.query.key && req.query.value) {
      key = String(req.query.key);
      value = req.query.value;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Missing key or value parameter',
      });
    }

    const result = updateConfig(key as any, value);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      success: false,
      message: `Error updating config: ${errMsg}`,
    });
  }
});

// UPDATE multiple config values at once
// POST /api/config/batch with body:
// { "MIN_DISCOUNT_PERCENTAGE": 95, "SCRAPE_INTERVAL": 60000 }
app.post('/api/config/batch', (req: Request, res: Response) => {
  try {
    const result = updateConfigBatch(req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      success: false,
      message: `Error updating config: ${errMsg}`,
    });
  }
});

// RESET to environment config
app.post('/api/config/reset', (req: Request, res: Response) => {
  try {
    const config = resetConfig();
    res.json({
      success: true,
      message: 'Configuration reset to environment defaults',
      config,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      success: false,
      message: `Error resetting config: ${errMsg}`,
    });
  }
});

// CONFIG UI Dashboard
app.get('/config-dashboard', (req: Request, res: Response) => {
  const currentConfig = getConfig();
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Scraper Config Dashboard</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          border-radius: 10px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin-bottom: 10px;
        }
        .header p {
          opacity: 0.9;
          font-size: 14px;
        }
        .content {
          padding: 30px;
        }
        .config-section {
          margin-bottom: 25px;
        }
        .config-item {
          display: grid;
          grid-template-columns: 250px 1fr;
          gap: 15px;
          align-items: center;
          margin-bottom: 20px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 5px;
          border-left: 4px solid #667eea;
        }
        .config-label {
          font-weight: 600;
          color: #333;
          font-size: 14px;
        }
        .config-input {
          display: flex;
          gap: 10px;
        }
        input, textarea {
          flex: 1;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 5px;
          font-family: monospace;
          font-size: 13px;
        }
        input:focus, textarea:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        textarea {
          resize: vertical;
          min-height: 60px;
        }
        .button-group {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-top: 30px;
        }
        button {
          padding: 12px 25px;
          border: none;
          border-radius: 5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          font-size: 14px;
        }
        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        .btn-secondary {
          background: #e9ecef;
          color: #333;
        }
        .btn-secondary:hover {
          background: #dee2e6;
        }
        .status {
          margin-top: 20px;
          padding: 15px;
          border-radius: 5px;
          display: none;
        }
        .status.success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
          display: block;
        }
        .status.error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
          display: block;
        }
        .current-values {
          background: #f0f0f0;
          padding: 15px;
          border-radius: 5px;
          margin-top: 20px;
          font-size: 12px;
          font-family: monospace;
        }
        .current-values h3 {
          margin-bottom: 10px;
          font-size: 13px;
        }
        .info-box {
          background: #e7f3ff;
          border-left: 4px solid #2196f3;
          padding: 15px;
          margin-bottom: 20px;
          border-radius: 3px;
          font-size: 13px;
          color: #1976d2;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚙️ Scraper Configuration Dashboard</h1>
          <p>Dynamically update scraper settings in real-time</p>
        </div>
        <div class="content">
          <div class="info-box">
            <strong>ℹ️ Info:</strong> Changes apply to the next scraping cycle. No app restart needed!
          </div>

          <form id="configForm">
            <div class="config-section">
              <div class="config-item">
                <label class="config-label">Minimum Discount %</label>
                <div class="config-input">
                  <input type="number" id="discount" min="0" max="100" value="${currentConfig.MIN_DISCOUNT_PERCENTAGE}">
                </div>
              </div>

              <div class="config-item">
                <label class="config-label">Scrape Interval (ms)</label>
                <div class="config-input">
                  <input type="number" id="interval" min="5000" value="${currentConfig.SCRAPE_INTERVAL}">
                </div>
              </div>

              <div class="config-item">
                <label class="config-label">Product Keywords (comma-separated)</label>
                <div class="config-input">
                  <textarea id="keywords" placeholder="e.g., laptop, phone, tablet">${currentConfig.PRODUCT_KEYWORDS.join(', ')}</textarea>
                </div>
              </div>

              <div class="config-item">
                <label class="config-label">Target URL</label>
                <div class="config-input">
                  <input type="text" id="targetUrl" value="${currentConfig.TARGET_URL}">
                </div>
              </div>

              <div class="config-item">
                <label class="config-label">WhatsApp Phones (comma-separated)</label>
                <div class="config-input">
                  <textarea id="whatsappPhones" placeholder="e.g., 917200632341@c.us, 919999999999@c.us">${currentConfig.WHATSAPP_PHONE_NUMBERS.join(', ')}</textarea>
                </div>
              </div>

              <div class="config-item">
                <label class="config-label">Debug Mode</label>
                <div class="config-input">
                  <input type="checkbox" id="debugMode" ${currentConfig.DEBUG_MODE ? 'checked' : ''}>
                  <span style="color: #666; font-size: 12px;">Enable detailed logging</span>
                </div>
              </div>
            </div>

            <div class="button-group">
              <button type="button" class="btn-primary" onclick="updateAllConfig()">💾 Save All Changes</button>
              <button type="button" class="btn-secondary" onclick="resetConfig()">🔄 Reset to Defaults</button>
            </div>

            <div id="status" class="status"></div>

            <div class="current-values">
              <h3>📋 Live Config Values:</h3>
              <pre id="currentConfig">${JSON.stringify(currentConfig, null, 2)}</pre>
            </div>
          </form>
        </div>
      </div>

      <script>
        const showStatus = (message, isSuccess) => {
          const status = document.getElementById('status');
          status.textContent = message;
          status.className = 'status ' + (isSuccess ? 'success' : 'error');
          setTimeout(() => {
            status.className = 'status';
          }, 5000);
        };

        const updateAllConfig = async () => {
          const payload = {
            MIN_DISCOUNT_PERCENTAGE: parseInt(document.getElementById('discount').value),
            SCRAPE_INTERVAL: parseInt(document.getElementById('interval').value),
            PRODUCT_KEYWORDS: document.getElementById('keywords').value,
            TARGET_URL: document.getElementById('targetUrl').value,
            WHATSAPP_PHONE_NUMBERS: document.getElementById('whatsappPhones').value,
            DEBUG_MODE: document.getElementById('debugMode').checked,
          };

          try {
            const response = await fetch('/api/config/batch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });

            const result = await response.json();
            showStatus(result.message, result.success);

            if (result.success) {
              document.getElementById('currentConfig').textContent = JSON.stringify(result.config, null, 2);
            }
          } catch (err) {
            showStatus('Error: ' + err.message, false);
          }
        };

        const resetConfig = async () => {
          if (!confirm('Are you sure you want to reset to default values?')) return;

          try {
            const response = await fetch('/api/config/reset', { method: 'POST' });
            const result = await response.json();
            showStatus(result.message, result.success);

            if (result.success) {
              document.getElementById('currentConfig').textContent = JSON.stringify(result.config, null, 2);
              location.reload();
            }
          } catch (err) {
            showStatus('Error: ' + err.message, false);
          }
        };

        // Auto-refresh config values every 5 seconds
        setInterval(async () => {
          try {
            const response = await fetch('/api/config');
            const result = await response.json();
            document.getElementById('currentConfig').textContent = JSON.stringify(result.config, null, 2);
          } catch (err) {
            console.error('Failed to refresh config:', err);
          }
        }, 5000);
      </script>
    </body>
    </html>
  `);
});

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
