import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Brain, BarChart3, Upload, Sliders, ShieldCheck, Globe,
  ChevronRight, ArrowRight, TrendingUp, Clock, Award, Sparkles,
} from "lucide-react";
import { GeoRiskTable } from "../components/GeoRiskTable";
import { Button } from "../components/ui/Button";

const STATS = [
  { label: "Loans Analyzed",   value: "38,932", icon: BarChart3, color: "text-[#3b82f6]" },
  { label: "Model AUC Score",  value: "0.677",  icon: Award,     color: "text-[#10b981]" },
  { label: "Scoring Latency",  value: "<200ms", icon: Clock,     color: "text-[#f59e0b]" },
  { label: "Provinces Covered",value: "10",     icon: Globe,     color: "text-purple-400" },
];

const FEATURES = [
  { icon: Brain,      color: "bg-blue-500/10 text-blue-400",    title: "Explainable AI",        desc: "Every decision comes with SHAP-powered feature explanations and plain-language narratives that regulators and borrowers can understand." },
  { icon: BarChart3,  color: "bg-emerald-500/10 text-emerald-400", title: "Portfolio Analytics", desc: "Real-time dashboards showing risk distribution, segment breakdown, default trends and geographic exposure across Zimbabwe's provinces." },
  { icon: Upload,     color: "bg-amber-500/10 text-amber-400",  title: "Batch Processing",      desc: "Upload hundreds of loan applications as CSV. Celery workers score them asynchronously and produce downloadable risk reports." },
  { icon: Sliders,    color: "bg-purple-500/10 text-purple-400",title: "What-If Simulation",    desc: "Loan officers adjust income or loan amount with sliders and instantly see how the default probability changes — live risk guidance." },
  { icon: ShieldCheck,color: "bg-red-500/10 text-red-400",      title: "Audit & Compliance",    desc: "Every prediction, policy change, and batch job is logged with actor, timestamp, and SHAP snapshot for full regulatory traceability." },
  { icon: TrendingUp, color: "bg-cyan-500/10 text-cyan-400",    title: "Configurable Policies", desc: "Institutions set their own approve / review / reject thresholds. Policy snapshots are stored with every decision for auditability." },
];

const PERSONAS = [
  {
    role: "For Loan Officers",
    image: "/images/analyst-dashboard.jpg",
    color: "from-blue-900/80",
    accent: "text-blue-300",
    points: [
      "Score any loan in under 200 ms — no manual forms",
      "SHAP narratives explain exactly why the AI decided",
      "What-if sliders advise borderline applicants on improving eligibility",
      "Batch CSV upload for portfolio-scale scoring",
    ],
  },
  {
    role: "For Farmers & Borrowers",
    image: "/images/hero-farmer.jpg",
    color: "from-emerald-900/80",
    accent: "text-emerald-300",
    points: [
      "Self-service portal — apply and track applications 24/7",
      "Transparent feedback: understand why a decision was made",
      "Practical tips to improve eligibility before re-applying",
      "Inclusive design built for Zimbabwe's agricultural communities",
    ],
  },
  {
    role: "For Risk Analysts",
    image: "/images/seedling-growth.jpg",
    color: "from-purple-900/80",
    accent: "text-purple-300",
    points: [
      "Portfolio-wide risk distribution and default trend charts",
      "Segment breakdown: farmers, SMEs, civil servants, informal traders",
      "SHAP feature importance across the full loan book",
      "Audit logs for model governance and regulatory reporting",
    ],
  },
];

