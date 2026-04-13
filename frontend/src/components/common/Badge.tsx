import React from "react";
import { cn } from "@/lib/utils/cn";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "success" | "warning" | "error" | "info";
  size?: "sm" | "md";
  className?: string;
}

export default function Badge({
  children,
  variant = "primary",
  size = "md",
  className,
}: BadgeProps) {
  const variants = {
    primary:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    success:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    warning:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    error: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    info: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  };

  const sizes = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}