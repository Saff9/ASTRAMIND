import React from "react";
import { cn } from "@/lib/utils/cn";

interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  tooltip?: string;
}

export default function IconButton({
  icon,
  variant = "ghost",
  size = "md",
  tooltip,
  className,
  disabled,
  ...props
}: IconButtonProps) {
  const sizes = {
    sm: "p-1.5 w-8 h-8",
    md: "p-2.5 w-10 h-10",
    lg: "p-3.5 w-12 h-12",
  };

  const variants = {
    primary: cn(
      "bg-indigo-500 text-white",
      "hover:bg-indigo-600",
      "focus:ring-indigo-400"
    ),
    secondary: cn(
      "bg-slate-200 dark:bg-slate-700",
      "text-slate-900 dark:text-slate-100",
      "hover:bg-slate-300 dark:hover:bg-slate-600"
    ),
    ghost: cn(
      "text-slate-700 dark:text-slate-300",
      "hover:bg-slate-100 dark:hover:bg-slate-800"
    ),
  };

  return (
    <button
      title={tooltip}
      className={cn(
        "rounded-lg transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "flex items-center justify-center",
        sizes[size],
        variants[variant],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {icon}
    </button>
  );
}