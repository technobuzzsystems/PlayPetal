import { ShoppingCart, Users, Package, TrendingUp, TrendingDown } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string;
  change: string;
  isPositive?: boolean;
  timeframe?: string;
  iconName: 'DollarSign' | 'ShoppingCart' | 'Users' | 'Package';
  color?: string;
}

const RupeeIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 3h12" />
    <path d="M6 8h12" />
    <path d="m6 13 8.5 8" />
    <path d="M6 13h3" />
    <path d="M9 13c6.667 0 6.667-10 0-10" />
  </svg>
);

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  isPositive = true,
  timeframe = 'vs last month',
  iconName,
}) => {
  const iconMap = {
    DollarSign: <RupeeIcon className="w-5 h-5 text-[#16803C]" />,
    ShoppingCart: <ShoppingCart className="w-5 h-5 text-[#2196F3]" />,
    Users: <Users className="w-5 h-5 text-[#F7255A]" />,
    Package: <Package className="w-5 h-5 text-[#FF9800]" />,
  };

  const bgMap = {
    DollarSign: 'bg-emerald-50 border-emerald-200',
    ShoppingCart: 'bg-blue-50 border-blue-200',
    Users: 'bg-pink-50 border-pink-200',
    Package: 'bg-amber-50 border-amber-200',
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs transition-all duration-200 hover:border-[#D90429]/30 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</span>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${bgMap[iconName]}`}>
          {iconMap[iconName]}
        </div>
      </div>

      <div className="mt-4">
        <h2 className="text-2xl font-black text-[#202124] tracking-tight">{value}</h2>
        <div className="flex items-center gap-1.5 mt-2 text-xs">
          <span
            className={`inline-flex items-center gap-0.5 font-bold px-2 py-0.5 rounded-full ${
              isPositive ? 'text-[#16803C] bg-emerald-50' : 'text-red-600 bg-red-50'
            }`}
          >
            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {change}
          </span>
          <span className="text-slate-400 font-medium">{timeframe}</span>
        </div>
      </div>
    </div>
  );
};
