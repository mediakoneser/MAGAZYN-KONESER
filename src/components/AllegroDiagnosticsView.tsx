import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  Database,
  ArrowRight,
  Activity,
  Trash2,
  Eye,
  Hash,
  Box,
  Layers,
  Sparkles,
  Sliders,
  Send,
  Copy,
  CheckCheck,
  Download,
  Terminal,
  Filter,
  ArrowDownUp,
  Radio,
  Clock,
  HelpCircle,
  FileCode,
  Tag,
  Pause,
  Play,
} from "lucide-react";
import {
  AllegroDiagnosticEntry,
  AllegroLifecycleStatus,
  DiagnosticStage,
  OfferVerificationResult,
} from "../types/marketplaceTypes";

interface AllegroDiagnosticsViewProps {
  onOpenCentralEditor?: (sku: string) => void;
}

export const AllegroDiagnosticsView: React.FC<AllegroDiagnosticsViewProps> = ({ onOpenCentralEditor }) => {
  const [history, setHistory] = useState<AllegroDiagnosticEntry[]>([]);
  const [activeOffers, setActiveOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"OFFERS" | "STREAM" | "TEST_RUNNER">("OFFERS");

  // Offer verification state
  const [verifyOfferIdInput, setVerifyOfferIdInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<OfferVerificationResult | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // 7-step flow runner state
  const [isExecutingFlow, setIsExecutingFlow] = useState(false);
  const [flowSuccessMessage, setFlowSuccessMessage] = useState<string | null>(null);
  const [flowErrorMessage, setFlowErrorMessage] = useState<string | null>(null);
  const [selectedEntryDetails, setSelectedEntryDetails] = useState<AllegroDiagnosticEntry | null>(null);

  // Form for testing 7-step flow
  const [testSku, setTestSku] = useState("MAG-ALT-02");
  const [testTitle, setTestTitle] = useState("Alternator Bosch 140A VW Golf VI 2.0 TDI 03L903023");
  const [testPrice, setTestPrice] = useState(320);
  const [testStock, setTestStock] = useState(1);
  const [testCategory, setTestCategory] = useState("50849");
  const [simulateMissingOffer, setSimulateMissingOffer] = useState(false);

  // Copy feedback state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Auto-refresh 30s state
  const REFRESH_INTERVAL_SEC = 30;
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL_SEC);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>("");
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fetchDiagnostics = async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
    } else {
      setIsAutoRefreshing(true);
    }
    try {
      const res = await fetch("/api/allegro/diagnostics");
      const data = await res.json();
      if (data.success) {
        setHistory(data.history || []);
        setActiveOffers(data.offers || []);
        if (data.offers && data.offers.length > 0 && !verifyOfferIdInput) {
          setVerifyOfferIdInput(data.offers[0].offerId);
        }
        setLastRefreshedAt(new Date().toLocaleTimeString("pl-PL"));
      }
    } catch (e) {
      console.error("Failed to load diagnostics:", e);
    } finally {
      setLoading(false);
      setIsAutoRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    fetchDiagnostics(false);
    setCountdown(REFRESH_INTERVAL_SEC);
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  // 30-second auto-refresh countdown effect
  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchDiagnostics(true);
          return REFRESH_INTERVAL_SEC;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefresh]);

  const handleClearHistory = async () => {
    if (!window.confirm("Czy na pewno chcesz wyczyścić historię diagnostyki Allegro?")) return;
    try {
      await fetch("/api/allegro/diagnostics", { method: "DELETE" });
      await fetchDiagnostics();
    } catch (e) {
      console.error("Failed to clear diagnostics:", e);
    }
  };

  // 7-step flow executor
  const handleExecute7StepFlow = async () => {
    setIsExecutingFlow(true);
    setFlowSuccessMessage(null);
    setFlowErrorMessage(null);

    try {
      const res = await fetch("/api/allegro/create-offer-flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          part: {
            sku: testSku,
            kod_magazynowy: testSku,
            id: `WMS-${Date.now().toString().slice(-5)}`,
            nazwa_czesci: testTitle,
            cena: testPrice,
            ilosc: testStock,
            catalogProductId: `prod_${Date.now().toString().slice(-6)}`,
          },
          payload: {
            name: testTitle,
            category: { id: testCategory },
            sellingMode: { price: { amount: testPrice } },
            stock: { available: testStock },
          },
          simulateFailure: simulateMissingOffer,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFlowSuccessMessage(
          `Sukces: 7-etapowy proces zakończony pomyślnie! Utworzono i zweryfikowano ofertę #${data.typedIds?.offerId}. Wszystkie pola zgodne.`
        );
        setVerifyOfferIdInput(data.typedIds?.offerId);
      } else {
        setFlowErrorMessage(data.error || data.message || "Błąd wykonania procedury tworzenia oferty.");
      }
      await fetchDiagnostics();
    } catch (err: any) {
      setFlowErrorMessage(err?.message || "Błąd połączenia z serwerem");
    } finally {
      setIsExecutingFlow(false);
    }
  };

  // [VERIFY OFFER] handler
  const handleVerifyOffer = async (targetOfferId?: string) => {
    const idToVerify = targetOfferId || verifyOfferIdInput;
    if (!idToVerify.trim()) return;

    setIsVerifying(true);
    setVerificationResult(null);
    setVerifyError(null);

    try {
      const res = await fetch(`/api/allegro/verify-offer/${encodeURIComponent(idToVerify.trim())}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expected: {
            sku: testSku,
            title: testTitle,
            price: testPrice,
            stock: testStock,
            category: testCategory,
            status: "ACTIVE",
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setVerificationResult(data.verification);
      } else {
        setVerifyError(data.error || "Weryfikacja nie powiodła się: Oferta nie istnieje lub wystąpiły rozbieżności.");
        if (data.verification) {
          setVerificationResult(data.verification);
        }
      }
      await fetchDiagnostics();
    } catch (err: any) {
      setVerifyError(err?.message || "Błąd sieci podczas weryfikacji oferty.");
    } finally {
      setIsVerifying(false);
    }
  };

  const exportDiagnosticsJson = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      count: history.length,
      offersCount: activeOffers.length,
      history,
      activeOffers,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `allegro-diagnostics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter history entries
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      if (stageFilter !== "ALL" && item.stage !== stageFilter) return false;
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSku = item.sku?.toLowerCase().includes(q);
        const matchOffer = item.offerId?.toLowerCase().includes(q);
        const matchOp = item.operationId?.toLowerCase().includes(q);
        const matchProd = item.productId?.toLowerCase().includes(q);
        const matchExt = item.externalId?.toLowerCase().includes(q);
        const matchMsg = item.message?.toLowerCase().includes(q);
        if (!matchSku && !matchOffer && !matchOp && !matchProd && !matchExt && !matchMsg) return false;
      }
      return true;
    });
  }, [history, stageFilter, statusFilter, searchQuery]);

  // Group history items by distinct offer / product track
  const groupedOffersData = useMemo(() => {
    const offerMap = new Map<string, {
      key: string;
      offerId?: string;
      productId?: string;
      operationId?: string;
      sku: string;
      externalId: string;
      latestStatus: AllegroLifecycleStatus;
      latestStage: DiagnosticStage;
      latestTimestamp: string;
      latestMessage: string;
      entries: AllegroDiagnosticEntry[];
      offerDetails?: any;
    }>();

    // Group all history entries
    history.forEach((entry) => {
      const groupKey = entry.offerId || entry.productId || entry.operationId || entry.sku;
      if (!offerMap.has(groupKey)) {
        const matchingOffer = activeOffers.find(
          (o) => o.offerId === entry.offerId || o.productId === entry.productId || o.sku === entry.sku
        );

        offerMap.set(groupKey, {
          key: groupKey,
          offerId: entry.offerId || matchingOffer?.offerId,
          productId: entry.productId || matchingOffer?.productId,
          operationId: entry.operationId || matchingOffer?.operationId,
          sku: entry.sku || matchingOffer?.sku || "N/A",
          externalId: entry.externalId || matchingOffer?.externalId || "N/A",
          latestStatus: entry.status,
          latestStage: entry.stage,
          latestTimestamp: entry.timestamp,
          latestMessage: entry.message,
          entries: [entry],
          offerDetails: matchingOffer,
        });
      } else {
        const group = offerMap.get(groupKey)!;
        group.entries.push(entry);
        // If this entry has IDs that were missing, fill them in
        if (!group.offerId && entry.offerId) group.offerId = entry.offerId;
        if (!group.productId && entry.productId) group.productId = entry.productId;
        if (!group.operationId && entry.operationId) group.operationId = entry.operationId;
      }
    });

    // Also ensure activeOffers from store are represented even if no recent history entry
    activeOffers.forEach((off) => {
      const groupKey = off.offerId || off.sku;
      if (!offerMap.has(groupKey)) {
        offerMap.set(groupKey, {
          key: groupKey,
          offerId: off.offerId,
          productId: off.productId,
          operationId: off.operationId,
          sku: off.sku,
          externalId: off.externalId || "N/A",
          latestStatus: off.status,
          latestStage: "VERIFICATION",
          latestTimestamp: off.lastVerifiedAt || off.createdAt,
          latestMessage: `Oferta w sklepie lokalnym. Status: ${off.status}`,
          entries: [],
          offerDetails: off,
        });
      }
    });

    return Array.from(offerMap.values()).filter((group) => {
      if (statusFilter !== "ALL" && group.latestStatus !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSku = group.sku?.toLowerCase().includes(q);
        const matchOffer = group.offerId?.toLowerCase().includes(q);
        const matchProd = group.productId?.toLowerCase().includes(q);
        const matchOp = group.operationId?.toLowerCase().includes(q);
        const matchTitle = group.offerDetails?.title?.toLowerCase().includes(q);
        if (!matchSku && !matchOffer && !matchProd && !matchOp && !matchTitle) return false;
      }
      return true;
    });
  }, [history, activeOffers, statusFilter, searchQuery]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: history.length,
      REQUESTED: 0,
      PROCESSING: 0,
      CREATED: 0,
      PUBLISHED: 0,
      VERIFIED: 0,
      FAILED: 0,
    };
    history.forEach((h) => {
      if (counts[h.status] !== undefined) {
        counts[h.status]++;
      }
    });
    return counts;
  }, [history]);

  const getStageBadge = (stage: DiagnosticStage) => {
    switch (stage) {
      case "REQUEST":
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">1. REQUEST</span>;
      case "RESPONSE":
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded">2. RESPONSE</span>;
      case "OPERATION":
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded">3. OPERATION</span>;
      case "OFFER":
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 rounded">4. OFFER</span>;
      case "PUBLICATION":
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200 rounded">5. PUBLICATION</span>;
      case "VERIFICATION":
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">6. VERIFICATION</span>;
      default:
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-gray-100 text-gray-700 rounded">{stage}</span>;
    }
  };

  const getStatusBadge = (status: AllegroLifecycleStatus) => {
    switch (status) {
      case "VERIFIED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            VERIFIED
          </span>
        );
      case "PUBLISHED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-300">
            <Check className="w-3.5 h-3.5 text-teal-600" />
            PUBLISHED
          </span>
        );
      case "CREATED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-300">
            <Box className="w-3.5 h-3.5 text-sky-600" />
            CREATED
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
            PROCESSING
          </span>
        );
      case "REQUESTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-300">
            <Send className="w-3.5 h-3.5 text-indigo-600" />
            REQUESTED
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300 shadow-sm">
            <X className="w-3.5 h-3.5 text-rose-600" />
            FAILED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  const getLifecycleStepStatus = (currentStatus: AllegroLifecycleStatus, step: "REQUESTED" | "PROCESSING" | "CREATED" | "PUBLISHED" | "VERIFIED") => {
    const order = ["REQUESTED", "PROCESSING", "CREATED", "PUBLISHED", "VERIFIED"];
    const stepIdx = order.indexOf(step);
    
    if (currentStatus === "FAILED") {
      return "failed";
    }
    
    const currentIdx = order.indexOf(currentStatus);
    if (currentIdx >= stepIdx) {
      return "completed";
    } else if (currentIdx === stepIdx - 1) {
      return "active";
    }
    return "pending";
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 text-xs font-bold tracking-wider uppercase bg-orange-100 text-orange-800 rounded-md flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-orange-600 animate-pulse" />
                ALLEGRO REST API DIAGNOSTICS
              </span>
              <span className="px-2.5 py-1 text-xs font-bold tracking-wider uppercase bg-slate-100 text-slate-700 rounded-md">
                STRICT ID ISOLATION
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-2">
              Śledzenie Statusów Operacji & Podział Identyfikatorów
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              Precyzyjna ewidencja każdego kroku cyklu życia ofert Allegro:{" "}
              <strong className="text-slate-800">REQUESTED</strong>,{" "}
              <strong className="text-slate-800">PROCESSING</strong>,{" "}
              <strong className="text-slate-800">CREATED</strong>,{" "}
              <strong className="text-slate-800">PUBLISHED</strong>,{" "}
              <strong className="text-slate-800">VERIFIED</strong> oraz{" "}
              <strong className="text-slate-800">FAILED</strong>, z rygorystyczną separacją identyfikatorów{" "}
              <code className="text-xs bg-slate-100 px-1 py-0.5 rounded font-mono text-indigo-700 font-bold">productId</code>,{" "}
              <code className="text-xs bg-slate-100 px-1 py-0.5 rounded font-mono text-amber-700 font-bold">operationId</code> oraz{" "}
              <code className="text-xs bg-slate-100 px-1 py-0.5 rounded font-mono text-orange-700 font-bold">offerId</code>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Auto-refresh 30s toggle control with live timer */}
            <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  const nextState = !autoRefresh;
                  setAutoRefresh(nextState);
                  if (nextState) {
                    setCountdown(REFRESH_INTERVAL_SEC);
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition ${
                  autoRefresh
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
                }`}
                title={
                  autoRefresh
                    ? "Kliknij, aby zatrzymać automatyczne odświeżanie co 30 sekund"
                    : "Kliknij, aby wznowić automatyczne odświeżanie co 30 sekund"
                }
              >
                {autoRefresh ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-100"></span>
                    </span>
                    <span>Auto 30s</span>
                    <span className="px-1.5 py-0.2 bg-emerald-700/70 text-emerald-100 rounded text-[10px] font-mono font-bold">
                      {countdown}s
                    </span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3 h-3 text-slate-400" />
                    <span>Auto: Wył.</span>
                  </>
                )}
              </button>
            </div>

            {/* Manual refresh button with last timestamp */}
            <button
              onClick={handleManualRefresh}
              disabled={loading || isAutoRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition border border-slate-200 shadow-2xs"
              title={lastRefreshedAt ? `Ostatnia aktualizacja danych: ${lastRefreshedAt}. Kliknij, aby odświeżyć teraz.` : "Kliknij, aby odświeżyć dane aukcji"}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${loading || isAutoRefreshing ? "animate-spin" : ""}`} />
              <span>Odśwież</span>
              {lastRefreshedAt && (
                <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                  ({lastRefreshedAt})
                </span>
              )}
            </button>

            <button
              onClick={exportDiagnosticsJson}
              disabled={history.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition"
              title="Eksportuj pełną historię diagnostyki jako JSON"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              Eksport JSON
            </button>
            <button
              onClick={handleClearHistory}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium rounded-lg transition border border-rose-200"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Wyczyść
            </button>
          </div>
        </div>

        {/* 6 Lifecycle Status Metric Pills */}
        <div className="mt-6 pt-5 border-t border-slate-200">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center justify-between">
            <span>Filtruj według Statusu Cyklu Życia ({history.length} wpisów):</span>
            {statusFilter !== "ALL" && (
              <button
                onClick={() => setStatusFilter("ALL")}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Pokaż wszystkie
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {/* ALL */}
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between ${
                statusFilter === "ALL"
                  ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="text-[10px] uppercase font-bold tracking-wider opacity-75">Wszystkie</div>
              <div className="text-base font-extrabold mt-0.5">{statusCounts.ALL}</div>
            </button>

            {/* REQUESTED */}
            <button
              onClick={() => setStatusFilter("REQUESTED")}
              className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between ${
                statusFilter === "REQUESTED"
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-indigo-50/70 text-indigo-900 border-indigo-200 hover:bg-indigo-100"
              }`}
            >
              <div className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 opacity-80">
                <Send className="w-3 h-3" /> REQUESTED
              </div>
              <div className="text-base font-extrabold mt-0.5">{statusCounts.REQUESTED}</div>
            </button>

            {/* PROCESSING */}
            <button
              onClick={() => setStatusFilter("PROCESSING")}
              className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between ${
                statusFilter === "PROCESSING"
                  ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                  : "bg-amber-50/70 text-amber-900 border-amber-200 hover:bg-amber-100"
              }`}
            >
              <div className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 opacity-80">
                <RefreshCw className="w-3 h-3 animate-spin" /> PROCESSING
              </div>
              <div className="text-base font-extrabold mt-0.5">{statusCounts.PROCESSING}</div>
            </button>

            {/* CREATED */}
            <button
              onClick={() => setStatusFilter("CREATED")}
              className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between ${
                statusFilter === "CREATED"
                  ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                  : "bg-sky-50/70 text-sky-900 border-sky-200 hover:bg-sky-100"
              }`}
            >
              <div className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 opacity-80">
                <Box className="w-3 h-3" /> CREATED
              </div>
              <div className="text-base font-extrabold mt-0.5">{statusCounts.CREATED}</div>
            </button>

            {/* PUBLISHED */}
            <button
              onClick={() => setStatusFilter("PUBLISHED")}
              className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between ${
                statusFilter === "PUBLISHED"
                  ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                  : "bg-teal-50/70 text-teal-900 border-teal-200 hover:bg-teal-100"
              }`}
            >
              <div className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 opacity-80">
                <Check className="w-3 h-3" /> PUBLISHED
              </div>
              <div className="text-base font-extrabold mt-0.5">{statusCounts.PUBLISHED}</div>
            </button>

            {/* VERIFIED */}
            <button
              onClick={() => setStatusFilter("VERIFIED")}
              className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between ${
                statusFilter === "VERIFIED"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-emerald-50/70 text-emerald-900 border-emerald-200 hover:bg-emerald-100"
              }`}
            >
              <div className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 opacity-80">
                <CheckCircle2 className="w-3 h-3" /> VERIFIED
              </div>
              <div className="text-base font-extrabold mt-0.5">{statusCounts.VERIFIED}</div>
            </button>

            {/* FAILED */}
            <button
              onClick={() => setStatusFilter("FAILED")}
              className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between ${
                statusFilter === "FAILED"
                  ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                  : "bg-rose-50/70 text-rose-900 border-rose-200 hover:bg-rose-100"
              }`}
            >
              <div className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 opacity-80">
                <X className="w-3 h-3" /> FAILED
              </div>
              <div className="text-base font-extrabold mt-0.5">{statusCounts.FAILED}</div>
            </button>
          </div>
        </div>
      </div>

      {/* Main View Switcher & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 border border-slate-200 rounded-xl shadow-sm">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode("OFFERS")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
              viewMode === "OFFERS"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-orange-600" />
            Śledzenie Ofert (Per-Offer ID Tracker)
            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 text-[10px] rounded-full">
              {groupedOffersData.length}
            </span>
          </button>
          <button
            onClick={() => setViewMode("STREAM")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
              viewMode === "STREAM"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-indigo-600" />
            Dziennik Zdarzeń (API Stream)
            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 text-[10px] rounded-full">
              {filteredHistory.length}
            </span>
          </button>
          <button
            onClick={() => setViewMode("TEST_RUNNER")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
              viewMode === "TEST_RUNNER"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-teal-600" />
            Runner & [VERIFY OFFER]
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Stage Filter (for Stream) */}
          {viewMode === "STREAM" && (
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-700 font-medium"
            >
              <option value="ALL">Wszystkie etapy</option>
              <option value="REQUEST">1. REQUEST</option>
              <option value="RESPONSE">2. RESPONSE</option>
              <option value="OPERATION">3. OPERATION</option>
              <option value="OFFER">4. OFFER</option>
              <option value="PUBLICATION">5. PUBLICATION</option>
              <option value="VERIFICATION">6. VERIFICATION</option>
            </select>
          )}

          {/* Search Bar */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Szukaj SKU, offerId, productId, opId..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* VIEW 1: PER-OFFER LIFECYCLE TRACKER */}
      {viewMode === "OFFERS" && (
        <div className="space-y-4">
          {groupedOffersData.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
              <Box className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="font-semibold text-slate-700">Brak ofert dla wybranych kryteriów filtrowania.</div>
              <p className="text-xs text-slate-500 mt-1">
                Zmień filtr statusu lub wyczyść zapytanie w wyszukiwarce.
              </p>
            </div>
          ) : (
            groupedOffersData.map((group) => (
              <div
                key={group.key}
                className="bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 transition overflow-hidden"
              >
                {/* Header with Title & Status */}
                <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-700 shadow-2xs">
                      <Box className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm">
                          {group.offerDetails?.title || group.entries[0]?.payload?.name || `Część: ${group.sku}`}
                        </h3>
                        <span className="font-mono text-xs px-2 py-0.5 bg-slate-200/80 text-slate-700 font-semibold rounded">
                          SKU: {group.sku}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-3">
                        <span>External ID: <strong className="font-mono text-slate-700">{group.externalId}</strong></span>
                        <span>Ostatnia aktualizacja: <strong className="text-slate-700">{group.latestTimestamp}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {getStatusBadge(group.latestStatus)}
                    {group.offerId && (
                      <button
                        onClick={() => {
                          setVerifyOfferIdInput(group.offerId!);
                          setViewMode("TEST_RUNNER");
                          handleVerifyOffer(group.offerId);
                        }}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        [VERIFY OFFER]
                      </button>
                    )}
                    {onOpenCentralEditor && (
                      <button
                        onClick={() => onOpenCentralEditor(group.sku)}
                        className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition"
                      >
                        Edytor WMS
                      </button>
                    )}
                  </div>
                </div>

                {/* Body: Strict ID Separation Bar */}
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {/* ID 1: Catalog Product ID */}
                    <div className="bg-white p-2.5 rounded border border-slate-200 flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          1. Allegro Product Catalog ID
                        </div>
                        <div className="font-mono text-xs font-bold text-indigo-700 truncate mt-0.5">
                          {group.productId || <span className="text-slate-400 font-normal italic">Brak (Nowy produkt)</span>}
                        </div>
                      </div>
                      {group.productId && (
                        <button
                          onClick={() => copyToClipboard(group.productId!, `prod-${group.key}`)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition shrink-0"
                          title="Kopiuj productId"
                        >
                          {copiedKey === `prod-${group.key}` ? (
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* ID 2: Async Operation ID */}
                    <div className="bg-white p-2.5 rounded border border-slate-200 flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          2. Async Operation Command UUID
                        </div>
                        <div className="font-mono text-xs font-bold text-amber-700 truncate mt-0.5">
                          {group.operationId || <span className="text-slate-400 font-normal italic">Brak</span>}
                        </div>
                      </div>
                      {group.operationId && (
                        <button
                          onClick={() => copyToClipboard(group.operationId!, `op-${group.key}`)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition shrink-0"
                          title="Kopiuj operationId"
                        >
                          {copiedKey === `op-${group.key}` ? (
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* ID 3: Live Sale Offer ID */}
                    <div className="bg-white p-2.5 rounded border border-slate-200 flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          3. Allegro Live Sale Offer ID
                        </div>
                        <div className="font-mono text-xs font-bold text-orange-700 truncate mt-0.5 flex items-center gap-1.5">
                          {group.offerId ? (
                            <>
                              #{group.offerId}
                              <a
                                href={`https://allegro.pl/oferta/${group.offerId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-400 hover:text-orange-600 transition"
                                title="Otwórz na Allegro"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </>
                          ) : (
                            <span className="text-slate-400 font-normal italic">Oczekuje na utworzenie</span>
                          )}
                        </div>
                      </div>
                      {group.offerId && (
                        <button
                          onClick={() => copyToClipboard(group.offerId!, `offer-${group.key}`)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition shrink-0"
                          title="Kopiuj offerId"
                        >
                          {copiedKey === `offer-${group.key}` ? (
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Visual Lifecycle Stepper */}
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Przebieg Cyklu Życia Oferty:
                    </div>
                    <div className="grid grid-cols-5 gap-1 text-center text-xs">
                      {/* Step 1: REQUESTED */}
                      <div
                        className={`p-2 rounded-md border ${
                          getLifecycleStepStatus(group.latestStatus, "REQUESTED") === "completed"
                            ? "bg-indigo-50 border-indigo-300 text-indigo-900 font-bold"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        }`}
                      >
                        <div className="text-[10px] uppercase">1. REQUESTED</div>
                        <div className="text-[11px] mt-0.5">Żądanie wysłane</div>
                      </div>

                      {/* Step 2: PROCESSING */}
                      <div
                        className={`p-2 rounded-md border ${
                          getLifecycleStepStatus(group.latestStatus, "PROCESSING") === "completed"
                            ? "bg-amber-50 border-amber-300 text-amber-900 font-bold"
                            : group.latestStatus === "PROCESSING"
                            ? "bg-amber-100 border-amber-400 text-amber-900 font-bold animate-pulse"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        }`}
                      >
                        <div className="text-[10px] uppercase">2. PROCESSING</div>
                        <div className="text-[11px] mt-0.5">Kolejka Allegro</div>
                      </div>

                      {/* Step 3: CREATED */}
                      <div
                        className={`p-2 rounded-md border ${
                          getLifecycleStepStatus(group.latestStatus, "CREATED") === "completed"
                            ? "bg-sky-50 border-sky-300 text-sky-900 font-bold"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        }`}
                      >
                        <div className="text-[10px] uppercase">3. CREATED</div>
                        <div className="text-[11px] mt-0.5">Szkic utworzony</div>
                      </div>

                      {/* Step 4: PUBLISHED */}
                      <div
                        className={`p-2 rounded-md border ${
                          getLifecycleStepStatus(group.latestStatus, "PUBLISHED") === "completed"
                            ? "bg-teal-50 border-teal-300 text-teal-900 font-bold"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        }`}
                      >
                        <div className="text-[10px] uppercase">4. PUBLISHED</div>
                        <div className="text-[11px] mt-0.5">Status ACTIVE</div>
                      </div>

                      {/* Step 5: VERIFIED or FAILED */}
                      <div
                        className={`p-2 rounded-md border ${
                          group.latestStatus === "VERIFIED"
                            ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold"
                            : group.latestStatus === "FAILED"
                            ? "bg-rose-50 border-rose-300 text-rose-900 font-bold"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        }`}
                      >
                        <div className="text-[10px] uppercase">
                          {group.latestStatus === "FAILED" ? "BŁĄD / FAILED" : "5. VERIFIED"}
                        </div>
                        <div className="text-[11px] mt-0.5">
                          {group.latestStatus === "FAILED" ? "Niezgodność pól" : "100% Zgodna"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Log message */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
                    <Terminal className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-900">Ostatni komunikat API: </span>
                      {group.latestMessage}
                    </div>
                  </div>

                  {/* Associated Events Count */}
                  {group.entries.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>Zarejestrowano {group.entries.length} zdarzeń dla tej oferty</span>
                      <button
                        onClick={() => {
                          setSelectedEntryDetails(group.entries[0]);
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Podgląd ostatniego payloadu
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* VIEW 2: DETAILED API STREAM TABLE */}
      {viewMode === "STREAM" && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-sm">
                Chronologiczna Historia Żądań i Odpowiedzi API
              </h3>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
                {filteredHistory.length} wpisów
              </span>
            </div>
            <div className="text-xs text-slate-500">
              Posortowane od najnowszego zdarzenia
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Czas</th>
                  <th className="py-3 px-4">Etap</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">SKU / Towar</th>
                  <th className="py-3 px-4">Podział ID (product, op, offer)</th>
                  <th className="py-3 px-4">Komunikat / Kod HTTP</th>
                  <th className="py-3 px-4 text-right">Szczegóły</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Brak zdarzeń diagnostycznych dla wybranych filtrów.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 text-slate-500 font-mono whitespace-nowrap">
                        {item.timestamp}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStageBadge(item.stage)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-800">
                        <div className="font-bold">{item.sku}</div>
                        <div className="text-[10px] text-slate-400">{item.externalId}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] space-y-0.5">
                        {item.productId && (
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 text-[10px]">prod:</span>
                            <span className="text-indigo-600 font-bold">{item.productId}</span>
                          </div>
                        )}
                        {item.operationId && (
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 text-[10px]">op:</span>
                            <span className="text-amber-700">{item.operationId.slice(0, 16)}...</span>
                          </div>
                        )}
                        {item.offerId && (
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 text-[10px]">offer:</span>
                            <span className="text-orange-700 font-bold">#{item.offerId}</span>
                          </div>
                        )}
                        {!item.productId && !item.operationId && !item.offerId && (
                          <span className="text-slate-400 italic text-[10px]">Brak zewnętrznych ID</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-800 max-w-xs">
                        <div className="truncate font-medium" title={item.message}>
                          {item.message}
                        </div>
                        {item.httpStatus && (
                          <span className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                            item.httpStatus < 300
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}>
                            HTTP {item.httpStatus}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedEntryDetails(item)}
                          className="px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded font-medium text-xs inline-flex items-center gap-1 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Inspekcja
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: RUNNER & [VERIFY OFFER] TEST SUITE */}
      {viewMode === "TEST_RUNNER" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Box 1: 7-Step Flow Runner */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-orange-600" />
                Runner 7-Etapowego Cyklu Tworzenia Oferty
              </h3>
              <span className="text-xs bg-orange-50 text-orange-800 font-medium px-2 py-0.5 rounded border border-orange-200">
                Klucze ściśle rozdzielone
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">SKU Magazynu (sku):</label>
                <input
                  type="text"
                  value={testSku}
                  onChange={(e) => setTestSku(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Cena (price PLN):</label>
                <input
                  type="number"
                  value={testPrice}
                  onChange={(e) => setTestPrice(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tytuł oferty (name, max 75):</label>
                <input
                  type="text"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Stan (stock):</label>
                <input
                  type="number"
                  value={testStock}
                  onChange={(e) => setTestStock(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">ID Kategorii Allegro:</label>
                <input
                  type="text"
                  value={testCategory}
                  onChange={(e) => setTestCategory(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-mono"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={simulateMissingOffer}
                  onChange={(e) => setSimulateMissingOffer(e.target.checked)}
                  className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                />
                <span>Symuluj błąd walidacji parametrów obowiązkowych (HTTP 422 - status FAILED)</span>
              </label>
            </div>

            <div className="pt-2">
              <button
                onClick={handleExecute7StepFlow}
                disabled={isExecutingFlow}
                className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
              >
                {isExecutingFlow ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Wykonywanie 7-etapowego cyklu...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Uruchom pełny cykl (REQUEST ➔ VERIFIED)
                  </>
                )}
              </button>
            </div>

            {flowSuccessMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>{flowSuccessMessage}</div>
              </div>
            )}

            {flowErrorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>{flowErrorMessage}</div>
              </div>
            )}
          </div>

          {/* Box 2: [VERIFY OFFER] Live Verification */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                Moduł Weryfikacji Na Żywo [VERIFY OFFER]
              </h3>
              <span className="text-xs text-slate-500 font-mono">GET /sale/offers/&#123;offerId&#125;</span>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Wprowadź offerId (np. 1749281923)..."
                  value={verifyOfferIdInput}
                  onChange={(e) => setVerifyOfferIdInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                />
              </div>
              <button
                onClick={() => handleVerifyOffer()}
                disabled={isVerifying || !verifyOfferIdInput.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg flex items-center gap-2 shadow-sm transition disabled:opacity-50 shrink-0"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Weryfikuję...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    [VERIFY OFFER]
                  </>
                )}
              </button>
            </div>

            {verifyError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>{verifyError}</div>
              </div>
            )}

            {/* Verification Comparison Table */}
            {verificationResult && (
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50">
                <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs">
                  <div className="font-semibold text-slate-800 flex items-center gap-2">
                    <span>Wynik Weryfikacji Oferty:</span>
                    <span className="font-mono text-slate-900 font-bold">#{verificationResult.offerId}</span>
                  </div>
                  <div>
                    {verificationResult.overallMatch ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded">
                        ZGODNOŚĆ 100% (ACTIVE)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold rounded">
                        ROZBIEŻNOŚCI ({verificationResult.discrepancies.length})
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 space-y-2 text-xs">
                  <div className="grid grid-cols-12 font-semibold text-slate-500 pb-1 border-b border-slate-200">
                    <div className="col-span-3">Pole</div>
                    <div className="col-span-4">Oczekiwane (WMS)</div>
                    <div className="col-span-4">Na Allegro</div>
                    <div className="col-span-1 text-center">Status</div>
                  </div>

                  {Object.entries(verificationResult.fields).map(([fieldName, diff]: [string, any]) => (
                    <div key={fieldName} className="grid grid-cols-12 items-center py-1 border-b border-slate-100">
                      <div className="col-span-3 font-semibold text-slate-700 capitalize">{fieldName}</div>
                      <div className="col-span-4 font-mono text-slate-600 truncate" title={String(diff?.expected ?? "")}>
                        {String(diff?.expected ?? "")}
                      </div>
                      <div className="col-span-4 font-mono text-slate-900 truncate font-medium" title={String(diff?.actual ?? "-")}>
                        {diff?.actual !== undefined ? String(diff.actual) : "-"}
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {diff?.match ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <X className="w-4 h-4 text-rose-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {verificationResult.discrepancies.length > 0 && (
                  <div className="p-3 bg-rose-50 border-t border-rose-200 text-xs text-rose-800 space-y-1">
                    <div className="font-bold">Wykryte niezgodności:</div>
                    {verificationResult.discrepancies.map((d, idx) => (
                      <div key={idx} className="flex items-start gap-1">
                        <span className="text-rose-500">•</span>
                        <span>{d}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!verificationResult && !verifyError && (
              <div className="p-4 border border-dashed border-slate-300 rounded-lg text-center text-xs text-slate-500">
                Wprowadź ID oferty i kliknij <strong className="text-slate-700">[VERIFY OFFER]</strong>, aby
                wykonać zapytanie do Allegro REST API i porównać 6 kluczowych pól.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Entry Details Modal / Drawer */}
      {selectedEntryDetails && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">Inspekcja Zdarzenia API:</span>
                {getStageBadge(selectedEntryDetails.stage)}
                {getStatusBadge(selectedEntryDetails.status)}
              </div>
              <button
                onClick={() => setSelectedEntryDetails(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-sm">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 font-mono text-xs">
                <div>
                  <strong className="text-slate-500">Timestamp:</strong> {selectedEntryDetails.timestamp}
                </div>
                <div>
                  <strong className="text-slate-500">SKU / Towar:</strong> {selectedEntryDetails.sku} (External ID: {selectedEntryDetails.externalId})
                </div>
                <div className="pt-1 border-t border-slate-200">
                  <strong className="text-slate-500">1. Product ID (Katalog):</strong>{" "}
                  <span className="text-indigo-700 font-bold">{selectedEntryDetails.productId || "Brak"}</span>
                </div>
                <div>
                  <strong className="text-slate-500">2. Operation ID (UUID):</strong>{" "}
                  <span className="text-amber-700">{selectedEntryDetails.operationId}</span>
                </div>
                {selectedEntryDetails.offerId && (
                  <div>
                    <strong className="text-slate-500">3. Allegro Offer ID:</strong>{" "}
                    <span className="text-orange-700 font-bold">#{selectedEntryDetails.offerId}</span>
                  </div>
                )}
                {selectedEntryDetails.httpStatus && (
                  <div>
                    <strong className="text-slate-500">HTTP Status:</strong>{" "}
                    <span className="font-bold">{selectedEntryDetails.httpStatus}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Komunikat Operacyjny:
                </label>
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded text-slate-800 text-xs">
                  {selectedEntryDetails.message}
                </div>
              </div>

              {selectedEntryDetails.httpResponseSnippet && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    HTTP Response Snippet:
                  </label>
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded text-xs font-mono overflow-x-auto">
                    {selectedEntryDetails.httpResponseSnippet}
                  </pre>
                </div>
              )}

              {selectedEntryDetails.payload && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Zarejestrowany Payload:
                  </label>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded text-xs font-mono overflow-x-auto">
                    {JSON.stringify(selectedEntryDetails.payload, null, 2)}
                  </pre>
                </div>
              )}

              {selectedEntryDetails.verificationComparison && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Raport Weryfikacji Pól:
                  </label>
                  <pre className="p-3 bg-slate-900 text-blue-300 rounded text-xs font-mono overflow-x-auto">
                    {JSON.stringify(selectedEntryDetails.verificationComparison, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end gap-2">
              {selectedEntryDetails.offerId && (
                <button
                  onClick={() => {
                    const id = selectedEntryDetails.offerId;
                    setSelectedEntryDetails(null);
                    setViewMode("TEST_RUNNER");
                    setVerifyOfferIdInput(id!);
                    handleVerifyOffer(id);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded text-xs flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Weryfikuj tę ofertę
                </button>
              )}
              <button
                onClick={() => setSelectedEntryDetails(null)}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded text-xs"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
