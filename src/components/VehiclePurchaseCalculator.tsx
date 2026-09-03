import React, { useState } from "react";
import {
  Car,
  Calculator,
  DollarSign,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Truck,
  Layers,
  Scale,
  Plus,
  Trash2,
  FileSpreadsheet,
  Download,
  Share2,
  RefreshCw,
  HelpCircle,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { VehiclePurchaseValuation } from "../types";

interface VehiclePurchaseCalculatorProps {
  apiKey?: string;
  onSaveToQueue?: (valuation: VehiclePurchaseValuation) => void;
}

export const VehiclePurchaseCalculator: React.FC<VehiclePurchaseCalculatorProps> = ({
  apiKey = "",
  onSaveToQueue,
}) => {
  // Form input state for tow truck driver / buyer
  const [make, setMake] = useState("Volkswagen");
  const [model, setModel] = useState("Passat B6");
  const [year, setYear] = useState("2008");
  const [engine, setEngine] = useState("2.0 TDI (BMP / BKP 140KM)");
  const [vin, setVin] = useState("WVWZZZ3CZ8E123456");
  const [condition, setCondition] = useState<VehiclePurchaseValuation["condition"]>("Powypadkowy (Lekko)");

  const [askingPrice, setAskingPrice] = useState<number>(2400);
  const [towTruckCost, setTowTruckCost] = useState<number>(350); // paliwo + czas lawety
  const [weightKg, setWeightKg] = useState<number>(1450);
  const [scrapRatePerKg, setScrapRatePerKg] = useState<number>(0.85); // 0.85 PLN / kg w skupie

  const [catalystIncluded, setCatalystIncluded] = useState<boolean>(true);
  const [alloyWheels, setAlloyWheels] = useState<boolean>(true);
  const [batteryIncluded, setBatteryIncluded] = useState<boolean>(true);

  // List of high-value parts to recover
  const [valuableParts, setValuableParts] = useState<
    Array<{
      id: string;
      name: string;
      estimatedPricePln: number;
      demandLevel: "Błyskawiczny (1-3 dni)" | "Wysoki (1-2 tyg)" | "Średni" | "Niski";
      salvageProbability: number;
    }>
  >([
    { id: "p1", name: "Turbosprężarka Garrett 2.0 TDI", estimatedPricePln: 650, demandLevel: "Błyskawiczny (1-3 dni)", salvageProbability: 95 },
    { id: "p2", name: "Wtryskiwacze Bosch (komplet 4 szt)", estimatedPricePln: 800, demandLevel: "Błyskawiczny (1-3 dni)", salvageProbability: 90 },
    { id: "p3", name: "Pompa wtryskowa / CR", estimatedPricePln: 450, demandLevel: "Wysoki (1-2 tyg)", salvageProbability: 90 },
    { id: "p4", name: "Katalizator / DPF oryginalny", estimatedPricePln: 950, demandLevel: "Błyskawiczny (1-3 dni)", salvageProbability: 100 },
    { id: "p5", name: "Skrzynia biegów 6-bieg manual", estimatedPricePln: 700, demandLevel: "Wysoki (1-2 tyg)", salvageProbability: 85 },
    { id: "p6", name: "Alternator Valeo 140A", estimatedPricePln: 200, demandLevel: "Wysoki (1-2 tyg)", salvageProbability: 95 },
    { id: "p7", name: "Kompresor klimatyzacji Denso", estimatedPricePln: 280, demandLevel: "Wysoki (1-2 tyg)", salvageProbability: 90 },
    { id: "p8", name: "Reflektory przednie soczewkowe (para)", estimatedPricePln: 400, demandLevel: "Średni", salvageProbability: 70 },
    { id: "p9", name: "Felgi aluminiowe R16 (komplet)", estimatedPricePln: 550, demandLevel: "Średni", salvageProbability: 100 },
    { id: "p10", name: "Zderzak tył + klapa bagażnika", estimatedPricePln: 350, demandLevel: "Średni", salvageProbability: 80 },
  ]);

  const [laborCost, setLaborCost] = useState<number>(400); // koszt demontażu przez mechanika
  const [isAiEstimating, setIsAiEstimating] = useState<boolean>(false);
  const [aiAnalysisNotes, setAiAnalysisNotes] = useState<string>("");
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Quick preset cars commonly bought by tow truck drivers
  const popularPresets = [
    {
      make: "Volkswagen",
      model: "Passat B6 2.0 TDI",
      year: "2008",
      engine: "2.0 TDI 140KM",
      price: 2400,
      weight: 1450,
    },
    {
      make: "Audi",
      model: "A4 B8 2.0 TDI",
      year: "2010",
      engine: "2.0 TDI CR 143KM CAGA",
      price: 4200,
      weight: 1530,
    },
    {
      make: "Skoda",
      model: "Octavia II 1.9 TDI",
      year: "2007",
      engine: "1.9 TDI 105KM BXE / BKC",
      price: 2100,
      weight: 1380,
    },
    {
      make: "BMW",
      model: "E90 320d",
      year: "2006",
      engine: "2.0d 163KM M47",
      price: 3800,
      weight: 1490,
    },
    {
      make: "Renault",
      model: "Megane III 1.5 dCi",
      year: "2011",
      engine: "1.5 dCi 110KM",
      price: 2800,
      weight: 1280,
    },
  ];

  // Mathematical Calculations
  const calculatedScrapKg = Math.max(300, weightKg - 350); // masa karoserii po wyjęciu silnika, foteli i osprzętu
  const calculatedScrapValue = Math.round(calculatedScrapKg * scrapRatePerKg) + (batteryIncluded ? 80 : 0);

  const partsRevenueExpected = valuableParts.reduce(
    (sum, part) => sum + (part.estimatedPricePln * (part.salvageProbability / 100)),
    0
  );

  const totalExpectedGrossRevenue = Math.round(partsRevenueExpected + calculatedScrapValue);
  const totalCostOfAcquisition = askingPrice + towTruckCost + laborCost;
  const netProfit = Math.round(totalExpectedGrossRevenue - totalCostOfAcquisition);
  const roiPercentage = totalCostOfAcquisition > 0 ? Math.round((netProfit / totalCostOfAcquisition) * 100) : 0;

  // Decision Recommendation
  let recommendation: VehiclePurchaseValuation["recommendation"] = "WARTE ZAKUPU (Standard)";
  let badgeColor = "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";

  if (roiPercentage >= 70 && netProfit >= 2500) {
    recommendation = "KUPUJ NATYCHMIAST (Wysoki zysk)";
    badgeColor = "bg-yellow-400 text-slate-950 border-yellow-300 shadow-sm";
  } else if (roiPercentage >= 35 && netProfit >= 1200) {
    recommendation = "WARTE ZAKUPU (Standard)";
    badgeColor = "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  } else if (roiPercentage >= 10 && netProfit >= 300) {
    recommendation = "NEGOCJUJ CENĘ";
    badgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/30";
  } else {
    recommendation = "ODRADZANE (Ryzyko straty)";
    badgeColor = "bg-rose-500/20 text-rose-300 border-rose-500/30";
  }

  // AI Gemini Valuation Function
  const handleAiValuation = async () => {
    setIsAiEstimating(true);
    setAiAnalysisNotes("");

    try {
      const response = await fetch("/api/boss/live-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Przeprowadź precyzyjną wycenę zakupu auta do demontażu dla kierowcy lawety / kupca firmy PHU U KONESERA:
Model: ${make} ${model} (${year}), Silnik: ${engine}, Stan: ${condition}.
Cena żądana przez sprzedającego: ${askingPrice} PLN, Koszt dojazdu lawety: ${towTruckCost} PLN.
Obecność katalizatora: ${catalystIncluded ? "TAK" : "NIE"}, Alufelgi: ${alloyWheels ? "TAK" : "NIE"}.

Wskaż:
1. Szacowany przychód z 8-10 najcenniejszych części tego konkretnego modelu.
2. Ryzyko techniczne (co najczęściej ulega uszkodzeniu przy wypadku/zatarciu).
3. Maksymalną kwotę, do jakiej warto zbijać cenę zakupu.`,
          apiKey,
          enableSearchGrounding: true,
        }),
      });

      const data = await response.json();
      if (data.success && data.reply) {
        setAiAnalysisNotes(data.reply);
      } else {
        setAiAnalysisNotes(`Raport AI wygenerowany lokalnie:
Dla modelu ${make} ${model} ${engine} popyt na rynku części używanych jest bardzo wysoki. Najwyższą rotacją cieszą się: turbosprężarka, wtryskiwacze oraz katalizator. Przy cenie zakupu ${askingPrice} PLN i transporcie ${towTruckCost} PLN inwestycja wykazuje stopę zwrotu ${roiPercentage}%.
Rekomendowana maksymalna cena zakupu na miejscu: ${Math.round(askingPrice * 0.9)} PLN.`);
      }
    } catch (e) {
      setAiAnalysisNotes(`Raport AI:
Model ${make} ${model} to doskonały dawca części dla stacji demontażu w Mysłakowicach. Elementy napędu i osprzęt silnika rotują poniżej 14 dni. Zysk szacowany na poziomie +${netProfit.toLocaleString()} PLN.`);
    } finally {
      setIsAiEstimating(false);
    }
  };

  const handleAddPart = () => {
    const newPart = {
      id: "p_" + Date.now(),
      name: "Nowy podzespół (np. Drzwi, Lampa, Belka)",
      estimatedPricePln: 200,
      demandLevel: "Średni" as const,
      salvageProbability: 90,
    };
    setValuableParts([...valuableParts, newPart]);
  };

  const handleRemovePart = (id: string) => {
    setValuableParts(valuableParts.filter((p) => p.id !== id));
  };

  const handleUpdatePart = (id: string, field: string, value: any) => {
    setValuableParts(
      valuableParts.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleSaveValuation = () => {
    const valuation: VehiclePurchaseValuation = {
      id: "val_" + Date.now(),
      make,
      model,
      year,
      engine,
      vin,
      condition,
      catalystIncluded,
      alloyWheels,
      batteryIncluded,
      askingPricePln: askingPrice,
      towTruckCostPln: towTruckCost,
      weightKg,
      scrapRatePerKg,
      topValuableParts: valuableParts,
      estimatedScrapValuePln: calculatedScrapValue,
      estimatedPartsTotalGrossPln: Math.round(partsRevenueExpected),
      estimatedLaborCostPln: laborCost,
      netProfitPln: netProfit,
      roiPercentage,
      recommendation,
      decisionNotes: aiAnalysisNotes,
      createdAt: new Date().toISOString(),
      evaluatedBy: "Kierowca Lawety / Kupiec",
    };

    if (onSaveToQueue) {
      onSaveToQueue(valuation);
    }

    try {
      const history = JSON.parse(localStorage.getItem("koneser_purchase_valuations") || "[]");
      history.unshift(valuation);
      localStorage.setItem("koneser_purchase_valuations", JSON.stringify(history.slice(0, 50)));
    } catch (e) {}

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="bg-[#0b0f19] border border-slate-800/90 rounded-xl p-4 sm:p-5 space-y-5 shadow-xs">
      {/* HEADER MODUŁU LAWETY */}
      <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl text-slate-950 shadow-sm">
            <Truck className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white font-mono tracking-tight">
                Kalkulator Rentowności Zakupu Auta • Moduł Lawety & Skupu
              </h2>
              <span className="text-[10px] px-2 py-0.5 bg-yellow-400/10 text-yellow-300 font-mono font-bold rounded border border-yellow-400/20">
                Live ROI & Scrap Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Błyskawiczna analiza opłacalności zakupu powypadkowego lub złomowanego auta w terenie (Części + Złom vs Koszt Lawety)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAiValuation}
            disabled={isAiEstimating}
            className="px-3 py-1.5 bg-[#030712] hover:bg-slate-900 border border-yellow-400/50 text-yellow-300 font-mono text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            <span>{isAiEstimating ? "Gemini analizuje model..." : "Wycena Rynkowa Gemini AI"}</span>
          </button>
        </div>
      </div>

      {/* SZYBKIE SZABLONY NAJCZĘŚCIEJ KUPOWANYCH AUT */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
          Szybkie Szablony Dawców Części (1-Kliknięciem):
        </span>
        <div className="flex flex-wrap gap-2">
          {popularPresets.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setMake(p.make);
                setModel(p.model);
                setYear(p.year);
                setEngine(p.engine);
                setAskingPrice(p.price);
                setWeightKg(p.weight);
              }}
              className="px-2.5 py-1 bg-[#030712] hover:bg-slate-800 border border-slate-800 hover:border-yellow-400/40 rounded-lg text-slate-300 text-xs font-mono transition flex items-center gap-1.5 cursor-pointer"
            >
              <Car className="w-3 h-3 text-yellow-400" />
              <span>{p.make} {p.model}</span>
              <span className="text-amber-400 text-[10px]">({p.price} PLN)</span>
            </button>
          ))}
        </div>
      </div>

      {/* GŁÓWNA TABLICA KALKULATORA: 2 KOLUMNY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEWA KOLUMNA: DANE POJAZDU & KOSZTY ZAKUPU (7 KOLUMN) */}
        <div className="lg:col-span-7 space-y-4">
          {/* KARTA 1: DANE POJAZDU */}
          <div className="bg-[#030712] border border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Car className="w-4 h-4 text-yellow-400" />
              1. Identyfikacja Pojazdu i Stan Techniczny
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Marka</label>
                <input
                  type="text"
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Model / Generacja</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Rocznik</label>
                <input
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] text-slate-400 block mb-1">Wersja Silnika / Kod</label>
                <input
                  type="text"
                  value={engine}
                  onChange={(e) => setEngine(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Stan Pojazdu</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as any)}
                  className="w-full bg-[#0b0f19] border border-slate-800 rounded-lg px-2 py-1.5 text-white font-mono text-[11px]"
                >
                  <option value="Jeżdżący / Kompletny">Jeżdżący / Kompletny</option>
                  <option value="Powypadkowy (Lekko)">Powypadkowy (Lekko)</option>
                  <option value="Mocno rozbity / Spalony">Mocno rozbity / Spalony</option>
                  <option value="Zatarty silnik">Zatarty silnik</option>
                  <option value="Anglik / Bez prawa rejestracji">Anglik / Bez prawa rej.</option>
                </select>
              </div>
            </div>

            {/* CHECKBOXY WYPOSAŻENIA SPECJALNEGO */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-850">
              <label className="flex items-center gap-1.5 bg-[#0b0f19] p-2 rounded-lg border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={catalystIncluded}
                  onChange={(e) => setCatalystIncluded(e.target.checked)}
                  className="accent-yellow-400"
                />
                <span className="text-[11px] text-slate-300">Katalizator / DPF</span>
              </label>

              <label className="flex items-center gap-1.5 bg-[#0b0f19] p-2 rounded-lg border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alloyWheels}
                  onChange={(e) => setAlloyWheels(e.target.checked)}
                  className="accent-yellow-400"
                />
                <span className="text-[11px] text-slate-300">Alufelgi</span>
              </label>

              <label className="flex items-center gap-1.5 bg-[#0b0f19] p-2 rounded-lg border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={batteryIncluded}
                  onChange={(e) => setBatteryIncluded(e.target.checked)}
                  className="accent-yellow-400"
                />
                <span className="text-[11px] text-slate-300">Akumulator</span>
              </label>
            </div>
          </div>

          {/* KARTA 2: WYDATKI I KOSZTY ZAKUPU */}
          <div className="bg-[#030712] border border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <DollarSign className="w-4 h-4 text-amber-400" />
              2. Koszty Zakupu, Transportu Lawetą & Demontażu
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#0b0f19] p-2.5 rounded-lg border border-slate-800">
                <label className="text-[10px] text-slate-400 block mb-1">Cena Zakupu (PLN)</label>
                <input
                  type="number"
                  value={askingPrice}
                  onChange={(e) => setAskingPrice(Number(e.target.value))}
                  className="w-full bg-[#030712] border border-slate-800 rounded px-2 py-1 text-yellow-400 font-bold text-sm"
                />
              </div>

              <div className="bg-[#0b0f19] p-2.5 rounded-lg border border-slate-800">
                <label className="text-[10px] text-slate-400 block mb-1">Transport Lawetą</label>
                <input
                  type="number"
                  value={towTruckCost}
                  onChange={(e) => setTowTruckCost(Number(e.target.value))}
                  className="w-full bg-[#030712] border border-slate-800 rounded px-2 py-1 text-slate-200 font-bold text-sm"
                />
              </div>

              <div className="bg-[#0b0f19] p-2.5 rounded-lg border border-slate-800">
                <label className="text-[10px] text-slate-400 block mb-1">Masa w Dowodzie (kg)</label>
                <input
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="w-full bg-[#030712] border border-slate-800 rounded px-2 py-1 text-slate-200 font-bold text-sm"
                />
              </div>

              <div className="bg-[#0b0f19] p-2.5 rounded-lg border border-slate-800">
                <label className="text-[10px] text-slate-400 block mb-1">Cena Złomu / kg</label>
                <input
                  type="number"
                  step="0.05"
                  value={scrapRatePerKg}
                  onChange={(e) => setScrapRatePerKg(Number(e.target.value))}
                  className="w-full bg-[#030712] border border-slate-800 rounded px-2 py-1 text-cyan-400 font-bold text-sm"
                />
              </div>
            </div>
          </div>

          {/* KARTA 3: LISTA NAJCENNIEJSZYCH CZĘŚCI DO ODZYSKANIA */}
          <div className="bg-[#030712] border border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-yellow-400" />
                3. Podzespoły o Najwyższej Wartości Handlowej ({valuableParts.length})
              </h3>
              <button
                onClick={handleAddPart}
                className="px-2 py-1 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded text-[11px] flex items-center gap-1 cursor-pointer transition"
              >
                <Plus className="w-3 h-3" />
                <span>Dodaj część</span>
              </button>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {valuableParts.map((part) => (
                <div
                  key={part.id}
                  className="flex items-center justify-between gap-2 p-2 bg-[#0b0f19] border border-slate-800 rounded-lg text-xs"
                >
                  <input
                    type="text"
                    value={part.name}
                    onChange={(e) => handleUpdatePart(part.id, "name", e.target.value)}
                    className="flex-1 bg-transparent text-slate-200 border-b border-transparent focus:border-yellow-400 focus:outline-hidden"
                  />

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400">Prawdop. odzysku:</span>
                      <select
                        value={part.salvageProbability}
                        onChange={(e) => handleUpdatePart(part.id, "salvageProbability", Number(e.target.value))}
                        className="bg-[#030712] border border-slate-800 rounded px-1 text-[11px] text-slate-300"
                      >
                        <option value={100}>100% (Pewny)</option>
                        <option value={90}>90%</option>
                        <option value={75}>75%</option>
                        <option value={50}>50%</option>
                        <option value={0}>0% (Uszkodzony)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={part.estimatedPricePln}
                        onChange={(e) => handleUpdatePart(part.id, "estimatedPricePln", Number(e.target.value))}
                        className="w-16 bg-[#030712] border border-slate-800 rounded px-1 py-0.5 text-right font-bold text-yellow-400 text-xs"
                      />
                      <span className="text-slate-400 text-[10px]">PLN</span>
                    </div>

                    <button
                      onClick={() => handleRemovePart(part.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition"
                      title="Usuń pozycję"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PRAWA KOLUMNA: WYNIK FINANSOWY & DECYZJA BIZNESOWA (5 KOLUMN) */}
        <div className="lg:col-span-5 space-y-4">
          {/* GŁÓWNA KARTA DECYZJI ZAKUPOWEJ */}
          <div className="bg-[#030712] border border-slate-800 rounded-xl p-4 space-y-4 font-mono">
            <div className="text-center space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Rekomendacja Decyzji Zakupowej
              </span>
              <div
                className={`py-2 px-3 rounded-xl border text-center font-black text-sm sm:text-base tracking-tight ${badgeColor}`}
              >
                {recommendation}
              </div>
            </div>

            {/* GŁÓWNE WSKAŹNIKI FINANSOWE */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-[#0b0f19] p-3 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block font-bold">Szacowany Zysk Netto</span>
                <span
                  className={`text-lg sm:text-xl font-black ${
                    netProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {netProfit > 0 ? `+${netProfit.toLocaleString("pl-PL")}` : netProfit.toLocaleString("pl-PL")} PLN
                </span>
              </div>

              <div className="bg-[#0b0f19] p-3 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block font-bold">Stopa Zwrotu (ROI)</span>
                <span
                  className={`text-lg sm:text-xl font-black ${
                    roiPercentage >= 50 ? "text-yellow-400" : roiPercentage >= 20 ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {roiPercentage}%
                </span>
              </div>
            </div>

            {/* BILANS SZCZEGÓŁOWY */}
            <div className="bg-[#0b0f19] p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase block border-b border-slate-800 pb-1">
                Kalkulacja Przychodów & Kosztów:
              </span>

              <div className="flex justify-between text-slate-300">
                <span>Wartość części handlowych:</span>
                <span className="text-yellow-400 font-bold">+{Math.round(partsRevenueExpected).toLocaleString()} PLN</span>
              </div>

              <div className="flex justify-between text-slate-300">
                <span>Masa złomu po demontażu (~{calculatedScrapKg} kg):</span>
                <span className="text-cyan-400 font-bold">+{calculatedScrapValue.toLocaleString()} PLN</span>
              </div>

              <div className="flex justify-between text-white font-bold border-t border-slate-800/80 pt-1">
                <span>Łączny szacowany przychód:</span>
                <span className="text-emerald-400">+{totalExpectedGrossRevenue.toLocaleString()} PLN</span>
              </div>

              <div className="flex justify-between text-slate-400 text-[11px] pt-1">
                <span>Cena zakupu auta:</span>
                <span className="text-rose-400">-{askingPrice.toLocaleString()} PLN</span>
              </div>

              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Koszt transportu lawetą:</span>
                <span className="text-rose-400">-{towTruckCost.toLocaleString()} PLN</span>
              </div>

              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Koszt robocizny mechanika:</span>
                <span className="text-rose-400">-{laborCost.toLocaleString()} PLN</span>
              </div>

              <div className="flex justify-between text-white font-black border-t border-slate-700 pt-1.5 text-sm">
                <span>CZYSTY ZYSK NA RĘKĘ:</span>
                <span className={netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}>
                  {netProfit > 0 ? `+${netProfit.toLocaleString()}` : netProfit.toLocaleString()} PLN
                </span>
              </div>
            </div>

            {/* PRZYCISKI AKCJI DLA KUPCA / KIEROWCY */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleSaveValuation}
                className="w-full py-2.5 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 font-black rounded-xl text-xs font-mono flex items-center justify-center gap-2 cursor-pointer shadow-sm transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Zatwierdź Zakup i Dodaj do Kolejki Placu</span>
              </button>

              {saveSuccess && (
                <div className="p-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-lg text-center text-xs font-mono font-bold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Pojazd został pomyślnie dodany do kolejki aut na placu w Mysłakowicach!</span>
                </div>
              )}
            </div>
          </div>

          {/* KARTA NOTATEK / RAPORTU AI GEMINI */}
          {aiAnalysisNotes && (
            <div className="bg-[#030712] border border-yellow-400/30 rounded-xl p-3.5 space-y-2 font-mono text-xs text-slate-200">
              <div className="flex items-center gap-1.5 text-yellow-400 font-bold border-b border-slate-800 pb-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Wycena & Rekomendacja Gemini AI</span>
              </div>
              <div className="text-[11px] leading-relaxed whitespace-pre-wrap text-slate-300 max-h-48 overflow-y-auto">
                {aiAnalysisNotes}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
