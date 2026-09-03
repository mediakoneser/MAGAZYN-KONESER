import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  ShieldCheck,
  Key,
  ExternalLink,
  Lock,
  Server,
  Clock,
  Activity,
  Copy,
  Check,
  Terminal,
  Sliders,
  Globe,
  Layers,
  Store,
  Trash2,
  HelpCircle,
  ArrowUpRight,
  Info,
  Radio,
  Search,
  ChevronDown,
  ChevronRight,
  Eye,
  Code,
  Download,
  Bug,
  CheckSquare,
  Sparkles,
  ArrowRight,
  Filter,
} from "lucide-react";
import {
  AllegroDiagnosticEntry,
  AllegroLifecycleStatus,
  DiagnosticStage,
  OfferVerificationResult,
} from "../types/marketplaceTypes";

export interface IntegrationStatusResponse {
  success: boolean;
  timestamp: string;
  allegro: {
    connected: boolean;
    status: "connected" | "disconnected" | "expired" | "not_configured";
    sellerLogin: string;
    sellerName: string;
    environment: "sandbox" | "production";
    hasAccessToken: boolean;
    hasRefreshToken: boolean;
    hasCredentials: boolean;
    clientIdMasked: string;
    tokenExpiresAt: number | null;
    tokenExpiresInMinutes: number | null;
    isExpired: boolean;
    lastTestedAt: string | null;
    lastPingMs: number | null;
    errorMessage: string | null;
    scopes: string[];
    pendingDeviceCode?: {
      user_code: string;
      verification_uri: string;
      verification_uri_complete: string;
      expiresInSeconds: number;
    } | null;
  };
  baselinker: {
    connected: boolean;
    status: "connected" | "disconnected" | "not_configured";
    hasToken: boolean;
    tokenMasked: string;
    sellerName: string;
    inventoriesCount: number;
    lastTestedAt: string | null;
    lastPingMs: number | null;
    errorMessage: string | null;
  };
  shopgold: {
    connected: boolean;
    status: "connected" | "disconnected" | "not_configured";
    hasKey: boolean;
    keyMasked: string;
    storeName: string;
    apiUrl: string;
    shopVersion: string;
    lastTestedAt: string | null;
    lastPingMs: number | null;
    errorMessage: string | null;
  };
}

interface LogEntry {
  id: string;
  timestamp: string;
  channel: "allegro" | "baselinker" | "shopgold" | "all";
  type: "success" | "error" | "info";
  message: string;
  pingMs?: number;
}

interface AllegroIntegrationDashboardProps {
  onOpenCentralEditor?: (sku: string) => void;
}

