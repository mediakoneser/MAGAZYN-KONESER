import React, { useState, useMemo, useEffect } from "react";
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Send,
  Download,
  Upload,
  Sparkles,
  Search,
  Filter,
  CheckSquare,
  Square,
  Package,
  Globe,
  Settings,
  ShieldCheck,
  FileCode,
  FileSpreadsheet,
  Zap,
  Play,
  Activity,
  Tag,
  ExternalLink,
  ChevronRight,
  Eye,
  Edit3,
  Sliders,
  Clock,
  Terminal,
  Server,
  ShoppingBag,
  HelpCircle,
  Truck,
  ArrowRight,
  Database,
} from "lucide-react";
import {
  CanonicalProduct,
  IntegrationLog,
  SyncJob,
  BaseLinkerConfig,
  ShopGoldConfig,
  ProductValidationResult,
} from "../types/canonicalProduct";
import { PartItem, AllegroConfig } from "../types";
import {
  partItemToCanonicalProduct,
  canonicalProductToPartItem,
  getStoredIntegrationLogs,
  saveStoredIntegrationLog,
  clearStoredIntegrationLogs,
  getStoredBaseLinkerConfig,
  saveStoredBaseLinkerConfig,
  getStoredShopGoldConfig,
  saveStoredShopGoldConfig,
  executeAllegroPublishJob,
} from "../services/syncService";
import { validateBulkProducts, validateCanonicalProduct } from "../services/productValidator";
import { optimizeProductWithAi } from "../services/aiProductService";
import { matchProductWithAllegroCatalog } from "../services/allegroMatchingService";
import { exportPartsToAllegroCsv, downloadAllegroTemplateCsv } from "../utils/allegroCsvHandler";
import { getStoredAllegroConfig, saveStoredAllegroConfig } from "../utils/allegroService";
import { runProductManagementTestSuite, TestCaseResult } from "../utils/__tests__/productManagementTests";
import { CanonicalProductDrawer } from "./CanonicalProductDrawer";
import { PipelineStepsVisualizer } from "./PipelineStepsVisualizer";
import { AllegroSettingsModal } from "./AllegroSettingsModal";
import { AllegroCsvImportModal } from "./AllegroCsvImportModal";
import { savePartToFirestore } from "../lib/firestoreService";

interface IntegrationCenterTabProps {
  drafts: PartItem[];
  setDrafts?: React.Dispatch<React.SetStateAction<PartItem[]>>;
  onOpenWarehouseCard?: (part: PartItem) => void;
}

