import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer';

  const sizeStyles = {
    xs: 'px-2 py-1 text-xs gap-1',
    sm: 'px-2.5 py-1.5 text-xs gap-1.5',
    md: 'px-3.5 py-2 text-sm gap-2',
    lg: 'px-4.5 py-2.5 text-base gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-[#D90429] hover:bg-[#B7092B] text-white shadow-md shadow-[#D90429]/20 border border-transparent focus:ring-[#D90429]/40',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 shadow-sm focus:ring-slate-300',
    outline: 'border-2 border-[#D90429] text-[#D90429] hover:bg-[#D90429]/10 focus:ring-[#D90429]/30 font-bold',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 border border-transparent focus:ring-rose-500/40',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 focus:ring-slate-200',
  };

  return (
    <button
      type={type}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : leftIcon ? (
        <span className="shrink-0">{leftIcon}</span>
      ) : null}
      {children}
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
