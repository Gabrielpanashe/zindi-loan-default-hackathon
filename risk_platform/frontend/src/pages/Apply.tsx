import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, User, DollarSign, ClipboardCheck, Sparkles, BookmarkPlus, Sliders, FilePlus, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { api } from "../api";
import type { Score, FriendlyForm } from "../api";
import { PdGauge } from "../components/PdGauge";
import { Button } from "../components/ui/Button";
import ShapChart from "../components/ShapChart";
import { CreditImprovement } from "../components/CreditImprovement";
import { ExportPdfButton } from "../components/LoanReport";
import { useOfflineDrafts } from "../hooks/useOfflineDrafts";

const SEGMENTS = [
  { value: "sme",             label: "SME / Business",    desc: "Small or medium business" },
  { value: "farmer",          label: "Farmer",             desc: "Agricultural producer" },
  { value: "civil_servant",   label: "Civil Servant",     desc: "Government employee" },
  { value: "informal_trader", label: "Informal Trader",   desc: "Informal economy" },
  { value: "government_employee", label: "Govt Employee", desc: "Formal public sector" },
];
const PROVINCES = [
  "Harare","Bulawayo","Manicaland","Mashonaland_Central","Mashonaland_East",
  "Mashonaland_West","Masvingo","Matabeleland_North","Matabeleland_South","Midlands",
];
const SECTORS  = ["Agriculture","Civil_Servants","Finance","Government","Informal_Sector","Mining","NGO","Telecom","Trade"];
const PURPOSES = ["Business_Expansion","Debt_Consolidation","Farming_Inputs","Funeral","Livestock","Medical","Personal","Rent","School_Fees","Stock_Purchase","Wedding","Working_Capital"];

const STEPS = [
  { label: "Profile", icon: User },
  { label: "Loan",    icon: DollarSign },
  { label: "Review",  icon: ClipboardCheck },
];

type Tier = "low" | "medium" | "high";
type Rec  = "approve" | "manual_review" | "reject";

const REC_CONFIG: Record<Rec, {
  verdict: string; icon: React.ElementType;
  bannerBg: string; bannerBorder: string; bannerText: string;
  msg: string;
}> = {
  approve: {
    verdict: "APPROVED",
    icon: CheckCircle2,
    bannerBg: "bg-emerald-900/40",
    bannerBorder: "border-emerald-500/60",
    bannerText: "text-emerald-300",
    msg: "This application meets approval thresholds. Recommended for disbursement.",
  },
  manual_review: {
    verdict: "MANUAL REVIEW",
    icon: AlertTriangle,
    bannerBg: "bg-amber-900/40",
    bannerBorder: "border-amber-500/60",
    bannerText: "text-amber-300",
    msg: "Application is borderline. Referred to a loan officer for final decision.",
  },
  reject: {
    verdict: "REJECTED",
    icon: XCircle,
    bannerBg: "bg-red-900/40",
    bannerBorder: "border-red-500/60",
    bannerText: "text-red-300",
    msg: "Application falls outside current approval thresholds. See improvement tips below.",
  },
};

