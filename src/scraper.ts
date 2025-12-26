import puppeteer, { Browser, Page } from 'puppeteer';
import { Client } from 'whatsapp-web.js';
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
      console.log('[Scraper] Starting product extraction...');
    }

    // eslint-disable-next-line no-undef
    const products: Product[] = await page.evaluate(() => {
      const results: any[] = [];
      
      // Find all product containers - roobai.com uses .gridSlider__products
      const productElements = Array.from(
        (document as any).querySelectorAll('.gridSlider__products')
      );

      for (const prod of productElements) {
        try {
          // Find the nested .post-grid-content within this product
          const contentDiv = (prod as any).querySelector('.post-grid-content');
          if (!contentDiv) continue;
          
          // Extract title from .title-roobae-deal > a
          const titleLink = contentDiv.querySelector('.title-roobae-deal a');
          const title = titleLink?.textContent?.trim() || 'Unknown';
          
          // Extract offer price (current/discounted price) from .cur-price
          const curPriceEl = contentDiv.querySelector('.cur-price');
          const curPriceText = curPriceEl?.textContent?.replace(/[₹\s]/g, '').trim() || 'N/A';
          
          // Extract original price (MRP) from .off-price
          const offPriceEl = contentDiv.querySelector('.off-price');
          const offPriceText = offPriceEl?.textContent?.replace(/[₹\s]/g, '').trim() || 'N/A';
          
          // Extract discount percentage from .discount-rb
          const discountEl = contentDiv.querySelector('.discount-rb');
          const discountText = discountEl?.textContent?.match(/\d+/)?.[0] || '0';
          const discountPercent = parseInt(discountText) || 0;
          
          // Extract product URL from title link
          const url = titleLink?.href || '#';
          
          // Extract image from .img-res-thumb (located in parent .pimg div)
          // Image is outside .post-grid-content, so search from parent product element
          const imgEl = (prod as any).querySelector('.img-res-thumb');
          const imageUrl = (imgEl as any)?.src || '';

          const product = {
            title: title.substring(0, 150),  // Limit to 150 chars
            currentPrice: curPriceText.substring(0, 50),  // This is the OFFER price
            offerPrice: offPriceText.substring(0, 50),    // This is the MRP price
            discountPercent: discountPercent,
            url: url,
            imageUrl: imageUrl.substring(0, 500),
          };

          // Only add if we have essential data
          if (product.title !== 'Unknown' && product.discountPercent > 0) {
            results.push(product);
          }
        } catch (e) {
          // Skip products that fail to extract
          if ((document as any).DEBUG_MODE) {
            console.error('Error extracting product:', e);
          }
        }
      }

      return results;
    });

    if (config.DEBUG_MODE) {
      console.log(`[Scraper] Extracted ${products.length} products from ${products.length > 0 ? 'roobai.com' : 'page'}`);
      if (products.length > 0) {
        console.log('[Scraper] Sample product:', products[0]);
      }
    }

    return products;
  } catch (error) {
    console.error('[Scraper] Error during product extraction:', error);
    return [];
  }
};

