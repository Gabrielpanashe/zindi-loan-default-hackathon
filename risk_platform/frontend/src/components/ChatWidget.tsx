import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X, Bot, Sparkles } from "lucide-react";
import { cn } from "./ui/cn";

type Lang = "en" | "sn" | "nd";
type Message = { role: "user" | "assistant"; text: string };

export interface ChatContext {
  pd: number;
  risk_tier: string;
  recommendation: string;
  narratives: string[];
}

interface Props {
  context?: ChatContext;   // optional — widget works globally without a score
}

const LANG_LABELS: Record<Lang, string> = { en: "EN", sn: "SN", nd: "ND" };

const GREETING: Record<Lang, string> = {
  en: "👋 Hello! I'm your CreditRiskAI assistant. I can help you understand loan risk scores, explain decisions in plain language, or guide you through the application. How can I help?",
  sn: "👋 Mhoro! Ndini mubatsiri wako weCreditRiskAI. Ndinogona kukubatsira kunzwisisa rendi yechikwereti, kururamisa mapinduriro, kana kukuratidza kunyoresa chikumbiro. Ndinokubatsira sei?",
  nd: "👋 Sawubona! Ngingumsizi wakho weCreditRiskAI. Ngingakusiza ukuqonda amanani engozi yesikwelede, ukuchaza izinqumo ngolimi olulula, noma ukukuqondisa ngokufaka isicelo. Ngingakusiza njani?",
};

