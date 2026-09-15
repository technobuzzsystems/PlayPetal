// ============================================================================
// PHASE 5B: SHIPPING PROVIDER INTERFACE
// ============================================================================

import {
  CreateShipmentInput,
  ProviderShipmentResult,
  ProviderTrackingResult,
  ProviderCancelResult,
  NormalizedShipmentStatus,
  WebhookEventPayload,
  CreateReturnShipmentInput,
  ProviderReturnShipmentResult,
  NormalizedReverseShipmentStatus,
} from './types';

export interface IShippingProvider {
  readonly name: string;

  /**
   * Dispatches a new shipment order to the logistics provider and requests an AWB.
   */
  createShipment(data: CreateShipmentInput): Promise<ProviderShipmentResult>;

  /**
   * Retrieves real-time tracking events and status from the provider.
   */
  trackShipment(providerShipmentId: string, awbNumber?: string): Promise<ProviderTrackingResult>;

  /**
   * Cancels an active shipment with the provider.
   */
  cancelShipment(providerShipmentId: string): Promise<ProviderCancelResult>;

  /**
   * Generates a printable shipping label URL.
   */
  generateLabel(providerShipmentId: string): Promise<string>;

  /**
   * Cryptographically verifies incoming courier webhook signature.
   */
  verifyWebhook(rawBody: string | Buffer, signature: string): boolean;

  /**
   * Normalizes raw webhook payload into standard application webhook event.
   */
  parseWebhookPayload(body: any): WebhookEventPayload;

  /**
   * Normalizes provider status string into standard NormalizedShipmentStatus.
   */
  normalizeStatus(providerStatus: string): NormalizedShipmentStatus;

  /**
   * Dispatches a reverse pickup order to the logistics provider.
   */
  createReturnShipment?(data: CreateReturnShipmentInput): Promise<ProviderReturnShipmentResult>;

  /**
   * Retrieves tracking details for a reverse shipment.
   */
  trackReturnShipment?(providerShipmentId: string, awbNumber?: string): Promise<ProviderTrackingResult>;

  /**
   * Cancels a reverse pickup order with the provider.
   */
  cancelReturnShipment?(providerShipmentId: string): Promise<ProviderCancelResult>;
}
