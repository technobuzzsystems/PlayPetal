/**
 * Production & Environment Configuration Validator.
 * Validates mandatory environment variables on boot and fails fast in production if required secrets
 * are missing or set to known sandbox placeholders.
 */
export function validateEnvironmentConfig(): void {
  const env = (process.env.NODE_ENV || 'development').toLowerCase();

  // Always ensure DATABASE_URL is present
  if (!process.env.DATABASE_URL) {
    throw new Error('[CRITICAL] Startup failed: DATABASE_URL environment variable is required.');
  }

  if (env === 'production' || env === 'staging') {
    const missing: string[] = [];
    const invalid: string[] = [];

    if (!process.env.SESSION_SECRET) missing.push('SESSION_SECRET');
    if (!process.env.ALLOWED_ORIGINS) missing.push('ALLOWED_ORIGINS');

    // Check for sandbox placeholders in production
    if (process.env.RAZORPAY_KEY_SECRET === 'rzp_test_secret_placeholder') {
      invalid.push('RAZORPAY_KEY_SECRET contains test placeholder value');
    }
    if (process.env.SHIPPING_WEBHOOK_SECRET === 'shipping-webhook-test-secret-32-chars') {
      invalid.push('SHIPPING_WEBHOOK_SECRET contains test placeholder value');
    }

    if (process.env.ALLOWED_ORIGINS) {
      const origins = process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
      const hasOnlyLocalhost = origins.every((o) => o.includes('localhost') || o.includes('127.0.0.1'));
      if (hasOnlyLocalhost) {
        invalid.push('ALLOWED_ORIGINS must specify production domain origins, not localhost');
      }
    }

    if (process.env.SMS_PROVIDER === 'fast2sms' && (!process.env.FAST2SMS_API_KEY || process.env.FAST2SMS_API_KEY === 'dev_fast2sms_api_key_placeholder')) {
      invalid.push('FAST2SMS_API_KEY must be provided for production Fast2SMS integration');
    }

    if (missing.length > 0 || invalid.length > 0) {
      const details = [...missing.map(m => `Missing: ${m}`), ...invalid.map(i => `Invalid: ${i}`)].join('; ');
      console.error(`[CRITICAL] Production environment configuration error: ${details}`);
      throw new Error(`Production startup aborted due to configuration errors: ${details}`);
    }

    console.log(`[CONFIG] Production environment configuration validated successfully for NODE_ENV=${env}`);
  } else {
    console.log(`[CONFIG] Development/Test environment configuration loaded for NODE_ENV=${env}`);
  }
}
