import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from "@react-pdf/renderer";
import { Download } from "lucide-react";
import type { Score, FriendlyForm } from "../api";

const S = StyleSheet.create({
  page:       { backgroundColor: "#ffffff", padding: 40, fontFamily: "Helvetica", fontSize: 10, color: "#1a1a2e" },
  header:     { borderBottom: "2pt solid #1e3a5f", paddingBottom: 12, marginBottom: 16 },
  title:      { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#1e3a5f", marginBottom: 2 },
  subtitle:   { fontSize: 9, color: "#64748b", letterSpacing: 1 },
  section:    { marginBottom: 14 },
  secTitle:   { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1e3a5f", borderBottom: "1pt solid #e2e8f0", paddingBottom: 3, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 },
  row:        { flexDirection: "row", marginBottom: 5 },
  label:      { width: 180, color: "#64748b", fontSize: 9 },
  value:      { flex: 1, fontFamily: "Helvetica-Bold", fontSize: 9 },
  bigPd:      { fontSize: 36, fontFamily: "Helvetica-Bold", textAlign: "center", marginVertical: 8 },
  decBadge:   { padding: "6 14", borderRadius: 4, textAlign: "center", fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 6, alignSelf: "center" },
  bar:        { height: 8, borderRadius: 2, marginBottom: 4 },
  barLabel:   { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  bullet:     { flexDirection: "row", marginBottom: 5 },
  bulletDot:  { width: 16, color: "#1e3a5f", fontFamily: "Helvetica-Bold" },
  footer:     { position: "absolute", bottom: 28, left: 40, right: 40, borderTop: "1pt solid #e2e8f0", paddingTop: 8, flexDirection: "row", justifyContent: "space-between" },
  footText:   { fontSize: 7, color: "#94a3b8" },
});

const REC_COLORS: Record<string, string> = {
  approve: "#10b981", manual_review: "#f59e0b", reject: "#ef4444",
};

interface Props { score: Score; form: FriendlyForm; generatedAt?: string }

function ReportDocument({ score, form, generatedAt }: Props) {
  const pdPct = (score.probability_default * 100).toFixed(1);
  const recColor = REC_COLORS[score.recommendation] ?? "#64748b";
  const contribs = score.explanation.top_contributions ?? [];
  const maxAbs = Math.max(...contribs.map((c) => Math.abs(c.shap_value)), 0.001);

  return (
    <Document>
      {/* PAGE 1 */}
      <Page size="A4" style={S.page}>
        <View style={S.header}>
          <Text style={S.title}>CreditRiskAI</Text>
          <Text style={S.subtitle}>CREDIT RISK ASSESSMENT REPORT  ·  CONFIDENTIAL</Text>
        </View>

        {/* Applicant & Loan Details */}
        <View style={S.section}>
          <Text style={S.secTitle}>Loan Details</Text>
          {([
            ["Loan Amount (USD)", `$${form.amount_usd?.toLocaleString() ?? "—"}`],
            ["Monthly Income (USD)", `$${form.monthly_income_usd?.toLocaleString() ?? "—"}`],
            ["Term", `${form.term_months ?? "—"} months`],
            ["Annual Rate", `${form.annual_rate_pct ?? "—"}%`],
            ["Province", form.province ?? "—"],
            ["Employment Sector", form.employment_sector ?? "—"],
            ["Loan Purpose", form.loan_purpose ?? "—"],
            ["Applicant Segment", form.applicant_segment ?? "—"],
          ] as [string, string][]).map(([lbl, val]) => (
            <View key={lbl} style={S.row}>
              <Text style={S.label}>{lbl}</Text>
              <Text style={S.value}>{val}</Text>
            </View>
          ))}
        </View>

        {/* AI Decision */}
        <View style={S.section}>
          <Text style={S.secTitle}>AI Risk Assessment</Text>
          <Text style={[S.bigPd, { color: recColor }]}>{pdPct}%</Text>
          <Text style={{ textAlign: "center", fontSize: 9, color: "#64748b", marginBottom: 6 }}>Probability of Default</Text>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 12 }}>
            <View style={[S.decBadge, { backgroundColor: recColor + "22", borderWidth: 1, borderColor: recColor }]}>
              <Text style={{ color: recColor }}>{score.risk_tier.toUpperCase()} RISK  ·  {score.recommendation.replace("_", " ").toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Narratives */}
        <View style={S.section}>
          <Text style={S.secTitle}>Key Risk Drivers</Text>
          {(score.explanation.narratives ?? []).map((n, i) => (
            <View key={i} style={S.bullet}>
              <Text style={S.bulletDot}>{i + 1}.</Text>
              <Text style={{ flex: 1, fontSize: 9, color: "#334155" }}>{n}</Text>
            </View>
          ))}
        </View>

        <View style={S.footer}>
          <Text style={S.footText}>Prediction ID: {score.prediction_id}  ·  Generated: {generatedAt ?? new Date().toISOString().slice(0, 10)}</Text>
          <Text style={S.footText}>CreditRiskAI v1 · IndabaX Zimbabwe 2026</Text>
        </View>
      </Page>

      {/* PAGE 2 */}
      <Page size="A4" style={S.page}>
        <View style={S.header}>
          <Text style={S.title}>CreditRiskAI</Text>
          <Text style={S.subtitle}>SHAP FEATURE CONTRIBUTIONS  ·  PAGE 2 OF 2</Text>
        </View>

        <View style={S.section}>
          <Text style={S.secTitle}>Feature Contribution Analysis</Text>
          <Text style={{ fontSize: 8, color: "#64748b", marginBottom: 10 }}>
            Positive values (red) increase default probability. Negative values (green) decrease it.
          </Text>
          {contribs.slice(0, 10).map((c) => {
            const barWidth = Math.abs(c.shap_value) / maxAbs * 160;
            const positive = c.shap_value > 0;
            return (
              <View key={c.feature} style={{ marginBottom: 8 }}>
                <View style={S.barLabel}>
                  <Text style={{ fontSize: 8, color: "#334155" }}>{c.feature.replace(/_/g, " ")}</Text>
                  <Text style={{ fontSize: 8, color: positive ? "#ef4444" : "#10b981", fontFamily: "Helvetica-Bold" }}>
                    {positive ? "+" : ""}{c.shap_value.toFixed(4)}
                  </Text>
                </View>
                <View style={{ backgroundColor: "#f1f5f9", borderRadius: 2, height: 8, width: 200 }}>
                  <View style={[S.bar, { width: barWidth, backgroundColor: positive ? "#ef4444" : "#10b981", alignSelf: positive ? "flex-end" : "flex-start" }]} />
                </View>
              </View>
            );
          })}
        </View>

        <View style={S.section}>
          <Text style={S.secTitle}>Decision Policy Applied</Text>
          <View style={S.row}><Text style={S.label}>Auto-Approve threshold</Text><Text style={S.value}>PD ≤ 30%</Text></View>
          <View style={S.row}><Text style={S.label}>Manual Review threshold</Text><Text style={S.value}>PD 30% – 60%</Text></View>
          <View style={S.row}><Text style={S.label}>Auto-Reject threshold</Text><Text style={S.value}>PD &gt; 60%</Text></View>
        </View>

        <View style={S.section}>
          <Text style={S.secTitle}>Compliance Notice</Text>
          <Text style={{ fontSize: 8, color: "#64748b", lineHeight: 1.5 }}>
            This report was generated by an AI system (CreditRiskAI, LightGBM classifier, 56 features). It is intended as a decision-support tool only. Final lending decisions remain the responsibility of authorised loan officers in accordance with applicable regulations. All predictions are explainable via SHAP (SHapley Additive exPlanations) as documented in the system's model card.
          </Text>
        </View>

        <View style={S.footer}>
          <Text style={S.footText}>Prediction ID: {score.prediction_id}  ·  Model: LightGBM v1</Text>
          <Text style={S.footText}>CreditRiskAI · AI for Financial Inclusion · Zimbabwe 2026</Text>
        </View>
      </Page>
    </Document>
  );
}

interface DownloadProps { score: Score; form: FriendlyForm }

export function ExportPdfButton({ score, form }: DownloadProps) {
  return (
    <PDFDownloadLink
      document={<ReportDocument score={score} form={form} />}
      fileName={`credit-risk-report-${score.prediction_id}.pdf`}
      className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#243044] hover:bg-[#2d3d55] text-[#e8eef4] text-sm font-semibold rounded-xl transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
    >
      {({ loading: pdfLoading }) =>
        pdfLoading ? (
          <span className="text-[#8b9cb3]">Preparing PDF…</span>
        ) : (
          <>
            <Download size={15} />
            Export PDF Report
          </>
        )
      }
    </PDFDownloadLink>
  );
}
