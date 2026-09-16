import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  RefreshCcw,
  AlertTriangle,
  Loader2,
  MapPin,
  Clock,
  ExternalLink,
} from 'lucide-react';

export interface TrackingEvent {
  id: string;
  providerEventId: string;
  providerStatus: string;
  normalizedStatus: string;
  location?: string;
  description?: string;
  eventTimestamp: string;
}

export interface ShipmentTrackingData {
  id: string;
  suborderId: string;
  suborderNumber: string;
  orderId: string;
  orderNumber: string;
  sellerId: string;
  sellerName: string;
  provider: string;
  providerShipmentId: string;
  awbNumber?: string;
  shippingCarrier?: string;
  labelUrl?: string;
  status: string;
  estimatedDeliveryDate?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
  trackingEvents: TrackingEvent[];
}

interface VendorTrackingModalProps {
  suborderId: string;
  orderNumber?: string;
  vendorId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const VendorTrackingModal: React.FC<VendorTrackingModalProps> = ({
  suborderId,
  orderNumber,
  vendorId,
  isOpen,
  onClose,
}) => {
  const [trackingData, setTrackingData] = useState<ShipmentTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchTracking = async (isManual = false) => {
    if (isManual) {
      setIsRefreshing(true);
    } else if (!trackingData) {
      setLoading(true);
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/vendors/${vendorId}/orders/${suborderId}/tracking`, {
        cache: 'no-store',
        credentials: 'include',
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ message: 'Failed to fetch vendor tracking.' }));
        throw new Error(errJson.message || 'Tracking information is not yet available for this shipment.');
      }

      const data = await res.json();
      setTrackingData(data);
      setError(null);
      setLastUpdatedAt(new Date().toLocaleTimeString('en-IN', { hour12: false }));
    } catch (err: any) {
      console.error('[Vendor Tracking Error]:', err);
      if (!trackingData) {
        setError(err.message || 'Failed to retrieve shipment tracking data.');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen && suborderId) {
      setTrackingData(null);
      setError(null);
      fetchTracking();
    }
  }, [isOpen, suborderId, vendorId]);

  // 25-30s Near-Real-Time Safe Polling Hook
  useEffect(() => {
    if (!isOpen || !suborderId) return;

    const status = (trackingData?.status || '').toUpperCase();
    const isTerminal = status === 'DELIVERED' || status === 'CANCELLED' || status === 'FAILED' || status === 'RTO';

    if (isTerminal) return;

    const interval = setInterval(() => {
      if (!isRefreshing && !loading) {
        fetchTracking(false);
      }
    }, 28000);

    return () => clearInterval(interval);
  }, [isOpen, suborderId, trackingData, isRefreshing, loading]);

  if (!isOpen) return null;

  const getNormalizedStepIndex = (status?: string): number => {
    const s = (status || '').toUpperCase();
    if (s === 'DELIVERED') return 5;
    if (s === 'OUT_FOR_DELIVERY') return 4;
    if (s === 'IN_TRANSIT') return 3;
    if (s === 'PICKED_UP') return 2;
    if (s === 'AWB_ASSIGNED' || s === 'PICKUP_SCHEDULED') return 1;
    return 0; // CREATED / CONFIRMED
  };

  const isTerminalState = (status?: string): boolean => {
    const s = (status || '').toUpperCase();
    return s === 'CANCELLED' || s === 'FAILED' || s === 'RTO';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100 pr-8">
          <div className="flex items-center gap-2">
            <Truck size={22} className="text-indigo-600" />
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Vendor Delivery Tracking
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Suborder #{suborderId} {orderNumber ? `(Order ${orderNumber})` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Near-Real-Time Tracking
            </span>

            {lastUpdatedAt && (
              <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
                Updated {lastUpdatedAt}
              </span>
            )}

            <button
              onClick={() => fetchTracking(true)}
              disabled={isRefreshing || loading}
              className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-full flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Tracking Status"
            >
              <RefreshCcw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {loading && !trackingData ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 size={36} className="animate-spin text-indigo-600 mx-auto" />
            <p className="text-sm font-bold text-slate-600">Fetching courier delivery events...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto text-amber-600">
              <AlertTriangle size={28} />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Tracking Notice</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">{error}</p>
            <button
              onClick={() => fetchTracking(true)}
              className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 px-5 py-2 rounded-full font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCcw size={14} /> Retry Fetch
            </button>
          </div>
        ) : trackingData ? (
          <div className="space-y-6">
            {/* Meta Summary Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Seller</span>
                <span className="font-extrabold text-slate-900">{trackingData.sellerName || 'Not available'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Carrier</span>
                <span className="font-extrabold text-sky-600">{trackingData.shippingCarrier || 'Not available'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">AWB Number</span>
                <span className="font-extrabold font-mono text-indigo-600">
                  {trackingData.awbNumber || 'Not available'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Shipment Status</span>
                <span
                  className={`font-black px-2 py-0.5 rounded-full border inline-block text-[11px] ${
                    trackingData.status === 'DELIVERED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : trackingData.status === 'CANCELLED'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : trackingData.status === 'FAILED' || trackingData.status === 'RTO'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-sky-50 text-sky-700 border-sky-200'
                  }`}
                >
                  {trackingData.status}
                </span>
              </div>
            </div>

            {/* Terminal Error States Banner */}
            {isTerminalState(trackingData.status) && (
              <div className="p-4 rounded-2xl border text-xs font-bold flex items-center gap-3 bg-red-50 border-red-200 text-red-800">
                <AlertTriangle size={20} className="shrink-0 text-red-600" />
                <div>
                  <div className="font-black text-sm text-red-900">
                    {trackingData.status === 'CANCELLED'
                      ? 'Shipment Cancelled'
                      : trackingData.status === 'FAILED'
                      ? 'Delivery Attempt Failed'
                      : 'Returned to Origin (RTO)'}
                  </div>
                  <div className="text-xs font-medium text-red-700 mt-0.5">
                    {trackingData.failureReason ||
                      (trackingData.status === 'CANCELLED'
                        ? 'This parcel shipment was cancelled.'
                        : trackingData.status === 'RTO'
                        ? 'The carrier was unable to complete delivery and is returning the parcel to origin.'
                        : 'Delivery attempt failed. Carrier will re-attempt or contact recipient.')}
                  </div>
                </div>
              </div>
            )}

            {/* Milestone Progress Tracker (Hidden if cancelled/failed/rto) */}
            {!isTerminalState(trackingData.status) && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Delivery Journey
                  </h4>
                  {trackingData.estimatedDeliveryDate && (
                    <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                      <Clock size={12} /> Est. Delivery:{' '}
                      {new Date(trackingData.estimatedDeliveryDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  )}
                </div>

                {(() => {
                  const stepIdx = getNormalizedStepIndex(trackingData.status);
                  const steps = [
                    'Confirmed',
                    'AWB Assigned',
                    'Picked Up',
                    'In Transit',
                    'Out for Delivery',
                    'Delivered',
                  ];

                  return (
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center pt-2">
                      {steps.map((label, i) => {
                        const isCompleted = i <= stepIdx;
                        const isCurrent = i === stepIdx;

                        return (
                          <div key={i} className="flex flex-col items-center">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                                isCurrent
                                  ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-md scale-110'
                                  : isCompleted
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 text-slate-400 border border-slate-200'
                              }`}
                            >
                              {isCompleted ? '✓' : i + 1}
                            </div>
                            <span
                              className={`text-[10px] font-extrabold mt-2 leading-tight ${
                                isCurrent
                                  ? 'text-indigo-600'
                                  : isCompleted
                                  ? 'text-emerald-700'
                                  : 'text-slate-400'
                              }`}
                            >
                              {label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Chronological Event Timeline */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Tracking Events (
                  {trackingData.trackingEvents ? trackingData.trackingEvents.length : 0} updates)
                </h4>

                <button
                  onClick={() => fetchTracking(true)}
                  disabled={isRefreshing}
                  className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCcw size={12} className={isRefreshing ? 'animate-spin' : ''} /> Refresh
                  Timeline
                </button>
              </div>

              {!trackingData.trackingEvents || trackingData.trackingEvents.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl text-center text-xs font-medium text-slate-500 border border-slate-200">
                  Tracking information will appear after the logistics provider scans the package.
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-200 ml-4 space-y-4 py-1">
                  {trackingData.trackingEvents.map((ev, idx) => (
                    <div key={ev.id || idx} className="relative pl-6">
                      <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-indigo-600 border-2 border-white shadow-xs"></div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-black text-slate-900">
                            {ev.normalizedStatus || ev.providerStatus}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-400">
                            {ev.eventTimestamp
                              ? new Date(ev.eventTimestamp).toLocaleString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Not available'}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-600">
                          {ev.description || 'Not available'}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin size={10} /> Location: {ev.location || 'Not available'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {trackingData.labelUrl && (
              <div className="pt-2 text-right">
                <a
                  href={trackingData.labelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline"
                >
                  <ExternalLink size={14} /> Download Shipping Label PDF
                </a>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
