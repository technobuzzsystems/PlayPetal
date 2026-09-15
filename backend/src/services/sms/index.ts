import { SmsOtpProvider } from './types';
import { Fast2SmsProvider } from './Fast2SmsProvider';
import { DevSmsProvider } from './DevSmsProvider';

let instance: SmsOtpProvider | null = null;

export function getSmsProvider(): SmsOtpProvider {
  if (instance) return instance;

  const apiKey = process.env.FAST2SMS_API_KEY || process.env.SMS_API_KEY;
  const isProduction = process.env.NODE_ENV === 'production';

  if (apiKey) {
    console.log('[SMS] Using Fast2SMS OTP Provider.');
    instance = new Fast2SmsProvider(apiKey);
  } else if (!isProduction) {
    console.log('[SMS] FAST2SMS_API_KEY missing. Using Development Mock SMS Provider for local testing.');
    instance = new DevSmsProvider();
  } else {
    throw new Error('[CRITICAL] Startup error: FAST2SMS_API_KEY environment variable is required in production.');
  }

  return instance;
}

export * from './types';
