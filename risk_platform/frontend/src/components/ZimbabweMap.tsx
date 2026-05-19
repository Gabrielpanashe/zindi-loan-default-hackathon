/**
 * ZimbabweRiskMap — Interactive SVG choropleth of Zimbabwe's 10 provinces
 * coloured by default rate from EDA training data.
 */

import { useState } from "react";

interface ProvinceData {
  name: string;
  defaultRate: number;       // 0–1  e.g. 0.27 = 27%
  totalApplications: number;
  topRiskFactor?: string;
}

interface ZimbabweRiskMapProps {
  provinceData?: ProvinceData[];
}

const DEFAULT_PROVINCE_DATA: ProvinceData[] = [
  { name: "Harare",               defaultRate: 0.189, totalApplications: 7242, topRiskFactor: "Informal sector concentration" },
  { name: "Bulawayo",             defaultRate: 0.201, totalApplications: 5230, topRiskFactor: "Manufacturing sector decline" },
  { name: "Manicaland",           defaultRate: 0.228, totalApplications: 4120, topRiskFactor: "Agricultural income volatility" },
  { name: "Mashonaland Central",  defaultRate: 0.224, totalApplications: 3750, topRiskFactor: "Rural informal economy" },
  { name: "Mashonaland East",     defaultRate: 0.247, totalApplications: 4203, topRiskFactor: "Mixed agricultural-urban profile" },
  { name: "Mashonaland West",     defaultRate: 0.246, totalApplications: 4567, topRiskFactor: "Mining sector dependency" },
  { name: "Masvingo",             defaultRate: 0.248, totalApplications: 3891, topRiskFactor: "Semi-arid agricultural risk" },
  { name: "Matabeleland North",   defaultRate: 0.263, totalApplications: 3102, topRiskFactor: "Low income density" },
  { name: "Matabeleland South",   defaultRate: 0.286, totalApplications: 2847, topRiskFactor: "High MFI loan concentration" },
  { name: "Midlands",             defaultRate: 0.231, totalApplications: 3980, topRiskFactor: "Industrial sector volatility" },
];

function getRiskColor(rate: number, opacity = 1): string {
  if (rate < 0.22)  return `rgba(16,  185, 129, ${opacity})`;  // emerald
  if (rate < 0.245) return `rgba(245, 158,  11, ${opacity})`;  // amber
  if (rate < 0.265) return `rgba(251, 146,  60, ${opacity})`;  // orange
  return                    `rgba(239,  68,  68, ${opacity})`;  // red
}

function getRiskLabel(rate: number): { label: string; cls: string } {
  if (rate < 0.22)  return { label: "Lower risk",    cls: "text-emerald-400" };
  if (rate < 0.245) return { label: "Average risk",  cls: "text-amber-400"   };
  if (rate < 0.265) return { label: "Elevated risk", cls: "text-orange-400"  };
  return                    { label: "Higher risk",  cls: "text-red-400"     };
}

const PROVINCE_SHAPES = [
  { name: "Harare",              path: "M 310 195 L 335 195 L 335 225 L 310 225 Z",                                                                          labelX: 322, labelY: 212 },
  { name: "Bulawayo",            path: "M 190 310 L 215 310 L 215 340 L 190 340 Z",                                                                          labelX: 202, labelY: 327 },
  { name: "Mashonaland West",    path: "M 100 80 L 280 80 L 280 200 L 200 200 L 200 220 L 130 220 L 100 180 Z",                                              labelX: 185, labelY: 145 },
  { name: "Mashonaland Central", path: "M 280 80 L 400 80 L 420 120 L 400 180 L 335 195 L 310 195 L 280 200 Z",                                              labelX: 355, labelY: 130 },
  { name: "Mashonaland East",    path: "M 335 195 L 400 180 L 430 200 L 450 260 L 400 280 L 360 260 L 335 225 Z",                                            labelX: 395, labelY: 230 },
  { name: "Manicaland",          path: "M 400 80 L 480 100 L 490 160 L 480 240 L 450 260 L 430 200 L 420 120 Z",                                             labelX: 450, labelY: 170 },
  { name: "Midlands",            path: "M 130 220 L 200 220 L 200 200 L 280 200 L 310 195 L 335 225 L 310 260 L 280 290 L 220 300 L 190 310 L 130 300 Z",   labelX: 230, labelY: 260 },
  { name: "Masvingo",            path: "M 280 290 L 310 260 L 360 260 L 400 280 L 420 340 L 380 390 L 300 390 L 260 360 L 230 320 L 220 300 Z",             labelX: 330, labelY: 335 },
  { name: "Matabeleland North",  path: "M 100 80 L 100 220 L 130 220 L 130 300 L 100 310 L 60 280 L 60 120 L 80 80 Z",                                      labelX: 82,  labelY: 195 },
  { name: "Matabeleland South",  path: "M 100 310 L 130 300 L 190 310 L 215 340 L 220 300 L 230 320 L 260 360 L 300 390 L 260 430 L 160 430 L 90 380 L 60 320 L 60 280 Z", labelX: 175, labelY: 385 },
];

