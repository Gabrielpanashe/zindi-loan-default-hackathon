import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Brain, BarChart3, Upload, Sliders, ShieldCheck, Globe,
  ChevronRight, ArrowRight, TrendingUp, Users, Clock, Award
} from "lucide-react";
import { GeoRiskTable } from "../components/GeoRiskTable";
import { Button } from "../components/ui/Button";

const STATS = [
  { label: "Loans Analyzed", value: "38,932", icon: BarChart3, color: "text-[#3b82f6]" },
  { label: "Model AUC Score", value: "0.677",  icon: Award,     color: "text-[#10b981]" },
  { label: "Scoring Latency", value: "<200ms", icon: Clock,     color: "text-[#f59e0b]" },
  { label: "Provinces Covered", value: "10",   icon: Globe,     color: "text-purple-400" },
];

const FEATURES = [
  {
    icon: Brain,
    color: "bg-blue-500/10 text-blue-400",
    title: "Explainable AI",
    desc: "Every decision comes with SHAP-powered feature explanations and plain-language narratives that regulators and borrowers can understand.",
  },
  {
    icon: BarChart3,
    color: "bg-emerald-500/10 text-emerald-400",
    title: "Portfolio Analytics",
    desc: "Real-time dashboards showing risk distribution, segment breakdown, default trends and geographic exposure across Zimbabwe's provinces.",
  },
  {
    icon: Upload,
    color: "bg-amber-500/10 text-amber-400",
    title: "Batch Processing",
    desc: "Upload hundreds of loan applications as CSV. Celery workers score them asynchronously and produce downloadable risk reports.",
  },
  {
    icon: Sliders,
    color: "bg-purple-500/10 text-purple-400",
    title: "What-If Simulation",
    desc: "Loan officers can adjust income or loan amount with sliders and instantly see how the default probability changes — live risk guidance.",
  },
  {
    icon: ShieldCheck,
    color: "bg-red-500/10 text-red-400",
    title: "Audit & Compliance",
    desc: "Every prediction, policy change, and batch job is logged with actor, timestamp, and SHAP snapshot for full regulatory traceability.",
  },
  {
    icon: TrendingUp,
    color: "bg-cyan-500/10 text-cyan-400",
    title: "Configurable Policies",
    desc: "Institutions set their own approve / review / reject thresholds. Policy snapshots are stored with every decision for auditability.",
  },
];

const PERSONAS = [
  {
    role: "Loan Officers",
    icon: Users,
    color: "text-blue-400",
    border: "border-blue-500/30",
    points: [
      "Score loan applications in under 200 ms",
      "Understand AI decisions with plain-language SHAP narratives",
      "Run what-if simulations to advise borderline applicants",
      "Upload batch CSVs for portfolio-scale reviews",
    ],
  },
  {
    role: "Risk Analysts",
    icon: BarChart3,
    color: "text-emerald-400",
    border: "border-emerald-500/30",
    points: [
      "Monitor portfolio risk distribution in real time",
      "Analyse default trends by province, sector and segment",
      "Review SHAP feature importance across the full loan book",
      "Access paginated audit logs for model governance",
    ],
  },
  {
    role: "Borrowers",
    icon: ShieldCheck,
    color: "text-purple-400",
    border: "border-purple-500/30",
    points: [
      "Submit loan applications through a guided self-service portal",
      "Receive transparent risk feedback with improvement tips",
      "Track application status and decision history",
      "Understand exactly why a decision was made",
    ],
  },
];

const fade = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0f1419] text-[#e8eef4] font-sans">
      {/* NAV */}
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
            <a href="#features" className="text-sm text-[#8b9cb3] hover:text-[#e8eef4] hidden sm:block">
              Features
            </a>
            <a href="#stakeholders" className="text-sm text-[#8b9cb3] hover:text-[#e8eef4] hidden sm:block">
              Who it's for
            </a>
            <Link to="/login">
              <Button size="sm">Sign In <ArrowRight size={14} /></Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* background grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* gradient orbs */}
        <div className="absolute top-20 left-1/4 w-80 h-80 bg-[#3b82f6]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-60 h-60 bg-[#10b981]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial="hidden" animate="show" variants={fade} transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3b82f6] bg-[#3b82f6]/10 border border-[#3b82f6]/20 rounded-full px-3 py-1 mb-6">
              <span className="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-pulse" />
              IndabaX Zimbabwe 2026 — AI for Financial Inclusion
            </span>
          </motion.div>

          <motion.h1
            initial="hidden" animate="show" variants={fade} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6"
          >
            AI-Powered{" "}
            <span className="bg-gradient-to-r from-[#3b82f6] to-[#10b981] bg-clip-text text-transparent">
              Credit Risk Intelligence
            </span>{" "}
            for Zimbabwe's Financial Sector
          </motion.h1>

          <motion.p
            initial="hidden" animate="show" variants={fade} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-[#8b9cb3] max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Transparent, explainable, and scalable loan decision support for banks, microfinance
            institutions, SACCOs, and government lending programs — built for Africa's next generation
            of financial inclusion.
          </motion.p>

          <motion.div
            initial="hidden" animate="show" variants={fade} transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <Link to="/login">
              <Button size="lg" className="shadow-lg shadow-blue-500/20">
                Request Demo <ChevronRight size={18} />
              </Button>
            </Link>
            <a href="#features">
              <Button variant="outline" size="lg">
                Explore Features
              </Button>
            </a>
          </motion.div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-12 px-6 border-y border-[#243044] bg-[#1a2332]/40">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8">
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

      {/* FEATURES */}
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
                className="bg-[#1a2332] border border-[#243044] rounded-xl p-5 hover:border-[#3b82f6]/40 transition-colors group"
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

      {/* STAKEHOLDERS */}
      <section id="stakeholders" className="py-20 px-6 bg-[#1a2332]/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Built for Every Stakeholder</h2>
            <p className="text-[#8b9cb3] max-w-xl mx-auto">
              Role-differentiated experiences ensure each user sees exactly what they need.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {PERSONAS.map((p, i) => (
              <motion.div
                key={p.role}
                initial="hidden" whileInView="show" viewport={{ once: true }}
                variants={fade} transition={{ delay: i * 0.1 }}
                className={`bg-[#1a2332] border ${p.border} rounded-xl p-6`}
              >
                <p.icon size={24} className={`${p.color} mb-3`} />
                <h3 className="font-bold text-[#e8eef4] mb-4">{p.role}</h3>
                <ul className="space-y-2">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2 text-sm text-[#8b9cb3]">
                      <ChevronRight size={14} className={`${p.color} shrink-0 mt-0.5`} />
                      {pt}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* GEOGRAPHIC RISK */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">Zimbabwe Province Risk Intelligence</h2>
            <p className="text-[#8b9cb3]">
              Default rates derived from 38,932 historical loans — embedded directly in the AI model.
            </p>
          </div>
          <div className="bg-[#1a2332] border border-[#243044] rounded-xl p-6">
            <GeoRiskTable />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-br from-[#1a2332] to-[#0f1419]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to see it in action?</h2>
          <p className="text-[#8b9cb3] mb-8">
            Log in and explore the full platform. Demo credentials are provided on the login page.
          </p>
          <Link to="/login">
            <Button size="xl" className="shadow-xl shadow-blue-500/20">
              Launch Demo Platform <ArrowRight size={20} />
            </Button>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
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
            <span>Built with FastAPI · React · LightGBM · SHAP</span>
            <a
              href="https://github.com/Gabrielpanashe/zindi-loan-default-hackathon"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#e8eef4]"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
