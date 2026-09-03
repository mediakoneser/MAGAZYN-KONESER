import React, { useState } from "react";
import {
  History,
  X,
  Car,
  User,
  Calendar,
  Warehouse,
  Globe,
  Tag,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  ExternalLink,
  QrCode,
  Printer,
  Copy,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Plus,
  Box,
} from "lucide-react";
import { PartItem, PartHistoryEntry, ListingPlatform } from "../types";
import {
  STANDARD_WAREHOUSE_RACKS,
  relocatePart,
  reservePart,
  sellAndPickPart,
  createHistoryEntry,
  ensurePartCompleteHistory,
} from "../utils/partHistoryService";
import { QrBarcodeGenerator } from "./QrBarcodeGenerator";

interface PartHistoryModalProps {
  part: PartItem;
  isOpen: boolean;
  onClose: () => void;
  onUpdatePart: (updated: PartItem) => void;
  currentUserRole?: string;
  currentUserName?: string;
}

export const PartHistoryModal: React.FC<PartHistoryModalProps> = ({
  part: initialPart,
  isOpen,
  onClose,
  onUpdatePart,
  currentUserRole = "Kierownik Magazynu",
  currentUserName = "Kierownik Magazynu",
}) => {
  const part = ensurePartCompleteHistory(initialPart);

  const [activeTab, setActiveTab] = useState<"historia" | "przenies" | "kody" | "platformy">("historia");
  
  // Relocation state
  const [selectedNewRack, setSelectedNewRack] = useState<string>("");
  const [customRackInput, setCustomRackInput] = useState<string>("");
  const [relocationNotes, setRelocationNotes] = useState<string>("");
  const [relocationSuccessMsg, setRelocationSuccessMsg] = useState<string | null>(null);

  // Reservation / Sale action state
  const [showActionModal, setShowActionModal] = useState<"rezerwacja" | "sprzedaz" | null>(null);
  const [buyerNameInput, setBuyerNameInput] = useState<string>("");
  const [orderNumberInput, setOrderNumberInput] = useState<string>("");
  const [salePriceInput, setSalePriceInput] = useState<number>(part.listingData?.cena?.brutto || 0);
  const [selectedPlatform, setSelectedPlatform] = useState<ListingPlatform>("Allegro");

  if (!isOpen) return null;

  const currentRack = part.currentRackLocation || part.listingData?.ocr_wyniki?.numer_magazynowy || "MAG 14";
  const vehicleName = part.vehicleInternalNo
    ? `${part.vehicleInternalNo} (${part.listingData?.samochod?.marka || ""} ${part.listingData?.samochod?.model || ""})`
    : `${part.listingData?.samochod?.marka || "Auto"} ${part.listingData?.samochod?.model || ""}`;

  // Execute Relocation
  const handleExecuteRelocation = () => {
    const targetRack = (customRackInput.trim() || selectedNewRack).toUpperCase();
    if (!targetRack) {
      alert("Wybierz lub wpisz docelowy kod regału (np. MAG 03)!");
      return;
    }

    if (targetRack === currentRack) {
      alert("Część znajduje się już na tym regale!");
      return;
    }

    const updated = relocatePart(part, targetRack, currentUserName, relocationNotes);
    onUpdatePart(updated);
    setRelocationSuccessMsg(`Pomyślnie przeniesiono część z ${currentRack} ➔ ${targetRack}`);
    setSelectedNewRack("");
    setCustomRackInput("");
    setRelocationNotes("");
    setTimeout(() => setRelocationSuccessMsg(null), 4000);
  };

  // Execute Reservation
  const handleExecuteReservation = () => {
    if (!buyerNameInput.trim()) {
      alert("Wprowadź dane klienta rezerwującego!");
      return;
    }
    const updated = reservePart(part, buyerNameInput.trim(), currentUserName);
    onUpdatePart(updated);
    setShowActionModal(null);
    setBuyerNameInput("");
  };

  // Execute Sale & Pick
  const handleExecuteSale = () => {
    if (!orderNumberInput.trim() || !buyerNameInput.trim()) {
      alert("Wypełnij numer zamówienia oraz dane kupującego!");
      return;
    }
    const updated = sellAndPickPart(
      part,
      orderNumberInput.trim(),
      buyerNameInput.trim(),
      salePriceInput,
      selectedPlatform,
      currentUserName,
      true
    );
    onUpdatePart(updated);
    setShowActionModal(null);
    setOrderNumberInput("");
    setBuyerNameInput("");
  };

  const printLabels = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fade-in font-mono">
      <div className="bg-[#0b0f19] border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* MODAL HEADER */}
        <div className="bg-[#0f172a] p-4 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-400 text-slate-950 rounded-xl shadow-md">
              <History className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-slate-800 text-yellow-400 px-2 py-0.5 rounded font-black uppercase tracking-wider border border-yellow-400/20">
                  ID: {part.id}
                </span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded font-bold border border-emerald-500/30">
                  REGAŁ: {currentRack}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                  part.status === "Dostępny" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                  part.status === "Zarezerwowany" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                  part.status === "Sprzedany" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                  "bg-slate-800 text-slate-400"
                }`}>
                  Status: {part.status}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-black text-white mt-0.5 line-clamp-1">
                {part.listingData?.kategoria || "Część samochodowa"} - {part.listingData?.samochod?.marka} {part.listingData?.samochod?.model}
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

        {/* NAVIGATION TABS */}
        <div className="bg-slate-950/80 px-4 pt-2 border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("historia")}
            className={`px-3 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition ${
              activeTab === "historia"
                ? "border-yellow-400 text-yellow-400 bg-yellow-400/10"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pełna Oś Czasu & Cykl Życia</span>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded-full text-slate-300 font-bold">
              {part.historyLogs?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("przenies")}
            className={`px-3 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition ${
              activeTab === "przenies"
                ? "border-yellow-400 text-yellow-400 bg-yellow-400/10"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Przenieś Część (WMS)</span>
          </button>

          <button
            onClick={() => setActiveTab("kody")}
            className={`px-3 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition ${
              activeTab === "kody"
                ? "border-yellow-400 text-yellow-400 bg-yellow-400/10"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Kody QR & Kreskowe Etykiety</span>
          </button>

          <button
            onClick={() => setActiveTab("platformy")}
            className={`px-3 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition ${
              activeTab === "platformy"
                ? "border-yellow-400 text-yellow-400 bg-yellow-400/10"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Platformy Sprzedaży ({part.publishedPlatforms?.length || 0})</span>
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* TOP SUMMARY STRIP: 9 AUDIT REQUIREMENTS CHECK */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <Car className="w-3 h-3 text-yellow-400" />
                <span>Pochodzenie Pojazdu</span>
              </div>
              <div className="text-white font-bold mt-0.5 line-clamp-1" title={vehicleName}>
                {vehicleName}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                VIN: {part.listingData?.samochod?.vin || "Sprawdzony OE"}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <User className="w-3 h-3 text-cyan-400" />
                <span>Zdemontował & Kiedy</span>
              </div>
              <div className="text-white font-bold mt-0.5">
                {part.dismantledByWorker || part.listingData?.workerName || "Marek Demontaż"}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {part.dismantledAt || part.createdAt}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <Warehouse className="w-3 h-3 text-emerald-400" />
                <span>Lokalizacja Magazynowa</span>
              </div>
              <div className="text-emerald-300 font-bold mt-0.5">
                Regał {currentRack}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Kod QR: PART:{part.id}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <ShoppingBag className="w-3 h-3 text-purple-400" />
                <span>Cena & Dostępność</span>
              </div>
              <div className="text-yellow-400 font-black text-sm">
                {part.listingData?.cena?.brutto || 0} zł brutto
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Stan: {part.ilosc ?? 1} szt. ({part.status})
              </div>
            </div>
          </div>

          {/* TAB 1: PEŁNA HISTORIA I CYKL ŻYCIA (9 PUNKTÓW) */}
          {activeTab === "historia" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-slate-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-yellow-400" />
                  <span>Kompletny Rejestr Zdarzeń Części (Ślad Audytowy)</span>
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowActionModal("rezerwacja")}
                    disabled={part.status === "Sprzedany"}
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition disabled:opacity-40"
                  >
                    + Rezerwuj
                  </button>
                  <button
                    onClick={() => setShowActionModal("sprzedaz")}
                    disabled={part.status === "Sprzedany"}
                    className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold transition disabled:opacity-40"
                  >
                    + Rozlicz Sprzedaż
                  </button>
                </div>
              </div>

              {/* TIMELINE LIST */}
              <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {(part.historyLogs || []).map((entry, idx) => (
                  <div key={entry.id || idx} className="relative group">
                    {/* DOT */}
                    <div
                      className={`absolute -left-[23px] top-1.5 w-3 h-3 rounded-full border-2 bg-slate-950 ${
                        entry.eventType === "DEMONTAŻ"
                          ? "border-cyan-400 text-cyan-400"
                          : entry.eventType === "PRZENIESIENIE_REGAŁU" || entry.eventType === "ODŁOŻENIE_NA_REGAŁ"
                          ? "border-emerald-400 text-emerald-400"
                          : entry.eventType === "WYSTAWIENIE_OFERTY"
                          ? "border-yellow-400 text-yellow-400"
                          : entry.eventType === "REZERWACJA"
                          ? "border-amber-400 text-amber-400"
                          : entry.eventType === "SPRZEDAŻ" || entry.eventType === "POBRANIE_Z_MAGAZYNU"
                          ? "border-purple-400 text-purple-400"
                          : "border-slate-500 text-slate-400"
                      }`}
                    />

                    {/* CARD */}
                    <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-3 rounded-xl transition">
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                              entry.eventType === "DEMONTAŻ"
                                ? "bg-cyan-950 text-cyan-300 border-cyan-500/40"
                                : entry.eventType === "PRZENIESIENIE_REGAŁU"
                                ? "bg-indigo-950 text-indigo-300 border-indigo-500/40"
                                : entry.eventType === "ODŁOŻENIE_NA_REGAŁ"
                                ? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
                                : entry.eventType === "WYSTAWIENIE_OFERTY"
                                ? "bg-yellow-950 text-yellow-300 border-yellow-500/40"
                                : entry.eventType === "REZERWACJA"
                                ? "bg-amber-950 text-amber-300 border-amber-500/40"
                                : entry.eventType === "SPRZEDAŻ"
                                ? "bg-purple-950 text-purple-300 border-purple-500/40"
                                : "bg-slate-800 text-slate-300 border-slate-700"
                            }`}
                          >
                            {entry.eventType.replace(/_/g, " ")}
                          </span>

                          {entry.platform && (
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                              {entry.platform}
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span className="text-slate-300 font-semibold">{entry.authorName}</span>
                          <span>•</span>
                          <span className="font-mono">{entry.timestamp}</span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-200 mt-1">{entry.details}</div>

                      {/* LOCATIONS BADGE IF RELOCATED */}
                      {(entry.previousLocation || entry.newLocation) && (
                        <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center gap-2 text-[11px] font-mono">
                          <span className="text-slate-400">Poprzednia lokalizacja:</span>
                          <span className="px-1.5 py-0.2 bg-rose-950 text-rose-300 rounded border border-rose-500/30">
                            {entry.previousLocation || "Strefa przyjęć"}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <span className="text-slate-400">Nowa lokalizacja:</span>
                          <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-300 rounded border border-emerald-500/30 font-bold">
                            {entry.newLocation || currentRack}
                          </span>
                        </div>
                      )}

                      {/* BUYER / SALE INFO */}
                      {entry.buyerInfo && (
                        <div className="mt-1 text-[11px] text-amber-300/90 font-mono">
                          Klient / Nabywca: {entry.buyerInfo} {entry.salePricePln ? `(${entry.salePricePln} zł)` : ""}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: PRZENIEŚ CZĘŚĆ (ZAPIS POPRZEDNIEJ I NOWEJ LOKALIZACJI) */}
          {activeTab === "przenies" && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <h3 className="text-xs font-black uppercase text-yellow-400 flex items-center gap-2 mb-2">
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Procedura Relokacji WMS (Przenieś Część)</span>
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Każda zmiana regału zostaje natychmiast zapisana w historii audytowej z oznaczeniem poprzedniej i nowej lokalizacji oraz nazwiskiem pracownika.
                </p>

                {relocationSuccessMsg && (
                  <div className="mb-4 p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{relocationSuccessMsg}</span>
                  </div>
                )}

                {/* CURRENT LOCATION VS NEW LOCATION PREVIEW */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-slate-950 border border-rose-500/30 rounded-xl">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Dotychczasowy Regał (Stary)</div>
                    <div className="text-lg font-black text-rose-400 mt-1">{currentRack}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Zarejestrowana lokalizacja części</div>
                  </div>

                  <div className="p-3 bg-slate-950 border border-emerald-500/40 rounded-xl">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Nowy Regał Docelowy</div>
                    <div className="text-lg font-black text-emerald-400 mt-1">
                      {customRackInput.trim().toUpperCase() || selectedNewRack || "Wybierz poniżej..."}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Zostanie wpisany do WMS i QR</div>
                  </div>
                </div>

                {/* SELECT FROM STANDARD RACKS */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300">Wybierz standardowy regał ze strefy:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {STANDARD_WAREHOUSE_RACKS.map((rack) => (
                      <button
                        key={rack.rackCode}
                        type="button"
                        onClick={() => {
                          setSelectedNewRack(rack.rackCode);
                          setCustomRackInput("");
                        }}
                        className={`p-2.5 text-left rounded-xl border transition text-xs flex flex-col justify-between ${
                          (selectedNewRack === rack.rackCode && !customRackInput)
                            ? "bg-yellow-400/20 border-yellow-400 text-yellow-300"
                            : rack.rackCode === currentRack
                            ? "bg-slate-950/60 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed"
                            : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        <div className="font-black text-sm">{rack.rackCode}</div>
                        <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{rack.sector}</div>
                        {rack.rackCode === currentRack && (
                          <div className="text-[9px] text-amber-400 mt-1 font-bold">Aktualne miejsce</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* OR ENTER CUSTOM RACK CODE */}
                <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300">Lub wpisz własny kod regału:</label>
                    <input
                      type="text"
                      placeholder="np. MAG 88 / PÓŁKA 4B"
                      value={customRackInput}
                      onChange={(e) => {
                        setCustomRackInput(e.target.value);
                        setSelectedNewRack("");
                      }}
                      className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs uppercase placeholder-slate-500 focus:border-yellow-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300">Powód / Notatka do relokacji:</label>
                    <input
                      type="text"
                      placeholder="np. Optymalizacja miejsca, kompletacja zamówienia"
                      value={relocationNotes}
                      onChange={(e) => setRelocationNotes(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:border-yellow-400 outline-none"
                    />
                  </div>
                </div>

                {/* SUBMIT RELOCATION */}
                <div className="mt-5 flex justify-end">
                  <button
                    onClick={handleExecuteRelocation}
                    className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs rounded-xl transition flex items-center gap-2 shadow-lg shadow-yellow-500/20 cursor-pointer"
                  >
                    <ArrowRightLeft className="w-4 h-4 stroke-[2.5]" />
                    <span>Zatwierdź Przeniesienie Części i Zapisz Historię</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: KODY QR I KRESKOWE DLA CZĘŚCI I REGAŁU */}
          {activeTab === "kody" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-300">Etykiety Termiczne i Kody Identyfikacyjne</h3>
                  <p className="text-xs text-slate-400">Do wydruku na drukarce etykiet (Zebra, Brother, Dymo) lub odczytu smartfonem</p>
                </div>
                <button
                  onClick={printLabels}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-yellow-300 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Drukuj Etykiety</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* PART QR & BARCODE */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col items-center">
                  <div className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-2">
                    Etykieta Części: {part.id}
                  </div>
                  <QrBarcodeGenerator
                    value={`PART:${part.id}`}
                    type="both"
                    label={part.listingData?.kategoria?.slice(0, 30)}
                    subLabel={`${part.listingData?.samochod?.marka || ""} ${part.listingData?.samochod?.model || ""} | REGAŁ: ${currentRack}`}
                    size={130}
                    className="w-full max-w-[260px]"
                  />
                  <div className="mt-3 text-[11px] text-slate-400 text-center font-mono">
                    Zawartość QR: <span className="text-slate-200">PART:{part.id}</span>
                  </div>
                </div>

                {/* RACK QR & BARCODE */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col items-center">
                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                    Etykieta Regału: {currentRack}
                  </div>
                  <QrBarcodeGenerator
                    value={`RACK:${currentRack}`}
                    type="both"
                    label={`REGAŁ MAGAZYNOWY: ${currentRack}`}
                    subLabel="PHU U KONESERA - STACJA DEMONTAŻU WMS"
                    size={130}
                    className="w-full max-w-[260px]"
                  />
                  <div className="mt-3 text-[11px] text-slate-400 text-center font-mono">
                    Zawartość QR: <span className="text-slate-200">RACK:{currentRack}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PLATFORMY SPRZEDAŻY */}
          {activeTab === "platformy" && (
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-300">
                Wystawione Oferty i Status na Platformach E-Commerce
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(part.publishedPlatforms || []).map((pl, i) => (
                  <div key={i} className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-white text-xs">{pl.platform}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            pl.status === "Aktywna"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {pl.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Opublikowano: {pl.publishedAt || part.createdAt}
                      </div>
                      <div className="text-sm font-black text-yellow-400 mt-1">
                        Cena: {pl.pricePln || part.listingData?.cena?.brutto || 0} zł
                      </div>
                    </div>

                    {pl.url && (
                      <a
                        href={pl.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Otwórz ofertę w nowej karcie</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="bg-[#0f172a] p-3 sm:p-4 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            Ostatnia modyfikacja: <span className="text-slate-200">{part.updatedAt || part.createdAt}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
          >
            Zamknij
          </button>
        </div>
      </div>

      {/* QUICK RESERVATION MODAL */}
      {showActionModal === "rezerwacja" && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-[#0b0f19] border border-slate-700 p-5 rounded-2xl w-full max-w-md space-y-4">
            <h3 className="text-sm font-black uppercase text-amber-400 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Zarezerwuj Część dla Klienta</span>
            </h3>
            <div>
              <label className="text-xs text-slate-300">Dane Klienta (Imię, Telefon, Miejscowość):</label>
              <input
                type="text"
                placeholder="np. Jan Kowalski, tel. 600-100-200 (Wrocław)"
                value={buyerNameInput}
                onChange={(e) => setBuyerNameInput(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-amber-400"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowActionModal(null)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                Anuluj
              </button>
              <button
                onClick={handleExecuteReservation}
                className="px-4 py-1.5 bg-amber-400 text-slate-950 rounded-xl text-xs font-black"
              >
                Zatwierdź Rezerwację
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK SALE MODAL */}
      {showActionModal === "sprzedaz" && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-[#0b0f19] border border-slate-700 p-5 rounded-2xl w-full max-w-md space-y-3">
            <h3 className="text-sm font-black uppercase text-emerald-400 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span>Rozlicz Sprzedaż i Pobierz z Regału</span>
            </h3>
            <div>
              <label className="text-xs text-slate-300">Platforma Sprzedaży:</label>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value as ListingPlatform)}
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none"
              >
                <option value="Allegro">Allegro</option>
                <option value="Ovoko / RRR">Ovoko / RRR</option>
                <option value="ShopGold / Sklep Własny">ShopGold / Sklep Własny</option>
                <option value="OLX">OLX / Odbiór Osobisty</option>
                <option value="eBay Motors">eBay Motors</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-300">Numer Zamówienia / Paragonu:</label>
              <input
                type="text"
                placeholder="np. ZAM-2026/09/8412"
                value={orderNumberInput}
                onChange={(e) => setOrderNumberInput(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="text-xs text-slate-300">Dane Kupującego:</label>
              <input
                type="text"
                placeholder="np. Warsztat Auto-Centrum (Gdańsk)"
                value={buyerNameInput}
                onChange={(e) => setBuyerNameInput(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="text-xs text-slate-300">Kwota Sprzedaży (PLN):</label>
              <input
                type="number"
                value={salePriceInput}
                onChange={(e) => setSalePriceInput(Number(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-emerald-400"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowActionModal(null)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                Anuluj
              </button>
              <button
                onClick={handleExecuteSale}
                className="px-4 py-1.5 bg-emerald-400 text-slate-950 rounded-xl text-xs font-black"
              >
                Zatwierdź i Zdejmij z Magazynu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
