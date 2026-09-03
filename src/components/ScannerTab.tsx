import React, { useRef, useState, useMemo, useEffect } from "react";
import {
  Sparkles,
  Key,
  Camera,
  Trash2,
  Loader2,
  FileText,
  Check,
  Tag,
  ShieldCheck,
  RefreshCw,
  Search,
  Globe,
  TrendingUp,
  Images,
  Image as ImageIcon,
  Plus,
  ArrowLeft,
  ArrowRight,
  Star,
  Maximize2,
  Eye,
  X,
  UploadCloud,
  CheckCircle2,
  Mic,
  MicOff,
  Volume2,
  FileSpreadsheet,
  Download,
  HelpCircle,
  Coins,
  Layers,
  Flame,
  CheckCircle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Scan,
  Copy,
  Database,
  CheckSquare,
  Square,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { PartListingData, PartItem } from "../types";
import { compressImageFile, extractImagesFromClipboardEvent } from "../utils/imageOptimizer";
import { checkLiveMarketValuation, scanOcrFromImage } from "../utils/geminiVision";
import { estimateAllegroMarketPrice } from "../utils/allegroPriceEngine";
import { ScannerAllegroCsvModal, SCANNER_CSV_QUEUE_KEY } from "./ScannerAllegroCsvModal";
import { IntegrationGuideModal } from "./IntegrationGuideModal";
import { CarPartsCatalogModal } from "./CarPartsCatalogModal";

interface ScannerTabProps {
  formData: PartListingData;
  setFormData: React.Dispatch<React.SetStateAction<PartListingData>>;
  uploadedImages: string[];
  setUploadedImages: React.Dispatch<React.SetStateAction<string[]>>;
  isAnalyzing: boolean;
  isSaving: boolean;
  analysisStatus: string;
  vatRate: number;
  setVatRate: (rate: number) => void;
  onAnalyze: (selectedImages?: string[]) => void;
  onSaveToWarehouse: () => void;
  onOpenApiKeyModal: () => void;
  apiKey?: string;
  onOpenCatalogSearch?: (query?: string, type?: "oem" | "vin") => void;
}

export const ScannerTab: React.FC<ScannerTabProps> = ({
  formData,
  setFormData,
  uploadedImages,
  setUploadedImages,
  isAnalyzing,
  isSaving,
  analysisStatus,
  vatRate,
  onAnalyze,
  onSaveToWarehouse,
  onOpenApiKeyModal,
  apiKey,
  onOpenCatalogSearch,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isCheckingMarket, setIsCheckingMarket] = useState(false);
  const [marketReport, setMarketReport] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isDictatingDescription, setIsDictatingDescription] = useState(false);
  const dictationRecognitionRef = useRef<any>(null);

  // Dedicated OCR, Sygnatura & Podgląd State
  const [isScanningOcr, setIsScanningOcr] = useState(false);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState<number>(0);
  const [previewRotateDeg, setPreviewRotateDeg] = useState<number>(0);
  const [previewZoom, setPreviewZoom] = useState<number>(1);
  const [ocrFeedback, setOcrFeedback] = useState<string | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState<number>(1);
  const [lightboxRotate, setLightboxRotate] = useState<number>(0);
  const [copiedSygnatura, setCopiedSygnatura] = useState<boolean>(false);
  const [imageErrorMap, setImageErrorMap] = useState<Record<number, boolean>>({});

  // Multi-image selection for Gemini Vision AI
  const [selectedForAnalysis, setSelectedForAnalysis] = useState<number[]>([]);
  const [analysisMode, setAnalysisMode] = useState<"all_selected" | "single_preview">("all_selected");

  // External Car Parts Database (TecDoc / autokey.pl) modal state
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [catalogInitialQuery, setCatalogInitialQuery] = useState("");
  const [catalogInitialType, setCatalogInitialType] = useState<"oem" | "vin">("oem");

  // Keep selectedForAnalysis in sync when uploadedImages changes
  useEffect(() => {
    if (uploadedImages.length > 0) {
      setSelectedForAnalysis((prev) => {
        const valid = prev.filter((i) => i >= 0 && i < uploadedImages.length);
        return valid.length > 0 ? valid : uploadedImages.map((_, i) => i);
      });
      if (selectedPreviewIndex >= uploadedImages.length) {
        setSelectedPreviewIndex(Math.max(0, uploadedImages.length - 1));
      }
    } else {
      setSelectedForAnalysis([]);
      setSelectedPreviewIndex(0);
    }
  }, [uploadedImages.length]);

  const toggleSelectForAnalysis = (index: number) => {
    setSelectedForAnalysis((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index);
      } else {
        return [...prev, index].sort((a, b) => a - b);
      }
    });
  };

  const selectAllForAnalysis = () => {
    setSelectedForAnalysis(uploadedImages.map((_, i) => i));
  };

  const selectOnlyCurrentForAnalysis = () => {
    setSelectedForAnalysis([selectedPreviewIndex]);
  };

  const deselectAllForAnalysis = () => {
    setSelectedForAnalysis([]);
  };

  const handleRunAnalysis = () => {
    if (analysisMode === "single_preview") {
      const single = uploadedImages[selectedPreviewIndex] ? [uploadedImages[selectedPreviewIndex]] : uploadedImages;
      onAnalyze(single);
    } else {
      const selectedImgs = selectedForAnalysis.map((idx) => uploadedImages[idx]).filter(Boolean);
      onAnalyze(selectedImgs.length > 0 ? selectedImgs : uploadedImages);
    }
  };
  const [isOcrFilterActive, setIsOcrFilterActive] = useState<boolean>(false);

  // Allegro CSV & Integration Guide state
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [csvQueueCount, setCsvQueueCount] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(SCANNER_CSV_QUEUE_KEY);
      return stored ? JSON.parse(stored).length : 0;
    } catch (e) {
      return 0;
    }
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const updateQueueCount = () => {
    try {
      const stored = localStorage.getItem(SCANNER_CSV_QUEUE_KEY);
      setCsvQueueCount(stored ? JSON.parse(stored).length : 0);
    } catch (e) {}
  };

  // Automatyczna kalkulacja cen rynkowych z bazy ofert Allegro dla kategorii
  const marketEstimate = useMemo(() => {
    return estimateAllegroMarketPrice(
      formData.kategoria || "",
      formData.samochod?.marka,
      formData.samochod?.model,
      formData.numery_czesci
    );
  }, [formData.kategoria, formData.samochod?.marka, formData.samochod?.model, formData.numery_czesci]);

  const applySuggestedPrice = (price: number) => {
    const netto = Math.round(price / (1 + vatRate / 100));
    setFormData((prev) => ({
      ...prev,
      cena: { brutto: price, netto },
    }));
    showToast(`Ustawiono sugerowaną cenę Allegro: ${price} PLN brutto`);
  };

  const handleSygnaturaChange = (val: string) => {
    const clean = val.toUpperCase().trimStart();
    setFormData((prev) => ({
      ...prev,
      ocr_wyniki: {
        ...(prev.ocr_wyniki || { numer_magazynowy: "" }),
        numer_magazynowy: clean,
      },
      allegro: {
        ...(prev.allegro || {}),
        signature: clean,
      },
      sku: clean,
    }));
  };

  const handleCopySygnatura = (sig?: string) => {
    const s = sig || formData.ocr_wyniki?.numer_magazynowy || formData.allegro?.signature || "MAG 14";
    navigator.clipboard.writeText(s);
    setCopiedSygnatura(true);
    showToast(`Skopiowano sygnaturę do schowka: ${s}`);
    setTimeout(() => setCopiedSygnatura(false), 2200);
  };

  const handleGenerateNewSygnatura = () => {
    const randomNum = Math.floor(10 + Math.random() * 89);
    const newSig = `MAG ${randomNum}`;
    handleSygnaturaChange(newSig);
    showToast(`Wygenerowano nową sygnaturę magazynową: ${newSig}`);
  };

  const handleRunOcr = async (targetIndex = selectedPreviewIndex) => {
    if (uploadedImages.length === 0) {
      showToast("Załącz najpierw zdjęcie części, aby uruchomić OCR!");
      return;
    }
    const targetImg = uploadedImages[targetIndex] || uploadedImages[0];
    setIsScanningOcr(true);
    setOcrFeedback("Skanowanie ujęcia: odczyt napisów markerem, regału WMS i kodów OEM...");
    try {
      const res = await scanOcrFromImage(targetImg, apiKey);
      if (res.success && res.data) {
        const d = res.data;
        const newSig = d.sygnatura || formData.ocr_wyniki?.numer_magazynowy || "MAG 14";
        const newMarker = d.napisy_markerem || formData.ocr_wyniki?.napisy_markerem || "";
        const newOem = d.numery_oem || formData.numery_czesci || "";

        setFormData((prev) => ({
          ...prev,
          ocr_wyniki: {
            numer_magazynowy: newSig,
            napisy_markerem: newMarker,
          },
          allegro: {
            ...(prev.allegro || {}),
            signature: newSig,
          },
          sku: newSig,
          numery_czesci: prev.numery_czesci ? prev.numery_czesci : newOem,
        }));

        setOcrFeedback(`Odczytano pomyślnie! Sygnatura: ${newSig} • Marker: "${newMarker || 'Brak'}"`);
        showToast(`Odczytano OCR: ${newMarker ? `"${newMarker}" ` : ""}[${newSig}]`);
      }
    } catch (e: any) {
      setOcrFeedback("Nie udało się odczytać napisów. Wpisz dane ręcznie.");
    } finally {
      setIsScanningOcr(false);
    }
  };

  const handleAppendOcrToDescription = () => {
    const marker = formData.ocr_wyniki?.napisy_markerem;
    const sig = formData.ocr_wyniki?.numer_magazynowy;
    if (!marker && !sig) {
      showToast("Brak odczytanych danych OCR do wstawienia.");
      return;
    }
    const addition = ` [Oznaczenie ze zdjęcia OCR: ${marker ? `Napis markerem: ${marker}` : ""}${marker && sig ? " | " : ""}${sig ? `Sygnatura regału: ${sig}` : ""}]`;
    setFormData((prev) => ({
      ...prev,
      opis: (prev.opis || "") + addition,
    }));
    showToast("Wstawiono dane OCR do opisu części!");
  };

  const handleQuickAddToCsvQueue = () => {
    try {
      const stored = localStorage.getItem(SCANNER_CSV_QUEUE_KEY);
      const queue: PartItem[] = stored ? JSON.parse(stored) : [];
      const newPart: PartItem = {
        id: `scan_${Date.now()}`,
        barcode: `PART-${Math.floor(100000 + Math.random() * 900000)}`,
        currentRackLocation: formData.ocr_wyniki?.numer_magazynowy || "MAG 14",
        createdAt: new Date().toISOString(),
        status: "Dostępny",
        listingData: {
          ...formData,
          zdjecia: uploadedImages,
        },
      };
      const updated = [newPart, ...queue];
      localStorage.setItem(SCANNER_CSV_QUEUE_KEY, JSON.stringify(updated));
      setCsvQueueCount(updated.length);
      showToast(`Dodano "${formData.kategoria || "Część"}" do kolejki Allegro CSV! (W kolejce: ${updated.length})`);
    } catch (e) {
      alert("Nie udało się zapisać do kolejki CSV.");
    }
  };

  const toggleDictateDescription = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Rozpoznawanie mowy nie jest wspierane w tej przeglądarce. Skorzystaj z Google Chrome.");
      return;
    }

    if (isDictatingDescription) {
      if (dictationRecognitionRef.current) {
        try {
          dictationRecognitionRef.current.abort();
        } catch (e) {
          try {
            dictationRecognitionRef.current.stop();
          } catch (err) {}
        }
        dictationRecognitionRef.current = null;
      }
      setIsDictatingDescription(false);
      return;
    }

    if (dictationRecognitionRef.current) {
      try {
        dictationRecognitionRef.current.abort();
      } catch (e) {}
      dictationRecognitionRef.current = null;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "pl-PL";
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        let transcriptText = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            transcriptText += event.results[i][0].transcript + " ";
          }
        }
        if (transcriptText.trim()) {
          setFormData((prev) => ({
            ...prev,
            opis: prev.opis ? `${prev.opis} ${transcriptText.trim()}` : transcriptText.trim(),
          }));
        }
      };

      recognition.onerror = () => {
        setIsDictatingDescription(false);
      };

      recognition.onend = () => {
        setIsDictatingDescription(false);
      };

      dictationRecognitionRef.current = recognition;
      recognition.start();
      setIsDictatingDescription(true);
    } catch (e: any) {
      if (e?.name === "InvalidStateError" || e?.message?.includes("already started")) {
        setIsDictatingDescription(true);
      } else {
        console.warn("Speech recognition warning in scanner:", e);
        setIsDictatingDescription(false);
      }
    }
  };

  // Cleanup dictation on unmount
  React.useEffect(() => {
    return () => {
      if (dictationRecognitionRef.current) {
        try {
          dictationRecognitionRef.current.abort();
        } catch (e) {}
        dictationRecognitionRef.current = null;
      }
    };
  }, []);

  // Synchronize uploadedImages into formData.zdjecia
  React.useEffect(() => {
    setFormData((prev) => {
      if (prev.zdjecia === uploadedImages) return prev;
      return {
        ...prev,
        zdjecia: uploadedImages,
      };
    });
  }, [uploadedImages, setFormData]);

  // Global clipboard paste listener (Ctrl+V anywhere in Scanner)
  React.useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // Extract images from clipboard (screenshots, image files, image URLs, and HTML <img> tags)
      const images = await extractImagesFromClipboardEvent(e);
      if (images && images.length > 0) {
        e.preventDefault();
        e.stopPropagation();

        setUploadedImages((prev) => {
          // If previous images were the demo/sample stock photos (Unsplash), replace them with the user's real pasted photo
          const isSampleSet = prev.length > 0 && prev.some((u) => u.includes("unsplash.com"));
          if (isSampleSet || prev.length === 0) {
            return images.slice(0, 12);
          }
          // Put the newly pasted image at the front so it immediately becomes #1 Główne ujęcie
          return [...images, ...prev].slice(0, 12);
        });

        showToast(`Wklejono ${images.length > 1 ? `${images.length} zdjęcia` : "zdjęcie"} części ze schowka (Ctrl+V)!`);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [setUploadedImages, showToast]);

  const handleImageFiles = async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    if (fileArr.length === 0) return;

    const base64Images: string[] = [];
    for (const file of fileArr) {
      try {
        const compressed = await compressImageFile(file, 1200, 1200, 0.85);
        if (compressed && compressed.length > 20) {
          base64Images.push(compressed);
        }
      } catch (err) {
        console.warn("Failed to compress image:", err);
      }
    }

    if (base64Images.length > 0) {
      setUploadedImages((prev) => {
        const isSampleSet = prev.length > 0 && prev.some((u) => u.includes("unsplash.com"));
        if (isSampleSet || prev.length === 0) {
          return base64Images.slice(0, 12);
        }
        return [...base64Images, ...prev].slice(0, 12);
      });
      showToast(`Wczytano ${base64Images.length > 1 ? `${base64Images.length} zdjęcia` : "zdjęcie"} części!`);
    }

    // Reset file inputs so re-selecting same files triggers onChange
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  // Move photo to index 0 (Make primary / featured cover photo)
  const handleMakePrimary = (index: number) => {
    if (index === 0) return;
    setUploadedImages((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      return [item, ...copy];
    });
  };

  // Move photo left/right
  const handleMovePhoto = (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= uploadedImages.length) return;
    setUploadedImages((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  // Remove individual photo
  const handleRemovePhoto = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
    if (lightboxIndex === index) {
      setLightboxIndex(null);
    } else if (lightboxIndex !== null && lightboxIndex > index) {
      setLightboxIndex(lightboxIndex - 1);
    }
  };

  // Sample real automotive parts for instant 1-click test
  const loadSamplePart = (sampleUrls: string[]) => {
    setUploadedImages(sampleUrls);
  };

  const handleBruttoChange = (val: string) => {
    const num = Number(val) || 0;
    const calculatedNetto = Math.round(num / (1 + vatRate / 100));
    setFormData((prev) => ({
      ...prev,
      cena: { brutto: num, netto: calculatedNetto },
    }));
  };

  const handleCheckMarketPricing = async () => {
    if (!formData.kategoria && !formData.samochod?.marka) {
      alert("Wprowadź markę lub kategorię części przed weryfikacją rynku!");
      return;
    }
    setIsCheckingMarket(true);
    setMarketReport(null);
    try {
      const res = await checkLiveMarketValuation(
        formData.kategoria || "Część",
        formData.samochod?.marka || "",
        formData.samochod?.model || "",
        formData.numery_czesci || "",
        apiKey
      );
      if (res.success) {
        setMarketReport(res.text);
      } else {
        setMarketReport(res.text);
      }
    } catch (e) {
      setMarketReport("Błąd podczas odpytywania Google Search.");
    } finally {
      setIsCheckingMarket(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* LEWA KARTA: SKANER GEMINI VISION AI & GALERIA ZDJĘĆ PRZED ZAPISEM DO WMS */}
      <div className="lg:col-span-5 bg-[#0b0f19] border border-slate-800/90 rounded-xl p-4 space-y-3.5 shadow-xs flex flex-col justify-between">
        <div className="space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-yellow-400 font-mono flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Skaner Gemini Vision AI
            </h3>
            <button
              onClick={onOpenApiKeyModal}
              className="text-[10px] font-mono text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors bg-slate-950 px-2 py-0.5 rounded border border-slate-800"
            >
              <Key className="w-3 h-3 text-yellow-400" /> Klucz API
            </button>
          </div>

          {/* GŁÓWNA SEKCJA WYBORU WIELU PLIKÓW (MULTI-FILE DROPZONE) */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleImageFiles(e.dataTransfer.files);
              }
            }}
            className={`border-2 border-dashed rounded-xl p-3 text-center transition-all bg-[#030712] relative overflow-hidden group ${
              isDragging
                ? "border-yellow-400 bg-yellow-400/5 ring-2 ring-yellow-400/20"
                : "border-slate-800/90 hover:border-yellow-400/60"
            }`}
          >
            {/* PRZYCISKI I KONTROLKI DODAWANIA */}
            <div className="space-y-2 py-1">
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-400/10 text-yellow-400 flex items-center justify-center border border-yellow-400/20 shadow-xs">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-white block">
                    Prześlij zdjęcia części (Wybór wielu plików naraz)
                  </span>
                  <span className="text-[11px] text-slate-400 block font-mono">
                    Przeciągnij i upuść lub wybierz wiele zdjęć (Ctrl / Shift / Zaznacz wszystkie)
                  </span>
                </div>
              </div>

              {/* PRZYCISKI AKCJI DODAWANIA PLIKÓW */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs rounded-lg transition cursor-pointer flex items-center gap-1.5 font-mono shadow-xs"
                >
                  <Images className="w-3.5 h-3.5" />
                  <span>Wybierz wiele plików</span>
                </button>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs rounded-lg border border-slate-700 transition cursor-pointer flex items-center gap-1.5 font-mono"
                  title="Zrób zdjęcie aparatem / smartfonem"
                >
                  <Camera className="w-3.5 h-3.5 text-teal-400" />
                  <span>Aparat</span>
                </button>
                <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800 font-mono hidden sm:inline-block">
                  Wklej: <kbd className="text-yellow-400 font-bold">Ctrl+V</kbd>
                </span>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => e.target.files && handleImageFiles(e.target.files)}
              className="hidden"
            />

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => e.target.files && handleImageFiles(e.target.files)}
              className="hidden"
            />
          </div>

          {/* INTERAKTYWNA GALERIA PODGLĄDU KAŻDEGO ZDJĘCIA PRZED ZAPISEM DO WMS */}
          {uploadedImages.length > 0 ? (
            <div className="space-y-2 bg-[#070b14] p-3 rounded-xl border border-slate-800/90 shadow-inner">
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <Images className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-slate-200 font-bold">
                    Podgląd ujęć przed zapisaniem: <strong className="text-yellow-400">{uploadedImages.length}</strong> / 12
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Dodaj kolejne
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadedImages([])}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer transition-colors ml-1"
                  >
                    <Trash2 className="w-3 h-3" /> Wyczyść
                  </button>
                </div>
              </div>

              {/* NARZĘDZIA WYBORU ZDJĘĆ DO ANALIZY GEMINI VISION AI */}
              <div className="bg-[#030712] border border-slate-800 rounded-lg p-2.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-mono">
                  <span className="text-yellow-400 font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Gemini AI ({selectedForAnalysis.length} z {uploadedImages.length} wybranych):</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={selectAllForAnalysis}
                      className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-300 hover:text-white border border-slate-700 transition"
                      title="Zaznacz wszystkie zdjęcia do analizy"
                    >
                      Wszystkie ({uploadedImages.length})
                    </button>
                    <button
                      type="button"
                      onClick={selectOnlyCurrentForAnalysis}
                      className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] text-yellow-400 hover:text-yellow-300 border border-slate-700 transition"
                      title="Zaznacz wyłącznie aktywnie podglądane zdjęcie"
                    >
                      Tylko #{selectedPreviewIndex + 1}
                    </button>
                    <button
                      type="button"
                      onClick={deselectAllForAnalysis}
                      className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-400 hover:text-white border border-slate-700 transition"
                      title="Odznacz wszystkie zdjęcia"
                    >
                      Odznacz
                    </button>
                  </div>
                </div>

                {/* PRZEŁĄCZNIK TRYBU WYSYŁANIA */}
                <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                  <button
                    type="button"
                    onClick={() => setAnalysisMode("all_selected")}
                    className={`py-1.5 px-2 rounded-md border text-center transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      analysisMode === "all_selected"
                        ? "bg-yellow-400/20 border-yellow-400 text-yellow-300 font-bold shadow-xs"
                        : "bg-black/60 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Layers className="w-3 h-3 text-yellow-400" />
                    <span>Wielozdjęciowa ({selectedForAnalysis.length} foto)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnalysisMode("single_preview")}
                    className={`py-1.5 px-2 rounded-md border text-center transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      analysisMode === "single_preview"
                        ? "bg-teal-400/20 border-teal-400 text-teal-300 font-bold shadow-xs"
                        : "bg-black/60 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Scan className="w-3 h-3 text-teal-400" />
                    <span>Tylko ujęcie #{selectedPreviewIndex + 1}</span>
                  </button>
                </div>
              </div>

              {/* GRID MINIATUREK ZE SZCZEGÓŁOWYM PANELEM KONTROLI KAŻDEGO ZDJĘCIA */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto p-1 scrollbar-thin">
                {uploadedImages.map((img, idx) => (
                  <div
                    key={idx}
                    className={`relative rounded-lg overflow-hidden bg-black border transition group/item flex flex-col justify-between ${
                      selectedPreviewIndex === idx
                        ? "border-yellow-400 shadow-md ring-2 ring-yellow-400/40"
                        : selectedForAnalysis.includes(idx)
                        ? "border-yellow-400/50 hover:border-yellow-400"
                        : "border-slate-800 opacity-80 hover:opacity-100 hover:border-slate-600"
                    }`}
                  >
                    {/* OBRAZEK */}
                    <div
                      className="relative aspect-square w-full bg-[#030712] cursor-pointer overflow-hidden flex items-center justify-center"
                      onClick={() => {
                        setSelectedPreviewIndex(idx);
                        setPreviewRotateDeg(0);
                      }}
                      onDoubleClick={() => setLightboxIndex(idx)}
                      title="Kliknij, aby wybrać do podglądu i OCR (podwójny klik: pełny ekran)"
                    >
                      {imageErrorMap[idx] ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-slate-950 text-slate-400">
                          <ImageIcon className="w-5 h-5 text-slate-600 mb-0.5" />
                          <span className="text-[9px] font-bold">Ujęcie #{idx + 1}</span>
                        </div>
                      ) : (
                        <img
                          src={img}
                          alt={`Ujęcie ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          onError={() => setImageErrorMap((prev) => ({ ...prev, [idx]: true }))}
                          className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-200"
                        />
                      )}

                      {/* NAKŁADKA HOVER Z LUPĄ I SELEKCJĄ */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxIndex(idx);
                          }}
                          className="p-1 bg-black/80 hover:bg-black text-yellow-400 rounded-md border border-slate-700 flex items-center gap-0.5 text-[9px] font-mono font-bold"
                          title="Powiększ na pełny ekran"
                        >
                          <Maximize2 className="w-3 h-3" />
                          <span>HD</span>
                        </button>
                      </div>

                      {/* BADGE NUMERU I GŁÓWNEGO FOTO */}
                      <div className="absolute top-1.5 left-1.5">
                        {idx === 0 ? (
                          <span className="bg-yellow-400 text-slate-950 text-[9px] font-mono font-black px-1.5 py-0.5 rounded shadow-sm flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-slate-950" /> #1 Top
                          </span>
                        ) : (
                          <span className="bg-black/80 text-slate-200 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-slate-700">
                            #{idx + 1}
                          </span>
                        )}
                      </div>

                      {/* BADGE WYBORU DO ANALIZY AI (KLIKALNY PRZEŁĄCZNIK) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectForAnalysis(idx);
                        }}
                        className={`absolute bottom-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold flex items-center gap-1 shadow-md transition cursor-pointer ${
                          selectedForAnalysis.includes(idx)
                            ? "bg-yellow-400 text-slate-950 ring-1 ring-yellow-300"
                            : "bg-black/85 text-slate-400 border border-slate-700 hover:text-white"
                        }`}
                        title={
                          selectedForAnalysis.includes(idx)
                            ? "Zdjęcie wybrane do analizy Gemini Vision (kliknij, aby wykluczyć)"
                            : "Zdjęcie pominięte w analizie (kliknij, aby dołączyć)"
                        }
                      >
                        {selectedForAnalysis.includes(idx) ? (
                          <>
                            <CheckSquare className="w-2.5 h-2.5 fill-slate-950 text-yellow-400" />
                            <span>AI ✓</span>
                          </>
                        ) : (
                          <>
                            <Square className="w-2.5 h-2.5" />
                            <span>Pomiń</span>
                          </>
                        )}
                      </button>

                      {/* PRZYCISK USUWANIA ZDJĘCIA */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePhoto(idx);
                        }}
                        className="absolute top-1.5 right-1.5 bg-red-600/90 hover:bg-red-500 text-white p-1 rounded-md text-[10px] cursor-pointer shadow-md transition-all"
                        title="Usuń to zdjęcie"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* DOLNY PASEK KONTROLNY DLA KAŻDEGO ZDJĘCIA */}
                    <div className="bg-[#0b0f19] border-t border-slate-800 p-1 flex items-center justify-between text-[10px] font-mono">
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMovePhoto(idx, "left")}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-slate-800"
                          title="Przesuń w lewo"
                        >
                          <ArrowLeft className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === uploadedImages.length - 1}
                          onClick={() => handleMovePhoto(idx, "right")}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-slate-800"
                          title="Przesuń w prawo"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                      {/* PRZYCISK OCR DLA TEGO ZDJĘCIA */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPreviewIndex(idx);
                          handleRunOcr(idx);
                        }}
                        disabled={isScanningOcr}
                        className="text-[9px] text-yellow-400 hover:text-yellow-300 font-bold px-1.5 py-0.5 rounded hover:bg-yellow-400/10 transition flex items-center gap-0.5 border border-yellow-400/30"
                        title="Odczytaj OCR bezpośrednio z tego zdjęcia"
                      >
                        <Scan className="w-2.5 h-2.5" /> OCR
                      </button>

                      {idx !== 0 ? (
                        <button
                          type="button"
                          onClick={() => handleMakePrimary(idx)}
                          className="text-[9px] text-slate-300 hover:text-white font-bold px-1 py-0.5 rounded hover:bg-slate-800 transition"
                          title="Ustaw to zdjęcie jako główne (okładka w WMS)"
                        >
                          Top
                        </button>
                      ) : (
                        <span className="text-[9px] text-emerald-400 font-bold">Top</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* PLACEHOLDER GDY BRAK ZDJĘĆ */
            <div className="p-3 bg-[#030712] rounded-xl border border-slate-800/80 text-center text-xs text-slate-500 font-mono space-y-1">
              <ImageIcon className="w-6 h-6 mx-auto text-slate-600 mb-1" />
              <span>Brak załączonych zdjęć części.</span>
              <span className="text-[10px] text-slate-400 block">
                Dodaj zdjęcia powyżej, aby zobaczyć podgląd i przypisać je do Karty Magazynowej WMS.
              </span>
            </div>
          )}

          {/* SZYBKIE ZESTAWY ZDJĘĆ DO TESTU */}
          <div className="space-y-1 pt-0.5">
            <span className="text-[10px] font-mono text-slate-400 block">
              Przykładowe wielozdjęciowe ujęcia do szybkiego testu AI:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[10px] font-mono">
              <button
                type="button"
                onClick={() =>
                  loadSamplePart([
                    "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=800&q=80",
                  ])
                }
                className="bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white p-1.5 rounded-lg border border-slate-800 transition truncate text-center cursor-pointer"
                title="Wczytaj 3 zdjęcia lampy Fabia I"
              >
                💡 Lampa Fabia (3 foto)
              </button>
              <button
                type="button"
                onClick={() =>
                  loadSamplePart([
                    "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80",
                  ])
                }
                className="bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white p-1.5 rounded-lg border border-slate-800 transition truncate text-center cursor-pointer"
                title="Wczytaj 2 zdjęcia osprzętu silnika"
              >
                ⚙️ Osprzęt VAG (2 foto)
              </button>
              <button
                type="button"
                onClick={() =>
                  loadSamplePart([
                    "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80",
                  ])
                }
                className="bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white p-1.5 rounded-lg border border-slate-800 transition truncate text-center cursor-pointer"
                title="Wczytaj 2 zdjęcia turbiny Passat"
              >
                🌀 Turbo Passat (2 foto)
              </button>
              <button
                type="button"
                onClick={() =>
                  loadSamplePart([
                    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=800&q=80",
                  ])
                }
                className="bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white p-1.5 rounded-lg border border-slate-800 transition truncate text-center cursor-pointer"
                title="Wczytaj 2 zdjęcia wnętrza Polo"
              >
                🎛️ Zegary Polo (2 foto)
              </button>
            </div>
          </div>

          {isAnalyzing && (
            <div className="bg-[#030712] p-2.5 rounded-lg border border-yellow-400/40 text-xs text-yellow-400 font-mono text-center flex items-center justify-center gap-2 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-yellow-400" />
              <span>{analysisStatus}</span>
            </div>
          )}

          {/* PRZYCISK ROZPOZNANIA */}
          <button
            onClick={handleRunAnalysis}
            disabled={isAnalyzing || uploadedImages.length === 0 || (analysisMode === "all_selected" && selectedForAnalysis.length === 0)}
            className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-lg transition cursor-pointer shadow-xs flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed font-mono"
          >
            {isAnalyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 stroke-[3]" />
            )}
            <span>
              {analysisMode === "single_preview"
                ? `Rozpoznaj ujęcie #${selectedPreviewIndex + 1} (Gemini Vision • 1 foto)`
                : `Rozpoznaj i wyceń część (Gemini Vision • ${selectedForAnalysis.length} z ${uploadedImages.length} foto)`}
            </span>
          </button>
        </div>

        {/* KAFELEK INFORMACYJNY */}
        <div className="p-3 bg-[#030712] rounded-lg border border-slate-800/90 text-xs text-slate-400 space-y-1 mt-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-yellow-400" /> Standard OVOKO PL & PHU U Konesera
          </span>
          <p className="text-[11px] leading-relaxed text-slate-400">
            Wszystkie załączone zdjęcia ({uploadedImages.length}) zostaną zapisane w karcie magazynowej WMS oraz automatycznie przesłane na aukcje Allegro / Ovoko.
          </p>
        </div>
      </div>

      {/* PRAWA KARTA: KARTA MAGAZYNOWA WMS */}
      <div className="lg:col-span-7 bg-[#0b0f19] border border-slate-800/90 rounded-xl p-4 space-y-3.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2 gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-teal-400" /> Karta Magazynowa WMS
            </h3>
            {/* BADGE SYGNATURY WMS */}
            <div className="flex items-center gap-1 bg-yellow-400/10 border border-yellow-400/40 px-2 py-0.5 rounded text-[11px] font-mono font-bold text-yellow-300">
              <Tag className="w-3 h-3 text-yellow-400" />
              <span>Sygnatura: <strong className="text-yellow-400 underline">{formData.ocr_wyniki?.numer_magazynowy || "MAG 14"}</strong></span>
              <button
                type="button"
                onClick={() => handleCopySygnatura()}
                className="ml-1 text-slate-400 hover:text-yellow-300 transition"
                title="Kopiuj sygnaturę do schowka"
              >
                {copiedSygnatura ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {uploadedImages.length > 0 && (
              <span className="text-[11px] font-mono text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1">
                <Images className="w-3 h-3 text-yellow-400" /> {uploadedImages.length} {uploadedImages.length === 1 ? "zdjęcie" : "zdjęć"}
              </span>
            )}
            <button
              onClick={handleCheckMarketPricing}
              disabled={isCheckingMarket}
              className="text-[11px] font-mono text-yellow-400 hover:text-yellow-300 bg-[#030712] px-2.5 py-1 rounded border border-slate-800 hover:border-yellow-400 flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
              title="Sprawdź aktualne ceny rynkowe (Allegro / Ovoko / Otomoto)"
            >
              {isCheckingMarket ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Search className="w-3 h-3" />
              )}
              <span>Sprawdź rynek (Live)</span>
            </button>
          </div>
        </div>

        {/* MARKET PRICING REPORT IF AVAILABLE */}
        {marketReport && (
          <div className="bg-[#030712] border border-yellow-400/30 rounded-lg p-3 text-xs space-y-1 font-mono animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-yellow-400 font-bold border-b border-slate-800 pb-1">
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3" /> Raport Cen Rynkowych (Google Search Live)
              </span>
              <button
                onClick={() => setMarketReport(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px] whitespace-pre-line pt-1">
              {marketReport}
            </p>
          </div>
        )}

        {/* INTERAKTYWNY MODUŁ PODGLĄDU UJĘCIA I INSPEKCJI OCR DLA KARTY WMS */}
        {uploadedImages.length > 0 ? (
          <div className="bg-[#040813] p-3 rounded-xl border border-slate-800/90 space-y-2 font-mono">
            <div className="flex flex-wrap items-center justify-between text-xs gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={selectedPreviewIndex === 0}
                  onClick={() => {
                    setSelectedPreviewIndex((p) => Math.max(0, p - 1));
                    setPreviewRotateDeg(0);
                  }}
                  className="p-1 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                  title="Poprzednie zdjęcie"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={selectedPreviewIndex === uploadedImages.length - 1}
                  onClick={() => {
                    setSelectedPreviewIndex((p) => Math.min(uploadedImages.length - 1, p + 1));
                    setPreviewRotateDeg(0);
                  }}
                  className="p-1 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                  title="Następne zdjęcie"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <Eye className="w-3.5 h-3.5 text-yellow-400 ml-1" />
                <span className="text-slate-200 font-bold">
                  Ujęcie <strong className="text-yellow-400">#{selectedPreviewIndex + 1}</strong> / {uploadedImages.length}
                </span>
                {selectedPreviewIndex === 0 && (
                  <span className="bg-yellow-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded">
                    ★ Okładka WMS
                  </span>
                )}
              </div>

              {/* NARZĘDZIA PODGLĄDU: OBRÓĆ, FILTR OCR, WYBÓR AI, LUPA */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleSelectForAnalysis(selectedPreviewIndex)}
                  className={`px-2 py-0.5 rounded border text-[10px] flex items-center gap-1 transition cursor-pointer ${
                    selectedForAnalysis.includes(selectedPreviewIndex)
                      ? "bg-yellow-400/20 border-yellow-400 text-yellow-300 font-bold shadow-xs"
                      : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
                  }`}
                  title="Włącz lub wyłącz to zdjęcie z analizy Gemini Vision AI"
                >
                  {selectedForAnalysis.includes(selectedPreviewIndex) ? (
                    <>
                      <CheckSquare className="w-3 h-3 text-yellow-400" />
                      <span>W analizie AI</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-3 h-3" />
                      <span>Pomiń w AI</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onAnalyze([uploadedImages[selectedPreviewIndex]])}
                  disabled={isAnalyzing}
                  className="px-2 py-0.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-[10px] font-bold rounded border border-yellow-400 flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                  title="Przeanalizuj natychmiast tylko to jedno ujęcie przez Gemini Vision"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Tylko to ujęcie</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewRotateDeg((prev) => (prev + 90) % 360)}
                  className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] rounded border border-slate-700 flex items-center gap-1 transition cursor-pointer"
                  title="Obróć ujęcie o 90 stopni"
                >
                  <RotateCw className="w-3 h-3 text-yellow-400" /> Obróć {previewRotateDeg ? `(${previewRotateDeg}°)` : ""}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOcrFilterActive((prev) => !prev)}
                  className={`px-2 py-0.5 text-[10px] rounded border flex items-center gap-1 transition cursor-pointer ${
                    isOcrFilterActive
                      ? "bg-amber-500/20 text-amber-300 border-amber-400 font-bold"
                      : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700"
                  }`}
                  title="Włącz filtr czarno-biały o wysokim kontraście ułatwiający czytanie napisów markerem"
                >
                  <Scan className="w-3 h-3 text-teal-400" /> Filtr OCR {isOcrFilterActive ? "WŁ" : ""}
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxIndex(selectedPreviewIndex)}
                  className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-yellow-400 text-[10px] rounded border border-slate-700 flex items-center gap-1 transition cursor-pointer"
                  title="Otwórz pełny podgląd w powiększeniu (Lightbox HD)"
                >
                  <Maximize2 className="w-3 h-3" /> Pełny ekran
                </button>
              </div>
            </div>

            {/* DUŻA KARTA ZDJĘCIA Z NAKŁADKĄ DANYCH OCR */}
            <div className="relative w-full h-44 sm:h-52 bg-black/90 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center group">
              {imageErrorMap[selectedPreviewIndex] ? (
                <div className="flex flex-col items-center justify-center text-center p-4 text-slate-400 space-y-1">
                  <ImageIcon className="w-8 h-8 text-slate-600" />
                  <span className="text-xs font-bold text-slate-300">Podgląd ujęcia #{selectedPreviewIndex + 1}</span>
                  <span className="text-[10px] text-slate-500">Zdjęcie wczytane w buforze WMS</span>
                </div>
              ) : (
                <img
                  src={uploadedImages[selectedPreviewIndex]}
                  alt={`Podgląd ujęcia ${selectedPreviewIndex + 1}`}
                  referrerPolicy="no-referrer"
                  onError={() => setImageErrorMap((prev) => ({ ...prev, [selectedPreviewIndex]: true }))}
                  style={{
                    transform: `rotate(${previewRotateDeg}deg)`,
                    filter: isOcrFilterActive ? "grayscale(100%) contrast(240%) brightness(110%)" : "none",
                    transition: "transform 0.2s ease, filter 0.2s ease",
                  }}
                  className="max-h-full max-w-full object-contain cursor-pointer"
                  onClick={() => setLightboxIndex(selectedPreviewIndex)}
                  title="Kliknij, aby otworzyć pełne zbliżenie HD"
                />
              )}

              {/* NAKŁADKA BADGE: SYGNATURA I ODCZYT ZE ZDJĘCIA */}
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                <span className="bg-black/85 text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded border border-yellow-400/40 shadow-md flex items-center gap-1">
                  <Tag className="w-2.5 h-2.5" /> Sygnatura: {formData.ocr_wyniki?.numer_magazynowy || "MAG 14"}
                </span>
                {formData.ocr_wyniki?.napisy_markerem && (
                  <span className="bg-black/85 text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded border border-teal-500/40 shadow-md">
                    Marker OCR: {formData.ocr_wyniki.napisy_markerem}
                  </span>
                )}
              </div>

              {/* SZYBKI PRZYCISK URUCHOMIENIA OCR DLA TEGO ZDJĘCIA */}
              <div className="absolute bottom-2 right-2">
                <button
                  type="button"
                  onClick={() => handleRunOcr(selectedPreviewIndex)}
                  disabled={isScanningOcr}
                  className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 px-2.5 py-1 rounded-md text-[10px] font-bold shadow-lg flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  title="Wykonaj analizę OCR tego konkretnego ujęcia"
                >
                  {isScanningOcr ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  <span>{isScanningOcr ? "Skanowanie OCR..." : "Skanuj OCR to ujęcie"}</span>
                </button>
              </div>
            </div>

            {/* PASEK PRZEŁĄCZANIA MINIATUREK */}
            <div className="flex items-center justify-between gap-1 overflow-x-auto pt-1 pb-0.5">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {uploadedImages.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setSelectedPreviewIndex(i);
                      setPreviewRotateDeg(0);
                    }}
                    className={`relative w-11 h-9 rounded overflow-hidden border-2 shrink-0 transition cursor-pointer ${
                      selectedPreviewIndex === i
                        ? "border-yellow-400 ring-1 ring-yellow-400/40 scale-105"
                        : "border-slate-700 opacity-70 hover:opacity-100"
                    }`}
                    title={`Przełącz na ujęcie #${i + 1}`}
                  >
                    <img
                      src={img}
                      alt={`Miniaturka ${i + 1}`}
                      referrerPolicy="no-referrer"
                      onError={() => setImageErrorMap((prev) => ({ ...prev, [i]: true }))}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-black/80 text-[7px] text-center text-slate-300 font-bold">
                      {i === 0 ? "★ TOP" : `#${i + 1}`}
                    </div>
                  </button>
                ))}
              </div>
              <span className="text-[9px] text-slate-400 uppercase tracking-wider shrink-0 ml-2">
                Kliknij ujęcie, aby zbadać
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-[#030712] p-3 rounded-lg border border-slate-800 text-center font-mono text-xs text-slate-400">
            Załącz ujęcie części z lewej strony, aby aktywować podgląd i moduł OCR.
          </div>
        )}

        {/* DEDYKOWANY MODUŁ ODCZYTU OCR ZE ZDJĘCIA & ZARZĄDZANIA SYGNATURĄ WMS */}
        <div className="p-3 bg-[#030712] rounded-xl border border-yellow-400/30 space-y-2.5 font-mono shadow-inner">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2 gap-2">
            <div className="flex items-center gap-1.5">
              <Scan className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">
                Moduł OCR & Sygnatura WMS (Lokalizacja Regałowa)
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleRunOcr(selectedPreviewIndex)}
              disabled={isScanningOcr || uploadedImages.length === 0}
              className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-[11px] px-2.5 py-1 rounded flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              title="Uruchom skanowanie OCR ujęcia pod kątem napisów markerem, etykiet i sygnatury"
            >
              {isScanningOcr ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{isScanningOcr ? "Rozpoznawanie OCR..." : "Uruchom Szybki OCR ze zdjęcia"}</span>
            </button>
          </div>

          {/* OCR STATUS FEEDBACK */}
          {ocrFeedback && (
            <div className="text-[11px] text-teal-300 bg-teal-950/40 border border-teal-800/60 p-2 rounded flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                {ocrFeedback}
              </span>
              <button
                type="button"
                onClick={handleAppendOcrToDescription}
                className="text-[10px] text-yellow-300 hover:underline shrink-0 font-bold"
                title="Dopisz odczytany tekst OCR do opisu technicznego"
              >
                + Wstaw do opisu
              </button>
            </div>
          )}

          {/* SIATKA PÓL: SYGNATURA WMS ORAZ NAPISY MARKEREM */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* 1. SYGNATURA WMS / REGAŁ */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-yellow-400 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-yellow-400" /> Sygnatura WMS / Regał (SKU)
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleGenerateNewSygnatura}
                    className="text-[10px] text-slate-300 hover:text-white bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700"
                    title="Wygeneruj kolejną unikalną sygnaturę stacji (np. MAG 15)"
                  >
                    + Nowa
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopySygnatura()}
                    className="text-[10px] text-yellow-400 hover:text-yellow-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 flex items-center gap-0.5"
                    title="Kopiuj sygnaturę"
                  >
                    {copiedSygnatura ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />} Kopiuj
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={formData.ocr_wyniki?.numer_magazynowy || ""}
                onChange={(e) => handleSygnaturaChange(e.target.value)}
                placeholder="np. MAG 14"
                className="w-full bg-black border border-yellow-400/50 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-yellow-400 focus:outline-none focus:border-yellow-300 focus:ring-1 focus:ring-yellow-400 transition"
              />
              {/* SZYBKIE REGAŁY STACJI KONESER */}
              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                <span className="text-[9px] text-slate-500">Szybki regał:</span>
                {["MAG 14", "MAG 08", "MAG 03", "MAG 24", "MAG 50", "PÓŁKA A"].map((sig) => (
                  <button
                    key={sig}
                    type="button"
                    onClick={() => handleSygnaturaChange(sig)}
                    className={`text-[9px] px-1.5 py-0.2 rounded border transition cursor-pointer ${
                      formData.ocr_wyniki?.numer_magazynowy === sig
                        ? "bg-yellow-400 text-slate-950 border-yellow-400 font-bold"
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    {sig}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. NAPISY MARKEREM / ODCZYT ZE ZDJĘCIA */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-teal-300 flex items-center gap-1">
                  <Scan className="w-3 h-3 text-teal-400" /> Napisy markerem / Etykieta (OCR)
                </label>
                <button
                  type="button"
                  onClick={handleAppendOcrToDescription}
                  className="text-[10px] text-teal-400 hover:underline"
                  title="Dopisz napis markerem do opisu"
                >
                  Do opisu →
                </button>
              </div>
              <input
                type="text"
                value={formData.ocr_wyniki?.napisy_markerem || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    ocr_wyniki: {
                      ...(prev.ocr_wyniki || { numer_magazynowy: "MAG 14" }),
                      napisy_markerem: e.target.value,
                    },
                  }))
                }
                placeholder="np. ALT 140A VAG / LT FABIA"
                className="w-full bg-black border border-teal-500/50 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-teal-300 focus:outline-none focus:border-teal-300 transition"
              />
              <span className="text-[9px] text-slate-500 block">
                Odczyt z oznaczeń fizycznych na części lub ujęciu detalu.
              </span>
            </div>
          </div>
        </div>

        {/* POLA FORMULARZA KARTY MAGAZYNOWEJ */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Marka pojazdu</label>
              <input
                type="text"
                value={formData.samochod?.marka || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    samochod: {
                      marka: e.target.value,
                      model: prev.samochod?.model || "",
                      rocznik: prev.samochod?.rocznik || "",
                    },
                  }))
                }
                placeholder="np. Skoda"
                className="w-full bg-[#030712] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-teal-400 transition"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Model pojazdu</label>
              <input
                type="text"
                value={formData.samochod?.model || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    samochod: {
                      marka: prev.samochod?.marka || "",
                      model: e.target.value,
                      rocznik: prev.samochod?.rocznik || "",
                    },
                  }))
                }
                placeholder="np. Fabia I (6Y)"
                className="w-full bg-[#030712] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-teal-400 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Rocznik / Lata produkcji</label>
              <input
                type="text"
                value={formData.samochod?.rocznik || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    samochod: {
                      marka: prev.samochod?.marka || "",
                      model: prev.samochod?.model || "",
                      rocznik: e.target.value,
                    },
                  }))
                }
                placeholder="np. 1999 - 2007"
                className="w-full bg-[#030712] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-400 transition"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Strona / Pozycja montażu</label>
              <input
                type="text"
                value={formData.pozycja_czesci || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, pozycja_czesci: e.target.value }))}
                placeholder="np. Tył, strona lewa (kierowca)"
                className="w-full bg-[#030712] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-400 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Kategoria części</label>
              <input
                type="text"
                value={formData.kategoria || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, kategoria: e.target.value }))}
                placeholder="np. Lampa tylna lewa"
                className="w-full bg-[#030712] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-teal-400 transition"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-300">Numery OEM / Numery części</label>
                <button
                  type="button"
                  onClick={() => {
                    setCatalogInitialQuery(formData.numery_czesci || "");
                    setCatalogInitialType("oem");
                    setIsCatalogModalOpen(true);
                  }}
                  className="text-[10px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 font-bold hover:underline cursor-pointer"
                  title="Wyszukaj w katalogu części TecDoc / autokey.pl (krosy OEM, kompatybilność)"
                >
                  <Database className="w-3 h-3 text-amber-400" />
                  <span>Katalog TecDoc / autokey</span>
                </button>
              </div>
              <input
                type="text"
                value={formData.numery_czesci || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, numery_czesci: e.target.value }))}
                placeholder="np. 6Y6945111"
                className="w-full bg-[#030712] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-teal-400 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1 font-mono">
                  <Tag className="w-3 h-3 text-yellow-400" /> Sygnatura (Regał)
                </label>
                <button
                  type="button"
                  onClick={() => handleCopySygnatura()}
                  className="text-[10px] text-yellow-400 hover:underline flex items-center gap-0.5"
                  title="Kopiuj sygnaturę"
                >
                  {copiedSygnatura ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                </button>
              </div>
              <input
                type="text"
                value={formData.ocr_wyniki?.numer_magazynowy || ""}
                onChange={(e) => handleSygnaturaChange(e.target.value)}
                placeholder="MAG 14"
                className="w-full bg-[#030712] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-yellow-400 focus:outline-none focus:border-teal-400 transition"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1 font-mono">
                Stan (Ilość szt.)
              </label>
              <input
                type="number"
                min="0"
                value={formData.ilosc ?? 1}
                onChange={(e) => {
                  const val = Math.max(0, parseInt(e.target.value) || 0);
                  setFormData((prev) => ({ ...prev, ilosc: val }));
                }}
                className="w-full bg-[#030712] border border-slate-800 rounded-lg px-2.5 py-1.5 font-bold text-yellow-300 text-xs focus:outline-none focus:border-teal-400 font-mono transition"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Cena Brutto (PLN)</label>
              <input
                type="number"
                value={formData.cena?.brutto || ""}
                onChange={(e) => handleBruttoChange(e.target.value)}
                placeholder="0"
                className="w-full bg-[#030712] border border-slate-800 rounded-lg px-2.5 py-1.5 font-bold text-emerald-400 text-xs focus:outline-none focus:border-teal-400 font-mono transition"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Cena Netto (PLN)</label>
              <div className="w-full bg-[#030712]/70 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-400 font-mono">
                {formData.cena?.netto || 0} PLN
              </div>
            </div>
          </div>

          {/* PANEL SUGESTII CENOWYCH Z BAZY OFERT ALLEGRO */}
          <div className="p-3 bg-[#030712] rounded-xl border border-orange-500/30 space-y-2 font-mono">
            <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-800/80 pb-1.5">
              <span className="text-[11px] font-bold text-orange-400 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-orange-400" />
                Sugerowane Ceny Rynkowe Allegro dla: <span className="text-white underline">{marketEstimate.category}</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">
                  Popyt: <strong className="text-emerald-400">{marketEstimate.demandLevel}</strong>
                </span>
                <span className="text-[10px] bg-slate-900 text-slate-300 px-1.5 py-0.5 rounded border border-slate-800">
                  {marketEstimate.confidence} zgodność
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => applySuggestedPrice(marketEstimate.minPrice)}
                className={`p-2 rounded-lg border text-left transition cursor-pointer flex flex-col ${
                  formData.cena?.brutto === marketEstimate.minPrice
                    ? "bg-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400/40 shadow-sm"
                    : "bg-slate-900/80 border-slate-800 hover:border-amber-400/60 text-slate-300"
                }`}
                title="Kliknij, aby ustawić cenę okazyjną (szybka sprzedaż)"
              >
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-sans">
                  Okazja / Min
                </span>
                <span className="text-xs font-bold text-amber-300 mt-0.5">
                  {marketEstimate.minPrice} PLN
                </span>
              </button>

              <button
                type="button"
                onClick={() => applySuggestedPrice(marketEstimate.avgPrice)}
                className={`p-2 rounded-lg border text-left transition cursor-pointer flex flex-col ${
                  formData.cena?.brutto === marketEstimate.avgPrice
                    ? "bg-orange-500/20 border-orange-400 text-orange-300 ring-1 ring-orange-400/40 shadow-sm"
                    : "bg-slate-900/80 border-slate-800 hover:border-orange-400/60 text-slate-300"
                }`}
                title="Kliknij, aby ustawić rekomendowaną średnią cenę rynkową Allegro"
              >
                <span className="text-[9px] uppercase tracking-wider text-orange-400 block font-sans flex items-center gap-1">
                  <Star className="w-2.5 h-2.5 fill-orange-400" /> Średnia Allegro
                </span>
                <span className="text-xs font-bold text-orange-300 mt-0.5">
                  {marketEstimate.avgPrice} PLN
                </span>
              </button>

              <button
                type="button"
                onClick={() => applySuggestedPrice(marketEstimate.maxPrice)}
                className={`p-2 rounded-lg border text-left transition cursor-pointer flex flex-col ${
                  formData.cena?.brutto === marketEstimate.maxPrice
                    ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400/40 shadow-sm"
                    : "bg-slate-900/80 border-slate-800 hover:border-emerald-400/60 text-slate-300"
                }`}
                title="Kliknij, aby ustawić cenę maksymalną (stan perfekcyjny OE / rarytas)"
              >
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-sans">
                  Max / Stan OE
                </span>
                <span className="text-xs font-bold text-emerald-300 mt-0.5">
                  {marketEstimate.maxPrice} PLN
                </span>
              </button>
            </div>

            <p className="text-[10px] text-slate-400 leading-tight">
              {marketEstimate.notes}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-300 font-mono">
                Opis Techniczny (GVO / GPSR UE 2023/988)
              </label>
              <button
                type="button"
                onClick={toggleDictateDescription}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 transition cursor-pointer border ${
                  isDictatingDescription
                    ? "bg-red-500 text-white border-red-400 animate-pulse"
                    : "bg-slate-900 hover:bg-slate-800 text-amber-300 border-amber-400/30"
                }`}
                title="Podyktuj słownie opis części z mikrofonu"
              >
                {isDictatingDescription ? (
                  <>
                    <MicOff className="w-3 h-3 text-white" />
                    <span>Zatrzymaj dyktowanie...</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3 h-3 text-amber-400" />
                    <span>Dyktuj opis (Głos)</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={2}
              value={formData.opis || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, opis: e.target.value }))}
              placeholder="Szczegółowy opis techniczny części z demontażu w Mysłakowicach..."
              className="w-full bg-[#030712] border border-slate-800 rounded-lg p-2.5 text-xs text-white leading-relaxed focus:outline-none focus:border-teal-400 transition font-sans"
            />
          </div>

          {/* PRZYCISK ZATWIERDZENIA W WMS (TURKUSOWY) */}
          <button
            onClick={onSaveToWarehouse}
            disabled={isSaving}
            className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-lg transition cursor-pointer shadow-xs flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50 font-mono"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <Check className="w-4 h-4 stroke-[3]" />
            )}
            <span>Zatwierdź i dodaj do magazynu WMS (Cloud Sync)</span>
          </button>

          {/* PASEK AKCJI ALLEGRO CSV & INTEGRACJI */}
          <div className="pt-2.5 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-orange-400 font-bold flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-orange-400" />
                Allegro Masowy CSV & Instrukcje
              </span>
              <button
                type="button"
                onClick={() => setIsGuideModalOpen(true)}
                className="text-teal-400 hover:text-teal-300 flex items-center gap-1 cursor-pointer transition text-[10px] font-bold"
              >
                <HelpCircle className="w-3 h-3 text-teal-400" /> Przewodnik Allegro / ShopGold / BaseLinker
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleQuickAddToCsvQueue}
                className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-orange-400 border border-orange-500/40 hover:border-orange-500 font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer font-mono active:scale-[0.99]"
                title="Dodaj tę część do kolejki do masowego wystawienia w Allegro"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Dodaj do Kolejki CSV ({csvQueueCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCsvModalOpen(true)}
                className="py-2 px-3 bg-orange-500 hover:bg-orange-400 text-slate-950 font-black text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer font-mono shadow-sm active:scale-[0.99]"
                title="Otwórz generator i pobierz plik import-and-list-csv-template-polish-version.csv"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Pobierz plik Allegro .CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* LIGHTBOX MODAL DLA PEŁNEGO PODGLĄDU ZDJĘCIA W SKANERZE */}
      {lightboxIndex !== null && uploadedImages[lightboxIndex] && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 animate-in fade-in duration-200 font-mono">
          {/* GÓRNY PASEK LIGHTBOX */}
          <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 font-bold text-xs bg-yellow-400/10 px-2.5 py-1 rounded border border-yellow-400/30">
                Zdjęcie {lightboxIndex + 1} z {uploadedImages.length}
              </span>
              {lightboxIndex === 0 ? (
                <span className="text-slate-950 font-bold text-xs bg-yellow-400 px-2 py-1 rounded flex items-center gap-1">
                  <Star className="w-3 h-3 fill-slate-950" /> Główne zdjęcie WMS
                </span>
              ) : (
                <button
                  onClick={() => handleMakePrimary(lightboxIndex)}
                  className="px-2.5 py-1 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5" /> Ustaw jako główne
                </button>
              )}
              {/* SYGNATURA BADGE W PODGLĄDZIE */}
              <span className="text-yellow-400 text-xs bg-black/70 px-2.5 py-1 rounded border border-yellow-400/40 flex items-center gap-1">
                <Tag className="w-3 h-3 text-yellow-400" /> Sygnatura: {formData.ocr_wyniki?.numer_magazynowy || "MAG 14"}
              </span>
            </div>

            {/* NARZĘDZIA KONTROLI PODGLĄDU: ZOOM, OBRÓĆ, FILTR OCR, SKANUJ */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800 p-0.5">
                <button
                  onClick={() => setLightboxZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded"
                  title="Oddal (Zoom -)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setLightboxZoom(1);
                    setLightboxRotate(0);
                  }}
                  className="px-2 text-[10px] font-bold text-yellow-400 hover:text-yellow-300"
                  title="Zresetuj powiększenie i obrót"
                >
                  {Math.round(lightboxZoom * 100)}%
                </button>
                <button
                  onClick={() => setLightboxZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded"
                  title="Przybliż (Zoom +)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setLightboxRotate((r) => (r + 90) % 360)}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs rounded-lg border border-slate-800 flex items-center gap-1 transition"
                title="Obróć o 90°"
              >
                <RotateCw className="w-3.5 h-3.5 text-yellow-400" /> Obróć {lightboxRotate ? `(${lightboxRotate}°)` : ""}
              </button>

              <button
                onClick={() => setIsOcrFilterActive((f) => !f)}
                className={`px-2.5 py-1.5 text-xs rounded-lg border flex items-center gap-1 transition ${
                  isOcrFilterActive
                    ? "bg-amber-500/20 text-amber-300 border-amber-400 font-bold"
                    : "bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800"
                }`}
                title="Włącz/wyłącz filtr wysokiego kontrastu ułatwiający czytanie odręcznych napisów"
              >
                <Scan className="w-3.5 h-3.5 text-teal-400" /> Filtr OCR {isOcrFilterActive ? "WŁ" : ""}
              </button>

              <button
                onClick={() => handleRunOcr(lightboxIndex)}
                disabled={isScanningOcr}
                className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Uruchom skanowanie OCR dla tego widoku"
              >
                {isScanningOcr ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{isScanningOcr ? "Skanowanie..." : "Odczytaj OCR"}</span>
              </button>

              <button
                onClick={() => {
                  setLightboxIndex(null);
                  setLightboxZoom(1);
                  setLightboxRotate(0);
                }}
                className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 transition cursor-pointer"
                title="Zamknij podgląd (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* GŁÓWNY WIDOK ZDJĘCIA */}
          <div className="relative flex-1 flex items-center justify-center my-3 max-h-[72vh] overflow-hidden">
            {imageErrorMap[lightboxIndex] ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-900 rounded-xl border border-slate-800">
                <ImageIcon className="w-12 h-12 text-slate-600 mb-2" />
                <span className="text-sm font-bold text-white">Podgląd ujęcia #{lightboxIndex + 1}</span>
                <span className="text-xs text-slate-400 mt-1">Ujęcie załączone w buforze pamięci stacji demontażu.</span>
              </div>
            ) : (
              <img
                src={uploadedImages[lightboxIndex]}
                alt={`Zdjęcie ${lightboxIndex + 1}`}
                referrerPolicy="no-referrer"
                onError={() => setImageErrorMap((prev) => ({ ...prev, [lightboxIndex]: true }))}
                style={{
                  transform: `scale(${lightboxZoom}) rotate(${lightboxRotate}deg)`,
                  filter: isOcrFilterActive ? "grayscale(100%) contrast(240%) brightness(110%)" : "none",
                  transition: "transform 0.2s ease, filter 0.2s ease",
                }}
                className="max-h-full max-w-full object-contain rounded-lg shadow-2xl border border-slate-800"
              />
            )}

            {/* STRZAŁKI NAWIGACJI */}
            {uploadedImages.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setLightboxIndex((prev) =>
                      prev === null || prev === 0 ? uploadedImages.length - 1 : prev - 1
                    )
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-3 bg-black/70 hover:bg-black text-white rounded-full border border-slate-700 transition cursor-pointer"
                  title="Poprzednie zdjęcie (Strzałka w lewo)"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() =>
                    setLightboxIndex((prev) =>
                      prev === null || prev === uploadedImages.length - 1 ? 0 : prev + 1
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-black/70 hover:bg-black text-white rounded-full border border-slate-700 transition cursor-pointer"
                  title="Następne zdjęcie (Strzałka w prawo)"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* DOLNY PASEK MINIATUREK */}
          <div className="flex items-center justify-center gap-2 overflow-x-auto border-t border-slate-800 pt-3">
            {uploadedImages.map((img, i) => (
              <button
                key={i}
                onClick={() => setLightboxIndex(i)}
                className={`w-14 h-12 rounded-lg overflow-hidden border-2 transition cursor-pointer shrink-0 ${
                  lightboxIndex === i
                    ? "border-yellow-400 ring-2 ring-yellow-400/20 shadow-md"
                    : "border-slate-800 opacity-60 hover:opacity-100"
                }`}
              >
                <img src={img} alt={`Miniaturka ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TOAST POWIADOMIENIE */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-950 border border-orange-500/50 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-mono animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MODAL GENERATORA I KOLEJKI ALLEGRO CSV */}
      <ScannerAllegroCsvModal
        isOpen={isCsvModalOpen}
        onClose={() => {
          setIsCsvModalOpen(false);
          updateQueueCount();
        }}
        currentFormData={formData}
        currentImages={uploadedImages}
        onAddToQueueAndClear={() => {
          updateQueueCount();
          showToast("Część dodana do kolejki Allegro CSV!");
        }}
      />

      {/* PRZEWODNIK KONFIGURACJI INTEGRACJI */}
      <IntegrationGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />

      {/* MODAL KATALOGU CZĘŚCI SAMOCHODOWYCH (TECDOC / AUTOKEY.PL) */}
      <CarPartsCatalogModal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
        initialQuery={catalogInitialQuery}
        initialType={catalogInitialType}
        onApplyToScanner={(data) => {
          setFormData((prev) => ({
            ...prev,
            ...data,
          }));
          showToast("Zastosowano specyfikację z katalogu części w WMS!");
        }}
      />
    </div>
  );
};
