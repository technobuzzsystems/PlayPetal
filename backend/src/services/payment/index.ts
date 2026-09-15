import { PaymentProvider } from './PaymentProvider';
import { RazorpayProvider } from './RazorpayProvider';
import { SandboxPaymentProvider } from './SandboxPaymentProvider';

export * from './PaymentProvider';
export * from './RazorpayProvider';
export * from './SandboxPaymentProvider';

let defaultRazorpayProvider: PaymentProvider | null = null;
let defaultSandboxProvider: PaymentProvider | null = null;

export function getPaymentProvider(providerName?: string): PaymentProvider {
  const isProduction = process.env.NODE_ENV === 'production';
  const rawConfig = (providerName || process.env.PAYMENT_PROVIDER || '').trim().toUpperCase();

  // 1. Production Mode Safety: Fail-closed if production is missing explicit provider configuration
  if (isProduction && !rawConfig) {
    throw new Error(
      'CRITICAL_CONFIG_ERROR: Production environment requires explicit PAYMENT_PROVIDER=razorpay configuration. Sandbox payments are strictly disabled in production.'
    );
  }

  // 2. Explicit Razorpay Mode
  if (rawConfig === 'RAZORPAY') {
    if (!defaultRazorpayProvider) {
      defaultRazorpayProvider = new RazorpayProvider();
    }
    return defaultRazorpayProvider;
  }

  // 3. Explicit Sandbox Mode or Local Development Default
  if (rawConfig === 'SANDBOX' || !isProduction) {
    if (!defaultSandboxProvider) {
      defaultSandboxProvider = new SandboxPaymentProvider();
    }
    return defaultSandboxProvider;
  }

  // 4. Default fallback for development/test
  if (!defaultSandboxProvider) {
    defaultSandboxProvider = new SandboxPaymentProvider();
  }
  return defaultSandboxProvider;
}

export function setPaymentProvider(provider: PaymentProvider): void {
  if (provider.name === 'RAZORPAY') {
    defaultRazorpayProvider = provider;
  } else {
    defaultSandboxProvider = provider;
  }
}