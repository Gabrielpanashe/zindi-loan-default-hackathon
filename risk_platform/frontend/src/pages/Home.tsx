import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Brain, BarChart3, Upload, Sliders, ShieldCheck,
  ChevronRight, ArrowRight, TrendingUp, Clock, Award, Sparkles, Globe,
} from "lucide-react";
import { GeoRiskTable } from "../components/GeoRiskTable";
import { ChatWidget } from "../components/ChatWidget";

const STATS = [
  { label: "Loans Analyzed",    value: "38,932", icon: BarChart3, color: "text-blue-400" },
  { label: "Model AUC Score",   value: "0.677",  icon: Award,     color: "text-emerald-400" },
  { label: "Scoring Latency",   value: "<200ms", icon: Clock,     color: "text-amber-400" },
  { label: "Provinces Covered", value: "10",     icon: Globe,     color: "text-purple-400" },
];

const FEATURES = [
  { icon: Brain,       color: "bg-blue-500/20 text-blue-300",    border: "border-blue-500/20",    title: "Explainable AI",        desc: "Every decision comes with SHAP-powered feature explanations and plain-language narratives that regulators and borrowers can understand." },
  { icon: BarChart3,   color: "bg-emerald-500/20 text-emerald-300", border: "border-emerald-500/20", title: "Portfolio Analytics",  desc: "Real-time dashboards showing risk distribution, segment breakdown, default trends and geographic exposure across all provinces." },
  { icon: Upload,      color: "bg-amber-500/20 text-amber-300",   border: "border-amber-500/20",   title: "Batch Processing",      desc: "Upload hundreds of loan applications as CSV. Workers score them asynchronously and produce downloadable risk reports." },
  { icon: Sliders,     color: "bg-purple-500/20 text-purple-300", border: "border-purple-500/20",  title: "What-If Simulation",    desc: "Adjust income or loan amount with sliders and instantly see how the default probability changes — live risk guidance." },
  { icon: ShieldCheck, color: "bg-red-500/20 text-red-300",       border: "border-red-500/20",     title: "Audit & Compliance",    desc: "Every prediction and policy change is logged with actor, timestamp and SHAP snapshot for full regulatory traceability." },
  { icon: TrendingUp,  color: "bg-cyan-500/20 text-cyan-300",     border: "border-cyan-500/20",    title: "Configurable Policies", desc: "Institutions set their own approve / review / reject thresholds, stored with every decision for complete auditability." },
];

const PERSONAS = [
  {
    role: "For Loan Officers",
    image: "/images/analyst-dashboard.jpg",
    accent: "text-blue-300",
    tag: "bg-blue-500/20 text-blue-300 border-blue-400/30",
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
    accent: "text-emerald-300",
    tag: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
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
    accent: "text-purple-300",
    tag: "bg-purple-500/20 text-purple-300 border-purple-400/30",
    points: [
      "Portfolio-wide risk distribution and default trend charts",
      "Segment breakdown: farmers, SMEs, civil servants, informal traders",
      "SHAP feature importance across the full loan book",
      "Audit logs for model governance and regulatory reporting",
    ],
  },
];

