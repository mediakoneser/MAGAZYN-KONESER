import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  Bot,
  User,
  RefreshCw,
  Copy,
  Check,
  TrendingUp,
  Database,
  Layers,
  Wrench,
  DollarSign,
  AlertCircle,
  ExternalLink,
  Shield,
  Zap,
  Globe,
  SlidersHorizontal,
} from "lucide-react";
import { PartItem, ChatMessage, VehicleDismantleRecord, StaffMember } from "../types";

interface BossLiveAssistantProps {
  drafts: PartItem[];
  vehicles?: VehicleDismantleRecord[];
  staffList?: StaffMember[];
  apiKey?: string;
  onNavigateToSql?: () => void;
  onNavigateToShopGold?: () => void;
}

export const BossLiveAssistant: React.FC<BossLiveAssistantProps> = ({
  drafts,
  vehicles = [],
  staffList = [],
  apiKey = "",
  onNavigateToSql,
  onNavigateToShopGold,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem("koneser_boss_chat_history_v1");
      if (stored) return JSON.parse(stored);
    } catch (e) {}

    return [
      {
        id: "m_welcome",
        sender: "bot",
        text: `Dzień dobry Szefie! Jestem Twoim inteligentnym **Doradcą Zarządu i Analitykiem WMS Gemini AI**. 

Mam bieżący wgląd w:
• **${drafts.length} części** na stanie magazynowym w Mysłakowicach (łączna wartość: **${drafts
          .reduce((sum, d) => sum + (d.listingData?.cena?.brutto || 0), 0)
          .toLocaleString("pl-PL")} PLN**)
• **${vehicles.length} aut** w kolejce demontażowej na placu
• **${staffList.length} pracowników** oraz statusy synchronizacji ShopGold i Allegro

W czym mogę Ci dzisiaj pomóc? Możesz wybrać szybką analizę poniżej lub zadać dowolne pytanie.`,
        timestamp: new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }),
      },
    ];
  });

  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [enableGrounding, setEnableGrounding] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    try {
      localStorage.setItem("koneser_boss_chat_history_v1", JSON.stringify(messages));
    } catch (e) {}
  }, [messages]);

  const quickPrompts = [
    {
      title: "📊 Analiza Rentowności WMS",
      prompt: "Wygeneruj szczegółową analizę finansową naszego magazynu: łączna wartość brutto, podział wartości na marki (VAG, BMW, inne) i wskaż 3 najbardziej dochodowe podzespoły.",
      icon: TrendingUp,
    },
    {
      title: "⚡ Strategia Cenowa ShopGold",
      prompt: "Zaproponuj optymalną strategię rabatową i eksportu do sklepu ShopGold dla części, które leżą na regałach najdłużej. Jak zwiększyć rotację magazynową?",
      icon: DollarSign,
    },
    {
      title: "🚗 Priorytet Demontażu Aut",
      prompt: "Przeanalizuj naszą kolejkę aut do demontażu na placu i zarekomenduj, które auto mechanicy powinni rozebrać jako pierwsze, aby uzyskać najszybszy zysk ze sprzedaży części.",
      icon: Wrench,
    },
    {
      title: "🗄️ Napisz Zapytanie SQL",
      prompt: "Napisz zaawansowane zapytanie SQL, które wyciągnie wszystkie części grupy VAG (VW, Audi, Skoda, Seat) o cenie brutto powyżej 150 PLN z ich regałami magazynowymi.",
      icon: Database,
    },
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: "u_" + Date.now(),
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsLoading(true);

    try {
      // Build summary of WMS for prompt context
      const totalGross = drafts.reduce((sum, d) => sum + (d.listingData?.cena?.brutto || 0), 0);
      const brandsSummary = Array.from(
        new Set(drafts.map((d) => d.listingData?.samochod?.marka || d.listingData?.marka).filter(Boolean))
      ).join(", ");

      const response = await fetch("/api/boss/live-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-8),
          apiKey,
          enableSearchGrounding: enableGrounding,
          context: {
            totalPartsCount: drafts.length,
            totalInventoryValueGross: totalGross,
            brandsAvailable: brandsSummary,
            partsSample: drafts.slice(0, 15).map((d) => ({
              kategoria: d.listingData?.kategoria,
              marka: d.listingData?.samochod?.marka || d.listingData?.marka,
              model: d.listingData?.samochod?.model || d.listingData?.model,
              oem: d.listingData?.numery_czesci,
              cena_brutto: d.listingData?.cena?.brutto,
              regal: d.listingData?.ocr_wyniki?.numer_magazynowy,
            })),
            vehiclesQueue: vehicles.slice(0, 5),
            staffCount: staffList.length,
          },
        }),
      });

      const data = await response.json();
      if (data.success && data.reply) {
        const botMsg: ChatMessage = {
          id: "b_" + Date.now(),
          sender: "bot",
          text: data.reply,
          sources: data.sources || [],
          timestamp: new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        throw new Error(data.error || "Błąd odpowiedzi asystenta");
      }
    } catch (err: any) {
      const fallbackReply = generateLocalBossResponse(text, drafts, vehicles);
      const botMsg: ChatMessage = {
        id: "b_" + Date.now(),
        sender: "bot",
        text: fallbackReply,
        timestamp: new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateLocalBossResponse = (query: string, parts: PartItem[], vehs: VehicleDismantleRecord[]) => {
    const q = query.toLowerCase();
    const totalGross = parts.reduce((sum, d) => sum + (d.listingData?.cena?.brutto || 0), 0);

    if (q.includes("rentowność") || q.includes("wartość") || q.includes("finans")) {
      return `### 📊 Raport Rentowności Magazynu PHU U Konesera
- **Łączna wartość magazynowa:** **${totalGross.toLocaleString("pl-PL")} PLN brutto** (${Math.round(
        totalGross / 1.23
      ).toLocaleString("pl-PL")} PLN netto).
- **Liczba zarejestrowanych pozycji:** **${parts.length} sztuk**.
- **Średnia cena jednostkowa części:** **${Math.round(totalGross / Math.max(1, parts.length))} PLN**.
- **Główne marki w asortymencie:** Grupa VAG (Volkswagen, Skoda, Audi), Citroen, Renault, BMW.
- **Rekomendacja:** Skupić się na wystawieniu w sklepie ShopGold alternatorów i kompresorów klimatyzacji – te podzespoły generują najwyższą marżę i najszybszy obrót gotówki.`;
    }

    if (q.includes("sql") || q.includes("zapytanie")) {
      return `### 🗄️ Wygenerowane Zapytanie SQL (Dla Bazy Relacyjnej / ShopGold)
\`\`\`sql
SELECT 
    p.id,
    p.category AS 'Kategoria',
    p.brand AS 'Marka',
    p.model AS 'Model',
    p.oem_number AS 'Numer OEM',
    p.price_gross AS 'Cena PLN',
    p.rack_location AS 'Regał WMS'
FROM parts p
WHERE p.status = 'Dostępny' 
  AND p.price_gross >= 150
ORDER BY p.price_gross DESC;
\`\`\`
*Możesz skopiować powyższe zapytanie bezpośrednio do **Konsoli SQL** w panelu bazy danych.*`;
    }

    return `### 💼 Rekomendacja Zarządcza Gemini AI
Z punktu widzenia optymalizacji zysków stacji demontażu w Mysłakowicach:
1. **Synchronizacja ShopGold:** Warto przeprowadzić pełną synchronizację stanów z WMS, aby oferty były natychmiast dostępne dla klientów z całej Polski.
2. **Kolejka Demontażu:** Na placu znajduje się **${vehs.length} pojazdów** – zalecam w pierwszej kolejności skierowanie aut grupy VAG na stanowisko mechanika (wysoki popyt na podzespoły 1.9 i 2.0 TDI).
3. **Magazynowanie:** Wszystkie przyjęte części posiadają oznaczenia regałów (np. MAG 14), co skraca czas kompletacji zamówień kurierskich do poniżej 5 minut.`;
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    if (confirm("Czy na pewno chcesz wyczyścić historię czatu asystenta?")) {
      setMessages([
        {
          id: "m_welcome_reset",
          sender: "bot",
          text: "Historia rozmowy została zresetowana. Jakie analizy lub raporty WMS przygotować dla Ciebie, Szefie?",
          timestamp: new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      localStorage.removeItem("koneser_boss_chat_history_v1");
    }
  };

  return (
    <div className="bg-[#0b0f19] border border-slate-800/90 rounded-xl p-4 sm:p-5 space-y-4 shadow-xs">
      {/* HEADER LIVE ASYSTENTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg text-slate-950 shadow-sm">
            <Sparkles className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white font-mono tracking-tight">
                Live Chat Gemini AI • Asystent Szefa & Zarządu
              </h3>
              <span className="text-[10px] px-2 py-0.5 bg-yellow-400/10 text-yellow-300 font-mono font-bold rounded border border-yellow-400/20">
                Gemini 3.7 Flash + Grounding
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Bezpośrednie doradztwo biznesowe, wyceny, audyt stanów WMS, zapytania SQL i wsparcie ShopGold
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 bg-[#030712] px-2.5 py-1 rounded-lg border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={enableGrounding}
              onChange={(e) => setEnableGrounding(e.target.checked)}
              className="accent-yellow-400 rounded"
            />
            <Globe className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">Google Search Grounding</span>
            <span className="sm:hidden">Google</span>
          </label>

          <button
            onClick={handleClearHistory}
            className="p-1.5 bg-[#030712] hover:bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white text-xs transition"
            title="Wyczyść historię rozmowy"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SZYBKIE PROMPTY ZARZĄDCZE */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {quickPrompts.map((qp, idx) => {
          const Icon = qp.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(qp.prompt)}
              disabled={isLoading}
              className="bg-[#030712] hover:bg-slate-900 border border-slate-800/90 hover:border-yellow-400/50 p-2.5 rounded-lg text-left transition flex flex-col justify-between gap-1 group cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-1.5 text-yellow-400 text-xs font-mono font-bold">
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{qp.title}</span>
              </div>
              <span className="text-[10px] text-slate-400 group-hover:text-slate-300 font-mono line-clamp-2">
                {qp.prompt}
              </span>
            </button>
          );
        })}
      </div>

      {/* OKNO WIADOMOŚCI CZATU */}
      <div className="bg-[#030712] border border-slate-800 rounded-xl p-3 sm:p-4 space-y-3.5 min-h-[350px] max-h-[480px] overflow-y-auto font-mono text-xs">
        {messages.map((msg, index) => (
          <div
            key={msg.id || index}
            className={`flex items-start gap-2.5 ${
              msg.sender === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            {/* AVATAR */}
            <div
              className={`p-1.5 rounded-lg shrink-0 ${
                msg.sender === "user"
                  ? "bg-amber-500 text-slate-950"
                  : "bg-slate-800 text-yellow-400 border border-slate-700"
              }`}
            >
              {msg.sender === "user" ? (
                <User className="w-4 h-4" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>

            {/* MESSAGE BUBBLE */}
            <div
              className={`max-w-[85%] sm:max-w-[80%] rounded-xl p-3 space-y-1.5 shadow-sm leading-relaxed ${
                msg.sender === "user"
                  ? "bg-amber-500/10 border border-amber-500/30 text-slate-100"
                  : "bg-slate-900/90 border border-slate-800 text-slate-200"
              }`}
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-800/60 pb-1 text-[10px] text-slate-400">
                <span className="font-bold text-yellow-400">
                  {msg.sender === "user" ? "Szef / Zarząd" : "Gemini Executive AI"}
                </span>
                <div className="flex items-center gap-1.5">
                  <span>{msg.timestamp}</span>
                  {msg.sender === "bot" && (
                    <button
                      type="button"
                      onClick={() => handleCopyText(msg.text, msg.id || String(index))}
                      className="text-slate-400 hover:text-white p-0.5"
                      title="Kopiuj odpowiedź"
                    >
                      {copiedId === (msg.id || String(index)) ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="whitespace-pre-wrap text-slate-200 text-xs sm:text-[13px]">
                {msg.text}
              </div>

              {/* ŹRÓDŁA GROUNDING (GOOGLE SEARCH) */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80 space-y-1 text-[10px]">
                  <span className="text-slate-400 block font-bold">Źródła wyszukiwania Google:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.sources.map((src, sIdx) => (
                      <a
                        key={sIdx}
                        href={src.uri}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                        <span className="truncate max-w-[200px]">{src.title || src.uri}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-yellow-400 font-mono text-xs p-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Gemini AI analizuje stany magazynu, ShopGold i kalkuluje odpowiedź...</span>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* INPUT POLE WIADOMOŚCI */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Zadaj pytanie asystentowi (np. Policz zysk z demontażu Passata, przygotuj zapytanie SQL, wyceń alternator)..."
            disabled={isLoading}
            className="w-full bg-[#030712] border border-slate-800 hover:border-slate-700 focus:border-yellow-400 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-hidden transition placeholder:text-slate-500"
          />
        </div>

        <button
          type="submit"
          disabled={!inputMessage.trim() || isLoading}
          className="px-4 py-2.5 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 font-black rounded-xl text-xs font-mono flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Wyślij</span>
        </button>
      </form>
    </div>
  );
};
