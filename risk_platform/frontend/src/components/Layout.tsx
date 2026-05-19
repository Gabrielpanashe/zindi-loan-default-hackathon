import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard, FilePlus, Upload, Sliders,
  Shield, ClipboardList, LogOut, Brain, ChevronRight,
} from "lucide-react";
import { useAuth } from "../auth";
import { Badge } from "./ui/Badge";
import { ChatWidget } from "./ChatWidget";

type NavItem = { to: string; label: string; icon: React.ElementType; end?: boolean };

type RoleBadge = "admin" | "loan_officer" | "risk_analyst" | "applicant" | "default";

function roleBadgeVariant(role: string): RoleBadge {
  const map: Record<string, RoleBadge> = {
    admin: "admin",
    loan_officer: "loan_officer",
    risk_analyst: "risk_analyst",
    applicant: "applicant",
  };
  return map[role] ?? "default";
}

function roleLabel(role: string) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function initials(email: string) {
  return email.slice(0, 2).toUpperCase();
}

export default function Layout() {
  const { user, logout } = useAuth();

  const nav: NavItem[] = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  ];

  if (user?.role !== "risk_analyst") {
    nav.push({ to: "/apply",    label: "New Application",   icon: FilePlus });
    nav.push({ to: "/batch",    label: "Batch Scoring",     icon: Upload });
  }
  nav.push({ to: "/simulate", label: "What-If Simulation", icon: Sliders });
  if (user?.role === "admin") {
    nav.push({ to: "/policies", label: "Policies",   icon: Shield });
  }
  if (user?.role === "admin" || user?.role === "risk_analyst") {
    nav.push({ to: "/audit", label: "Audit Log", icon: ClipboardList });
  }

  return (
    <div className="flex min-h-screen bg-[#0f1419]">
      {/* SIDEBAR */}
      <aside className="w-56 shrink-0 bg-[#1a2332] border-r border-[#243044] flex flex-col">
        {/* logo */}
        <div className="px-4 pt-5 pb-4 border-b border-[#243044]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#3b82f6] to-[#10b981] rounded-lg flex items-center justify-center shrink-0">
              <Brain size={15} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#e8eef4] leading-none">CreditRiskAI</div>
              <div className="text-[10px] text-[#8b9cb3] mt-0.5">Intelligence Platform</div>
            </div>
          </div>
        </div>

        {/* user info */}
        <div className="px-4 py-3 border-b border-[#243044]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3b82f6]/30 to-[#10b981]/30 border border-[#3b82f6]/40 flex items-center justify-center text-xs font-bold text-[#3b82f6] shrink-0">
              {user ? initials(user.email) : "??"}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-[#e8eef4] truncate">{user?.email}</div>
              <Badge
                variant={roleBadgeVariant(user?.role ?? "")}
                className="text-[9px] px-1.5 py-0 mt-0.5"
              >
                {roleLabel(user?.role ?? "")}
              </Badge>
            </div>
          </div>
        </div>

        {/* nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-[#3b82f6]/10 text-[#3b82f6] font-medium"
                    : "text-[#8b9cb3] hover:text-[#e8eef4] hover:bg-[#243044]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={15} className="shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight size={12} />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* logout */}
        <div className="px-2 pb-4 border-t border-[#243044] pt-3">
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#8b9cb3] hover:text-red-400 hover:bg-red-900/20 transition-colors cursor-pointer"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="p-6 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Global AI assistant — reads score context from sessionStorage if on result screen */}
      <ChatWidget context={(() => { try { const c = sessionStorage.getItem("chat_context"); return c ? JSON.parse(c) : undefined; } catch { return undefined; } })()} />
    </div>
  );
}
