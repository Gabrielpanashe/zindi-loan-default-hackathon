import { type LucideIcon } from "lucide-react";
import { cn } from "./ui/cn";

interface KpiCardProps {
  title: string;
  value: string | number;
  delta?: string;
  deltaPositive?: boolean;
  icon?: LucideIcon;
  iconColor?: string;
  className?: string;
}

export function KpiCard({
  title,
  value,
  delta,
  deltaPositive,
  icon: Icon,
  iconColor = "text-[#3b82f6]",
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "bg-[#1a2332] border border-[#243044] rounded-[10px] p-5 flex flex-col gap-2",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#8b9cb3] uppercase tracking-wide">
          {title}
        </span>
        {Icon && (
          <span
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center bg-[#243044]",
              iconColor
            )}
          >
            <Icon size={16} />
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-[#e8eef4]">{value}</div>
      {delta && (
        <div
          className={cn(
            "text-xs font-medium flex items-center gap-1",
            deltaPositive ? "text-emerald-400" : "text-red-400"
          )}
        >
          <span>{deltaPositive ? "▲" : "▼"}</span>
          <span>{delta}</span>
        </div>
      )}
    </div>
  );
}
