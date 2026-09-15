// ============================================================================
// PHASE 5B: SHIPPING & LOGISTICS TYPES
// ============================================================================

export type NormalizedShipmentStatus =
  | 'CREATED'
  | 'AWB_ASSIGNED'
  | 'PICKUP_SCHEDULED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED'
  | 'RTO';

export interface ShippingAddressInput {
  street?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  pincode?: string;
  country?: string;
}

export interface PackageItemInput {
  name: string;
  sku: string;
  units: number;
  sellingPrice: number;
  discount?: number;
}

export interface CreateShipmentInput {
  suborderId: string;
  suborderNumber: string;
  orderNumber: string;
  orderDate: Date;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: ShippingAddressInput;
  items: PackageItemInput[];
  paymentMethod: string;
  totalAmount: number;
  sellerId: string;
  sellerName: string;
  weightGrams?: number;
  lengthCm?: number;
  breadthCm?: number;
  heightCm?: number;
}

export interface ProviderShipmentResult {
  success: boolean;
  provider: string;
  providerShipmentId: string;
  awbNumber?: string;
  shippingCarrier?: string;
  labelUrl?: string;
  status: NormalizedShipmentStatus;
  rawResponse?: any;
  errorMessage?: string;
}

export interface ProviderTrackingEvent {
  providerEventId?: string;
  providerStatus: string;
  normalizedStatus: NormalizedShipmentStatus;
  location?: string;
  description?: string;
  eventTimestamp: Date;
}

export interface ProviderTrackingResult {
  success: boolean;
  providerShipmentId?: string;
  awbNumber?: string;
  currentStatus: NormalizedShipmentStatus;
  shippingCarrier?: string;
  estimatedDeliveryDate?: Date;
  events: ProviderTrackingEvent[];
  rawResponse?: any;
  errorMessage?: string;
}

export interface ProviderCancelResult {
  success: boolean;
  providerShipmentId: string;
  status: NormalizedShipmentStatus;
  errorMessage?: string;
}

export interface WebhookEventPayload {
  providerEventId: string;
  providerShipmentId?: string;
  awbNumber?: string;
  suborderNumber?: string;
  providerStatus: string;
  normalizedStatus: NormalizedShipmentStatus;
  location?: string;
  description?: string;
  eventTimestamp: Date;
  rawPayload: any;
}

// ============================================================================
// PHASE 5D: REVERSE LOGISTICS TYPES
// ============================================================================

export type NormalizedReverseShipmentStatus =
  | 'PICKUP_SCHEDULED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED'
  | 'RTO';

export interface CreateReturnShipmentInput {
  returnRequestId: string;
  returnNumber: string;
  suborderNumber: string;
  pickupCustomerName: string;
  pickupCustomerPhone?: string;
  pickupAddress: ShippingAddressInput;
  deliverySellerName: string;
  deliverySellerAddress?: ShippingAddressInput;
  items: PackageItemInput[];
  weightGrams?: number;
  lengthCm?: number;
  breadthCm?: number;
  heightCm?: number;
}

export interface ProviderReturnShipmentResult {
  success: boolean;
  provider: string;
  providerShipmentId: string;
  awbNumber?: string;
  shippingCarrier?: string;
  labelUrl?: string;
  status: NormalizedReverseShipmentStatus;
  rawResponse?: any;
  errorMessage?: string;
}
