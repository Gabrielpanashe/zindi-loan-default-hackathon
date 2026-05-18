import { MapPin } from "lucide-react";
import { Badge } from "./ui/Badge";

const PROVINCES = [
  { name: "Matabeleland South", rate: 28.6, tier: "high"   as const, apps: 2847 },
  { name: "Matabeleland North",  rate: 26.3, tier: "high"   as const, apps: 3102 },
  { name: "Masvingo",            rate: 24.8, tier: "high"   as const, apps: 3891 },
  { name: "Mashonaland East",    rate: 24.7, tier: "medium" as const, apps: 4203 },
  { name: "Mashonaland West",    rate: 24.6, tier: "medium" as const, apps: 4567 },
  { name: "Midlands",            rate: 23.1, tier: "medium" as const, apps: 3980 },
  { name: "Manicaland",          rate: 22.8, tier: "medium" as const, apps: 4120 },
  { name: "Mashonaland Central", rate: 22.4, tier: "medium" as const, apps: 3750 },
  { name: "Bulawayo",            rate: 20.1, tier: "low"    as const, apps: 5230 },
  { name: "Harare",              rate: 18.9, tier: "low"    as const, apps: 7242 },
];

const TIER_LABEL: Record<string, string> = {
  high: "High Risk", medium: "Medium Risk", low: "Low Risk",
};

interface GeoRiskTableProps {
  compact?: boolean;
}

export function GeoRiskTable({ compact = false }: GeoRiskTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[#8b9cb3] text-xs uppercase tracking-wide">
            <th className="text-left py-2 pr-4 font-medium">Province</th>
            <th className="text-left py-2 pr-4 font-medium">Risk Level</th>
            <th className="text-right py-2 pr-4 font-medium">Default Rate</th>
            {!compact && (
              <th className="text-right py-2 font-medium">Applications</th>
            )}
          </tr>
        </thead>
        <tbody>
          {PROVINCES.map((p) => (
            <tr
              key={p.name}
              className="border-t border-[#243044] hover:bg-[#243044]/40 transition-colors"
            >
              <td className="py-2.5 pr-4 flex items-center gap-2 text-[#e8eef4]">
                <MapPin size={13} className="text-[#8b9cb3] shrink-0" />
                {p.name}
              </td>
              <td className="py-2.5 pr-4">
                <Badge variant={p.tier}>{TIER_LABEL[p.tier]}</Badge>
              </td>
              <td className="py-2.5 pr-4 text-right font-mono font-semibold text-[#e8eef4]">
                <span
                  className={
                    p.tier === "high"
                      ? "text-red-400"
                      : p.tier === "medium"
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }
                >
                  {p.rate.toFixed(1)}%
                </span>
              </td>
              {!compact && (
                <td className="py-2.5 text-right text-[#8b9cb3]">
                  {p.apps.toLocaleString()}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
