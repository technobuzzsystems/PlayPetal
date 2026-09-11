import React, { useState, useMemo } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { StatusBadge } from '../components/ui/Badge';
import { Pagination } from '../components/ui/Pagination';
import { EmptyState } from '../components/ui/EmptyState';
import { OrderDetailsModal } from './OrderDetailsModal';
import { useAdmin } from '../context/AdminContext';
import { Search, Filter, Eye, Flame, Sparkles } from 'lucide-react';
import type { Order } from '../types';

export const Orders: React.FC = () => {
  const { orders, products } = useAdmin();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [paymentFilter, setPaymentFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.customerName.toLowerCase().includes(search.toLowerCase()) ||
        o.productSummary.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'All' || o.status === statusFilter;
      const matchPayment = paymentFilter === 'All' || o.paymentStatus === paymentFilter;
      return matchSearch && matchStatus && matchPayment;
    });
  }, [orders, search, statusFilter, paymentFilter]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customer Orders"
        description="View customer orders, check payment status, and inspect delivery and toy item details"
        breadcrumbs={[{ label: 'Orders' }]}
      />

      <Card>
        {/* Filters bar */}
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
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#ff91db] focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Status filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-none focus:outline-none text-xs text-slate-700 cursor-pointer font-medium"
              >
                <option value="All">All Order Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Processing">Processing</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {/* Payment filter */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600">
              <select
                value={paymentFilter}
                onChange={(e) => {
                  setPaymentFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-none focus:outline-none text-xs text-slate-700 cursor-pointer font-medium"
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
              description="No customer orders match your search criteria."
              actionLabel="Clear Filters"
              onAction={() => {
                setSearch('');
                setStatusFilter('All');
                setPaymentFilter('All');
              }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Purchased Items</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total (₹)</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.map((order) => (
                  <TableRow
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="cursor-pointer hover:bg-slate-50/80 transition-colors group"
                  >
                    <TableCell className="font-mono font-bold text-slate-900 text-xs">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 text-xs group-hover:text-sky-600 transition-colors">
                          {order.customerName}
                        </span>
                        <span className="text-[11px] text-slate-400">{order.customerEmail}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <span className="truncate block text-xs text-slate-700 font-medium" title={order.productSummary}>
                        {order.productSummary}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[11px] text-slate-400">
                          {order.items.length} item{order.items.length > 1 ? 's' : ''}
                        </span>
                        {order.items.some((item) => {
                          const p = products.find((prod) => prod.id === item.productId || prod.name === item.productName);
                          return (item as any).isBestSeller || p?.isBestSeller;
                        }) && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                            <Flame className="w-2.5 h-2.5 text-amber-500 fill-amber-400" /> Best Seller
                          </span>
                        )}
                        {order.items.some((item) => {
                          const p = products.find((prod) => prod.id === item.productId || prod.name === item.productName);
                          return (item as any).isNewArrival || p?.isNewArrival;
                        }) && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                            <Sparkles className="w-2.5 h-2.5 text-emerald-500" /> New Arrival
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                      {order.date}
                    </TableCell>
                    <TableCell className="font-bold text-slate-900 text-xs">
                      ₹{order.totalAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={order.paymentStatus} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(order);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 hover:text-sky-800 transition-colors cursor-pointer border border-sky-200/60 shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-sky-600" />
                        <span>View Details</span>
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
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
        />
      )}
    </div>
  );
};
