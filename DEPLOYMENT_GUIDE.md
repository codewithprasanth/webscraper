# 🚀 Deployment Guide - Render.com

## Overview

Deploying to Render.com requires special handling because:
- ✅ QR code scanning needs manual setup (first time only)
- ✅ Continuous running on free/paid tier
- ✅ Persistent storage for WhatsApp session
- ✅ Headless Puppeteer for server environment

---

## Step 1: Prepare Your Repository

### 1.1 Create `.env.production` file

```bash
# Copy and update for production
cp .env.example .env.production
```

**Edit .env.production:**
```env
WHATSAPP_PHONE_NUMBER=917200632341@c.us
TARGET_URL=https://roobai.com/
SCRAPE_INTERVAL=30000
MIN_DISCOUNT_PERCENTAGE=80
PRODUCT_KEYWORDS=
SERVER_PORT=10000
DEBUG_MODE=false
NODE_ENV=production
```

### 1.2 Update package.json scripts

Already included:
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node-dev src/index.ts"
  }
}
```

---

## Step 2: Handle WhatsApp QR Code (First Time Setup)

### Challenge: QR Code Scanning

Since Render is headless, you can't display QR codes in terminal. Solution: **Scan locally, then upload session**.

### Process:

**Option A: Scan Locally (Recommended)**

1. **Scan QR code on your local machine:**
   ```bash
   npm run dev
   ```
   - This will display QR code in terminal
   - Scan with WhatsApp phone
   - Wait for "✓ WhatsApp client is ready!" message

2. **Save the authentication session:**
   ```bash
   # The .wwebjs_auth folder is created after scanning
   # This folder contains your WhatsApp session
   ls -la .wwebjs_auth/
   ```

3. **Commit session to git (or manually upload to Render)**
   ```bash
   git add .wwebjs_auth/
   git commit -m "Add WhatsApp session"
   git push
   ```

4. **Deploy to Render:**
   - Push to GitHub
   - Render will automatically deploy
   - Your session will be available on the server

**Option B: Scan on Render (Advanced)**

1. Deploy code without session
2. SSH into Render instance
3. Run scraper and scan QR code via SSH terminal
4. Session will be saved

---

## Step 3: Deploy to Render.com

### 3.1 Connect GitHub Repository

1. Go to [render.com](https://render.com)
2. Click **New +** → **Web Service**
3. Connect your GitHub account
4. Select the repository
5. Fill in details:
   - **Name**: `roobai-whatsapp-scraper`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Plan**: Free (or Pro for better performance)

### 3.2 Set Environment Variables

In Render dashboard → Environment:

```
WHATSAPP_PHONE_NUMBER=917200632341@c.us
TARGET_URL=https://roobai.com/
SCRAPE_INTERVAL=30000
MIN_DISCOUNT_PERCENTAGE=80
PRODUCT_KEYWORDS=
SERVER_PORT=10000
DEBUG_MODE=false
NODE_ENV=production
```

### 3.3 Configure Persistent Storage

Render stores files in memory by default (lost on restart). For WhatsApp session:

1. Go to **Disks** tab
2. Add a disk:
   - **Mount Path**: `/var/lib/roobai`
   - **Size**: 1 GB

3. Update `.wwebjs_auth` path in code:
   ```typescript
   authStrategy: new LocalAuth({
     clientType: 'playwright',
     dataPath: '/var/lib/roobai/.wwebjs_auth'
   })
   ```

---

## Step 4: Update Code for Production

### Update [src/main.ts](src/main.ts):

```typescript
import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { config } from './config';
import * as fs from 'fs';
import * as path from 'path';

