import React, { useState, useRef, useEffect } from 'react';

export interface DropdownItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  align = 'right',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-2 w-48 rounded-xl bg-white shadow-xl border border-slate-200 py-1.5 z-40 focus:outline-none animate-in fade-in zoom-in-95 duration-100 text-slate-900`}
        >
          {items.map((item, index) => (
            <button
              key={index}
              disabled={item.disabled}
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2 text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                item.danger
                  ? 'text-rose-600 hover:bg-rose-50 hover:text-rose-700'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {item.icon && <span className="w-4 h-4 shrink-0 text-slate-400">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
