import { useEffect, useState } from "react";
import { TrendingDown, CheckCircle2, Loader2 } from "lucide-react";
import { api } from "../api";
import { Card } from "./ui/Card";

interface SimResult {
  label: string;
  deltaBody: Record<string, unknown>;
  newPd: number;
  drop: number;
  newRecommendation: string;
}

interface Props {
  applicationId: number;
  currentObligations: number;
}

const REC_COLOR: Record<string, string> = {
  approve: "text-emerald-400",
  manual_review: "text-amber-400",
  reject: "text-red-400",
};

export function CreditImprovement({ applicationId, currentObligations }: Props) {
  const [results, setResults] = useState<SimResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const scenarios = [
      { label: "Reduce loan amount by 20%", deltaBody: { amount_pct: -0.2 } },
      { label: "Reduce loan amount by 30%", deltaBody: { amount_pct: -0.3 } },
      { label: "Increase verifiable income by 20%", deltaBody: { income_pct: 0.2 } },
      ...(currentObligations > 0
        ? [{ label: "Clear 1 existing obligation", deltaBody: { existing_obligations: currentObligations - 1 } }]
        : []),
    ];

    Promise.all(
      scenarios.map(async (s) => {
        const sim = await api<{ baseline: { probability_default: number }; scenario: { probability_default: number; recommendation: string }; delta_probability_default: number }>(
          "/simulations",
          { method: "POST", body: JSON.stringify({ base_application_id: applicationId, deltas: s.deltaBody }) }
        );
        return {
          label: s.label,
          deltaBody: s.deltaBody,
          newPd: sim.scenario.probability_default * 100,
          drop: Math.abs(sim.delta_probability_default) * 100,
          newRecommendation: sim.scenario.recommendation,
        } as SimResult;
      })
    )
      .then((all) => {
        const ranked = all.sort((a, b) => b.drop - a.drop).slice(0, 3);
        setResults(ranked);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [applicationId, currentObligations]);

  return (
    <Card className="mt-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingDown className="text-[#3b82f6]" size={18} />
        <h3 className="text-sm font-semibold text-[#e8eef4]">How to improve your chances</h3>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-[#8b9cb3] text-sm py-2">
          <Loader2 size={15} className="animate-spin" />
          Analysing improvement scenarios…
        </div>
      ) : results.length === 0 ? (
        <p className="text-sm text-[#8b9cb3]">No simulations available.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {results.map((r, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-[#0f1419] border border-[#243044] rounded-xl px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-[#3b82f6] font-bold text-sm w-5">#{i + 1}</span>
                <div>
                  <p className="text-sm text-[#e8eef4] font-medium">{r.label}</p>
                  <p className="text-xs text-[#8b9cb3] mt-0.5">
                    New risk:{" "}
                    <span className={`font-semibold ${REC_COLOR[r.newRecommendation] ?? "text-[#e8eef4]"}`}>
                      {r.newPd.toFixed(1)}% → {r.newRecommendation.replace("_", " ")}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-900/40 border border-emerald-700/30 rounded-lg px-2.5 py-1">
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span className="text-emerald-400 font-semibold text-xs">−{r.drop.toFixed(1)} pp</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
