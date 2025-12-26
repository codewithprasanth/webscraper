# 🚀 RENDER.COM DEPLOYMENT QUICK START

## TL;DR - 3 Steps to Production

```bash
# Step 1: Scan QR Code Locally
npm install && npm run dev
# Scan with WhatsApp phone, wait for "ready" message

# Step 2: Save Session to Git
git add .wwebjs_auth/
git commit -m "Add WhatsApp session"
git push

# Step 3: Deploy to Render
# Go to https://render.com → New Web Service → Connect GitHub
# Build: npm install && npm run build
# Start: npm run start
# Add disk: /var/lib/roobai (1GB)
# Set env vars (see RENDER_CHECKLIST.md)
# Deploy!
```

**Total time**: 30 minutes from local setup to first message on Render

---

## Documentation Files (Read in This Order)

1. **RENDER_QUICK_START.md** ← Read first (5 min)
2. **RENDER_CHECKLIST.md** ← Step-by-step guide (follow this)
3. **RENDER_VISUAL_GUIDE.md** ← Diagrams and flowcharts
4. **DEPLOYMENT_GUIDE.md** ← Detailed troubleshooting (if issues)

---

## Key Points

✅ **QR scanning must be done locally** (Render is headless)
✅ **Session saved in `.wwebjs_auth` folder** (commit to git)
✅ **Add persistent disk** for session survival (critical)
✅ **Set environment variables** in Render dashboard
✅ **Use UptimeRobot** to keep free tier alive (optional but recommended)
✅ **Phone must be online** with WhatsApp running

---

## Environment Variables (Copy to Render)

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

---

## Cost Estimate

| Plan | Cost | Best For |
|------|------|----------|
| **Free** | $0/month | Testing (needs UptimeRobot to keep alive) |
| **Starter** | $7/month | Production (always-on, no sleep) |

**Recommendation**: Start with Free + UptimeRobot (both free), upgrade to Starter ($7/mo) when satisfied.

---

## Next Action

**→ Read RENDER_QUICK_START.md right now**

It has a complete quick reference with all the info you need.

Then follow **RENDER_CHECKLIST.md** step-by-step for deployment.

---

## Monitoring After Deploy

```bash
# Check if service is working
curl https://your-service-name.onrender.com/status

# Should return:
{
  "status": "UP",
  "timestamp": "...",
  "config": {...}
}
```

Check Render logs for messages like:
- ✅ `WhatsApp client is ready!` (good)
- ✅ `Scraper started` (good)
- ✅ `Sending message...` (working!)
- ❌ `auth_failure` (rescan QR code needed)

---

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| "No LID for user" | Fix phone format: `917200632341@c.us` |
| Service keeps restarting | Check logs, ensure .env.production is correct |
| No messages being sent | Enable DEBUG_MODE=true, check logs |
| Service sleeps on free tier | Add UptimeRobot monitor (free) |

---

**Ready?** Start with RENDER_QUICK_START.md → Then RENDER_CHECKLIST.md 🚀
