import { chromium, Browser, Page } from 'playwright';
import { Client, MessageMedia } from 'whatsapp-web.js';
import { getConfig } from './configManager';

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
    const config = getConfig();
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
      console.log('[Scraper] Waiting for images to load...');
    }

    // Wait for images to load before extraction
    try {
      await page.waitForFunction(
        () => {
          const images = document.querySelectorAll('.img-res-thumb');
          return images.length > 0 && Array.from(images).every((img: any) => img.complete);
        },
        { timeout: 10000 }
      );
      if (config.DEBUG_MODE) {
        console.log('[Scraper] Images loaded successfully');
      }
    } catch (imgWaitErr) {
      if (config.DEBUG_MODE) {
        console.warn('[Scraper] Image loading timeout - proceeding anyway');
      }
    }

    if (config.DEBUG_MODE) {
      console.log('[Scraper] Extracting products from rendered DOM...');
    }

    // DEBUG: Extract products using page.evaluate (runs in browser context)
    const evalStartTime = Date.now();
    const products: Product[] = await page.evaluate(() => {
      const productList: Product[] = [];
      
      // DEBUG: Try to find product containers and log selector attempts
      let productElements = document.querySelectorAll('.gridSlider__products');
      
      if (productElements.length === 0) {
        // DEBUG: Try alternative selectors
        productElements = document.querySelectorAll('[class*="product"]');
      }
      
      if (productElements.length === 0) {
        // DEBUG: Try swiper slides with product data
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
          // Get the src attribute directly - this is the actual CDN image before fallback
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
    const config = getConfig();
    if (config.DEBUG_MODE) {
      console.error('[Scraper] Error details:', errorStack);
    }
    return [];
  }
};

const shouldNotifyProduct = (product: Product): boolean => {
  const { title, discountPercent } = product;
  const config = getConfig();

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

// Helper function to download image using Playwright HTTP
const downloadImageAsBase64 = async (imageUrl: string): Promise<string | null> => {
  let response: any = null;
  let buffer: any = null;
  let abortController: AbortController | null = null;
  
  try {
    // Create abort controller for timeout
    abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController!.abort(), 10000); // 10 second timeout
    
    // Use Node.js Buffer to handle the image download
    response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': 'https://roobai.com/',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: abortController.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok || response.status !== 200) {
      return null;
    }

    // Get the image as a buffer
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      return null;
    }

    // Check image size (limit to 2MB to prevent memory bloat on Render.com - REDUCED from 5MB)
    if (arrayBuffer.byteLength > 2 * 1024 * 1024) {
      const cfg = getConfig();
      if (cfg.DEBUG_MODE) {
        console.warn(`[Image] Image too large: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)}MB, skipping`);
      }
      return null;
    }

    // Convert to base64
    buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    
    return base64;
  } catch (err) {
    if (getConfig().DEBUG_MODE) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.log(`[Image] Download failed: ${errMsg}`);
    }
    return null;
  } finally {
    // Explicitly clear references for garbage collection IMMEDIATELY
    buffer = null;
    abortController = null;
    if (response) {
      response = null;
    }
  }
};

