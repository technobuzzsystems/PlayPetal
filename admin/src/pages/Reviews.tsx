import React, { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { StatusBadge } from '../components/ui/Badge';
import { ConfirmModal } from '../components/ui/Modal';
import { useAdmin } from '../context/AdminContext';
import { useToast } from '../context/ToastContext';
import { Star, CheckCircle2, XCircle, EyeOff, Trash2 } from 'lucide-react';
import type { Review } from '../types';

export const Reviews: React.FC = () => {
  const { reviews, updateReviewStatus, deleteReview } = useAdmin();
  const { showToast } = useToast();

  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [reviewToDelete, setReviewToDelete] = useState<Review | null>(null);

  const filteredReviews = reviews.filter((r) => {
    if (statusFilter === 'All') return true;
    return r.status === statusFilter;
  });

  const handleStatusChange = (id: string, newStatus: Review['status']) => {
    updateReviewStatus(id, newStatus);
    showToast(`Review marked as ${newStatus}`, 'success');
  };

  const handleDelete = () => {
    if (reviewToDelete) {
      deleteReview(reviewToDelete.id);
      showToast('Review permanently removed', 'success');
      setReviewToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Reviews & Ratings"
        description="Moderate customer testimonials, verify purchased product feedback, and approve verified ratings"
        breadcrumbs={[{ label: 'Reviews' }]}
      />

      <Card>
        {/* Filter bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-full sm:w-auto overflow-x-auto max-w-full scrollbar-none">
            {(['All', 'Pending', 'Approved', 'Rejected', 'Hidden'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
                  statusFilter === s ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-500 font-medium">
            Showing {filteredReviews.length} reviews
          </span>
        </div>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Feedback</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Moderation Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReviews.map((rev) => (
                <TableRow key={rev.id}>
                  <TableCell className="w-48">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={rev.productImage}
                        alt={rev.productName}
                        className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                      <span className="font-semibold text-slate-900 text-xs truncate max-w-[140px]" title={rev.productName}>
                        {rev.productName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-800 text-xs">{rev.customerName}</span>
                      <span className="text-[11px] text-slate-400">{rev.customerEmail}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">
                      "{rev.comment}"
                    </p>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                    {rev.date}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={rev.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {rev.status !== 'Approved' && (
                        <button
                          onClick={() => handleStatusChange(rev.id, 'Approved')}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="Approve"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      {rev.status !== 'Rejected' && (
                        <button
                          onClick={() => handleStatusChange(rev.id, 'Rejected')}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Reject"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                      {rev.status !== 'Hidden' && (
                        <button
                          onClick={() => handleStatusChange(rev.id, 'Hidden')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Hide from Store"
                        >
                          <EyeOff className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setReviewToDelete(rev)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      {reviewToDelete && (
        <ConfirmModal
          isOpen={!!reviewToDelete}
          onClose={() => setReviewToDelete(null)}
          onConfirm={handleDelete}
          title="Delete Review?"
          message={`Are you sure you want to remove feedback from ${reviewToDelete.customerName}?`}
          confirmText="Delete Review"
          isDanger
        />
      )}
    </div>
  );
};
