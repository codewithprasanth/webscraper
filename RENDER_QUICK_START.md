# 🚀 Render.com Deployment - Quick Reference

## The Challenge
- ✅ **QR Code Scanning**: Must be done locally (headless server can't display QR)
- ✅ **Continuous Running**: Render free tier sleeps after 15 minutes inactivity
- ✅ **Session Persistence**: WhatsApp session must be saved between restarts
- ✅ **Headless Puppeteer**: Needs proper Linux configuration

## The Solution

### Phase 1: Local QR Scan (5 minutes)

```bash
# 1. Install dependencies
npm install

# 2. Scan QR code (displays in terminal)
npm run dev

# Wait for message: "✓ WhatsApp client is ready!"

# 3. Commit session to git
git add .wwebjs_auth/
git commit -m "Add WhatsApp session"
git push
```

### Phase 2: Deploy to Render (10 minutes)

1. **Create Render account**: https://render.com (free tier available)

2. **Connect GitHub**:
   - New Web Service → Select Repository

3. **Configure Build**:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start`

4. **Add Environment Variables**:
   ```
   WHATSAPP_PHONE_NUMBER=917200632341@c.us
   TARGET_URL=https://roobai.com/
   SCRAPE_INTERVAL=30000
   MIN_DISCOUNT_PERCENTAGE=80
   PRODUCT_KEYWORDS=
   SERVER_PORT=10000
   NODE_ENV=production
   DEBUG_MODE=false
   ```

5. **Deploy**: Click "Create Web Service"

**Note**: Free tier doesn't need persistent disk. Your session (`.wwebjs_auth`) is stored in git and restored on each deployment.

### Phase 3: Keep It Running (Optional for Free Tier)

Free tier suspends after 15 minutes of inactivity:

```bash
# Use UptimeRobot (free)
1. Go to https://uptimerobot.com
2. Create monitor for: https://your-service.onrender.com/status
3. Set interval: Every 10 minutes
```

---

## File Changes Made

✅ `src/main.ts` - Updated for persistent storage in `/var/lib/roobai`
✅ `Procfile` - Tells Render how to start your app
✅ `render.yaml` - Optional config file for Render
✅ `.env.production` - Production environment variables
✅ `DEPLOYMENT_GUIDE.md` - Detailed guide (read this for troubleshooting)
✅ `RENDER_CHECKLIST.md` - Step-by-step deployment checklist

---

## Key Environment Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `WHATSAPP_PHONE_NUMBER` | `917200632341@c.us` | Replace with your number |
| `NODE_ENV` | `production` | Must be production for Render |
| `SERVER_PORT` | `10000` | Render will assign this |
| `MIN_DISCOUNT_PERCENTAGE` | `80` | Only products ≥80% off |
| `PRODUCT_KEYWORDS` | `` | Comma-separated (optional) |
| `DEBUG_MODE` | `false` | Set true for detailed logs |

---

## Critical Success Factors

1. **✅ QR Code Scanned Locally First**
   - Cannot scan on headless server
   - Session saved in `.wwebjs_auth` folder
   - Folder must be committed to git or on persistent disk

2. **✅ Phone Number Format Correct**
   ```
   ✅ 917200632341@c.us
   ❌ +91-7200-632341@c.us
   ❌ +91 72006 32341
   ```

3. **✅ Persistent Disk Configured**
   - Mount at: `/var/lib/roobai`
   - Stores WhatsApp session between restarts
   - Survives weekly Render restarts

4. **✅ Phone Must Be Online**
   - WhatsApp Web requires phone to be connected
   - Phone must have WhatsApp running
   - Phone must be same phone that was scanned for QR

---

## Testing After Deployment

```bash
# 1. Check service status
curl https://your-service-name.onrender.com/status

# 2. Should return JSON like:
{
  "status": "UP",
  "timestamp": "2025-12-26T...",
  "config": { ... }
}

# 3. Check logs in Render dashboard for:
# ✓ WhatsApp client is ready!
# 📱 Scraper started
# Found product: [title]
```

---

## Troubleshooting Commands

```bash
# View recent logs (in Render dashboard)
# Look for these successful patterns:
- "✓ WhatsApp client is ready!" 
- "🔄 Scraper started"
- "📤 Checking products..."
- "💬 Sending message..."

# Common errors to look for:
- "auth_failure" → Rescan QR code
- "ECONNREFUSED" → Network issue
- "LID for user" → Wrong phone number format
```

---

## Estimated Costs

| Tier | Price | Ideal For |
|------|-------|-----------|
| **Free** | $0 | Testing (needs uptime monitor) |
| **Starter** | $7/month | Production always-on |
| **Standard** | $25/month | High traffic |

---

## Next Action

**Right now, do this:**

```bash
# 1. Ensure you have .wwebjs_auth folder with session
ls -la .wwebjs_auth/

# 2. Commit to git
git add .
git commit -m "Ready for Render deployment"
git push

# 3. Go to https://render.com and create account
# 4. Follow RENDER_CHECKLIST.md for deployment
```

---

## Questions?

- **Render Issues**: https://render.com/support
- **WhatsApp Web.js**: https://github.com/pedroslopez/whatsapp-web.js
- **Deployment Problems**: See DEPLOYMENT_GUIDE.md section "Troubleshooting"
