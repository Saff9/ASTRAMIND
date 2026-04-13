import React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: boolean;
  icon?: React.ReactNode;
}

export default function Input({
  label,
  error,
  success,
  icon,
  className,
  disabled,
  ...props
}: InputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}

      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
            {icon}
          </div>
        )}

        <input
          className={cn(
            "w-full px-4 py-3 rounded-lg",
            "border-2 transition-all duration-200",
            "bg-white dark:bg-slate-900",
            icon ? "pl-12" : "",
            disabled && "bg-slate-100 dark:bg-slate-800 cursor-not-allowed",
            error
              ? "border-red-500 focus:border-red-600 focus:ring-red-100"
              : success
              ? "border-green-500 focus:border-green-600 focus:ring-green-100"
              : "border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-100",
            "text-slate-900 dark:text-slate-100",
            "placeholder-slate-500 dark:placeholder-slate-400",
            "focus:outline-none focus:ring-2",
            className
          )}
          disabled={disabled}
          {...props}
        />

        {error && (
          <AlertCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
        )}

        {success && (
          <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}