import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "xl";
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  fullWidth = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = cn(
    "inline-flex items-center justify-center gap-2",
    "font-medium rounded-lg transition-all duration-200",
    "focus:outline-none focus:ring-2 focus:ring-offset-2",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    "whitespace-nowrap btn-base",
    fullWidth && "w-full"
  );

  const variants = {
    primary: cn(
      "bg-gradient-to-r from-indigo-500 to-purple-500",
      "text-white",
      "hover:from-indigo-600 hover:to-purple-600",
      "focus:ring-indigo-400",
      "dark:from-indigo-600 dark:to-purple-600",
      "dark:hover:from-indigo-700 dark:hover:to-purple-700",
      "shadow-lg hover:shadow-xl"
    ),
    secondary: cn(
      "bg-slate-200 dark:bg-slate-700",
      "text-slate-900 dark:text-slate-100",
      "hover:bg-slate-300 dark:hover:bg-slate-600",
      "focus:ring-slate-400"
    ),
    outline: cn(
      "border-2 border-indigo-500",
      "text-indigo-600 dark:text-indigo-400",
      "hover:bg-indigo-50 dark:hover:bg-indigo-900/20",
      "focus:ring-indigo-400",
      "bg-transparent"
    ),
    ghost: cn(
      "text-slate-700 dark:text-slate-300",
      "hover:bg-slate-100 dark:hover:bg-slate-800",
      "focus:ring-slate-400",
      "bg-transparent"
    ),
    danger: cn(
      "bg-red-500 text-white",
      "hover:bg-red-600",
      "focus:ring-red-400",
      "shadow-lg hover:shadow-xl"
    ),
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-base",
    lg: "px-6 py-3 text-lg",
    xl: "px-8 py-4 text-xl",
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}