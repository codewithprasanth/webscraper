# JSDOM Issue & Solution

## Problem

**roobai.com loads product data dynamically with JavaScript.**

When we fetch the HTML with axios, we get:
- ✅ Static HTML structure  
- ✅ Page layout and styling
- ❌ **NO product data** (still waiting for JavaScript to load)

The products are injected into the DOM **AFTER** the page loads via JavaScript bundles (built/minified code), so:
- JSDOM with `runScripts: 'outside-only'` = ❌ Won't work (ignores scripts)
- JSDOM with `runScripts: 'dangerously'` = ⚠️ Works but slow (~2-5 seconds per fetch, uses significant CPU)
- Plain axios + HTML parsing = ❌ Won't find products

## Root Cause

The page structure shows:
```html
<div class="products-container">
  <!-- Products should render here via JavaScript -->
</div>
```

But products never appear in the static HTML - they're loaded client-side.

## Solutions

### Option 1: Use Playwright (RECOMMENDED) ⭐
**Size**: ~100MB (vs Puppeteer's 300MB+)
**Performance**: Fast, purpose-built for this exact scenario
**Memory**: ~150MB runtime (safe on free tier)

```bash
npm install playwright
```

Pros:
- ✅ Lightweight (3x smaller than Puppeteer)
- ✅ Still safe for free tier
- ✅ Executes JavaScript properly
- ✅ Fast (launches quickly)

Cons:
- Still requires a headless browser
- Can't avoid ~100MB package

### Option 2: Keep JSDOM + Enable Script Execution
**Method**: Change `runScripts: 'outside-only'` to `runScripts: 'dangerously'`

Pros:
- ✅ No new packages
- ✅ Still lightweight

Cons:
- ❌ Much slower (2-5 sec per fetch vs 0.5 sec)
- ❌ Risky (untrusted scripts execute)
- ❌ High CPU usage
- ❌ Might timeout on Render's free tier

### Option 3: Find the API Endpoint
Search for where roobai loads product data and call that API directly.

Status: Not obvious from HTML inspection (likely in bundled JavaScript)

### Option 4: Use Puppeteer (Not Recommended)
Same memory issue that caused status 143 errors.

---

## Recommendation

### Best Path Forward:

**Use Playwright** - it's the Goldilocks solution:
- Significantly lighter than Puppeteer (100MB vs 300MB)
- Still executes JavaScript properly
- Built specifically for scenarios like this
- Won't cause memory issues on free tier

### Quick Fix (Temporary):

Enable script execution in JSDOM to test locally:

```typescript
const dom = new JSDOM(response.data, {
  url: config.TARGET_URL,
  runScripts: 'dangerously',  // Enable script execution
  resources: 'usable',
  pretendToBeVisual: true,
});

// Wait for scripts to complete
await new Promise(resolve => setTimeout(resolve, 3000));
```

This will work locally but may be too slow for production.

---

## What to Do Next

### To Use Playwright:

1. **Update package.json**:
```json
{
  "dependencies": {
    "playwright": "^1.40.0"
  }
}
```

2. **Update scraper.ts**:
Replace axios/JSDOM with Playwright:
```typescript
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(config.TARGET_URL, { waitUntil: 'networkidle' });
const html = await page.content();
const dom = new JSDOM(html);  // Parse with JSDOM
// Now extract products from DOM
```

3. **Install and test**:
```bash
npm install
npm run dev
```

### To Try JSDOM Script Execution (Slower but simpler):

Just run the test script we created:
```bash
npm run dev
```

And monitor the console to see if products are found now.

---

## Current Status

✅ Code is ready to accept either Playwright or JSDOM with script execution
✅ JSDOM is installed and configured (but products not loading due to missing scripts)
⏳ Waiting for decision on which approach to use

Debug mode is ON (.env DEBUG_MODE=true), so you'll see detailed logs about what's found.

---

## Expected Output (Once Fixed)

```
🚀 Scraper started with [JSDOM/Playwright]
📍 Target URL: https://roobai.com/
⏱️  Scrape Interval: 30000ms

📤 Scraping roobai.com...
[Scraper] Found 15 product containers
[Scraper] Extracted 15 products
[Filter] Checking: "Product Title" (85%)
[Filter] ✓ Discount 85% >= 80%
✓ Sent with image: Product Title
...
```

Instead of the silent behavior we're seeing now.

---

## Questions?

If you want to:
1. **Try Playwright** → I can implement it
2. **Try JSDOM script execution** → Run current code, should see logs
3. **Find the API** → Need more investigation of network requests
4. **Go back to Puppeteer** → Possible but not ideal for free tier
