import { FormEvent, useEffect, useState } from "react";
import { api } from "../api";

type Policy = { id: number; name: string; approve_pd_max: number; review_pd_max: number };

export default function Policies() {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api<Policy>("/policies").then(setPolicy).catch((e) => setError(e.message));
  }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!policy) return;
    setError("");
    try {
      await api<Policy>("/policies", {
        method: "PUT",
        body: JSON.stringify({
          approve_pd_max: policy.approve_pd_max,
          review_pd_max: policy.review_pd_max,
          name: policy.name,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  };

  if (!policy) return <p>Loading…</p>;

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Institution policy</h2>
      <div className="card">
        <form onSubmit={save}>
          <label>Approve if PD ≤</label>
          <input
            type="number"
            step="0.01"
            min={0}
            max={1}
            value={policy.approve_pd_max}
            onChange={(e) => setPolicy({ ...policy, approve_pd_max: +e.target.value })}
          />
          <label>Manual review if PD ≤</label>
          <input
            type="number"
            step="0.01"
            min={0}
            max={1}
            value={policy.review_pd_max}
            onChange={(e) => setPolicy({ ...policy, review_pd_max: +e.target.value })}
          />
          {error && <p className="error">{error}</p>}
          {saved && <p style={{ color: "var(--accent2)" }}>Saved.</p>}
          <button type="submit">Update thresholds</button>
        </form>
      </div>
    </div>
  );
}
