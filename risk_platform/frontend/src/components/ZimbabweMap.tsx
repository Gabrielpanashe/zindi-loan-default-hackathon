import { useState } from "react";
import { Badge } from "./ui/Badge";

interface ProvinceData {
  id: string;
  name: string;
  rate: number;
  apps: number;
  sector: string;
  path: string;
}

const PROVINCES: ProvinceData[] = [
  { id: "mash_west",    name: "Mashonaland West",    rate: 24.6, apps: 4567, sector: "Agriculture",    path: "M 10 10 L 205 10 L 205 45 L 215 175 L 130 205 L 10 205 Z" },
  { id: "mash_central", name: "Mashonaland Central", rate: 22.4, apps: 3750, sector: "Agriculture",    path: "M 205 10 L 315 10 L 315 45 L 300 130 L 270 160 L 215 175 L 205 45 Z" },
  { id: "mash_east",    name: "Mashonaland East",    rate: 24.7, apps: 4203, sector: "Trade",          path: "M 315 10 L 395 10 L 445 38 L 448 180 L 400 195 L 300 160 L 270 160 L 300 130 L 315 45 Z" },
  { id: "manicaland",   name: "Manicaland",          rate: 22.8, apps: 4120, sector: "Agriculture",    path: "M 395 10 L 480 10 L 480 285 L 400 265 L 400 195 L 448 180 L 445 38 Z" },
  { id: "harare",       name: "Harare",              rate: 18.9, apps: 7242, sector: "Government",     path: "M 315 112 L 372 112 L 372 162 L 315 162 Z" },
  { id: "midlands",     name: "Midlands",            rate: 23.1, apps: 3980, sector: "Mining",         path: "M 130 205 L 215 175 L 300 160 L 400 195 L 400 265 L 300 278 L 130 278 Z" },
  { id: "mat_north",    name: "Matabeleland North",  rate: 26.3, apps: 3102, sector: "Agriculture",    path: "M 10 205 L 130 205 L 130 278 L 130 345 L 10 345 Z" },
  { id: "bulawayo",     name: "Bulawayo",            rate: 20.1, apps: 5230, sector: "Trade",          path: "M 80 270 L 130 270 L 130 320 L 80 320 Z" },
  { id: "masvingo",     name: "Masvingo",            rate: 24.8, apps: 3891, sector: "Agriculture",    path: "M 130 278 L 300 278 L 400 265 L 400 345 L 300 375 L 130 375 L 130 345 Z" },
  { id: "mat_south",    name: "Matabeleland South",  rate: 28.6, apps: 2847, sector: "Livestock",      path: "M 10 345 L 130 345 L 130 375 L 300 375 L 300 410 L 10 410 Z" },
];

function riskColor(rate: number): { fill: string; stroke: string } {
  if (rate >= 25)  return { fill: "#7f1d1d", stroke: "#ef4444" };
  if (rate >= 22)  return { fill: "#78350f", stroke: "#f59e0b" };
  return             { fill: "#064e3b", stroke: "#10b981" };
}

function riskTier(rate: number): "high" | "medium" | "low" {
  return rate >= 25 ? "high" : rate >= 22 ? "medium" : "low";
}

interface Tooltip { x: number; y: number; province: ProvinceData }

export function ZimbabweMap() {
  const [selected, setSelected] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);

  return (
    <div className="relative">
      <p className="text-xs text-[#8b9cb3] mb-3">
        Hover a province for details · Colour scale: <span className="text-emerald-400">■ Low</span> · <span className="text-amber-400">■ Medium</span> · <span className="text-red-400">■ High</span> default risk
      </p>

      <svg
        viewBox="0 0 490 425"
        className="w-full max-w-lg mx-auto"
        style={{ filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.4))" }}
        onMouseLeave={() => setTooltip(null)}
      >
        {PROVINCES.map((p) => {
          const { fill, stroke } = riskColor(p.rate);
          const isSelected = selected === p.id;
          return (
            <path
              key={p.id}
              d={p.path}
              fill={fill}
              stroke={isSelected ? "#ffffff" : stroke}
              strokeWidth={isSelected ? 2.5 : 1.2}
              opacity={selected && !isSelected ? 0.5 : 1}
              className="cursor-pointer transition-all duration-150"
              onClick={() => setSelected(selected === p.id ? null : p.id)}
              onMouseEnter={(e) => {
                const svgRect = (e.currentTarget.ownerSVGElement as SVGElement).getBoundingClientRect();
                const pt = { x: e.clientX - svgRect.left, y: e.clientY - svgRect.top };
                setTooltip({ x: pt.x, y: pt.y, province: p });
              }}
              onMouseMove={(e) => {
                const svgRect = (e.currentTarget.ownerSVGElement as SVGElement).getBoundingClientRect();
                setTooltip((t) => t ? { ...t, x: e.clientX - svgRect.left, y: e.clientY - svgRect.top } : null);
              }}
            />
          );
        })}

        {/* Province name labels */}
        {PROVINCES.filter((p) => p.id !== "harare" && p.id !== "bulawayo").map((p) => {
          // Approximate label centres
          const centres: Record<string, [number, number]> = {
            mash_west: [95, 105], mash_central: [252, 85], mash_east: [355, 95],
            manicaland: [438, 145], midlands: [252, 232], mat_north: [65, 272],
            masvingo: [258, 325], mat_south: [155, 385],
          };
          const [cx, cy] = centres[p.id] ?? [0, 0];
          if (!cx) return null;
          return (
            <text key={p.id} x={cx} y={cy} textAnchor="middle" fontSize="9" fill="#e8eef4" opacity="0.85" pointerEvents="none" fontFamily="DM Sans, system-ui">
              {p.name.split(" ").map((w, i) => (
                <tspan key={i} x={cx} dy={i === 0 ? 0 : 10}>{w}</tspan>
              ))}
            </text>
          );
        })}

        {/* Harare label */}
        <text x="343" y="140" fontSize="8" fill="#e8eef4" opacity="0.9" pointerEvents="none" fontFamily="DM Sans, system-ui">Harare</text>
        <text x="88" y="298" fontSize="8" fill="#e8eef4" opacity="0.9" pointerEvents="none" fontFamily="DM Sans, system-ui">Bulawayo</text>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-20 bg-[#0f1419] border border-[#3b82f6]/40 rounded-xl px-3 py-2.5 shadow-xl pointer-events-none text-xs min-w-[170px]"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <p className="font-semibold text-[#e8eef4] mb-1.5">{tooltip.province.name}</p>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[#8b9cb3]">Default rate:</span>
            <Badge variant={riskTier(tooltip.province.rate)} className="text-[10px] px-1.5 py-0">
              {tooltip.province.rate.toFixed(1)}%
            </Badge>
          </div>
          <p className="text-[#8b9cb3]">Applications: <span className="text-[#e8eef4]">{tooltip.province.apps.toLocaleString()}</span></p>
          <p className="text-[#8b9cb3]">Top sector: <span className="text-[#e8eef4]">{tooltip.province.sector}</span></p>
        </div>
      )}

      {/* Selected province detail */}
      {selected && (() => {
        const p = PROVINCES.find((pr) => pr.id === selected)!;
        return (
          <div className="mt-3 bg-[#0f1419] border border-[#243044] rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#e8eef4]">{p.name}</p>
              <p className="text-xs text-[#8b9cb3] mt-0.5">Top sector: {p.sector} · {p.apps.toLocaleString()} applications</p>
            </div>
            <Badge variant={riskTier(p.rate)}>{p.rate.toFixed(1)}% default</Badge>
          </div>
        );
      })()}
    </div>
  );
}
