import { useEffect, useState } from "react";
import { api } from "../api";

type Log = {
  id: number;
  actor_id: number | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  created_at: string;
};

export default function Audit() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Log[]>("/audit?limit=100")
      .then(setLogs)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Audit trail</h2>
      {error && <p className="error">{error}</p>}
      <div className="card">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ color: "var(--muted)", textAlign: "left" }}>
              <th>Time</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Actor</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td>{new Date(l.created_at).toLocaleString()}</td>
                <td>{l.action}</td>
                <td>
                  {l.entity_type} #{l.entity_id}
                </td>
                <td>{l.actor_id ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