const shouldNotifyProduct = (product: Product): boolean => {
  const { title, discountPercent } = product;
  
  // Rule 1: Check if discount is high enough (PRIMARY FILTER)
  // This is the main filter - always checked first
  if (discountPercent >= config.MIN_DISCOUNT_PERCENTAGE) {
    if (config.DEBUG_MODE) {
      console.log(`[Filter] ✓ "${title}" (${discountPercent}% >= ${config.MIN_DISCOUNT_PERCENTAGE}%)`);
    }
    return true;
  }

  // Rule 2: Check keywords as secondary filter (ONLY if discount is below threshold)
  // Only applies if keywords are configured
  if (config.PRODUCT_KEYWORDS && config.PRODUCT_KEYWORDS.length > 0) {
    const titleLower = title.toLowerCase();
    const hasKeyword = config.PRODUCT_KEYWORDS.some(keyword =>
      titleLower.includes(keyword.toLowerCase())
    );
    if (hasKeyword && config.DEBUG_MODE) {
      console.log(`[Filter] ✓ "${title}" (keyword match: low discount with keyword)`);
    }
    return hasKeyword;
  }
  
  // Doesn't meet discount threshold and no keywords configured
  if (config.DEBUG_MODE) {
    console.log(`[Filter] ✗ "${title}" (${discountPercent}% < ${config.MIN_DISCOUNT_PERCENTAGE}%, no keywords)`);
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

const scrap = async (whatsappClient: Client): Promise<void> => {
  let browser: Browser | null = null;
  const sentProducts = new Set<string>();

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    console.log('✓ Browser launched');

    const page = await browser.newPage();
    
    // Set viewport for better scraping
    await page.setViewport({ width: 1920, height: 1080 });

    // Initial page load
    console.log(`[Scraper] Loading ${config.TARGET_URL}...`);
    await page.goto(config.TARGET_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('✓ Website loaded');

    // Infinite scraping loop
    while (true) {
      try {
        if (config.DEBUG_MODE) {
          console.log('[Scraper] Starting scrape cycle...');
        }

        // Extract products from current page
        const products = await extractProducts(page);

        // Filter and process products
        const offersToSend = products.filter(shouldNotifyProduct);

        if (config.DEBUG_MODE) {
          console.log(`[Scraper] Found ${offersToSend.length} products to notify`);
        }

        // Send notifications for new products
        for (const product of offersToSend) {
          if (!sentProducts.has(product.title)) {
            try {
              const message = formatProductMessage(product);
              
              // Send message with image if available
              if (product.imageUrl && product.imageUrl.trim() !== '') {
                try {
                  // Import MessageMedia from whatsapp-web.js
                  const { MessageMedia } = require('whatsapp-web.js');
                  
                  // Try to fetch the image and send with message
                  const media = await MessageMedia.fromUrl(product.imageUrl);
                  await whatsappClient.sendMessage(config.WHATSAPP_PHONE_NUMBER, media, { caption: message });
                  
                  if (config.DEBUG_MODE) {
                    console.log(`[Scraper] Image sent with message for: ${product.title}`);
                  }
                } catch (imageError) {
                  // If image fails, send just the text message
                  if (config.DEBUG_MODE) {
                    console.log(`[Scraper] Image failed, sending text only: ${product.title}`);
                  }
                  await whatsappClient.sendMessage(config.WHATSAPP_PHONE_NUMBER, message);
                }
              } else {
                // No image available, send text only
                await whatsappClient.sendMessage(config.WHATSAPP_PHONE_NUMBER, message);
              }
              
              sentProducts.add(product.title);
              console.log(`✓ Sent notification for: ${product.title}`);
              await wait(1500); // Slightly longer delay for image transfer
            } catch (error) {
              console.error(`✗ Failed to send message for ${product.title}:`, error);
            }
          }
        }

        if (config.DEBUG_MODE) {
          console.log(`[Scraper] Waiting ${config.SCRAPE_INTERVAL}ms before next scrape...`);
        }

        // Wait before next scrape
        await wait(config.SCRAPE_INTERVAL);

        // Reload the page
        console.log('[Scraper] Reloading page...');
        await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
        console.log('✓ Page reloaded');

      } catch (error) {
        console.error('[Scraper] Error during scrape cycle:', error);
        console.log('[Scraper] Attempting to reconnect...');
        
        try {
          await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
        } catch (reloadError) {
          console.error('[Scraper] Failed to reload page, reloading entire page...');
          await page.goto(config.TARGET_URL, { waitUntil: 'networkidle2', timeout: 30000 });
        }

        await wait(5000); // Wait 5 seconds before retrying
      }
    }

  } catch (error) {
    console.error('[Scraper] Fatal error in scraper:', error);
  } finally {
    // Cleanup
    if (browser) {
      try {
        await browser.close();
        console.log('✓ Browser closed');
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
  }
};

export default scrap;