export default function Apply() {
  const nav = useNavigate();
  const [step, setStep]         = useState(0);
  const [score, setScore]       = useState<Score | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [savedDraft, setSavedDraft] = useState(false);
  const { saveDraft } = useOfflineDrafts();

  const [segment, setSegment]       = useState("sme");
  const [province, setProvince]     = useState("Harare");
  const [sector, setSector]         = useState("Civil_Servants");
  const [purpose, setPurpose]       = useState("Working_Capital");
  const [income, setIncome]         = useState(500);
  const [amount, setAmount]         = useState(2000);
  const [term, setTerm]             = useState(12);
  const [obligations, setObligations] = useState(0);
  const [annualRate, setAnnualRate] = useState(24);

  const dti = income > 0 ? ((amount / term) / income) * 100 : 0;
  const dtiColor = dti > 50 ? "text-red-400" : dti > 30 ? "text-amber-400" : "text-emerald-400";

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      const s = await api<Score>("/applications/friendly/score", {
        method: "POST",
        body: JSON.stringify({
          applicant_segment: segment,
          monthly_income_usd: income,
          amount_usd: amount,
          term_months: term,
          existing_obligations: obligations,
          annual_rate_pct: annualRate,
          province,
          employment_sector: sector,
          loan_purpose: purpose,
        }),
      });
      setScore(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scoring failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Result screen ──────────────────────────────────────────────────────────
  if (score) {
    const rec  = score.recommendation as Rec;
    const tier = score.risk_tier as Tier;
    const cfg  = REC_CONFIG[rec];
    const pd   = score.probability_default * 100;
    const contribs = score.explanation.top_contributions || [];
    const pdfForm: FriendlyForm = { applicant_segment: segment, monthly_income_usd: income, amount_usd: amount, term_months: term, employment_sector: sector, loan_purpose: purpose, province, annual_rate_pct: annualRate, existing_obligations: obligations };

    // Save context for global chat widget
    sessionStorage.setItem("chat_context", JSON.stringify({
      pd, risk_tier: score.risk_tier,
      recommendation: score.recommendation,
      narratives: score.explanation.narratives ?? [],
    }));

    const VerdictIcon = cfg.icon;
    const approveMax = ((score.policy_snapshot?.approve_pd_max as number ?? 0.3) * 100).toFixed(0);
    const reviewMax  = ((score.policy_snapshot?.review_pd_max  as number ?? 0.6) * 100).toFixed(0);

    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 max-w-2xl">

        {/* ── Sticky action navbar ───────────────────────────────────────── */}
        <div className="sticky top-0 z-30 -mx-6 px-6 py-3 bg-[#0f1419]/95 backdrop-blur-sm border-b border-[#243044] flex items-center justify-between gap-3 flex-wrap">
          <span className="text-sm font-semibold text-[#e8eef4]">Risk Assessment Result</span>
          <div className="flex items-center gap-2">
            <Button onClick={() => nav("/simulate")} variant="secondary" size="md">
              <Sliders size={14} /> What-If
            </Button>
            <ExportPdfButton score={score} form={pdfForm} />
            <Button onClick={() => { setScore(null); setStep(0); }} variant="outline" size="md">
              <FilePlus size={14} /> New
            </Button>
          </div>
        </div>

        {/* ── FINAL DECISION BANNER ─────────────────────────────────────── */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className={`border-2 rounded-2xl p-6 text-center ${cfg.bannerBg} ${cfg.bannerBorder}`}
        >
          <VerdictIcon size={48} className={`mx-auto mb-3 ${cfg.bannerText}`} />
          <div className={`text-4xl font-black tracking-widest mb-2 ${cfg.bannerText}`}>
            {cfg.verdict}
          </div>
          <p className="text-sm text-[#8b9cb3] max-w-md mx-auto">{cfg.msg}</p>
        </motion.div>

        {/* ── Summary info strip ────────────────────────────────────────── */}
        <div className="bg-[#1a2332] border border-[#243044] rounded-xl p-5">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <PdGauge value={pd} size="lg" />
            <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-3 w-full">
              {[
                ["Default Probability", `${pd.toFixed(1)}%`],
                ["Risk Tier",           tier.toUpperCase()],
                ["Loan Amount",         `$${amount.toLocaleString()}`],
                ["Monthly Income",      `$${income.toLocaleString()}`],
                ["Term",                `${term} months`],
                ["Obligations",         String(obligations)],
                ["Approve threshold",   `≤ ${approveMax}% PD`],
                ["Review threshold",    `≤ ${reviewMax}% PD`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-[#243044]/50 pb-2">
                  <span className="text-xs text-[#8b9cb3]">{k}</span>
                  <span className="text-xs font-semibold text-[#e8eef4]">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── AI Decision Drivers ───────────────────────────────────────── */}
        {(score.explanation.narratives || []).length > 0 && (
          <div className="bg-[#1a2332] border border-[#243044] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={15} className="text-amber-400" />
              <h3 className="font-semibold text-[#e8eef4] text-sm">AI Decision Drivers</h3>
            </div>
            <ul className="space-y-2">
              {score.explanation.narratives!.map((n, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#8b9cb3]">
                  <ChevronRight size={13} className="text-[#3b82f6] shrink-0 mt-0.5" />
                  {n}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── SHAP chart ────────────────────────────────────────────────── */}
        {contribs.length > 0 && (
          <div className="bg-[#1a2332] border border-[#243044] rounded-xl p-5">
            <h3 className="font-semibold text-[#e8eef4] text-sm mb-4">SHAP Feature Contributions</h3>
            <ShapChart contributions={contribs} />
          </div>
        )}

        {/* ── Credit Improvement — reject / manual_review only ─────────── */}
        {(rec === "reject" || rec === "manual_review") && score.application_id > 0 && (
          <CreditImprovement applicationId={score.application_id} currentObligations={obligations} />
        )}

        {/* ── Bottom action row (duplicate for easy access after scrolling) */}
        <div className="flex gap-3 flex-wrap items-center pt-2 pb-6 border-t border-[#243044]">
          <Button onClick={() => nav("/simulate")} variant="secondary" size="lg">
            <Sliders size={15} /> What-If Simulation
          </Button>
          <ExportPdfButton score={score} form={pdfForm} />
          <Button onClick={() => { setScore(null); setStep(0); }} variant="ghost" size="lg">
            <FilePlus size={15} /> New Application
          </Button>
        </div>
      </motion.div>
    );
  }

  // ── Wizard ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[#e8eef4] mb-4">New Loan Application</h1>
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                i === step ? "bg-[#3b82f6]/15 text-[#3b82f6] font-semibold" :
                i < step ? "text-emerald-400" : "text-[#8b9cb3]"
              }`}>
                <s.icon size={14} />
                <span>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <ChevronRight size={14} className="text-[#243044] mx-1" />}
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }} className="space-y-4">
            <div className="bg-[#1a2332] border border-[#243044] rounded-xl p-5">
              <h3 className="font-semibold text-[#e8eef4] mb-4">Applicant Profile</h3>
              <label className="block text-xs text-[#8b9cb3] mb-2">Segment</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                {SEGMENTS.map((s) => (
                  <button key={s.value} type="button" onClick={() => setSegment(s.value)}
                    className={`text-left p-3 rounded-lg border text-xs transition-colors cursor-pointer ${
                      segment === s.value ? "border-[#3b82f6] bg-[#3b82f6]/10 text-[#3b82f6]" : "border-[#243044] text-[#8b9cb3] hover:border-[#3b82f6]/40"
                    }`}>
                    <div className="font-semibold">{s.label}</div>
                    <div className="opacity-70 mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                {[["Province", province, setProvince, PROVINCES], ["Employment Sector", sector, setSector, SECTORS], ["Loan Purpose", purpose, setPurpose, PURPOSES]].map(
                  ([lbl, val, setter, opts]) => (
                    <div key={lbl as string}>
                      <label className="block text-xs text-[#8b9cb3] mb-1.5">{lbl as string}</label>
                      <select value={val as string} onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                        className="w-full px-3 py-2 bg-[#0f1419] border border-[#243044] rounded-lg text-[#e8eef4] text-sm focus:outline-none focus:border-[#3b82f6]">
                        {(opts as string[]).map((p) => <option key={p} value={p}>{p.replace(/_/g, " ")}</option>)}
                      </select>
                    </div>
                  )
                )}
              </div>
            </div>
            <Button onClick={() => setStep(1)} size="lg">Next: Loan Details <ChevronRight size={16} /></Button>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }} className="space-y-4">
            <div className="bg-[#1a2332] border border-[#243044] rounded-xl p-5">
              <h3 className="font-semibold text-[#e8eef4] mb-4">Loan Details</h3>
              <div className="space-y-4">
                {[["Loan Amount (USD)", amount, setAmount, 100, 50000, 100], ["Repayment Term (months)", term, setTerm, 1, 60, 1]].map(
                  ([lbl, val, setter, min, max, step_]) => (
                    <div key={lbl as string}>
                      <div className="flex justify-between mb-2">
                        <label className="text-xs text-[#8b9cb3]">{lbl as string}</label>
                        <span className="text-sm font-bold text-[#e8eef4]">
                          {lbl === "Loan Amount (USD)" ? `$${(val as number).toLocaleString()}` : `${val} months`}
                        </span>
                      </div>
                      <input type="range" min={min as number} max={max as number} step={step_ as number} value={val as number}
                        onChange={(e) => (setter as (v: number) => void)(+e.target.value)} className="w-full accent-[#3b82f6]" />
                    </div>
                  )
                )}
                <div className="grid sm:grid-cols-3 gap-4">
                  {[["Monthly Income (USD)", income, setIncome, 50], ["Annual Rate (%)", annualRate, setAnnualRate, 5], ["Existing Obligations", obligations, setObligations, 0]].map(
                    ([lbl, val, setter, min]) => (
                      <div key={lbl as string}>
                        <label className="block text-xs text-[#8b9cb3] mb-1.5">{lbl as string}</label>
                        <input type="number" value={val as number} min={min as number}
                          onChange={(e) => (setter as (v: number) => void)(+e.target.value)}
                          className="w-full px-3 py-2 bg-[#0f1419] border border-[#243044] rounded-lg text-[#e8eef4] text-sm focus:outline-none focus:border-[#3b82f6]" />
                      </div>
                    )
                  )}
                </div>
                <div className="p-3 bg-[#243044]/40 rounded-lg flex items-center justify-between">
                  <span className="text-xs text-[#8b9cb3]">Debt-to-income ratio</span>
                  <span className={`text-sm font-bold ${dtiColor}`}>{dti.toFixed(1)}%</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(0)} size="lg"><ChevronLeft size={16} /> Back</Button>
              <Button onClick={() => setStep(2)} size="lg">Review & Submit <ChevronRight size={16} /></Button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }} className="space-y-4">
            <div className="bg-[#1a2332] border border-[#243044] rounded-xl p-5">
              <h3 className="font-semibold text-[#e8eef4] mb-4">Application Summary</h3>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                {[
                  ["Segment", segment.replace(/_/g," ")], ["Province", province.replace(/_/g," ")],
                  ["Employment", sector.replace(/_/g," ")], ["Purpose", purpose.replace(/_/g," ")],
                  ["Loan Amount", `$${amount.toLocaleString()}`], ["Term", `${term} months`],
                  ["Monthly Income", `$${income.toLocaleString()}`], ["Annual Rate", `${annualRate}%`],
                  ["Obligations", String(obligations)], ["Est. Monthly PMT", `$${Math.round(amount / term).toLocaleString()}`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-[#243044]/50 pb-2">
                    <span className="text-xs text-[#8b9cb3]">{k}</span>
                    <span className="text-xs text-[#e8eef4] font-medium capitalize">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="flex gap-3 flex-wrap">
              <Button variant="secondary" onClick={() => setStep(1)} size="lg"><ChevronLeft size={16} /> Back</Button>
              <Button onClick={submit} disabled={loading} size="lg" className="shadow-lg shadow-blue-500/20">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analysing with AI…
                  </span>
                ) : <><Sparkles size={16} /> Get Risk Assessment</>}
              </Button>
              {/* Feature 5: Save draft offline */}
              <Button
                variant="ghost" size="lg"
                onClick={() => {
                  saveDraft({ applicant_segment: segment, monthly_income_usd: income, amount_usd: amount, term_months: term, employment_sector: sector, loan_purpose: purpose, province, annual_rate_pct: annualRate, existing_obligations: obligations });
                  setSavedDraft(true);
                  setTimeout(() => setSavedDraft(false), 2500);
                }}
              >
                <BookmarkPlus size={15} />
                {savedDraft ? "Saved!" : "Save Draft"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
