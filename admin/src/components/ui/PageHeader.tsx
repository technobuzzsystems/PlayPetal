import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export const Breadcrumb: React.FC<{ items: BreadcrumbItem[] }> = ({ items }) => {
  return (
    <nav className="flex items-center text-xs text-slate-500 mb-2 font-medium">
      <Link to="/" className="hover:text-[#D90429] flex items-center gap-1 transition-colors">
        <Home className="w-3.5 h-3.5 text-slate-400" />
        <span>Admin</span>
      </Link>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-slate-300 shrink-0" />
          {item.href && index < items.length - 1 ? (
            <Link to={item.href} className="hover:text-[#D90429] transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="font-bold text-slate-900">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumbs,
  actions,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        {breadcrumbs && <Breadcrumb items={breadcrumbs} />}
        <h1 className="text-2xl font-black text-[#202124] tracking-tight">{title}</h1>
        {description && <p className="text-sm text-slate-500 mt-1 font-medium">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
};
