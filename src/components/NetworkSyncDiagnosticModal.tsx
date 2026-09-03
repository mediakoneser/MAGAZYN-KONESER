import React from "react";
import {
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  RefreshCw,
  Server,
  Database,
  Activity,
  CheckCircle2,
  AlertTriangle,
  X,
  Zap,
  HardDrive,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { NetworkSyncInfo } from "../types";

interface NetworkSyncDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncInfo: NetworkSyncInfo;
  isMeasuringPing: boolean;
  onMeasurePing: () => Promise<number | null>;
  onTriggerSync: () => Promise<boolean>;
  isSyncing: boolean;
  localPartsCount: number;
}

export const NetworkSyncDiagnosticModal: React.FC<NetworkSyncDiagnosticModalProps> = ({
  isOpen,
  onClose,
  syncInfo,
  isMeasuringPing,
  onMeasurePing,
  onTriggerSync,
  isSyncing,
  localPartsCount,
}) => {
  if (!isOpen) return null;

  const getStatusBadge = () => {
    switch (syncInfo.syncStatus) {
      case "synced":
        return {
          bg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
          dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]",
          label: "ZSYNCHRONIZOWANO Z CHMURĄ",
        };
      case "syncing":
        return {
          bg: "bg-amber-500/15 border-amber-500/30 text-amber-300",
          dot: "bg-amber-400 animate-pulse",
          label: "SYNCHRONIZACJA W TOKU...",
        };
      case "offline":
        return {
          bg: "bg-rose-500/15 border-rose-500/30 text-rose-300",
          dot: "bg-rose-500",
          label: "TRYB OFFLINE (LOKALNY)",
        };
      case "error":
        return {
          bg: "bg-red-500/20 border-red-500/40 text-red-300",
          dot: "bg-red-500 animate-ping",
          label: "BŁĄD SYNCHRONIZACJI",
        };
    }
  };

  const badge = getStatusBadge();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col font-sans">
        {/* NAGŁÓWEK */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Diagnostyka Połączenia & Firestore</span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${badge.bg}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                  {badge.label}
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Monitor statusu sieciowego i synchronizacji w czasie rzeczywistym
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ZAWARTOŚĆ */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* GŁÓWNE STATUSY 2x2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Stan Sieci */}
            <div className="p-3.5 bg-[#030712] border border-slate-800/80 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                  {syncInfo.isOnline ? (
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  Połączenie z Internetem
                </span>
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    syncInfo.isOnline
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                  }`}
                >
                  {syncInfo.isOnline ? "ONLINE" : "OFFLINE"}
                </span>
              </div>
              <div className="mt-2 text-sm font-bold text-slate-200 font-mono">
                {syncInfo.isOnline ? "Przeglądarka podłączona do sieci" : "Brak dostępu do Internetu"}
              </div>
              <p className="text-[10px] text-slate-500 font-mono mt-1">
                Nasłuchiwanie zdarzeń window.online / offline aktywne
              </p>
            </div>

            {/* 2. Latency / Ping */}
            <div className="p-3.5 bg-[#030712] border border-slate-800/80 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  Opóźnienie (Ping do Firestore)
                </span>
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    syncInfo.latencyMs !== null && syncInfo.latencyMs < 100
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : syncInfo.latencyMs !== null && syncInfo.latencyMs < 300
                      ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {syncInfo.latencyMs !== null ? `${syncInfo.latencyMs} ms` : "—"}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-200 font-mono">
                  {syncInfo.latencyMs !== null
                    ? syncInfo.latencyMs < 150
                      ? "Połączenie doskonałe"
                      : "Połączenie stabilne"
                    : "Oczekiwanie na pomiar"}
                </span>
                <button
                  onClick={() => onMeasurePing()}
                  disabled={isMeasuringPing || !syncInfo.isOnline}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-yellow-400 text-[10px] font-mono font-bold rounded flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isMeasuringPing ? "animate-spin" : ""}`} />
                  <span>Testuj ping</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-500 font-mono mt-1">
                Automatyczny pomiar co 45 sekund
              </p>
            </div>
          </div>

          {/* SZCZEGÓŁY BAZY I PROTOKOŁU */}
          <div className="bg-[#030712] border border-slate-800/80 rounded-xl p-4 space-y-2.5">
            <div className="text-xs font-bold text-slate-300 font-mono flex items-center gap-2 border-b border-slate-800 pb-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Parametry bazy danych i konfiguracja chmury</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono pt-1">
              <div>
                <span className="text-slate-500 block text-[10px]">ID Bazy Firestore:</span>
                <span className="text-slate-200 font-semibold break-all text-[11px]">
                  {syncInfo.databaseId}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Główna Kolekcja:</span>
                <span className="text-yellow-400 font-semibold">{syncInfo.collectionName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Protokół sieciowy:</span>
                <span className="text-teal-400 font-semibold">
                  HTTP Long-Polling (resilient proxy)
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Ostatnia synchronizacja:</span>
                <span className="text-slate-200 font-semibold">
                  {syncInfo.lastSyncTime
                    ? syncInfo.lastSyncTime.toLocaleTimeString("pl-PL")
                    : "W trakcie sesji"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">
                  Pozycje w pamięci lokalnej (WMS):
                </span>
                <span className="text-white font-bold">{localPartsCount} szt.</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Oczekujące zapisy (Pending):</span>
                <span
                  className={
                    syncInfo.pendingWritesCount > 0 ? "text-amber-400 font-bold" : "text-emerald-400"
                  }
                >
                  {syncInfo.pendingWritesCount}
                </span>
              </div>
            </div>
          </div>

          {/* TRYB ODPORNY NA BRAK SIECI (OFFLINE-FIRST) */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3.5 flex items-start gap-3">
            <div className="p-2 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-lg shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <span className="font-bold text-slate-200 block font-mono">
                Architektura Offline-First (Gwarancja braku utraty danych)
              </span>
              <p className="text-slate-400 mt-1 leading-relaxed">
                Wszelkie wpisy części, skany AI i karty demontażu zapisują się niezwłocznie w lokalnej
                bazie IndexedDB oraz localStorage. W momencie ponownego nawiązania łączności z siecią,
                system natychmiast synchronizuje stan z bazą Google Cloud Firestore.
              </p>
            </div>
          </div>

          {/* BŁĄD JEŚLI WYSTĄPIŁ */}
          {syncInfo.errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2 font-mono">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{syncInfo.errorMessage}</span>
            </div>
          )}
        </div>

        {/* STOPKA Z PRZYCISKAMI AKCJI */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold rounded-lg transition cursor-pointer"
          >
            Zamknij
          </button>
          <button
            onClick={() => onTriggerSync()}
            disabled={isSyncing || !syncInfo.isOnline}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold rounded-lg transition flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Synchronizuję dane..." : "Wymuś pełną synchronizację"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