export const AllegroIntegrationDashboard: React.FC<AllegroIntegrationDashboardProps> = ({
  onOpenCentralEditor,
}) => {
  // Status state from backend
  const [status, setStatus] = useState<IntegrationStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  // Live Console Logs
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: "init-1",
      timestamp: new Date().toLocaleTimeString("pl-PL"),
      channel: "all",
      type: "info",
      message: "Zainicjalizowano Centrum Integracji WMS. Połączenia zarządzane wyłącznie przez bezpieczny Backend Token Vault.",
    },
  ]);

  // Device Code Flow State
  const [deviceFlow, setDeviceFlow] = useState<{
    userCode: string;
    verificationUri: string;
    verificationUriComplete: string;
    expiresInSeconds: number;
    isPolling: boolean;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Configuration Modals
  const [configTarget, setConfigTarget] = useState<"allegro" | "baselinker" | "shopgold" | null>(null);
  const [configForm, setConfigForm] = useState({
    clientId: "",
    clientSecret: "",
    sandbox: false,
    sellerName: "PHU U Konesera Grzegorz Kuźma",
    baselinkerToken: "",
    shopgoldUrl: "https://sklep.ukonesera.pl/api/v1",
    shopgoldKey: "",
    shopgoldName: "sklep.ukonesera.pl",
  });

  // =========================================================================
  // ALLEGRO API DIAGNOSTICS STATE
  // =========================================================================
  const [diagnosticsHistory, setDiagnosticsHistory] = useState<AllegroDiagnosticEntry[]>([]);
  const [activeOffers, setActiveOffers] = useState<any[]>([]);
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState(false);
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [diagSearchQuery, setDiagSearchQuery] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<AllegroDiagnosticEntry | null>(null);

  // Offer Verification State
  const [verifyOfferIdInput, setVerifyOfferIdInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<OfferVerificationResult | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // 7-Step Offer Pipeline Test Runner State
  const [isExecutingFlow, setIsExecutingFlow] = useState(false);
  const [flowSuccessMessage, setFlowSuccessMessage] = useState<string | null>(null);
  const [flowErrorMessage, setFlowErrorMessage] = useState<string | null>(null);
  const [showTestRunner, setShowTestRunner] = useState(false);

  const [testSku, setTestSku] = useState("MAG-ALT-02");
  const [testTitle, setTestTitle] = useState("Alternator Bosch 140A VW Golf VI 2.0 TDI 03L903023");
  const [testPrice, setTestPrice] = useState(320);
  const [testStock, setTestStock] = useState(1);
  const [testCategory, setTestCategory] = useState("50849");
  const [simulateMissingOffer, setSimulateMissingOffer] = useState(false);

  const addLog = useCallback((channel: LogEntry["channel"], type: LogEntry["type"], message: string, pingMs?: number) => {
    setLogs((prev) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date().toLocaleTimeString("pl-PL"),
        channel,
        type,
        message,
        pingMs,
      },
      ...prev.slice(0, 49),
    ]);
  }, []);

  // Safe JSON parser to avoid "Unexpected token 'R'" when receiving non-JSON/rate limit responses
  const parseSafeJson = async (res: Response) => {
    try {
      const ct = res.headers.get("content-type");
      if (!ct || !ct.includes("application/json")) {
        return null;
      }
      return await res.json();
    } catch {
      return null;
    }
  };

  // Fetch status from backend (no tokens returned to browser)
  const fetchStatus = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const res = await fetch("/api/integrations/status");
      if (res.ok) {
        const data: IntegrationStatusResponse | null = await parseSafeJson(res);
        if (data) {
          setStatus(data);
        }
      } else {
        addLog("all", "error", `Status integracji (kod ${res.status})`);
      }
    } catch (err: any) {
      addLog("all", "error", `Błąd sieci przy sprawdzaniu statusu: ${err?.message || err}`);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [addLog]);

  // Fetch diagnostics history from backend
  const fetchDiagnostics = useCallback(async () => {
    setIsLoadingDiagnostics(true);
    try {
      const res = await fetch("/api/allegro/diagnostics");
      if (res.ok) {
        const data = await parseSafeJson(res);
        if (data && data.success) {
          setDiagnosticsHistory(data.history || []);
          setActiveOffers(data.offers || []);
          if (data.offers && data.offers.length > 0) {
            setVerifyOfferIdInput((prev) => (prev ? prev : data.offers[0].offerId));
          }
        }
      }
    } catch (e: any) {
      console.warn("Failed to load Allegro diagnostics:", e);
    } finally {
      setIsLoadingDiagnostics(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchDiagnostics();
    const timer = setInterval(() => {
      fetchStatus(false);
    }, 45000);
    return () => clearInterval(timer);
  }, [fetchStatus, fetchDiagnostics]);

  // 1. Test Single Connection
  const handleTestConnection = async (channel: "allegro" | "baselinker" | "shopgold") => {
    setActiveAction(`test-${channel}`);
    const channelNames = {
      allegro: "Allegro REST API",
      baselinker: "BaseLinker API",
      shopgold: "ShopGold E-Commerce",
    };

    try {
      const res = await fetch(`/api/integrations/${channel}/test`, { method: "POST" });
      const data = await parseSafeJson(res);

      if (res.ok && data?.success) {
        addLog(channel, "success", `${channelNames[channel]}: ${data.message}`, data.pingMs);
      } else {
        addLog(channel, "error", `${channelNames[channel]}: Błąd testu - ${data?.error || `Status HTTP ${res.status}`}`);
      }
      fetchStatus(false);
    } catch (err: any) {
      addLog(channel, "error", `${channelNames[channel]}: Wyjątek testu połączenia - ${err?.message || err}`);
    } finally {
      setActiveAction(null);
    }
  };

  // 2. Test All at Once (Benchmark)
  const handleTestAll = async () => {
    setActiveAction("test-all");
    try {
      const res = await fetch("/api/integrations/test-all", { method: "POST" });
      const data = await parseSafeJson(res);

      if (res.ok && data?.success) {
        addLog("all", "success", `Benchmark zakończony pomyślnie. Wymiana pakietów z 3 serwerami zewnętrznymi poprawna.`);
        if (data.results?.allegro) addLog("allegro", "info", `Allegro REST API ping: ${data.results.allegro.pingMs}ms`, data.results.allegro.pingMs);
        if (data.results?.baselinker) addLog("baselinker", "info", `BaseLinker Multi-Channel ping: ${data.results.baselinker.pingMs}ms`, data.results.baselinker.pingMs);
        if (data.results?.shopgold) addLog("shopgold", "info", `ShopGold E-Commerce ping: ${data.results.shopgold.pingMs}ms`, data.results.shopgold.pingMs);
      } else {
        addLog("all", "error", `Błąd wykonywania testu benchmarku (${res.status})`);
      }
      fetchStatus(false);
    } catch (err: any) {
      addLog("all", "error", `Błąd testu wszystkich połączeń: ${err?.message || err}`);
    } finally {
      setActiveAction(null);
    }
  };

  // 3. Allegro Silent Refresh Token (Server-Side)
  const handleRefreshAllegroToken = async () => {
    setActiveAction("refresh-allegro");
    try {
      const res = await fetch("/api/integrations/allegro/refresh-token", { method: "POST" });
      const data = await parseSafeJson(res);

      if (res.ok && data?.success) {
        addLog("allegro", "success", `Token Allegro odświeżony przez backend! Nowy czas ważności: ${data.expiresInMinutes} min.`);
      } else {
        addLog("allegro", "error", `Błąd odświeżania tokena: ${data?.error || "Odrzucono przez serwer auth"}`);
      }
      fetchStatus(false);
    } catch (err: any) {
      addLog("allegro", "error", `Wyjątek odświeżania tokena: ${err?.message || err}`);
    } finally {
      setActiveAction(null);
    }
  };

  // 4. Start Allegro Device Flow (Server-side generated)
  const handleStartDeviceFlow = async () => {
    setActiveAction("init-device");
    try {
      const res = await fetch("/api/integrations/allegro/init-device-flow", { method: "POST" });
      const data = await parseSafeJson(res);

      if (res.ok && data?.success) {
        setDeviceFlow({
          userCode: data.user_code,
          verificationUri: data.verification_uri,
          verificationUriComplete: data.verification_uri_complete,
          expiresInSeconds: data.expires_in || 900,
          isPolling: true,
        });
        addLog("allegro", "info", `Zainicjowano procedurę Device Code. Kod autoryzacji: ${data.user_code}`);
      } else {
        addLog("allegro", "error", `Nie udało się rozpocząć Device Code Flow: ${data?.error || "Błąd serwera"}`);
      }
    } catch (err: any) {
      addLog("allegro", "error", `Wyjątek przy inicjowaniu Device Flow: ${err?.message || err}`);
    } finally {
      setActiveAction(null);
    }
  };

  // Polling hook for Device Code
  useEffect(() => {
    if (!deviceFlow || !deviceFlow.isPolling) return;

    let pollInterval: any = null;
    let countdownInterval: any = null;

    countdownInterval = setInterval(() => {
      setDeviceFlow((prev) => {
        if (!prev) return null;
        if (prev.expiresInSeconds <= 1) {
          clearInterval(countdownInterval);
          clearInterval(pollInterval);
          addLog("allegro", "error", "Czas na wprowadzenie kodu Device Code minął (15 min).");
          return null;
        }
        return { ...prev, expiresInSeconds: prev.expiresInSeconds - 1 };
      });
    }, 1000);

    pollInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/integrations/allegro/poll-device-token", { method: "POST" });
        const data = await parseSafeJson(res);

        if (res.ok && data?.status === "authorized") {
          clearInterval(pollInterval);
          clearInterval(countdownInterval);
          setDeviceFlow(null);
          addLog("allegro", "success", "Autoryzacja Allegro zakończona sukcesem! Token bezpiecznie zapisany w backendzie.");
          fetchStatus();
        } else if (data?.status === "pending") {
          // Keep polling silently
        } else if (data?.status === "error") {
          clearInterval(pollInterval);
          clearInterval(countdownInterval);
          setDeviceFlow(null);
          addLog("allegro", "error", `Błąd autoryzacji: ${data?.error || "Wystąpił problem z kodem"}`);
        }
      } catch (e) {
        // network glitch, continue
      }
    }, 4500);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [deviceFlow?.isPolling, addLog, fetchStatus]);

  // 5. Disconnect Integration
  const handleDisconnect = async (channel: "allegro" | "baselinker" | "shopgold") => {
    if (!window.confirm(`Czy na pewno chcesz usunąć autoryzację i tokeny dla ${channel.toUpperCase()} z backendu?`)) {
      return;
    }
    setActiveAction(`disconnect-${channel}`);
    try {
      const res = await fetch(`/api/integrations/${channel}/disconnect`, { method: "POST" });
      const data = await parseSafeJson(res);
      if (res.ok) {
        addLog(channel, "info", data?.message || `Rozłączono ${channel}`);
        fetchStatus();
      }
    } catch (err: any) {
      addLog(channel, "error", `Błąd rozłączania ${channel}: ${err?.message || err}`);
    } finally {
      setActiveAction(null);
    }
  };

  // 6. Save Configuration to Backend
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configTarget) return;

    setActiveAction("save-config");
    try {
      if (configTarget === "allegro") {
        const res = await fetch("/api/integrations/allegro/configure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: configForm.clientId,
            clientSecret: configForm.clientSecret,
            sandbox: configForm.sandbox,
            sellerName: configForm.sellerName,
          }),
        });
        const data = await parseSafeJson(res);
        if (res.ok) {
          addLog("allegro", "success", data?.message || "Konfiguracja Allegro zapisana na serwerze");
          setConfigTarget(null);
          fetchStatus();
        } else {
          addLog("allegro", "error", data?.error || "Błąd zapisu danych Allegro");
        }
      } else if (configTarget === "baselinker") {
        const res = await fetch("/api/integrations/baselinker/configure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiToken: configForm.baselinkerToken }),
        });
        const data = await parseSafeJson(res);
        if (res.ok) {
          addLog("baselinker", "success", data?.message || "Token BaseLinker zapisany na serwerze");
          setConfigTarget(null);
          fetchStatus();
        } else {
          addLog("baselinker", "error", data?.error || "Błąd zapisu tokena BaseLinker");
        }
      } else if (configTarget === "shopgold") {
        const res = await fetch("/api/integrations/shopgold/configure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiUrl: configForm.shopgoldUrl,
            apiKey: configForm.shopgoldKey,
            storeName: configForm.shopgoldName,
          }),
        });
        const data = await parseSafeJson(res);
        if (res.ok) {
          addLog("shopgold", "success", data?.message || "Ustawienia ShopGold zapisane na serwerze");
          setConfigTarget(null);
          fetchStatus();
        } else {
          addLog("shopgold", "error", data?.error || "Błąd zapisu danych ShopGold");
        }
      }
    } catch (err: any) {
      addLog("all", "error", `Błąd zapisu konfiguracji: ${err?.message || err}`);
    } finally {
      setActiveAction(null);
    }
  };

  // 7. Allegro Diagnostics: Clear History
  const handleClearDiagnostics = async () => {
    if (!window.confirm("Czy na pewno chcesz wyczyścić historię diagnostyki operacji Allegro API?")) return;
    try {
      const res = await fetch("/api/allegro/diagnostics", { method: "DELETE" });
      if (res.ok) {
        setDiagnosticsHistory([]);
        addLog("allegro", "info", "Wyczyszczono rejestr diagnostyczny Allegro API");
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  // 8. Allegro Diagnostics: 7-Step Offer Pipeline Test
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

      const data = await parseSafeJson(res);
      if (res.ok && data?.success) {
        setFlowSuccessMessage(
          `Sukces: 7-etapowy proces zakończony pomyślnie! Utworzono i zweryfikowano ofertę #${data.typedIds?.offerId}. Wszystkie 6 pól zgodne.`
        );
        setVerifyOfferIdInput(data.typedIds?.offerId || "");
        addLog("allegro", "success", `Utworzono i zweryfikowano ofertę #${data.typedIds?.offerId} w 7-etapowym cyklu`);
      } else {
        setFlowErrorMessage(data?.error || data?.message || "Błąd wykonania procedury tworzenia oferty.");
        addLog("allegro", "error", `Błąd cyklu oferty: ${data?.error || data?.message || "Błąd"}`);
      }
      await fetchDiagnostics();
    } catch (err: any) {
      setFlowErrorMessage(err?.message || "Błąd połączenia z serwerem");
    } finally {
      setIsExecutingFlow(false);
    }
  };

  // 9. Allegro Diagnostics: Verify Offer Fields
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

      const data = await parseSafeJson(res);
      if (res.ok && data?.success) {
        setVerificationResult(data.verification);
        addLog("allegro", "success", `Pomyślnie zweryfikowano ofertę #${idToVerify} w Allegro REST API`);
      } else {
        setVerifyError(data?.error || "Weryfikacja nie powiodła się: Oferta nie istnieje lub wystąpiły rozbieżności.");
        if (data?.verification) {
          setVerificationResult(data.verification);
        }
        addLog("allegro", "error", `Rozbieżność oferty #${idToVerify}`);
      }
      await fetchDiagnostics();
    } catch (err: any) {
      setVerifyError(err?.message || "Błąd sieci podczas weryfikacji oferty.");
    } finally {
      setIsVerifying(false);
    }
  };

  // 10. Export Diagnostics to JSON
  const handleExportDiagnostics = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(diagnosticsHistory, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `allegro_api_diagnostics_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const allegro = status?.allegro;
  const baselinker = status?.baselinker;
  const shopgold = status?.shopgold;

  const activeChannelsCount =
    (allegro?.connected ? 1 : 0) + (baselinker?.connected ? 1 : 0) + (shopgold?.connected ? 1 : 0);

  // Filtered diagnostics items
  const filteredDiagnostics = diagnosticsHistory.filter((item) => {
    if (stageFilter !== "ALL" && item.stage !== stageFilter) return false;
    if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
    if (diagSearchQuery.trim()) {
      const q = diagSearchQuery.toLowerCase();
      const matchSku = item.sku?.toLowerCase().includes(q);
      const matchOffer = item.offerId?.toLowerCase().includes(q);
      const matchOp = item.operationId?.toLowerCase().includes(q);
      const matchExt = item.externalId?.toLowerCase().includes(q);
      const matchMsg = item.message?.toLowerCase().includes(q);
      if (!matchSku && !matchOffer && !matchOp && !matchExt && !matchMsg) return false;
    }
    return true;
  });

  const verifiedCount = diagnosticsHistory.filter((d) => d.status === "VERIFIED").length;
  const failedCount = diagnosticsHistory.filter((d) => d.status === "FAILED").length;

  return (
    <div className="space-y-7" id="allegro-integration-dashboard">
      {/* 1. GŁÓWNY BANNER BEZPIECZEŃSTWA & ARCHITEKTURY TOKENÓW */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-[#070b14] border border-amber-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-amber-400 text-slate-950 rounded-xl shadow-md shrink-0 mt-0.5">
              <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-black text-white font-mono tracking-tight">
                  Centrum Integracji API & Bezpieczny Token Vault
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  {activeChannelsCount}/3 Aktywne Kanały
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 font-mono flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-400" />
                  Backend-Only Storage
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                Wszystkie tokeny OAuth, klucze Client Secret i API są przechowywane i odświeżane{" "}
                <strong className="text-amber-300 font-semibold">wyłącznie po stronie bezpiecznego backendu Node.js</strong>.
                Przeglądarka internetowa nigdy nie otrzymuje surowych sekretów, co gwarantuje pełną ochronę przed wyciekiem danych konta sprzedawcy.
              </p>
            </div>
          </div>

          {/* SZYBKIE AKCJE GLOBALNE */}
          <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end shrink-0">
            <button
              onClick={() => {
                fetchStatus(true);
                fetchDiagnostics();
              }}
              disabled={isLoading || isLoadingDiagnostics}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Odpytaj serwer o świeże statusy"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading || isLoadingDiagnostics ? "animate-spin text-amber-400" : ""}`} />
              <span>Odśwież Statusy</span>
            </button>

            <button
              onClick={handleTestAll}
              disabled={activeAction === "test-all"}
              className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 font-black rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-yellow-500/10 cursor-pointer disabled:opacity-50"
            >
              <Activity className={`w-4 h-4 ${activeAction === "test-all" ? "animate-pulse" : ""}`} />
              <span>Benchmark 3 Kanałów (Ping Test)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. KARTY STATUSÓW DLA 3 PLATFORM (ALLEGRO, BASELINKER, SHOPGOLD) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* KARTA 1: ALLEGRO REST API */}
        <div className="bg-[#0b1120] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl pointer-events-none"></div>

          <div>
            {/* Header karty */}
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#ff5a00]/10 border border-[#ff5a00]/30 flex items-center justify-center text-[#ff5a00] font-black text-sm">
                  A
                </div>
                <div>
                  <h3 className="text-sm font-black text-white font-mono flex items-center gap-1.5">
                    <span>Allegro REST API</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Marketplace & Katalog Produktów</p>
                </div>
              </div>

              {/* Status Pill */}
              {allegro?.connected ? (
                <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold rounded-lg flex items-center gap-1.5 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Połączony
                </span>
              ) : allegro?.status === "expired" ? (
                <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold rounded-lg flex items-center gap-1.5 font-mono">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  Wygasły
                </span>
              ) : (
                <span className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] font-bold rounded-lg flex items-center gap-1.5 font-mono">
                  <XCircle className="w-3 h-3 text-rose-400" />
                  Rozłączony
                </span>
              )}
            </div>

            {/* Metadane */}
            <div className="space-y-2 bg-[#030712] p-3 rounded-xl border border-slate-800/80 text-xs font-mono mb-4">
              <div className="flex items-center justify-between text-slate-400">
                <span>Konto Sprzedawcy:</span>
                <strong className="text-white font-bold">@{allegro?.sellerLogin || "niezalogowany"}</strong>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Środowisko:</span>
                <span className="text-amber-400 font-bold uppercase text-[10px]">
                  {allegro?.environment === "sandbox" ? "Allegro Sandbox" : "Produkcja (allegro.pl)"}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Client ID (Serwer):</span>
                <span className="text-slate-300">{allegro?.clientIdMasked || "Brak klucza"}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800">
                <span>Ważność Tokena OAuth:</span>
                {allegro?.tokenExpiresInMinutes !== null && allegro?.tokenExpiresInMinutes !== undefined ? (
                  <span className="text-emerald-400 font-bold">
                    {Math.floor(allegro.tokenExpiresInMinutes / 60)}h {allegro.tokenExpiresInMinutes % 60}m
                  </span>
                ) : (
                  <span className="text-slate-500">Brak aktywnego tokena</span>
                )}
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Ostatni ping:</span>
                <span className="text-teal-400 font-bold">
                  {allegro?.lastPingMs ? `${allegro.lastPingMs} ms` : "—"}
                </span>
              </div>
            </div>

            {/* Zakresy Scopes */}
            <div className="mb-4">
              <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider mb-1.5">
                Uprawnienia OAuth (Scopes):
              </div>
              <div className="flex flex-wrap gap-1">
                {(allegro?.scopes || ["sale:offers:write", "sale:offers:read"]).map((s) => (
                  <span
                    key={s}
                    className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-mono border border-slate-700"
                  >
                    {s.replace("allegro:api:", "")}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Przyciski Akcji */}
          <div className="space-y-2 pt-3 border-t border-slate-800/80">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleTestConnection("allegro")}
                disabled={activeAction === "test-allegro"}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Activity className={`w-3.5 h-3.5 ${activeAction === "test-allegro" ? "animate-spin text-amber-400" : "text-emerald-400"}`} />
                <span>Test Ping /me</span>
              </button>

              <button
                onClick={handleRefreshAllegroToken}
                disabled={activeAction === "refresh-allegro"}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Wymuś natychmiastowe odświeżenie tokena przez backend"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${activeAction === "refresh-allegro" ? "animate-spin text-amber-400" : "text-cyan-400"}`} />
                <span>Odśwież Token</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleStartDeviceFlow}
                disabled={activeAction === "init-device"}
                className="flex-1 px-3 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black rounded-lg text-xs transition flex items-center justify-center gap-1.5 shadow cursor-pointer disabled:opacity-50"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Połącz (Device Code)</span>
              </button>

              <button
                onClick={() => {
                  setConfigForm((prev) => ({
                    ...prev,
                    sellerName: allegro?.sellerName || prev.sellerName,
                    sandbox: allegro?.environment === "sandbox",
                  }));
                  setConfigTarget("allegro");
                }}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition cursor-pointer"
                title="Zarządzaj kluczami Allegro na serwerze"
              >
                <Sliders className="w-4 h-4" />
              </button>

              {allegro?.connected && (
                <button
                  onClick={() => handleDisconnect("allegro")}
                  className="p-2 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded-lg text-xs transition cursor-pointer"
                  title="Rozłącz konto i usuń tokeny"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* KARTA 2: BASELINKER API */}
        <div className="bg-[#0b1120] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>

          <div>
            {/* Header karty */}
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black text-sm">
                  BL
                </div>
                <div>
                  <h3 className="text-sm font-black text-white font-mono flex items-center gap-1.5">
                    <span>BaseLinker API</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Multi-Channel & Inwentaryzacja</p>
                </div>
              </div>

              {baselinker?.connected ? (
                <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold rounded-lg flex items-center gap-1.5 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Połączony
                </span>
              ) : (
                <span className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] font-bold rounded-lg flex items-center gap-1.5 font-mono">
                  <XCircle className="w-3 h-3 text-rose-400" />
                  Brak Klucza
                </span>
              )}
            </div>

            {/* Metadane */}
            <div className="space-y-2 bg-[#030712] p-3 rounded-xl border border-slate-800/80 text-xs font-mono mb-4">
              <div className="flex items-center justify-between text-slate-400">
                <span>Magazynier WMS:</span>
                <strong className="text-white font-bold">{baselinker?.sellerName || "PHU U Konesera"}</strong>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Katalogi/Inwentarze:</span>
                <span className="text-cyan-400 font-bold">{baselinker?.inventoriesCount || 3} katalogi</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Token API (Serwer):</span>
                <span className="text-slate-300">{baselinker?.tokenMasked || "Brak"}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800">
                <span>Ostatni ping API:</span>
                <span className="text-teal-400 font-bold">
                  {baselinker?.lastPingMs ? `${baselinker.lastPingMs} ms` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Ostatni test:</span>
                <span className="text-slate-400 text-[11px]">{baselinker?.lastTestedAt || "Nigdy"}</span>
              </div>
            </div>

            {/* Informacja o kanałach w BaseLinker */}
            <div className="p-2.5 bg-blue-950/30 border border-blue-800/40 rounded-xl text-[11px] text-blue-300 leading-relaxed mb-4">
              Synchronizuje stany magazynowe z Mysłakowic z serwisami: <strong>Allegro, Ovoko, OLX, eBay</strong> oraz
              wystawia etykiety kurierskie DPD/InPost.
            </div>
          </div>

          {/* Przyciski Akcji */}
          <div className="space-y-2 pt-3 border-t border-slate-800/80">
            <button
              onClick={() => handleTestConnection("baselinker")}
              disabled={activeAction === "test-baselinker"}
              className="w-full px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Activity className={`w-3.5 h-3.5 ${activeAction === "test-baselinker" ? "animate-spin text-amber-400" : "text-blue-400"}`} />
              <span>Testuj Połączenie z BaseLinker</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setConfigTarget("baselinker")}
                className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Wprowadź Token API</span>
              </button>

              {baselinker?.connected && (
                <button
                  onClick={() => handleDisconnect("baselinker")}
                  className="p-1.5 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded-lg text-xs transition cursor-pointer"
                  title="Rozłącz"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* KARTA 3: SHOPGOLD E-COMMERCE */}
        <div className="bg-[#0b1120] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>

          <div>
            {/* Header karty */}
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-sm">
                  SG
                </div>
                <div>
                  <h3 className="text-sm font-black text-white font-mono flex items-center gap-1.5">
                    <span>ShopGold Enterprise</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">sklep.ukonesera.pl</p>
                </div>
              </div>

              {shopgold?.connected ? (
                <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold rounded-lg flex items-center gap-1.5 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Połączony
                </span>
              ) : (
                <span className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] font-bold rounded-lg flex items-center gap-1.5 font-mono">
                  <XCircle className="w-3 h-3 text-rose-400" />
                  Rozłączony
                </span>
              )}
            </div>

            {/* Metadane */}
            <div className="space-y-2 bg-[#030712] p-3 rounded-xl border border-slate-800/80 text-xs font-mono mb-4">
              <div className="flex items-center justify-between text-slate-400">
                <span>Adres URL API:</span>
                <span className="text-white font-bold truncate max-w-[170px]" title={shopgold?.apiUrl}>
                  {shopgold?.apiUrl || "https://sklep.ukonesera.pl"}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Wersja Oprogramowania:</span>
                <span className="text-amber-400 font-bold">{shopgold?.shopVersion || "ShopGold 2026.2"}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Klucz API Sklepu:</span>
                <span className="text-slate-300">{shopgold?.keyMasked || "Brak"}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800">
                <span>Ostatni ping:</span>
                <span className="text-teal-400 font-bold">
                  {shopgold?.lastPingMs ? `${shopgold.lastPingMs} ms` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Ostatni test:</span>
                <span className="text-slate-400 text-[11px]">{shopgold?.lastTestedAt || "Nigdy"}</span>
              </div>
            </div>

            {/* Informacja o sklepie */}
            <div className="p-2.5 bg-amber-950/20 border border-amber-800/30 rounded-xl text-[11px] text-amber-300 leading-relaxed mb-4 flex items-center justify-between gap-2">
              <span>Bezpośrednia sprzedaż bez prowizji marketplace (0% prowizji Allegro).</span>
              <a
                href={shopgold?.apiUrl?.replace("/api/v1", "") || "https://sklep.ukonesera.pl"}
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 hover:text-amber-300 shrink-0"
              >
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Przyciski Akcji */}
          <div className="space-y-2 pt-3 border-t border-slate-800/80">
            <button
              onClick={() => handleTestConnection("shopgold")}
              disabled={activeAction === "test-shopgold"}
              className="w-full px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Activity className={`w-3.5 h-3.5 ${activeAction === "test-shopgold" ? "animate-spin text-amber-400" : "text-amber-400"}`} />
              <span>Testuj Połączenie ze Sklepem</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setConfigTarget("shopgold")}
                className="flex-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Store className="w-3.5 h-3.5" />
                <span>Konfiguracja Sklepu</span>
              </button>

              {shopgold?.connected && (
                <button
                  onClick={() => handleDisconnect("shopgold")}
                  className="p-1.5 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded-lg text-xs transition cursor-pointer"
                  title="Rozłącz"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. MODAL / BANNER AKTYWNEJ AUTORYZACJI DEVICE CODE FLOW */}
      {deviceFlow && (
        <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-black border-2 border-amber-500/60 rounded-2xl p-6 shadow-2xl animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-400 text-slate-950 rounded-xl font-black shrink-0">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white font-mono flex items-center gap-2">
                  <span>Autoryzacja Konta Allegro w Toku (OAuth 2.0 Device Code)</span>
                  <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 text-xs rounded-full font-bold">
                    Oczekiwanie na zatwierdzenie
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Przepisz lub zatwierdź poniższy kod na stronie Allegro. Po kliknięciu &quot;Kontynuuj&quot; serwer
                  automatycznie pobierze i zabezpieczy token.
                </p>
              </div>
            </div>

            <button
              onClick={() => setDeviceFlow(null)}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition"
            >
              Anuluj
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="bg-[#030712] p-5 rounded-xl border border-amber-500/40 text-center">
              <span className="text-xs text-slate-400 uppercase font-mono tracking-wider block mb-1">
                Twój Jednorazowy Kod Użytkownika:
              </span>
              <div className="flex items-center justify-center gap-3 my-2">
                <span className="text-3xl sm:text-4xl font-black text-amber-400 font-mono tracking-widest selection:bg-amber-400 selection:text-black">
                  {deviceFlow.userCode}
                </span>
                <button
                  onClick={() => copyToClipboard(deviceFlow.userCode)}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition cursor-pointer"
                  title="Skopiuj kod"
                >
                  {copiedCode ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 mt-2">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  Czas na zatwierdzenie:{" "}
                  <strong className="text-white">
                    {Math.floor(deviceFlow.expiresInSeconds / 60)}:
                    {String(deviceFlow.expiresInSeconds % 60).padStart(2, "0")}
                  </strong>
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <a
                href={deviceFlow.verificationUriComplete}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 px-4 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 font-black rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20 cursor-pointer"
              >
                <span>Otwórz Stronę Logowania Allegro</span>
                <ExternalLink className="w-4 h-4 stroke-[2.5]" />
              </a>

              <div className="p-3 bg-slate-850 rounded-xl border border-slate-700 text-xs text-slate-300 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                <span>
                  Backend automatycznie odpytuje serwer autoryzacji. Nie zamykaj tej strony do momentu uzyskania
                  potwierdzenia.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODUŁ 'ALLEGRO API DIAGNOSTICS' Z HISTORIĄ OPERACJI REQUEST/RESPONSE   */}
      {/* ========================================================================= */}
      <div className="bg-[#0b1120] border border-orange-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10"></div>

        {/* NAGŁÓWEK MODUŁU DIAGNOSTYKI */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-slate-800 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-500/10 border border-orange-500/30 rounded-xl text-orange-400 shrink-0">
              <Bug className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-lg font-black text-white font-mono tracking-tight flex items-center gap-2">
                  <span>ALLEGRO API DIAGNOSTICS</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-300 border border-orange-500/30 uppercase tracking-widest font-mono">
                    REQUEST / RESPONSE AUDIT LOG
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pełny rejestr operacji sieciowych HTTP, weryfikacji tokenów, izolacji identyfikatorów (SKU, offerId, operationId) oraz walidacji statusu 7-etapowego cyklu publikacji.
              </p>
            </div>
          </div>

          {/* PASEK LICZNIKÓW I PRZYCISKÓW AKCJI DIAGNOSTYKI */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-end shrink-0 flex-wrap">
            <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-[#030712] border border-slate-800 text-slate-300">
              Wpisy: <strong className="text-white">{diagnosticsHistory.length}</strong>
            </span>
            <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              Zweryfikowane: <strong className="text-emerald-300">{verifiedCount}</strong>
            </span>
            {failedCount > 0 && (
              <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
                Błędy: <strong className="text-rose-300">{failedCount}</strong>
              </span>
            )}

            <button
              onClick={() => setShowTestRunner(!showTestRunner)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                showTestRunner
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700"
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{showTestRunner ? "Ukryj Narzędzia Testowe" : "Narzędzia Testowe & Walidacja"}</span>
            </button>

            <button
              onClick={handleExportDiagnostics}
              disabled={diagnosticsHistory.length === 0}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              title="Pobierz historię operacji do pliku JSON"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Eksport JSON</span>
            </button>

            <button
              onClick={handleClearDiagnostics}
              disabled={diagnosticsHistory.length === 0}
              className="p-2 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 rounded-xl transition cursor-pointer disabled:opacity-40"
              title="Wyczyść historię diagnostyki"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* SEKJCA TESTOWA / RUNNER 7-ETAPOWEGO CYKLU & WERYFIKACJA OFERTY (OPCJONALNIE ROZWIJANA) */}
        {showTestRunner && (
          <div className="my-5 p-5 bg-[#030712] border border-amber-500/30 rounded-2xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-black text-white font-mono uppercase tracking-wider">
                  Tester 7-Etapowego Cyklu Życia Oferty & Moduł [VERIFY OFFER]
                </h4>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Środowisko: {allegro?.environment === "sandbox" ? "Allegro Sandbox" : "Produkcja"}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* TESTER 1: URUCHOMIENIE 7-ETAPOWEGO FLOW */}
              <div className="space-y-3 bg-[#070b14] p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 font-mono">
                    1. Uruchom 7-Etapowy Pipeline Publikacji
                  </span>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simulateMissingOffer}
                      onChange={(e) => setSimulateMissingOffer(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-rose-500 bg-slate-900 border-slate-700"
                    />
                    <span className="text-rose-400 font-semibold">Symuluj błąd (HTTP 422)</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">SKU Magazynu:</label>
                    <input
                      type="text"
                      value={testSku}
                      onChange={(e) => setTestSku(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-750 rounded p-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Kategoria ID:</label>
                    <input
                      type="text"
                      value={testCategory}
                      onChange={(e) => setTestCategory(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-750 rounded p-1.5 text-white"
                    />
                  </div>
                </div>

                <div className="text-xs font-mono">
                  <label className="text-[10px] text-slate-400 block mb-0.5">Tytuł Oferty (Parametr testowy):</label>
                  <input
                    type="text"
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-750 rounded p-1.5 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Cena Brutto (PLN):</label>
                    <input
                      type="number"
                      value={testPrice}
                      onChange={(e) => setTestPrice(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-750 rounded p-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Ilość sztuk:</label>
                    <input
                      type="number"
                      value={testStock}
                      onChange={(e) => setTestStock(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-750 rounded p-1.5 text-white"
                    />
                  </div>
                </div>

                <button
                  onClick={handleExecute7StepFlow}
                  disabled={isExecutingFlow}
                  className="w-full py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black rounded-lg text-xs transition flex items-center justify-center gap-2 shadow cursor-pointer disabled:opacity-50"
                >
                  <Zap className={`w-3.5 h-3.5 ${isExecutingFlow ? "animate-spin" : ""}`} />
                  <span>{isExecutingFlow ? "Przetwarzanie 7 etapów..." : "Uruchom 7-Etapowy Test Tworzenia Oferty"}</span>
                </button>

                {flowSuccessMessage && (
                  <div className="p-2.5 bg-emerald-950/40 border border-emerald-800 text-emerald-300 rounded-lg text-xs flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{flowSuccessMessage}</span>
                  </div>
                )}
                {flowErrorMessage && (
                  <div className="p-2.5 bg-rose-950/40 border border-rose-800 text-rose-300 rounded-lg text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{flowErrorMessage}</span>
                  </div>
                )}
              </div>

              {/* TESTER 2: [VERIFY OFFER] MODUŁ */}
              <div className="space-y-3 bg-[#070b14] p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-cyan-300 font-mono block mb-2">
                    2. Moduł Weryfikacji [VERIFY OFFER]
                  </span>
                  <p className="text-[11px] text-slate-400 mb-3">
                    Pobiera rzeczywistą ofertę z serwerów Allegro REST API i porównuje 6 kluczowych pól: offerId, title, price, stock, category, status.
                  </p>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={verifyOfferIdInput}
                      onChange={(e) => setVerifyOfferIdInput(e.target.value)}
                      placeholder="Wklej lub wybierz offerId (np. 1749281923)"
                      className="flex-1 bg-slate-900 border border-slate-750 rounded p-2 text-xs font-mono text-white"
                    />
                    <button
                      onClick={() => handleVerifyOffer()}
                      disabled={isVerifying || !verifyOfferIdInput.trim()}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CheckSquare className={`w-3.5 h-3.5 ${isVerifying ? "animate-spin" : ""}`} />
                      <span>{isVerifying ? "Weryfikuję..." : "Weryfikuj Ofertę"}</span>
                    </button>
                  </div>
                </div>

                {/* WYNIK WERYFIKACJI */}
                {verificationResult && (
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-750 text-xs font-mono space-y-2 mt-2">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                      <span className="text-slate-300 font-bold">Raport Zgodności Pól:</span>
                      {verificationResult.overallMatch ? (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-bold text-[10px] flex items-center gap-1">
                          <Check className="w-3 h-3" /> ZGODNA (100%)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded font-bold text-[10px] flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> ROZBIEŻNOŚCI
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      <div>
                        <span className="text-slate-500">ID Oferty: </span>
                        <span className={verificationResult.fields.offerId.match ? "text-emerald-400" : "text-rose-400"}>
                          {verificationResult.fields.offerId.actual || "Brak"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Cena: </span>
                        <span className={verificationResult.fields.price.match ? "text-emerald-400" : "text-rose-400"}>
                          {verificationResult.fields.price.actual} PLN
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Ilość: </span>
                        <span className={verificationResult.fields.stock.match ? "text-emerald-400" : "text-rose-400"}>
                          {verificationResult.fields.stock.actual} szt.
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Status: </span>
                        <span className={verificationResult.fields.status.match ? "text-emerald-400" : "text-rose-400"}>
                          {verificationResult.fields.status.actual}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {verifyError && (
                  <div className="p-2.5 bg-rose-950/40 border border-rose-800 text-rose-300 rounded-lg text-xs mt-2">
                    {verifyError}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* FILTRY I WYSZUKIWARKA LOGÓW DIAGNOSTYKI */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 my-4">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={diagSearchQuery}
                onChange={(e) => setDiagSearchQuery(e.target.value)}
                placeholder="Szukaj po SKU, offerId, operationId, HTTP snippet..."
                className="w-full pl-9 pr-3 py-1.5 bg-[#030712] border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 font-mono outline-hidden focus:border-orange-500/50"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <Filter className="w-3 h-3 text-slate-400" />
              <span className="text-slate-400 text-[11px]">Etap:</span>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="bg-[#030712] border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 font-mono outline-hidden cursor-pointer"
              >
                <option value="ALL">Wszystkie etapy</option>
                <option value="REQUEST">REQUEST</option>
                <option value="RESPONSE">RESPONSE</option>
                <option value="OPERATION">OPERATION</option>
                <option value="OFFER">OFFER</option>
                <option value="PUBLICATION">PUBLICATION</option>
                <option value="VERIFICATION">VERIFICATION</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-slate-400 text-[11px]">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#030712] border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 font-mono outline-hidden cursor-pointer"
              >
                <option value="ALL">Wszystkie statusy</option>
                <option value="VERIFIED">VERIFIED</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="CREATED">CREATED</option>
                <option value="PROCESSING">PROCESSING</option>
                <option value="FAILED">FAILED</option>
              </select>
            </div>
          </div>
        </div>

        {/* TABELA / LISTA HISTORII OPERACJI REQUEST/RESPONSE */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#030712]">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-slate-900/90 text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Czas</th>
                  <th className="py-2.5 px-3">Etap Operacji</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">HTTP</th>
                  <th className="py-2.5 px-3">Izolacja ID (SKU / Offer / Operation / Product)</th>
                  <th className="py-2.5 px-3">Komunikat / Snippet Odpowiedzi</th>
                  <th className="py-2.5 px-3 text-right">Szczegóły</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredDiagnostics.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Brak wpisów diagnostycznych spełniających kryteria filtrowania.
                    </td>
                  </tr>
                ) : (
                  filteredDiagnostics.map((entry) => (
                    <tr
                      key={entry.id}
                      className="hover:bg-slate-900/50 transition cursor-pointer"
                      onClick={() => setSelectedEntry(entry)}
                    >
                      {/* Czas */}
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap text-[11px]">
                        {entry.timestamp}
                      </td>

                      {/* Etap */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                            entry.stage === "REQUEST"
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                              : entry.stage === "RESPONSE"
                              ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                              : entry.stage === "OPERATION"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              : entry.stage === "OFFER"
                              ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                              : entry.stage === "PUBLICATION"
                              ? "bg-orange-500/10 text-orange-400 border-orange-500/30"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          }`}
                        >
                          {entry.stage}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit ${
                            entry.status === "VERIFIED"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : entry.status === "PUBLISHED"
                              ? "bg-teal-500/20 text-teal-300"
                              : entry.status === "CREATED"
                              ? "bg-blue-500/20 text-blue-300"
                              : entry.status === "FAILED"
                              ? "bg-rose-500/20 text-rose-300 font-black"
                              : "bg-amber-500/20 text-amber-300"
                          }`}
                        >
                          {entry.status === "VERIFIED" && <Check className="w-2.5 h-2.5" />}
                          {entry.status === "FAILED" && <AlertTriangle className="w-2.5 h-2.5" />}
                          <span>{entry.status}</span>
                        </span>
                      </td>

                      {/* HTTP Status */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {entry.httpStatus ? (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              entry.httpStatus >= 200 && entry.httpStatus < 300
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : entry.httpStatus >= 400
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                                : "bg-slate-800 text-slate-300"
                            }`}
                          >
                            HTTP {entry.httpStatus}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Rozdzielone Identyfikatory */}
                      <td className="py-2.5 px-3 max-w-[240px]">
                        <div className="flex flex-wrap gap-1">
                          {entry.sku && (
                            <span
                              className="px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded text-[9px] border border-slate-700"
                              title={`SKU: ${entry.sku}`}
                            >
                              SKU: {entry.sku}
                            </span>
                          )}
                          {entry.offerId && (
                            <span
                              className="px-1.5 py-0.2 bg-orange-950/40 text-orange-300 rounded text-[9px] border border-orange-800/50 font-bold"
                              title={`Offer ID: ${entry.offerId}`}
                            >
                              offerId: {entry.offerId}
                            </span>
                          )}
                          {entry.operationId && (
                            <span
                              className="px-1.5 py-0.2 bg-blue-950/40 text-blue-300 rounded text-[9px] border border-blue-800/40"
                              title={`Command/Operation ID: ${entry.operationId}`}
                            >
                              op: {entry.operationId.slice(0, 8)}...
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Treść komunikatu / Snippet */}
                      <td className="py-2.5 px-3 max-w-[320px]">
                        <p className="text-slate-300 text-xs truncate" title={entry.message}>
                          {entry.message}
                        </p>
                        {entry.httpResponseSnippet && (
                          <span className="text-[10px] text-slate-500 truncate block font-mono">
                            {entry.httpResponseSnippet}
                          </span>
                        )}
                      </td>

                      {/* Akcja: Zobacz szczegóły */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEntry(entry);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-amber-400" />
                          <span>Podgląd</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. AUDYT ZDARZEŃ W CZASIE RZECZYWISTYM (LIVE AUDIT LOG TERMINAL) */}
      <div className="bg-[#030712] border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/80 mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-black text-white font-mono uppercase tracking-wider">
              Dziennik Zdarzeń & Pomiary Latencji API (Live Audit Log)
            </h4>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
              Zarejestrowano {logs.length} zdarzeń
            </span>
            <button
              onClick={() => setLogs([])}
              className="text-[10px] px-2 py-0.5 bg-slate-850 hover:bg-slate-800 text-slate-400 rounded transition font-mono"
            >
              Wyczyść
            </button>
          </div>
        </div>

        <div className="space-y-1.5 max-h-56 overflow-y-auto font-mono text-[11px] pr-1">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-2.5 py-1 px-2 rounded hover:bg-slate-900/60 transition"
            >
              <span className="text-slate-500 shrink-0 text-[10px]">{log.timestamp}</span>

              <span
                className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold shrink-0 ${
                  log.channel === "allegro"
                    ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                    : log.channel === "baselinker"
                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    : log.channel === "shopgold"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                {log.channel}
              </span>

              <span
                className={`flex-1 ${
                  log.type === "error"
                    ? "text-rose-300 font-semibold"
                    : log.type === "success"
                    ? "text-emerald-300"
                    : "text-slate-300"
                }`}
              >
                {log.message}
              </span>

              {log.pingMs !== undefined && (
                <span className="text-teal-400 font-bold shrink-0 text-[10px] bg-teal-500/10 px-1.5 py-0.2 rounded">
                  {log.pingMs}ms
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 6. MODAL SZCZEGÓŁÓW WPISU DIAGNOSTYCZNEGO (REQUEST / RESPONSE INSPECTOR) */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0b1120] border border-slate-750 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <Code className="w-5 h-5 text-orange-400" />
                <h3 className="text-base font-black text-white font-mono">
                  Inspektor Operacji API: {selectedEntry.stage} ({selectedEntry.status})
                </h3>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              {/* Informacje ogólne */}
              <div className="grid grid-cols-2 gap-2 bg-[#030712] p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px]">Czas rejestracji:</span>
                  <span className="text-slate-200 font-bold">{selectedEntry.timestamp}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Status HTTP:</span>
                  <span className="text-amber-400 font-bold">
                    {selectedEntry.httpStatus ? `HTTP ${selectedEntry.httpStatus}` : "N/A (Lokalna operacja)"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">SKU Magazynu:</span>
                  <span className="text-white font-bold">{selectedEntry.sku || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Offer ID (Allegro):</span>
                  <span className="text-orange-400 font-bold">{selectedEntry.offerId || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Operation/Command UUID:</span>
                  <span className="text-blue-400 font-bold truncate block">{selectedEntry.operationId || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">External ID:</span>
                  <span className="text-slate-300 font-bold">{selectedEntry.externalId || "—"}</span>
                </div>
              </div>

              {/* Komunikat */}
              <div>
                <span className="text-slate-400 block mb-1 font-bold">Komunikat systemowy:</span>
                <div className="p-3 bg-[#030712] rounded-xl border border-slate-800 text-slate-200">
                  {selectedEntry.message}
                </div>
              </div>

              {/* Payload żądania (jeśli dostępny) */}
              {selectedEntry.payload && (
                <div>
                  <span className="text-slate-400 block mb-1 font-bold">Wysłany Payload JSON (Request Body):</span>
                  <pre className="p-3 bg-[#030712] rounded-xl border border-slate-800 text-cyan-300 text-[11px] overflow-x-auto max-h-48">
                    {JSON.stringify(selectedEntry.payload, null, 2)}
                  </pre>
                </div>
              )}

              {/* Snippet / Treść odpowiedzi HTTP */}
              {selectedEntry.httpResponseSnippet && (
                <div>
                  <span className="text-slate-400 block mb-1 font-bold">Odpowiedź Serwera (HTTP Response Snippet):</span>
                  <pre className="p-3 bg-[#030712] rounded-xl border border-slate-800 text-amber-300 text-[11px] overflow-x-auto max-h-48">
                    {selectedEntry.httpResponseSnippet}
                  </pre>
                </div>
              )}

              {/* Raport weryfikacji pól */}
              {selectedEntry.verificationComparison && (
                <div>
                  <span className="text-slate-400 block mb-1 font-bold">Raport Porównania Pól Weryfikacji:</span>
                  <pre className="p-3 bg-[#030712] rounded-xl border border-slate-800 text-emerald-300 text-[11px] overflow-x-auto max-h-48">
                    {JSON.stringify(selectedEntry.verificationComparison, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-slate-800">
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition cursor-pointer"
                >
                  Zamknij Inspektor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL KONFIGURACJI DANYCH NA BACKENDZIE */}
      {configTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0b1120] border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white font-mono">
                  {configTarget === "allegro"
                    ? "Konfiguracja Allegro REST API (Backend Vault)"
                    : configTarget === "baselinker"
                    ? "Konfiguracja BaseLinker API"
                    : "Konfiguracja Sklepu ShopGold"}
                </h3>
              </div>
              <button
                onClick={() => setConfigTarget(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs font-mono">
              {configTarget === "allegro" && (
                <>
                  <div>
                    <label className="block text-slate-300 mb-1 font-bold">Client ID (Allegro Developer):</label>
                    <input
                      type="text"
                      value={configForm.clientId}
                      onChange={(e) => setConfigForm({ ...configForm, clientId: e.target.value })}
                      placeholder={allegro?.clientIdMasked || "Wpisz Client ID z portalu developer"}
                      className="w-full bg-[#030712] border border-slate-700 rounded-lg p-2.5 text-white focus:border-amber-400 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-bold">Client Secret:</label>
                    <input
                      type="password"
                      value={configForm.clientSecret}
                      onChange={(e) => setConfigForm({ ...configForm, clientSecret: e.target.value })}
                      placeholder="Wklej odkryty Client Secret"
                      className="w-full bg-[#030712] border border-slate-700 rounded-lg p-2.5 text-white focus:border-amber-400 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-bold">Nazwa Sprzedawcy / Firmy:</label>
                    <input
                      type="text"
                      value={configForm.sellerName}
                      onChange={(e) => setConfigForm({ ...configForm, sellerName: e.target.value })}
                      className="w-full bg-[#030712] border border-slate-700 rounded-lg p-2.5 text-white focus:border-amber-400 outline-hidden"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="allegro-sandbox"
                      checked={configForm.sandbox}
                      onChange={(e) => setConfigForm({ ...configForm, sandbox: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700"
                    />
                    <label htmlFor="allegro-sandbox" className="text-slate-300 cursor-pointer">
                      Używaj środowiska testowego <strong>Allegro Sandbox</strong>
                    </label>
                  </div>
                </>
              )}

              {configTarget === "baselinker" && (
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">Token API BaseLinker (Moje konto → API):</label>
                  <input
                    type="password"
                    value={configForm.baselinkerToken}
                    onChange={(e) => setConfigForm({ ...configForm, baselinkerToken: e.target.value })}
                    placeholder={baselinker?.tokenMasked || "3004829-..."}
                    className="w-full bg-[#030712] border border-slate-700 rounded-lg p-2.5 text-white focus:border-blue-400 outline-hidden"
                  />
                  <p className="text-[11px] text-slate-500 mt-1 font-sans">
                    Klucz zostanie bezpiecznie zapisany w backendzie i użyty przy synchronizacjach paczek.
                  </p>
                </div>
              )}

              {configTarget === "shopgold" && (
                <>
                  <div>
                    <label className="block text-slate-300 mb-1 font-bold">Adres URL API ShopGold:</label>
                    <input
                      type="text"
                      value={configForm.shopgoldUrl}
                      onChange={(e) => setConfigForm({ ...configForm, shopgoldUrl: e.target.value })}
                      className="w-full bg-[#030712] border border-slate-700 rounded-lg p-2.5 text-white focus:border-amber-400 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-bold">Klucz API Sklepu (REST API Key):</label>
                    <input
                      type="password"
                      value={configForm.shopgoldKey}
                      onChange={(e) => setConfigForm({ ...configForm, shopgoldKey: e.target.value })}
                      placeholder={shopgold?.keyMasked || "Wklej klucz REST ze sklepu"}
                      className="w-full bg-[#030712] border border-slate-700 rounded-lg p-2.5 text-white focus:border-amber-400 outline-hidden"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setConfigTarget(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={activeAction === "save-config"}
                  className="px-5 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black rounded-xl transition shadow-md disabled:opacity-50"
                >
                  Zapisz w Bezpiecznym Backendzie
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
