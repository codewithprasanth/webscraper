# Roobai WhatsApp Scraper

An automated web scraper for **roobai.com** that monitors product offers and sends real-time notifications via WhatsApp. Built with Node.js, TypeScript, Puppeteer, and WhatsApp Web API.

## Features

- ✅ **Auto Web Scraping** - Monitors roobai.com every 30 seconds (configurable)
- ✅ **WhatsApp Notifications** - Sends product offers directly to your WhatsApp
- ✅ **Smart Filtering** - Filter by discount percentage and product keywords
- ✅ **Duplicate Prevention** - Remembers sent products to avoid duplicates
- ✅ **Fully Configurable** - Customize everything via `.env` file
- ✅ **Health Check API** - Express server with `/status` endpoint
- ✅ **Error Handling** - Robust error handling with automatic reconnection
- ✅ **TypeScript** - Full type safety and IDE support

## Prerequisites

- **Node.js** v14 or higher
- **npm** (comes with Node.js)
- **WhatsApp Account** with active mobile device
- **Internet Connection**

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Environment Configuration

Copy the example env file and customize it:

```bash
cp .env.example .env
```

### 3. Edit `.env` File

```env
# WhatsApp Configuration
WHATSAPP_PHONE_NUMBER=917200632341@c.us

# Scraper Configuration
TARGET_URL=https://roobai.com/
SCRAPE_INTERVAL=30000

# Filter Configuration
MIN_DISCOUNT_PERCENTAGE=80
PRODUCT_KEYWORDS=mouse,laptop,monitor

# Server Configuration
SERVER_PORT=8080

# Logging
DEBUG_MODE=false
```

## Configuration Guide

### WHATSAPP_PHONE_NUMBER
- **Format**: `CountryCode + PhoneNumber + @c.us`
- **No spaces, hyphens, or '+' symbol**
- **Examples**:
  - 🇮🇳 India: `917200632341@c.us` (from +91 7200632341)
  - 🇺🇸 USA: `12025551234@c.us` (from +1 202-555-1234)
  - 🇬🇧 UK: `442071838750@c.us` (from +44 20 7183 8750)

### MIN_DISCOUNT_PERCENTAGE
- Minimum discount % to trigger notification
- Default: `80` (80% off)
- Set to `0` to notify all products matching keywords

### PRODUCT_KEYWORDS
- Comma-separated product keywords
- Case-insensitive matching
- Products with these keywords will trigger notifications regardless of discount
- Example: `mouse,laptop,monitor,camera,headphone`

### SCRAPE_INTERVAL
- Time between scrapes in milliseconds
- `30000` = 30 seconds
- `60000` = 1 minute
- Recommended: 30000-60000 to avoid rate limiting

### DEBUG_MODE
- Set to `true` for detailed logging
- Helpful for troubleshooting

## Usage

### Development Mode (with hot reload)

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

### Server Health Check

While running, check server status:

```bash
curl http://localhost:8080/status
```

Response:
```json
{
  "status": "UP",
  "timestamp": "2025-12-26T10:30:00.000Z",
  "config": {
    "targetUrl": "https://roobai.com/",
    "scrapeInterval": 30000,
    "minDiscountPercentage": 80,
    "productKeywords": ["mouse", "laptop", "monitor"]
  }
}
```

## First Time Setup

1. **Run the application**
   ```bash
   npm run dev
   ```

2. **Scan QR Code**
   - A QR code will appear in the terminal
   - Open WhatsApp on your phone
   - Go to: **Settings → Linked Devices → Link a Device**
   - Scan the QR code with your phone camera

3. **Verify Connection**
   - You'll see: `✓ WhatsApp client is ready!`
   - A test message will be sent to your configured number

4. **Monitor Offers**
   - Application starts scraping roobai.com
   - Matching offers will be sent via WhatsApp in real-time

## Project Structure

```
├── src/
│   ├── index.ts          # Main entry point, Express server setup
│   ├── main.ts           # WhatsApp client initialization
│   ├── scraper.ts        # Web scraper with Puppeteer
│   └── config.ts         # Configuration management
├── dist/                 # Compiled JavaScript (auto-generated)
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── .env.example          # Example environment variables
├── .env                  # Your actual config (NOT in git)
└── README.md             # This file
```

## How It Works

### Architecture Flow

```
┌─────────────────┐
│  index.ts       │ Main entry point
│  (Express)      │
└────────┬────────┘
         │
         ├─── initWhatsapp() ──────► main.ts
         │                          WhatsApp client
         │                          QR authentication
         │
         └─── scrap() ──────► scraper.ts
                             ├─ Launches Puppeteer
                             ├─ Visits roobai.com
                             ├─ Extracts products
                             ├─ Filters by rules
                             └─ Sends WhatsApp messages
```

### Scraping Process

