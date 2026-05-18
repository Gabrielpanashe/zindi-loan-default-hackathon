import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth";

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = [
    { to: "/", label: "Dashboard" },
    { to: "/apply", label: "New application" },
    { to: "/batch", label: "Batch scoring" },
    { to: "/simulate", label: "What-if" },
  ];
  if (user?.role === "admin") nav.push({ to: "/policies", label: "Policies" });
  if (user?.role === "admin" || user?.role === "risk_analyst")
    nav.push({ to: "/audit", label: "Audit log" });

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>Loan Risk Intelligence</h1>
        <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "1rem" }}>
          {user?.email} ({user?.role})
        </p>
        <nav>
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === "/"}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <button type="button" className="secondary" style={{ marginTop: "1.5rem" }} onClick={logout}>
          Sign out
        </button>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}

