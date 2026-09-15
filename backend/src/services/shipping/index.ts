// ============================================================================
// PHASE 5B: SHIPPING PROVIDER FACTORY & REGISTRY
// ============================================================================

import { IShippingProvider } from './ShippingProvider';
import { ShiprocketProvider } from './ShiprocketProvider';

export * from './types';
export * from './ShippingProvider';
export * from './ShiprocketProvider';

let providerInstance: IShippingProvider | null = null;

/**
 * Returns the singleton instance of the configured logistics provider.
 * Provider choice is controlled by the server-side SHIPPING_PROVIDER environment variable.
 */
export function getShippingProvider(providerName?: string): IShippingProvider {
  const selected = (providerName || process.env.SHIPPING_PROVIDER || 'shiprocket').toLowerCase().trim();

  if (selected === 'shiprocket') {
    if (!providerInstance || providerInstance.name !== 'SHIPROCKET') {
      providerInstance = new ShiprocketProvider();
    }
    return providerInstance;
  }

  throw new Error(`Unsupported shipping provider: "${selected}". Supported providers: ["shiprocket"]`);
}

/**
 * Helper to reset provider instance for testing purposes.
 */
export function resetShippingProviderInstance(): void {
  providerInstance = null;
}