1. **Page Load** - Opens roobai.com using Puppeteer
2. **Extract** - Reads product info from HTML elements
3. **Filter** - Applies discount & keyword filters
4. **Deduplicate** - Checks if product already sent
5. **Notify** - Sends WhatsApp message if new
6. **Reload** - Waits and repeats (every 30s)

### Product Information Extracted

- 📦 Product Title
- 💰 Current Price (MRP)
- 🏷️ Offer Price
- 📊 Discount Percentage
- 🔗 Product URL
- 🖼️ Product Image URL

## Message Format

Products matching your filters are sent in this format:

```
📦 *PRODUCT OFFER DETECTED*

*Title:* Gaming Mouse RGB Pro
*Offer Price:* ₹499
*MRP Price:* ₹2499
*Discount:* 80%

🔗 *URL:* https://roobai.com/product/...
🖼️ *Image:* https://...
```

## Troubleshooting

### ❌ QR Code Not Appearing

**Solution:**
- Make sure WhatsApp is logged out on your browser
- Clear browser cache: `rm -rf .wwebjs_auth`
- Try again with `npm run dev`

### ❌ "No LID for user" Error

**Solution:**
- Verify phone number format is correct (no +, no spaces)
- Ensure the contact has WhatsApp installed
- Add the number to your WhatsApp contacts first

### ❌ Products Not Scraping

**Possible causes:**
- roobai.com website structure changed
- DOM class names changed (check website)
- Network timeout (try increasing timeout in scraper.ts)

**Debug it:**
- Set `DEBUG_MODE=true` in `.env`
- Check console logs for exact errors

### ❌ WhatsApp Messages Not Sending

**Solution:**
- Verify `WHATSAPP_PHONE_NUMBER` in `.env`
- Keep your phone with WhatsApp connected to internet
- Don't log out from linked device

## Terminal Commands Reference

```bash
# Install dependencies
npm install

# Development with hot reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Run compiled app
npm start

# Check server status
curl http://localhost:8080/status
```

## Advanced Configuration

### Send to WhatsApp Group Instead

Replace phone number with group ID:

```env
WHATSAPP_PHONE_NUMBER=GROUPID@g.us
```

### Scrape Different Website

```env
TARGET_URL=https://another-ecommerce-site.com/
```

### Very High Discount Only

```env
MIN_DISCOUNT_PERCENTAGE=90
PRODUCT_KEYWORDS=
```

### Multiple Specific Products

```env
PRODUCT_KEYWORDS=iphone,samsung,oneplus,motorola
MIN_DISCOUNT_PERCENTAGE=50
```

## Important Notes

⚠️ **Legal Disclaimer**
- Respect website's `robots.txt` and Terms of Service
- Don't overload servers with too frequent requests
- Use reasonable scrape intervals (30s+)
- Some websites may block automated access

⚠️ **WhatsApp Terms**
- This tool uses WhatsApp Web, which may violate their ToS
- Use at your own risk
- Account may be banned if detected

⚠️ **Session Management**
- Authentication stored in `.wwebjs_auth/` folder
- Keep this folder safe and backed up
- Delete it to force re-authentication

## Dependencies

| Package | Purpose |
|---------|---------|
| `whatsapp-web.js` | WhatsApp Web client |
| `puppeteer` | Web scraping browser automation |
| `express` | HTTP server for health checks |
| `typescript` | Type-safe JavaScript |
| `ts-node-dev` | Development with hot reload |
| `qrcode-terminal` | QR code display in terminal |
| `dotenv` | Environment variable management |

## API Endpoints

### GET /status

Returns current application status and configuration:

```bash
curl http://localhost:8080/status
```

Response:
```json
{
  "status": "UP",
  "timestamp": "2025-12-26T10:30:00.000Z",
  "config": {
    "targetUrl": "https://roobai.com/",
    "scrapeInterval": 30000,
    "minDiscountPercentage": 80,
    "productKeywords": ["mouse", "laptop", "monitor"]
  }
}
```

## Common Customizations

### Change Scrape Frequency

In `.env`:
```env
# Every 1 minute
SCRAPE_INTERVAL=60000

# Every 2 minutes
SCRAPE_INTERVAL=120000
```

### Add More Product Keywords

```env
PRODUCT_KEYWORDS=mouse,keyboard,monitor,headphone,charger,cable,hdmi
```

### Disable Startup Message

```env
WHATSAPP_NOTIFICATION_START=false
```

## Debugging Tips

1. **Enable debug mode**: `DEBUG_MODE=true`
2. **Check console output** for error details
3. **Verify network**: Make sure roobai.com is accessible
4. **Test WhatsApp**: Send manual message first
5. **Check filters**: May be too restrictive

## License

MIT - Feel free to use, modify, and distribute

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review `.env` configuration
3. Enable `DEBUG_MODE=true` to see detailed logs
4. Check roobai.com website structure (may have changed)
