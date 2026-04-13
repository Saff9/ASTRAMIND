import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface AlertProps {
  type: "success" | "error" | "warning" | "info";
  title?: string;
  message: string;
  onClose?: () => void;
}

export default function Alert({
  type,
  title,
  message,
  onClose,
}: AlertProps) {
  const styles = {
    success: {
      bg: "bg-green-50 dark:bg-green-900/20",
      border: "border-green-200 dark:border-green-800",
      text: "text-green-800 dark:text-green-200",
      icon: "✓",
    },
    error: {
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-200 dark:border-red-800",
      text: "text-red-800 dark:text-red-200",
      icon: "✕",
    },
    warning: {
      bg: "bg-amber-50 dark:bg-amber-900/20",
      border: "border-amber-200 dark:border-amber-800",
      text: "text-amber-800 dark:text-amber-200",
      icon: "!",
    },
    info: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "border-blue-200 dark:border-blue-800",
      text: "text-blue-800 dark:text-blue-200",
      icon: "i",
    },
  };

  const style = styles[type];

  return (
    <div
      className={cn(
        "rounded-lg border p-4 flex gap-4 items-start",
        style.bg,
        style.border,
        style.text
      )}
    >
      <span className="text-xl font-bold mt-0.5">{style.icon}</span>

      <div className="flex-1">
        {title && <h4 className="font-semibold mb-1">{title}</h4>}
        <p className="text-sm">{message}</p>
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="text-lg hover:opacity-70 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}