# Quick Start Guide - Roobai WhatsApp Scraper

## 5-Minute Setup

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Create Configuration File
```bash
cp .env.example .env
```

### Step 3: Edit `.env` File
Open `.env` and update:
- **WHATSAPP_PHONE_NUMBER** - Your WhatsApp number (format: 91XXXXXXXXXX@c.us for India)
- **MIN_DISCOUNT_PERCENTAGE** - Minimum discount to trigger (default: 80)
- **PRODUCT_KEYWORDS** - Products to monitor (default: mouse,laptop,monitor)

### Step 4: Run Application
```bash
npm run dev
```

### Step 5: Scan QR Code
- A QR code will appear in terminal
- Open WhatsApp on phone → Settings → Linked Devices
- Scan the QR code

### Step 6: Done! ✓
- App will send a test message
- Scraper will start monitoring roobai.com
- You'll receive offers via WhatsApp

## Phone Number Format Examples

| Country | Format | Example |
|---------|--------|---------|
| 🇮🇳 India | 91 + number | 917200632341@c.us |
| 🇺🇸 USA | 1 + number | 12025551234@c.us |
| 🇬🇧 UK | 44 + number | 442071838750@c.us |
| 🇦🇺 Australia | 61 + number | 61412345678@c.us |

**Rule**: Country code (without +) + Phone number (without 0) + @c.us

## Common Configurations

### High Discount Only (90%+)
```env
MIN_DISCOUNT_PERCENTAGE=90
PRODUCT_KEYWORDS=
```

### Multiple Product Types
```env
MIN_DISCOUNT_PERCENTAGE=50
PRODUCT_KEYWORDS=mouse,keyboard,monitor,headphone,laptop,camera
```

### Check Every Minute
```env
SCRAPE_INTERVAL=60000
```

### Enable Debug Logging
```env
DEBUG_MODE=true
```

## Verify It's Working

Check server status:
```bash
curl http://localhost:8080/status
```

Should return:
```json
{
  "status": "UP",
  "timestamp": "...",
  "config": {...}
}
```

## Troubleshooting

**QR Code not showing?**
```bash
rm -rf .wwebjs_auth
npm run dev
```

**Not getting offers?**
- Check phone number format
- Verify PRODUCT_KEYWORDS
- Set `DEBUG_MODE=true` to see logs

**Messages not sending?**
- Keep phone connected to internet
- Don't log out from linked device
- Verify phone number in .env

## File Structure

```
project/
├── src/
│   ├── index.ts         ← Main entry point & Express server
│   ├── main.ts          ← WhatsApp client setup
│   ├── scraper.ts       ← Web scraper logic
│   └── config.ts        ← Configuration loader
├── .env                 ← Your settings (CREATE THIS)
├── .env.example         ← Template file
├── package.json         ← Dependencies
└── tsconfig.json        ← TypeScript settings
```

## Need More Help?

See **README.md** for:
- Detailed configuration guide
- Advanced customization
- Architecture explanation
- Legal disclaimer

---

**Ready to start?** Run `npm run dev` and scan that QR code! 🚀
