import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  X,
  Plus,
  ArrowRight,
  ExternalLink,
  Info,
  Layers,
  Sparkles,
  RefreshCw,
  FileCheck,
} from "lucide-react";
import { PartListingData, PartItem } from "../types";
import {
  exportPartsToAllegroCsv,
  downloadAllegroTemplateCsv,
  ALLEGRO_CSV_COLUMNS,
} from "../utils/allegroCsvHandler";

export const SCANNER_CSV_QUEUE_KEY = "scanner_allegro_csv_queue_v1";

interface ScannerAllegroCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFormData?: PartListingData;
  currentImages?: string[];
  onAddToQueueAndClear?: () => void;
}

export const ScannerAllegroCsvModal: React.FC<ScannerAllegroCsvModalProps> = ({
  isOpen,
  onClose,
  currentFormData,
  currentImages = [],
  onAddToQueueAndClear,
}) => {
  const [queue, setQueue] = useState<PartItem[]>(() => {
    try {
      const stored = localStorage.getItem(SCANNER_CSV_QUEUE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
  });

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"queue" | "preview" | "instruction">("queue");

  useEffect(() => {
    try {
      localStorage.setItem(SCANNER_CSV_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {}
  }, [queue]);

  if (!isOpen) return null;

  // Convert current form data into a PartItem
  const currentPartItem: PartItem | null = currentFormData
    ? {
        id: `scan_${Date.now()}`,
        barcode: `PART-${Math.floor(100000 + Math.random() * 900000)}`,
        currentRackLocation: currentFormData.ocr_wyniki?.numer_magazynowy || "MAG 14",
        createdAt: new Date().toISOString(),
        status: "Dostępny",
        listingData: {
          ...currentFormData,
          zdjecia: currentImages,
        },
      }
    : null;

  const handleAddCurrentToQueue = () => {
    if (!currentPartItem) return;
    setQueue((prev) => [currentPartItem, ...prev]);
    if (onAddToQueueAndClear) {
      onAddToQueueAndClear();
    }
  };

  const handleRemoveFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearQueue = () => {
    if (confirm("Czy na pewno chcesz wyczyścić całą kolejkę eksportu CSV?")) {
      setQueue([]);
    }
  };

  // Download entire queue as Allegro CSV
  const handleDownloadQueueCsv = () => {
    const itemsToExport = queue.length > 0 ? queue : currentPartItem ? [currentPartItem] : [];
    if (itemsToExport.length === 0) {
      alert("Brak części do wyeksportowania.");
      return;
    }

    const csvContent = exportPartsToAllegroCsv(itemsToExport);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `allegro_import_${itemsToExport.length}_czesci_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download single current part as CSV
  const handleDownloadSingleCsv = () => {
    if (!currentPartItem) return;
    const csvContent = exportPartsToAllegroCsv([currentPartItem]);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const cleanName = (currentFormData?.kategoria || "czesc").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    link.download = `allegro_${cleanName}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const currentPreviewCsv = currentPartItem
    ? exportPartsToAllegroCsv([currentPartItem])
    : queue.length > 0
    ? exportPartsToAllegroCsv(queue)
    : "";

  const handleCopyCsv = () => {
    navigator.clipboard.writeText(currentPreviewCsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl max-w-4xl w-full p-4 sm:p-6 space-y-4 shadow-2xl max-h-[92vh] flex flex-col my-auto text-slate-100">
        {/* NAGŁÓWEK */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base font-mono">
                  Generator i Kolejka Allegro CSV
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-mono font-bold border border-orange-500/30">
                  Szablon 29 kolumn
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Oficjalny format Allegro: <code>import-and-list-csv-template-polish-version.csv</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ZAKŁADKI */}
        <div className="flex items-center gap-1.5 bg-[#030712] p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab("queue")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer font-mono ${
              activeTab === "queue"
                ? "bg-orange-500 text-slate-950 font-black shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Kolejka Części ({queue.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("preview")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer font-mono ${
              activeTab === "preview"
                ? "bg-orange-500 text-slate-950 font-black shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Podgląd CSV & Kolumny</span>
          </button>

          <button
            onClick={() => setActiveTab("instruction")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer font-mono ${
              activeTab === "instruction"
                ? "bg-orange-500 text-slate-950 font-black shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Info className="w-4 h-4" />
            <span>Instrukcja Wgrywania do Allegro</span>
          </button>
        </div>

        {/* GŁÓWNA ZAWARTOŚĆ PRZEWIJANA */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* TAB 1: KOLEJKA */}
          {activeTab === "queue" && (
            <div className="space-y-4">
              {/* SEKCJA BIEŻĄCEJ SKANOWANEJ CZĘŚCI */}
              {currentFormData && (
                <div className="bg-[#030712] border border-orange-500/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-400 font-mono flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Aktualnie Skanowana Część w Formularzu:
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {currentFormData.cena?.brutto || 0} PLN brutto
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Część / Kategoria:</span>
                      <strong className="text-white font-medium">{currentFormData.kategoria || "Brak kategorii"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Pojazd:</span>
                      <strong className="text-slate-300 font-medium">
                        {currentFormData.samochod?.marka} {currentFormData.samochod?.model}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Numery OEM / Regał:</span>
                      <strong className="text-yellow-400 font-mono font-medium">
                        {currentFormData.numery_czesci || "-"} | {currentFormData.ocr_wyniki?.numer_magazynowy || "MAG"}
                      </strong>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={handleAddCurrentToQueue}
                      className="flex-1 py-2 px-3 bg-orange-500 hover:bg-orange-400 text-slate-950 font-black text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer font-mono shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Dodaj tę część do kolejki CSV ({queue.length + 1})</span>
                    </button>

                    <button
                      onClick={handleDownloadSingleCsv}
                      className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer font-mono"
                      title="Pobierz tylko ten 1 produkt jako plik CSV"
                    >
                      <Download className="w-3.5 h-3.5 text-orange-400" />
                      <span>Pobierz tylko tę 1 część (.csv)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* LISTA CZĘŚCI W KOLEJCE */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">
                    Pozycje w kolejce gotowe do eksportu: <strong>{queue.length}</strong>
                  </span>
                  {queue.length > 0 && (
                    <button
                      onClick={handleClearQueue}
                      className="text-rose-400 hover:text-rose-300 text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Wyczyść kolejkę</span>
                    </button>
                  )}
                </div>

                {queue.length === 0 ? (
                  <div className="p-8 text-center bg-[#030712] rounded-xl border border-slate-800 space-y-2">
                    <FileSpreadsheet className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400">
                      Kolejka jest pusta. Skanuj kolejne części i klikaj <strong>"Dodaj do kolejki CSV"</strong>, aby zebrać paczkę aukcji do masowego wystawienia w Allegro!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
                    {queue.map((item, idx) => {
                      const ld = item.listingData;
                      return (
                        <div
                          key={item.id}
                          className="bg-[#030712] border border-slate-800 hover:border-slate-700 rounded-lg p-2.5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded bg-slate-800 text-slate-400 font-mono text-[10px] flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="font-bold text-white truncate">
                                {ld?.auctionTemplates?.allegroTitle || ld?.kategoria || "Część samochodowa"}
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-2 font-mono">
                                <span>{ld?.samochod?.marka} {ld?.samochod?.model}</span>
                                <span>•</span>
                                <span className="text-yellow-400">OEM: {ld?.numery_czesci || "-"}</span>
                                <span>•</span>
                                <span>Regał: {item.currentRackLocation}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="font-bold font-mono text-emerald-400 text-xs">
                              {ld?.cena?.brutto || 0} PLN
                            </span>
                            <button
                              onClick={() => handleRemoveFromQueue(item.id)}
                              className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                              title="Usuń z kolejki"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PODGLĄD CSV & KOLUMNY */}
          {activeTab === "preview" && (
            <div className="space-y-3.5">
              <div className="bg-[#030712] p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-300">
                    Struktura pliku Allegro CSV (Zgodność 100% z Allegro.pl):
                  </span>
                  <button
                    onClick={() => downloadAllegroTemplateCsv("szablon_allegro_template.csv")}
                    className="text-[11px] font-mono text-orange-400 hover:text-orange-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Pobierz czysty szablon Allegro</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {ALLEGRO_CSV_COLUMNS.map((col) => (
                    <span
                      key={col}
                      className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Wygenerowana treść pliku CSV:</span>
                  <button
                    onClick={handleCopyCsv}
                    className="flex items-center gap-1 text-orange-400 hover:text-orange-300 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Skopiowano!" : "Kopiuj CSV"}</span>
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={8}
                  value={currentPreviewCsv}
                  className="w-full bg-[#030712] border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-300 focus:outline-hidden whitespace-pre overflow-x-auto"
                />
              </div>
            </div>
          )}

          {/* TAB 3: INSTRUKCJA KROK PO KROKU */}
          {activeTab === "instruction" && (
            <div className="space-y-4 text-xs leading-relaxed">
              <div className="bg-[#030712] border border-slate-800 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-orange-400 font-mono flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Jak masowo wystawić części w Allegro za pomocą tego pliku CSV:
                </h4>

                <ol className="space-y-2.5 pl-4 list-decimal text-slate-300 text-xs">
                  <li>
                    <strong>Skanuj lub wprowadzaj części w Skanerze WMS:</strong> Po rozpoznaniu przez AI lub uzupełnieniu danych kliknij <em>"Dodaj do kolejki CSV"</em>.
                  </li>
                  <li>
                    <strong>Pobierz gotowy plik CSV:</strong> Kliknij przycisk <em>"Pobierz paczkę CSV dla Allegro"</em> poniżej. Plik zawiera wszystkie wymagane kolumny (ceny, stock, kod MPN/OEM, tytuł 75 znaków, opis zgodny z GPSR UE).
                  </li>
                  <li>
                    <strong>Zaloguj się na swoje konto Allegro Sprzedawcy:</strong> Otwórz panel <code>allegro.pl/moje-allegro/sprzedaz/asortyment</code>.
                  </li>
                  <li>
                    <strong>Wystaw z pliku:</strong> W prawym górnym rogu asortymentu kliknij <strong>"Wystaw z pliku"</strong> (lub <em>Dodaj wiele ofert</em>).
                  </li>
                  <li>
                    <strong>Wybierz pobrany plik:</strong> Wskaż pobrany plik <code>allegro_import_...csv</code>. Allegro natychmiast zweryfikuje oferty i opublikuje je na Twoim koncie sprzedawcy!
                  </li>
                </ol>
              </div>

              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1 text-slate-400 text-[11px]">
                <strong className="text-white block font-mono">Porada dla Stacji Demontażu U KONESERA:</strong>
                Każda część w wygenerowanym pliku CSV ma przypisany unikalny numer regału magazynowego (np. <code>MAG 14</code>) jako Sygnaturę Sprzedawcy. Kiedy klient kupi część na Allegro, na etykiecie zamówienia zobaczysz dokładnie, z którego regału zdjąć część!
              </div>
            </div>
          )}
        </div>

        {/* DOLNE PRZYCISKI AKCJI */}
        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <div className="text-[11px] font-mono text-slate-400">
            {queue.length > 0
              ? `W kolejce do pobrania: ${queue.length} części`
              : currentPartItem
              ? "Gotowa do pobrania: 1 aktualna część"
              : "Brak części w kolejce"}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition cursor-pointer font-mono"
            >
              Zamknij
            </button>

            <button
              onClick={handleDownloadQueueCsv}
              disabled={queue.length === 0 && !currentPartItem}
              className="px-5 py-2 bg-orange-500 hover:bg-orange-400 text-slate-950 font-black text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer font-mono shadow-md disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>
                Pobierz Paczkę CSV dla Allegro ({queue.length > 0 ? queue.length : 1} szt.)
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
