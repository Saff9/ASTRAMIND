import React from "react";
import { cn } from "@/lib/utils/cn";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  gradient?: boolean;
}

export default function Card({
  children,
  className,
  hoverable = false,
  gradient = false,
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 dark:border-slate-700",
        "bg-white dark:bg-slate-900",
        gradient
          ? "bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800"
          : "",
        hoverable
          ? "hover:shadow-xl cursor-pointer transition-shadow duration-300"
          : "shadow-lg",
        "p-6",
        className
      )}
    >
      {children}
    </div>
  );
}