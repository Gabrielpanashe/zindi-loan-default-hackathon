import { useEffect, useState } from "react";
import { ClipboardList, FileText, Activity, Layers, BarChart3 } from "lucide-react";
import { api } from "../api";
import { Badge } from "../components/ui/Badge";

type Log = {
  id: number;
  actor_id: number | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

type Filter = "all" | "application" | "score" | "simulation" | "batch";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all",         label: "All" },
  { key: "application", label: "Applications" },
  { key: "score",       label: "Scoring" },
  { key: "simulation",  label: "Simulations" },
  { key: "batch",       label: "Batch" },
];

function actionBadge(action: string) {
  if (action.includes("score"))      return { variant: "approve" as const, icon: Activity,  label: action };
  if (action.includes("create"))     return { variant: "loan_officer" as const, icon: FileText, label: action };
  if (action.includes("simulation")) return { variant: "medium" as const,   icon: BarChart3, label: action };
  if (action.includes("batch"))      return { variant: "risk_analyst" as const, icon: Layers, label: action };
  return { variant: "default" as const, icon: ClipboardList, label: action };
}

export default function Audit() {
  const [logs, setLogs]     = useState<Log[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError]   = useState("");

  useEffect(() => {
    api<Log[]>("/audit?limit=200")
      .then(setLogs)
      .catch((e) => setError(e.message));
  }, []);

  const filtered = filter === "all"
    ? logs
    : logs.filter((l) => l.action.toLowerCase().includes(filter));

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-[#e8eef4] mb-1 flex items-center gap-2">
          <ClipboardList size={22} className="text-[#3b82f6]" />
          Audit Trail
        </h1>
        <p className="text-[#8b9cb3] text-sm">Complete log of all platform actions for compliance and governance.</p>
      </div>

      {/* filter tabs */}
      <div className="flex gap-1 p-1 bg-[#1a2332] border border-[#243044] rounded-lg w-fit">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              filter === f.key
                ? "bg-[#243044] text-[#e8eef4]"
                : "text-[#8b9cb3] hover:text-[#e8eef4]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <div className="bg-[#1a2332] border border-[#243044] rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-[#8b9cb3] text-sm">No audit entries.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[#243044]">
              <tr className="text-[#8b9cb3] text-xs uppercase">
                <th className="text-left px-5 py-3 font-medium">Time</th>
                <th className="text-left px-5 py-3 font-medium">Action</th>
                <th className="text-left px-5 py-3 font-medium">Entity</th>
                <th className="text-left px-5 py-3 font-medium">Actor</th>
                <th className="text-right px-5 py-3 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, idx) => {
                const { variant, icon: Icon } = actionBadge(l.action);
                return (
                  <tr
                    key={l.id}
                    className={`border-t border-[#243044] hover:bg-[#243044]/30 transition-colors ${
                      idx % 2 === 0 ? "" : "bg-[#243044]/10"
                    }`}
                  >
                    <td className="px-5 py-3 text-[#8b9cb3] whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Icon size={13} className="text-[#8b9cb3] shrink-0" />
                        <Badge variant={variant} className="text-[10px]">
                          {l.action.replace(/\./g, " › ")}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[#8b9cb3]">
                      {l.entity_type ? `${l.entity_type} #${l.entity_id}` : "—"}
                    </td>
                    <td className="px-5 py-3 text-[#8b9cb3]">
                      {l.actor_id != null ? `User #${l.actor_id}` : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {l.detail && Object.keys(l.detail).length > 0 ? (
                        <span className="text-[10px] font-mono text-[#8b9cb3] bg-[#243044] px-2 py-0.5 rounded">
                          {Object.entries(l.detail).map(([k, v]) => `${k}:${String(v).slice(0, 10)}`).join(" · ")}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
