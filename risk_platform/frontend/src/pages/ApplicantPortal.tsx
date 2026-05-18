import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FilePlus, FileText, ChevronRight, Brain, LogOut, HelpCircle, ChevronDown } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../auth";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { PdGauge } from "../components/PdGauge";

type AppRecord = {
  id: number;
  created_at: string;
  raw_payload: { amount_usd?: number; term_months?: number };
  predictions?: { probability_default: number; recommendation?: string; risk_tier?: string }[];
};

type ScoreOut = {
  prediction_id: number;
  probability_default: number;
  recommendation: string;
  risk_tier: string;
  explanation: { narratives?: string[]; top_contributions?: { feature: string; shap_value: number; direction: string }[] };
  policy_snapshot: Record<string, unknown>;
};

type FriendlyForm = {
  amount_usd: number;
  monthly_income_usd: number;
  term_months: number;
  province: string;
  employment_sector?: string;
  existing_obligations: number;
  applicant_segment: string;
};

const PROVINCES = [
  "Harare", "Bulawayo", "Manicaland", "Mashonaland_Central",
  "Mashonaland_East", "Mashonaland_West", "Masvingo",
  "Matabeleland_North", "Matabeleland_South", "Midlands",
];

const SECTORS = [
  "Agriculture", "Civil_Servants", "Finance", "Government",
  "Informal_Sector", "Mining", "NGO", "Telecom", "Trade",
];

const SEGMENTS = ["farmer", "sme", "civil_servant", "informal_trader", "government_employee"];

const ACCORDION_ITEMS = [
  {
    q: "How does the AI risk score work?",
    a: "The system analyses your income, loan amount, employment, province, and other factors using a LightGBM model trained on 38,932 historical loans. Each decision is explained with the top 8 factors that influenced your score.",
  },
  {
    q: "What does my risk tier mean?",
    a: "Low Risk (PD < 30%) — likely to be approved. Medium Risk (30–60%) — referred to manual review by a loan officer. High Risk (> 60%) — currently outside approval thresholds, but a loan officer can still review.",
  },
  {
    q: "Can I improve my score?",
    a: "Yes. Reduce the loan amount, extend the repayment term, or reduce existing obligations. The SHAP explanations show exactly which factors increased or decreased your score.",
  },
];