const fade = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0f1419] text-[#e8eef4] font-sans">

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0f1419]/90 backdrop-blur border-b border-[#243044]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#3b82f6] to-[#10b981] rounded-lg flex items-center justify-center">
              <Brain size={16} className="text-white" />
            </div>
            <span className="font-bold text-[#e8eef4]">
              CreditRisk<span className="text-[#3b82f6]">AI</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#features" className="text-sm text-[#8b9cb3] hover:text-[#e8eef4] hidden sm:block transition-colors">Features</a>
            <a href="#stakeholders" className="text-sm text-[#8b9cb3] hover:text-[#e8eef4] hidden sm:block transition-colors">Who it's for</a>
            <Link to="/login"><Button size="sm">Sign In <ArrowRight size={14} /></Button></Link>
          </div>
        </div>
      </nav>

      {/* ── HERO — farmer + tablet image ────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden min-h-[88vh] flex items-center">
        {/* full-bleed background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/hero-farmer.jpg')" }}
        />
        {/* dark gradient overlay — preserves text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f1419]/95 via-[#0f1419]/80 to-[#0f1419]/50" />
        {/* subtle grid */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(#3b82f6 1px,transparent 1px),linear-gradient(90deg,#3b82f6 1px,transparent 1px)", backgroundSize: "40px 40px" }}
        />

        <div className="relative max-w-6xl mx-auto w-full">
          <motion.div initial="hidden" animate="show" variants={fade} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3b82f6] bg-[#3b82f6]/10 border border-[#3b82f6]/20 rounded-full px-3 py-1 mb-6">
              <span className="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-pulse" />
              IndabaX Zimbabwe 2026 — AI for Financial Inclusion
            </span>
          </motion.div>

          <motion.h1
            initial="hidden" animate="show" variants={fade} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 max-w-3xl"
          >
            AI-Powered{" "}
            <span className="bg-gradient-to-r from-[#3b82f6] to-[#10b981] bg-clip-text text-transparent">
              Credit Risk Intelligence
            </span>
            <br />for Zimbabwe's Financial Sector
          </motion.h1>

          <motion.p
            initial="hidden" animate="show" variants={fade} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-[#8b9cb3] max-w-xl mb-10 leading-relaxed"
          >
            Transparent, explainable, and scalable loan decision support for banks, microfinance
            institutions, SACCOs, and agricultural lenders — built for Africa's next generation
            of financial inclusion.
          </motion.p>

          <motion.div
            initial="hidden" animate="show" variants={fade} transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap items-center gap-4"
          >
            <Link to="/login">
              <Button size="xl" className="shadow-xl shadow-blue-500/25">
                Launch Demo <ChevronRight size={18} />
              </Button>
            </Link>
            <a href="#features">
              <Button variant="outline" size="xl">Explore Features</Button>
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── STATS — ZWL currency background ─────────────────────────────── */}
      <section className="relative py-16 px-6 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/zwl-currency.jpg')" }}
        />
        <div className="absolute inset-0 bg-[#0f1419]/88" />
        <div className="relative max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial="hidden" whileInView="show" viewport={{ once: true }}
              variants={fade} transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <s.icon size={22} className={`${s.color} mx-auto mb-2`} />
              <div className="text-3xl font-extrabold text-[#e8eef4]">{s.value}</div>
              <div className="text-xs text-[#8b9cb3] mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Enterprise-Grade Capabilities</h2>
            <p className="text-[#8b9cb3] max-w-xl mx-auto">
              Everything a modern lending institution needs — from single-click scoring to
              portfolio-scale analytics — in one deployable platform.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden" whileInView="show" viewport={{ once: true }}
                variants={fade} transition={{ delay: i * 0.08 }}
                className="bg-[#1a2332] border border-[#243044] rounded-xl p-5 hover:border-[#3b82f6]/40 transition-colors"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${f.color}`}>
                  <f.icon size={20} />
                </div>
                <h3 className="font-semibold text-[#e8eef4] mb-2">{f.title}</h3>
                <p className="text-sm text-[#8b9cb3] leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STAKEHOLDER PERSONA STRIPS — each with its own image ─────────── */}
      <section id="stakeholders" className="py-4 px-6 space-y-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">Built for Every Stakeholder</h2>
            <p className="text-[#8b9cb3]">Role-differentiated experiences — each user sees exactly what they need.</p>
          </div>
          <div className="space-y-5">
            {PERSONAS.map((p, i) => (
              <motion.div
                key={p.role}
                initial="hidden" whileInView="show" viewport={{ once: true }}
                variants={fade} transition={{ delay: i * 0.1 }}
                className="relative overflow-hidden rounded-2xl min-h-[220px] flex items-center"
              >
                {/* background image */}
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url('${p.image}')` }}
                />
                {/* gradient overlay — text always on left */}
                <div className={`absolute inset-0 bg-gradient-to-r ${p.color} via-[#0f1419]/70 to-transparent`} />

                <div className="relative px-8 py-8 max-w-lg">
                  <h3 className={`text-xl font-bold mb-4 ${p.accent}`}>{p.role}</h3>
                  <ul className="space-y-2">
                    {p.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-2 text-sm text-[#e8eef4]">
                        <ChevronRight size={14} className={`${p.accent} shrink-0 mt-0.5`} />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GEOGRAPHIC RISK ───────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">Zimbabwe Province Risk Intelligence</h2>
            <p className="text-[#8b9cb3]">Default rates derived from 38,932 historical loans — embedded directly in the AI model.</p>
          </div>
          <div className="bg-[#1a2332] border border-[#243044] rounded-xl p-6">
            <GeoRiskTable />
          </div>
        </div>
      </section>

      {/* ── CTA — community prediction image ─────────────────────────────── */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/community-prediction.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1419]/95 via-[#0f1419]/75 to-[#0f1419]/60" />

        <div className="relative max-w-2xl mx-auto text-center">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade}>
            <div className="inline-flex items-center gap-2 text-[#10b981] text-sm font-semibold mb-4">
              <Sparkles size={16} />
              <span>Predicting Growth · Stabilizing Futures</span>
            </div>
            <h2 className="text-4xl font-extrabold mb-4">Ready to transform your lending?</h2>
            <p className="text-[#8b9cb3] mb-8 text-lg leading-relaxed">
              Log in and explore the full platform. Demo credentials are provided on the sign-in page —
              try every role in seconds.
            </p>
            <Link to="/login">
              <Button size="xl" className="shadow-2xl shadow-blue-500/30">
                Launch Demo Platform <ArrowRight size={20} />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#243044] py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#8b9cb3]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-[#3b82f6] to-[#10b981] rounded-md flex items-center justify-center">
              <Brain size={12} className="text-white" />
            </div>
            <span className="font-semibold text-[#e8eef4]">CreditRiskAI</span>
            <span>· IndabaX Zimbabwe 2026</span>
          </div>
          <div className="flex items-center gap-6">
            <span>FastAPI · React · LightGBM · SHAP · Tailwind</span>
            <a href="https://github.com/Gabrielpanashe/zindi-loan-default-hackathon" target="_blank" rel="noopener noreferrer" className="hover:text-[#e8eef4] transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
