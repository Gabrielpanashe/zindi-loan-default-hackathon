import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X, Bot } from "lucide-react";
import { cn } from "./ui/cn";

type Lang = "en" | "sn" | "nd";
type Message = { role: "user" | "assistant"; text: string };

interface ChatContext {
  pd: number;
  risk_tier: string;
  recommendation: string;
  narratives: string[];
}

interface Props {
  context: ChatContext;
}

const LANG_LABELS: Record<Lang, string> = { en: "EN", sn: "SN", nd: "ND" };

// ── Mock multilingual AI responses ──────────────────────────────────────────
function mockReply(message: string, lang: Lang, ctx: ChatContext): string {
  const msg = message.toLowerCase();
  const pdPct = ctx.pd.toFixed(1);
  const tier = ctx.risk_tier;
  const rec = ctx.recommendation.replace("_", " ");
  const driver = ctx.narratives[0]?.replace(/\.$/, "") ?? "your financial profile";

  if (lang === "sn") {
    if (msg.includes("rendi") || msg.includes("score") || msg.includes("percent") || msg.includes("%")) {
      return `Rendi yako ye ${pdPct}% inoreva kuti mwero wekurega kubhadhara chikwereti wako uri ${tier === "high" ? "pamusoro" : tier === "medium" ? "pakati" : "pasi"}. Mutongo wedu ndi: ${rec === "approve" ? "kubvumira" : rec === "manual review" ? "kuratidzwa zvakare" : "kurambwa"}. ${driver.includes("sector") ? "Mabasa ako anoratidzwa se risk" : "Mhosva huru ndi " + driver}.`;
    }
    if (msg.includes("vandudzira") || msg.includes("kugadziridza") || msg.includes("improve") || msg.includes("better")) {
      return `Kuti rendi yako idzike: (1) Deredza ndarama yaunokumbira, (2) Bhadharira chikwereti chimwe chaunechonaro, (3) Ratidza pasi rako rekubhadhara zvakakurira. Mamiriro ako anogona kugadzirika!`;
    }
    return `Chero mubvunzo wako pamusoro perendi yako ye ${pdPct}% ndinokubatsira. Ndiudze zvauri kuda kuziva!`;
  }

  if (lang === "nd") {
    if (msg.includes("score") || msg.includes("percent") || msg.includes("%")) {
      return `Isikhala sakho se-${pdPct}% sithi ingozi yokwehluleka ukukhokhela isikwelede yakho ${tier === "high" ? "iphezulu" : tier === "medium" ? "imaphakathi" : "iphansi"}. Isinqumo sethu: ${rec === "approve" ? "ukwamukelwa" : rec === "manual review" ? "ukuhlolwa kabusha" : "ukwenqatshwa"}. ${driver}.`;
    }
    if (msg.includes("improve") || msg.includes("thuthukisa") || msg.includes("better")) {
      return `Ukuze isikhala sakho sehle: (1) Nciphisa imali oyicelayo, (2) Khokha isikwelede esisodwa esikhona, (3) Bonisa umholo omkhulu. Isimo sakho singathuthuka!`;
    }
    return `Ngiyakusiza nganoma yimiphi imibuzo mayelana nesikhala sakho se-${pdPct}%. Ngitshele ofuna ukwazi!`;
  }

  // English (default)
  if (msg.includes("mean") || msg.includes("score") || msg.includes("percent") || msg.includes("%")) {
    return `Your default probability of ${pdPct}% means your risk level is ${tier}. The AI's recommendation is to ${rec} your application. The main driver is: ${driver}.`;
  }
  if (msg.includes("improve") || msg.includes("better") || msg.includes("qualify") || msg.includes("how")) {
    return `To improve your score: (1) Reduce the loan amount requested, (2) Pay off an existing obligation, (3) Demonstrate a higher stable income. These changes could lower your risk significantly.`;
  }
  if (msg.includes("shap") || msg.includes("why") || msg.includes("reason") || msg.includes("factor")) {
    return `The top factors affecting your score are: ${ctx.narratives.slice(0, 3).join(" | ")}`;
  }
  if (msg.includes("hello") || msg.includes("hi") || msg.includes("mhoro") || msg.includes("sawubona")) {
    return `Hello! I'm your CreditRiskAI assistant. Your current risk score is ${pdPct}% (${tier} risk). Ask me anything about your assessment or how to improve your chances!`;
  }
  return `I can help you understand your ${pdPct}% risk score and how to improve it. Try asking: "Why is my score ${pdPct}%?" or "How can I improve my chances?"`;
}

export function ChatWidget({ context }: Props) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Hello! Ask me about your risk score in English, ChiShona, or IsiNdebele. / Mhoro! / Sawubona!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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
    }, 700);
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#3b82f6] text-white shadow-lg shadow-blue-500/40 flex items-center justify-center hover:bg-blue-500 hover:scale-105 transition-all z-50"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 w-80 h-[420px] bg-[#1a2332] border border-[#243044] rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#243044] border-b border-[#243044]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#3b82f6] flex items-center justify-center">
                <Bot size={14} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#e8eef4]">AI Assistant</p>
                <p className="text-[10px] text-emerald-400">Online</p>
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
              <button onClick={() => setOpen(false)} className="text-[#8b9cb3] hover:text-[#e8eef4] p-0.5">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed",
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
              <div className="flex justify-start">
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

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-[#243044] flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={lang === "sn" ? "Bvunza…" : lang === "nd" ? "Buza…" : "Ask about your score…"}
              className="flex-1 bg-[#0f1419] border border-[#243044] rounded-lg px-3 py-2 text-xs text-[#e8eef4] placeholder-[#8b9cb3] outline-none focus:border-[#3b82f6] transition-colors"
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="w-8 h-8 rounded-lg bg-[#3b82f6] text-white flex items-center justify-center hover:bg-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
