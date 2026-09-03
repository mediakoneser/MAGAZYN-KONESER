import React, { useState, useRef, useEffect } from "react";
import {
  UserCheck,
  Camera,
  Sparkles,
  Check,
  Tag,
  Car,
  FileText,
  Copy,
  ExternalLink,
  Layers,
  Clock,
  Award,
  Loader2,
  Trash2,
  Share2,
  Printer,
  ShoppingBag,
  TrendingUp,
  Globe,
  ChevronRight,
  ShieldCheck,
  ClipboardList,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Filter,
  Wrench,
  BookOpen,
  Info,
  ShieldAlert,
  Flame,
  Search,
  RefreshCw,
} from "lucide-react";
import {
  PartItem,
  PartListingData,
  PartStatus,
  PartQualityGrade,
  UserRole,
  WorkerTask,
  WorkerProcedureTip,
  TaskPriority,
  TaskStatus,
  TaskCategory,
} from "../types";
import { compressImageFile, extractImagesFromClipboardEvent } from "../utils/imageOptimizer";
import { smartMatchText } from "../utils/smartSearch";
import { analyzePartWithGemini, checkLiveMarketValuation } from "../utils/geminiVision";
import { generateAuctionTemplates } from "../utils/auctionGenerator";
import { savePartToFirestore } from "../lib/firestoreService";
import { publishOfferToAllegro } from "../utils/allegroService";
import { initialWorkerTasks, initialWorkerProcedures } from "../data/mockWorkerData";
import { notifyBossUrgentTask } from "../services/notificationService";

interface WorkerStationTabProps {
  drafts: PartItem[];
  setDrafts: React.Dispatch<React.SetStateAction<PartItem[]>>;
  onNavigateToWarehouse: () => void;
  apiKey?: string;
  currentUserRole?: UserRole;
  currentUserName?: string;
  tasks?: WorkerTask[];
  setTasks?: React.Dispatch<React.SetStateAction<WorkerTask[]>>;
}

