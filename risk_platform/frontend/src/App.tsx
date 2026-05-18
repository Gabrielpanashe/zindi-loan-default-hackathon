import { Navigate, Route, Routes, useLocation } from "react-router-dom";
// useLocation is used by AnimatePresence key
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "./auth";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Apply from "./pages/Apply";
import ApplicantPortal from "./pages/ApplicantPortal";
import Audit from "./pages/Audit";
import Batch from "./pages/Batch";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Policies from "./pages/Policies";
import Simulate from "./pages/Simulate";

const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.18 }}
  >
    {children}
  </motion.div>
);

function Private({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="flex items-center justify-center h-screen text-[#8b9cb3]">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "applicant") return <Navigate to="/portal" replace />;
  return <>{children}</>;
}

function ApplicantOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="flex items-center justify-center h-screen text-[#8b9cb3]">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "applicant") return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AnalystOrAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user || !["admin", "risk_analyst"].includes(user.role))
    return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* PUBLIC */}
        <Route path="/home" element={<PageTransition><Home /></PageTransition>} />
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />

        {/* APPLICANT PORTAL */}
        <Route
          path="/portal"
          element={
            <ApplicantOnly>
              <PageTransition><ApplicantPortal /></PageTransition>
            </ApplicantOnly>
          }
        />

        {/* AUTHENTICATED STAFF */}
        <Route
          path="/"
          element={
            <Private>
              <Layout />
            </Private>
          }
        >
          <Route index element={<PageTransition><Dashboard /></PageTransition>} />
          <Route path="apply" element={<PageTransition><Apply /></PageTransition>} />
          <Route path="batch" element={<PageTransition><Batch /></PageTransition>} />
          <Route path="simulate" element={<PageTransition><Simulate /></PageTransition>} />
          <Route
            path="policies"
            element={<AdminOnly><PageTransition><Policies /></PageTransition></AdminOnly>}
          />
          <Route
            path="audit"
            element={<AnalystOrAdmin><PageTransition><Audit /></PageTransition></AnalystOrAdmin>}
          />
        </Route>

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