const initWhatsapp = async (): Promise<Client> => {
  // Use persistent storage path on Render
  const authPath = process.env.NODE_ENV === 'production'
    ? '/var/lib/roobai/.wwebjs_auth'
    : './.wwebjs_auth';

  const whatsappClient = new Client({
    authStrategy: new LocalAuth({
      clientType: 'playwright',
      dataPath: authPath,
    }),
  });

  // QR Code event
  whatsappClient.on('qr', (qr: string) => {
    console.log('\n========================================');
    console.log('QR CODE RECEIVED - Scan with WhatsApp');
    console.log('========================================\n');
    
    qrcode.generate(qr, { small: true });
    
    // Also save QR to file for debugging
    if (process.env.NODE_ENV === 'production') {
      const qrPath = path.join('/var/lib/roobai', 'qr_code.txt');
      fs.writeFileSync(qrPath, qr);
      console.log(`QR Code saved to: ${qrPath}`);
    }
  });

  // ... rest of the code
};
```

---

## Step 5: Monitor & Debug

### Check Logs on Render

1. Go to Render dashboard
2. Click your service
3. View **Logs** tab
4. Enable **DEBUG_MODE=true** to see detailed logs

### Health Check Endpoint

Your service has a health endpoint:
```bash
curl https://your-render-url.onrender.com/status
```

Response:
```json
{
  "status": "UP",
  "timestamp": "...",
  "config": {...}
}
```

---

## Step 6: Continuous Running Setup

### Free Tier (Will Sleep)

Render free tier suspends web services after 15 minutes of inactivity.

**Solution**: Use a cron service to keep it alive:
- [https://uptimerobot.com](https://uptimerobot.com) (free)
- Set to ping `/status` endpoint every 10 minutes

### Paid Tier

Upgrade to **Starter** or higher for always-on service.

---

## Troubleshooting

### Issue: "No LID for user"

**Cause**: Phone number format is wrong

**Solution**:
```env
# Format: CountryCode + Number (no +, no spaces)
# ✅ Correct
WHATSAPP_PHONE_NUMBER=917200632341@c.us
# ❌ Wrong
WHATSAPP_PHONE_NUMBER=+91-7200-632341@c.us
```

### Issue: Session Lost After Restart

**Cause**: No persistent storage configured

**Solution**:
- Add Disk to Render (1 GB mount at `/var/lib/roobai`)
- Ensure code uses correct path
- QR code will only show once; keep session saved

### Issue: Puppeteer Fails on Linux

**Cause**: Missing dependencies

**Solution**: Update `package.json` to include:
```json
{
  "scripts": {
    "build": "tsc && npm list puppeteer"
  }
}
```

---

## Complete Deployment Checklist

- [ ] Local QR code scan complete (`.wwebjs_auth` folder created)
- [ ] `.env.production` file created with correct values
- [ ] GitHub repository prepared
- [ ] Render account created (render.com)
- [ ] Web service connected to GitHub
- [ ] Environment variables set in Render
- [ ] Persistent disk added (if needed)
- [ ] Build Command: `npm install && npm run build`
- [ ] Start Command: `npm run start`
- [ ] First deployment successful
- [ ] Health endpoint responding (/status)
- [ ] WhatsApp notifications being sent
- [ ] Uptime monitor configured (if free tier)

---

## File Structure for Deployment

```
your-repo/
├── src/
│   ├── index.ts
│   ├── main.ts
│   ├── scraper.ts
│   └── config.ts
├── .wwebjs_auth/          ← WhatsApp session (after QR scan)
├── package.json
├── tsconfig.json
├── Procfile               ← For Render
├── render.yaml            ← For Render
├── .env.production        ← Production config
└── .renderignore
```

---

## Cost Estimate

| Plan | Price | Features |
|------|-------|----------|
| **Free** | $0 | 750 hours/month (enough for always-on), sleeps after 15 min inactivity |
| **Starter** | $7/month | Always-on, no sleep, 100 GB bandwidth |
| **Standard** | $25/month | Higher specs, priority support |

---

## Environment Variables Reference

| Variable | Example | Purpose |
|----------|---------|---------|
| NODE_ENV | production | Node environment mode |
| WHATSAPP_PHONE_NUMBER | 917200632341@c.us | Your WhatsApp number |
| MIN_DISCOUNT_PERCENTAGE | 80 | Minimum discount filter |
| PRODUCT_KEYWORDS | mouse,laptop | Keywords filter (comma-separated) |
| SCRAPE_INTERVAL | 30000 | Scrape frequency (ms) |
| SERVER_PORT | 10000 | API port (Render assigns this) |
| DEBUG_MODE | false | Enable detailed logging |

---

## Quick Start Commands

**Local setup:**
```bash
npm install
cp .env.example .env
npm run dev
```

**Build for production:**
```bash
npm run build
```

**Test production locally:**
```bash
npm run start
```

---

## Support & Resources

- **Render Docs**: https://render.com/docs
- **WhatsApp Web.js**: https://github.com/pedroslopez/whatsapp-web.js
- **Puppeteer**: https://pptr.dev/
- **Node.js on Render**: https://render.com/docs/deploy-node-express-app

---

## Next Steps

1. Prepare repository (follow Step 1)
2. Scan QR code locally (Step 2)
3. Create Render account and connect GitHub
4. Set environment variables
5. Monitor first deployment
6. Configure uptime monitor (if free tier)

**You're ready to deploy!** 🚀
