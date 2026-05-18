import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield, CheckCircle } from "lucide-react";
import { api } from "../api";
import { Button } from "../components/ui/Button";

type Policy = { id: number; name: string; approve_pd_max: number; review_pd_max: number };

function ThresholdSlider({
  label, value, onChange, min = 0, max = 1,
  hint, color,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; hint: string; color: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-[#e8eef4]">{label}</label>
        <span className={`text-lg font-bold ${color}`}>{(value * 100).toFixed(0)}%</span>
      </div>
      <input
        type="range" min={min} max={max} step={0.01} value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full accent-[#3b82f6]"
      />
      <div className="relative h-5 rounded-full overflow-hidden bg-[#243044]">
        <div className="absolute inset-y-0 left-0 bg-emerald-600/60 rounded-l-full" style={{ width: `${pct}%` }} />
        <div className="absolute inset-y-0 bg-amber-500/40" style={{ left: `${pct}%`, right: "0" }} />
      </div>
      <div className="flex justify-between text-[10px] text-[#8b9cb3]">
        <span>0%</span><span>50%</span><span>100%</span>
      </div>
      <p className="text-xs text-[#8b9cb3]">{hint}</p>
    </div>
  );
}

export default function Policies() {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [error, setSaveError]  = useState("");
  const [saved, setSaved]   = useState(false);

  useEffect(() => {
    api<Policy>("/policies").then(setPolicy).catch((e) => setSaveError(e.message));
  }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!policy) return;
    setSaveError("");
    try {
      await api<Policy>("/policies", {
        method: "PUT",
        body: JSON.stringify({
          approve_pd_max: policy.approve_pd_max,
          review_pd_max: policy.review_pd_max,
          name: policy.name,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    }
  };

  if (!policy) return <p className="text-[#8b9cb3]">Loading…</p>;

  const approveMax = policy.approve_pd_max * 100;
  const reviewMax  = policy.review_pd_max  * 100;

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-[#e8eef4] mb-1 flex items-center gap-2">
          <Shield size={22} className="text-[#3b82f6]" />
          Institution Policies
        </h1>
        <p className="text-[#8b9cb3] text-sm">Configure the risk thresholds for automatic approval, manual review, and rejection.</p>
      </div>

      <form onSubmit={save} className="space-y-5">
        <div className="bg-[#1a2332] border border-[#243044] rounded-xl p-5 space-y-6">
          <ThresholdSlider
            label="Auto-Approve threshold"
            value={policy.approve_pd_max}
            onChange={(v) => setPolicy({ ...policy, approve_pd_max: Math.min(v, policy.review_pd_max - 0.01) })}
            color="text-emerald-400"
            hint={`Applications with PD ≤ ${approveMax.toFixed(0)}% are automatically approved.`}
          />
          <ThresholdSlider
            label="Manual Review threshold"
            value={policy.review_pd_max}
            onChange={(v) => setPolicy({ ...policy, review_pd_max: Math.max(v, policy.approve_pd_max + 0.01) })}
            color="text-amber-400"
            hint={`Applications with PD ${approveMax.toFixed(0)}–${reviewMax.toFixed(0)}% go to manual review. Above ${reviewMax.toFixed(0)}% are auto-rejected.`}
          />
        </div>

        {/* Preview */}
        <div className="bg-[#1a2332] border border-[#243044] rounded-xl p-5">
          <h3 className="font-semibold text-[#e8eef4] text-sm mb-3">Current Decision Logic</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[#8b9cb3]">PD ≤ <strong className="text-emerald-400">{approveMax.toFixed(0)}%</strong> → Auto-Approve</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span className="text-[#8b9cb3]"><strong className="text-amber-400">{approveMax.toFixed(0)}%</strong> &lt; PD ≤ <strong className="text-amber-400">{reviewMax.toFixed(0)}%</strong> → Manual Review</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              <span className="text-[#8b9cb3]">PD &gt; <strong className="text-red-400">{reviewMax.toFixed(0)}%</strong> → Auto-Reject</span>
            </div>
          </div>
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <div className="flex items-center gap-4">
          <Button type="submit" size="lg" className="shadow-lg shadow-blue-500/20">
            Save Thresholds
          </Button>
          {saved && (
            <motion.div
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium"
            >
              <CheckCircle size={15} /> Saved successfully
            </motion.div>
          )}
        </div>
      </form>
    </div>
  );
}