export default function ApplicantPortal() {
  const { user, logout } = useAuth();
  const [apps, setApps] = useState<AppRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [score, setScore] = useState<ScoreOut | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openAccordion, setOpenAccordion] = useState<number | null>(null);

  const [form, setForm] = useState<FriendlyForm>({
    amount_usd: 1000,
    monthly_income_usd: 400,
    term_months: 12,
    province: "Harare",
    employment_sector: "Trade",
    existing_obligations: 0,
    applicant_segment: "sme",
  });

  useEffect(() => {
    api<AppRecord[]>("/applications/my").then(setApps).catch(() => {});
  }, []);

  const submitApplication = async () => {
    setLoading(true);
    setError("");
    try {
      const s = await api<ScoreOut>("/applications/friendly/score", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setScore(s);
      setShowForm(false);
      api<AppRecord[]>("/applications/my").then(setApps).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scoring failed");
    } finally {
      setLoading(false);
    }
  };

  const recColor = (r: string) =>
    r === "approve" ? "text-emerald-400 bg-emerald-900/20 border-emerald-700/30"
    : r === "reject" ? "text-red-400 bg-red-900/20 border-red-700/30"
    : "text-amber-400 bg-amber-900/20 border-amber-700/30";

  return (
    <div className="min-h-screen bg-[#0f1419] text-[#e8eef4]">
      {/* header */}
      <header className="bg-[#1a2332] border-b border-[#243044] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-[#3b82f6] to-[#10b981] rounded-lg flex items-center justify-center">
            <Brain size={15} className="text-white" />
          </div>
          <span className="font-bold text-[#e8eef4]">CreditRiskAI</span>
          <span className="hidden sm:inline text-[#8b9cb3] text-sm ml-2">· Applicant Portal</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-[#8b9cb3]">{user?.email}</div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs text-[#8b9cb3] hover:text-red-400 transition-colors cursor-pointer"
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

        {/* Score result */}
        {score && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#1a2332] border border-[#243044] rounded-xl p-6"
          >
            <h2 className="font-bold text-lg mb-5 text-[#e8eef4]">Your Risk Assessment</h2>
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <PdGauge value={score.probability_default * 100} size="md" />
              <div className="flex-1 space-y-3">
                <div className={`border rounded-xl px-4 py-3 text-sm font-semibold ${recColor(score.recommendation)}`}>
                  {score.recommendation === "approve"
                    ? "Congratulations — your application is within approval thresholds."
                    : score.recommendation === "reject"
                    ? "Your application currently falls outside approval thresholds. See tips below."
                    : "Your application has been referred for manual review by a loan officer."}
                </div>
                <ul className="space-y-1.5">
                  {(score.explanation.narratives || []).map((n, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[#8b9cb3]">
                      <ChevronRight size={12} className="shrink-0 mt-0.5 text-[#3b82f6]" />
                      {n}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <Button variant="secondary" size="sm" onClick={() => setScore(null)}>
                Apply Again
              </Button>
            </div>
          </motion.div>
        )}

        {/* Application form */}
        {showForm ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#1a2332] border border-[#243044] rounded-xl p-6"
          >
            <h2 className="font-bold text-lg mb-6 text-[#e8eef4]">Loan Application</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { label: "Loan Amount (USD)", key: "amount_usd", type: "number", min: 100, max: 50000 },
                { label: "Monthly Income (USD)", key: "monthly_income_usd", type: "number", min: 50 },
                { label: "Repayment Term (months)", key: "term_months", type: "number", min: 1, max: 60 },
                { label: "Existing Obligations", key: "existing_obligations", type: "number", min: 0 },
              ].map(({ label, key, type, min, max }) => (
                <div key={key}>
                  <label className="block text-xs text-[#8b9cb3] mb-1.5">{label}</label>
                  <input
                    type={type}
                    value={(form as Record<string, unknown>)[key] as number}
                    min={min} max={max}
                    onChange={(e) => setForm({ ...form, [key]: +e.target.value })}
                    className="w-full px-3 py-2 bg-[#0f1419] border border-[#243044] rounded-lg text-[#e8eef4] text-sm focus:outline-none focus:border-[#3b82f6]"
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs text-[#8b9cb3] mb-1.5">Province</label>
                <select
                  value={form.province}
                  onChange={(e) => setForm({ ...form, province: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0f1419] border border-[#243044] rounded-lg text-[#e8eef4] text-sm focus:outline-none focus:border-[#3b82f6]"
                >
                  {PROVINCES.map((p) => <option key={p} value={p}>{p.replace(/_/g, " ")}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#8b9cb3] mb-1.5">Employment Sector</label>
                <select
                  value={form.employment_sector || ""}
                  onChange={(e) => setForm({ ...form, employment_sector: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0f1419] border border-[#243044] rounded-lg text-[#e8eef4] text-sm focus:outline-none focus:border-[#3b82f6]"
                >
                  {SECTORS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#8b9cb3] mb-1.5">Applicant Segment</label>
                <select
                  value={form.applicant_segment}
                  onChange={(e) => setForm({ ...form, applicant_segment: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0f1419] border border-[#243044] rounded-lg text-[#e8eef4] text-sm focus:outline-none focus:border-[#3b82f6]"
                >
                  {SEGMENTS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                </select>
              </div>
            </div>

            {/* DTI indicator */}
            {form.monthly_income_usd > 0 && (
              <div className="mt-4 p-3 bg-[#243044]/40 rounded-lg">
                <span className="text-xs text-[#8b9cb3]">Estimated debt-to-income ratio: </span>
                <span className={`text-xs font-semibold ${(form.amount_usd / form.term_months / form.monthly_income_usd) > 0.4 ? "text-red-400" : "text-emerald-400"}`}>
                  {((form.amount_usd / form.term_months / form.monthly_income_usd) * 100).toFixed(1)}%
                </span>
              </div>
            )}

            {error && <p className="text-red-400 text-xs mt-3">{error}</p>}

            <div className="flex gap-3 mt-5">
              <Button onClick={submitApplication} disabled={loading} size="lg" className="shadow-lg shadow-blue-500/20">
                {loading ? "Analysing…" : "Get AI Risk Assessment"}
              </Button>
              <Button variant="secondary" size="lg" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </motion.div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold mb-1">My Loan Applications</h1>
            <p className="text-[#8b9cb3] text-sm mb-5">Track your applications and AI risk assessments.</p>
            <Button onClick={() => { setScore(null); setShowForm(true); }} size="lg" className="shadow-lg shadow-blue-500/20">
              <FilePlus size={17} /> Apply for a Loan
            </Button>
          </div>
        )}

        {/* Applications history */}
        {!showForm && (
          <div className="bg-[#1a2332] border border-[#243044] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={16} className="text-[#3b82f6]" />
              <h3 className="font-semibold text-[#e8eef4] text-sm">Application History</h3>
            </div>
            {apps.length === 0 ? (
              <div className="text-center py-8">
                <FilePlus size={32} className="text-[#243044] mx-auto mb-3" />
                <p className="text-[#8b9cb3] text-sm">No applications yet.</p>
                <p className="text-[#8b9cb3] text-xs mt-1">Get started with the button above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[#8b9cb3] text-xs uppercase">
                      <th className="text-left py-2 pr-4">Date</th>
                      <th className="text-right py-2 pr-4">Amount</th>
                      <th className="text-right py-2 pr-4">Term</th>
                      <th className="text-right py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apps.map((a) => (
                      <tr key={a.id} className="border-t border-[#243044]">
                        <td className="py-2.5 pr-4 text-[#8b9cb3]">
                          {new Date(a.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 pr-4 text-right text-[#e8eef4] font-mono">
                          ${a.raw_payload?.amount_usd?.toLocaleString() || "—"}
                        </td>
                        <td className="py-2.5 pr-4 text-right text-[#8b9cb3]">
                          {a.raw_payload?.term_months || "—"} mo
                        </td>
                        <td className="py-2.5 text-right">
                          <Badge variant="default">Submitted</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Explainer accordion */}
        <div className="bg-[#1a2332] border border-[#243044] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle size={16} className="text-[#8b9cb3]" />
            <h3 className="font-semibold text-[#e8eef4] text-sm">Understanding Your Score</h3>
          </div>
          <div className="space-y-2">
            {ACCORDION_ITEMS.map((item, i) => (
              <div key={i} className="border border-[#243044] rounded-lg overflow-hidden">
                <button
                  className="w-full text-left px-4 py-3 flex items-center justify-between text-sm text-[#e8eef4] hover:bg-[#243044]/50 transition-colors cursor-pointer"
                  onClick={() => setOpenAccordion(openAccordion === i ? null : i)}
                >
                  {item.q}
                  <ChevronDown
                    size={15}
                    className={`text-[#8b9cb3] shrink-0 transition-transform ${openAccordion === i ? "rotate-180" : ""}`}
                  />
                </button>
                {openAccordion === i && (
                  <div className="px-4 pb-3 text-xs text-[#8b9cb3] leading-relaxed border-t border-[#243044]">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
