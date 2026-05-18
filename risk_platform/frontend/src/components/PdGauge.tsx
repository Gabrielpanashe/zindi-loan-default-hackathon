interface PdGaugeProps {
  value: number; // 0–100
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = { sm: 140, md: 200, lg: 260 };

export function PdGauge({ value, size = "md" }: PdGaugeProps) {
  const dim = SIZE_MAP[size];
  const cx = dim / 2;
  const cy = dim / 2;
  const r = dim * 0.38;
  const strokeWidth = dim * 0.075;
  const startAngle = -210;
  const endAngle = 30;
  const totalArc = endAngle - startAngle; // 240 degrees

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const arc = (from: number, to: number) => {
    const x1 = cx + r * Math.cos(toRad(from));
    const y1 = cy + r * Math.sin(toRad(from));
    const x2 = cx + r * Math.cos(toRad(to));
    const y2 = cy + r * Math.sin(toRad(to));
    const large = to - from > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  // Clamped 0–100
  const clamped = Math.max(0, Math.min(100, value));
  const fillAngle = startAngle + (clamped / 100) * totalArc;

  const zoneColor =
    clamped <= 30 ? "#10b981" : clamped <= 60 ? "#f59e0b" : "#ef4444";
  const label =
    clamped <= 30 ? "Low Risk" : clamped <= 60 ? "Medium Risk" : "High Risk";

  const trackColor = "#243044";
  const fs = dim * 0.14;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={dim} height={dim * 0.72} viewBox={`0 0 ${dim} ${dim * 0.72}`}>
        {/* background track */}
        <path
          d={arc(startAngle, endAngle)}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* filled arc */}
        {clamped > 0 && (
          <path
            d={arc(startAngle, fillAngle)}
            fill="none"
            stroke={zoneColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}
        {/* center text */}
        <text
          x={cx}
          y={cy * 0.92}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#e8eef4"
          fontSize={fs}
          fontWeight="700"
          fontFamily="DM Sans, system-ui"
        >
          {clamped.toFixed(1)}%
        </text>
        <text
          x={cx}
          y={cy * 0.92 + fs * 1.3}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={zoneColor}
          fontSize={fs * 0.55}
          fontWeight="600"
          fontFamily="DM Sans, system-ui"
        >
          {label}
        </text>
      </svg>
    </div>
  );
}
