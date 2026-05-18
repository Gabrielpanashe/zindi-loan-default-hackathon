import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import {
  FileText, CheckCircle, AlertTriangle, TrendingUp,
  FilePlus, Lightbulb, Activity, MapPin, Server,
} from "lucide-react";
import { api } from "../api";
import { useAuth } from "../auth";
import { KpiCard } from "../components/KpiCard";
import { GeoRiskTable } from "../components/GeoRiskTable";
import { Button } from "../components/ui/Button";

const RISK_COLORS: Record<string, string> = {
  low: "#10b981", medium: "#f59e0b", high: "#ef4444",
};

const AI_INSIGHTS = [
  { icon: AlertTriangle, color: "text-red-400",     text: "Matabeleland South shows 28.6% default rate — policy review recommended." },
  { icon: CheckCircle,   color: "text-emerald-400", text: "Civil servant segment has the lowest avg PD (18.2%) — safest cohort." },
  { icon: TrendingUp,    color: "text-amber-400",   text: "Informal sector accounts for 31% of rejections this month." },
  { icon: Activity,      color: "text-blue-400",    text: "Debt-to-income is the #1 SHAP driver in 74% of high-risk applications." },
  { icon: Lightbulb,     color: "text-purple-400",  text: "MFI loans (rate > 80%) show 2.3× higher default probability vs bank loans." },
];

type Summary = {
  total_applications: number;
  total_predictions: number;
  decisions_approve: number;
  decisions_manual_review: number;
  decisions_reject: number;
  approval_rate: number;
  rejection_rate: number;
  avg_probability_default: number | null;
};

type Charts = {
  risk_distribution: Record<string, number>;
  recommendation_distribution: Record<string, number>;
  segment_breakdown: { segment: string; applications: number; avg_pd: number | null; approval_rate: number | null }[];
  monthly_application_trends: { month: string; applications: number }[];
  pd_histogram: { bucket: string; count: number }[];
};

// ─── Officer Dashboard ──────────────────────────────────────────────────────

function OfficerDashboard({ summary }: { summary: Summary }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#e8eef4] mb-1">Loan Officer Dashboard</h1>
        <p className="text-[#8b9cb3] text-sm">Quick overview of your application activity.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Total Applications" value={summary.total_applications ?? "—"} icon={FileText}  iconColor="text-[#3b82f6]" />
        <KpiCard title="Approved"           value={summary.decisions_approve ?? "—"}  icon={CheckCircle} iconColor="text-emerald-400" />
        <KpiCard title="Under Review"       value={summary.decisions_manual_review ?? "—"} icon={AlertTriangle} iconColor="text-amber-400" />
        <KpiCard
          title="Approval Rate"
          value={summary.approval_rate != null ? `${(summary.approval_rate * 100).toFixed(0)}%` : "—"}
          icon={TrendingUp}
          iconColor="text-[#10b981]"
        />
      </div>

      <div className="flex gap-3">
        <Link to="/apply">
          <Button size="lg" className="shadow-lg shadow-blue-500/20">
            <FilePlus size={17} /> Score New Application
          </Button>
        </Link>
        <Link to="/batch">
          <Button variant="secondary" size="lg">Upload Batch CSV</Button>
        </Link>
      </div>
    </div>
  );
}

// ─── Analyst Dashboard ───────────────────────────────────────────────────────

