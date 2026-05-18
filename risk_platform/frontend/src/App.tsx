import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import Layout from "./components/Layout";
import Apply from "./pages/Apply";
import Audit from "./pages/Audit";
import Batch from "./pages/Batch";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Policies from "./pages/Policies";
import Simulate from "./pages/Simulate";

function Private({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <p style={{ padding: "2rem" }}>Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Private>
            <Layout />
          </Private>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="apply" element={<Apply />} />
        <Route path="batch" element={<Batch />} />
        <Route path="simulate" element={<Simulate />} />
        <Route path="policies" element={<Policies />} />
        <Route path="audit" element={<Audit />} />
      </Route>
    </Routes>
  );
}