export function ZimbabweMap({ provinceData = DEFAULT_PROVINCE_DATA }: ZimbabweRiskMapProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const dataMap = Object.fromEntries(provinceData.map((p) => [p.name, p]));
  const hoveredData = hovered ? dataMap[hovered] : null;
  const nationalAvg = provinceData.reduce((s, p) => s + p.defaultRate, 0) / provinceData.length;

  return (
    <div className="bg-[#1a2332] rounded-xl border border-[#243044] p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-[#e8eef4]">Geographic Risk Intelligence</h3>
          <p className="text-xs text-[#8b9cb3] mt-0.5">Province default rates from 38,932 training loans · Hover for details</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#8b9cb3]">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> &lt;22%</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> 22–24%</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block" /> 24–26%</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> &gt;26%</span>
        </div>
      </div>

      <div className="flex gap-6 flex-wrap">
        {/* SVG Map */}
        <div className="shrink-0">
          <svg viewBox="40 70 460 380" width="360" height="288" className="rounded-lg" style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.4))" }}>
            {PROVINCE_SHAPES.map((prov) => {
              const data = dataMap[prov.name];
              const rate = data?.defaultRate ?? nationalAvg;
              const isHovered = hovered === prov.name;
              return (
                <g
                  key={prov.name}
                  onMouseEnter={() => setHovered(prov.name)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: "pointer" }}
                >
                  <path
                    d={prov.path}
                    fill={getRiskColor(rate, isHovered ? 1 : 0.78)}
                    stroke={isHovered ? "#ffffff" : "#0f1419"}
                    strokeWidth={isHovered ? 2 : 0.8}
                    style={{ transition: "all 0.15s ease" }}
                  />
                  <text
                    x={prov.labelX}
                    y={prov.labelY}
                    fontSize="8"
                    fontFamily="DM Sans, system-ui"
                    fill="white"
                    textAnchor="middle"
                    style={{ pointerEvents: "none", fontWeight: isHovered ? 700 : 400, opacity: 0.92 }}
                  >
                    {prov.name.split(" ").map((word, i) => (
                      <tspan key={i} x={prov.labelX} dy={i === 0 ? 0 : 10}>{word}</tspan>
                    ))}
                  </text>
                </g>
              );
            })}
          </svg>
          <p className="text-center text-xs text-[#8b9cb3] mt-1.5">
            National avg: {(nationalAvg * 100).toFixed(1)}% default rate
          </p>
        </div>

        {/* Right panel */}
        <div className="flex-1 min-w-[180px]">
          {hoveredData ? (
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-[#e8eef4] text-base">{hoveredData.name}</p>
                <p className={`text-sm font-medium ${getRiskLabel(hoveredData.defaultRate).cls}`}>
                  {getRiskLabel(hoveredData.defaultRate).label}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#0f1419] border border-[#243044] rounded-lg p-3">
                  <p className="text-[10px] text-[#8b9cb3] mb-0.5">Default rate</p>
                  <p className="text-2xl font-bold text-[#e8eef4]">
                    {(hoveredData.defaultRate * 100).toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-[#8b9cb3] mt-0.5">
                    {hoveredData.defaultRate > nationalAvg
                      ? `+${((hoveredData.defaultRate - nationalAvg) * 100).toFixed(1)}% above avg`
                      : `${((hoveredData.defaultRate - nationalAvg) * 100).toFixed(1)}% below avg`}
                  </p>
                </div>
                <div className="bg-[#0f1419] border border-[#243044] rounded-lg p-3">
                  <p className="text-[10px] text-[#8b9cb3] mb-0.5">Applications</p>
                  <p className="text-2xl font-bold text-[#e8eef4]">
                    {hoveredData.totalApplications.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-[#8b9cb3] mt-0.5">training loans</p>
                </div>
              </div>
              {hoveredData.topRiskFactor && (
                <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-amber-400 mb-1">Top risk driver</p>
                  <p className="text-xs text-amber-300">{hoveredData.topRiskFactor}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col gap-1.5 justify-center">
              <p className="text-xs text-[#8b9cb3] mb-1">All provinces (sorted by risk)</p>
              {[...provinceData]
                .sort((a, b) => b.defaultRate - a.defaultRate)
                .map((p) => (
                  <div
                    key={p.name}
                    className="flex items-center gap-2 text-xs px-2 py-1 rounded hover:bg-[#243044] transition-colors cursor-pointer"
                    onMouseEnter={() => setHovered(p.name)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: getRiskColor(p.defaultRate) }} />
                    <span className="flex-1 text-[#8b9cb3] truncate">{p.name}</span>
                    <span className="font-semibold text-[#e8eef4]">{(p.defaultRate * 100).toFixed(1)}%</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Named + default export so either import style works
export default ZimbabweMap;
