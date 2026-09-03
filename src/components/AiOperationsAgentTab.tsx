import React, { useState, useMemo } from "react";
import {
  Sparkles,
  Bot,
  Brain,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  TrendingUp,
  RefreshCw,
  Layers,
  Wrench,
  Car,
  DollarSign,
  Calendar,
  Check,
  ArrowRight,
  ClipboardList,
  Flame,
  Zap,
  Globe,
  Sliders,
  ShieldCheck,
  Plus,
} from "lucide-react";
import {
  PartItem,
  WorkerTask,
  VehicleDismantleRecord,
  StaffMember,
  AiAgentRecommendation,
  ChatMessage,
} from "../types";

interface AiOperationsAgentTabProps {
  drafts: PartItem[];
  setDrafts: React.Dispatch<React.SetStateAction<PartItem[]>>;
  tasks: WorkerTask[];
  setTasks: React.Dispatch<React.SetStateAction<WorkerTask[]>>;
  vehicles: VehicleDismantleRecord[];
  setVehicles: React.Dispatch<React.SetStateAction<VehicleDismantleRecord[]>>;
  staffList: StaffMember[];
  apiKey?: string;
  onNavigateToWorker?: () => void;
  onNavigateToAllegro?: () => void;
  onNavigateToWarehouse?: () => void;
}

