import React, { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { StatusBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { useAdmin } from '../context/AdminContext';
import { Boxes, CheckCircle2, AlertTriangle, XCircle, History, Search } from 'lucide-react';
import type { InventoryItem } from '../types';

export const Inventory: React.FC = () => {
  const { inventory, stockHistory } = useAdmin();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'In Stock' | 'Low Stock' | 'Out of Stock'>('All');

  // History Modal
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<InventoryItem | null>(null);

  // Stats calculation
  const totalItemsCount = inventory.length;
  const inStockCount = inventory.filter((i) => i.status === 'In Stock').length;
  const lowStockCount = inventory.filter((i) => i.status === 'Low Stock').length;
  const outOfStockCount = inventory.filter((i) => i.status === 'Out of Stock').length;

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Overview"
        description="Monitor warehouse inventory levels and view stock audit history"
        breadcrumbs={[{ label: 'Inventory' }]}
      />

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-11 h-11 rounded-xl bg-pink-50 text-[#ff91db] flex items-center justify-center">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Total Catalog SKUs
            </span>
            <span className="text-xl font-bold text-slate-900">{totalItemsCount}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Available & Healthy
            </span>
            <span className="text-xl font-bold text-emerald-700">{inStockCount}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Low Stock Alert
            </span>
            <span className="text-xl font-bold text-amber-700">{lowStockCount}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Out of Stock
            </span>
            <span className="text-xl font-bold text-rose-700">{outOfStockCount}</span>
          </div>
        </div>
      </div>

      {/* Inventory Table Card */}
      <Card>
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by product, SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#ff91db] focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {(['All', 'In Stock', 'Low Stock', 'Out of Stock'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === st ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Last Restocked</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img
                        src={item.image}
                        alt={item.productName}
                        className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                      <span className="font-semibold text-slate-900 text-xs">
                        {item.productName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-500 font-medium">
                    {item.sku}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {item.variant || 'Standard'}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs font-bold ${
                        item.currentStock === 0
                          ? 'text-rose-600'
                          : item.currentStock <= item.minThreshold
                          ? 'text-amber-600'
                          : 'text-slate-900'
                      }`}
                    >
                      {item.currentStock} <span className="text-[11px] font-normal text-slate-400">units</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">{item.lastRestocked}</TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="text-right">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => setSelectedItemForHistory(item)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                          title="View stock history log"
                        >
                          <History className="w-3.5 h-3.5 text-slate-500" />
                          <span>History</span>
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      {/* View History Modal */}
      {selectedItemForHistory && (
        <Modal
          isOpen={!!selectedItemForHistory}
          onClose={() => setSelectedItemForHistory(null)}
          title="Stock Adjustment History"
          description={`Audit trail for SKU ${selectedItemForHistory.sku}`}
          size="lg"
          footer={
            <button
              onClick={() => setSelectedItemForHistory(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Close
            </button>
          }
        >
          <div className="space-y-3">
            {!(stockHistory[selectedItemForHistory.id]?.length > 0) ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No previous manual adjustments recorded for this SKU.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {stockHistory[selectedItemForHistory.id].map((h) => (
                  <div key={h.id} className="p-3.5 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <span className="font-semibold text-slate-900 block">{h.reason}</span>
                      <span className="text-[11px] text-slate-400">
                        {h.date} • by {h.adjustedBy}
                      </span>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-bold ${
                          h.adjustment > 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {h.adjustment > 0 ? `+${h.adjustment}` : h.adjustment} units
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        New balance: {h.newStock}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