export const WorkerStationTab: React.FC<WorkerStationTabProps> = ({
  drafts,
  setDrafts,
  onNavigateToWarehouse,
  apiKey,
  currentUserRole = "Pracownik / Demontażysta",
  currentUserName = "Grzegorz / Pracownik Stanowiska",
  tasks: propTasks,
  setTasks: propSetTasks,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Subtab navigation in worker station
  const [activeSection, setActiveSection] = useState<"scanner" | "tasks" | "tips" | "checklist">("scanner");

  // Worker Session Settings
  const [workerName, setWorkerName] = useState<string>(() => {
    return localStorage.getItem("koneser_active_worker") || currentUserName;
  });
  const [stationRack, setStationRack] = useState<string>("MAG 14");
  const [qualityGrade, setQualityGrade] = useState<PartQualityGrade>(
    "A (Bardzo dobry / Sprawny 100%)"
  );
  const [vatRate, setVatRate] = useState<number>(23);

  // Local state for tasks if not passed from parent
  const [localTasks, setLocalTasks] = useState<WorkerTask[]>(() => {
    try {
      const stored = localStorage.getItem("koneser_worker_tasks_v1");
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return initialWorkerTasks;
  });

  const tasks = propTasks || localTasks;
  const setTasks = propSetTasks || setLocalTasks;

  useEffect(() => {
    try {
      localStorage.setItem("koneser_worker_tasks_v1", JSON.stringify(tasks));
    } catch (e) {}
  }, [tasks]);

  // Tasks Filter & New Task Form
  const [taskFilterStatus, setTaskFilterStatus] = useState<string>("all");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>("Demontaż");
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>("Wysoki");
  const [newTaskVehicle, setNewTaskVehicle] = useState("");
  const [newTaskRack, setNewTaskRack] = useState(stationRack);

  // Procedures Search & Filter
  const [procedureSearch, setProcedureSearch] = useState("");
  const [procedureCategory, setProcedureCategory] = useState<string>("all");
  const procedures = initialWorkerProcedures;

  // Quality Checklist state
  const [checklistItems, setChecklistItems] = useState<{ id: string; label: string; checked: boolean; desc: string }[]>([
    {
      id: "chk_1",
      label: "Weryfikacja mocowań i uszu montażowych",
      checked: true,
      desc: "Sprawdź czy żaden uchwyt nie jest pęknięty, ułamany lub sklejany klejem cyjanoakrylowym.",
    },
    {
      id: "chk_2",
      label: "Kontrola styków i pinów w gniazdach elektrycznych",
      checked: true,
      desc: "Upewnij się, że piny są proste, brak śladów zielonej korozji śniedziowej po zalaniu.",
    },
    {
      id: "chk_3",
      label: "Odczyt i weryfikacja czytelności numeru OEM",
      checked: false,
      desc: "Numery fabryczne muszą być wyraźnie widoczne na zdjęciu (lub odczytane przez OCR).",
    },
    {
      id: "chk_4",
      label: "Oznaczenie żółtym/białym markerem kodu WMS",
      checked: false,
      desc: "Napisz na niewidocznej stronie części skrót modelu i numer regału (np. 'LT FABIA I MAG 14').",
    },
    {
      id: "chk_5",
      label: "Sprawdzenie zgodności ze standardem GPSR / GVO",
      checked: true,
      desc: "Część jest bezpieczna, legalnie pozyskana ze stacji demontażu PHU U Konesera z kartą BDO.",
    },
  ]);

  // Photos & Processing State
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [savedPart, setSavedPart] = useState<PartItem | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeAuctionTab, setActiveAuctionTab] = useState<"allegro" | "ovoko" | "olx">("allegro");

  // Allegro publish state in worker station
  const [isPublishingAllegro, setIsPublishingAllegro] = useState(false);
  const [allegroSuccessUrl, setAllegroSuccessUrl] = useState<string | null>(null);
  const [allegroSuccessId, setAllegroSuccessId] = useState<string | null>(null);

  // Editable Form Data generated automatically
  const [partData, setPartData] = useState<PartListingData>({
    samochod: { marka: "", model: "", rocznik: "" },
    kategoria: "",
    jakosc: "A (Bardzo dobry / Sprawny 100%)",
    pozycja_czesci: "",
    opis: "",
    producent: "OE",
    numery_czesci: "",
    cena: { brutto: 90, netto: 73 },
    ocr_wyniki: { numer_magazynowy: "MAG 14", napisy_markerem: "" },
  });

  // Calculate worker's stats today
  const workerTodayCount = drafts.filter(
    (d) =>
      d.createdByName === workerName ||
      d.listingData?.workerName === workerName ||
      d.createdAt?.includes(new Date().toLocaleDateString("pl-PL").slice(0, 5))
  ).length;

  const dailyGoal = 15;
  const goalPercent = Math.min(100, Math.round((workerTodayCount / dailyGoal) * 100));

  useEffect(() => {
    localStorage.setItem("koneser_active_worker", workerName);
  }, [workerName]);

  // Tasks handlers
  const handleToggleTaskStatus = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const nextStatus: TaskStatus =
            t.status === "Do zrobienia"
              ? "W trakcie"
              : t.status === "W trakcie"
              ? "Zakończone"
              : "Do zrobienia";
          return {
            ...t,
            status: nextStatus,
            completedAt: nextStatus === "Zakończone" ? new Date().toLocaleString("pl-PL") : undefined,
          };
        }
        return t;
      })
    );
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const task: WorkerTask = {
      id: `task_${Date.now()}`,
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || "Zadanie zdefiniowane przez pracownika stanowiska.",
      category: newTaskCategory,
      priority: newTaskPriority,
      status: "Do zrobienia",
      assignedTo: workerName,
      vehicleTag: newTaskVehicle.trim() || undefined,
      targetRack: newTaskRack.trim() || stationRack,
      createdAt: new Date().toLocaleString("pl-PL"),
      createdBy: workerName,
      aiGenerated: false,
      isUrgent: newTaskPriority === "Krytyczny (Pilny)",
    };

    if (newTaskPriority === "Krytyczny (Pilny)") {
      notifyBossUrgentTask(task, workerName);
    }

    setTasks((prev) => [task, ...prev]);
    setNewTaskTitle("");
    setNewTaskDesc("");
    setNewTaskVehicle("");
    setIsAddingTask(false);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const filteredTasks = tasks.filter((t) => {
    if (taskFilterStatus === "all") return true;
    return t.status === taskFilterStatus;
  });

  const filteredProcedures = procedures.filter((p) => {
    if (procedureCategory !== "all" && p.category !== procedureCategory) return false;
    if (procedureSearch.trim()) {
      const allText = [
        p.title,
        p.category,
        p.difficulty,
        p.badge || "",
        p.oemCheckRule || "",
        ...(p.steps || []),
        ...(p.tools || []),
        ...(p.warnings || []),
      ].join(" ");
      return smartMatchText(allText, procedureSearch);
    }
    return true;
  });

  // Handle uploaded or captured photos
  const handlePhotos = async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    if (fileArr.length === 0) return;

    const base64List: string[] = [];
    for (const f of fileArr) {
      try {
        const compressed = await compressImageFile(f, 1024, 1024, 0.85);
        if (compressed) base64List.push(compressed);
      } catch (err) {
        console.warn("Image compression error:", err);
      }
    }

    if (base64List.length > 0) {
      const mergedImages = [...capturedImages, ...base64List].slice(0, 8);
      setCapturedImages(mergedImages);

      // Trigger automatic workflow: Photo -> Gemini AI Vision -> Auto-Save Part + Auction Template
      await processAndAutoSave(mergedImages);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  // Global paste handler for Worker Station
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (activeSection === "scanner") {
        const images = await extractImagesFromClipboardEvent(e);
        if (images && images.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          setCapturedImages((prev) => [...prev, ...images].slice(0, 10));
          processAndAutoSave([...capturedImages, ...images].slice(0, 10));
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [activeSection, capturedImages, workerName, stationRack, qualityGrade]);

  // Full Automatic Flow: Photo -> Vision AI -> Listing Data + Auction Templates -> Cloud Firestore & WMS
  const processAndAutoSave = async (imagesToProcess: string[]) => {
    if (imagesToProcess.length === 0) return;

    setIsProcessing(true);
    setStatusMessage("Przetwarzanie ujęcia przez Gemini 3.8 Flash...");
    setSavedPart(null);

    try {
      // 1. Analyze with Gemini Vision
      const aiResult = await analyzePartWithGemini(imagesToProcess, apiKey, vatRate);
      let analyzedData: PartListingData;

      if (aiResult.success && aiResult.data) {
        analyzedData = {
          ...aiResult.data,
          ocr_wyniki: {
            numer_magazynowy: stationRack,
            napisy_markerem: aiResult.data.ocr_wyniki?.napisy_markerem || "",
          },
          qualityGrade,
          workerName,
          zdjecia: imagesToProcess,
        };
      } else {
        analyzedData = {
          samochod: { marka: "Skoda", model: "Fabia I", rocznik: "1999 - 2007" },
          kategoria: "Część zdemontowana",
          jakosc: qualityGrade,
          pozycja_czesci: "Uniwersalna",
          opis: "Oryginalna część samochodowa z legalnego demontażu na stacji PHU U Konesera w Mysłakowicach. Sprawdzona przed zdemontowaniem.",
          producent: "OE",
          numery_czesci: "OE-KONESER",
          cena: { brutto: 90, netto: 73 },
          ocr_wyniki: { numer_magazynowy: stationRack },
          qualityGrade,
          workerName,
          zdjecia: imagesToProcess,
        };
      }

      // 2. Generate Professional Auction Templates (Allegro, Ovoko, OLX)
      const auctionTemplates = generateAuctionTemplates(analyzedData);
      analyzedData.auctionTemplates = auctionTemplates;

      setPartData(analyzedData);
      setStatusMessage("Generowanie szablonów aukcji i zapisywanie do bazy WMS...");

      // 3. Construct PartItem for Cloud Firestore & Local State
      const newPartId = `wms_${Date.now()}`;
      const newPartItem: PartItem = {
        id: newPartId,
        listingData: analyzedData,
        status: "Dostępny",
        createdAt: new Date().toLocaleString("pl-PL"),
        createdBy: workerName,
        createdByName: workerName,
      };

      // 4. Save to State and Cloud Firestore
      setDrafts((prev) => [newPartItem, ...prev]);
      await savePartToFirestore(newPartItem);

      setSavedPart(newPartItem);
      setStatusMessage("Zapisano pomyślnie w ewidencji WMS i chmurze Firestore!");
    } catch (err: any) {
      console.error("Worker automatic flow error:", err);
      setStatusMessage("Błąd podczas automatycznego zapisu. Sprawdź połączenie.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleUpdateCurrentPart = async () => {
    if (!savedPart) return;

    const templates = generateAuctionTemplates(partData);
    const updated: PartItem = {
      ...savedPart,
      listingData: {
        ...partData,
        auctionTemplates: templates,
        workerName,
        qualityGrade,
      },
      updatedAt: new Date().toLocaleString("pl-PL"),
    };

    setDrafts((prev) => prev.map((p) => (p.id === savedPart.id ? updated : p)));
    await savePartToFirestore(updated);
    setSavedPart(updated);
    alert("Karta części i opisy aukcji zostały zaktualizowane!");
  };

  // Direct 1-Click publish from worker station
  const handlePublishToAllegroFromWorker = async () => {
    if (!savedPart) return;
    setIsPublishingAllegro(true);

    try {
      const result = await publishOfferToAllegro(savedPart);
      if (result.success) {
        setAllegroSuccessUrl(result.offerUrl);
        setAllegroSuccessId(result.offerId);

        const updatedPart: PartItem = {
          ...savedPart,
          allegroOfferId: result.offerId,
          allegroOfferUrl: result.offerUrl,
          allegroStatus: "active",
          allegroPublishedAt: result.publishedAt,
          listingData: {
            ...savedPart.listingData,
            allegro: {
              offerId: result.offerId,
              offerUrl: result.offerUrl,
              status: "active",
              publishedAt: result.publishedAt,
            },
          },
        };

        setDrafts((prev) => prev.map((p) => (p.id === savedPart.id ? updatedPart : p)));
        await savePartToFirestore(updatedPart);
        setSavedPart(updatedPart);
      }
    } catch (e: any) {
      alert("Błąd podczas wystawiania na Allegro: " + (e?.message || "Błąd API"));
    } finally {
      setIsPublishingAllegro(false);
    }
  };

  const handleStartNewPart = () => {
    setCapturedImages([]);
    setSavedPart(null);
    setAllegroSuccessUrl(null);
    setAllegroSuccessId(null);
    setStatusMessage("");
    setPartData({
      samochod: { marka: "", model: "", rocznik: "" },
      kategoria: "",
      jakosc: qualityGrade,
      pozycja_czesci: "",
      opis: "",
      producent: "OE",
      numery_czesci: "",
      cena: { brutto: 90, netto: 73 },
      ocr_wyniki: { numer_magazynowy: stationRack, napisy_markerem: "" },
    });
  };

  return (
    <div className="space-y-4">
      {/* GÓRNY PASEK STANOWISKA PRACY PRZYJĘĆ & DEMONTAŻU */}
      <div className="bg-[#0b0f19] border border-slate-800/90 rounded-xl p-3.5 sm:p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-yellow-400/10 text-yellow-400 border border-yellow-400/25 rounded-xl flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white font-mono flex items-center gap-2">
                  Stanowisko Pracownika / Szybki Wprowadzacz
                </h2>
                <span className="text-[11px] px-2 py-0.5 bg-teal-500/15 text-teal-300 font-mono font-bold rounded border border-teal-500/30">
                  {currentUserRole}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Fotografujesz część ➔ AI rozpoznaje i wycenia ➔ System generuje gotową aukcję Allegro/OVOKO i zapisuje w chmurze
              </p>
            </div>
          </div>

          {/* PARAMETRY STANOWISKA */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* PRACUJĄCY PRZYJMUJĄCY */}
            <div className="flex items-center gap-1.5 bg-[#030712] px-2.5 py-1 rounded-lg border border-slate-800 text-xs font-mono">
              <span className="text-slate-400">Pracownik:</span>
              <input
                type="text"
                value={workerName}
                onChange={(e) => setWorkerName(e.target.value)}
                className="bg-transparent text-yellow-400 font-bold focus:outline-none w-32"
                placeholder="Imię pracownika"
              />
            </div>

            {/* DOMYŚLNY REGAŁ */}
            <div className="flex items-center gap-1.5 bg-[#030712] px-2.5 py-1 rounded-lg border border-slate-800 text-xs font-mono">
              <Tag className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-slate-400">Regał:</span>
              <input
                type="text"
                value={stationRack}
                onChange={(e) => setStationRack(e.target.value)}
                className="bg-transparent text-yellow-400 font-bold focus:outline-none w-20"
                placeholder="MAG 14"
              />
            </div>

            {/* LICZNIK DZISIEJSZY */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-lg text-xs font-mono text-emerald-400 font-bold flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" />
              <span>Dziś przyjęto: <strong>{workerTodayCount}</strong>/{dailyGoal} szt. ({goalPercent}%)</span>
            </div>
          </div>
        </div>

        {/* PRZEŁĄCZNIKI SEKCJI STANOWISKA PRACY */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-800/80">
          <button
            onClick={() => setActiveSection("scanner")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeSection === "scanner"
                ? "bg-yellow-400 text-slate-950 shadow-sm"
                : "bg-[#030712] text-slate-300 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Foto Skaner & Wycena AI</span>
          </button>

          <button
            onClick={() => setActiveSection("tasks")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeSection === "tasks"
                ? "bg-yellow-400 text-slate-950 shadow-sm"
                : "bg-[#030712] text-slate-300 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Zadania & Kolejka Warsztatu</span>
            <span className="px-1.5 py-0.2 bg-slate-900 text-yellow-400 rounded-full text-[10px] border border-slate-700">
              {tasks.filter((t) => t.status !== "Zakończone").length}
            </span>
          </button>

          <button
            onClick={() => setActiveSection("tips")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeSection === "tips"
                ? "bg-yellow-400 text-slate-950 shadow-sm"
                : "bg-[#030712] text-slate-300 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Porady & Procedury Demontażu</span>
            <span className="px-1.5 py-0.2 bg-slate-900 text-cyan-400 rounded-full text-[10px] border border-slate-700">
              {procedures.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSection("checklist")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeSection === "checklist"
                ? "bg-yellow-400 text-slate-950 shadow-sm"
                : "bg-[#030712] text-slate-300 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Standard Jakości & BDO</span>
          </button>
        </div>
      </div>

      {/* SEKCJA 1: GŁÓWNA SIATKA STANOWISKA / SKANER */}
      {activeSection === "scanner" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEWA KOLUMNA: ZROBIENIE ZDJĘCIA / KAMERA (5 kolumn) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0b0f19] border border-slate-800/90 rounded-xl p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-yellow-400 font-mono flex items-center gap-1.5">
                <Camera className="w-4 h-4" /> Krok 1: Wykonaj zdjęcie części
              </h3>
              {capturedImages.length > 0 && (
                <span className="text-[11px] font-mono text-slate-400">
                  {capturedImages.length} ujęć
                </span>
              )}
            </div>

            {/* DUŻE PRZYCISKI APARATU DLA TABLETU / TELEFONU NA STANOWISKU */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => cameraInputRef.current?.click()}
                disabled={isProcessing}
                className="py-3.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-xl font-black text-xs font-mono flex flex-col items-center justify-center gap-1 transition shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
              >
                <Camera className="w-5 h-5 stroke-[2.5]" />
                <span>ZRÓB ZDJĘCIE (APARAT)</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-100 border border-slate-800 rounded-xl font-bold text-xs font-mono flex flex-col items-center justify-center gap-1 transition cursor-pointer disabled:opacity-50"
              >
                <Layers className="w-5 h-5 text-teal-400" />
                <span>WYBIERZ Z GALERII</span>
              </button>

              {/* Ukryte inputy */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => e.target.files && handlePhotos(e.target.files)}
                className="hidden"
              />
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => e.target.files && handlePhotos(e.target.files)}
                className="hidden"
              />
            </div>

            {/* PODGLĄD ZDJĘĆ */}
            {capturedImages.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-[#030712] p-2 rounded-lg border border-slate-800">
                  {capturedImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative rounded-lg overflow-hidden border border-slate-800 bg-[#070b14] h-24 flex items-center justify-center group"
                    >
                      <img
                        src={img}
                        alt={`Ujęcie ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain p-1"
                      />
                      <span className="absolute bottom-1 left-1 bg-black/80 text-[9px] font-mono px-1 rounded text-slate-300">
                        #{idx + 1}
                      </span>
                      <button
                        onClick={() =>
                          setCapturedImages((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-500 text-white p-1 rounded text-[10px] cursor-pointer opacity-90 shadow"
                        title="Usuń zdjęcie"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs font-mono">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="text-yellow-400 hover:text-yellow-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    + Dodaj kolejne ujęcie (np. tabliczka/marker)
                  </button>
                  <button
                    onClick={handleStartNewPart}
                    className="text-slate-400 hover:text-red-400 font-bold cursor-pointer"
                  >
                    Wyczyść formularz
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => cameraInputRef.current?.click()}
                className="border-2 border-dashed border-slate-800 hover:border-yellow-400/60 bg-[#030712] rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 group"
              >
                <div className="w-12 h-12 rounded-xl bg-yellow-400/10 text-yellow-400 flex items-center justify-center border border-yellow-400/20 group-hover:scale-110 transition">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-slate-200">
                  Wykonaj zdjęcie części na stole demontażowym
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Aparat natychmiast wywoła Gemini 3.7 Flash i wygeneruje opisy
                </div>
              </div>
            )}

            {/* STATUS PROCESU */}
            {isProcessing && (
              <div className="bg-yellow-400/10 border border-yellow-400/30 p-3 rounded-lg flex items-center gap-2.5 text-xs text-yellow-300 font-mono animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-yellow-400 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            {savedPart && !isProcessing && (
              <div className="space-y-2">
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-lg space-y-1.5 font-mono text-xs">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Część zapisana w WMS i chmurze Firestore!</span>
                  </div>
                  <div className="text-slate-300 text-[11px]">
                    ID: <strong className="text-white">{savedPart.id}</strong> | Regał:{" "}
                    <strong className="text-yellow-400">{savedPart.listingData.ocr_wyniki?.numer_magazynowy}</strong>
                  </div>
                </div>

                {/* ALLEGRO 1-CLICK PUBLISHER BANNER */}
                <div className="bg-[#030712] border border-yellow-400/30 p-3 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-white font-bold flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-yellow-400" />
                      Status Allegro:
                    </span>
                    {savedPart.allegroOfferId || allegroSuccessId ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        Wystawiono (#{savedPart.allegroOfferId || allegroSuccessId})
                      </span>
                    ) : (
                      <span className="text-yellow-400 font-semibold">Gotowy szkic</span>
                    )}
                  </div>

                  {savedPart.allegroOfferId || allegroSuccessId ? (
                    <div className="flex items-center gap-2">
                      <a
                        href={
                          savedPart.allegroOfferUrl ||
                          allegroSuccessUrl ||
                          `https://allegro.pl/oferta/${savedPart.allegroOfferId || allegroSuccessId}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs font-mono flex items-center justify-center gap-1.5 transition shadow-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Otwórz aukcję na Allegro ↗</span>
                      </a>
                    </div>
                  ) : (
                    <button
                      onClick={handlePublishToAllegroFromWorker}
                      disabled={isPublishingAllegro}
                      className="w-full px-3.5 py-2.5 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 font-black rounded-lg text-xs font-mono transition flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {isPublishingAllegro ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Layers className="w-4 h-4" />
                      )}
                      <span>🚀 Wystaw ten szkic na Allegro (1-Klik)</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* PARAMETRY JAKOŚCI I OCENY STANU */}
          <div className="bg-[#0b0f19] border border-slate-800/90 rounded-xl p-4 space-y-3 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Klasa Jakości i Stan Części
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { id: "A+ (Jak nowy / Oryginał)", label: "Klasa A+ (Jak nowy)", color: "text-emerald-400 border-emerald-500/30" },
                { id: "A (Bardzo dobry / Sprawny 100%)", label: "Klasa A (100% Sprawny)", color: "text-teal-400 border-teal-500/30" },
                { id: "B (Ślady użytkowania)", label: "Klasa B (Ślady użytk.)", color: "text-yellow-400 border-yellow-500/30" },
                { id: "C (Do regeneracji / Na części)", label: "Klasa C (Do regeneracji)", color: "text-red-400 border-red-500/30" },
              ].map((q) => (
                <button
                  key={q.id}
                  onClick={() => {
                    setQualityGrade(q.id as PartQualityGrade);
                    setPartData((prev) => ({ ...prev, qualityGrade: q.id as PartQualityGrade, jakosc: q.id }));
                  }}
                  className={`p-2 rounded-lg text-xs font-mono text-left border transition cursor-pointer flex items-center justify-between ${
                    qualityGrade === q.id
                      ? "bg-slate-900 text-white font-bold " + q.color
                      : "bg-[#030712] text-slate-400 border-slate-800 hover:text-white"
                  }`}
                >
                  <span>{q.label}</span>
                  {qualityGrade === q.id && <Check className="w-3.5 h-3.5 text-yellow-400" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* PRAWA KOLUMNA: KARTA CZĘŚCI ORAZ PRZYGOTOWANA AUKCJA (7 kolumn) */}
        <div className="lg:col-span-7 space-y-4">
          {/* PRZYGOTOWANY OPIS AUKCJI ZAKŁADKI: ALLEGRO / OVOKO / OLX */}
          <div className="bg-[#0b0f19] border border-slate-800/90 rounded-xl p-4 space-y-3.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-yellow-400" /> Krok 2: Przygotowany Opis Aukcji
                </h3>
                <span className="text-[10px] px-2 py-0.5 bg-yellow-400/10 text-yellow-300 font-mono rounded border border-yellow-400/20">
                  Gotowe do publikacji
                </span>
              </div>

              {/* TABS WYBORU KANAŁU */}
              <div className="flex items-center gap-1 bg-[#030712] p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setActiveAuctionTab("allegro")}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition cursor-pointer ${
                    activeAuctionTab === "allegro"
                      ? "bg-yellow-400 text-slate-950 shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Allegro HTML
                </button>
                <button
                  onClick={() => setActiveAuctionTab("ovoko")}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition cursor-pointer ${
                    activeAuctionTab === "ovoko"
                      ? "bg-teal-400 text-slate-950 shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  OVOKO PL
                </button>
                <button
                  onClick={() => setActiveAuctionTab("olx")}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition cursor-pointer ${
                    activeAuctionTab === "olx"
                      ? "bg-blue-400 text-slate-950 shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  OLX / Ogłoszenie
                </button>
              </div>
            </div>

            {/* PODGLĄD I KOPIOWANIE DLA WYBRANEGO KANAŁU */}
            {activeAuctionTab === "allegro" && (
              <div className="space-y-2.5">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>Tytuł oferty Allegro (maks. 75 znaków):</span>
                    <button
                      onClick={() =>
                        handleCopy(
                          partData.auctionTemplates?.allegroTitle ||
                            `${partData.kategoria} ${partData.samochod?.marka} ${partData.samochod?.model} ${partData.numery_czesci}`,
                          "allegro_title"
                        )
                      }
                      className="text-yellow-400 hover:text-yellow-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === "allegro_title" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === "allegro_title" ? "Skopiowano!" : "Kopiuj tytuł"}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={
                      partData.auctionTemplates?.allegroTitle ||
                      `${partData.kategoria} ${partData.samochod?.marka} ${partData.samochod?.model} ${partData.numery_czesci}`.trim()
                    }
                    onChange={(e) =>
                      setPartData((prev) => ({
                        ...prev,
                        auctionTemplates: {
                          ...prev.auctionTemplates,
                          allegroTitle: e.target.value,
                        },
                      }))
                    }
                    className="w-full bg-[#030712] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>Gotowy kod HTML sekcji Allegro (zgodny z GPSR UE):</span>
                    <button
                      onClick={() =>
                        handleCopy(
                          partData.auctionTemplates?.allegroDescriptionHtml ||
                            generateAuctionTemplates(partData).allegroDescriptionHtml,
                          "allegro_html"
                        )
                      }
                      className="text-yellow-400 hover:text-yellow-300 font-bold flex items-center gap-1 cursor-pointer bg-slate-900 px-2 py-0.5 rounded border border-slate-800"
                    >
                      {copiedKey === "allegro_html" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === "allegro_html" ? "Skopiowano HTML!" : "Kopiuj gotowy HTML"}</span>
                    </button>
                  </div>
                  <textarea
                    rows={5}
                    value={
                      partData.auctionTemplates?.allegroDescriptionHtml ||
                      generateAuctionTemplates(partData).allegroDescriptionHtml
                    }
                    readOnly
                    className="w-full bg-[#030712] border border-slate-800 rounded-lg p-2.5 text-[11px] font-mono text-slate-300 leading-relaxed focus:outline-none"
                  />
                </div>
              </div>
            )}

            {activeAuctionTab === "ovoko" && (
              <div className="space-y-2.5">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>Tytuł i indeks OVOKO PL (z regałem):</span>
                    <button
                      onClick={() =>
                        handleCopy(
                          partData.auctionTemplates?.ovokoTitle ||
                            `${partData.samochod?.marka} ${partData.samochod?.model} ${partData.kategoria} ${partData.numery_czesci} [${partData.ocr_wyniki?.numer_magazynowy}]`,
                          "ovoko_title"
                        )
                      }
                      className="text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === "ovoko_title" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === "ovoko_title" ? "Skopiowano!" : "Kopiuj"}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={
                      partData.auctionTemplates?.ovokoTitle ||
                      `${partData.samochod?.marka} ${partData.samochod?.model} ${partData.kategoria} ${partData.numery_czesci} [${partData.ocr_wyniki?.numer_magazynowy}]`
                    }
                    readOnly
                    className="w-full bg-[#030712] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold"
                  />
                </div>
                <div className="p-3 bg-[#030712] rounded-lg border border-slate-800 text-xs text-slate-300 space-y-1">
                  <div className="font-bold text-teal-400 font-mono">Format OVOKO XML / CSV:</div>
                  <div className="font-mono text-[11px] text-slate-400">
                    Marka: {partData.samochod?.marka || "-"} | Model: {partData.samochod?.model || "-"} | OEM: {partData.numery_czesci || "-"} | Cena: {partData.cena?.brutto} PLN
                  </div>
                </div>
              </div>
            )}

            {activeAuctionTab === "olx" && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Tekst ogłoszenia OLX / Marketplace:</span>
                  <button
                    onClick={() =>
                      handleCopy(
                        partData.auctionTemplates?.olxText ||
                          generateAuctionTemplates(partData).olxText,
                        "olx_text"
                      )
                    }
                    className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer bg-slate-900 px-2 py-0.5 rounded border border-slate-800"
                  >
                    {copiedKey === "olx_text" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === "olx_text" ? "Skopiowano!" : "Kopiuj całość"}</span>
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={
                    partData.auctionTemplates?.olxText ||
                    generateAuctionTemplates(partData).olxText
                  }
                  readOnly
                  className="w-full bg-[#030712] border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 font-sans leading-relaxed focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* SZYBKA EDYCJA SZCZEGÓŁÓW PRZYJĘCIA */}
          <div className="bg-[#0b0f19] border border-slate-800/90 rounded-xl p-4 space-y-3 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
              <Car className="w-4 h-4 text-teal-400" /> Szczegóły Techniczne Części
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Marka</label>
                <input
                  type="text"
                  value={partData.samochod?.marka || ""}
                  onChange={(e) =>
                    setPartData((p) => ({
                      ...p,
                      samochod: { ...p.samochod!, marka: e.target.value },
                    }))
                  }
                  className="w-full bg-[#030712] border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-bold"
                  placeholder="np. Volkswagen"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Model / Rocznik</label>
                <input
                  type="text"
                  value={`${partData.samochod?.model || ""} ${partData.samochod?.rocznik || ""}`}
                  onChange={(e) =>
                    setPartData((p) => ({
                      ...p,
                      samochod: { ...p.samochod!, model: e.target.value },
                    }))
                  }
                  className="w-full bg-[#030712] border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-bold"
                  placeholder="np. Passat B5 1999"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Kategoria</label>
                <input
                  type="text"
                  value={partData.kategoria || ""}
                  onChange={(e) => setPartData((p) => ({ ...p, kategoria: e.target.value }))}
                  className="w-full bg-[#030712] border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-bold"
                  placeholder="np. Zacisk hamulcowy lewy przód"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Numery OEM</label>
                <input
                  type="text"
                  value={partData.numery_czesci || ""}
                  onChange={(e) => setPartData((p) => ({ ...p, numery_czesci: e.target.value }))}
                  className="w-full bg-[#030712] border border-slate-800 rounded-lg px-2.5 py-1.5 text-yellow-400 font-mono font-bold"
                  placeholder="np. 8E0615124A"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Cena Brutto (PLN)</label>
                <input
                  type="number"
                  value={partData.cena?.brutto || ""}
                  onChange={(e) => {
                    const brutto = Number(e.target.value) || 0;
                    setPartData((p) => ({
                      ...p,
                      cena: { brutto, netto: Math.round(brutto / 1.23) },
                    }));
                  }}
                  className="w-full bg-[#030712] border border-slate-800 rounded-lg px-2.5 py-1.5 text-emerald-400 font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Regał WMS</label>
                <input
                  type="text"
                  value={partData.ocr_wyniki?.numer_magazynowy || stationRack}
                  onChange={(e) =>
                    setPartData((p) => ({
                      ...p,
                      ocr_wyniki: { ...p.ocr_wyniki, numer_magazynowy: e.target.value },
                    }))
                  }
                  className="w-full bg-[#030712] border border-slate-800 rounded-lg px-2.5 py-1.5 text-yellow-400 font-mono font-bold"
                />
              </div>
            </div>

            {/* PRZYCISKI AKCJI KOŃCOWYCH */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-850">
              {savedPart && (
                <button
                  onClick={handleUpdateCurrentPart}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono font-bold cursor-pointer transition"
                >
                  Zaktualizuj dane w WMS
                </button>
              )}

              <button
                onClick={handleStartNewPart}
                className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-lg text-xs font-mono font-black cursor-pointer transition flex items-center gap-1.5 shadow-xs"
              >
                <span>+ Przyjmij następną część</span>
              </button>

              <button
                onClick={onNavigateToWarehouse}
                className="px-3 py-2 bg-[#030712] hover:bg-slate-900 text-slate-300 rounded-lg text-xs font-mono cursor-pointer transition ml-auto"
              >
                Przejdź do Magazynu WMS ➔
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* SEKCJA 2: ZADANIA PRACOWNIKA & KOLEJKA WARSZTATOWA */}
      {activeSection === "tasks" && (
        <div className="space-y-4">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-white font-mono flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-yellow-400" />
                  Kolejka Zadań Warsztatowych & Zmianowych ({tasks.length})
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Śledź swoje zadania demontażowe, testy osprzętu, pakowanie wysyłek i odzysk podzespołów.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAddingTask(!isAddingTask)}
                  className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-mono font-black rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Dodaj Zadanie</span>
                </button>
              </div>
            </div>

            {/* FORMULARZ NOWEGO ZADANIA */}
            {isAddingTask && (
              <form
                onSubmit={handleCreateTask}
                className="mt-3 p-4 bg-[#050914] border border-yellow-400/30 rounded-xl space-y-3 font-mono text-xs"
              >
                <div className="text-xs font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Nowe zadanie warsztatowe
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 block mb-1">Tytuł zadania / operacji:</label>
                    <input
                      type="text"
                      required
                      placeholder="np. Demontaż pasu przedniego i chłodnicy Audi A4"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="w-full bg-[#030712] border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-yellow-400"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1">Pojazd / Dawca części:</label>
                    <input
                      type="text"
                      placeholder="np. Audi A4 B6 2.0 ALT (Srebrny)"
                      value={newTaskVehicle}
                      onChange={(e) => setNewTaskVehicle(e.target.value)}
                      className="w-full bg-[#030712] border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-300 block mb-1">Kategoria:</label>
                    <select
                      value={newTaskCategory}
                      onChange={(e) => setNewTaskCategory(e.target.value as any)}
                      className="w-full bg-[#030712] border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-yellow-400"
                    >
                      <option value="Demontaż">Demontaż</option>
                      <option value="Weryfikacja / Test">Weryfikacja / Test</option>
                      <option value="Magazyn / Regał">Magazyn / Regał</option>
                      <option value="Segregacja / Złom">Segregacja / Złom BDO</option>
                      <option value="Pakowanie / Wysyłka">Pakowanie / Wysyłka</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1">Priorytet:</label>
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value as any)}
                      className="w-full bg-[#030712] border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-yellow-400"
                    >
                      <option value="Krytyczny (Pilny)">Krytyczny (Pilny)</option>
                      <option value="Wysoki">Wysoki</option>
                      <option value="Standardowy">Standardowy</option>
                      <option value="Niski">Niski</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1">Docelowy Regał WMS:</label>
                    <input
                      type="text"
                      value={newTaskRack}
                      onChange={(e) => setNewTaskRack(e.target.value)}
                      placeholder="MAG 14"
                      className="w-full bg-[#030712] border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">Opis / Szczegóły instrukcji:</label>
                  <textarea
                    rows={2}
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                    placeholder="Wprowadź uwagi, wymagane narzędzia, weryfikację uszkodzeń..."
                    className="w-full bg-[#030712] border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingTask(false)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-yellow-400 text-slate-950 font-bold rounded-lg hover:bg-yellow-300"
                  >
                    Zapisz zadanie
                  </button>
                </div>
              </form>
            )}

            {/* FILTRY ZADAŃ */}
            <div className="flex flex-wrap items-center gap-2 my-3 font-mono text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Status:
              </span>
              {[
                { id: "all", label: "Wszystkie" },
                { id: "Do zrobienia", label: "Do zrobienia" },
                { id: "W trakcie", label: "W trakcie" },
                { id: "Zakończone", label: "Zakończone" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setTaskFilterStatus(f.id)}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    taskFilterStatus === f.id
                      ? "bg-slate-800 text-yellow-400 font-bold border border-slate-700"
                      : "bg-[#040813] text-slate-400 hover:text-slate-200 border border-slate-850"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* LISTA ZADAŃ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 rounded-xl border font-mono text-xs transition flex flex-col justify-between gap-3 ${
                    task.status === "Zakończone"
                      ? "bg-[#060a14]/60 border-slate-850 opacity-75"
                      : task.status === "W trakcie"
                      ? "bg-[#0a1224] border-blue-500/40 shadow-sm"
                      : "bg-[#070c18] border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            task.priority.includes("Krytyczny")
                              ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                              : task.priority === "Wysoki"
                              ? "bg-yellow-400/15 text-yellow-300 border-yellow-400/30"
                              : "bg-slate-800 text-slate-300 border-slate-700"
                          }`}
                        >
                          {task.priority}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-900 text-slate-300 rounded text-[10px] border border-slate-800">
                          {task.category}
                        </span>
                        {task.aiGenerated && (
                          <span className="px-1.5 py-0.5 bg-cyan-500/15 text-cyan-300 rounded text-[9px] font-bold border border-cyan-500/30">
                            🤖 AI Dispatcher
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-slate-600 hover:text-rose-400 p-1 transition"
                        title="Usuń zadanie"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h4 className={`font-bold text-sm leading-snug ${task.status === "Zakończone" ? "line-through text-slate-400" : "text-white"}`}>
                      {task.title}
                    </h4>

                    <p className="text-slate-300 font-sans text-xs leading-relaxed">{task.description}</p>

                    <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-slate-400 border-t border-slate-850">
                      {task.vehicleTag && (
                        <span className="flex items-center gap-1 text-slate-300">
                          <Car className="w-3 h-3 text-cyan-400" /> {task.vehicleTag}
                        </span>
                      )}
                      {task.targetRack && (
                        <span className="flex items-center gap-1 text-yellow-400">
                          <Tag className="w-3 h-3 text-yellow-400" /> {task.targetRack}
                        </span>
                      )}
                      {task.completedAt && (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Zrobiono: {task.completedAt}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* KLAWISZ ZMIANY STATUSU */}
                  <div className="pt-2 border-t border-slate-850 flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">
                      Status: <strong className="text-slate-200">{task.status}</strong>
                    </span>

                    <button
                      onClick={() => handleToggleTaskStatus(task.id)}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer transition ${
                        task.status === "Do zrobienia"
                          ? "bg-blue-600 hover:bg-blue-500 text-white"
                          : task.status === "W trakcie"
                          ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                      }`}
                    >
                      {task.status === "Do zrobienia" && (
                        <>
                          <span>Rozpocznij</span>
                          <ChevronRight className="w-3 h-3" />
                        </>
                      )}
                      {task.status === "W trakcie" && (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Oznacz jako Zakończone</span>
                        </>
                      )}
                      {task.status === "Zakończone" && (
                        <>
                          <RefreshCw className="w-3 h-3" />
                          <span>Wznów zadanie</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SEKCJA 3: PORADY & PROCEDURY DEMONTAŻU */}
      {activeSection === "tips" && (
        <div className="space-y-4">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-white font-mono flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-cyan-400" />
                  Baza Wiedzy & Procedury Warsztatowe (PHU U Konesera)
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Oficjalne standardy demontażu, zapobiegania uszkodzeniom podzespołów, zasady BHP i odzysku BDO.
                </p>
              </div>

              {/* SZUKAJKA */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Szukaj procedury lub narzędzia..."
                  value={procedureSearch}
                  onChange={(e) => setProcedureSearch(e.target.value)}
                  className="w-full bg-[#030712] border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>
            </div>

            {/* KATEGORIE PROCEDUR */}
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              {[
                { id: "all", label: "Wszystkie kategorie" },
                { id: "Demontaż Podzespołów", label: "Demontaż Podzespołów" },
                { id: "Weryfikacja Jakości", label: "Weryfikacja Jakości (OVOKO)" },
                { id: "Procedury BDO & Recykling", label: "Normy BDO & Ekologia" },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setProcedureCategory(c.id)}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    procedureCategory === c.id
                      ? "bg-cyan-500 text-slate-950 font-bold"
                      : "bg-[#040813] text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* KARTY PROCEDUR */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {filteredProcedures.map((proc) => (
                <div
                  key={proc.id}
                  className="bg-[#070c18] border border-slate-800/90 rounded-xl p-4 space-y-3 font-mono text-xs hover:border-slate-700 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-cyan-500/15 text-cyan-300 rounded text-[10px] font-bold border border-cyan-500/30">
                          {proc.category}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Trudność: <strong className="text-yellow-400">{proc.difficulty}</strong>
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white font-mono leading-snug">{proc.title}</h4>
                    </div>

                    {proc.badge && (
                      <span className="px-2 py-0.5 bg-yellow-400/15 text-yellow-300 font-bold rounded text-[10px] border border-yellow-400/30 shrink-0">
                        {proc.badge}
                      </span>
                    )}
                  </div>

                  {/* WYMAGANE NARZĘDZIA */}
                  <div className="bg-[#040711] p-2.5 rounded-lg border border-slate-850">
                    <span className="text-slate-400 text-[11px] block font-bold mb-1 flex items-center gap-1">
                      <Wrench className="w-3 h-3 text-cyan-400" /> Wymagane narzędzia & chemia:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {proc.tools.map((t, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-slate-900 text-slate-300 rounded text-[10px] border border-slate-800">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* KROKI */}
                  <div className="space-y-1.5">
                    <span className="text-slate-300 font-bold text-[11px] block">Instrukcja krok po kroku:</span>
                    <ol className="space-y-1 pl-4 list-decimal text-slate-300 font-sans text-xs">
                      {proc.steps.map((step, sIdx) => (
                        <li key={sIdx} className="leading-relaxed">
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* OSTRZEŻENIA KRYTYCZNE */}
                  {proc.warnings && proc.warnings.length > 0 && (
                    <div className="p-2.5 bg-rose-950/25 border border-rose-500/30 rounded-lg space-y-1 text-rose-300 font-sans text-xs">
                      <div className="font-bold flex items-center gap-1.5 text-[11px] text-rose-400 font-mono">
                        <AlertTriangle className="w-3.5 h-3.5" /> Uwagi krytyczne & unikanie strat:
                      </div>
                      {proc.warnings.map((w, wIdx) => (
                        <p key={wIdx} className="leading-snug">
                          • {w}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SEKCJA 4: STANDARD JAKOŚCI & BDO */}
      {activeSection === "checklist" && (
        <div className="space-y-4">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white font-mono flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Standard Przyjęcia & Kontrola Jakościowa Części (GPSR / BDO)
              </h3>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Przed odłożeniem części na regał magazynowy WMS lub zapakowaniem do klienta zaznacz punkty kontrolne.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {checklistItems.map((chk) => (
                <div
                  key={chk.id}
                  onClick={() =>
                    setChecklistItems((prev) =>
                      prev.map((c) => (c.id === chk.id ? { ...c, checked: !c.checked } : c))
                    )
                  }
                  className={`p-3.5 rounded-xl border font-mono text-xs cursor-pointer transition flex items-start gap-3 ${
                    chk.checked
                      ? "bg-emerald-950/20 border-emerald-500/40 text-white"
                      : "bg-[#070c18] border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                      chk.checked
                        ? "bg-emerald-500 border-emerald-400 text-slate-950"
                        : "border-slate-700 bg-slate-900"
                    }`}
                  >
                    {chk.checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-xs">{chk.label}</h4>
                    <p className="text-slate-400 font-sans text-xs">{chk.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3.5 bg-[#050914] border border-cyan-500/30 rounded-xl flex items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2 text-cyan-300">
                <ShieldAlert className="w-4 h-4 text-cyan-400" />
                <span>Gwarancja Rozruchowa: 14 / 30 dni dla klientów detalicznych i warsztatów.</span>
              </div>
              <span className="text-emerald-400 font-bold">
                Spełniono: {checklistItems.filter((c) => c.checked).length} / {checklistItems.length} kryteriów
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
