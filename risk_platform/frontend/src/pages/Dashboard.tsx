import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { api } from "../api";

const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#3b82f6"];

export default function Dashboard() {
  const [summary, setSummary] = useState<Record<string, number | null>>({});
  const [charts, setCharts] = useState<Record<string, unknown>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api<Record<string, number | null>>("/dashboard/summary"),
      api<Record<string, unknown>>("/dashboard/charts"),
    ])
      .then(([s, c]) => {
        setSummary(s);
        setCharts(c);
      })
      .catch((e) => setError(e.message));
  }, []);

  const riskData = Object.entries(
    (charts.risk_distribution as Record<string, number>) || {}
  ).map(([name, value]) => ({ name, value }));

  const monthly = (charts.monthly_application_trends as { month: string; applications: number }[]) || [];
  const pdHist = (charts.pd_histogram as { bucket: string; count: number }[]) || [];

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Portfolio risk dashboard</h2>
      <p style={{ color: "var(--muted)" }}>
        Executive view for banks, MFIs, and risk assurance — decision support, not automated denial.
      </p>
      {error && <p className="error">{error}</p>}
      <div className="card kpi-row">
        {[
          ["Applications", summary.total_applications],
          ["Predictions", summary.total_predictions],
          ["Approval rate", summary.approval_rate != null ? `${(summary.approval_rate * 100).toFixed(0)}%` : "—"],
          ["Avg PD", summary.avg_probability_default != null ? `${(summary.avg_probability_default * 100).toFixed(1)}%` : "—"],
        ].map(([lbl, val]) => (
          <div key={String(lbl)} className="kpi">
            <div className="val">{val ?? "—"}</div>
            <div className="lbl">{lbl}</div>
          </div>
        ))}
      </div>
      <div className="grid2">
        <div className="card">
          <h2>Risk tier distribution</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={riskData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {riskData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h2>PD histogram</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pdHist}>
              <CartesianGrid strokeDasharray="3 3" stroke="#243044" />
              <XAxis dataKey="bucket" stroke="#8b9cb3" />
              <YAxis stroke="#8b9cb3" />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card">
        <h2>Monthly applications</h2>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#243044" />
            <XAxis dataKey="month" stroke="#8b9cb3" />
            <YAxis stroke="#8b9cb3" />
            <Tooltip />
            <Line type="monotone" dataKey="applications" stroke="#10b981" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
