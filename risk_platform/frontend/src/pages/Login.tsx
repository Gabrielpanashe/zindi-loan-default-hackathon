import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, ShieldCheck, BarChart3, TrendingUp, Zap } from "lucide-react";
import { useAuth } from "../auth";

const DEMO_USERS = [
  { label: "Admin",        email: "admin@localhost",     password: "admin123",     color: "text-purple-300 bg-purple-500/15 border border-purple-500/30 hover:bg-purple-500/25", hint: "Executive dashboard" },
  { label: "Loan Officer", email: "officer@localhost",   password: "officer123",   color: "text-blue-300 bg-blue-500/15 border border-blue-500/30 hover:bg-blue-500/25",         hint: "Score & batch" },
  { label: "Risk Analyst", email: "analyst@localhost",   password: "analyst123",   color: "text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/25",         hint: "Portfolio analytics" },
  { label: "Applicant",    email: "applicant@localhost", password: "applicant123", color: "text-slate-300 bg-slate-500/15 border border-slate-500/30 hover:bg-slate-500/25",     hint: "Self-service portal" },
];

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      nav("/");
    } catch {
      setError("Invalid credentials. Try a demo account below.");
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (u: (typeof DEMO_USERS)[number]) => {
    setEmail(u.email);
    setPassword(u.password);
    setError("");
    setLoading(true);
    try {
      await login(u.email, u.password);
      nav("/");
    } catch {
      setError("Login failed. Is the API running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e14] flex">

      {/* ── LEFT BRAND PANEL ─────────────────────────────────────────────── */}
      <div className="hidden lg:block w-[55%] relative overflow-hidden">
        {/* background image — clearly visible */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/analyst-dashboard.jpg')" }}
        />
        {/* lighter overlay — face and laptop clearly visible */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0e14]/80 via-[#0a0e14]/55 to-[#0a0e14]/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e14]/70 via-transparent to-[#0a0e14]/40" />

        {/* content over image */}
        <div className="relative h-full flex flex-col justify-between p-12">
          <div>
            {/* logo */}
            <div className="flex items-center gap-2.5 mb-12">
              <div className="w-9 h-9 bg-gradient-to-br from-[#3b82f6] to-[#10b981] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/40">
                <Brain size={18} className="text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                CreditRisk<span className="text-[#3b82f6]">AI</span>
              </span>
            </div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="text-4xl font-extrabold text-white mb-4 leading-tight drop-shadow-lg"
            >
              Explainable AI<br />
              <span className="bg-gradient-to-r from-[#3b82f6] to-[#10b981] bg-clip-text text-transparent">
                for Modern Lending
              </span>
            </motion.h2>

            <p className="text-white/70 mb-10 leading-relaxed text-base max-w-sm">
              Transparent, auditable loan risk intelligence for Zimbabwe's banks, MFIs, SACCOs,
              and agricultural lenders.
            </p>

            <div className="space-y-3.5">
              {[
                { icon: Zap,         text: "Sub-200ms AI scoring with SHAP explanations" },
                { icon: ShieldCheck, text: "Full audit trail for regulatory compliance" },
                { icon: BarChart3,   text: "Portfolio analytics across 10 provinces" },
                { icon: TrendingUp,  text: "What-if simulation for borderline applicants" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 text-sm text-white/75">
                  <div className="w-7 h-7 rounded-lg bg-[#3b82f6]/20 flex items-center justify-center shrink-0">
                    <Icon size={14} className="text-[#3b82f6]" />
                  </div>
                  {text}
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-white/40 font-medium">
            IndabaX Zimbabwe 2026 · AI for Financial Inclusion · Zindi Hackathon
          </p>
        </div>
      </div>

      {/* ── RIGHT LOGIN FORM ──────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#0a0e14]">
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-gradient-to-br from-[#3b82f6] to-[#10b981] rounded-lg flex items-center justify-center">
              <Brain size={15} className="text-white" />
            </div>
            <span className="font-bold text-white">CreditRiskAI</span>
          </div>

          <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-[#8b9cb3] text-sm mb-8">Sign in to access the platform</p>

          {/* form */}
          <form onSubmit={submit} className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-[#8b9cb3] uppercase tracking-wide mb-2">Email</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
                className="w-full px-4 py-3 bg-[#1a2332] border border-[#243044] rounded-xl text-white text-sm placeholder:text-[#4a5a70] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8b9cb3] uppercase tracking-wide mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 bg-[#1a2332] border border-[#243044] rounded-xl text-white text-sm placeholder:text-[#4a5a70] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20 transition-all"
              />
            </div>

            {error && (
              <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#3b82f6] hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : "Sign In"}
            </button>
          </form>

          {/* divider */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#243044]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#0a0e14] px-3 text-xs text-[#8b9cb3] font-medium">Quick demo login</span>
            </div>
          </div>

          {/* demo role buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            {DEMO_USERS.map((u) => (
              <button
                key={u.email}
                type="button"
                onClick={() => quickLogin(u)}
                disabled={loading}
                className={`text-left p-3.5 rounded-xl text-xs transition-all duration-200 disabled:opacity-40 cursor-pointer hover:-translate-y-0.5 active:scale-95 ${u.color}`}
              >
                <div className="font-bold mb-0.5">{u.label}</div>
                <div className="opacity-70">{u.hint}</div>
              </button>
            ))}
          </div>

          <p className="text-center text-xs text-[#4a5a70] mt-6">
            IndabaX Zimbabwe 2026 · AI for Financial Inclusion
          </p>
        </motion.div>
      </div>
    </div>
  );
}
