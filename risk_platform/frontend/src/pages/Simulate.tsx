import { useState } from "react";
import { api, type FriendlyForm } from "../api";

type SimScore = {
  probability_default: number;
  recommendation: string;
  risk_tier: string;
  explanation: { top_contributions?: { feature: string; shap_value: number }[] };
};
import ShapChart from "../components/ShapChart";

export default function Simulate() {
  const [form, setForm] = useState<FriendlyForm>({
    applicant_segment: "sme",
    monthly_income_usd: 500,
    amount_usd: 2000,
    term_months: 12,
    province: "Harare",
  });
  const [incomePct, setIncomePct] = useState(0.1);
  const [amountPct, setAmountPct] = useState(-0.1);
  const [result, setResult] = useState<{
    baseline: SimScore;
    scenario: SimScore;
    delta_probability_default: number;
  } | null>(null);
  const [error, setError] = useState("");

  const run = async () => {
    setError("");
    try {
      const app = await api<{ id: number }>("/applications/friendly", {
        method: "POST",
        body: JSON.stringify(form),
      });
      const sim = await api<{
        baseline: SimScore;
        scenario: SimScore;
        delta_probability_default: number;
      }>("/simulations", {
        method: "POST",
        body: JSON.stringify({
          base_application_id: app.id,
          deltas: { income_pct: incomePct, amount_pct: amountPct },
        }),
      });
      setResult(sim);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Simulation failed");
    }
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>What-if simulation</h2>
      <div className="card">
        <p style={{ color: "var(--muted)" }}>
          Adjust income or loan amount and compare default probability side by side.
        </p>
        <label>Income change (%)</label>
        <input type="number" step="0.05" value={incomePct} onChange={(e) => setIncomePct(+e.target.value)} />
        <label>Loan amount change (%)</label>
        <input type="number" step="0.05" value={amountPct} onChange={(e) => setAmountPct(+e.target.value)} />
        <button type="button" onClick={run}>
          Run simulation
        </button>
        {error && <p className="error">{error}</p>}
      </div>
      {result && (
        <div className="grid2">
          <div className="card">
            <h2>Baseline</h2>
            <p>PD: {(result.baseline.probability_default * 100).toFixed(1)}%</p>
            <span className={`badge ${result.baseline.risk_tier}`}>{result.baseline.risk_tier}</span>
            <ShapChart contributions={result.baseline.explanation.top_contributions || []} />
          </div>
          <div className="card">
            <h2>Scenario</h2>
            <p>PD: {(result.scenario.probability_default * 100).toFixed(1)}%</p>
            <p>Δ PD: {(result.delta_probability_default * 100).toFixed(2)} pp</p>
            <span className={`badge ${result.scenario.risk_tier}`}>{result.scenario.risk_tier}</span>
            <ShapChart contributions={result.scenario.explanation.top_contributions || []} />
          </div>
        </div>
      )}
    </div>
  );
}
