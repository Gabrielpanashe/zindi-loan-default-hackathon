import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type FriendlyForm, type Score } from "../api";
import ShapChart from "../components/ShapChart";

const SEGMENTS = ["farmer", "sme", "civil_servant", "informal_trader", "government_employee"];

export default function Apply() {
  const nav = useNavigate();
  const [form, setForm] = useState<FriendlyForm>({
    applicant_segment: "sme",
    monthly_income_usd: 500,
    amount_usd: 2000,
    term_months: 12,
    province: "Harare",
    existing_obligations: 0,
  });
  const [score, setScore] = useState<Score | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const s = await api<Score>("/applications/friendly/score", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setScore(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scoring failed");
    } finally {
      setLoading(false);
    }
  };

  if (score) {
    const contribs = score.explanation.top_contributions || [];
    return (
      <div>
        <div className="card">
          <h2>Risk assessment result</h2>
          <p>
            Default probability:{" "}
            <strong>{(score.probability_default * 100).toFixed(1)}%</strong>
          </p>
          <span className={`badge ${score.risk_tier}`}>{score.risk_tier} risk</span>{" "}
          <span className="badge medium">{score.recommendation.replace("_", " ")}</span>
          <ul className="narrative" style={{ marginTop: "1rem" }}>
            {(score.explanation.narratives || []).map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2>SHAP drivers</h2>
          <ShapChart contributions={contribs} />
        </div>
        <button type="button" onClick={() => nav("/simulate")}>
          Run what-if on this profile
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h2>New loan application</h2>
        <form onSubmit={submit}>
          <label>Applicant segment</label>
          <select
            value={form.applicant_segment}
            onChange={(e) => setForm({ ...form, applicant_segment: e.target.value })}
          >
            {SEGMENTS.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <div className="grid2">
            <div>
              <label>Monthly income (USD)</label>
              <input
                type="number"
                value={form.monthly_income_usd}
                onChange={(e) => setForm({ ...form, monthly_income_usd: +e.target.value })}
              />
            </div>
            <div>
              <label>Loan amount (USD)</label>
              <input
                type="number"
                value={form.amount_usd}
                onChange={(e) => setForm({ ...form, amount_usd: +e.target.value })}
              />
            </div>
          </div>
          <div className="grid2">
            <div>
              <label>Term (months)</label>
              <input
                type="number"
                value={form.term_months}
                onChange={(e) => setForm({ ...form, term_months: +e.target.value })}
              />
            </div>
            <div>
              <label>Province</label>
              <input
                value={form.province || ""}
                onChange={(e) => setForm({ ...form, province: e.target.value })}
              />
            </div>
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? "Scoring…" : "Submit & score"}
          </button>
        </form>
      </div>
    </div>
  );
}

