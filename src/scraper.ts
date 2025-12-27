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

    // DEBUG: Track navigation start time for performance monitoring
    const navStartTime = Date.now();
    
    // Set extra headers to look like real browser
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0',
    });
    
    // Navigate to the page with extended timeout for Render.com compatibility
    // Using 'domcontentloaded' instead of 'networkidle' for faster loading
    await page.goto(config.TARGET_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 90000, // Extended to 90 seconds for Render.com browser startup + network latency
    });
    
    // DEBUG: Log navigation time
    const navDuration = Date.now() - navStartTime;
    if (config.DEBUG_MODE) {
      console.log(`[Scraper] Page navigation completed in ${navDuration}ms`);
    }

    if (config.DEBUG_MODE) {
      console.log('[Scraper] Page loaded, waiting for products to render...');
    }

    // DEBUG: Wait for JavaScript to render products with monitoring
    const renderStartTime = Date.now();
    await page.waitForTimeout(5000); // Increased wait time for JS rendering (5 seconds)
    const renderDuration = Date.now() - renderStartTime;
    
    if (config.DEBUG_MODE) {
      console.log(`[Scraper] JS rendering wait completed in ${renderDuration}ms`);
      console.log('[Scraper] Extracting products from rendered DOM...');
    }

    // DEBUG: Extract products using page.evaluate (runs in browser context)
    const evalStartTime = Date.now();
    const products: Product[] = await page.evaluate(() => {
      const productList: Product[] = [];
      
      // DEBUG: Try to find product containers and log selector attempts
      let productElements = document.querySelectorAll('.gridSlider__products');
      console.log(`[Eval] Selector '.gridSlider__products' found: ${productElements.length} elements`);
      
      if (productElements.length === 0) {
        // DEBUG: Try alternative selectors
        productElements = document.querySelectorAll('[class*="product"]');
        console.log(`[Eval] Selector '[class*="product"]' found: ${productElements.length} elements`);
      }
      
      if (productElements.length === 0) {
        // DEBUG: Try swiper slides with product data
        productElements = document.querySelectorAll('.swiper-slide');
        console.log(`[Eval] Selector '.swiper-slide' found: ${productElements.length} elements`);
      }
      
      console.log(`[Eval] Total product elements to process: ${productElements.length}`);

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
    
    // DEBUG: Log extraction performance
    const evalDuration = Date.now() - evalStartTime;
    if (config.DEBUG_MODE) {
      console.log(`[Scraper] DOM evaluation completed in ${evalDuration}ms`);
      console.log(`[Scraper] Extracted ${products.length} products`);
      if (products.length > 0) {
        console.log(`[Scraper] Sample product: ${JSON.stringify(products[0], null, 2)}`);
      }
    }

    return products;
  } catch (err) {
    // DEBUG: Log detailed error information for troubleshooting
    const errorMsg = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : 'No stack trace';
    console.error('[Scraper] Error extracting products:', errorMsg);
    if (config.DEBUG_MODE) {
      console.error('[Scraper] Error details:', errorStack);
    }
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
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-resources',
        '--disable-background-networking',
        '--disable-breakpad',
        '--disable-client-side-phishing-detection',
        '--disable-component-extensions-with-background-pages',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-popup-blocking',
        '--no-default-browser-check',
        '--no-first-run',
      ],
    });
    
    page = await browser.newPage();

    if (config.DEBUG_MODE) {
      console.log('[Scraper] Browser launched successfully');
    }
    
    // Set up request interception to block heavy resources and speed up loading
    await page.route('**/*', (route) => {
      const request = route.request();
      const resourceType = request.resourceType();
      
      // Block images, stylesheets, fonts, and media to speed up page load
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        route.abort();
      } else if (
        request.url().includes('google-analytics') ||
        request.url().includes('doubleclick') ||
        request.url().includes('facebook.com') ||
        request.url().includes('analytics') ||
        request.url().includes('ads')
      ) {
        // Block tracking and ad requests
        route.abort();
      } else {
        route.continue();
      }
    });

    if (config.DEBUG_MODE) {
      console.log('[Scraper] Request interception configured - blocking heavy resources');
    }

    // Infinite scraping loop
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        let retries = 0;
        const maxRetries = 3;
        let products: Product[] = [];

        // Retry logic for scraping
        while (retries < maxRetries && products.length === 0) {
          try {
            if (config.DEBUG_MODE) {
              if (retries === 0) {
                console.log('\n📤 Scraping roobai.com...');
              } else {
                console.log(`\n📤 Retrying scrape (attempt ${retries + 1}/${maxRetries})...`);
              }
            }

            // Extract products from the website
            products = await extractProducts(page);

            if (config.DEBUG_MODE) {
              console.log(`[Scraper] Total extracted: ${products.length}`);
            }

            // If we got products or have tried max retries, break
            if (products.length > 0) {
              break;
            }

            // If no products found and retries left, wait and retry
            if (retries < maxRetries - 1) {
              console.log('[Scraper] No products found, retrying in 3 seconds...');
              await wait(3000);
              retries++;
            } else {
              break;
            }
          } catch (err) {
            // DEBUG: Log error details with timestamp
            const errorMsg = err instanceof Error ? err.message : String(err);
            console.error(`[Scraper] Error in scrape attempt ${retries + 1}: ${errorMsg}`);
            if (config.DEBUG_MODE && err instanceof Error) {
              console.error(`[Scraper] Stack trace:`, err.stack);
            }
            retries++;
            
            if (retries < maxRetries) {
              // Exponential backoff: 10s, 20s, 30s
              const waitTime = 10000 * retries;
              console.log(`[Scraper] Retrying in ${waitTime}ms...`);
              await wait(waitTime);
            }
          }
        }

        // DEBUG: Filter products based on discount and keywords
        const notifyProducts = products.filter((p) => shouldNotifyProduct(p));

        if (config.DEBUG_MODE) {
          console.log(`[Scraper] Products to notify: ${notifyProducts.length}/${products.length}`);
        }

        // DEBUG: Send messages for new products with tracking
        let sentCount = 0;
        for (const product of notifyProducts) {
          const productKey = `${product.title}-${product.discountPercent}`;

          if (!sentProducts.has(productKey)) {
            try {
              if (config.DEBUG_MODE) {
                console.log(`[Message] Preparing to send: ${product.title}`);
              }
              const message = formatProductMessage(product);

              // DEBUG: Try to send with image and track result
              if (product.imageUrl && product.imageUrl !== 'N/A') {
                try {
                  if (config.DEBUG_MODE) {
                    console.log(`[Message] Loading image from: ${product.imageUrl}`);
                  }
                  const media = await MessageMedia.fromUrl(product.imageUrl);
                  await whatsappClient.sendMessage(
                    config.WHATSAPP_PHONE_NUMBER,
                    media,
                    { caption: message }
                  );
                  sentCount++;
                  console.log(`✓ Sent with image: ${product.title}`);
                } catch (imgErr) {
                  // DEBUG: Fallback to text-only if image fails
                  const imgErrMsg = imgErr instanceof Error ? imgErr.message : String(imgErr);
                  console.warn(`[Message] Image load failed, falling back to text: ${imgErrMsg}`);
                  await whatsappClient.sendMessage(config.WHATSAPP_PHONE_NUMBER, message);
                  sentCount++;
                  console.log(`✓ Sent (text): ${product.title}`);
                }
              } else {
                // DEBUG: Send text-only message (no image URL)
                if (config.DEBUG_MODE) {
                  console.log(`[Message] No image available, sending text only`);
                }
                await whatsappClient.sendMessage(config.WHATSAPP_PHONE_NUMBER, message);
                sentCount++;
                console.log(`✓ Sent (text): ${product.title}`);
              }

              // Add to sent products
              sentProducts.add(productKey);

              // Wait between messages to avoid rate limiting
              await wait(1500);
            } catch (err) {
              // DEBUG: Log message sending errors with full details
              const msgErrMsg = err instanceof Error ? err.message : String(err);
              console.error(`✗ Error sending message for ${product.title}: ${msgErrMsg}`);
              if (config.DEBUG_MODE && err instanceof Error) {
                console.error(`[Message] Error details:`, err.stack);
              }
            }
          }
        }
        
        // DEBUG: Log cycle summary
        if (config.DEBUG_MODE) {
          console.log(`[Scraper] Cycle Summary: Checked ${products.length} products, Filtered ${notifyProducts.length}, Sent ${sentCount} messages`);
        }

        // Wait for next scrape cycle
        if (config.DEBUG_MODE) {
          console.log(`⏳ Waiting ${config.SCRAPE_INTERVAL}ms before next check...`);
        }

        await wait(config.SCRAPE_INTERVAL);
      } catch (err) {
        // DEBUG: Log uncaught errors in main loop
        const loopErrMsg = err instanceof Error ? err.message : String(err);
        console.error('[Scraper] Unexpected error in main loop:', loopErrMsg);
        if (config.DEBUG_MODE && err instanceof Error) {
          console.error('[Scraper] Stack trace:', err.stack);
        }
        console.log('⏳ Retrying main loop in 5 seconds...');
        await wait(5000);
      }
    }
  } catch (err) {
    // DEBUG: Log fatal errors with complete context
    const fatalErrMsg = err instanceof Error ? err.message : String(err);
    console.error('[Scraper] FATAL ERROR - Shutting down:', fatalErrMsg);
    if (config.DEBUG_MODE && err instanceof Error) {
      console.error('[Scraper] Full error details:', err.stack);
    }
    if (browser) {
      console.log('[Scraper] Closing browser...');
      await browser.close();
    }
    console.log('[Scraper] Process exiting with code 1');
    process.exit(1);
  }
};

export default scrap;
