import React, { useState, useMemo } from "react";
import {
  Warehouse,
  QrCode,
  Search,
  X,
  Car,
  Package,
  Layers,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  History,
  Printer,
  ChevronRight,
  ExternalLink,
  Tag,
  Scan,
  Camera,
  RefreshCw,
  Clock,
  Sparkles,
} from "lucide-react";
import { PartItem, WarehouseRackInfo } from "../types";
import {
  STANDARD_WAREHOUSE_RACKS,
  ensurePartCompleteHistory,
  relocatePart,
} from "../utils/partHistoryService";
import { QrBarcodeGenerator } from "./QrBarcodeGenerator";
import { PartHistoryModal } from "./PartHistoryModal";

interface WarehouseRacksModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: PartItem[];
  onUpdatePart: (updatedPart: PartItem) => void;
  initialScannedCode?: string;
  onSelectPartForEdit?: (part: PartItem) => void;
  currentUserName?: string;
}

export const WarehouseRacksModal: React.FC<WarehouseRacksModalProps> = ({
  isOpen,
  onClose,
  parts: rawParts,
  onUpdatePart,
  initialScannedCode = "",
  onSelectPartForEdit,
  currentUserName = "Kierownik Magazynu",
}) => {
  const parts = useMemo(() => rawParts.map(ensurePartCompleteHistory), [rawParts]);

  const [scanInput, setScanInput] = useState<string>(initialScannedCode);
  const [selectedRackCode, setSelectedRackCode] = useState<string>("MAG 14");
  const [selectedPartForHistory, setSelectedPartForHistory] = useState<PartItem | null>(null);
  
  // Relocate fast modal state
  const [partToRelocate, setPartToRelocate] = useState<PartItem | null>(null);
  const [relocateTargetRack, setRelocateTargetRack] = useState<string>("");
  const [relocateNote, setRelocateNote] = useState<string>("");
  const [relocationFeedback, setRelocationFeedback] = useState<string | null>(null);

  // Active view tab: "rack_browser" | "scanner_terminal" | "all_racks_map"
  const [subTab, setSubTab] = useState<"rack_browser" | "scanner_terminal" | "all_racks_map">("rack_browser");

  if (!isOpen) return null;

  // Group parts by rack code
  const partsByRack = useMemo(() => {
    const map: Record<string, PartItem[]> = {};
    for (const r of STANDARD_WAREHOUSE_RACKS) {
      map[r.rackCode] = [];
    }

    for (const p of parts) {
      const rack = (p.currentRackLocation || p.listingData?.ocr_wyniki?.numer_magazynowy || "MAG 14").trim().toUpperCase();
      if (!map[rack]) {
        map[rack] = [];
      }
      map[rack].push(p);
    }
    return map;
  }, [parts]);

  // List of all active rack codes (predefined + any custom ones found in parts)
  const allRackCodes = useMemo(() => {
    const set = new Set<string>(STANDARD_WAREHOUSE_RACKS.map((r) => r.rackCode));
    for (const p of parts) {
      const r = (p.currentRackLocation || p.listingData?.ocr_wyniki?.numer_magazynowy || "").trim().toUpperCase();
      if (r) set.add(r);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pl"));
  }, [parts]);

  // Parts on the currently selected rack
  const currentRackParts = useMemo(() => {
    return partsByRack[selectedRackCode] || [];
  }, [partsByRack, selectedRackCode]);

  // Total value and pieces on current rack
  const rackStats = useMemo(() => {
    const list = currentRackParts;
    const totalVal = list.reduce((acc, p) => acc + (p.listingData?.cena?.brutto || 0) * (p.ilosc ?? 1), 0);
    const inStockCount = list.filter((p) => p.status === "Dostępny").length;
    const reservedCount = list.filter((p) => p.status === "Zarezerwowany").length;
    const soldCount = list.filter((p) => p.status === "Sprzedany").length;
    return {
      totalVal,
      totalCount: list.length,
      inStockCount,
      reservedCount,
      soldCount,
    };
  }, [currentRackParts]);

  // Handle barcode / QR scan execution
  const handleProcessScan = (codeToScan: string) => {
    const code = codeToScan.trim().toUpperCase();
    if (!code) return;

    // 1. Is it a Rack code? (e.g. "RACK:MAG 14", "MAG 14", "RACK-MAG-14")
    if (code.startsWith("RACK:") || code.startsWith("RACK-") || code.startsWith("MAG")) {
      let cleanRack = code.replace("RACK:", "").replace("RACK-", "").replace("-", " ").trim();
      if (cleanRack.startsWith("MAG") && !cleanRack.includes(" ")) {
        // e.g. "MAG14" -> "MAG 14"
        cleanRack = `MAG ${cleanRack.slice(3)}`;
      }

      const match = allRackCodes.find((r) => r.toUpperCase() === cleanRack);
      if (match) {
        setSelectedRackCode(match);
        setSubTab("rack_browser");
        setScanInput("");
        return;
      } else {
        // Even if custom rack, switch to it
        setSelectedRackCode(cleanRack);
        setSubTab("rack_browser");
        setScanInput("");
        return;
      }
    }

    // 2. Is it a Part code? (e.g. "PART:part_1", "part_1", "KNS-PART1")
    let cleanPartId = code.replace("PART:", "").trim().toLowerCase();
    const foundPart = parts.find(
      (p) =>
        p.id.toLowerCase() === cleanPartId ||
        p.barcode?.toUpperCase() === code ||
        (p.listingData?.numery_czesci && p.listingData.numery_czesci.toUpperCase().includes(code))
    );

    if (foundPart) {
      setSelectedPartForHistory(foundPart);
      setScanInput("");
      return;
    }

    alert(`Nie znaleziono regału ani części o kodzie: ${code}`);
  };

  // Execute fast relocation
  const handleConfirmRelocate = () => {
    if (!partToRelocate || !relocateTargetRack) {
      alert("Wybierz docelowy regał!");
      return;
    }
    const oldRack = partToRelocate.currentRackLocation || "MAG 14";
    if (oldRack === relocateTargetRack) {
      alert("Część znajduje się już na tym regale!");
      return;
    }

    const updated = relocatePart(partToRelocate, relocateTargetRack, currentUserName, relocateNote);
    onUpdatePart(updated);
    setRelocationFeedback(`Przeniesiono ${partToRelocate.listingData?.kategoria} z ${oldRack} ➔ ${relocateTargetRack}`);
    setPartToRelocate(null);
    setRelocateTargetRack("");
    setRelocateNote("");
    setTimeout(() => setRelocationFeedback(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fade-in font-mono">
      <div className="bg-[#0b0f19] border border-slate-700 rounded-2xl w-full max-w-6xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[94vh]">
        
        {/* TOP BAR */}
        <div className="bg-[#0f172a] p-4 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-400 text-slate-950 rounded-xl shadow-md">
              <Warehouse className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-slate-800 text-yellow-400 px-2 py-0.5 rounded font-black uppercase tracking-wider border border-yellow-400/20">
                  WMS REGAŁY & KODY QR
                </span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded font-bold border border-emerald-500/30">
                  {allRackCodes.length} Stref / Regałów
                </span>
                <span className="text-[10px] bg-blue-950 text-blue-300 px-2 py-0.5 rounded font-bold border border-blue-500/30">
                  {parts.length} Części
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-black text-white mt-0.5">
                Magazyn Wysokiego Składowania, Regały i Szybki Skaner QR / Barcode
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FAST SCANNER BAR (ZESKANUJ REGAŁ LUB CZĘŚĆ) */}
        <div className="bg-slate-950 p-3 sm:p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleProcessScan(scanInput);
            }}
            className="flex-1 w-full flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Scan className="w-4 h-4 text-yellow-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Zeskanuj kod QR/kreskowy regału (np. RACK:MAG 14) lub części (np. PART:part_1)..."
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-mono placeholder-slate-500 focus:border-yellow-400 outline-none"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs rounded-xl transition flex items-center gap-1.5 shrink-0 shadow-md shadow-yellow-500/20"
            >
              <Scan className="w-3.5 h-3.5" />
              <span>Szukaj / Skanuj</span>
            </button>
          </form>

          {/* SUB-VIEW TABS */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => setSubTab("rack_browser")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                subTab === "rack_browser"
                  ? "bg-yellow-400 text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Przegląd Regału</span>
            </button>

            <button
              onClick={() => setSubTab("all_racks_map")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                subTab === "all_racks_map"
                  ? "bg-yellow-400 text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Warehouse className="w-3.5 h-3.5" />
              <span>Mapa Wszystkich Regałów ({allRackCodes.length})</span>
            </button>
          </div>
        </div>

        {/* RELOCATION FEEDBACK BANNER */}
        {relocationFeedback && (
          <div className="bg-emerald-950/90 border-b border-emerald-500/50 p-2.5 px-4 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{relocationFeedback}</span>
          </div>
        )}

        {/* BODY CONTENT */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: PRZEGLĄD WYBRANEGO REGAŁU (PO SKANOWANIU LUB WYBORZE) */}
          {subTab === "rack_browser" && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              
              {/* LEFT COLUMN: RACK SELECTOR & QR CODE */}
              <div className="space-y-3">
                <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-black">Wybierz Regał:</span>
                    <span className="text-xs font-black text-yellow-400">{selectedRackCode}</span>
                  </div>

                  <select
                    value={selectedRackCode}
                    onChange={(e) => setSelectedRackCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-bold outline-none focus:border-yellow-400"
                  >
                    {allRackCodes.map((rc) => (
                      <option key={rc} value={rc}>
                        {rc} ({(partsByRack[rc] || []).length} części)
                      </option>
                    ))}
                  </select>

                  {/* RACK STATS BOX */}
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg space-y-1 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Liczba części:</span>
                      <span className="text-white font-bold">{rackStats.totalCount} szt.</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Dostępne na stanie:</span>
                      <span className="text-emerald-400 font-bold">{rackStats.inStockCount} szt.</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Wartość regału:</span>
                      <span className="text-yellow-400 font-black">{rackStats.totalVal.toLocaleString("pl-PL")} zł</span>
                    </div>
                  </div>

                  {/* PRINTABLE QR CODE FOR THIS RACK */}
                  <div className="pt-2 border-t border-slate-800 flex flex-col items-center">
                    <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                      Kod QR do naklejenia na regał
                    </div>
                    <QrBarcodeGenerator
                      value={`RACK:${selectedRackCode}`}
                      type="both"
                      label={`REGAŁ: ${selectedRackCode}`}
                      subLabel="PHU U KONESERA WMS"
                      size={110}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: ALL PARTS ON THIS RACK */}
              <div className="lg:col-span-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black uppercase text-white flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-yellow-400" />
                      <span>Części znajdujące się na regale: {selectedRackCode} ({currentRackParts.length})</span>
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Łączna wartość: <strong className="text-yellow-400">{rackStats.totalVal} zł brutto</strong>
                  </span>
                </div>

                {currentRackParts.length === 0 ? (
                  <div className="p-8 text-center bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl">
                    <Warehouse className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">Regał {selectedRackCode} jest obecnie pusty.</p>
                    <p className="text-[11px] text-slate-500 mt-1">Użyj opcji "Przenieś część" lub zeskanuj kod, aby odłożyć tutaj podzespoły.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentRackParts.map((part) => (
                      <div
                        key={part.id}
                        className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-3 rounded-xl transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-950 border border-slate-800 text-yellow-400 rounded-lg shrink-0">
                            <Tag className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-bold font-mono">
                                ID: {part.id}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                part.status === "Dostępny" ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30" :
                                part.status === "Zarezerwowany" ? "bg-amber-950 text-amber-400 border border-amber-500/30" :
                                "bg-slate-800 text-slate-400"
                              }`}>
                                {part.status}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Kod OEM: {part.listingData?.numery_czesci || "Brak"}
                              </span>
                            </div>
                            
                            <h4 className="text-xs font-black text-white mt-1">
                              {part.listingData?.kategoria || "Część"} - {part.listingData?.samochod?.marka} {part.listingData?.samochod?.model}
                            </h4>

                            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>Pojazd: <strong className="text-slate-300">{part.vehicleInternalNo || "Auto ze stacji"}</strong></span>
                              <span>•</span>
                              <span>Demontaż: <strong className="text-slate-300">{part.dismantledByWorker || part.listingData?.workerName || "Marek Demontaż"}</strong> ({part.createdAt})</span>
                            </div>
                          </div>
                        </div>

                        {/* PRICE & ACTION BUTTONS */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <div className="text-right mr-2">
                            <div className="text-sm font-black text-yellow-400">
                              {part.listingData?.cena?.brutto || 0} zł
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {part.ilosc ?? 1} szt.
                            </div>
                          </div>

                          <button
                            onClick={() => setPartToRelocate(part)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Przenieś część na inny regał"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>Przenieś</span>
                          </button>

                          <button
                            onClick={() => setSelectedPartForHistory(part)}
                            className="px-2.5 py-1.5 bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Zobacz pełną historię, skąd pochodzi, kto zdemontował, rezerwacje i kody QR"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>Historia & QR</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MAPA WSZYSTKICH REGAŁÓW */}
          {subTab === "all_racks_map" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-slate-300 flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-yellow-400" />
                  <span>Strefy Magazynowe i Regały PHU U Konesera</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  Kliknij regał, aby zobaczyć wszystkie znajdujące się na nim podzespoły
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {STANDARD_WAREHOUSE_RACKS.map((rack) => {
                  const rackParts = partsByRack[rack.rackCode] || [];
                  const val = rackParts.reduce((acc, p) => acc + (p.listingData?.cena?.brutto || 0) * (p.ilosc ?? 1), 0);
                  const isSelected = selectedRackCode === rack.rackCode;

                  return (
                    <div
                      key={rack.rackCode}
                      onClick={() => {
                        setSelectedRackCode(rack.rackCode);
                        setSubTab("rack_browser");
                      }}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "bg-yellow-400/15 border-yellow-400 shadow-lg shadow-yellow-500/10"
                          : "bg-slate-900/90 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-black text-white font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            {rack.rackCode}
                          </span>
                          <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded font-bold border border-emerald-500/30">
                            {rackParts.length} części
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-200 mt-2">{rack.sector}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{rack.description}</p>
                        <div className="text-[10px] text-slate-500 mt-1 font-mono">{rack.shelfLevel}</div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-xs font-black text-yellow-400">{val.toLocaleString("pl-PL")} zł</span>
                        <div className="text-[11px] text-cyan-400 flex items-center gap-1 font-bold">
                          <span>Otwórz regał</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="bg-[#0f172a] p-3 sm:p-4 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            System WMS Stacji Demontażu • Pełna integracja z kodami QR i historią części
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
          >
            Zamknij Magazyn
          </button>
        </div>
      </div>

      {/* QUICK RELOCATION MODAL */}
      {partToRelocate && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85">
          <div className="bg-[#0b0f19] border border-slate-700 p-5 rounded-2xl w-full max-w-md space-y-4 font-mono">
            <h3 className="text-sm font-black uppercase text-cyan-400 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4" />
              <span>Przenieś Część na Inny Regał</span>
            </h3>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
              <div className="text-slate-400">Część: <strong className="text-white">{partToRelocate.listingData?.kategoria}</strong></div>
              <div className="text-slate-400">Auto: <strong className="text-slate-200">{partToRelocate.listingData?.samochod?.marka} {partToRelocate.listingData?.samochod?.model}</strong></div>
              <div className="text-slate-400">Aktualny regał: <strong className="text-rose-400">{partToRelocate.currentRackLocation || "MAG 14"}</strong></div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300">Wybierz nowy regał docelowy:</label>
              <select
                value={relocateTargetRack}
                onChange={(e) => setRelocateTargetRack(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-bold outline-none focus:border-cyan-400"
              >
                <option value="">-- Wybierz regał --</option>
                {STANDARD_WAREHOUSE_RACKS.map((r) => (
                  <option key={r.rackCode} value={r.rackCode}>
                    {r.rackCode} - {r.sector}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300">Notatka / Powód (opcjonalnie):</label>
              <input
                type="text"
                placeholder="np. Zwolnienie miejsca na regale głównym"
                value={relocateNote}
                onChange={(e) => setRelocateNote(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPartToRelocate(null)}
                className="px-3.5 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                Anuluj
              </button>
              <button
                onClick={handleConfirmRelocate}
                className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Zapisz Relokację</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PART HISTORY & QR MODAL */}
      {selectedPartForHistory && (
        <PartHistoryModal
          part={selectedPartForHistory}
          isOpen={true}
          onClose={() => setSelectedPartForHistory(null)}
          onUpdatePart={(up) => {
            onUpdatePart(up);
            setSelectedPartForHistory(up);
          }}
          currentUserName={currentUserName}
        />
      )}
    </div>
  );
};