const fade = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0f1419] text-[#e8eef4]">

      {/* ── NAVBAR ──────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0f16]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* logo */}
          <Link to="/home" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-gradient-to-br from-[#3b82f6] to-[#10b981] rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-shadow">
              <Brain size={16} className="text-white" />
            </div>
            <span className="font-bold text-[#e8eef4] tracking-tight">
              CreditRisk<span className="text-[#3b82f6]">AI</span>
            </span>
          </Link>

          {/* nav links */}
          <div className="hidden sm:flex items-center gap-1">
            {[
              { label: "Features",    href: "#features" },
              { label: "Who It's For", href: "#stakeholders" },
              { label: "Risk Map",    href: "#riskmap" },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="px-4 py-2 rounded-lg text-sm text-[#8b9cb3] hover:text-white hover:bg-white/8 transition-all duration-200 font-medium"
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* CTA button */}
          <Link to="/login">
            <button className="flex items-center gap-2 bg-[#3b82f6] hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/40 hover:-translate-y-0.5 active:scale-95 cursor-pointer">
              Sign In <ArrowRight size={15} />
            </button>
          </Link>
        </div>
      </nav>

      {/* ── HERO — farmer + tablet ───────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        {/* background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
          style={{ backgroundImage: "url('/images/hero-farmer.jpg')" }}
        />
        {/* softer overlay — image clearly visible */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f16]/70 via-[#0a0f16]/55 to-[#0a0f16]/80" />
        <div className="absolute inset-0 bg-[#0a0f16]/25" />

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <motion.div initial="hidden" animate="show" variants={fade} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#3b82f6] bg-[#3b82f6]/15 border border-[#3b82f6]/30 rounded-full px-4 py-1.5 mb-8">
              <span className="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-pulse" />
              IndabaX Zimbabwe 2026 — AI for Financial Inclusion
            </span>
          </motion.div>

          <motion.h1
            initial="hidden" animate="show" variants={fade} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.1] mb-6 tracking-tight"
          >
            <span className="text-white drop-shadow-lg">AI-Powered </span>
            <span className="bg-gradient-to-r from-[#3b82f6] via-blue-400 to-[#10b981] bg-clip-text text-transparent">
              Credit Risk
            </span>
            <br />
            <span className="text-white drop-shadow-lg">Intelligence</span>
          </motion.h1>

          <motion.p
            initial="hidden" animate="show" variants={fade} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-white/75 max-w-2xl mx-auto mb-10 leading-relaxed drop-shadow"
          >
            Transparent, explainable loan decision support for banks, MFIs, SACCOs, and
            agricultural lenders — built for Africa's financial future.
          </motion.p>

          <motion.div
            initial="hidden" animate="show" variants={fade} transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <Link to="/login">
              <button className="flex items-center gap-2 bg-[#3b82f6] hover:bg-blue-500 text-white text-base font-bold px-8 py-4 rounded-xl transition-all duration-200 hover:shadow-2xl hover:shadow-blue-500/40 hover:-translate-y-1 active:scale-95 cursor-pointer">
                Launch Demo <ChevronRight size={18} />
              </button>
            </Link>
            <a href="#features">
              <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur text-white text-base font-semibold px-8 py-4 rounded-xl border border-white/25 hover:border-white/50 transition-all duration-200 hover:-translate-y-1 active:scale-95 cursor-pointer">
                Explore Features
              </button>
            </a>
          </motion.div>
        </div>

        {/* scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/40">
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-white/40 to-transparent" />
        </div>
      </section>

      {/* ── STATS — ZWL currency background ─────────────────────────────── */}
      <section className="relative py-16 px-6 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/zwl-currency.jpg')" }}
        />
        {/* lighter overlay — currency notes clearly visible */}
        <div className="absolute inset-0 bg-[#0a0f16]/72" />

        <div className="relative max-w-4xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial="hidden" whileInView="show" viewport={{ once: true }}
                variants={fade} transition={{ delay: i * 0.1 }}
                className="flex flex-col items-center gap-2"
              >
                <div className={`w-11 h-11 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center ${s.color}`}>
                  <s.icon size={22} />
                </div>
                <div className="text-3xl font-extrabold text-white">{s.value}</div>
                <div className="text-xs text-white/65 font-medium uppercase tracking-wide">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 bg-[#0f1419]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade}
            className="text-center mb-14"
          >
            <span className="text-xs font-semibold text-[#3b82f6] uppercase tracking-widest">Platform Capabilities</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-3 mb-4">Enterprise-Grade Features</h2>
            <p className="text-[#8b9cb3] max-w-xl mx-auto text-lg">
              Everything a modern lending institution needs — from single-click scoring to portfolio-scale analytics.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden" whileInView="show" viewport={{ once: true }}
                variants={fade} transition={{ delay: i * 0.07 }}
                className={`bg-[#1a2332] border ${f.border} rounded-2xl p-6 hover:border-opacity-60 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30 transition-all duration-200 group`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${f.color} group-hover:scale-110 transition-transform duration-200`}>
                  <f.icon size={21} />
                </div>
                <h3 className="font-bold text-[#e8eef4] mb-2 text-base">{f.title}</h3>
                <p className="text-sm text-[#8b9cb3] leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LOAN PROCESS IMAGE BREAK ─────────────────────────────────────── */}
      <section className="relative py-20 px-6 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/loan-process.jpg')" }}
        />
        <div className="absolute inset-0 bg-[#0a0f16]/65" />
        <div className="relative max-w-3xl mx-auto text-center">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade}>
            <Sparkles size={32} className="text-[#f59e0b] mx-auto mb-4" />
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 drop-shadow-lg">
              From Application to Decision in Seconds
            </h2>
            <p className="text-white/75 text-lg leading-relaxed">
              Our AI engine analyses 56 engineered features — income, employment sector, province risk,
              collateral, repayment history — and returns a full risk profile with SHAP explanations
              in under 200 milliseconds.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── STAKEHOLDER PERSONA STRIPS ────────────────────────────────────── */}
      <section id="stakeholders" className="py-24 px-6 bg-[#0f1419]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade}
            className="text-center mb-14"
          >
            <span className="text-xs font-semibold text-[#10b981] uppercase tracking-widest">Built for Everyone</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-3 mb-4">Tailored for Every Role</h2>
            <p className="text-[#8b9cb3] max-w-xl mx-auto text-lg">
              Role-differentiated experiences — each stakeholder sees exactly what they need.
            </p>
          </motion.div>

          <div className="space-y-6">
            {PERSONAS.map((p, i) => (
              <motion.div
                key={p.role}
                initial="hidden" whileInView="show" viewport={{ once: true }}
                variants={fade} transition={{ delay: i * 0.1 }}
                className="relative overflow-hidden rounded-2xl min-h-[260px] flex items-center justify-center"
              >
                {/* image — clearly visible */}
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
                  style={{ backgroundImage: `url('${p.image}')` }}
                />
                {/* even overlay across the whole strip — not side-weighted */}
                <div className="absolute inset-0 bg-[#0a0f16]/62" />
                {/* subtle vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f16]/50 via-transparent to-[#0a0f16]/30" />

                {/* centered content */}
                <div className="relative text-center px-8 py-10 max-w-xl mx-auto">
                  <span className={`inline-block text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border mb-4 ${p.tag}`}>
                    {p.role}
                  </span>
                  <ul className="space-y-2.5">
                    {p.points.map((pt) => (
                      <li key={pt} className="flex items-center justify-center gap-2 text-sm text-white/90">
                        <ChevronRight size={13} className={`${p.accent} shrink-0`} />
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

      {/* ── GEOGRAPHIC RISK TABLE ─────────────────────────────────────────── */}
      <section id="riskmap" className="py-24 px-6 bg-[#0a0e14]">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade}
            className="text-center mb-10"
          >
            <span className="text-xs font-semibold text-[#f59e0b] uppercase tracking-widest">Domain Intelligence</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-3 mb-4">Zimbabwe Province Risk Intelligence</h2>
            <p className="text-[#8b9cb3] text-lg">
              Default rates derived from 38,932 historical loans — embedded in the AI model.
            </p>
          </motion.div>
          <div className="bg-[#1a2332] border border-[#243044] rounded-2xl p-6 shadow-2xl">
            <GeoRiskTable />
          </div>
        </div>
      </section>

      {/* ── CTA — community prediction image ─────────────────────────────── */}
      <section className="relative py-28 px-6 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{ backgroundImage: "url('/images/community-prediction.jpg')" }}
        />
        {/* lighter overlay so the people + neural network are visible */}
        <div className="absolute inset-0 bg-[#0a0f16]/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f16]/80 via-transparent to-[#0a0f16]/40" />

        <div className="relative max-w-2xl mx-auto text-center">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade}>
            <div className="inline-flex items-center gap-2 text-[#10b981] text-sm font-bold mb-5 bg-[#10b981]/15 border border-[#10b981]/30 px-4 py-2 rounded-full">
              <Sparkles size={15} />
              Predicting Growth · Stabilizing Futures
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 drop-shadow-xl leading-tight">
              Ready to Transform Your Lending?
            </h2>
            <p className="text-white/75 mb-10 text-lg leading-relaxed">
              Log in and explore the full platform. Demo credentials for all four roles
              are provided on the sign-in page.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to="/login">
                <button className="flex items-center gap-2 bg-[#3b82f6] hover:bg-blue-500 text-white text-lg font-bold px-10 py-4 rounded-xl transition-all duration-200 hover:shadow-2xl hover:shadow-blue-500/50 hover:-translate-y-1 active:scale-95 cursor-pointer">
                  Launch Demo Platform <ArrowRight size={20} />
                </button>
              </Link>
              <a href="#features">
                <button className="flex items-center gap-2 bg-white/12 hover:bg-white/22 backdrop-blur text-white font-semibold px-8 py-4 rounded-xl border border-white/30 hover:border-white/60 transition-all duration-200 hover:-translate-y-1 cursor-pointer">
                  Learn More
                </button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#243044] py-10 px-6 bg-[#0a0e14]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-[#8b9cb3]">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-gradient-to-br from-[#3b82f6] to-[#10b981] rounded-lg flex items-center justify-center">
              <Brain size={13} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-[#e8eef4]">CreditRiskAI</span>
              <span className="ml-2">· IndabaX Zimbabwe 2026</span>
            </div>
          </div>
          <div className="flex items-center gap-6 flex-wrap justify-center">
            <span>FastAPI · React · LightGBM · SHAP · Tailwind</span>
            <a
              href="https://github.com/Gabrielpanashe/zindi-loan-default-hackathon"
              target="_blank" rel="noopener noreferrer"
              className="text-[#3b82f6] hover:text-blue-400 font-medium transition-colors"
            >
              GitHub ↗
            </a>
          </div>
        </div>
      </footer>

      {/* AI Assistant — available on public homepage too */}
      <ChatWidget />
    </div>
  );
}
