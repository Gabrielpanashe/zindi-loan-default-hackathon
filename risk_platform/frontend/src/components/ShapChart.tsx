import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Contrib = { feature: string; shap_value: number };

export default function ShapChart({ contributions }: { contributions: Contrib[] }) {
  const data = contributions.map((c) => ({
    name: c.feature.replace(/_/g, " ").slice(0, 24),
    value: c.shap_value,
  }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
        <XAxis type="number" stroke="#8b9cb3" />
        <YAxis type="category" dataKey="name" width={100} stroke="#8b9cb3" tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: "#1a2332", border: "1px solid #243044" }}
          labelStyle={{ color: "#e8eef4" }}
        />
        <Bar dataKey="value" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  );
}

