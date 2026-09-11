import React from 'react';
import { Modal } from '../components/ui/Modal';
import { StatusBadge } from '../components/ui/Badge';
import { useAdmin } from '../context/AdminContext';
import type { Order } from '../types';
import { Mail, Phone, MapPin, Calendar, CreditCard, CheckCircle2, Flame, Sparkles } from 'lucide-react';

interface OrderDetailsModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  const { products } = useAdmin();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Order Details - ${order.orderNumber}`}
      description={`Placed on ${order.date} by ${order.customerName}`}
      size="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold">Order Status:</span>
            <StatusBadge status={order.status} />
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Top Summary Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Order Status
            </span>
            <div className="mt-1">
              <StatusBadge status={order.status} />
            </div>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Payment Status
            </span>
            <div className="mt-1">
              <StatusBadge status={order.paymentStatus} />
            </div>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Payment Method
            </span>
            <span className="text-xs font-semibold text-slate-800 flex items-center gap-1 mt-1">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              {order.paymentMethod}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Order Date
            </span>
            <span className="text-xs font-semibold text-slate-800 flex items-center gap-1 mt-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {order.date}
            </span>
          </div>
        </div>

        {/* Customer & Shipping Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-200/80 bg-white">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
              Customer Info
            </h4>
            <p className="text-sm font-bold text-slate-800">{order.customerName}</p>
            <div className="space-y-1.5 mt-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{order.customerEmail}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{order.customerPhone}</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200/80 bg-white">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
              Shipping Address
            </h4>
            <div className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p>{order.shippingAddress.street}</p>
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.state} -{' '}
                  {order.shippingAddress.postalCode}
                </p>
                <p>{order.shippingAddress.country}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Order Items Table */}
        <div className="border border-slate-200/80 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200/80">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Ordered Products ({order.items.length})
            </h4>
          </div>
          <div className="divide-y divide-slate-100">
            {order.items.map((item) => {
              const matchedProduct = products.find(
                (p) => p.id === item.productId || p.name === item.productName || p.sku === item.sku
              );
              const isBestSeller = (item as any).isBestSeller ?? matchedProduct?.isBestSeller;
              const isNewArrival = (item as any).isNewArrival ?? matchedProduct?.isNewArrival;

              return (
                <div key={item.id} className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <img
                      src={item.image}
                      alt={item.productName}
                      className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0 shadow-2xs"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h5 className="text-xs font-semibold text-slate-900">{item.productName}</h5>
                        {isBestSeller && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                            <Flame className="w-2.5 h-2.5 text-amber-500 fill-amber-400" /> Best Seller
                          </span>
                        )}
                        {isNewArrival && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                            <Sparkles className="w-2.5 h-2.5 text-emerald-500" /> New Arrival
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        SKU: <span className="font-mono">{item.sku}</span>
                        {item.variant ? ` • ${item.variant}` : ''}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        ₹{item.price} × {item.quantity} qty
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between sm:block text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                    <span className="sm:hidden text-xs text-slate-500 font-medium">Subtotal:</span>
                    <span className="text-sm font-bold text-slate-900">
                      ₹{(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pricing Summary */}
          <div className="bg-slate-50/60 p-4 border-t border-slate-200/80 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>₹{order.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Shipping Fee</span>
              <span>{order.shippingFee === 0 ? 'FREE' : `₹${order.shippingFee}`}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Discount Applied</span>
                <span>-₹{order.discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Total Amount</span>
              <span className="text-indigo-600">₹{order.totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Order History Timeline */}
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
            Fulfillment Timeline
          </h4>
          <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {order.timeline.map((step, idx) => (
              <div key={idx} className="relative">
                <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-pink-100 border border-pink-300 flex items-center justify-center text-indigo-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-800">{step.status}</span>
                    <span className="text-[10px] text-slate-400">{step.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
