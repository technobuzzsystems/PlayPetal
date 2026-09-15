import React, { useState, useMemo } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { StatusBadge } from '../components/ui/Badge';
import { Pagination } from '../components/ui/Pagination';
import { EmptyState } from '../components/ui/EmptyState';
import { OrderDetailsModal } from './OrderDetailsModal';
import { VendorTrackingModal } from '../components/VendorTrackingModal';
import { useAdmin } from '../context/AdminContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  Truck,
  PackageCheck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import type { Order } from '../types';

export type OrderTab =
  | 'ALL'
  | 'NEW'
  | 'ACCEPTED_PROCESSING'
  | 'READY_TO_SHIP'
  | 'SHIPPED_IN_TRANSIT'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED_REJECTED'
  | 'RETURN_REFUND';

interface TabConfig {
  id: OrderTab;
  label: string;
}

const TABS: TabConfig[] = [
  { id: 'ALL', label: 'All Orders' },
  { id: 'NEW', label: 'New Orders' },
  { id: 'ACCEPTED_PROCESSING', label: 'Accepted / Processing' },
  { id: 'READY_TO_SHIP', label: 'Ready to Ship' },
  { id: 'SHIPPED_IN_TRANSIT', label: 'Shipped / In Transit' },
  { id: 'DELIVERED', label: 'Delivered' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CANCELLED_REJECTED', label: 'Cancelled / Rejected' },
  { id: 'RETURN_REFUND', label: 'Return / Refund' },
];

export const Orders: React.FC = () => {
  const {
    orders,
    acceptVendorOrder,
    rejectVendorOrder,
    createShipmentForSuborder,
    refreshOrders,
  } = useAdmin();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<OrderTab>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingModalOrder, setTrackingModalOrder] = useState<{
    suborderId: string;
    orderNumber: string;
    vendorId: string;
  } | null>(null);

  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const currentVendorId = user?.vendorId || 'vendor-1';

  // Filter orders by vendor if in Vendor view
  const scopedOrders = useMemo(() => {
    if (user?.role === 'VENDOR') {
      return orders.filter((o) =>
        o.items.some((it: any) => (it.vendorId || 'vendor-1') === currentVendorId)
      );
    }
    return orders;
  }, [orders, user, currentVendorId]);

  const getTabForOrder = (order: Order): OrderTab => {
    const status = (order.status || 'Pending').toUpperCase();
    if (status === 'PENDING') return 'NEW';
    if (status === 'ACCEPTED' || status === 'CONFIRMED' || status === 'PROCESSING')
      return 'ACCEPTED_PROCESSING';
    if (status === 'READY_TO_SHIP') return 'READY_TO_SHIP';
    if (status === 'SHIPPED' || status === 'IN_TRANSIT' || status === 'OUT_FOR_DELIVERY')
      return 'SHIPPED_IN_TRANSIT';
    if (status === 'DELIVERED') return 'DELIVERED';
    if (status === 'COMPLETED') return 'COMPLETED';
    if (status === 'CANCELLED' || status === 'REJECTED') return 'CANCELLED_REJECTED';
    if (status === 'RETURNED' || status === 'REFUNDED') return 'RETURN_REFUND';
    return 'ALL';
  };

  const tabCounts = useMemo(() => {
    const counts: Record<OrderTab, number> = {
      ALL: scopedOrders.length,
      NEW: 0,
      ACCEPTED_PROCESSING: 0,
      READY_TO_SHIP: 0,
      SHIPPED_IN_TRANSIT: 0,
      DELIVERED: 0,
      COMPLETED: 0,
      CANCELLED_REJECTED: 0,
      RETURN_REFUND: 0,
    };
    scopedOrders.forEach((o) => {
      const tab = getTabForOrder(o);
      if (tab && counts[tab] !== undefined) counts[tab]++;
    });
    return counts;
  }, [scopedOrders]);

  const filteredOrders = useMemo(() => {
    return scopedOrders.filter((o) => {
      const matchSearch =
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.customerName.toLowerCase().includes(search.toLowerCase()) ||
        o.productSummary.toLowerCase().includes(search.toLowerCase());

      const tab = getTabForOrder(o);
      const matchTab = activeTab === 'ALL' || tab === activeTab;
      const matchPayment = paymentFilter === 'All' || o.paymentStatus === paymentFilter;

      return matchSearch && matchTab && matchPayment;
    });
  }, [scopedOrders, search, activeTab, paymentFilter]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleAcceptOrder = async (order: Order) => {
    setActionLoading(order.id);
    try {
      await acceptVendorOrder(currentVendorId, order.id);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectOrderSubmit = async () => {
    if (!rejectingOrder || !rejectReasonInput.trim()) return;
    setActionLoading(rejectingOrder.id);
    try {
      await rejectVendorOrder(currentVendorId, rejectingOrder.id, rejectReasonInput.trim());
      setRejectingOrder(null);
      setRejectReasonInput('');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateShipment = async (order: Order) => {
    setActionLoading(order.id);
    try {
      const suborderId = (order as any).suborderId || (order as any).suborders?.[0]?.id || order.id;
      const data = await createShipmentForSuborder(suborderId);
      if (data && (data.id || data.suborderId || data.awbNumber)) {
        showToast(`Shipment created for ${order.orderNumber}! 🚚 AWB: ${data.awbNumber || 'Assigned'} (${data.shippingCarrier || 'Delhivery'})`, 'success');
        await refreshOrders();
      } else if (data && (data.error || data.message)) {
        showToast(data.message || data.error || 'Failed to create shipment.', 'error');
      }
    } catch (err) {
      showToast('Network error creating shipment.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={user?.role === 'VENDOR' ? 'Vendor Order Management' : 'Customer & Vendor Orders'}
        description={
          user?.role === 'VENDOR'
            ? 'Manage incoming shop orders, confirm stock readiness, trigger shipment dispatch, and track live carrier deliveries.'
            : 'Inspect Marketplace orders across all vendors, verify fulfillment milestones, and monitor delivery logistics.'
        }
        breadcrumbs={[{ label: 'Orders' }]}
        actions={
          <button
            onClick={() => refreshOrders()}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Sync Live Orders</span>
          </button>
        }
      />

      {/* Derived Lifecycle Navigation Tabs */}
      <div className="border-b border-slate-200 bg-white rounded-xl shadow-2xs p-1.5 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 min-w-max">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const count = tabCounts[tab.id] || 0;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    isActive ? 'bg-indigo-700/80 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Card>
        {/* Filters Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by order #, customer, item..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Payment filter */}
            <div className="flex-1 min-w-[140px] sm:flex-initial bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600">
              <select
                value={paymentFilter}
                onChange={(e) => {
                  setPaymentFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-transparent border-none focus:outline-none text-xs text-slate-700 cursor-pointer font-medium"
              >
                <option value="All">All Payments</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Payment Pending</option>
                <option value="Refunded">Refunded</option>
              </select>
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          {paginatedOrders.length === 0 ? (
            <EmptyState
              title="No orders found"
              description="No orders match your active tab or search criteria."
              actionLabel="Reset View"
              onAction={() => {
                setSearch('');
                setActiveTab('ALL');
                setPaymentFilter('All');
              }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Details</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total (₹)</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Fulfillment State</TableHead>
                  <TableHead className="text-right">Actions & Tracking</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.map((order) => {
                  const statusUpper = (order.status || 'Pending').toUpperCase();
                  const suborderId = (order as any).suborders?.[0]?.id || `subord-${order.id}`;
                  const isNew = statusUpper === 'PENDING';
                  const isAcceptedProcessing =
                    statusUpper === 'ACCEPTED' ||
                    statusUpper === 'CONFIRMED' ||
                    statusUpper === 'PROCESSING';
                  const isReadyToShip = statusUpper === 'READY_TO_SHIP';
                  const isShippedOrBeyond =
                    statusUpper === 'SHIPPED' ||
                    statusUpper === 'IN_TRANSIT' ||
                    statusUpper === 'OUT_FOR_DELIVERY' ||
                    statusUpper === 'DELIVERED' ||
                    statusUpper === 'COMPLETED';
                  const isRejectedOrCancelled =
                    statusUpper === 'REJECTED' || statusUpper === 'CANCELLED';

                  const rawPayMethod = String((order as any).paymentMethod || '').toLowerCase();
                  const isCOD = rawPayMethod.includes('cod') || rawPayMethod.includes('cash');
                  const isOnline = !isCOD;
                  const isPaidOrCaptured = String(order.paymentStatus || '').toLowerCase() === 'paid' || String(order.paymentStatus || '').toLowerCase() === 'captured';

                  const canCreateShipment = isCOD || (isOnline && isPaidOrCaptured);

                  return (
                    <TableRow
                      key={order.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <TableCell className="font-mono font-bold text-slate-900 text-xs">
                        <div>
                          <span>{order.orderNumber}</span>
                          <span className="block text-[10px] text-slate-400 font-sans font-normal">
                            {order.date}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 text-xs group-hover:text-indigo-600 transition-colors">
                            {order.customerName}
                          </span>
                          <span className="text-[11px] text-slate-400">{order.customerEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <span
                          className="truncate block text-xs text-slate-700 font-medium"
                          title={order.productSummary}
                        >
                          {order.productSummary}
                        </span>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[11px] text-slate-400">
                            {order.items.length} item{order.items.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-slate-900 text-xs">
                        ₹{order.totalAmount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={order.paymentStatus} />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <StatusBadge status={order.status} />
                          {(order as any).rejectionReason && isRejectedOrCancelled && (
                            <span className="block text-[10px] font-semibold text-rose-600 truncate max-w-[140px]" title={(order as any).rejectionReason}>
                              Reason: {(order as any).rejectionReason}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* State-aware action buttons */}
                          {isNew && (
                            <>
                              <button
                                onClick={() => handleAcceptOrder(order)}
                                disabled={actionLoading === order.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-2xs"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Accept</span>
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingOrder(order);
                                  setRejectReasonInput('');
                                }}
                                disabled={actionLoading === order.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors shadow-2xs"
                              >
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {isAcceptedProcessing && canCreateShipment && (
                            <button
                              onClick={() => handleCreateShipment(order)}
                              disabled={actionLoading === order.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-2xs"
                            >
                              <PackageCheck className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Create Shipment</span>
                            </button>
                          )}

                          {isAcceptedProcessing && !canCreateShipment && (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 shadow-2xs cursor-not-allowed opacity-90"
                              title="Online payment must be completed before shipment creation."
                            >
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                              <span>Payment Required</span>
                            </span>
                          )}

                          {(isReadyToShip || isShippedOrBeyond) && (
                            <button
                              onClick={() =>
                                setTrackingModalOrder({
                                  suborderId,
                                  orderNumber: order.orderNumber,
                                  vendorId: currentVendorId,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors shadow-2xs"
                            >
                              <Truck className="w-3.5 h-3.5 text-sky-600" />
                              <span>Track Delivery</span>
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                            title="View Full Order Details"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredOrders.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(p) => setCurrentPage(p)}
          />
        </CardContent>
      </Card>

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onTrackDelivery={(orderNum) => {
            const subId = (selectedOrder as any).suborders?.[0]?.id || `subord-${selectedOrder.id}`;
            setSelectedOrder(null);
            setTrackingModalOrder({
              suborderId: subId,
              orderNumber: orderNum,
              vendorId: currentVendorId,
            });
          }}
        />
      )}

      {/* Vendor Delivery Tracking Modal */}
      {trackingModalOrder && (
        <VendorTrackingModal
          suborderId={trackingModalOrder.suborderId}
          vendorId={trackingModalOrder.vendorId}
          orderNumber={trackingModalOrder.orderNumber}
          isOpen={!!trackingModalOrder}
          onClose={() => setTrackingModalOrder(null)}
        />
      )}

      {/* Rejection Reason Modal */}
      {rejectingOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <AlertCircle className="w-5 h-5" />
              <span>Reject Order #{rejectingOrder.orderNumber}</span>
            </div>
            <p className="text-xs text-slate-600">
              Please provide a clear reason for rejecting this order. The customer and system audit log will be notified.
            </p>
            <textarea
              value={rejectReasonInput}
              onChange={(e) => setRejectReasonInput(e.target.value)}
              placeholder="e.g., Item out of stock, vendor inventory damaged..."
              className="w-full h-24 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-rose-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectingOrder(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectOrderSubmit}
                disabled={!rejectReasonInput.trim()}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
