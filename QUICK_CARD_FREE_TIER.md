# 🚀 FREE TIER QUICK CARD

## Copy & Paste Commands

```bash
# Step 1: Install & Scan QR
npm install
npm run dev
# Scan QR with phone → Ctrl+C

# Step 2: Commit Session
git add .wwebjs_auth/
git add .
git commit -m "Ready for Render: free tier deployment"
git push origin main

# Step 3: Deploy
# Go to: https://render.com
# Click: New Web Service
# Select: Your GitHub repo
# Build: npm install && npm run build
# Start: npm run start
# Then: Add env vars (see below)
# Click: Deploy
```

---

## Environment Variables (Copy & Paste)

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

**Replace phone number with your WhatsApp number**

---

## Timeline

| Step | Time | What |
|------|------|------|
| 1 | 5 min | npm install + npm run dev |
| 2 | 2 min | git commit + push |
| 3 | 15 min | Create & configure on Render |
| 4 | 5 min | Build & start service |
| **Total** | **~30 min** | **Live!** ✅ |

---

## Cost

| Item | Cost |
|------|------|
| Render | FREE |
| Session Storage (Git) | FREE |
| UptimeRobot | FREE |
| **TOTAL** | **$0/month** ✅ |

---

## Key Points

✅ Session stored in `.wwebjs_auth` folder (in git)
✅ No persistent disk needed
✅ Session restored automatically on deploy
✅ QR scanned only once locally
✅ Phone must be online when messages send

---

## If Something Goes Wrong

| Problem | Fix |
|---------|-----|
| Service won't start | Check logs, verify env vars |
| No messages sending | Enable DEBUG_MODE=true |
| Session lost | Session always in git, redeploy |
| Service sleeping | Add free UptimeRobot monitor |

---

## Documentation Quick Links

- **[FREE_TIER_SETUP.md](FREE_TIER_SETUP.md)** - How it works
- **[RENDER_CHECKLIST.md](RENDER_CHECKLIST.md)** - Step by step
- **[RENDER_QUICK_START.md](RENDER_QUICK_START.md)** - Reference
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Troubleshooting

---

## Remember

✅ Commit .wwebjs_auth to git
✅ All 8 environment variables
✅ Build + Start commands correct
✅ Phone stays online
✅ Use UptimeRobot for free tier

---

**That's it! You're ready to deploy!** 🚀