export const scrap = async (whatsappClient: Client): Promise<void> => {
  const sentProducts = new Map<string, number>(); // Track product and timestamp
  let browser: Browser | null = null;
  let page: Page | null = null;
  let cycleCount = 0; // Track cycles for memory cleanup
  
  // Cleanup old sent products after 4 hours to prevent memory leak (more aggressive)
  const PRODUCT_RETENTION_MS = 4 * 60 * 60 * 1000; // 4 hours
  const CLEANUP_INTERVAL = 100; // Clean up every 100 cycles
  
  const cleanupSentProducts = () => {
    const now = Date.now();
    let deletedCount = 0;
    for (const [key, timestamp] of sentProducts.entries()) {
      if (now - timestamp > PRODUCT_RETENTION_MS) {
        sentProducts.delete(key);
        deletedCount++;
      }
    }
    const cfg = getConfig();
    if (cfg.DEBUG_MODE && deletedCount > 0) {
      console.log(`[Memory] Cleaned up ${deletedCount} old product entries. Map size: ${sentProducts.size}`);
    }
  };

  const cfg = getConfig();
  if (cfg.DEBUG_MODE) {
    console.log('🚀 Scraper started with Playwright (lightweight browser)');
    console.log(`📍 Target URL: ${cfg.TARGET_URL}`);
    console.log(`⏱️  Scrape Interval: ${cfg.SCRAPE_INTERVAL}ms`);
    console.log(`🎯 Min Discount: ${cfg.MIN_DISCOUNT_PERCENTAGE}%`);
    console.log(`📱 WhatsApp Phones (${cfg.WHATSAPP_PHONE_NUMBERS.length}): ${cfg.WHATSAPP_PHONE_NUMBERS.join(', ')}`);
  }

  try {
    // Launch browser once and reuse
    if (cfg.DEBUG_MODE) {
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

    if (cfg.DEBUG_MODE) {
      console.log('[Scraper] Browser launched successfully');
    }
    
    // Set up request interception to block heavy resources but ALLOW images for extraction
    await page.route('**/*', (route) => {
      const request = route.request();
      const resourceType = request.resourceType();
      
      // Block stylesheets, fonts, and media to speed up page load, but ALLOW images
      if (['stylesheet', 'font', 'media'].includes(resourceType)) {
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

    if (cfg.DEBUG_MODE) {
      console.log('[Scraper] Request interception configured - blocking heavy resources');
    }

    // Infinite scraping loop
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const config = getConfig(); // Get fresh config each cycle
      cycleCount++;
      
      // FIX: Periodically cleanup old products from memory (every 100 cycles)
      if (cycleCount % CLEANUP_INTERVAL === 0) {
        cleanupSentProducts();
        // Force garbage collection if available (Node.js with --expose-gc)
        if (global.gc) {
          global.gc();
          if (config.DEBUG_MODE) {
            console.log('[Memory] Manual garbage collection triggered');
          }
        }
      }
      
      // FIX: Close old page and create fresh one to avoid stale state and memory leaks
      if (page) {
        try {
          // Remove all route handlers before closing to prevent memory leak
          await page.unroute('**/*');
          await page.close();
          // Force page to be garbage collected
          page = null;
          if (config.DEBUG_MODE) {
            console.log('[Scraper] Previous page closed and cleared from memory');
          }
        } catch (e) {
          page = null;
          // Ignore errors on close
        }
      }
      
      // FIX: Check if browser is still alive, relaunch if crashed
      if (!browser) {
        try {
          if (config.DEBUG_MODE) {
            console.log('[Scraper] Browser is closed or crashed, relaunching...');
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
          
          if (config.DEBUG_MODE) {
            console.log('[Scraper] Browser relaunched successfully');
          }
        } catch (launchErr) {
          const launchErrMsg = launchErr instanceof Error ? launchErr.message : String(launchErr);
          console.error('[Scraper] Failed to relaunch browser:', launchErrMsg);
          console.log('⏳ Waiting 10 seconds before retry...');
          await wait(10000);
          continue;
        }
      }
      
      try {
        // Create fresh page for this cycle
        try {
          page = await browser.newPage();
        } catch (pageErr) {
          // If newPage fails, browser is likely dead
          if (config.DEBUG_MODE) {
            console.log('[Scraper] Failed to create new page, browser may be dead');
          }
          browser = null;
          await wait(2000);
          continue; // Skip to next iteration to relaunch browser
        }
        
        // Clear storage to avoid stale state
        await page.context().clearCookies();
        
        // Set up request interception again for new page - allow images for extraction
        await page.route('**/*', (route) => {
          const request = route.request();
          const resourceType = request.resourceType();
          
          if (['stylesheet', 'font', 'media'].includes(resourceType)) {
            route.abort();
          } else if (
            request.url().includes('google-analytics') ||
            request.url().includes('doubleclick') ||
            request.url().includes('facebook.com')
          ) {
            route.abort();
          } else {
            route.continue();
          }
        });
        
        if (config.DEBUG_MODE) {
          console.log('[Scraper] Fresh page created for this cycle');
        }
        
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
        
        // Run cleanup before processing products
        cleanupSentProducts();
        
        for (const product of notifyProducts) {
          const productKey = `${product.title.toLowerCase()}-${product.discountPercent}`;

          if (!sentProducts.has(productKey)) {
            try {
              if (config.DEBUG_MODE) {
                console.log(`[Message] Preparing to send: ${product.title}`);
              }
              const message = formatProductMessage(product);

              // DEBUG: Try to send with image and track result
              let imageSent = false;
              if (product.imageUrl && product.imageUrl !== 'N/A') {
                try {
                  if (config.DEBUG_MODE) {
                    console.log(`[Message] Downloading image from: ${product.imageUrl}`);
                  }
                  
                  // Download image directly without Playwright page context
                  let base64Image: string | null = null;
                  try {
                    base64Image = await downloadImageAsBase64(product.imageUrl);
                  } catch (downloadErr) {
                    if (config.DEBUG_MODE) {
                      const downloadMsg = downloadErr instanceof Error ? downloadErr.message : String(downloadErr);
                      console.warn(`[Message] Download error: ${downloadMsg}`);
                    }
                  }
                  
                  if (base64Image && base64Image.length > 0) {
                    try {
                      // Try to send with image to all configured phone numbers
                      for (const phoneNumber of config.WHATSAPP_PHONE_NUMBERS) {
                        try {
                          const media = new MessageMedia('image/jpeg', base64Image);
                          await whatsappClient.sendMessage(
                            phoneNumber,
                            media,
                            { caption: message }
                          );
                          imageSent = true;
                          sentCount++;
                          if (config.DEBUG_MODE) {
                            console.log(`✓ Sent with image to ${phoneNumber}: ${product.title}`);
                          }
                        } catch (sendImgErr) {
                          if (config.DEBUG_MODE) {
                            const sendImgMsg = sendImgErr instanceof Error ? sendImgErr.message : String(sendImgErr);
                            console.warn(`[Message] Failed to send image to ${phoneNumber}: ${sendImgMsg}`);
                          }
                        }
                        
                        // Wait between messages to different numbers
                        if (imageSent) {
                          await wait(500);
                        }
                      }
                    } finally {
                      // CRITICAL: Clear base64 from memory immediately after use
                      base64Image = null;
                      if (global.gc) {
                        global.gc(); // Trigger GC if available
                      }
                    }
                  } else {
                    if (config.DEBUG_MODE) {
                      console.warn(`[Message] Failed to download image from: ${product.imageUrl}`);
                    }
                  }
                } catch (imgErr) {
                  const imgErrMsg = imgErr instanceof Error ? imgErr.message : String(imgErr);
                  if (config.DEBUG_MODE) {
                    console.warn(`[Message] Image processing error: ${imgErrMsg}`);
                  }
                }
              }
              
              // Send text if image was not sent successfully
              if (!imageSent) {
                // Send to all configured phone numbers
                for (const phoneNumber of config.WHATSAPP_PHONE_NUMBERS) {
                  try {
                    await whatsappClient.sendMessage(phoneNumber, message);
                    sentCount++;
                    if (config.DEBUG_MODE) {
                      console.log(`✓ Sent (text) to ${phoneNumber}: ${product.title}`);
                    }
                  } catch (textErr) {
                    const textErrMsg = textErr instanceof Error ? textErr.message : String(textErr);
                    console.error(`✗ Error sending text message to ${phoneNumber}: ${textErrMsg}`);
                    if (config.DEBUG_MODE && textErr instanceof Error) {
                      console.error(`[Message] Text send error details:`, textErr.stack);
                    }
                  }
                  
                  // Wait between messages to different numbers
                  await wait(500);
                }
              }

              // Add to sent products with timestamp
              sentProducts.set(productKey, Date.now());

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
        
        // DEBUG: Log cycle summary only in debug mode
        if (config.DEBUG_MODE) {
          console.log(`[Scraper] Cycle Summary: Checked ${products.length} products, Filtered ${notifyProducts.length}, Sent ${sentCount} messages`);
          
          // Log memory usage if available
          if (global.gc) {
            global.gc(); // Manual garbage collection if enabled with --expose-gc
            const memUsage = process.memoryUsage();
            if (config.DEBUG_MODE) {
              console.log(`[Memory] Heap: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB / ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`);
            }
          }
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
        
        // FIX: Close page on error to prevent memory leak and set browser to null if it's closed
        if (page) {
          try {
            await page.close();
            page = null;
          } catch (e) {
            page = null;
          }
        }
        
        // FIX: Browser may be dead, will be relaunched on next iteration if needed
        browser = null;
        
        console.log('⏳ Retrying main loop in 5 seconds...');
        await wait(5000);
      }
    }
  } catch (err) {
    // DEBUG: Log fatal errors with complete context
    const fatalErrMsg = err instanceof Error ? err.message : String(err);
    console.error('[Scraper] FATAL ERROR - Shutting down:', fatalErrMsg);
    const cfg = getConfig();
    if (cfg.DEBUG_MODE && err instanceof Error) {
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