export const IntegrationCenterTab: React.FC<IntegrationCenterTabProps> = ({
  drafts,
  setDrafts,
  onOpenWarehouseCard,
}) => {
  // Main view navigation
  const [activeSubView, setActiveSubView] = useState<
    "catalog" | "batch_wizard" | "ai_studio" | "audit_logs" | "test_suite" | "settings"
  >("catalog");

  // Configurations
  const [allegroConfig, setAllegroConfig] = useState<AllegroConfig>(() => getStoredAllegroConfig());
  const [baseLinkerConfig, setBaseLinkerConfig] = useState<BaseLinkerConfig>(() => getStoredBaseLinkerConfig());
  const [shopGoldConfig, setShopGoldConfig] = useState<ShopGoldConfig>(() => getStoredShopGoldConfig());

  // Modals
  const [isAllegroSettingsOpen, setIsAllegroSettingsOpen] = useState(false);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const [drawerProduct, setDrawerProduct] = useState<CanonicalProduct | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Canonical products derived from drafts
  const canonicalProducts = useMemo(() => {
    return drafts.map(partItemToCanonicalProduct);
  }, [drafts]);

  // Bulk Selection & Filtering
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [validationFilter, setValidationFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");

  // Integration Logs
  const [logs, setLogs] = useState<IntegrationLog[]>(() => getStoredIntegrationLogs());

  // Batch Job Queue
  const [activeJob, setActiveJob] = useState<SyncJob | null>(null);
  const [isJobRunning, setIsJobRunning] = useState(false);

  // Test Suite Runner
  const [testResults, setTestResults] = useState<{
    totalTests: number;
    passedCount: number;
    failedCount: number;
    durationMs: number;
    results: TestCaseResult[];
  } | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Auto-run tests once on mount for quick diagnostics
  useEffect(() => {
    runProductManagementTestSuite().then((res) => {
      setTestResults(res);
    });
  }, []);

  // Filter products
  const filteredProducts = useMemo(() => {
    return canonicalProducts.filter((p) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.gtin.includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.mpn.toLowerCase().includes(q) ||
          (p.location_rack && p.location_rack.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Status
      if (statusFilter !== "all" && p.status !== statusFilter) return false;

      // Validation
      if (validationFilter === "valid" && (!p.validation || !p.validation.isValid)) return false;
      if (validationFilter === "errors" && p.validation?.isValid) return false;
      if (validationFilter === "warnings" && (!p.validation || !p.validation.hasWarnings)) return false;

      // Marketplace Channel
      if (channelFilter === "allegro_published" && !p.marketplace_status?.allegro?.offer_id) return false;
      if (channelFilter === "allegro_draft" && (p.marketplace_status?.allegro?.offer_id || p.status === "published")) return false;

      return true;
    });
  }, [canonicalProducts, searchQuery, statusFilter, validationFilter, channelFilter]);

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map((p) => p.id));
    }
  };

  // Save product changes to state & Firestore
  const handleSaveProduct = async (updated: CanonicalProduct) => {
    const updatedPart = canonicalProductToPartItem(updated);
    if (setDrafts) {
      setDrafts((prev) => prev.map((d) => (d.id === updated.id ? updatedPart : d)));
    }
    await savePartToFirestore(updatedPart);

    saveStoredIntegrationLog({
      channel: "System",
      action: `Zaktualizowano produkt ${updated.sku}`,
      status: "info",
      itemsCount: 1,
      successCount: 1,
      errorCount: 0,
      details: `Zapisano zmiany w modelu kanonicznym dla: ${updated.name}`,
    });
    setLogs(getStoredIntegrationLogs());
  };

  // 1-Click Batch AI Optimization
  const handleBatchAiOptimize = async () => {
    const targetProducts = selectedIds.length > 0
      ? canonicalProducts.filter((p) => selectedIds.includes(p.id))
      : filteredProducts.slice(0, 10);

    if (targetProducts.length === 0) return;

    setIsJobRunning(true);
    const newJob: SyncJob = {
      id: `JOB-AI-${Date.now()}`,
      type: "ai_optimize",
      title: `Optymalizacja AI tytułów i parametrów (${targetProducts.length} produktów)`,
      status: "running",
      productIds: targetProducts.map((p) => p.id),
      totalItems: targetProducts.length,
      processedItems: 0,
      successItems: 0,
      failedItems: 0,
      startedAt: new Date().toISOString(),
      logs: [`[${new Date().toLocaleTimeString()}] Rozpoczęto analizę AI Google Gemini...`],
      errors: [],
    };
    setActiveJob(newJob);

    for (let i = 0; i < targetProducts.length; i++) {
      const prod = targetProducts[i];
      try {
        const res = await optimizeProductWithAi(prod);
        if (res.success && res.data) {
          const updated: CanonicalProduct = {
            ...prod,
            name: res.data.optimizedTitle,
            category_name: res.data.suggestedCategory,
            category_id: res.data.suggestedCategoryId,
            description_raw: res.data.optimizedDescriptionRaw,
            description_html: res.data.optimizedDescriptionHtml,
            parameters: {
              ...prod.parameters,
              ...res.data.suggestedParameters,
            },
            ai_cocreated: true,
          };
          await handleSaveProduct(updated);
          newJob.successItems++;
          newJob.logs.push(`[${new Date().toLocaleTimeString()}] Optymalizacja AI dla ${prod.sku}: "${res.data.optimizedTitle}"`);
        } else {
          newJob.failedItems++;
          newJob.logs.push(`[${new Date().toLocaleTimeString()}] ❌ Błąd AI dla ${prod.sku}`);
        }
      } catch (e: any) {
        newJob.failedItems++;
        newJob.logs.push(`[${new Date().toLocaleTimeString()}] ❌ Wyjątek: ${e?.message}`);
      }

      newJob.processedItems++;
      setActiveJob({ ...newJob });
    }

    newJob.status = "completed";
    newJob.finishedAt = new Date().toISOString();
    setActiveJob({ ...newJob });
    setIsJobRunning(false);
  };

  // Batch Publish to Allegro REST API
  const handleBatchPublishAllegro = async () => {
    const targetProducts = selectedIds.length > 0
      ? canonicalProducts.filter((p) => selectedIds.includes(p.id))
      : filteredProducts;

    if (targetProducts.length === 0) return;

    setIsJobRunning(true);
    setActiveSubView("batch_wizard");

    const { updatedProducts, job } = await executeAllegroPublishJob(
      targetProducts,
      allegroConfig,
      (progressJob) => {
        setActiveJob({ ...progressJob });
      }
    );

    // Save all updated parts
    if (setDrafts) {
      setDrafts((prev) => {
        const map = new Map(updatedProducts.map((p) => [p.id, canonicalProductToPartItem(p)]));
        return prev.map((d) => (map.has(d.id) ? map.get(d.id)! : d));
      });
    }

    for (const prod of updatedProducts) {
      if (prod.status === "published") {
        await savePartToFirestore(canonicalProductToPartItem(prod));
      }
    }

    setIsJobRunning(false);
    setLogs(getStoredIntegrationLogs());
  };

  // Export Selected or All to 29-Column Canonical CSV
  const handleExportCsv = () => {
    const partsToExport = selectedIds.length > 0
      ? drafts.filter((d) => selectedIds.includes(d.id))
      : drafts;

    const csvContent = exportPartsToAllegroCsv(partsToExport);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `allegro_canonical_asortyment_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    saveStoredIntegrationLog({
      channel: "CSV Engine",
      action: "Eksport do pliku CSV (29 kolumn)",
      status: "success",
      itemsCount: partsToExport.length,
      successCount: partsToExport.length,
      errorCount: 0,
      details: `Wygenerowano canonical CSV dla ${partsToExport.length} produktów.`,
    });
    setLogs(getStoredIntegrationLogs());
  };

  // Run Test Suite on Demand
  const handleExecuteTests = async () => {
    setIsRunningTests(true);
    try {
      const res = await runProductManagementTestSuite();
      setTestResults(res);
      saveStoredIntegrationLog({
        channel: "System",
        action: "Wykonano pakiet 16 testów jednostkowych",
        status: res.failedCount === 0 ? "success" : "error",
        itemsCount: res.totalTests,
        successCount: res.passedCount,
        errorCount: res.failedCount,
        details: `Zaliczono: ${res.passedCount}/${res.totalTests} w ${res.durationMs}ms.`,
      });
      setLogs(getStoredIntegrationLogs());
    } finally {
      setIsRunningTests(false);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* 1. TOP STATUS & CHANNELS HEALTH OVERVIEW */}
      <div className="bg-[#070d19] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-br from-yellow-400 to-amber-500 text-slate-950 rounded-xl font-black shadow-sm">
                <Layers className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2 font-mono">
                  <span>CENTRUM INTEGRACJI & MASOWEGO WYSTAWIANIA</span>
                  <span className="text-[10px] px-2 py-0.5 bg-yellow-400/10 text-yellow-400 font-bold rounded-full border border-yellow-400/30">
                    REST API 2026
                  </span>
                </h1>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Ujednolicony silnik zarządzania asortymentem: Allegro • BaseLinker • shopGold • CSV • Google AI
                </p>
              </div>
            </div>
          </div>

          {/* Quick Header CTAs */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              onClick={() => setIsCsvImportOpen(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Upload className="w-4 h-4 text-teal-400" />
              <span>Importuj CSV (29 kolumn)</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-4 h-4 text-yellow-400" />
              <span>Eksportuj CSV</span>
            </button>
            <button
              onClick={() => setIsAllegroSettingsOpen(true)}
              className="px-3.5 py-2 bg-yellow-400 text-slate-950 hover:bg-yellow-300 rounded-xl text-xs font-mono font-black transition flex items-center gap-1.5 shadow-sm"
            >
              <Settings className="w-4 h-4" />
              <span>Konfiguracja API</span>
            </button>
          </div>
        </div>

        {/* CHANNEL HEALTH CARDS GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
          {/* Allegro REST API */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-orange-400" /> Allegro REST API
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  allegroConfig.accessToken ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                }`}
              />
            </div>
            <div className="mt-2 text-[11px] font-mono">
              <div className="text-slate-400 truncate">
                {allegroConfig.sellerName || "PHU U Konesera"}
              </div>
              <div className="text-slate-500 text-[10px] mt-0.5">
                {allegroConfig.sandbox ? "Środowisko: Sandbox" : "Środowisko: Produkcja"}
              </div>
            </div>
          </div>

          {/* BaseLinker */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" /> BaseLinker API
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <div className="mt-2 text-[11px] font-mono">
              <div className="text-slate-400">Stan: Gotowy do sync</div>
              <div className="text-slate-500 text-[10px] mt-0.5">Inwentarz: Magazyn Główny</div>
            </div>
          </div>

          {/* shopGold */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-teal-400" /> Sklep shopGold
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <div className="mt-2 text-[11px] font-mono">
              <div className="text-slate-400 truncate">sklep.ukonesera.pl</div>
              <div className="text-slate-500 text-[10px] mt-0.5">REST API v1</div>
            </div>
          </div>

          {/* CSV Engine */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Canonical CSV
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <div className="mt-2 text-[11px] font-mono">
              <div className="text-slate-400">29 kolumn Allegro</div>
              <div className="text-slate-500 text-[10px] mt-0.5">Pełna walidacja EAN</div>
            </div>
          </div>

          {/* Unit Tests Runner */}
          <div
            onClick={() => setActiveSubView("test_suite")}
            className="bg-slate-950/80 hover:bg-slate-900 border border-slate-800 cursor-pointer rounded-xl p-3 flex flex-col justify-between transition group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5 group-hover:text-yellow-400">
                <Activity className="w-3.5 h-3.5 text-purple-400" /> 16 Testów Jedn.
              </span>
              {testResults && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                    testResults.failedCount === 0
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {testResults.passedCount}/{testResults.totalTests}
                </span>
              )}
            </div>
            <div className="mt-2 text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>Status modułu</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION SUB-TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2 text-xs font-mono font-bold">
        <button
          onClick={() => setActiveSubView("catalog")}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 ${
            activeSubView === "catalog"
              ? "bg-yellow-400 text-slate-950 shadow-md"
              : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Baza Produktów i Oferty ({canonicalProducts.length})</span>
        </button>

        <button
          onClick={() => setActiveSubView("batch_wizard")}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 ${
            activeSubView === "batch_wizard"
              ? "bg-yellow-400 text-slate-950 shadow-md"
              : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Kreator Masowego Wystawiania (Batch Wizard)</span>
        </button>

        <button
          onClick={() => setActiveSubView("ai_studio")}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 ${
            activeSubView === "ai_studio"
              ? "bg-yellow-400 text-slate-950 shadow-md"
              : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>Asystent AI & Optymalizacja</span>
        </button>

        <button
          onClick={() => setActiveSubView("audit_logs")}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 ${
            activeSubView === "audit_logs"
              ? "bg-yellow-400 text-slate-950 shadow-md"
              : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Logi & Audyt Integracji ({logs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubView("test_suite")}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 ${
            activeSubView === "test_suite"
              ? "bg-yellow-400 text-slate-950 shadow-md"
              : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <span>Raport z 16 Testów</span>
        </button>
      </div>

      {/* 3. VIEW 1: UNIFIED PRODUCT DATABASE & OFFERS TABLE */}
      {activeSubView === "catalog" && (
        <div className="space-y-4">
          {/* FILTERS & ACTION BAR */}
          <div className="bg-[#070d19] border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Search */}
              <div className="relative w-full md:w-96">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Szukaj po tytule, GTIN, MPN, marce lub regale WMS..."
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-hidden focus:border-yellow-400"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono"
                >
                  <option value="all">Wszystkie statusy</option>
                  <option value="draft">Szkice (Draft)</option>
                  <option value="published">Wystawione (Published)</option>
                  <option value="sync_error">Błędy synchronizacji</option>
                </select>

                <select
                  value={validationFilter}
                  onChange={(e) => setValidationFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono"
                >
                  <option value="all">Walidacja: Wszystko</option>
                  <option value="valid">Poprawne (Valid)</option>
                  <option value="errors">Zawiera Błędy</option>
                  <option value="warnings">Ostrzeżenia</option>
                </select>

                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono"
                >
                  <option value="all">Kanał: Wszystkie</option>
                  <option value="allegro_published">Allegro: Aktywne</option>
                  <option value="allegro_draft">Allegro: Do wystawienia</option>
                </select>
              </div>
            </div>

            {/* BATCH ACTION BAR (When items selected) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs font-mono">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSelectAllFiltered}
                  className="text-slate-300 hover:text-white flex items-center gap-1.5 font-bold"
                >
                  {selectedIds.length === filteredProducts.length && filteredProducts.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-yellow-400" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-500" />
                  )}
                  <span>
                    Zaznaczono: <b>{selectedIds.length}</b> / {filteredProducts.length}
                  </span>
                </button>
              </div>

              {selectedIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleBatchAiOptimize}
                    className="px-3 py-1.5 bg-purple-950/40 text-purple-300 border border-purple-500/40 rounded-lg hover:bg-purple-900/50 font-bold transition flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Optymalizuj AI ({selectedIds.length})</span>
                  </button>

                  <button
                    onClick={handleBatchPublishAllegro}
                    className="px-3 py-1.5 bg-yellow-400 text-slate-950 font-black rounded-lg hover:bg-yellow-300 transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Wystaw na Allegro ({selectedIds.length})</span>
                  </button>

                  <button
                    onClick={handleExportCsv}
                    className="px-3 py-1.5 bg-slate-800 text-slate-200 border border-slate-700 rounded-lg hover:bg-slate-700 font-bold transition flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Eksport CSV ({selectedIds.length})</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* TABLE OF CANONICAL PRODUCTS */}
          <div className="bg-[#070d19] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <button onClick={handleSelectAllFiltered}>
                        {selectedIds.length === filteredProducts.length && filteredProducts.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-yellow-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600" />
                        )}
                      </button>
                    </th>
                    <th className="p-3">Produkt & Tytuł (Max 75 zn.)</th>
                    <th className="p-3">GTIN / EAN</th>
                    <th className="p-3">MPN & Marka</th>
                    <th className="p-3">Cena Brutto</th>
                    <th className="p-3">Stan</th>
                    <th className="p-3">Regał WMS</th>
                    <th className="p-3">Walidacja</th>
                    <th className="p-3">Allegro REST</th>
                    <th className="p-3 text-right">Akcje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredProducts.map((p) => {
                    const isSelected = selectedIds.includes(p.id);
                    const validation = p.validation || validateCanonicalProduct(p);
                    const isPublished = Boolean(p.marketplace_status?.allegro?.offer_id || p.status === "published");

                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-slate-900/60 transition ${
                          isSelected ? "bg-yellow-400/5" : ""
                        }`}
                      >
                        <td className="p-3 text-center">
                          <button onClick={() => handleToggleSelect(p.id)}>
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-yellow-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-700" />
                            )}
                          </button>
                        </td>

                        <td className="p-3 max-w-xs">
                          <div className="flex items-center gap-2.5">
                            {p.images[0] ? (
                              <img
                                src={p.images[0]}
                                alt=""
                                className="w-9 h-9 rounded object-cover border border-slate-700 shrink-0 bg-slate-900"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 shrink-0">
                                <Package className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-sans font-bold text-slate-200 truncate" title={p.name}>
                                {p.name}
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                                <span className="text-yellow-400/80 font-mono">{p.sku}</span>
                                <span>•</span>
                                <span className="truncate">{p.category_name}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3">
                          {p.gtin ? (
                            <span className="font-mono text-teal-400">{p.gtin}</span>
                          ) : (
                            <span className="text-slate-600 text-[10px]">brak</span>
                          )}
                        </td>

                        <td className="p-3">
                          <div className="text-slate-300 font-bold">{p.brand || "-"}</div>
                          <div className="text-slate-500 text-[10px]">{p.mpn || "-"}</div>
                        </td>

                        <td className="p-3">
                          <div className="font-bold text-emerald-400">{p.price_gross.toFixed(2)} PLN</div>
                          <div className="text-[10px] text-slate-500">{p.price_net} PLN netto</div>
                        </td>

                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-bold">
                            {p.stock} szt.
                          </span>
                        </td>

                        <td className="p-3">
                          <span className="text-yellow-400 font-bold px-1.5 py-0.5 bg-yellow-400/10 rounded border border-yellow-400/20">
                            {p.location_rack || "MAG 14"}
                          </span>
                        </td>

                        <td className="p-3">
                          {validation.isValid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>OK</span>
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-red-400 text-[11px] font-bold"
                              title={validation.errors.map((e) => e.message).join("; ")}
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Błędy ({validation.errors.length})</span>
                            </span>
                          )}
                        </td>

                        <td className="p-3">
                          {isPublished ? (
                            <a
                              href={p.marketplace_status?.allegro?.offer_url || `https://allegro.pl/oferta/${p.marketplace_status?.allegro?.offer_id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-teal-400 hover:underline font-bold"
                            >
                              <span>#{p.marketplace_status?.allegro?.offer_id?.slice(0, 8)}...</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-500 text-[10px]">Szkic / Nieopublikowany</span>
                          )}
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setDrawerProduct(p);
                                setIsDrawerOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition"
                              title="Edytuj produkt w panelu kanonicznym"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredProducts.length === 0 && (
                <div className="p-8 text-center text-slate-500 font-mono text-xs">
                  Brak produktów spełniających podane kryteria wyszukiwania.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. VIEW 2: BATCH WIZARD & 10-STEP PIPELINE RUNNER */}
      {activeSubView === "batch_wizard" && (
        <div className="space-y-4">
          <PipelineStepsVisualizer />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Control Panel */}
            <div className="bg-[#070d19] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span>Masowy Kolejkowicz (Job Queue)</span>
              </h3>

              <p className="text-xs text-slate-400 font-mono leading-relaxed">
                Uruchom sekwencyjne przetwarzanie i wystawianie asortymentu w Allegro REST API z automatyczną walidacją, mapowaniem parametrów i logowaniem błędów.
              </p>

              <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Do wystawienia:</span>
                  <b className="text-white">{canonicalProducts.length} produktów</b>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Zaznaczonych do akcji:</span>
                  <b className="text-yellow-400">{selectedIds.length} pozycji</b>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Konto docelowe:</span>
                  <b className="text-teal-400">{allegroConfig.sellerName || "PHU U Konesera"}</b>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={handleBatchPublishAllegro}
                  disabled={isJobRunning}
                  className="w-full py-3 bg-yellow-400 text-slate-950 font-mono font-black text-xs rounded-xl hover:bg-yellow-300 transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  <span>
                    {isJobRunning
                      ? "Trwa masowe wystawianie..."
                      : `Wystaw ${selectedIds.length > 0 ? selectedIds.length : canonicalProducts.length} ofert na Allegro`}
                  </span>
                </button>

                <button
                  onClick={handleBatchAiOptimize}
                  disabled={isJobRunning}
                  className="w-full py-2.5 bg-purple-950/40 text-purple-300 border border-purple-500/40 rounded-xl hover:bg-purple-900/50 font-mono font-bold text-xs transition flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Optymalizuj tytuły i opisy AI przed wysłaniem</span>
                </button>
              </div>
            </div>

            {/* Live Progress & Real-time Logs */}
            <div className="lg:col-span-2 bg-[#070d19] border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3">
                  <span className="text-xs font-mono font-bold text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-teal-400" />
                    <span>Podgląd i Dziennik Przetwarzania na Żywo</span>
                  </span>
                  {activeJob && (
                    <span className="text-xs font-mono text-slate-400">
                      Postęp: {activeJob.processedItems} / {activeJob.totalItems} (
                      {Math.round((activeJob.processedItems / Math.max(1, activeJob.totalItems)) * 100)}%)
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                {activeJob && (
                  <div className="mb-4">
                    <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-400 to-emerald-400 transition-all duration-300"
                        style={{
                          width: `${(activeJob.processedItems / Math.max(1, activeJob.totalItems)) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] font-mono mt-1 text-slate-400">
                      <span className="text-emerald-400">Sukces: {activeJob.successItems}</span>
                      <span className="text-red-400">Błędy: {activeJob.failedItems}</span>
                    </div>
                  </div>
                )}

                {/* Terminal Window */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-300 max-h-[300px] overflow-y-auto space-y-1">
                  {activeJob?.logs && activeJob.logs.length > 0 ? (
                    activeJob.logs.map((log, idx) => (
                      <div
                        key={idx}
                        className={`leading-relaxed ${
                          log.includes("❌")
                            ? "text-red-400"
                            : log.includes("wystawiona")
                            ? "text-emerald-300"
                            : "text-slate-300"
                        }`}
                      >
                        {log}
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-600 py-6 text-center">
                      Gotowy do uruchomienia zadania. Kliknij 'Wystaw oferty na Allegro', aby rozpocząć.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. VIEW 3: AI ASSISTANT STUDIO */}
      {activeSubView === "ai_studio" && (
        <div className="bg-[#070d19] border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <span>Google Gemini AI - Studio Optymalizacji Produktów</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Generowanie tytułów pod algorytm Trafności Allegro (&lt;=75 zn.), opisów technicznych, parametrów i deklaracji AI
              </p>
            </div>
            <button
              onClick={handleBatchAiOptimize}
              disabled={isJobRunning}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-mono text-xs font-bold rounded-xl hover:from-purple-500 hover:to-indigo-500 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>Optymalizuj zaznaczone ({selectedIds.length > 0 ? selectedIds.length : "wszystkie"})</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <h3 className="text-xs font-mono font-bold text-yellow-400 uppercase">
                1. Tytuły Allegro (&lt;= 75 znaków)
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Algorytm eliminuje słowa zakazane ("HIT", "SUPER") i układa słowa kluczowe w sekwencji: Część + Marka + Model + Kod OEM.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <h3 className="text-xs font-mono font-bold text-teal-400 uppercase">
                2. Zgodność z GPSR & GVO
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dołączanie danych o producencie, jakości części (O - oryginał OE) oraz legalnym demontażu na stacji PHU U Konesera.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <h3 className="text-xs font-mono font-bold text-purple-400 uppercase">
                3. Ekstrakcja Parametrów
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automatyczne uzupełnianie brakujących parametrów słownikowych (Strona zabudowy, Numer katalogowy, Stan) ze zdjęć i opisu.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 6. VIEW 4: AUDIT LOGS */}
      {activeSubView === "audit_logs" && (
        <div className="bg-[#070d19] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Terminal className="w-4 h-4 text-teal-400" />
                <span>Dziennik Zdarzeń & Ścieżka Audytu Integracji</span>
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Historia wywołań API, odpowiedzi serwerów, eksportów i operacji masowych
              </p>
            </div>
            <button
              onClick={() => {
                clearStoredIntegrationLogs();
                setLogs([]);
              }}
              className="px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-lg text-xs font-mono transition"
            >
              Wyczyść Logi
            </button>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto font-mono text-xs">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.status === "success"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : log.status === "warning"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : log.status === "error"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      }`}
                    >
                      {log.channel}
                    </span>
                    <span className="font-bold text-white">{log.action}</span>
                  </div>
                  <p className="text-slate-400 text-xs">{log.details}</p>
                </div>
                <span className="text-[10px] text-slate-500 whitespace-nowrap shrink-0">{log.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. VIEW 5: 16 UNIT TESTS SUITE REPORT */}
      {activeSubView === "test_suite" && (
        <div className="bg-[#070d19] border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-400" />
                <span>Pakiet 16 Testów Jednostkowych - Moduł Asortymentu & Marketplace</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Weryfikacja Modulo-10 GTIN (String), limitu 75 znaków tytułu, normalizacji, CSV 29 kolumn i Offer Buildera
              </p>
            </div>

            <button
              onClick={handleExecuteTests}
              disabled={isRunningTests}
              className="px-4 py-2 bg-yellow-400 text-slate-950 font-mono font-black text-xs rounded-xl hover:bg-yellow-300 transition flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRunningTests ? "animate-spin" : ""}`} />
              <span>{isRunningTests ? "Wykonywanie testów..." : "Uruchom 16 Testów Ponownie"}</span>
            </button>
          </div>

          {testResults && (
            <div className="space-y-4 font-mono">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-slate-500 text-[10px]">ŁĄCZNIE TESTÓW</div>
                  <div className="text-lg font-bold text-white">{testResults.totalTests}</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-slate-500 text-[10px]">ZALICZONE</div>
                  <div className="text-lg font-bold text-emerald-400">{testResults.passedCount}</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-slate-500 text-[10px]">BŁĘDY</div>
                  <div className="text-lg font-bold text-red-400">{testResults.failedCount}</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-slate-500 text-[10px]">CZAS WYKONANIA</div>
                  <div className="text-lg font-bold text-teal-400">{testResults.durationMs} ms</div>
                </div>
              </div>

              {/* Individual Test Cards */}
              <div className="space-y-2">
                {testResults.results.map((t) => (
                  <div
                    key={t.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                      t.passed
                        ? "bg-slate-950/80 border-slate-800/80 text-slate-200"
                        : "bg-red-950/20 border-red-500/40 text-red-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {t.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                      )}
                      <div>
                        <div className="font-bold flex items-center gap-2">
                          <span className="text-yellow-400">#{t.id}</span>
                          <span>{t.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-slate-900 text-slate-400 rounded">
                            {t.category}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{t.message}</div>
                      </div>
                    </div>

                    <span className="text-[10px] text-slate-500 shrink-0">{t.durationMs}ms</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* DRAWERS & MODALS */}
      <CanonicalProductDrawer
        product={drawerProduct}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setDrawerProduct(null);
        }}
        onSave={handleSaveProduct}
        allegroConfig={allegroConfig}
      />

      <AllegroSettingsModal
        isOpen={isAllegroSettingsOpen}
        onClose={() => setIsAllegroSettingsOpen(false)}
        config={allegroConfig}
        onSaveConfig={(cfg) => {
          setAllegroConfig(cfg);
          saveStoredAllegroConfig(cfg);
          setIsAllegroSettingsOpen(false);
        }}
      />

      <AllegroCsvImportModal
        isOpen={isCsvImportOpen}
        onClose={() => setIsCsvImportOpen(false)}
        onImportComplete={(newParts) => {
          if (setDrafts) {
            setDrafts((prev) => [...newParts, ...prev]);
          }
          saveStoredIntegrationLog({
            channel: "CSV Engine",
            action: `Zaimportowano ${newParts.length} pozycji z CSV`,
            status: "success",
            itemsCount: newParts.length,
            successCount: newParts.length,
            errorCount: 0,
            details: `Pomyślnie dodano ${newParts.length} rekordów do centralnej bazy WMS.`,
          });
          setLogs(getStoredIntegrationLogs());
          setIsCsvImportOpen(false);
        }}
        allegroConfig={allegroConfig}
      />
    </div>
  );
};
