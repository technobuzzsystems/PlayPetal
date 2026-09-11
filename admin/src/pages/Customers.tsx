import React, { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { StatusBadge } from '../components/ui/Badge';
import { Dropdown } from '../components/ui/Dropdown';
import { Pagination } from '../components/ui/Pagination';
import { CustomerDetailsModal } from './CustomerDetailsModal';
import { useAdmin } from '../context/AdminContext';
import { useToast } from '../context/ToastContext';
import { Search, Eye, UserCheck, UserX, MoreVertical, Mail, Phone } from 'lucide-react';
import type { Customer } from '../types';

export const Customers: React.FC = () => {
  const { customers, toggleCustomerStatus } = useAdmin();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1;
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleToggleStatus = (cust: Customer) => {
    toggleCustomerStatus(cust.id);
    showToast(
      `Customer ${cust.name} status switched to ${cust.status === 'Active' ? 'Inactive' : 'Active'}`,
      'info'
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customers Directory"
        description="View registered accounts, purchase totals, contact info, and activity history"
        breadcrumbs={[{ label: 'Customers' }]}
      />

      <Card>
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer name, email, phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
            />
          </div>

          <span className="text-xs font-semibold text-slate-500">
            Total registered: <span className="text-slate-900 font-bold">{customers.length}</span>
          </span>
        </div>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Total Spent (₹)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCustomers.map((cust) => (
                <TableRow key={cust.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img
                        src={cust.avatar}
                        alt={cust.name}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                      <span className="font-semibold text-slate-900 text-xs">{cust.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {cust.email}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {cust.phone}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-slate-800">
                    {cust.totalOrders}
                  </TableCell>
                  <TableCell className="text-xs font-bold text-slate-900">
                    ₹{cust.totalSpent.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={cust.status} />
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                    {cust.joinedDate}
                  </TableCell>
                  <TableCell className="text-right">
                    <Dropdown
                      trigger={
                        <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      }
                      items={[
                        {
                          label: 'View Profile & Orders',
                          icon: <Eye className="w-3.5 h-3.5" />,
                          onClick: () => setSelectedCustomer(cust),
                        },
                        {
                          label: cust.status === 'Active' ? 'Deactivate Account' : 'Activate Account',
                          icon:
                            cust.status === 'Active' ? (
                              <UserX className="w-3.5 h-3.5 text-rose-500" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                            ),
                          danger: cust.status === 'Active',
                          onClick: () => handleToggleStatus(cust),
                        },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredCustomers.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(p) => setCurrentPage(p)}
          />
        </CardContent>
      </Card>

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <CustomerDetailsModal
          customer={selectedCustomer}
          isOpen={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </div>
  );
};
