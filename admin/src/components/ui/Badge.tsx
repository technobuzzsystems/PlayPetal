import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral' | 'outline';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  dot = false,
  className = '',
  ...props
}) => {
  const variantStyles = {
    success: 'bg-emerald-50 text-[#16803C] border-emerald-200 font-bold',
    warning: 'bg-amber-50 text-amber-800 border-amber-200 font-bold',
    danger: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
    info: 'bg-sky-50 text-sky-700 border-sky-200 font-bold',
    purple: 'bg-purple-50 text-purple-700 border-purple-200 font-bold',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200 font-bold',
    outline: 'bg-transparent text-slate-700 border-slate-300 font-bold',
  };

  const dotStyles = {
    success: 'bg-[#16803C]',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-sky-500',
    purple: 'bg-purple-500',
    neutral: 'bg-slate-400',
    outline: 'bg-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotStyles[variant]}`} />}
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = status.toLowerCase();

  if (['delivered', 'paid', 'active', 'approved', 'in stock'].includes(s)) {
    return <Badge variant="success" dot>{status}</Badge>;
  }
  if (['pending', 'low stock', 'scheduled'].includes(s)) {
    return <Badge variant="warning" dot>{status}</Badge>;
  }
  if (['cancelled', 'failed', 'rejected', 'out of stock', 'expired'].includes(s)) {
    return <Badge variant="danger" dot>{status}</Badge>;
  }
  if (['processing', 'shipped', 'confirmed'].includes(s)) {
    return <Badge variant="info" dot>{status}</Badge>;
  }
  if (['draft', 'inactive', 'hidden', 'refunded', 'disabled'].includes(s)) {
    return <Badge variant="neutral" dot>{status}</Badge>;
  }

  return <Badge variant="outline">{status}</Badge>;
};
