import React from "react";
import { cn } from "@/lib/utils/cn";

interface ProviderCardProps {
  name: string;
  icon: React.ReactNode;
  status: "healthy" | "degraded" | "down";
  latency: number;
  cost: number;
  selected?: boolean;
  onClick?: () => void;
}

export default function ProviderCard({
  name,
  icon,
  status,
  latency,
  cost,
  selected = false,
  onClick,
}: ProviderCardProps) {
  const statusColor = {
    healthy: "bg-green-500",
    degraded: "bg-amber-500",
    down: "bg-red-500",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer",
        selected
          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
          : "border-slate-200 dark:border-slate-700 hover:border-indigo-400"
      )}
    >
      <div className="absolute top-3 right-3">
        <div className={cn("w-3 h-3 rounded-full", statusColor[status])} />
      </div>

      <div className="mb-2 text-2xl">{icon}</div>

      <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
        {name}
      </h4>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-600 dark:text-slate-400">Latency:</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {latency}ms
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600 dark:text-slate-400">Cost:</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            ${cost.toFixed(6)}/1k
          </span>
        </div>
      </div>

      {selected && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-b-lg" />
      )}
    </div>
  );
}