# Render.com Deployment Checklist

## ✅ Pre-Deployment (Local)

- [ ] **QR Code Scanning**
  ```bash
  npm install
  npm run dev
  ```
  - Wait for QR code display in terminal
  - Scan with WhatsApp phone app
  - Verify message: "✓ WhatsApp client is ready!"
  - This creates `.wwebjs_auth` folder with your session

- [ ] **Commit Session to Git**
  ```bash
  git add .wwebjs_auth/
  git commit -m "Add WhatsApp session from QR scan"
  git push origin main
  ```

- [ ] **Environment File**
  - Update `.env.production` with your phone number
  - Update `PRODUCT_KEYWORDS` if needed
  - Ensure `MIN_DISCOUNT_PERCENTAGE=80`

---

## 🚀 Deployment Steps (Render.com)

### Step 1: Connect Repository
- [ ] Go to https://dashboard.render.com
- [ ] Click **New +** → **Web Service**
- [ ] Connect GitHub account (if not already connected)
- [ ] Select your repository

### Step 2: Configure Service
- [ ] **Name**: `roobai-whatsapp-scraper`
- [ ] **Environment**: `Node`
- [ ] **Build Command**: `npm install && npm run build`
- [ ] **Start Command**: `npm run start`
- [ ] **Plan**: Select tier (Free or Starter+)

### Step 3: Set Environment Variables
In Render Dashboard → Environment Tab:

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

### Step 4: Configure Persistent Storage
- [ ] Go to **Disks** tab in your service settings
- [ ] Click **Add Disk**
  - **Mount Path**: `/var/lib/roobai`
  - **Size**: 1 GB (minimum, for session storage)
- [ ] Click **Save**

### Step 5: Deploy
- [ ] Click **Create Web Service**
- [ ] Wait for build to complete (2-5 minutes)
- [ ] Check **Logs** for "✓ WhatsApp client is ready!"

---

## 📊 Monitoring & Verification

### Verify Deployment Success

```bash
# Check service status
curl https://your-service-name.onrender.com/status

# Expected response:
{
  "status": "UP",
  "timestamp": "2025-12-26T...",
  "config": {
    "whatsappPhone": "917200632341@c.us",
    "minDiscount": 80,
    ...
  }
}
```

### View Real-Time Logs
1. Go to Render Dashboard
2. Click your service
3. View **Logs** tab
4. Look for messages like:
   - ✓ WhatsApp client is ready!
   - Product found: [title]
   - Message sent to [phone]

### Enable Debug Mode (Optional)
To see detailed logs:
1. Set `DEBUG_MODE=true` in environment variables
2. Restart service
3. Check logs again

---

## 🔄 Keep Service Alive (Free Tier Only)

Render's free tier suspends services after 15 minutes of inactivity.

### Solution: Use Uptime Monitor

1. Go to https://uptimerobot.com (free)
2. Create account
3. Add monitor:
   - **Monitor type**: HTTP(s)
   - **URL**: `https://your-service-name.onrender.com/status`
   - **Interval**: Every 10 minutes
4. This will ping your service every 10 minutes to keep it alive

---

## 🐛 Troubleshooting

### Issue: Service keeps restarting

**Solution**: Check logs for errors
```bash
# Look for patterns in logs
- "WhatsApp client is ready!" (good)
- "auth_failure" (session expired, need new QR)
- "ECONNREFUSED" (network issue)
```

### Issue: "UnknownError - Invalid LID for user"

**Cause**: Phone number format is wrong

**Fix**: 
```
✅ CORRECT: 917200632341@c.us
❌ WRONG: +91-7200-632341
❌ WRONG: 91 7200 632341
```

### Issue: WhatsApp messages not being sent

**Check**:
1. Is WhatsApp client ready? (check logs)
2. Is scraper finding products? (enable DEBUG_MODE)
3. Are products meeting discount threshold? (check MIN_DISCOUNT_PERCENTAGE)
4. Is phone number reachable? (test manually)

### Issue: Service runs for 10 minutes then stops

**Cause**: Free tier with no uptime monitor

**Solution**: Add uptime monitor (see "Keep Service Alive" section)

---

## 📝 Important Notes

- **First QR scan is critical**: Must be done locally before deployment
- **Session persistence**: `.wwebjs_auth` folder must be in git or mounted disk
- **Phone must be online**: WhatsApp Web requires phone to be online
- **Messages are per-minute**: Avoid too many products or add delays
- **Render restarts weekly**: Sessions stored in disk will persist

---

## 🎯 Next Steps

1. ✅ Complete local QR scan
2. ✅ Commit `.wwebjs_auth` to git
3. ✅ Create Render account
4. ✅ Deploy following steps above
5. ✅ Verify with `/status` endpoint
6. ✅ Monitor logs for first 24 hours
7. ✅ Set up uptime monitor (if free tier)
8. ✅ Configure PRODUCT_KEYWORDS for your needs

---

## 📞 Support & Resources

- **Render Docs**: https://render.com/docs
- **WhatsApp Web.js Issues**: https://github.com/pedroslopez/whatsapp-web.js/discussions
- **Puppeteer on Linux**: https://pptr.dev/troubleshooting#running-puppeteer-on-linux
- **Node.js Best Practices**: https://nodejs.org/en/docs/guides/nodejs-application-architecture/

---

## Version Info

- **Project**: roobai-whatsapp-scraper
- **Node.js**: 14+ (Render supports 16, 18, 20)
- **Updated**: 2025-12-26
- **Status**: Production Ready