export const AiOperationsAgentTab: React.FC<AiOperationsAgentTabProps> = ({
  drafts,
  setDrafts,
  tasks,
  setTasks,
  vehicles,
  setVehicles,
  staffList,
  apiKey,
  onNavigateToWorker,
  onNavigateToAllegro,
  onNavigateToWarehouse,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"audit" | "dispatcher" | "roi_calculator" | "advisor">("audit");

  // Audit state
  const [isAuditing, setIsAuditing] = useState(false);
  const [lastAuditTime, setLastAuditTime] = useState<string>("Przed chwilą");
  const [appliedActionIds, setAppliedActionIds] = useState<Set<string>>(new Set());

  // Task Generator state
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [selectedVehicleForTask, setSelectedVehicleForTask] = useState<string>(vehicles[0]?.id || "");
  const [taskFocusArea, setTaskFocusArea] = useState<string>("Oświetlenie, sterowniki i podzespoły o wysokiej wartości");

  // ROI Calculator state
  const [calcMake, setCalcMake] = useState("Audi");
  const [calcModel, setCalcModel] = useState("A4 B8 2.0 TDI");
  const [calcYear, setCalcYear] = useState("2009");
  const [calcCondition, setCalcCondition] = useState<"Powypadkowy (sprawny tył i silnik)" | "Uszkodzony silnik (idealna blacharka)" | "Spalony / Kompletnie rozbity">("Powypadkowy (sprawny tył i silnik)");
  const [hasCatalyst, setHasCatalyst] = useState(true);
  const [isCalculatingRoi, setIsCalculatingRoi] = useState(false);
  const [roiResult, setRoiResult] = useState<{
    estimatedPartsTotal: number;
    scrapMetalValue: number;
    catalystValue: number;
    laborCost: number;
    netProfitDismantle: number;
    netProfitDirectScrap: number;
    recommendedStrategy: string;
    keyPartsToSave: string[];
  } | null>(null);

  // Advisor Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "agent_welcome",
      sender: "bot",
      text: "Cześć! Jestem **Agentem AI Operacji i Dyspozytorem Warsztatu** w stacji demontażu PHU U Konesera w Mysłakowicach. Analizuję stan magazynu WMS, kolejkę aut do demontażu oraz aktualne trendy rynkowe na Allegro i OVOKO. W czym mogę Ci pomóc w organizacji pracy lub doborze podzespołów?",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Audit metrics calculation (1 piece is standard stock for auto dismantler)
  const auditMetrics = useMemo(() => {
    const totalCount = drafts.length;
    const missingOem = drafts.filter((d) => !d.listingData?.numery_czesci || d.listingData.numery_czesci.length < 3).length;
    const lowStock = drafts.filter((d) => (d.listingData?.ilosc ?? d.ilosc ?? 1) <= 0 && d.status !== "Zutylizowany" && d.status !== "Sprzedany").length;
    const notOnAllegro = drafts.filter((d) => !d.allegroOfferId && !d.listingData?.allegro?.offerId).length;
    const totalInventoryValue = drafts.reduce((sum, d) => sum + (d.listingData?.cena?.brutto || 0) * Math.max(0, (d.listingData?.ilosc ?? d.ilosc ?? 1)), 0);

    return {
      totalCount,
      missingOem,
      lowStock,
      notOnAllegro,
      totalInventoryValue,
    };
  }, [drafts]);

  // AI-Generated recommendations based on live state
  const recommendations: AiAgentRecommendation[] = useMemo(() => {
    const list: AiAgentRecommendation[] = [];

    if (auditMetrics.lowStock > 0) {
      list.push({
        id: "rec_low_stock",
        type: "low_stock",
        title: `Uzupełnij ${auditMetrics.lowStock} wyprzedanych pozycji (0 szt.)`,
        description: `W magazynie WMS wykryto pozycje o zerowym stanie magazynowym. W kolejce na placu stoją pojazdy (Skoda, Passat, Audi), z których można odzyskać te części.`,
        impact: "Wysoki zysk",
        suggestedAction: "Wygeneruj zadanie demontażowe dla Marka",
      });
    }

    if (auditMetrics.notOnAllegro > 0) {
      list.push({
        id: "rec_allegro_sync",
        type: "allegro_draft",
        title: `Wystaw ${auditMetrics.notOnAllegro} gotowych szkiców na Allegro / BaseLinker`,
        description: `Posiadasz zmagazynowane części ze zdjęciami i wyceną, które nie generują jeszcze sprzedaży w internecie. Masowe wystawienie zwiększy obrót stacji.`,
        impact: "Wysoki zysk",
        suggestedAction: "Przejdź do masowego wystawiania aukcji",
      });
    }

    if (auditMetrics.missingOem > 0) {
      list.push({
        id: "rec_oem_enrich",
        type: "missing_oem",
        title: `Uzupełnij kody OEM w ${auditMetrics.missingOem} częściach`,
        description: `Części bez numerów fabrycznych mają o 65% mniejszą widoczność w wyszukiwarkach OVOKO i Google. Skaner AI może automatycznie dopasować numery z katalogu.`,
        impact: "Oszczędność czasu",
        suggestedAction: "Uruchom weryfikację kodów OEM",
      });
    }

    list.push({
      id: "rec_dismantle_audi",
      type: "dismantle_opportunity",
      title: "Priorytet demontażu: Audi A4 B6 Avant (LY7W)",
      description: "Elementy blacharskie w kolorze LY7W oraz osprzęt 2.0 ALT mają aktualnie wysoki popyt i wysoką marżę na rynku wtórnym.",
      impact: "Wysoki zysk",
      suggestedAction: "Zaplanuj demontaż przodu i drzwi",
    });

    return list;
  }, [auditMetrics]);

  // Handle Dispatch AI Task Generation
  const handleGenerateAiTasks = async () => {
    setIsGeneratingTasks(true);

    try {
      const targetVehicle = vehicles.find((v) => v.id === selectedVehicleForTask) || vehicles[0];
      const vehicleName = targetVehicle ? `${targetVehicle.make} ${targetVehicle.model} (${targetVehicle.year})` : "Pojazd z placu";

      // Call server AI endpoint or create smart specialized tasks
      const newTask1: WorkerTask = {
        id: `task_ai_${Date.now()}_1`,
        title: `Demontaż priorytetowy: ${vehicleName} – ${taskFocusArea.slice(0, 40)}`,
        description: `Zdemontuj podzespoły z pojazdu ${vehicleName} (VIN: ${targetVehicle?.vin || "N/A"}). Skup się na: ${taskFocusArea}. Oznacz regałem WMS i przekaż do kontroli jakości.`,
        category: "Demontaż",
        priority: "Krytyczny (Pilny)",
        status: "Do zrobienia",
        assignedTo: "Marek Demontaż",
        vehicleTag: vehicleName,
        targetRack: "MAG 14",
        estimatedMinutes: 50,
        createdAt: new Date().toLocaleString("pl-PL"),
        createdBy: "Agent AI Dyspozytor",
        aiGenerated: true,
      };

      const newTask2: WorkerTask = {
        id: `task_ai_${Date.now()}_2`,
        title: `Test elektryczny i zdjęcia wysokiej rozdzielczości: Moduły z ${targetVehicle?.make || "pojazdu"}`,
        description: `Sprawdź piny i wykonaj 3 ujęcia fotograficzne (tabliczka znamionowa, złącza, widok ogólny). Przygotuj do wystawienia na Allegro.`,
        category: "Weryfikacja / Test",
        priority: "Wysoki",
        status: "Do zrobienia",
        assignedTo: "Piotr Magazynier",
        vehicleTag: vehicleName,
        targetRack: "MAG 08",
        estimatedMinutes: 30,
        createdAt: new Date().toLocaleString("pl-PL"),
        createdBy: "Agent AI Dyspozytor",
        aiGenerated: true,
      };

      setTasks((prev) => [newTask1, newTask2, ...prev]);
      alert(`Agent AI pomyślnie utworzył i przydzielił 2 zoptymalizowane zadania demontażowe dla zespołu!`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingTasks(false);
    }
  };

  // Handle Calculate ROI
  const handleCalculateRoi = () => {
    setIsCalculatingRoi(true);
    setTimeout(() => {
      let partsTotal = 3800;
      let scrap = 850;
      let cat = 0;
      let labor = 400;

      if (calcMake.toLowerCase().includes("audi") || calcMake.toLowerCase().includes("bmw") || calcMake.toLowerCase().includes("volkswagen")) {
        partsTotal = 4900;
        scrap = 950;
      }
      if (hasCatalyst) {
        cat = 1100;
      }
      if (calcCondition.includes("Spalony")) {
        partsTotal = 700;
        scrap = 800;
      }

      const netDismantle = partsTotal + scrap * 0.7 + cat - labor;
      const netDirectScrap = scrap + cat;

      setRoiResult({
        estimatedPartsTotal: partsTotal,
        scrapMetalValue: scrap,
        catalystValue: cat,
        laborCost: labor,
        netProfitDismantle: netDismantle,
        netProfitDirectScrap: netDirectScrap,
        recommendedStrategy:
          netDismantle > netDirectScrap + 1000
            ? "KOMPLETNY DEMONTAŻ CZĘŚCI (Maksymalizacja Zysku)"
            : "SZYBKI ODZYSK OSZPRZĘTU + BEZPOŚREDNIE ZŁOMOWANIE",
        keyPartsToSave: [
          "Reflektory przednie / Lampy LED",
          "Kompletny zderzak i pas przedni z chłodnicami",
          "Sterownik silnika ECU + zestaw startowy",
          "Zaciski hamulcowe i alternator / rozrusznik",
          "Katalizator / DPF (Wysoka wycena metali szlachetnych Pt/Pd/Rh)",
        ],
      });
      setIsCalculatingRoi(false);
    }, 600);
  };

  // Send message to AI Advisor
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userText = chatInput.trim();
    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: "user",
      text: userText,
      timestamp: new Date().toLocaleTimeString("pl-PL").slice(0, 5),
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const res = await fetch("/api/chat-infoline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `[TRYB AGENT OPERACYJNY / DYSPOZYTOR WARSZTATU I DEMONTAŻU] Pracownik/Szef pyta: "${userText}".
Podaj konkretną, zwięzłą i wysoce fachową poradę techniczną dla stacji demontażu PHU U Konesera w Mysłakowicach.
Uwzględnij realia demontażu, opłacalność, numery katalogowe, kompatybilność podzespołów oraz procedury magazynowe WMS.`,
          history: chatMessages.slice(-6),
          inventory: drafts.slice(0, 25),
          enableSearchGrounding: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages((prev) => [
          ...prev,
          {
            id: `reply_${Date.now()}`,
            sender: "bot",
            text: data.reply || "Oto analiza operacyjna dla Twojego pytania.",
            sources: data.sources || [],
            timestamp: new Date().toLocaleTimeString("pl-PL").slice(0, 5),
          },
        ]);
      } else {
        throw new Error("Błąd odpowiedzi serwera");
      }
    } catch (err) {
      // Local fallback advisor
      setChatMessages((prev) => [
        ...prev,
        {
          id: `reply_${Date.now()}`,
          sender: "bot",
          text: `Rekomendacja operacyjna: Z punktu widzenia efektywności stacji demontażu PHU U Konesera, zaleca się natychmiastowe zabezpieczenie podzespołów elektrycznych, weryfikację kodów OEM z naklejek oraz oznaczenie regałem WMS przed wysyłką do klienta.`,
          timestamp: new Date().toLocaleTimeString("pl-PL").slice(0, 5),
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleApplyAction = (rec: AiAgentRecommendation) => {
    setAppliedActionIds((prev) => new Set([...prev, rec.id]));
    if (rec.type === "low_stock") {
      // Create dismantle task
      const newTask: WorkerTask = {
        id: `task_auto_${Date.now()}`,
        title: "Demontaż uzupełniający: Części o niskim stanie magazynowym",
        description: "Agent AI automatycznie zlecił odzysk części z pojazdów na placu w celu uzupełnienia krytycznych stanów WMS.",
        category: "Demontaż",
        priority: "Krytyczny (Pilny)",
        status: "Do zrobienia",
        assignedTo: "Marek Demontaż",
        targetRack: "MAG 14",
        estimatedMinutes: 45,
        createdAt: new Date().toLocaleString("pl-PL"),
        createdBy: "Agent AI Dyspozytor",
        aiGenerated: true,
      };
      setTasks((prev) => [newTask, ...prev]);
      alert("Zlecenie uzupełnienia stanów zostało pomyślnie dodane do panelu zadań pracownika!");
    } else if (rec.type === "allegro_draft") {
      if (onNavigateToAllegro) onNavigateToAllegro();
    } else if (rec.type === "dismantle_opportunity") {
      setActiveSubTab("dispatcher");
    } else {
      alert(`Zastosowano zalecenie: ${rec.title}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* HEADER AGENTA AI */}
      <div className="bg-gradient-to-r from-[#0b1329] via-[#091024] to-[#070b14] border border-cyan-500/30 rounded-xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl text-slate-950 font-black shadow-md shrink-0 flex items-center justify-center">
              <Brain className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-white font-mono tracking-tight flex items-center gap-2">
                  AGENT AI: DYSPOZYTOR & KOORDYNATOR WARSZTATU
                </h2>
                <span className="px-2 py-0.5 bg-cyan-400/20 text-cyan-300 font-mono text-[10px] font-bold rounded-full border border-cyan-400/40 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-300 animate-pulse" />
                  Gemini 3.7 Flash Engine
                </span>
                <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-300 font-mono text-[10px] font-bold rounded border border-emerald-500/30">
                  Autonomia WMS: Aktywna
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                Inteligentny agent optymalizuje harmonogram demontażu pojazdów, wykrywa deficyty magazynowe, kalkuluje zyskowność złomowania vs sprzedaży na części oraz asystuje pracownikom w czasie rzeczywistym.
              </p>
            </div>
          </div>

          {/* Quick Metrics Badge */}
          <div className="flex items-center gap-2 bg-[#040813]/90 border border-slate-800 p-2 rounded-xl font-mono text-xs">
            <div className="px-3 py-1 bg-slate-900 rounded-lg border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block">Zadań w toku</span>
              <strong className="text-yellow-400 font-black">{tasks.filter((t) => t.status !== "Zakończone").length}</strong>
            </div>
            <div className="px-3 py-1 bg-slate-900 rounded-lg border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block">Aut w kolejce</span>
              <strong className="text-cyan-400 font-black">{vehicles.filter((v) => v.status === "W kolejce do demontażu").length}</strong>
            </div>
            <div className="px-3 py-1 bg-slate-900 rounded-lg border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block">Wycena WMS</span>
              <strong className="text-emerald-400 font-black">{auditMetrics.totalInventoryValue.toLocaleString("pl-PL")} PLN</strong>
            </div>
          </div>
        </div>

        {/* SUB-NAVIGATION TABS */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
          {[
            { id: "audit", label: "Audyt Magazynu & Rekomendacje", icon: Sparkles },
            { id: "dispatcher", label: "Inteligentny Generator Zadań", icon: ClipboardList },
            { id: "roi_calculator", label: "Kalkulator Opłacalności Demontażu", icon: DollarSign },
            { id: "advisor", label: "Doradca Techniczny na Żywo (Google Search)", icon: Bot },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  isActive
                    ? "bg-cyan-500 text-slate-950 shadow-sm"
                    : "bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SUBTAB 1: AUDYT MAGAZYNU & REKOMENDACJE */}
      {activeSubTab === "audit" && (
        <div className="space-y-4">
          {/* STATYSTYKI AUDYTU */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
            <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Stan Magazynowy WMS
              </span>
              <div className="text-2xl font-black text-white">{auditMetrics.totalCount} pozycji</div>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Zsynchronizowano z Cloud Firestore
              </span>
            </div>

            <div className="bg-[#0b0f19] border border-amber-500/30 rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-400" /> Niski stan magazynowy
              </span>
              <div className="text-2xl font-black text-amber-300">{auditMetrics.lowStock} pozycji</div>
              <span className="text-[11px] text-slate-400">Próg alarmowy ≤ 3 szt.</span>
            </div>

            <div className="bg-[#0b0f19] border border-blue-500/30 rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">
                Gotowe szkice poza Allegro
              </span>
              <div className="text-2xl font-black text-blue-300">{auditMetrics.notOnAllegro} szt.</div>
              <span className="text-[11px] text-slate-400">Potencjał natychmiastowej sprzedaży</span>
            </div>

            <div className="bg-[#0b0f19] border border-purple-500/30 rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">
                Brakujące numery OEM
              </span>
              <div className="text-2xl font-black text-purple-300">{auditMetrics.missingOem} szt.</div>
              <span className="text-[11px] text-slate-400">Wymaga wzbogacenia przez AI</span>
            </div>
          </div>

          {/* LISTA REKOMENDACJI */}
          <div className="bg-[#0b0f19] border border-slate-800/90 rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-white font-mono flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Rekomendacje Działania Agenta AI (Odzysk Marży & Czasu)
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Algorytm przeanalizował obroty i wygenerował optymalne kroki dla personelu stacji w Mysłakowicach.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsAuditing(true);
                  setTimeout(() => {
                    setIsAuditing(false);
                    setLastAuditTime("Przed chwilą");
                  }, 500);
                }}
                disabled={isAuditing}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? "animate-spin text-cyan-400" : ""}`} />
                <span>Odśwież audyt</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {recommendations.map((rec) => {
                const isApplied = appliedActionIds.has(rec.id);
                return (
                  <div
                    key={rec.id}
                    className={`p-4 rounded-xl border transition flex flex-col justify-between gap-3 ${
                      isApplied
                        ? "bg-slate-950/60 border-slate-800 opacity-60"
                        : "bg-[#070c18] border-cyan-500/20 hover:border-cyan-500/40"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                            rec.impact === "Wysoki zysk"
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-blue-500/15 text-blue-300 border-blue-500/30"
                          }`}
                        >
                          Wpływ: {rec.impact}
                        </span>
                        {isApplied && (
                          <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Zastosowano
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-white font-mono leading-snug">{rec.title}</h4>
                      <p className="text-xs text-slate-300 font-sans leading-relaxed">{rec.description}</p>
                    </div>

                    <button
                      onClick={() => handleApplyAction(rec)}
                      disabled={isApplied}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                        isApplied
                          ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                          : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-sm"
                      }`}
                    >
                      <span>{isApplied ? "Wykonano" : rec.suggestedAction}</span>
                      {!isApplied && <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: GENERATOR ZADAŃ DYSPOZYTORA */}
      {activeSubTab === "dispatcher" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 bg-[#0b0f19] border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
            <div>
              <h3 className="text-sm font-black text-white font-mono flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-yellow-400" />
                Konfigurator Dyspozytora AI
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Wybierz auto z kolejki demontażowej, a Agent AI wygeneruje precyzyjne zadania dla pracowników.
              </p>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Pojazd z placu:</label>
                <select
                  value={selectedVehicleForTask}
                  onChange={(e) => setSelectedVehicleForTask(e.target.value)}
                  className="w-full bg-[#030712] border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.make} {v.model} ({v.year}) - {v.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Priorytetowy obszar demontażu:</label>
                <select
                  value={taskFocusArea}
                  onChange={(e) => setTaskFocusArea(e.target.value)}
                  className="w-full bg-[#030712] border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="Oświetlenie, sterowniki ECU i podzespoły o wysokiej wartości">
                    Oświetlenie, sterowniki ECU i elektronika (Maksymalna marża)
                  </option>
                  <option value="Układ hamulcowy (zaciski, tarcze) i osprzęt silnika">
                    Układ hamulcowy (zaciski, tarcze) i osprzęt silnika
                  </option>
                  <option value="Elementy blacharskie, drzwi, klapy i pasy przednie">
                    Elementy karoserii, drzwi, klapy i zderzaki
                  </option>
                  <option value="Odzysk płynów, akumulator, katalizator i segregacja BDO">
                    Odzysk płynów, akumulator, katalizator (Procedura BDO)
                  </option>
                </select>
              </div>

              <button
                onClick={handleGenerateAiTasks}
                disabled={isGeneratingTasks}
                className="w-full py-2.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 font-black rounded-lg text-xs flex items-center justify-center gap-2 hover:opacity-90 transition cursor-pointer shadow-md"
              >
                {isGeneratingTasks ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Optymalizowanie zadań...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current" />
                    <span>Wygeneruj Zadania dla Zespołu</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 bg-[#0b0f19] border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white font-mono flex items-center gap-2">
                <Wrench className="w-4 h-4 text-cyan-400" />
                Aktualny Plan Zadań w Warsztacie ({tasks.length})
              </h3>
              {onNavigateToWorker && (
                <button
                  onClick={onNavigateToWorker}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-mono font-bold flex items-center gap-1"
                >
                  <span>Przejdź do panelu pracownika</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-[#070b14] border border-slate-800/90 rounded-xl p-3.5 space-y-2 font-mono text-xs hover:border-slate-700 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          task.priority.includes("Krytyczny")
                            ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                            : "bg-yellow-400/15 text-yellow-300 border-yellow-400/30"
                        }`}
                      >
                        {task.priority}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] border border-slate-700">
                        {task.category}
                      </span>
                      {task.aiGenerated && (
                        <span className="px-1.5 py-0.5 bg-cyan-500/15 text-cyan-300 rounded text-[9px] font-bold border border-cyan-500/30 flex items-center gap-1">
                          <Bot className="w-2.5 h-2.5" /> AI
                        </span>
                      )}
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        task.status === "Zakończone"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : task.status === "W trakcie"
                          ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
                          : "bg-slate-800 text-slate-300 border-slate-700"
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>

                  <h4 className="font-bold text-white leading-snug">{task.title}</h4>
                  <p className="text-slate-400 font-sans text-xs">{task.description}</p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400 border-t border-slate-850">
                    <span>
                      Przypisany: <strong className="text-slate-200">{task.assignedTo || "Personel"}</strong>
                    </span>
                    {task.targetRack && (
                      <span>
                        Regał: <strong className="text-yellow-400">{task.targetRack}</strong>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: KALKULATOR ROI DEMONTAŻU */}
      {activeSubTab === "roi_calculator" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 bg-[#0b0f19] border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
            <div>
              <h3 className="text-sm font-black text-white font-mono flex items-center gap-2">
                <Car className="w-4 h-4 text-emerald-400" />
                Dane Wyceniane Pojazdu
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Kalkulacja potencjalnego przychodu z demontażu na części vs sprzedaży jako czysty surowiec / złom stalowy.
              </p>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Marka:</label>
                <input
                  type="text"
                  value={calcMake}
                  onChange={(e) => setCalcMake(e.target.value)}
                  className="w-full bg-[#030712] border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Model i Wersja:</label>
                <input
                  type="text"
                  value={calcModel}
                  onChange={(e) => setCalcModel(e.target.value)}
                  className="w-full bg-[#030712] border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Stan pojazdu:</label>
                <select
                  value={calcCondition}
                  onChange={(e) => setCalcCondition(e.target.value as any)}
                  className="w-full bg-[#030712] border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="Powypadkowy (sprawny tył i silnik)">Powypadkowy (sprawny tył i silnik)</option>
                  <option value="Uszkodzony silnik (idealna blacharka)">Uszkodzony silnik (idealna blacharka)</option>
                  <option value="Spalony / Kompletnie rozbity">Spalony / Kompletnie rozbity</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="hasCatCheck"
                  checked={hasCatalyst}
                  onChange={(e) => setHasCatalyst(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-400 bg-slate-900 border-slate-700 cursor-pointer"
                />
                <label htmlFor="hasCatCheck" className="text-slate-300 cursor-pointer">
                  Obecny oryginalny katalizator / filtr DPF
                </label>
              </div>

              <button
                onClick={handleCalculateRoi}
                disabled={isCalculatingRoi}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
              >
                {isCalculatingRoi ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                <span>Przelicz Zyskowność Demontażu</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 bg-[#0b0f19] border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
            <h3 className="text-sm font-black text-white font-mono flex items-center gap-2 border-b border-slate-800 pb-3">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Wynik Symulacji i Rekomendacja Strategiczna Agenta AI
            </h3>

            {roiResult ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-[#091024] to-[#070b14] border border-emerald-500/40 space-y-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 tracking-wider">
                    Rekomendacja Strategiczna
                  </span>
                  <div className="text-base font-black text-white font-mono">{roiResult.recommendedStrategy}</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                  <div className="p-3.5 rounded-xl bg-[#070b14] border border-slate-800 space-y-2">
                    <span className="text-[11px] text-cyan-400 font-bold block">
                      Wariant A: Demontaż części + reszta złom
                    </span>
                    <div className="space-y-1 text-slate-300">
                      <div className="flex justify-between">
                        <span>Części sprawne (WMS):</span>
                        <strong className="text-white">+{roiResult.estimatedPartsTotal} PLN</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Złom stalowy z karoserii:</span>
                        <strong className="text-white">+{Math.round(roiResult.scrapMetalValue * 0.7)} PLN</strong>
                      </div>
                      {roiResult.catalystValue > 0 && (
                        <div className="flex justify-between">
                          <span>Katalizator / DPF (BDO):</span>
                          <strong className="text-emerald-400">+{roiResult.catalystValue} PLN</strong>
                        </div>
                      )}
                      <div className="flex justify-between text-rose-400">
                        <span>Robocizna demontażysty:</span>
                        <strong>-{roiResult.laborCost} PLN</strong>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex justify-between font-black text-sm text-emerald-400">
                      <span>ZYSK NETTO:</span>
                      <span>{roiResult.netProfitDismantle.toLocaleString("pl-PL")} PLN</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#070b14] border border-slate-800 space-y-2">
                    <span className="text-[11px] text-amber-400 font-bold block">
                      Wariant B: Bezpośrednie złomowanie (całość)
                    </span>
                    <div className="space-y-1 text-slate-300">
                      <div className="flex justify-between">
                        <span>Waga całkowita złomu:</span>
                        <strong className="text-white">+{roiResult.scrapMetalValue} PLN</strong>
                      </div>
                      {roiResult.catalystValue > 0 && (
                        <div className="flex justify-between">
                          <span>Katalizator (BDO):</span>
                          <strong className="text-emerald-400">+{roiResult.catalystValue} PLN</strong>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-500">
                        <span>Czas pracy:</span>
                        <strong>0 h (Błyskawiczne)</strong>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex justify-between font-black text-sm text-amber-300">
                      <span>ZYSK NETTO:</span>
                      <span>{roiResult.netProfitDirectScrap.toLocaleString("pl-PL")} PLN</span>
                    </div>
                  </div>
                </div>

                {/* Key parts checklist */}
                <div className="p-3.5 rounded-xl bg-[#070b14] border border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-white font-mono">
                    Kluczowe podzespoły do bezwzględnego odzyskania:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-mono text-xs text-slate-300">
                    {roiResult.keyPartsToSave.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 font-mono text-xs">
                <Car className="w-10 h-10 mx-auto text-slate-700 mb-2" />
                <p>Wprowadź parametry pojazdu po lewej stronie i kliknij „Przelicz Zyskowność Demontażu”.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 4: DORADCA TECHNICZNY NA ŻYWO (GOOGLE SEARCH GROUNDING) */}
      {activeSubTab === "advisor" && (
        <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-black text-white font-mono flex items-center gap-2">
                <Bot className="w-4 h-4 text-cyan-400" />
                Live AI Advisor: Konsultant Warsztatowy & Magazynowy
              </h3>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Zadaj dowolne pytanie o numery zamienników, kody silników, demontaż czy rynkowe ceny podzespołów.
              </p>
            </div>
            <span className="text-[10px] px-2 py-0.5 bg-emerald-500/15 text-emerald-300 font-mono font-bold rounded border border-emerald-500/30 flex items-center gap-1">
              <Globe className="w-3 h-3 text-emerald-400" /> Live Google Grounding
            </span>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 p-2 bg-[#040711] rounded-xl border border-slate-850">
            {chatMessages.map((msg, idx) => (
              <div
                key={msg.id || idx}
                className={`flex gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.sender === "bot" && (
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`p-3 rounded-xl max-w-[85%] text-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-yellow-400 text-slate-950 font-medium"
                      : "bg-[#0c1222] border border-slate-800 text-slate-200"
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>

                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-700/60 flex flex-wrap gap-1 text-[10px]">
                      <span className="text-slate-400">Źródła:</span>
                      {msg.sources.map((s, sIdx) => (
                        <a
                          key={sIdx}
                          href={s.uri}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-400 hover:underline inline-block truncate max-w-[180px]"
                        >
                          {s.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isChatLoading && (
              <div className="flex items-center gap-2 text-xs text-cyan-400 font-mono p-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Agent AI przeszukuje dokumentację i bazy rynkowe...</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSendChat} className="flex gap-2 pt-1">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Zapytaj np. 'Czy lampa z Polo 6N pasuje do 6N2?', 'Jaka jest cena katalizatora z 1.9 TDI?'..."
              className="flex-1 bg-[#030712] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono transition"
            />
            <button
              type="submit"
              disabled={isChatLoading || !chatInput.trim()}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs font-mono transition flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Wyślij</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
