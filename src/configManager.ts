import { config as envConfig } from './config';

// Runtime config - can be updated via API
export interface RuntimeConfig {
  MIN_DISCOUNT_PERCENTAGE: number;
  PRODUCT_KEYWORDS: string[];
  SCRAPE_INTERVAL: number;
  WHATSAPP_PHONE_NUMBERS: string[]; // Changed to array to support multiple numbers
  TARGET_URL: string;
  DEBUG_MODE: boolean;
}

// Start with environment config values
export const runtimeConfig: RuntimeConfig = {
  MIN_DISCOUNT_PERCENTAGE: envConfig.MIN_DISCOUNT_PERCENTAGE,
  PRODUCT_KEYWORDS: envConfig.PRODUCT_KEYWORDS,
  SCRAPE_INTERVAL: envConfig.SCRAPE_INTERVAL,
  WHATSAPP_PHONE_NUMBERS: envConfig.WHATSAPP_PHONE_NUMBER
    .split(',')
    .map(p => p.trim())
    .filter(p => p.length > 0),
  TARGET_URL: envConfig.TARGET_URL,
  DEBUG_MODE: envConfig.DEBUG_MODE,
};

// Get current config
export const getConfig = (): RuntimeConfig => {
  return { ...runtimeConfig };
};

// Update specific config value
export const updateConfig = (
  key: keyof RuntimeConfig,
  value: any
): { success: boolean; message: string; config?: RuntimeConfig } => {
  try {
    // Validation
    switch (key) {
      case 'MIN_DISCOUNT_PERCENTAGE':
        const discount = parseInt(String(value));
        if (isNaN(discount) || discount < 0 || discount > 100) {
          return {
            success: false,
            message: 'MIN_DISCOUNT_PERCENTAGE must be a number between 0 and 100',
          };
        }
        console.log(`[ConfigManager] ✓ Updated MIN_DISCOUNT_PERCENTAGE: ${runtimeConfig.MIN_DISCOUNT_PERCENTAGE}% → ${discount}%`);
        runtimeConfig.MIN_DISCOUNT_PERCENTAGE = discount;
        break;

      case 'SCRAPE_INTERVAL':
        const interval = parseInt(String(value));
        if (isNaN(interval) || interval < 5000) {
          return {
            success: false,
            message: 'SCRAPE_INTERVAL must be a number >= 5000 (ms)',
          };
        }
        console.log(`[ConfigManager] ✓ Updated SCRAPE_INTERVAL: ${runtimeConfig.SCRAPE_INTERVAL}ms → ${interval}ms`);
        runtimeConfig.SCRAPE_INTERVAL = interval;
        break;

      case 'PRODUCT_KEYWORDS':
        if (Array.isArray(value)) {
          runtimeConfig.PRODUCT_KEYWORDS = value.map(k => String(k).trim()).filter(k => k.length > 0);
        } else if (typeof value === 'string') {
          runtimeConfig.PRODUCT_KEYWORDS = value
            .split(',')
            .map(k => k.trim())
            .filter(k => k.length > 0);
        } else {
          return {
            success: false,
            message: 'PRODUCT_KEYWORDS must be an array or comma-separated string',
          };
        }
        console.log(`[ConfigManager] ✓ Updated PRODUCT_KEYWORDS: [${runtimeConfig.PRODUCT_KEYWORDS.join(', ')}]`);
        break;

      case 'WHATSAPP_PHONE_NUMBERS':
        let phoneNumbers: string[];
        if (Array.isArray(value)) {
          phoneNumbers = value.map(p => String(p).trim()).filter(p => p.length > 0);
        } else if (typeof value === 'string') {
          phoneNumbers = value
            .split(',')
            .map(p => p.trim())
            .filter(p => p.length > 0);
        } else {
          return {
            success: false,
            message: 'WHATSAPP_PHONE_NUMBERS must be an array or comma-separated string',
          };
        }
        if (phoneNumbers.length === 0) {
          return {
            success: false,
            message: 'At least one phone number is required',
          };
        }
        console.log(`[ConfigManager] ✓ Updated WHATSAPP_PHONE_NUMBERS (${phoneNumbers.length} numbers): [${phoneNumbers.join(', ')}]`);
        runtimeConfig.WHATSAPP_PHONE_NUMBERS = phoneNumbers;
        break;

      case 'TARGET_URL':
        const url = String(value).trim();
        if (!url.startsWith('http')) {
          return {
            success: false,
            message: 'TARGET_URL must be a valid HTTP/HTTPS URL',
          };
        }
        console.log(`[ConfigManager] ✓ Updated TARGET_URL: ${runtimeConfig.TARGET_URL} → ${url}`);
        runtimeConfig.TARGET_URL = url;
        break;

      case 'DEBUG_MODE':
        const oldDebug = runtimeConfig.DEBUG_MODE;
        runtimeConfig.DEBUG_MODE = value === true || value === 'true' || value === '1';
        console.log(`[ConfigManager] ✓ Updated DEBUG_MODE: ${oldDebug} → ${runtimeConfig.DEBUG_MODE}`);
        break;

      default:
        return {
          success: false,
          message: `Unknown config key: ${key}`,
        };
    }

    return {
      success: true,
      message: `Successfully updated ${key}`,
      config: getConfig(),
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Error updating config: ${errMsg}`,
    };
  }
};

// Update multiple config values at once
export const updateConfigBatch = (
  updates: Partial<RuntimeConfig>
): { success: boolean; message: string; config?: RuntimeConfig; errors?: Record<string, string> } => {
  const errors: Record<string, string> = {};
  let updateCount = 0;

  for (const [key, value] of Object.entries(updates)) {
    const result = updateConfig(key as keyof RuntimeConfig, value);
    if (!result.success) {
      errors[key] = result.message;
    } else {
      updateCount++;
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: updateCount > 0,
      message: `Updated ${updateCount} config value(s) with ${Object.keys(errors).length} error(s)`,
      config: getConfig(),
      errors,
    };
  }

  return {
    success: true,
    message: `Successfully updated ${updateCount} config value(s)`,
    config: getConfig(),
  };
};

// Reset to environment config
export const resetConfig = (): RuntimeConfig => {
  runtimeConfig.MIN_DISCOUNT_PERCENTAGE = envConfig.MIN_DISCOUNT_PERCENTAGE;
  runtimeConfig.PRODUCT_KEYWORDS = envConfig.PRODUCT_KEYWORDS;
  runtimeConfig.SCRAPE_INTERVAL = envConfig.SCRAPE_INTERVAL;
  runtimeConfig.WHATSAPP_PHONE_NUMBERS = envConfig.WHATSAPP_PHONE_NUMBER
    .split(',')
    .map(p => p.trim())
    .filter(p => p.length > 0);
  runtimeConfig.TARGET_URL = envConfig.TARGET_URL;
  runtimeConfig.DEBUG_MODE = envConfig.DEBUG_MODE;

  console.log('[ConfigManager] Reset to environment config');
  return getConfig();
};

export default {
  getConfig,
  updateConfig,
  updateConfigBatch,
  resetConfig,
};
