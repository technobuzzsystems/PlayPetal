import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200/80 rounded-md ${className}`} />
);

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 5,
}) => (
  <div className="w-full divide-y divide-slate-200">
    <div className="p-4 bg-slate-50 flex gap-4">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="p-4 flex gap-4 items-center bg-white">
        {Array.from({ length: columns }).map((_, c) => (
          <Skeleton key={c} className="h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

export const StatCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
    <div className="flex justify-between items-center mb-4">
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="h-10 w-10 rounded-xl" />
    </div>
    <Skeleton className="h-7 w-20 mb-2" />
    <Skeleton className="h-4 w-32" />
  </div>
);
