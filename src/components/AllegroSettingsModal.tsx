import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Layers,
  Key,
  ShieldCheck,
  Truck,
  Building,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  FileCheck,
  Smartphone,
  Copy,
  Check,
  Zap,
  Info,
  Eye,
  EyeOff,
  DownloadCloud,
  Globe,
  Lock,
  LogOut,
  UserCheck,
} from "lucide-react";
import { AllegroConfig } from "../types";
import {
  testAllegroApiConnection,
  saveStoredAllegroConfig,
  initiateAllegroDeviceCode,
  pollAllegroDeviceToken,
  fetchAllegroSellerTerms,
  refreshAllegroToken,
  exchangeAllegroAuthCode,
} from "../utils/allegroService";

interface AllegroSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AllegroConfig;
  onSaveConfig: (newConfig: AllegroConfig) => void;
}

export const AllegroSettingsModal: React.FC<AllegroSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [formData, setFormData] = useState<AllegroConfig>(() => ({
    ...config,
    clientId: config.clientId && config.clientId !== "allegro-app-koneser-2026" ? config.clientId : "0edfad865dc14bfbaab3df0d25efbc68",
  }));

  const [authMethod, setAuthMethod] = useState<"device" | "manual" | "web">("device");
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFetchingTerms, setIsFetchingTerms] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [isExchangingCode, setIsExchangingCode] = useState(false);

  const [sellerLogin, setSellerLogin] = useState<string>("");
  const [fetchedShippingRates, setFetchedShippingRates] = useState<Array<{ id: string; name: string }>>([]);
  const [fetchedWarranties, setFetchedWarranties] = useState<Array<{ id: string; name: string }>>([]);
  const [fetchedReturnPolicies, setFetchedReturnPolicies] = useState<Array<{ id: string; name: string }>>([]);

  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
    environment?: string;
    pingMs?: number;
    authorized?: boolean;
    seller?: string;
  } | null>(null);

  // Device code flow state
  const [isAuthorizingDevice, setIsAuthorizingDevice] = useState<boolean>(false);
  const [deviceData, setDeviceData] = useState<{
    userCode: string;
    verificationUri: string;
    verificationUriComplete: string;
    deviceCode: string;
  } | null>(null);
  const [pollingStatus, setPollingStatus] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const pollTimerRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen && formData.accessToken && formData.accessToken.length > 20) {
      handleFetchTerms(formData);
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Start Device Code authorization
  const handleStartDeviceAuth = async () => {
    if (!formData.clientId || formData.clientId.trim() === "") {
      setTestResult({
        success: false,
        message: "Wprowadź Client ID z portalu Allegro Developer.",
      });
      return;
    }

    if (formData.clientSecret && formData.clientSecret.includes("*")) {
      setTestResult({
        success: false,
        message: "Wklejono zamaskowane gwiazdki '***'. W portalu developer.allegro.pl kliknij 'POKAŻ' przy CLIENT SECRET i skopiuj prawdziwe znaki klucza.",
      });
      return;
    }

    setIsAuthorizingDevice(true);
    setPollingStatus("Inicjalizacja kodu w serwerze autoryzacji Allegro...");
    setDeviceData(null);
    setTestResult(null);

    const res = await initiateAllegroDeviceCode(formData.clientId, formData.clientSecret, formData.sandbox);
    if (!res.success || !res.device_code) {
      setIsAuthorizingDevice(false);
      setTestResult({
        success: false,
        message: res.error || "Błąd inicjalizacji Device Code. Sprawdź czy Client ID i Client Secret są poprawne.",
      });
      return;
    }

    setDeviceData({
      userCode: res.user_code || "",
      verificationUri: res.verification_uri || "https://allegro.pl/auth/oauth/device",
      verificationUriComplete: res.verification_uri_complete || `https://allegro.pl/auth/oauth/device?user_code=${res.user_code}`,
      deviceCode: res.device_code,
    });

    setPollingStatus("Oczekiwanie na zatwierdzenie kodu w oknie Allegro...");

    // Start Polling every 2.5 seconds
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    const checkToken = async () => {
      const pollRes = await pollAllegroDeviceToken(
        formData.clientId,
        formData.clientSecret,
        res.device_code!,
        formData.sandbox
      );

      if (pollRes.status === "authorized" && pollRes.accessToken) {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        setIsAuthorizingDevice(false);
        setDeviceData(null); // Clear pending code display

        const updatedConfig: AllegroConfig = {
          ...formData,
          accessToken: pollRes.accessToken,
          refreshToken: pollRes.refreshToken,
          isConnected: true,
          lastConnectedAt: new Date().toISOString(),
          authType: "device_code",
        };
        setFormData(updatedConfig);
        saveStoredAllegroConfig(updatedConfig);
        onSaveConfig(updatedConfig);

        setTestResult({
          success: true,
          message: "🎉 Konto Allegro powiązane pomyślnie! Token OAuth pobrany i aktywny.",
          authorized: true,
        });

        // Auto fetch terms after connecting
        handleFetchTerms(updatedConfig);
      } else if (pollRes.status === "error") {
        // If expired or user closed
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        setIsAuthorizingDevice(false);
        setPollingStatus(pollRes.error || "Wystąpił błąd autoryzacji.");
      }
    };

    pollTimerRef.current = setInterval(checkToken, 2500);
  };

  const handleManualCheckStatus = async () => {
    if (!deviceData) return;
    setPollingStatus("Sprawdzam zatwierdzenie w Allegro...");
    const pollRes = await pollAllegroDeviceToken(
      formData.clientId,
      formData.clientSecret,
      deviceData.deviceCode,
      formData.sandbox
    );

    if (pollRes.status === "authorized" && pollRes.accessToken) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      setIsAuthorizingDevice(false);
      setDeviceData(null);

      const updatedConfig: AllegroConfig = {
        ...formData,
        accessToken: pollRes.accessToken,
        refreshToken: pollRes.refreshToken,
        isConnected: true,
        lastConnectedAt: new Date().toISOString(),
        authType: "device_code",
      };
      setFormData(updatedConfig);
      saveStoredAllegroConfig(updatedConfig);
      onSaveConfig(updatedConfig);

      setTestResult({
        success: true,
        message: "🎉 Konto Allegro powiązane pomyślnie! Token OAuth pobrany i aktywny.",
        authorized: true,
      });
      handleFetchTerms(updatedConfig);
    } else if (pollRes.status === "pending") {
      setPollingStatus("Kod oczekuje na zatwierdzenie. Upewnij się, że kliknąłeś 'Zatwierdź' na otwartej stronie Allegro.");
    } else {
      setPollingStatus(pollRes.error || "Kod wygasł lub został już użyty. Kliknij 'Nowy kod' poniżej.");
    }
  };

  const handleCopyCode = () => {
    if (!deviceData) return;
    navigator.clipboard.writeText(deviceData.userCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleFetchTerms = async (cfg?: AllegroConfig) => {
    setIsFetchingTerms(true);
    try {
      const targetCfg = cfg || formData;
      const terms = await fetchAllegroSellerTerms(targetCfg);
      if (terms.success) {
        setFetchedShippingRates(terms.shippingRates);
        setFetchedWarranties(terms.warranties);
        setFetchedReturnPolicies(terms.returnPolicies);

        // Auto select first if default empty or placeholder
        if (terms.shippingRates.length > 0 && (!targetCfg.shippingTableId || targetCfg.shippingTableId.includes("cennik-") || targetCfg.shippingTableId === "1 smart")) {
          setFormData((prev) => ({
            ...prev,
            shippingTableId: terms.shippingRates[0].id || prev.shippingTableId,
          }));
        }
        if (terms.warranties.length > 0 && (!targetCfg.impliedWarrantyId || targetCfg.impliedWarrantyId.includes("gwarancja-"))) {
          setFormData((prev) => ({
            ...prev,
            impliedWarrantyId: terms.warranties[0].id || prev.impliedWarrantyId,
          }));
        }
        if (terms.returnPolicies.length > 0 && (!targetCfg.returnPolicyId || targetCfg.returnPolicyId.includes("zwrot-"))) {
          setFormData((prev) => ({
            ...prev,
            returnPolicyId: terms.returnPolicies[0].id || prev.returnPolicyId,
          }));
        }
      }
    } catch (e) {
      console.warn("Could not fetch seller terms:", e);
    } finally {
      setIsFetchingTerms(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testAllegroApiConnection(formData);
      if (res.seller) {
        setSellerLogin(res.seller);
      }
      setTestResult({
        success: res.success,
        message: res.message,
        environment: res.environment,
        pingMs: res.pingMs,
        authorized: res.authorized,
        seller: res.seller,
      });
      if (res.success) {
        setFormData((prev) => ({
          ...prev,
          isConnected: true,
          lastConnectedAt: new Date().toISOString(),
        }));
        if (res.authorized) {
          handleFetchTerms(formData);
        }
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e?.message || "Błąd weryfikacji API Allegro",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleRefreshToken = async () => {
    if (!formData.refreshToken) {
      setTestResult({
        success: false,
        message: "Brak zapisanego klucza odświeżania (Refresh Token). Połącz konto ponownie przez Device Code.",
      });
      return;
    }

    setIsRefreshing(true);
    const res = await refreshAllegroToken(formData.clientId, formData.clientSecret, formData.refreshToken, formData.sandbox);
    setIsRefreshing(false);

    if (res.success && res.accessToken) {
      const updated: AllegroConfig = {
        ...formData,
        accessToken: res.accessToken,
        refreshToken: res.refreshToken || formData.refreshToken,
        isConnected: true,
        lastConnectedAt: new Date().toISOString(),
      };
      setFormData(updated);
      saveStoredAllegroConfig(updated);
      onSaveConfig(updated);
      setTestResult({
        success: true,
        message: "✅ Pomyślnie odświeżono Token OAuth w Allegro REST API!",
      });
      handleFetchTerms(updated);
    } else {
      setTestResult({
        success: false,
        message: res.error || "Nie udało się odświeżyć tokena. Połącz konto ponownie.",
      });
    }
  };

  const handleExchangeCode = async () => {
    if (!manualCode.trim()) return;
    setIsExchangingCode(true);
    const res = await exchangeAllegroAuthCode(formData.clientId, formData.clientSecret, manualCode.trim(), undefined, formData.sandbox);
    setIsExchangingCode(false);

    if (res.success && res.accessToken) {
      const updated: AllegroConfig = {
        ...formData,
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        isConnected: true,
        lastConnectedAt: new Date().toISOString(),
      };
      setFormData(updated);
      saveStoredAllegroConfig(updated);
      onSaveConfig(updated);
      setManualCode("");
      setTestResult({
        success: true,
        message: "✅ Kod autoryzacji wymieniony na aktywny Token OAuth!",
      });
      handleFetchTerms(updated);
    } else {
      setTestResult({
        success: false,
        message: res.error || "Nieprawidłowy kod autoryzacji.",
      });
    }
  };

  const handleDisconnect = () => {
    const updated: AllegroConfig = {
      ...formData,
      accessToken: "",
      refreshToken: "",
      isConnected: false,
    };
    setFormData(updated);
    saveStoredAllegroConfig(updated);
    onSaveConfig(updated);
    setDeviceData(null);
    setTestResult({
      success: true,
      message: "Rozłączono powiązanie z kontem Allegro.",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredAllegroConfig(formData);
    onSaveConfig(formData);
    onClose();
  };

  const isAccountConnected = Boolean(formData.accessToken && formData.accessToken.length > 20);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#0b0f19] border border-yellow-400/40 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto">
        {/* NAGŁÓWEK */}
        <div className="bg-[#070b14] border-b border-slate-800 p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400 font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white font-mono flex items-center gap-2">
                Konfiguracja Allegro REST API & OAuth
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Połączenie konta sprzedawcy PHU U Konesera, autoryzacja OAuth i cenniki dostaw
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TREŚĆ FORMULARZA */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto font-mono text-xs">
          {/* PRZEŁĄCZNIK ŚRODOWISKA */}
          <div className="bg-[#030712] p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-yellow-400" />
                Środowisko Allegro REST API:
              </span>
              <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-700">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, sandbox: false })}
                  className={`px-3 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                    !formData.sandbox
                      ? "bg-yellow-400 text-slate-950 font-black shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Produkcja (allegro.pl)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, sandbox: true })}
                  className={`px-3 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                    formData.sandbox
                      ? "bg-yellow-400 text-slate-950 font-black shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Sandbox (Testowe)
                </button>
              </div>
            </div>
          </div>

          {/* DANE KLUCZY DEVELOPERA */}
          <div className="space-y-3 bg-[#030712] p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-yellow-400 font-bold">
                <Key className="w-4 h-4" />
                <span>1. Klucze Aplikacji (Allegro Developer Portal)</span>
              </div>
              <a
                href="https://apps.developer.allegro.pl"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-yellow-400/80 hover:text-yellow-300 flex items-center gap-1 underline"
              >
                apps.developer.allegro.pl <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="bg-yellow-950/30 border border-yellow-500/30 p-2.5 rounded-lg flex items-start gap-2 text-[11px] text-yellow-200/90">
              <Info className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <strong>Wskazówka:</strong> W portalu developer.allegro.pl kliknij przycisk <strong>„POKAŻ”</strong> obok pozycji <em>CLIENT SECRET</em>, skopiuj odkryty ciąg znaków i wklej go poniżej (upewnij się, że nie kopiujesz zamaskowanych kropek/gwiazdek).
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Allegro Client ID:</label>
                <input
                  type="text"
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  placeholder="np. 0edfad865dc14bfbaab3df0d25efbc68"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-yellow-400 outline-hidden"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold">Allegro Client Secret:</label>
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="text-slate-400 hover:text-yellow-400 flex items-center gap-1 text-[10px] cursor-pointer"
                  >
                    {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showSecret ? "Ukryj" : "Pokaż"}</span>
                  </button>
                </div>
                <input
                  type={showSecret ? "text" : "password"}
                  value={formData.clientSecret}
                  onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                  placeholder="Wklej odkryty klucz po kliknięciu POKAŻ"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-yellow-400 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* SEKCJA 2: STAN POŁĄCZENIA I CENTRUM AUTORYZACJI */}
          <div className="space-y-3 bg-gradient-to-br from-[#0c1322] to-[#080d1a] p-4 rounded-xl border border-yellow-400/30">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-white font-bold">
                <Smartphone className="w-4 h-4 text-yellow-400" />
                <span>2. Połączenie i Autoryzacja Konta Sprzedawcy Allegro</span>
              </div>
              {isAccountConnected ? (
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Połączono i Aktywne
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-full text-[10px] font-bold">
                  Wymaga powiązania
                </span>
              )}
            </div>

            {/* AKTYWNE POWIĄZANIE - KARTA SUKCESU */}
            {isAccountConnected && !deviceData ? (
              <div className="bg-emerald-950/30 border border-emerald-500/40 p-4 rounded-xl space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-sm flex items-center gap-1.5">
                        <span>Konto Allegro połączone</span>
                        <span className="text-xs text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                          {sellerLogin ? `@${sellerLogin}` : `@${formData.sellerName || "koneser"}`}
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Token OAuth jest ważny i uprawnia do wystawiania ofert bezpośrednio w Allegro REST API.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-900 transition cursor-pointer text-[10px] flex items-center gap-1 border border-slate-800 shrink-0"
                    title="Rozłącz konto"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Rozłącz</span>
                  </button>
                </div>

                {/* SZYBKIE AKCJE DLA POŁĄCZONEGO KONTA */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-emerald-500/20">
                  <button
                    type="button"
                    onClick={() => handleFetchTerms(formData)}
                    disabled={isFetchingTerms}
                    className="px-3 py-1.5 bg-emerald-900/50 hover:bg-emerald-800/60 text-emerald-200 border border-emerald-500/30 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <DownloadCloud className={`w-3.5 h-3.5 ${isFetchingTerms ? "animate-bounce" : ""}`} />
                    <span>Pobierz cenniki dostaw</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRefreshToken}
                    disabled={isRefreshing}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-yellow-400" : ""}`} />
                    <span>Odśwież Token</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod("device");
                      handleStartDeviceAuth();
                    }}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-[11px] transition cursor-pointer ml-auto"
                  >
                    <span>Połącz inne konto</span>
                  </button>
                </div>
              </div>
            ) : null}

            {/* ZAKŁADKI METOD ŁĄCZENIA JEŚLI KONTO JEST NIEROZPOZNANE LUB UŻYTKOWNIK CHCE ZMIENIĆ */}
            {(!isAccountConnected || deviceData) && (
              <div className="space-y-3">
                {/* PRZEŁĄCZNIK METOD AUTORYZACJI */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setAuthMethod("device")}
                    className={`flex-1 py-1.5 rounded-md font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      authMethod === "device" ? "bg-yellow-400 text-slate-950" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>1. Kod 1-Klik (Device Code)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuthMethod("manual")}
                    className={`flex-1 py-1.5 rounded-md font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      authMethod === "manual" ? "bg-yellow-400 text-slate-950" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>2. Wklej Token / Refresh</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuthMethod("web")}
                    className={`flex-1 py-1.5 rounded-md font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      authMethod === "web" ? "bg-yellow-400 text-slate-950" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>3. Link Web OAuth</span>
                  </button>
                </div>

                {/* METODA 1: DEVICE CODE */}
                {authMethod === "device" && (
                  <div className="space-y-3">
                    {!isAuthorizingDevice && !deviceData ? (
                      <div className="space-y-2">
                        <p className="text-[11px] text-slate-300">
                          Wygeneruj jednorazowy kod, kliknij link zatwierdzenia na stronie Allegro, a system automatycznie powiąże Twoje konto.
                        </p>
                        <button
                          type="button"
                          onClick={handleStartDeviceAuth}
                          className="w-full py-2.5 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
                        >
                          <Zap className="w-4 h-4 text-slate-950" />
                          <span>Wygeneruj Kod Urządzenia i Połącz Konto Allegro (1-Klik)</span>
                        </button>
                      </div>
                    ) : null}

                    {/* OKIENKO Z KODEM URZĄDZENIA */}
                    {deviceData && (
                      <div className="bg-slate-950 border-2 border-yellow-400 p-4 rounded-xl space-y-3 animate-in fade-in">
                        <div className="text-center space-y-1">
                          <p className="text-slate-400 text-[11px]">Twój jednorazowy kod autoryzacji Allegro:</p>
                          <div className="flex items-center justify-center gap-3">
                            <span className="text-2xl font-black text-yellow-400 tracking-widest bg-slate-900 px-4 py-2 rounded-lg border border-yellow-400/40">
                              {deviceData.userCode}
                            </span>
                            <button
                              type="button"
                              onClick={handleCopyCode}
                              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-600 transition cursor-pointer"
                              title="Skopiuj kod"
                            >
                              {copiedCode ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>

                        <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                          <a
                            href={deviceData.verificationUriComplete}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full flex-1 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black rounded-lg text-xs flex items-center justify-center gap-1.5 transition text-center shadow-md"
                          >
                            <span>Otwórz stronę Allegro i zatwierdź kod</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={handleManualCheckStatus}
                            className="w-full sm:w-auto px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] transition cursor-pointer shadow-sm flex items-center justify-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Sprawdź zatwierdzenie</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleStartDeviceAuth}
                            className="w-full sm:w-auto px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-[11px] border border-slate-700 transition cursor-pointer"
                          >
                            Nowy kod
                          </button>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-amber-300 bg-amber-950/30 p-2 rounded-lg border border-amber-500/20">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                          <span>{pollingStatus}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* METODA 2: MANUAL TOKEN / REFRESH TOKEN */}
                {authMethod === "manual" && (
                  <div className="space-y-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-slate-300 font-semibold">Access Token (OAuth Bearer):</label>
                        <button
                          type="button"
                          onClick={() => setShowToken(!showToken)}
                          className="text-slate-400 hover:text-yellow-400 flex items-center gap-1 text-[10px] cursor-pointer"
                        >
                          {showToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          <span>{showToken ? "Ukryj" : "Pokaż"}</span>
                        </button>
                      </div>
                      <input
                        type={showToken ? "text" : "password"}
                        value={formData.accessToken || ""}
                        onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                        placeholder="Wklej aktywny token OAuth pobrany z Allegro REST API"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-[11px] focus:border-yellow-400 outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1 font-semibold">Refresh Token (do automatycznego odnawiania):</label>
                      <input
                        type="password"
                        value={formData.refreshToken || ""}
                        onChange={(e) => setFormData({ ...formData, refreshToken: e.target.value })}
                        placeholder="Opcjonalny token odświeżania"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 font-mono text-[11px] focus:border-yellow-400 outline-hidden"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={isTesting}
                        className="flex-1 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Zweryfikuj i Zapisz Token</span>
                      </button>

                      {formData.refreshToken && (
                        <button
                          type="button"
                          onClick={handleRefreshToken}
                          disabled={isRefreshing}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs border border-slate-600 transition cursor-pointer flex items-center gap-1"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-yellow-400" : ""}`} />
                          <span>Odśwież Token</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* METODA 3: WEB OAUTH FLOW */}
                {authMethod === "web" && (
                  <div className="space-y-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <p className="text-slate-300 text-[11px]">
                      Możesz otworzyć bezpośredni link logowania Allegro w nowej karcie i wkleić zwrócony kod autoryzacji:
                    </p>
                    <a
                      href={`https://${formData.sandbox ? "allegro.pl.allegrosandbox.pl" : "allegro.pl"}/auth/oauth/authorize?response_type=code&client_id=${formData.clientId}&redirect_uri=https://allegro.pl`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-yellow-400 border border-yellow-400/40 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition text-center"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Otwórz stronę logowania Allegro w nowej karcie</span>
                    </a>

                    <div className="pt-2">
                      <label className="block text-slate-300 mb-1 font-semibold">Kod autoryzacji (z paska adresu po zalogowaniu):</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={manualCode}
                          onChange={(e) => setManualCode(e.target.value)}
                          placeholder="np. code=98ad7..."
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-[11px]"
                        />
                        <button
                          type="button"
                          onClick={handleExchangeCode}
                          disabled={isExchangingCode || !manualCode.trim()}
                          className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer disabled:opacity-50"
                        >
                          {isExchangingCode ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Wymień na Token"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* DANE SPRZEDAWCY & GPSR UE 2023/988 */}
          <div className="space-y-3 bg-[#030712] p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-emerald-400 font-bold border-b border-slate-800 pb-1">
              <Building className="w-4 h-4" />
              <span>3. Dane Sprzedawcy & Dyrektywa GPSR UE 2023/988</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Nazwa podmiotu / Sprzedawca:</label>
                <input
                  type="text"
                  value={formData.sellerName}
                  onChange={(e) => setFormData({ ...formData, sellerName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-yellow-400 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">NIP firmy:</label>
                <input
                  type="text"
                  value={formData.sellerNip}
                  onChange={(e) => setFormData({ ...formData, sellerNip: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-yellow-400 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Miejscowość & Kod:</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Mysłakowice"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-yellow-400 outline-hidden"
                  />
                  <input
                    type="text"
                    value={formData.postCode}
                    onChange={(e) => setFormData({ ...formData, postCode: e.target.value })}
                    placeholder="58-533"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-yellow-400 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Telefon kontaktowy / Infolinia:</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="533 533 443"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-yellow-400 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* CENNIKI I WARUNKI POZASPRZEDAŻOWE */}
          <div className="space-y-3 bg-[#030712] p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1">
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <Truck className="w-4 h-4" />
                <span>4. Cenniki Dostaw i Warunki Gwarancji Allegro</span>
              </div>
              {formData.accessToken && (
                <button
                  type="button"
                  onClick={() => handleFetchTerms(formData)}
                  disabled={isFetchingTerms}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded"
                >
                  <DownloadCloud className={`w-3.5 h-3.5 ${isFetchingTerms ? "animate-bounce" : ""}`} />
                  <span>Pobierz moje cenniki z Allegro</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Cennik dostaw (ID lub Nazwa):</label>
                {fetchedShippingRates.length > 0 ? (
                  <select
                    value={formData.shippingTableId}
                    onChange={(e) => setFormData({ ...formData, shippingTableId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-[11px] focus:border-yellow-400"
                  >
                    {fetchedShippingRates.map((sr) => (
                      <option key={sr.id} value={sr.id}>
                        {sr.name} ({sr.id.slice(0, 8)}...)
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.shippingTableId}
                    onChange={(e) => setFormData({ ...formData, shippingTableId: e.target.value })}
                    placeholder="np. cennik-kurier-24h lub ID tabeli"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-[11px]"
                  />
                )}
              </div>
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Warunki gwarancji (ID):</label>
                {fetchedWarranties.length > 0 ? (
                  <select
                    value={formData.impliedWarrantyId}
                    onChange={(e) => setFormData({ ...formData, impliedWarrantyId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-[11px] focus:border-yellow-400"
                  >
                    {fetchedWarranties.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.impliedWarrantyId}
                    onChange={(e) => setFormData({ ...formData, impliedWarrantyId: e.target.value })}
                    placeholder="np. gwarancja-rozruchowa-14-dni"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-[11px]"
                  />
                )}
              </div>
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Warunki zwrotów (ID):</label>
                {fetchedReturnPolicies.length > 0 ? (
                  <select
                    value={formData.returnPolicyId}
                    onChange={(e) => setFormData({ ...formData, returnPolicyId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-[11px] focus:border-yellow-400"
                  >
                    {fetchedReturnPolicies.map((rp) => (
                      <option key={rp.id} value={rp.id}>
                        {rp.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.returnPolicyId}
                    onChange={(e) => setFormData({ ...formData, returnPolicyId: e.target.value })}
                    placeholder="np. zwrot-konsumencki-14-dni"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-[11px]"
                  />
                )}
              </div>
            </div>
          </div>

          {/* WYNIK TESTU POŁĄCZENIA / BŁĘDÓW */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
                testResult.success
                  ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                  : "bg-rose-950/40 border-rose-500/40 text-rose-300"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-bold text-xs">{testResult.message}</p>
                {testResult.environment && (
                  <p className="text-[10px] opacity-80">
                    Środowisko: {testResult.environment} {testResult.pingMs ? `• Ping: ${testResult.pingMs}ms` : ""}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* PRZYCISKI AKCJI */}
          <div className="border-t border-slate-800 pt-4 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
              <span>Testuj połączenie z API Allegro</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl font-bold transition cursor-pointer"
              >
                Anuluj
              </button>
              <button
                type="submit"
                className="flex-1 sm:flex-none px-5 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black rounded-xl transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Zapisz konfigurację</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

