import { chromium, Browser, Page } from 'playwright';
import { Client, MessageMedia } from 'whatsapp-web.js';
import { config } from './config';

interface Product {
  title: string;
  currentPrice: string;
  offerPrice: string;
  discountPercent: number;
  url: string;
  imageUrl: string;
}

const wait = (msec: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, msec);
  });

const extractProducts = async (page: Page): Promise<Product[]> => {
  try {
    if (config.DEBUG_MODE) {
      console.log('[Scraper] Loading page with Playwright...');
    }

    // Navigate to the page and wait for network to be idle
    await page.goto(config.TARGET_URL, {
      waitUntil: 'networkidle',
      timeout: 15000,
    });

    if (config.DEBUG_MODE) {
      console.log('[Scraper] Page loaded, waiting for products to render...');
    }

    // Wait a bit for JavaScript to render products
    await page.waitForTimeout(2000);

    if (config.DEBUG_MODE) {
      console.log('[Scraper] Extracting products from rendered DOM...');
    }

    // Extract products using page.evaluate (runs in browser context)
    const products: Product[] = await page.evaluate(() => {
      const productList: Product[] = [];
      
      // Try to find product containers
      let productElements = document.querySelectorAll('.gridSlider__products');
      
      if (productElements.length === 0) {
        // Try alternative selectors
        productElements = document.querySelectorAll('[class*="product"]');
      }
      
      if (productElements.length === 0) {
        // Try swiper slides with product data
        productElements = document.querySelectorAll('.swiper-slide');
      }

      for (const prod of Array.from(productElements)) {
        try {
          // Find the nested .post-grid-content within this product
          const contentDiv = (prod as Element).querySelector('.post-grid-content');
          if (!contentDiv) continue;

          // Extract title from .title-roobae-deal > a
          const titleLink = contentDiv.querySelector('.title-roobae-deal a') as HTMLAnchorElement;
          const title = titleLink?.textContent?.trim() || 'Unknown';

          // Extract offer price (current/discounted price) from .cur-price
          const curPriceEl = contentDiv.querySelector('.cur-price');
          const curPriceText = curPriceEl?.textContent?.replace(/[₹\s]/g, '').trim() || 'N/A';

          // Extract original price (MRP) from .off-price
          const offPriceEl = contentDiv.querySelector('.off-price');
          const offPriceText = offPriceEl?.textContent?.replace(/[₹\s]/g, '').trim() || 'N/A';

          // Extract discount percentage from .discount-rb
          const discountEl = contentDiv.querySelector('.discount-rb');
          const discountMatch = discountEl?.textContent?.match(/\d+/);
          const discountPercent = discountMatch ? parseInt(discountMatch[0]) : 0;

          // Extract URL from the title link
          const url = titleLink?.href || 'N/A';

          // Extract image from .img-res-thumb (within the parent product container)
          const imgEl = (prod as Element).querySelector('.img-res-thumb') as HTMLImageElement;
          const imageUrl = imgEl?.src || imgEl?.dataset.src || 'N/A';

          // Only add products with valid title and discount > 0
          if (title && title !== 'Unknown' && discountPercent > 0) {
            productList.push({
              title,
              currentPrice: curPriceText,
              offerPrice: offPriceText,
              discountPercent,
              url,
              imageUrl,
            });
          }
        } catch (err) {
          // Continue to next product on error
          continue;
        }
      }

      return productList;
    });

    if (config.DEBUG_MODE && products.length > 0) {
      console.log(`[Scraper] Extracted ${products.length} products`);
      console.log(`[Scraper] Sample product: ${JSON.stringify(products[0], null, 2)}`);
    }

    return products;
  } catch (err) {
    console.error('[Scraper] Error extracting products:', err);
    return [];
  }
};

