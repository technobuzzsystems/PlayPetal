import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { recentActivities } from '../../data/dashboard';
import { ShoppingCart, Package, User, Clock } from 'lucide-react';

export const ActivityTimeline: React.FC = () => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <ShoppingCart className="w-3.5 h-3.5 text-sky-600" />;
      case 'product':
        return <Package className="w-3.5 h-3.5 text-amber-600" />;
      case 'customer':
        return <User className="w-3.5 h-3.5 text-pink-600" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getBadgeBg = (type: string) => {
    switch (type) {
      case 'order':
        return 'bg-sky-50 border-sky-200';
      case 'product':
        return 'bg-amber-50 border-amber-200';
      case 'customer':
        return 'bg-pink-50 border-pink-200';
      default:
        return 'bg-slate-100 border-slate-200';
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-row items-center justify-between pb-3 border-b-0">
        <div>
          <CardTitle>Recent Activity</CardTitle>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">Real-time store audit logs</p>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#16803C] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16803C] animate-pulse" />
          Live
        </span>
      </CardHeader>

      <CardContent className="pt-0 flex-1">
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {recentActivities.map((act) => (
            <div key={act.id} className="relative group">
              {/* Dot / Icon marker */}
              <div
                className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border flex items-center justify-center shadow-sm ${getBadgeBg(
                  act.type
                )}`}
              >
                {getIcon(act.type)}
              </div>

              <div className="flex flex-col">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900 leading-tight">
                    {act.title}
                  </span>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">{act.time}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">{act.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
