import { PaymentProvider } from './PaymentProvider';
import { RazorpayProvider } from './RazorpayProvider';

export * from './PaymentProvider';
export * from './RazorpayProvider';

let defaultProvider: PaymentProvider | null = null;

export function getPaymentProvider(providerName?: string): PaymentProvider {
  const chosen = (providerName || process.env.PAYMENT_PROVIDER || 'RAZORPAY').toUpperCase();

  if (chosen === 'RAZORPAY') {
    if (!defaultProvider || defaultProvider.name !== 'RAZORPAY') {
      defaultProvider = new RazorpayProvider();
    }
    return defaultProvider;
  }

  // Fallback to Razorpay provider
  return new RazorpayProvider();
}

export function setPaymentProvider(provider: PaymentProvider): void {
  defaultProvider = provider;
}