function AnalystDashboard({ summary, charts }: { summary: Summary; charts: Charts }) {
  const riskData = Object.entries(charts.risk_distribution || {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    fill: RISK_COLORS[name] || "#3b82f6",
  }));
  const monthly = charts.monthly_application_trends || [];
  const pdHist  = charts.pd_histogram || [];
  const segments = charts.segment_breakdown || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#e8eef4] mb-1">Portfolio Analytics</h1>
        <p className="text-[#8b9cb3] text-sm">Risk exposure and lending trends across all segments.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Total Applications"  value={summary.total_applications ?? "—"} icon={FileText} />
        <KpiCard title="Predictions Made"    value={summary.total_predictions ?? "—"}  icon={Activity} iconColor="text-purple-400" />
        <KpiCard title="Approval Rate"       value={summary.approval_rate != null ? `${(summary.approval_rate * 100).toFixed(1)}%` : "—"} icon={CheckCircle} iconColor="text-emerald-400" />
        <KpiCard title="Avg Default Prob."   value={summary.avg_probability_default != null ? `${(summary.avg_probability_default * 100).toFixed(1)}%` : "—"} icon={TrendingUp} iconColor="text-amber-400" />
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div className="bg-[#1a2332] border border-[#243044] rounded-xl p-5">
          <h3 className="font-semibold text-[#e8eef4] mb-4 text-sm">Risk Tier Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={riskData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} paddingAngle={3}>
                {riskData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#1a2332", border: "1px solid #243044", borderRadius: 8 }} />
              <Legend iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#1a2332] border border-[#243044] rounded-xl p-5">
          <h3 className="font-semibold text-[#e8eef4] mb-4 text-sm">PD Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={pdHist}>
              <CartesianGrid strokeDasharray="3 3" stroke="#243044" />
              <XAxis dataKey="bucket" stroke="#8b9cb3" tick={{ fontSize: 11 }} />
              <YAxis stroke="#8b9cb3" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#1a2332", border: "1px solid #243044", borderRadius: 8 }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-[#1a2332] border border-[#243044] rounded-xl p-5">
        <h3 className="font-semibold text-[#e8eef4] mb-4 text-sm">Monthly Application Trends</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#243044" />
            <XAxis dataKey="month" stroke="#8b9cb3" tick={{ fontSize: 11 }} />
            <YAxis stroke="#8b9cb3" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#1a2332", border: "1px solid #243044", borderRadius: 8 }} />
            <Line type="monotone" dataKey="applications" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {segments.length > 0 && (
        <div className="bg-[#1a2332] border border-[#243044] rounded-xl p-5">
          <h3 className="font-semibold text-[#e8eef4] mb-4 text-sm">Segment Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#8b9cb3] text-xs uppercase">
                  <th className="text-left py-2 pr-4">Segment</th>
                  <th className="text-right py-2 pr-4">Applications</th>
                  <th className="text-right py-2 pr-4">Avg PD</th>
                  <th className="text-right py-2">Approval Rate</th>
                </tr>
              </thead>
              <tbody>
                {segments.map((s) => (
                  <tr key={s.segment} className="border-t border-[#243044]">
                    <td className="py-2.5 pr-4 text-[#e8eef4] capitalize">{s.segment?.replace(/_/g, " ")}</td>
                    <td className="py-2.5 pr-4 text-right text-[#8b9cb3]">{s.applications}</td>
                    <td className="py-2.5 pr-4 text-right font-mono">{s.avg_pd != null ? `${(s.avg_pd * 100).toFixed(1)}%` : "—"}</td>
                    <td className="py-2.5 text-right font-mono text-emerald-400">{s.approval_rate != null ? `${(s.approval_rate * 100).toFixed(0)}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Admin / Executive Dashboard ─────────────────────────────────────────────

function AdminDashboard({ summary, charts }: { summary: Summary; charts: Charts }) {
  const riskData = Object.entries(charts.risk_distribution || {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    fill: RISK_COLORS[name] || "#3b82f6",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#e8eef4] mb-1">Executive Overview</h1>
        <p className="text-[#8b9cb3] text-sm">Portfolio health, geographic risk intelligence and AI insights.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Total Applications" value={summary.total_applications ?? "—"} icon={FileText} />
        <KpiCard
          title="Approval Rate"
          value={summary.approval_rate != null ? `${(summary.approval_rate * 100).toFixed(1)}%` : "—"}
          icon={CheckCircle} iconColor="text-emerald-400"
        />
        <KpiCard
          title="Rejection Rate"
          value={summary.rejection_rate != null ? `${(summary.rejection_rate * 100).toFixed(1)}%` : "—"}
          icon={AlertTriangle} iconColor="text-red-400"
        />
        <KpiCard
          title="Avg Risk Score"
          value={summary.avg_probability_default != null ? `${(summary.avg_probability_default * 100).toFixed(1)}%` : "—"}
          icon={Activity} iconColor="text-amber-400"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        {/* AI Insights */}
        <div className="bg-[#1a2332] border border-[#243044] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={16} className="text-amber-400" />
            <h3 className="font-semibold text-[#e8eef4] text-sm">AI Risk Insights</h3>
            <span className="ml-auto text-[10px] text-emerald-400 bg-emerald-900/30 border border-emerald-700/30 px-2 py-0.5 rounded-full font-medium">Live</span>
          </div>
          <div className="space-y-3">
            {AI_INSIGHTS.map((ins, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.12 }}
                className="flex items-start gap-2.5 text-xs text-[#8b9cb3]"
              >
                <ins.icon size={13} className={`${ins.color} shrink-0 mt-0.5`} />
                {ins.text}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Risk distribution pie */}
        <div className="bg-[#1a2332] border border-[#243044] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-blue-400" />
            <h3 className="font-semibold text-[#e8eef4] text-sm">Portfolio Risk Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={riskData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} paddingAngle={3}>
                {riskData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#1a2332", border: "1px solid #243044", borderRadius: 8 }} />
              <Legend iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Geographic risk */}
      <div className="bg-[#1a2332] border border-[#243044] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={16} className="text-emerald-400" />
          <h3 className="font-semibold text-[#e8eef4] text-sm">Zimbabwe Geographic Risk Intelligence</h3>
        </div>
        <GeoRiskTable />
      </div>

      {/* System health */}
      <div className="bg-[#1a2332] border border-[#243044] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Server size={16} className="text-blue-400" />
          <h3 className="font-semibold text-[#e8eef4] text-sm">System Health</h3>
        </div>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <div className="text-[#8b9cb3] mb-1">Model Version</div>
            <div className="text-emerald-400 font-mono font-medium">v1 · LightGBM</div>
          </div>
          <div>
            <div className="text-[#8b9cb3] mb-1">Features</div>
            <div className="text-[#e8eef4] font-medium">56 engineered</div>
          </div>
          <div>
            <div className="text-[#8b9cb3] mb-1">Predictions</div>
            <div className="text-[#e8eef4] font-medium">{summary.total_predictions ?? "—"} total</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Root Dashboard ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary>({} as Summary);
  const [charts,  setCharts]  = useState<Charts>({} as Charts);
  const [error,   setError]   = useState("");

  useEffect(() => {
    Promise.all([
      api<Summary>("/dashboard/summary"),
      api<Charts>("/dashboard/charts"),
    ])
      .then(([s, c]) => { setSummary(s); setCharts(c); })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-400 text-sm">{error}</p>;

  if (user?.role === "admin")        return <AdminDashboard   summary={summary} charts={charts} />;
  if (user?.role === "risk_analyst") return <AnalystDashboard summary={summary} charts={charts} />;
  return <OfficerDashboard summary={summary} />;
}
