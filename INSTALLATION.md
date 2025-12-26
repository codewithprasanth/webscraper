```
╔════════════════════════════════════════════════════════════════════════════╗
║                   🚀 ROOBAI WHATSAPP SCRAPER v1.0                         ║
║                                                                            ║
║    Automated Web Scraper for roobai.com with WhatsApp Notifications      ║
╚════════════════════════════════════════════════════════════════════════════╝

📦 WHAT'S INCLUDED
═══════════════════════════════════════════════════════════════════════════

✅ Auto Web Scraper        → Monitors roobai.com every 30 seconds (configurable)
✅ WhatsApp Integration    → Sends real-time offer notifications
✅ Smart Filtering         → Discount % + Product keywords
✅ Full Configuration      → Everything customizable via .env
✅ Error Handling          → Auto-reconnect on failures
✅ Health API              → Express /status endpoint
✅ Comprehensive Docs      → README + QUICK_START guides
✅ TypeScript              → Full type safety


📁 PROJECT STRUCTURE
═══════════════════════════════════════════════════════════════════════════

project/
│
├── 📂 src/
│   ├── index.ts           Main entry point & Express server
│   ├── main.ts            WhatsApp client initialization
│   ├── scraper.ts         Web scraper with Puppeteer
│   └── config.ts          Configuration management
│
├── 📄 .env.example        Configuration template (RENAME & EDIT THIS)
├── 📄 .env                Your actual config (create by copying .env.example)
├── 📄 README.md           Complete guide (50+ KB of docs)
├── 📄 QUICK_START.md      5-minute setup guide
├── 📄 PROJECT_SUMMARY.md  This summary
├── 📄 package.json        Dependencies (with puppeteer, express, etc.)
├── 📄 tsconfig.json       TypeScript configuration
└── 📄 .gitignore          Git ignore rules


🎯 QUICK START (3 STEPS)
═══════════════════════════════════════════════════════════════════════════

1️⃣  INSTALL
    $ npm install

2️⃣  CONFIGURE
    $ cp .env.example .env
    $ nano .env
    
    Edit these values:
    • WHATSAPP_PHONE_NUMBER = Your WhatsApp number (91XXXXXXXXXX@c.us)
    • MIN_DISCOUNT_PERCENTAGE = 80 (minimum discount to notify)
    • PRODUCT_KEYWORDS = mouse,laptop,monitor (what to watch)

3️⃣  RUN
    $ npm run dev
    
    Then scan the QR code with WhatsApp, and you're done! ✨


⚙️ CONFIGURATION GUIDE
═══════════════════════════════════════════════════════════════════════════

WHATSAPP_PHONE_NUMBER
  Format: CountryCode + Number + @c.us
  Examples:
    🇮🇳 India:  917200632341@c.us (from +91 7200632341)
    🇺🇸 USA:    12025551234@c.us   (from +1 202-555-1234)
    🇬🇧 UK:     442071838750@c.us  (from +44 20 7183 8750)

TARGET_URL
  Default: https://roobai.com/
  Can scrape any website with similar structure

SCRAPE_INTERVAL
  Default: 30000 (30 seconds)
  In milliseconds. Recommended: 30000-120000

MIN_DISCOUNT_PERCENTAGE
  Default: 80
  Only notify if discount >= this value

PRODUCT_KEYWORDS
  Default: mouse,laptop,monitor
  Comma-separated, case-insensitive matching

SERVER_PORT
  Default: 8080
  Port for health check API

DEBUG_MODE
  Default: false
  Set to true for detailed logging


🔍 HOW IT WORKS
═══════════════════════════════════════════════════════════════════════════

                         START
                          │
                          ▼
                   ┌──────────────┐
                   │ WhatsApp QR  │
                   │ Auth         │
                   └──────┬───────┘
                          │
                          ▼
                  ┌────────────────┐
                  │ Client Ready   │
                  │ Start Scraping │
                  └────────┬───────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
      ┌────────┐     ┌──────────┐    ┌─────────┐
      │ Load   │ ──→ │ Extract  │ ──→│ Filter  │
      │roobai  │     │ Products │    │ Products│
      └────────┘     └──────────┘    └────┬────┘
                                           │
                        ┌──────────────────┼──────────────────┐
                        │                  │                  │
                        ▼                  ▼                  ▼
                    ┌────────┐        ┌──────────┐      ┌──────────┐
                    │Discount│        │ Keyword  │      │  Already │
                    │>= MIN? │        │ Match?   │      │  Sent?   │
                    └────┬───┘        └────┬─────┘      └────┬─────┘
                         │                 │                 │
                     YES │             YES │             NO  │
                         └────────┬────────┘                 │
                                  │                          │
                                  ▼                          │
                         ┌─────────────────┐                │
                         │ Send WhatsApp   │◄───────────────┘
                         │ Message         │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ Wait (30s)      │
                         │ & Reload Page   │
                         └────────┬────────┘
                                  │
                                  └──→ Loop back to "Load roobai"


📊 FEATURES COMPARISON
═══════════════════════════════════════════════════════════════════════════

Feature                  Before          After
─────────────────────────────────────────────────────────────────────────
Web Scraping            ❌              ✅ Automated
Configuration           Hardcoded       ✅ .env file
Discount Filter         ❌              ✅ Configurable
Keyword Filter          ❌              ✅ Configurable
Error Handling          ❌              ✅ Auto-recovery
Memory Management       ❌              ✅ Proper cleanup
Health API              ❌              ✅ /status endpoint
Documentation           Basic           ✅ Comprehensive
Debug Mode              ❌              ✅ Detailed logs


📱 MESSAGE EXAMPLE
═══════════════════════════════════════════════════════════════════════════

When a matching product is found, you receive:

┌─────────────────────────────────────┐
│ 📦 *PRODUCT OFFER DETECTED*         │
│                                     │
│ *Title:* Gaming Mouse RGB Pro       │
│ *Offer Price:* ₹499                 │
│ *MRP Price:* ₹2499                  │
│ *Discount:* 80%                     │
│                                     │
│ 🔗 *URL:* https://roobai.com/...   │
│ 🖼️ *Image:* https://img.url...      │
└─────────────────────────────────────┘


🔧 COMMANDS
═══════════════════════════════════════════════════════════════════════════

npm install              Install all dependencies
npm run dev              Development mode (hot reload)
npm run build            Compile TypeScript to JavaScript
npm start                Production mode (run compiled code)
curl localhost:8080/status   Check server status


📁 FILE DESCRIPTIONS
═══════════════════════════════════════════════════════════════════════════

src/index.ts
  • Main application entry point
  • Express server setup
  • /status health endpoint
  • Orchestrates WhatsApp + Scraper

src/main.ts
  • WhatsApp Web client initialization
  • QR code authentication
  • Message event handlers
  • Error and disconnect handlers

src/scraper.ts
  • Puppeteer browser automation
  • Page navigation and DOM extraction
  • Product filtering logic
  • Deduplication system
  • Error handling and reconnection
  • WhatsApp message sending

src/config.ts
  • Configuration management
  • Loads environment variables from .env
  • Default values fallback
  • Centralized settings


📚 DOCUMENTATION FILES
═══════════════════════════════════════════════════════════════════════════

README.md
  → Complete comprehensive guide
  → Features, installation, configuration, troubleshooting
  → API documentation, advanced customization
  → ~3000 lines of detailed information

QUICK_START.md
  → Fast 5-minute setup guide
  → Essential configuration examples
  → Phone number format reference
  → Common configurations

PROJECT_SUMMARY.md
  → What was done and why
  → Before/after comparison
  → Key files explanation
  → Next steps for enhancement

This README (INSTALLATION.md)
  → Visual overview
  → Quick start instructions
  → Feature list
  → Architecture diagram


✨ KEY IMPROVEMENTS FROM ROOBAI-MAIN
═══════════════════════════════════════════════════════════════════════════

✅ Configuration System
   Before: Hardcoded phone number, discount, keywords
   After:  Fully configurable via .env file

✅ Error Handling
   Before: Crashes on errors
   After:  Graceful recovery, auto-reconnect

✅ Resource Management
   Before: Browser/page cleanup missing
   After:  Proper cleanup and memory management

✅ Documentation
   Before: Minimal comments
   After:  Comprehensive docs + guides

✅ Type Safety
   Before: Basic types
   After:  Full TypeScript with interfaces

✅ API Health Check
   Before: No status monitoring
   After:  /status endpoint with config info

✅ Message Formatting
   Before: Plain text
   After:  Formatted markdown with emojis

✅ Dependencies
   Before: Missing puppeteer in package.json
   After:  All dependencies properly defined


🚀 NEXT STEPS
═══════════════════════════════════════════════════════════════════════════

1. Copy .env.example to .env
2. Edit .env with your WhatsApp number
3. Run: npm install
4. Run: npm run dev
5. Scan QR code
6. Monitor roobai.com offers!


⚠️ IMPORTANT NOTES
═══════════════════════════════════════════════════════════════════════════

• Phone number format: 91XXXXXXXXXX@c.us (no +, no spaces)
• Keep WhatsApp logged in on your phone
• Don't log out from linked devices
• Respect website's ToS and robots.txt
• Use reasonable scrape intervals (30s+)
• This tool may violate WhatsApp's ToS - use at own risk


📊 DEPENDENCIES INCLUDED
═══════════════════════════════════════════════════════════════════════════

Production:
  • whatsapp-web.js     - WhatsApp Web client
  • puppeteer           - Browser automation
  • express             - HTTP server
  • qrcode-terminal     - QR code display
  • dotenv              - Environment variables

Development:
  • typescript          - Type safety
  • ts-node-dev         - Development with hot reload
  • @types/node         - Node.js types
  • @types/express      - Express types


═══════════════════════════════════════════════════════════════════════════

Ready to start? Run: npm run dev

For detailed help, see:
  • README.md for comprehensive guide
  • QUICK_START.md for 5-minute setup
  • PROJECT_SUMMARY.md for what changed

═══════════════════════════════════════════════════════════════════════════
```