// ── Mock multilingual responses ──────────────────────────────────────────────
function mockReply(message: string, lang: Lang, ctx?: ChatContext): string {
  const msg = message.toLowerCase();

  // Context-aware (on result screen)
  if (ctx) {
    const pd = ctx.pd.toFixed(1);
    const tier = ctx.risk_tier;
    const rec = ctx.recommendation.replace("_", " ");
    const driver = ctx.narratives[0]?.replace(/\.$/, "") ?? "your financial profile";

    if (lang === "sn") {
      if (["rendi","score","%","percent","zvinoreva"].some((k) => msg.includes(k)))
        return `Rendi yako ye ${pd}% inoreva kuti mwero wekurega kubhadhara uri ${tier === "high" ? "pamusoro" : tier === "medium" ? "pakati" : "pasi"}. Mutongo: ${rec}. Mhosva huru: ${driver}.`;
      if (["vandudzira","improve","better","kugadziridza"].some((k) => msg.includes(k)))
        return "Kuti rendi yako idzike: (1) Deredza ndarama yaunokumbira, (2) Bhadharira chikwereti chimwe, (3) Ratidza mhosho yakakurira. Mamiriro ako anogona kugadzirika!";
      return `Rendi yako iri ${pd}% — ${tier === "high" ? "pamusoro" : "pakati"}. Ndiudze zvaunoda kuziva!`;
    }
    if (lang === "nd") {
      if (["score","%","percent","isikhala"].some((k) => msg.includes(k)))
        return `Isikhala sakho se-${pd}% sithi ingozi ${tier === "high" ? "iphezulu" : "imaphakathi"}. Isinqumo: ${rec}. Imbangela: ${driver}.`;
      if (["improve","thuthukisa","better"].some((k) => msg.includes(k)))
        return "Ukuze isikhala sakho sehle: (1) Nciphisa imali oyicelayo, (2) Khokha isikwelede esisodwa, (3) Bonisa umholo omkhulu.";
      return `Isikhala sakho: ${pd}% — ${tier}. Ngitshele ofuna ukwazi!`;
    }
    // English + context
    if (["mean","score","%","percent","what"].some((k) => msg.includes(k)))
      return `Your default probability of ${pd}% means your risk level is ${tier}. Decision: ${rec}. Main driver: ${driver}.`;
    if (["improve","better","qualify","how","change"].some((k) => msg.includes(k)))
      return "To improve your score: (1) Reduce the loan amount, (2) Pay off an existing obligation, (3) Show higher stable income. These changes could lower your risk significantly.";
    if (["why","reason","factor","shap","driver"].some((k) => msg.includes(k)))
      return `Top risk factors: ${ctx.narratives.slice(0, 3).join(" | ")}`;
  }

  // ── General assistant (no score context) ────────────────────────────────────
  if (lang === "sn") {
    if (["mhoro","hello","hi","ndinoda","help"].some((k) => msg.includes(k)))
      return "Mhoro! Ndinokubatsira nezve chikwereti uye mwero wengozi. Bvunza chero chinhu!";
    if (["chikwereti","loan","borrow","kumbira"].some((k) => msg.includes(k)))
      return "Kuti inyorese chikwereti, enda ku 'New Application'. Chishandiso chedu cheAI chinoratidzira mwero wako uye zvikonzero zvese.";
    if (["rendi","score","percent","%"].some((k) => msg.includes(k)))
      return "Rendi yerisk inoratidzira mukana wekurasa chikwereti. Rendi yakaderera (0–30%) inoita kuti ubvumirwe. Rendi yepamusoro (60%+) inoramba chikumbiro.";
    if (["vandudzira","improve","better"].some((k) => msg.includes(k)))
      return "Mwero wakanaka: (1) Kumbira ndarama shoma, (2) Bhadhara zvizvitangira, (3) Ratidza pasi rako rekubhadhara.";
    return "Ndiri pano kukubatsira! Bvunza nezve chikwereti, rendi, kana zvimwe.";
  }
  if (lang === "nd") {
    if (["sawubona","hello","hi","help"].some((k) => msg.includes(k)))
      return "Sawubona! Ngiyakusiza ngesikwelede nengozi. Buza nganoma yini!";
    if (["sikwelede","loan","borrow"].some((k) => msg.includes(k)))
      return "Ukufaka isicelo sesikwelede, ya ku 'New Application'. I-AI yethu izolinganisa ingozi yakho futhi ichaze izinqumo.";
    if (["isikhala","score","percent","%"].some((k) => msg.includes(k)))
      return "Isikhala sengozi sikhombisa amathuba okwehluleka ukukhokhela. Ephansi (0–30%) = yamukelwa. Ephezulu (60%+) = yalenqatshwa.";
    return "Ngiyakulungelela! Buza ngesikwelede, isikhala, noma okunye.";
  }
  // English general
  if (["hello","hi","hey","help","start"].some((k) => msg.includes(k)))
    return "Hello! I can help you with loan applications, risk scores, SHAP explanations, or how to improve your eligibility. What would you like to know?";
  if (["loan","apply","application","borrow"].some((k) => msg.includes(k)))
    return "To apply for a loan, go to 'New Application' in the menu. Our AI scores your application in under 200ms and explains every decision with SHAP analysis.";
  if (["score","risk","default","percent"].some((k) => msg.includes(k)))
    return "A risk score below 30% is typically approved. Between 30–60% goes to manual review. Above 60% is rejected. The score is driven by income, loan amount, employment sector, and location.";
  if (["shap","explain","why","factor","driver"].some((k) => msg.includes(k)))
    return "SHAP (SHapley Additive exPlanations) shows which factors pushed your score up or down. For example: 'Informal employment increased risk' or 'Low debt-to-income decreased risk'.";
  if (["improve","better","qualify","increase"].some((k) => msg.includes(k)))
    return "To improve your score: (1) Reduce the loan amount, (2) Increase your income, (3) Clear existing obligations, (4) Choose a longer repayment term.";
  if (["batch","csv","upload","bulk"].some((k) => msg.includes(k)))
    return "Batch scoring lets you upload a CSV of multiple applicants. The system processes them asynchronously and returns a downloadable results file with scores for each borrower.";
  if (["province","map","region","location"].some((k) => msg.includes(k)))
    return "Our geographic risk intelligence shows default rates across Zimbabwe's 10 provinces. Matabeleland South has the highest rate (28.6%) while Harare has the lowest (18.9%).";
  return "I'm here to help with loan risk assessments, score explanations, and financial guidance. Try asking: 'How does the risk score work?' or 'How can I improve my chances?'";
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ChatWidget({ context }: Props) {
  const [open, setOpen] = useState(false);
  const [pulsed, setPulsed] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: GREETING[lang] },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Proactive pulse after 4 seconds to draw attention
  useEffect(() => {
    const t = setTimeout(() => setPulsed(true), 4000);
    return () => clearTimeout(t);
  }, []);

  // Update greeting when language changes
  useEffect(() => {
    setMessages([{ role: "assistant", text: GREETING[lang] }]);
  }, [lang]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", text: userMsg }]);
    setLoading(true);
    setTimeout(() => {
      const reply = mockReply(userMsg, lang, context);
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
      setLoading(false);
    }, 650);
  };

  const placeholders: Record<Lang, string> = {
    en: "Ask about loans, risk scores…",
    sn: "Bvunza nezve chikwereti…",
    nd: "Buza ngesikwelede…",
  };

  return (
    <>
      {/* Floating trigger button */}
      {!open && (
        <button
          onClick={() => { setOpen(true); setPulsed(false); }}
          className="fixed bottom-6 right-6 z-50 group"
          aria-label="Open chat assistant"
        >
          <div className={cn(
            "relative w-14 h-14 rounded-full bg-[#3b82f6] text-white shadow-xl shadow-blue-500/40",
            "flex items-center justify-center transition-all duration-200",
            "hover:bg-blue-500 hover:scale-110 active:scale-95",
            pulsed && "ring-4 ring-blue-400/40 animate-pulse"
          )}>
            <MessageCircle size={24} />
            {/* Notification dot */}
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[#0f1419]" />
          </div>
          {/* Proactive tooltip */}
          {pulsed && (
            <div className="absolute bottom-16 right-0 bg-[#1a2332] border border-[#3b82f6]/40 text-[#e8eef4] text-xs rounded-xl px-3 py-2 w-44 shadow-xl whitespace-nowrap">
              <p className="font-semibold flex items-center gap-1"><Sparkles size={11} className="text-amber-400" /> Need help?</p>
              <p className="text-[#8b9cb3] mt-0.5">Chat with AI assistant</p>
              <div className="absolute -bottom-1.5 right-5 w-3 h-3 bg-[#1a2332] border-r border-b border-[#3b82f6]/40 rotate-45" />
            </div>
          )}
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 w-80 h-[460px] bg-[#1a2332] border border-[#243044] rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1e3a5f] to-[#243044] border-b border-[#243044]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#3b82f6] flex items-center justify-center shadow-md">
                <Bot size={15} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#e8eef4]">CreditRiskAI Assistant</p>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block" />
                  Online · EN / SN / ND
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Language selector */}
              <div className="flex rounded-lg overflow-hidden border border-[#3d526b]">
                {(["en", "sn", "nd"] as Lang[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={cn(
                      "px-2 py-0.5 text-[10px] font-bold transition-colors",
                      lang === l ? "bg-[#3b82f6] text-white" : "bg-transparent text-[#8b9cb3] hover:text-[#e8eef4]"
                    )}
                  >
                    {LANG_LABELS[l]}
                  </button>
                ))}
              </div>
              <button onClick={() => setOpen(false)} className="text-[#8b9cb3] hover:text-[#e8eef4] p-0.5 transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Context banner (shown when on result screen) */}
          {context && (
            <div className="px-3 pt-2 pb-0">
              <div className="bg-[#0f1419] border border-[#243044] rounded-lg px-3 py-1.5 flex items-center gap-2">
                <Sparkles size={11} className="text-amber-400 shrink-0" />
                <p className="text-[10px] text-[#8b9cb3]">
                  Discussing your <span className="text-[#e8eef4] font-semibold">{(context.pd).toFixed(1)}% PD score</span> · {context.risk_tier} risk
                </p>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "assistant" && (
                  <div className="w-5 h-5 rounded-full bg-[#3b82f6] flex items-center justify-center mr-1.5 mt-0.5 shrink-0">
                    <Bot size={10} className="text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[82%] px-3 py-2 rounded-xl text-xs leading-relaxed",
                    m.role === "user"
                      ? "bg-[#3b82f6] text-white rounded-br-sm"
                      : "bg-[#243044] text-[#e8eef4] rounded-bl-sm"
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-[#3b82f6] flex items-center justify-center shrink-0">
                  <Bot size={10} className="text-white" />
                </div>
                <div className="bg-[#243044] px-3 py-2 rounded-xl rounded-bl-sm">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-1.5 h-1.5 bg-[#8b9cb3] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick suggestions */}
          {messages.length <= 1 && (
            <div className="px-3 pb-1.5 flex gap-1.5 flex-wrap">
              {["How does risk score work?", "How to improve my score?", "What is SHAP?"].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q);
                    setTimeout(() => send(), 50);
                  }}
                  className="text-[10px] px-2.5 py-1 bg-[#243044] hover:bg-[#2d3d55] text-[#8b9cb3] hover:text-[#e8eef4] rounded-full transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3 pt-1.5 border-t border-[#243044] flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={placeholders[lang]}
              className="flex-1 bg-[#0f1419] border border-[#243044] rounded-xl px-3 py-2 text-xs text-[#e8eef4] placeholder-[#8b9cb3] outline-none focus:border-[#3b82f6] transition-colors"
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="w-8 h-8 rounded-xl bg-[#3b82f6] text-white flex items-center justify-center hover:bg-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default ChatWidget;