const shouldNotifyProduct = (product: Product): boolean => {
  const { title, discountPercent } = product;

  if (config.DEBUG_MODE) {
    console.log(`[Filter] Checking: "${title}" (${discountPercent}%)`);
  }

  // Rule 1: Check if discount is high enough (PRIMARY FILTER)
  if (discountPercent >= config.MIN_DISCOUNT_PERCENTAGE) {
    if (config.DEBUG_MODE) {
      console.log(`[Filter] ✓ Discount ${discountPercent}% >= ${config.MIN_DISCOUNT_PERCENTAGE}%`);
    }
    return true;
  }

  // Rule 2: Check keywords as secondary filter (ONLY if discount is below threshold)
  if (config.PRODUCT_KEYWORDS && config.PRODUCT_KEYWORDS.length > 0) {
    const titleLower = title.toLowerCase();
    const hasKeyword = config.PRODUCT_KEYWORDS.some((keyword) =>
      titleLower.includes(keyword.toLowerCase())
    );

    if (hasKeyword) {
      if (config.DEBUG_MODE) {
        console.log(`[Filter] ✓ Keyword match in title`);
      }
      return true;
    }
  }

  if (config.DEBUG_MODE) {
    console.log(`[Filter] ✗ Does not pass filter`);
  }
  return false;
};

const formatProductMessage = (product: Product): string => {
  return `📦 *PRODUCT OFFER DETECTED*

*Title:* ${product.title}
*Offer Price:* ₹${product.currentPrice}
*MRP Price:* ₹${product.offerPrice}
*Discount:* ${product.discountPercent}%

🔗 *URL:* ${product.url}`;
};

export const scrap = async (whatsappClient: Client): Promise<void> => {
  const sentProducts = new Set<string>();
  let browser: Browser | null = null;
  let page: Page | null = null;

  console.log('🚀 Scraper started with Playwright (lightweight browser)');
  console.log(`📍 Target URL: ${config.TARGET_URL}`);
  console.log(`⏱️  Scrape Interval: ${config.SCRAPE_INTERVAL}ms`);
  console.log(`🎯 Min Discount: ${config.MIN_DISCOUNT_PERCENTAGE}%`);
  console.log(`📱 WhatsApp Phone: ${config.WHATSAPP_PHONE_NUMBER}`);

  try {
    // Launch browser once and reuse
    if (config.DEBUG_MODE) {
      console.log('[Scraper] Launching Playwright browser...');
    }
    
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    page = await browser.newPage();

    if (config.DEBUG_MODE) {
      console.log('[Scraper] Browser launched successfully');
    }

    // Infinite scraping loop
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        if (config.DEBUG_MODE) {
          console.log('\n📤 Scraping roobai.com...');
        }

        // Extract products from the website
        const products = await extractProducts(page);

        if (config.DEBUG_MODE) {
          console.log(`[Scraper] Total extracted: ${products.length}`);
        }

        // Filter products based on discount and keywords
        const notifyProducts = products.filter((p) => shouldNotifyProduct(p));

        if (config.DEBUG_MODE) {
          console.log(`[Scraper] Pass filter: ${notifyProducts.length}`);
        }

        // Send messages for new products
        for (const product of notifyProducts) {
          const productKey = `${product.title}-${product.discountPercent}`;

          if (!sentProducts.has(productKey)) {
            try {
              const message = formatProductMessage(product);

              // Try to send with image
              if (product.imageUrl && product.imageUrl !== 'N/A') {
                try {
                  const media = await MessageMedia.fromUrl(product.imageUrl);
                  await whatsappClient.sendMessage(
                    config.WHATSAPP_PHONE_NUMBER,
                    media,
                    { caption: message }
                  );
                  console.log(`✓ Sent with image: ${product.title}`);
                } catch (imgErr) {
                  // Fallback to text-only if image fails
                  await whatsappClient.sendMessage(config.WHATSAPP_PHONE_NUMBER, message);
                  console.log(`✓ Sent (text): ${product.title}`);
                }
              } else {
                // Send text-only message
                await whatsappClient.sendMessage(config.WHATSAPP_PHONE_NUMBER, message);
                console.log(`✓ Sent (text): ${product.title}`);
              }

              // Add to sent products
              sentProducts.add(productKey);

              // Wait between messages to avoid rate limiting
              await wait(1500);
            } catch (err) {
              console.error(`✗ Error sending message for ${product.title}:`, err);
            }
          }
        }

        // Wait for next scrape cycle
        if (config.DEBUG_MODE) {
          console.log(`⏳ Waiting ${config.SCRAPE_INTERVAL}ms before next check...`);
        }

        await wait(config.SCRAPE_INTERVAL);
      } catch (err) {
        console.error('[Scraper] Error in main loop:', err);
        console.log('⏳ Retrying in 5 seconds...');
        await wait(5000);
      }
    }
  } catch (err) {
    console.error('[Scraper] Fatal error:', err);
    if (browser) {
      await browser.close();
    }
    process.exit(1);
  }
};

export default scrap;
