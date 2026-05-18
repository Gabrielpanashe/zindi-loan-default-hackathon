import { useState } from "react";
import { motion } from "framer-motion";
import { Sliders, ArrowRight, TrendingDown, TrendingUp, ChevronRight } from "lucide-react";
import { api } from "../api";
import { PdGauge } from "../components/PdGauge";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";

type SimScore = {
  probability_default: number;
  recommendation: string;
  risk_tier: string;
  explanation: {
    narratives?: string[];
    top_contributions?: { feature: string; shap_value: number; direction: string }[];
  };
};

type SimResult = {
  baseline: SimScore;
  scenario: SimScore;
  delta_probability_default: number;
};

const PROVINCES = [
  "Harare","Bulawayo","Manicaland","Mashonaland_Central",
  "Mashonaland_East","Mashonaland_West","Masvingo",
  "Matabeleland_North","Matabeleland_South","Midlands",
];
const SECTORS = [
  "Agriculture","Civil_Servants","Finance","Government",
  "Informal_Sector","Mining","NGO","Telecom","Trade",
];

type Tier = "low" | "medium" | "high";

function ScoreCard({ score, label }: { score: SimScore; label: string }) {
  return (
    <div className="bg-[#1a2332] border border-[#243044] rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#8b9cb3] uppercase tracking-wide">{label}</span>
        <Badge variant={score.risk_tier as Tier}>{score.risk_tier} risk</Badge>
      </div>
      <PdGauge value={score.probability_default * 100} size="sm" />
      <div className="space-y-1.5">
        {(score.explanation.top_contributions || []).slice(0, 3).map((c, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-[#8b9cb3] truncate">{c.feature.replace(/_/g, " ")}</span>
            <span className={c.direction === "increases_risk" ? "text-red-400 font-mono" : "text-emerald-400 font-mono"}>
              {c.shap_value > 0 ? "+" : ""}{c.shap_value.toFixed(3)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Simulate() {
  const [income, setIncome] = useState(400);
  const [amount, setAmount] = useState(1500);
  const [term,   setTerm]   = useState(12);
  const [province, setProvince] = useState("Harare");
  const [sector, setSector] = useState("Civil_Servants");
  const [incomeDelta, setIncomeDelta] = useState(20);
  const [amountDelta, setAmountDelta] = useState(-10);
  const [result, setResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    setLoading(true);
    setError("");
    try {
      const app = await api<{ id: number }>("/applications/friendly", {
        method: "POST",
        body: JSON.stringify({
          applicant_segment: "sme",
          monthly_income_usd: income,
          amount_usd: amount,
          term_months: term,
          province,
          employment_sector: sector,
        }),
      });
      const sim = await api<SimResult>("/simulations", {
        method: "POST",
        body: JSON.stringify({
          base_application_id: app.id,
          deltas: {
            income_pct:  incomeDelta / 100,
            amount_pct: amountDelta / 100,
          },
        }),
      });
      setResult(sim);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  };

  const delta = result?.delta_probability_default ?? 0;
  const improved = delta < 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#e8eef4] mb-1 flex items-center gap-2">
          <Sliders size={22} className="text-[#3b82f6]" />
          What-If Simulation
        </h1>
        <p className="text-[#8b9cb3] text-sm">Adjust income or loan amount and instantly see how default probability changes.</p>
      </div>

      {/* Base profile */}
      <div className="bg-[#1a2332] border border-[#243044] rounded-xl p-5">
        <h3 className="font-semibold text-[#e8eef4] text-sm mb-4">Base Profile</h3>
        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          {[
            { label: "Monthly Income (USD)", value: income, setter: setIncome, min: 50, max: 5000 },
            { label: "Loan Amount (USD)",    value: amount, setter: setAmount, min: 100, max: 50000 },
            { label: "Term (months)",        value: term,   setter: setTerm,   min: 1,   max: 60 },
          ].map(({ label, value, setter, min, max }) => (
            <div key={label}>
              <label className="block text-xs text-[#8b9cb3] mb-1.5">{label}</label>
              <input
                type="number"
                value={value}
                min={min} max={max}
                onChange={(e) => setter(+e.target.value)}
                className="w-full px-3 py-2 bg-[#0f1419] border border-[#243044] rounded-lg text-[#e8eef4] text-sm focus:outline-none focus:border-[#3b82f6]"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs text-[#8b9cb3] mb-1.5">Province</label>
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="w-full px-3 py-2 bg-[#0f1419] border border-[#243044] rounded-lg text-[#e8eef4] text-sm focus:outline-none focus:border-[#3b82f6]"
            >
              {PROVINCES.map((p) => <option key={p} value={p}>{p.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#8b9cb3] mb-1.5">Employment Sector</label>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="w-full px-3 py-2 bg-[#0f1419] border border-[#243044] rounded-lg text-[#e8eef4] text-sm focus:outline-none focus:border-[#3b82f6]"
            >
              {SECTORS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
          </div>
        </div>

        <h3 className="font-semibold text-[#e8eef4] text-sm mb-4 pt-2 border-t border-[#243044]">Scenario Adjustments</h3>
        <div className="grid sm:grid-cols-2 gap-6">
          {/* Income slider */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-xs text-[#8b9cb3]">Income change</label>
              <span className={`text-sm font-bold ${incomeDelta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {incomeDelta >= 0 ? "+" : ""}{incomeDelta}%
              </span>
            </div>
            <input
              type="range" min={-50} max={100} step={5}
              value={incomeDelta}
              onChange={(e) => setIncomeDelta(+e.target.value)}
              className="w-full accent-[#3b82f6]"
            />
            <div className="flex justify-between text-[10px] text-[#8b9cb3] mt-1">
              <span>-50%</span><span>0</span><span>+100%</span>
            </div>
            <p className="text-xs text-[#8b9cb3] mt-1">
              {incomeDelta >= 0
                ? `If monthly income increases by ${incomeDelta}% to $${Math.round(income * (1 + incomeDelta / 100))}`
                : `If monthly income decreases by ${Math.abs(incomeDelta)}% to $${Math.round(income * (1 + incomeDelta / 100))}`}
            </p>
          </div>

          {/* Amount slider */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-xs text-[#8b9cb3]">Loan amount change</label>
              <span className={`text-sm font-bold ${amountDelta <= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {amountDelta >= 0 ? "+" : ""}{amountDelta}%
              </span>
            </div>
            <input
              type="range" min={-50} max={100} step={5}
              value={amountDelta}
              onChange={(e) => setAmountDelta(+e.target.value)}
              className="w-full accent-[#3b82f6]"
            />
            <div className="flex justify-between text-[10px] text-[#8b9cb3] mt-1">
              <span>-50%</span><span>0</span><span>+100%</span>
            </div>
            <p className="text-xs text-[#8b9cb3] mt-1">
              {amountDelta <= 0
                ? `If loan reduces by ${Math.abs(amountDelta)}% to $${Math.round(amount * (1 + amountDelta / 100))}`
                : `If loan increases by ${amountDelta}% to $${Math.round(amount * (1 + amountDelta / 100))}`}
            </p>
          </div>
        </div>

        {error && <p className="text-red-400 text-xs mt-3">{error}</p>}

        <div className="mt-5">
          <Button onClick={run} disabled={loading} size="lg" className="shadow-lg shadow-blue-500/20">
            {loading ? "Running simulation…" : <>Run Simulation <ArrowRight size={16} /></>}
          </Button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Delta banner */}
          <div className={`border rounded-xl px-5 py-4 flex items-center gap-4 ${
            improved
              ? "bg-emerald-900/20 border-emerald-700/30"
              : "bg-red-900/20 border-red-700/30"
          }`}>
            {improved ? (
              <TrendingDown size={28} className="text-emerald-400 shrink-0" />
            ) : (
              <TrendingUp size={28} className="text-red-400 shrink-0" />
            )}
            <div>
              <div className={`text-xl font-bold ${improved ? "text-emerald-400" : "text-red-400"}`}>
                {improved ? "▼" : "▲"} {Math.abs(delta * 100).toFixed(1)} percentage points
              </div>
              <div className="text-sm text-[#8b9cb3]">
                {improved
                  ? "Risk decreased — the scenario improves the applicant's profile."
                  : "Risk increased — the scenario worsens the applicant's risk profile."}
              </div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-xs text-[#8b9cb3]">Scenario recommendation</div>
              <Badge variant={result.scenario.recommendation as "approve" | "manual_review" | "reject"} className="mt-1">
                {result.scenario.recommendation.replace("_", " ")}
              </Badge>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <ScoreCard score={result.baseline} label="Baseline" />
            <ScoreCard score={result.scenario} label="Scenario" />
          </div>

          {/* Narrative */}
          {(result.scenario.explanation.narratives || []).length > 0 && (
            <div className="bg-[#1a2332] border border-[#243044] rounded-xl p-5">
              <h3 className="font-semibold text-[#e8eef4] text-sm mb-3">AI Explanation — Scenario</h3>
              <ul className="space-y-2">
                {result.scenario.explanation.narratives!.map((n, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#8b9cb3]">
                    <ChevronRight size={12} className="text-[#3b82f6] shrink-0 mt-0.5" />
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
