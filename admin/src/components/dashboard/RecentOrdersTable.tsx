import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/Table';
import { StatusBadge } from '../ui/Badge';
import { Dropdown } from '../ui/Dropdown';
import { useAdmin } from '../../context/AdminContext';
import { useToast } from '../../context/ToastContext';
import { MoreVertical, Eye, CheckCircle2, Truck, XCircle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { OrderStatus } from '../../types';
import { OrderDetailsModal } from '../../pages/OrderDetailsModal';

interface RecentOrdersTableProps {
  activeDateFilter?: 'today' | 'week' | 'month';
}

export const RecentOrdersTable: React.FC<RecentOrdersTableProps> = ({ activeDateFilter = 'month' }) => {
  const { orders, updateOrderStatus } = useAdmin();
  const { showToast } = useToast();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Filter based on active date filter
  const displayedOrders = React.useMemo(() => {
    if (activeDateFilter === 'today') {
      const todayOnly = orders.filter((o) => (o.date || '').includes('Sep 04'));
      return todayOnly.length > 0 ? todayOnly : orders.slice(0, 2);
    }
    return orders.slice(0, 5);
  }, [orders, activeDateFilter]);

  const subtitle =
    activeDateFilter === 'today'
      ? 'Orders placed today (Sep 04, 2026)'
      : activeDateFilter === 'week'
      ? 'Orders placed this week (Sep 01 - Sep 07)'
      : 'Latest purchase requests from parents';

  const handleStatusChange = (orderId: string, orderNumber: string, newStatus: OrderStatus) => {
    updateOrderStatus(orderId, newStatus);
    showToast(`Order ${orderNumber} updated to ${newStatus}`, 'success');
  };

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>Recent Orders</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">{subtitle}</p>
          </div>
          <Link
            to="/admin/orders"
            className="text-xs font-bold text-[#D90429] hover:text-[#B7092B] flex items-center gap-0.5"
          >
            All orders <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-bold text-slate-900 font-mono text-xs">
                    {order.orderNumber}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 text-xs">{order.customerName}</span>
                      <span className="text-[11px] text-slate-500">{order.customerPhone}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <span className="truncate block text-xs text-slate-700" title={order.productSummary}>
                      {order.productSummary}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 whitespace-nowrap">{order.date}</TableCell>
                  <TableCell className="font-black text-slate-900 text-xs">₹{order.totalAmount.toLocaleString()}</TableCell>
                  <TableCell>
                    <StatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Dropdown
                      trigger={
                        <button className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      }
                      items={[
                        {
                          label: 'View Details',
                          icon: <Eye className="w-3.5 h-3.5" />,
                          onClick: () => setSelectedOrderId(order.id),
                        },
                        {
                          label: 'Mark as Processing',
                          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
                          onClick: () => handleStatusChange(order.id, order.orderNumber, 'Processing'),
                        },
                        {
                          label: 'Mark as Shipped',
                          icon: <Truck className="w-3.5 h-3.5" />,
                          onClick: () => handleStatusChange(order.id, order.orderNumber, 'Shipped'),
                        },
                        {
                          label: 'Mark as Delivered',
                          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
                          onClick: () => handleStatusChange(order.id, order.orderNumber, 'Delivered'),
                        },
                        {
                          label: 'Cancel Order',
                          icon: <XCircle className="w-3.5 h-3.5 text-rose-500" />,
                          danger: true,
                          onClick: () => handleStatusChange(order.id, order.orderNumber, 'Cancelled'),
                        },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </>
  );
};
