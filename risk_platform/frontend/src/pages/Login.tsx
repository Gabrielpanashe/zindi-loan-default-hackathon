import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, ShieldCheck, BarChart3, TrendingUp, Zap } from "lucide-react";
import { useAuth } from "../auth";
import { Button } from "../components/ui/Button";

const DEMO_USERS = [
  { label: "Admin",        email: "admin@localhost",     password: "admin123",     color: "text-purple-400 bg-purple-900/30 border border-purple-700/40", hint: "Executive dashboard" },
  { label: "Loan Officer", email: "officer@localhost",   password: "officer123",   color: "text-blue-400 bg-blue-900/30 border border-blue-700/40",       hint: "Score & batch" },
  { label: "Risk Analyst", email: "analyst@localhost",   password: "analyst123",   color: "text-cyan-400 bg-cyan-900/30 border border-cyan-700/40",       hint: "Portfolio analytics" },
  { label: "Applicant",    email: "applicant@localhost", password: "applicant123", color: "text-slate-400 bg-slate-700/30 border border-slate-600/40",    hint: "Self-service portal" },
];

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

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
    <div className="min-h-screen bg-[#0f1419] flex">
      {/* LEFT BRAND PANEL */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-[#1a2332] to-[#0d1520] p-12 border-r border-[#243044]">
        <div>
          <div className="flex items-center gap-2 mb-12">
            <div className="w-9 h-9 bg-gradient-to-br from-[#3b82f6] to-[#10b981] rounded-xl flex items-center justify-center">
              <Brain size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-[#e8eef4]">
              CreditRisk<span className="text-[#3b82f6]">AI</span>
            </span>
          </div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-3xl font-extrabold text-[#e8eef4] mb-4 leading-tight"
          >
            Explainable AI for<br />
            <span className="text-[#3b82f6]">Modern Lending</span>
          </motion.h2>
          <p className="text-[#8b9cb3] mb-10 leading-relaxed">
            Transparent, auditable, and inclusive loan risk intelligence — designed for Zimbabwe's
            banks, MFIs, SACCOs, and agricultural lenders.
          </p>
          <div className="space-y-4">
            {[
              { icon: Zap,         text: "Sub-200ms AI scoring with SHAP explanations" },
              { icon: ShieldCheck, text: "Full audit trail for regulatory compliance" },
              { icon: BarChart3,   text: "Portfolio analytics across 10 provinces" },
              { icon: TrendingUp,  text: "What-if simulation for borderline applicants" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-[#8b9cb3]">
                <Icon size={16} className="text-[#3b82f6] shrink-0" />
                {text}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-[#8b9cb3]">IndabaX Zimbabwe 2026 · AI for Financial Inclusion</p>
      </div>

      {/* RIGHT LOGIN PANEL */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-gradient-to-br from-[#3b82f6] to-[#10b981] rounded-lg flex items-center justify-center">
              <Brain size={15} className="text-white" />
            </div>
            <span className="font-bold text-[#e8eef4]">CreditRiskAI</span>
          </div>

          <h1 className="text-2xl font-bold text-[#e8eef4] mb-1">Welcome back</h1>
          <p className="text-[#8b9cb3] text-sm mb-8">Sign in to access the platform</p>

          <form onSubmit={submit} className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-[#8b9cb3] mb-1.5">Email</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
                className="w-full px-3.5 py-2.5 bg-[#1a2332] border border-[#243044] rounded-lg text-[#e8eef4] text-sm placeholder:text-[#8b9cb3]/50 focus:outline-none focus:border-[#3b82f6] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8b9cb3] mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 bg-[#1a2332] border border-[#243044] rounded-lg text-[#e8eef4] text-sm placeholder:text-[#8b9cb3]/50 focus:outline-none focus:border-[#3b82f6] transition-colors"
              />
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#243044]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#0f1419] px-3 text-xs text-[#8b9cb3]">Quick demo login</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {DEMO_USERS.map((u) => (
              <button
                key={u.email}
                type="button"
                onClick={() => quickLogin(u)}
                disabled={loading}
                className={`text-left p-3 rounded-lg text-xs ${u.color} hover:opacity-80 transition-opacity disabled:opacity-40 cursor-pointer`}
              >
                <div className="font-semibold">{u.label}</div>
                <div className="opacity-70 mt-0.5">{u.hint}</div>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
