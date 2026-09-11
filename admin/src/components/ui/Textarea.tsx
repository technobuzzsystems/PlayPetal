import React, { forwardRef } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', id, rows = 3, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-semibold text-slate-700 mb-1.5">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          className={`w-full rounded-xl border bg-slate-50 px-3 py-2 text-sm text-[#202124] transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D90429]/20 focus:border-[#D90429] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 resize-y ${
            error ? 'border-red-500 focus:border-red-500' : 'border-slate-200 hover:border-slate-300'
          } ${className}`}
          {...props}
        />
        {error ? (
          <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-slate-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}) => {
  return (
    <label className={`flex items-start gap-3 select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#D90429]/30 ${
          checked ? 'bg-[#D90429]' : 'bg-slate-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="text-sm font-medium text-slate-800">{label}</span>}
          {description && <span className="text-xs text-slate-500">{description}</span>}
        </div>
      )}
    </label>
  );
};
