import React, { useState, useRef, useMemo } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Download,
  Eye,
  Check,
  Zap,
  Tag,
  Package,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Truck,
  HelpCircle,
  Info,
} from "lucide-react";
import { PartItem, AllegroConfig } from "../types";
import {
  parseAllegroCsv,
  convertAllegroRowsToPartItems,
  downloadAllegroTemplateCsv,
  SAMPLE_ALLEGRO_CSV_TEXT,
  AllegroCsvRow,
} from "../utils/allegroCsvHandler";
import { publishOfferToAllegro, getStoredAllegroConfig } from "../utils/allegroService";
import { savePartToFirestore } from "../lib/firestoreService";

interface AllegroCsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (importedParts: PartItem[]) => void;
  allegroConfig?: AllegroConfig;
}

type WizardStep = 1 | 2 | 3 | 4;

export const AllegroCsvImportModal: React.FC<AllegroCsvImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  allegroConfig: propConfig,
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [csvText, setCsvText] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [parsedRows, setParsedRows] = useState<AllegroCsvRow[]>([]);
  const [parsedStats, setParsedStats] = useState<{
    total: number;
    valid: number;
    invalid: number;
    columns: string[];
  }>({ total: 0, valid: 0, invalid: 0, columns: [] });

  const [inputMode, setInputMode] = useState<"file" | "paste">("file");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter & Search in Step 2
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "valid" | "warnings">("all");

  // Step 3 Settings
  const config = propConfig || getStoredAllegroConfig();
  const [publishMode, setPublishMode] = useState<"drafts_only" | "publish_direct">("publish_direct");
  const [shippingRateId, setShippingRateId] = useState<string>(config.shippingTableId || "1 smart");
  const [warrantyId, setWarrantyId] = useState<string>(config.impliedWarrantyId || "gwarancja-12m");
  const [returnPolicyId, setReturnPolicyId] = useState<string>(config.returnPolicyId || "zwrot-14dni");
  const [targetMarket, setTargetMarket] = useState<"allegro-pl" | "allegro-cz" | "allegro-sk" | "allegro-hu">("allegro-pl");
  const [rackPrefix, setRackPrefix] = useState<string>("MAG");

  // Step 4 Progress & Execution
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [processingLog, setProcessingLog] = useState<Array<{ text: string; type: "info" | "success" | "warning" | "error" }>>([]);
  const [finalResult, setFinalResult] = useState<{
    total: number;
    successful: number;
    failed: number;
    offersCreated: Array<{ id: string; name: string; url: string; price: number }>;
  } | null>(null);

  // Process raw text when file or sample loaded
  const handleParseCsvData = (text: string, name = "uploaded_file.csv") => {
    setCsvText(text);
    setFileName(name);
    const res = parseAllegroCsv(text);
    setParsedRows(res.rows);
    setParsedStats({
      total: res.totalRows,
      valid: res.validRowsCount,
      invalid: res.invalidRowsCount,
      columns: res.columnsFound,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = (evt.target?.result as string) || "";
      handleParseCsvData(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = (evt.target?.result as string) || "";
        handleParseCsvData(text, file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleLoadSampleData = () => {
    handleParseCsvData(SAMPLE_ALLEGRO_CSV_TEXT, "szablon_allegro_10_produktow.csv");
  };

  // Step 2 Filtered items
  const filteredRows = useMemo(() => {
    return parsedRows.filter((r) => {
      if (filterMode === "valid" && !r.isValid) return false;
      if (filterMode === "warnings" && r.validationWarnings.length === 0 && r.validationErrors.length === 0) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.gtin.includes(q) ||
        r.externalId.toLowerCase().includes(q) ||
        r.brand.toLowerCase().includes(q) ||
        r.mpn.toLowerCase().includes(q)
      );
    });
  }, [parsedRows, searchQuery, filterMode]);

  // Step 4 Execution: Start Bulk Import and Optional Allegro REST API Publishing
  const handleStartImportAndPublish = async () => {
    setCurrentStep(4);
    setIsProcessing(true);
    setProgressPercent(0);
    setProcessingLog([]);

    const createdOffers: Array<{ id: string; name: string; url: string; price: number }> = [];
    let successCount = 0;
    let failCount = 0;

    const partsToImport = convertAllegroRowsToPartItems(parsedRows, rackPrefix);

    setProcessingLog((prev) => [
      ...prev,
      { text: `[${new Date().toLocaleTimeString()}] Rozpoczęto przetwarzanie ${partsToImport.length} produktów z pliku CSV.`, type: "info" },
    ]);

    for (let i = 0; i < partsToImport.length; i++) {
      const part = partsToImport[i];
      const percent = Math.round(((i + 1) / partsToImport.length) * 100);
      setProgressPercent(percent);

      setProcessingLog((prev) => [
        ...prev,
        { text: `[${i + 1}/${partsToImport.length}] Przetwarzanie: "${part.listingData.auctionTemplates?.allegroTitle}" (GTIN: ${part.listingData.allegro?.ean || "Brak"})...`, type: "info" },
      ]);

      if (publishMode === "publish_direct") {
        try {
          const pubRes = await publishOfferToAllegro(part, {
            ...config,
            shippingTableId: shippingRateId,
            impliedWarrantyId: warrantyId,
            returnPolicyId: returnPolicyId,
          });

          if (pubRes.success) {
            successCount++;
            part.allegroOfferId = pubRes.offerId;
            part.allegroOfferUrl = pubRes.offerUrl;
            part.allegroPublishedAt = pubRes.publishedAt || new Date().toISOString();
            part.allegroStatus = "active";
            if (part.listingData.allegro) {
              part.listingData.allegro.offerId = pubRes.offerId;
              part.listingData.allegro.offerUrl = pubRes.offerUrl;
              part.listingData.allegro.publishedAt = pubRes.publishedAt;
              part.listingData.allegro.status = "active";
            }

            createdOffers.push({
              id: pubRes.offerId || `17${Math.floor(10000000 + Math.random() * 90000000)}`,
              name: part.listingData.auctionTemplates?.allegroTitle || part.listingData.kategoria,
              url: pubRes.offerUrl || `https://allegro.pl/oferta/${pubRes.offerId}`,
              price: part.listingData.cena.brutto,
            });

            setProcessingLog((prev) => [
              ...prev,
              { text: `✅ Sukces: Oferta #${pubRes.offerId} opublikowana w Allegro REST API!`, type: "success" },
            ]);
          } else {
            failCount++;
            setProcessingLog((prev) => [
              ...prev,
              { text: `⚠️ Błąd publikacji "${part.listingData.auctionTemplates?.allegroTitle}": ${pubRes.message || "Błąd API"}`, type: "warning" },
            ]);
          }
        } catch (e: any) {
          failCount++;
          setProcessingLog((prev) => [
            ...prev,
            { text: `❌ Błąd połączenia dla "${part.listingData.auctionTemplates?.allegroTitle}": ${e.message}`, type: "error" },
          ]);
        }
      } else {
        // Saved as drafts
        successCount++;
        part.allegroStatus = "draft";
        if (part.listingData.allegro) {
          part.listingData.allegro.status = "draft";
        }
        setProcessingLog((prev) => [
          ...prev,
          { text: `📝 Zapisano jako szkic roboczy w magazynie WMS (Regał: ${part.currentRackLocation}).`, type: "success" },
        ]);
      }

      // Save to Firestore in background
      try {
        await savePartToFirestore(part);
      } catch (err) {
        console.warn("Firestore part save error:", err);
      }

      // Small delay for UI smoothness
      await new Promise((res) => setTimeout(res, 80));
    }

    setIsProcessing(false);
    setFinalResult({
      total: partsToImport.length,
      successful: successCount,
      failed: failCount,
      offersCreated: createdOffers,
    });

    // Notify parent component
    onImportComplete(partsToImport);
  };

  const canProceedToStep2 = parsedRows.length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#0b0f19] border border-yellow-400/40 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* NAGŁÓWEK KROKÓW (1:1 WZORZEC ALLEGRO) */}
        <div className="bg-[#0e1626] border-b border-slate-800 p-4 sm:p-5">
          <div className="flex items-center justify-between pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-yellow-400/20 border border-yellow-400/40 flex items-center justify-center text-yellow-400">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-white font-black text-base sm:text-lg">Importuj produkty</h3>
                <p className="text-[11px] text-slate-400">Masowe dodawanie i wystawianie ofert w Allegro przez plik CSV</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* PASEK ZAKŁADEK KROKÓW */}
          <div className="grid grid-cols-4 gap-1 sm:gap-2 text-[11px] sm:text-xs font-bold pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              disabled={isProcessing}
              className={`pb-2 border-b-2 text-left transition flex items-center gap-1.5 ${
                currentStep === 1
                  ? "border-yellow-400 text-yellow-400"
                  : currentStep > 1
                  ? "border-emerald-500 text-emerald-400 cursor-pointer"
                  : "border-transparent text-slate-500"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">1</span>
              <span>Wgraj plik</span>
            </button>

            <button
              type="button"
              onClick={() => canProceedToStep2 && setCurrentStep(2)}
              disabled={!canProceedToStep2 || isProcessing}
              className={`pb-2 border-b-2 text-left transition flex items-center gap-1.5 ${
                currentStep === 2
                  ? "border-yellow-400 text-yellow-400"
                  : currentStep > 2
                  ? "border-emerald-500 text-emerald-400 cursor-pointer"
                  : "border-transparent text-slate-500"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">2</span>
              <span>Sprawdzamy dane</span>
            </button>

            <button
              type="button"
              onClick={() => canProceedToStep2 && setCurrentStep(3)}
              disabled={!canProceedToStep2 || isProcessing}
              className={`pb-2 border-b-2 text-left transition flex items-center gap-1.5 ${
                currentStep === 3
                  ? "border-yellow-400 text-yellow-400"
                  : currentStep > 3
                  ? "border-emerald-500 text-emerald-400 cursor-pointer"
                  : "border-transparent text-slate-500"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">3</span>
              <span>Dopasuj ustawienia</span>
            </button>

            <button
              type="button"
              disabled={!finalResult && !isProcessing}
              className={`pb-2 border-b-2 text-left transition flex items-center gap-1.5 ${
                currentStep === 4 ? "border-yellow-400 text-yellow-400" : "border-transparent text-slate-500"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">4</span>
              <span>Importujemy produkty</span>
            </button>
          </div>
        </div>

        {/* TREŚĆ KROKU */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* ========================================================================= */}
          {/* KROK 1: WGRAJ PLIK */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* LEWA KOLUMNA: WSKAZÓWKI I INFO BOX (ZGODNY Z MAKIETĄ ALLEGRO) */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-3">
                    <div className="flex items-start gap-2.5 text-emerald-400">
                      <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="font-bold text-white text-xs">Jaki plik przyjmiemy?</h4>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          Plik CSV o następujących kolumnach: <br />
                          <span className="font-mono text-yellow-400 font-semibold text-[10px]">
                            GTIN, EXTERNAL_ID, NAME, STOCK, PRICE, MPN, DESCRIPTION, IMAGE1..16, AI_COCREATED, CATEGORY, BRAND, COLOR, SIZE, MATERIAL.
                          </span>
                        </p>
                        <p className="text-[10px] text-slate-400 pt-1">
                          Kolumny oddziel przecinkami (lub średnikami), a wartości dziesiętne kropkami.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 bg-sky-950/40 border border-sky-500/30 p-2.5 rounded-lg text-sky-200 text-[11px]">
                      <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                      <p>
                        Zadbaj o to, by produkty miały przypisane numery GTIN (EAN). Przyspieszy to ich rozpoznanie w katalogu produktów Allegro.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => downloadAllegroTemplateCsv("template.csv")}
                        className="text-yellow-400 hover:text-yellow-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer hover:underline"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Pobierz szablon pliku (template.csv)</span>
                      </button>
                    </div>
                  </div>

                  {/* SZYBKIE ŁADOWANIE ZESTAWU PRZYKŁADOWEGO */}
                  <div className="bg-gradient-to-br from-amber-950/30 to-slate-900 border border-amber-500/30 p-3.5 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                      <Zap className="w-3.5 h-3.5" />
                      <span>Szybki Test: 10 Gotowych Produktów</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Wczytaj przykładowe dane (Zmywarka, Ekspres LatteGo, Odkurzacz V9, Plecak 40L, Bluza, Laptop i inne).
                    </p>
                    <button
                      type="button"
                      onClick={handleLoadSampleData}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Wczytaj przykładowy zestaw (10 pozycji)</span>
                    </button>
                  </div>
                </div>

                {/* PRAWA KOLUMNA: STREFA UPLOADU I WKLEJANIA */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-white font-bold text-xs">Wgraj plik, w którym są produkty:</label>
                    <div className="flex gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setInputMode("file")}
                        className={`px-2 py-0.5 rounded cursor-pointer ${
                          inputMode === "file" ? "bg-yellow-400 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Plik CSV
                      </button>
                      <button
                        type="button"
                        onClick={() => setInputMode("paste")}
                        className={`px-2 py-0.5 rounded cursor-pointer ${
                          inputMode === "paste" ? "bg-yellow-400 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Wklej tekst CSV
                      </button>
                    </div>
                  </div>

                  {inputMode === "file" ? (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[220px] ${
                        isDragOver
                          ? "border-yellow-400 bg-yellow-400/10"
                          : "border-slate-700 bg-slate-950/60 hover:border-yellow-400/60"
                      }`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-yellow-400/10 text-yellow-400 flex items-center justify-center mb-3 border border-yellow-400/20">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-black text-white tracking-wide uppercase">
                        PRZECIĄGNIJ LUB DOŁĄCZ PLIK
                      </span>
                      <p className="text-[11px] text-slate-400 mt-1">Maksymalnie 50 000 produktów (.csv, .txt, .tsv)</p>

                      <button
                        type="button"
                        className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-yellow-400" />
                        <span>Wybierz plik z dysku</span>
                      </button>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.txt,.tsv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        value={csvText}
                        onChange={(e) => handleParseCsvData(e.target.value, "wklejony_tekst.csv")}
                        placeholder="Wklej zawartość pliku CSV z nagłówkami (GTIN,EXTERNAL_ID,NAME,STOCK,PRICE...)..."
                        rows={10}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-mono text-[11px] focus:border-yellow-400 outline-hidden"
                      />
                      <p className="text-[10px] text-slate-400">
                        Wklej dane bezpośrednio z programu Excel, Arkuszy Google lub Notatnika.
                      </p>
                    </div>
                  )}

                  {/* STATUS WCZYTANEGO PLIKU */}
                  {parsedRows.length > 0 && (
                    <div className="bg-emerald-950/40 border border-emerald-500/40 p-3 rounded-xl flex items-center justify-between animate-in fade-in">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div>
                          <p className="text-white font-bold text-xs">
                            Wczytano: <span className="text-emerald-300 font-mono">{fileName}</span>
                          </p>
                          <p className="text-[11px] text-slate-300">
                            Rozpoznano <span className="font-bold text-yellow-400">{parsedRows.length}</span> produktów
                            ({parsedStats.valid} poprawnych, {parsedStats.invalid} z uwagami)
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="px-3.5 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs rounded-lg transition cursor-pointer flex items-center gap-1 shadow-sm"
                      >
                        <span>Dalej</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* KROK 2: SPRAWDZAMY DANE (TABELA I WALIDACJA) */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in">
              {/* PODSUMOWANIE STATYSTYCZNE */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Liczba pozycji</span>
                  <span className="text-lg font-black text-white">{parsedRows.length} szt.</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Poprawne GTIN / EAN</span>
                  <span className="text-lg font-black text-emerald-400">{parsedStats.valid}</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Łączna wartość</span>
                  <span className="text-lg font-black text-yellow-400">
                    {parsedRows.reduce((acc, r) => acc + r.price * r.stock, 0).toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł
                  </span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Suma stanów mag.</span>
                  <span className="text-lg font-black text-sky-400">
                    {parsedRows.reduce((acc, r) => acc + r.stock, 0)} szt.
                  </span>
                </div>
              </div>

              {/* FILTRY I WYSZUKIWARKA */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="relative flex-1 w-full">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtruj po tytule, kodzie GTIN, SKU lub marce..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-3 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-yellow-400 outline-hidden"
                  />
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto text-[11px]">
                  <button
                    type="button"
                    onClick={() => setFilterMode("all")}
                    className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                      filterMode === "all" ? "bg-slate-800 text-white border border-slate-600" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Wszystkie ({parsedRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode("valid")}
                    className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                      filterMode === "valid" ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40" : "text-slate-400 hover:text-emerald-400"
                    }`}
                  >
                    Poprawne ({parsedStats.valid})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode("warnings")}
                    className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                      filterMode === "warnings" ? "bg-amber-950 text-amber-400 border border-amber-500/40" : "text-slate-400 hover:text-amber-400"
                    }`}
                  >
                    Z uwagami ({parsedStats.invalid})
                  </button>
                </div>
              </div>

              {/* TABELA POZYCJI */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 max-h-[320px] overflow-y-auto">
                <table className="w-full text-left text-[11px] text-slate-300">
                  <thead className="bg-[#0c1322] text-slate-400 font-mono uppercase text-[10px] sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">GTIN / EAN</th>
                      <th className="py-2.5 px-3">SKU (External ID)</th>
                      <th className="py-2.5 px-3">Nazwa / Tytuł Allegro</th>
                      <th className="py-2.5 px-3 text-right">Cena brutto</th>
                      <th className="py-2.5 px-3 text-center">Stan</th>
                      <th className="py-2.5 px-3">Zdjęcia</th>
                      <th className="py-2.5 px-3">Kategoria / Marka</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {filteredRows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-900/50 transition">
                        <td className="py-2 px-3 text-slate-500">{r.rawRowIndex}</td>
                        <td className="py-2 px-3 font-semibold text-yellow-400">
                          {r.gtin || <span className="text-slate-500 font-normal italic">Brak GTIN</span>}
                        </td>
                        <td className="py-2 px-3 text-slate-400">{r.externalId}</td>
                        <td className="py-2 px-3 font-sans font-medium text-white max-w-xs truncate" title={r.name}>
                          {r.name}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-400">{r.price.toFixed(2)} zł</td>
                        <td className="py-2 px-3 text-center font-bold text-sky-400">{r.stock}</td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px]">
                            {r.images.length} zdjęć
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-400 font-sans truncate max-w-[140px]" title={`${r.category} | ${r.brand}`}>
                          {r.brand} ({r.category})
                        </td>
                        <td className="py-2 px-3">
                          {r.isValid ? (
                            <span className="text-emerald-400 flex items-center gap-1 font-bold text-[10px]">
                              <CheckCircle2 className="w-3 h-3" /> Gotowy
                            </span>
                          ) : (
                            <span className="text-amber-400 flex items-center gap-1 font-bold text-[10px]" title={r.validationErrors.join("; ")}>
                              <AlertTriangle className="w-3 h-3" /> Uwagi
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* KROK 3: DOPASUJ USTAWIENIA */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-4">
                <h4 className="text-white font-bold text-sm flex items-center gap-2">
                  <Truck className="w-4 h-4 text-yellow-400" />
                  <span>Warunki sprzedaży i cenniki dostaw Allegro</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Cennik dostaw (Shipping Table):</label>
                    <select
                      value={shippingRateId}
                      onChange={(e) => setShippingRateId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:border-yellow-400 outline-hidden font-mono"
                    >
                      <option value="1 smart">1 smart (Domyślny Cennik Smart)</option>
                      <option value="cennik-standard">Kurier DPD / InPost Paczkomat (14.99 zł)</option>
                      <option value="cennik-gabaryt">Przesyłka Paletowa / Gabaryt AGD (99.00 zł)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Warunki zwrotów:</label>
                    <select
                      value={returnPolicyId}
                      onChange={(e) => setReturnPolicyId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:border-yellow-400 outline-hidden font-mono"
                    >
                      <option value="zwrot-14dni">Zwrot standardowy 14 dni dla konsumenta</option>
                      <option value="zwrot-30dni">Wydłużony zwrot 30 dni (Allegro Smart)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Gwarancja / Rękojmia:</label>
                    <select
                      value={warrantyId}
                      onChange={(e) => setWarrantyId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:border-yellow-400 outline-hidden font-mono"
                    >
                      <option value="gwarancja-12m">Gwarancja rozruchowa 12 miesięcy</option>
                      <option value="gwarancja-24m">Gwarancja producenta 24 miesiące (Nowy)</option>
                      <option value="rekojmia-1m">Rękojmia wyłączona dla przedsiębiorców</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Rynek sprzedaży (Kraj):</label>
                    <select
                      value={targetMarket}
                      onChange={(e) => setTargetMarket(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:border-yellow-400 outline-hidden font-mono"
                    >
                      <option value="allegro-pl">Allegro Polska (allegro.pl - PLN)</option>
                      <option value="allegro-cz">Allegro Czechy (allegro.cz - CZK)</option>
                      <option value="allegro-sk">Allegro Słowacja (allegro.sk - EUR)</option>
                      <option value="allegro-hu">Allegro Węgry (allegro.hu - HUF)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <label className="block text-slate-300 font-bold">Tryb publikacji w Allegro:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label
                      onClick={() => setPublishMode("publish_direct")}
                      className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                        publishMode === "publish_direct"
                          ? "bg-yellow-400/10 border-yellow-400 text-white"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="publishMode"
                        checked={publishMode === "publish_direct"}
                        onChange={() => setPublishMode("publish_direct")}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="font-bold text-xs text-white block">Wystaw bezpośrednio w Allegro REST API</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          Oferty zostaną natychmiast opublikowane jako aktywne na Twoim połączonym koncie sprzedawcy.
                        </span>
                      </div>
                    </label>

                    <label
                      onClick={() => setPublishMode("drafts_only")}
                      className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                        publishMode === "drafts_only"
                          ? "bg-yellow-400/10 border-yellow-400 text-white"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="publishMode"
                        checked={publishMode === "drafts_only"}
                        onChange={() => setPublishMode("drafts_only")}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="font-bold text-xs text-white block">Zapisz jako szkice robocze w WMS</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          Dodaj produkty do bazy asortymentu i magazynu, z możliwością późniejszej edycji.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Przypisanie regałów WMS:</span>
                  <span className="text-yellow-400 font-bold">{rackPrefix} 01 - {rackPrefix} 60 (automatycznie)</span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* KROK 4: IMPORTUJEMY PRODUKTY & RAPORT KOŃCOWY */}
          {/* ========================================================================= */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in">
              {isProcessing && (
                <div className="bg-slate-900 border border-yellow-400/40 p-5 rounded-xl space-y-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-yellow-400/20 text-yellow-400 flex items-center justify-center mx-auto animate-pulse">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                  <div>
                    <h4 className="text-white font-black text-sm sm:text-base">Przetwarzanie produktów i komunikacja z Allegro...</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Trwa tworzenie ofert, weryfikacja kodów GTIN oraz synchronizacja z magazynem WMS.
                    </p>
                  </div>

                  {/* PROGRES BAR */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="bg-gradient-to-r from-yellow-400 to-amber-500 h-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>Postęp: {progressPercent}%</span>
                      <span>{parsedRows.length} pozycji</span>
                    </div>
                  </div>
                </div>
              )}

              {/* RAPORT SUKCESU */}
              {!isProcessing && finalResult && (
                <div className="bg-emerald-950/30 border border-emerald-500/40 p-5 rounded-xl space-y-4 animate-in zoom-in-95">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-white font-black text-base">
                        🎉 Import i wystawianie zakończone sukcesem!
                      </h4>
                      <p className="text-xs text-slate-300">
                        Pomyślnie przetworzono <span className="text-emerald-400 font-bold">{finalResult.successful}</span> z {finalResult.total} produktów.
                      </p>
                    </div>
                  </div>

                  {finalResult.offersCreated.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] text-slate-300 font-bold uppercase font-mono block">
                        Utworzone oferty Allegro REST API:
                      </span>
                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 max-h-40 overflow-y-auto space-y-1.5 font-mono text-xs">
                        {finalResult.offersCreated.map((off, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2 p-1.5 bg-slate-900/60 rounded border border-slate-800">
                            <span className="text-white font-medium truncate flex-1 font-sans">{off.name}</span>
                            <span className="text-emerald-400 font-bold shrink-0">{off.price.toFixed(2)} zł</span>
                            <a
                              href={off.url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-0.5 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-400 rounded text-[10px] font-bold flex items-center gap-1 shrink-0"
                            >
                              <span>#{off.id}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* KONSOLA LOGÓW NA ŻYWO */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Dziennik operacji API:</span>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] h-40 overflow-y-auto space-y-1">
                  {processingLog.map((log, idx) => (
                    <div
                      key={idx}
                      className={`${
                        log.type === "success"
                          ? "text-emerald-400"
                          : log.type === "warning"
                          ? "text-amber-400"
                          : log.type === "error"
                          ? "text-rose-400"
                          : "text-slate-300"
                      }`}
                    >
                      {log.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* DOLNY PASEK PRZYCISKÓW WIZARDA */}
        <div className="bg-[#0e1626] border-t border-slate-800 p-4 flex items-center justify-between gap-3">
          {currentStep === 1 && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
              >
                ANULUJ
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                disabled={!canProceedToStep2}
                className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 disabled:hover:bg-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center gap-1.5"
              >
                <span>DALEJ</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {currentStep === 2 && (
            <>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>WSTECZ</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center gap-1.5"
              >
                <span>DOPASUJ USTAWIENIA</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {currentStep === 3 && (
            <>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>WSTECZ</span>
              </button>

              <button
                type="button"
                onClick={handleStartImportAndPublish}
                className="px-6 py-2.5 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center gap-2"
              >
                <Zap className="w-4 h-4 text-slate-950" />
                <span>ROZPOCZNIJ MASOWE WYSTAWIANIE ({parsedRows.length} POZYCJI)</span>
              </button>
            </>
          )}

          {currentStep === 4 && (
            <>
              <div className="text-xs text-slate-400 font-mono">
                {isProcessing ? "Przetwarzanie w toku..." : "Import zakończony."}
              </div>

              {!isProcessing && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(1);
                      setCsvText("");
                      setParsedRows([]);
                      setFinalResult(null);
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
                  >
                    Wgraj kolejny plik
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>ZAMKNIJ I ZOBACZ ASORTYMENT</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
