import React from "react";
import {
  Box,
  Coins,
  MapPin,
  Cloud,
  CloudCheck,
  CloudOff,
  RefreshCw,
  Wifi,
  WifiOff,
  Activity,
  Zap,
} from "lucide-react";
import { PartItem, NetworkSyncInfo } from "../types";

interface StatsBarProps {
  drafts: PartItem[];
  syncInfo?: NetworkSyncInfo;
  onTriggerSync?: () => void;
  isSyncing?: boolean;
  onOpenDiagnostics?: () => void;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  drafts,
  syncInfo,
  onTriggerSync,
  isSyncing = false,
  onOpenDiagnostics,
}) => {
  const totalValue = drafts.reduce(
    (acc, d) => acc + (d.listingData?.cena?.brutto || 0),
    0
  );

  const syncStatus = syncInfo?.syncStatus || "synced";
  const isOnline = syncInfo ? syncInfo.isOnline : true;

  const getSyncBadge = () => {
    switch (syncStatus) {
      case "synced":
        return {
          dotColor: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse",
          label: "ONLINE • ZSYNCHRONIZOWANO",
          textColor: "text-emerald-400",
          icon: CloudCheck,
          iconColor: "text-emerald-400",
        };
      case "syncing":
        return {
          dotColor: "bg-amber-400 animate-spin",
          label: "SYNCHRONIZACJA W TOKU...",
          textColor: "text-amber-400",
          icon: RefreshCw,
          iconColor: "text-amber-400 animate-spin",
        };
      case "offline":
        return {
          dotColor: "bg-rose-500",
          label: "OFFLINE • KOPIA LOKALNA",
          textColor: "text-rose-400",
          icon: CloudOff,
          iconColor: "text-rose-400",
        };
      case "error":
        return {
          dotColor: "bg-red-500 animate-ping",
          label: "BŁĄD SYNCHRONIZACJI",
          textColor: "text-red-400",
          icon: WifiOff,
          iconColor: "text-red-400",
        };
    }
  };

  const badge = getSyncBadge();
  const StatusIcon = badge.icon;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* STAN MAGAZYNU */}
      <div className="bg-[#0b0f19] border border-slate-800/90 p-3.5 sm:p-4 rounded-xl flex items-center justify-between shadow-xs hover:border-slate-750 transition">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span> Stan Magazynu
          </span>
          <div className="text-2xl sm:text-3xl font-black text-white mt-0.5 tracking-tight font-mono">
            {drafts.length} <span className="text-xs font-semibold text-slate-400">SZT.</span>
          </div>
        </div>
        <div className="p-2.5 bg-[#030712] rounded-lg text-yellow-400 border border-slate-800/90 shadow-inner">
          <Box className="w-5 h-5" />
        </div>
      </div>

      {/* WYCENA ŁĄCZNA */}
      <div className="bg-[#0b0f19] border border-slate-800/90 p-3.5 sm:p-4 rounded-xl flex items-center justify-between shadow-xs hover:border-slate-750 transition">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Wycena Łączna
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-0.5 font-mono tracking-tight">
            {totalValue.toLocaleString("pl-PL")}{" "}
            <span className="text-xs font-semibold text-emerald-300">PLN</span>
          </div>
        </div>
        <div className="p-2.5 bg-[#030712] rounded-lg text-emerald-400 border border-slate-800/90 shadow-inner">
          <Coins className="w-5 h-5" />
        </div>
      </div>

      {/* LOKALIZACJA */}
      <div className="bg-[#0b0f19] border border-slate-800/90 p-3.5 sm:p-4 rounded-xl flex items-center justify-between shadow-xs hover:border-slate-750 transition">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span> Lokalizacja Stacji
          </span>
          <div className="text-lg sm:text-xl font-black text-white mt-0.5 font-mono">MYSŁAKOWICE</div>
          <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
            <MapPin className="w-3 h-3 text-teal-400 inline" /> ul. Daszyńskiego 16G
          </span>
        </div>
        <div className="p-2.5 bg-[#030712] rounded-lg text-teal-400 border border-slate-800/90 shadow-inner">
          <MapPin className="w-5 h-5" />
        </div>
      </div>

      {/* WSKAŹNIK POŁĄCZENIA Z SIECIĄ & FIRESTORE W CZASIE RZECZYWISTYM */}
      <div
        onClick={onOpenDiagnostics}
        className="bg-[#0b0f19] border border-slate-800/90 hover:border-slate-700 p-3.5 sm:p-4 rounded-xl flex items-center justify-between shadow-xs transition cursor-pointer group relative"
        title="Kliknij, aby otworzyć pełną diagnostykę połączenia z siecią i bazy Firestore"
      >
        <div className="min-w-0 flex-1 pr-2">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${badge.dotColor}`}></span>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono truncate">
              Sieć & Firestore
            </span>
            {syncInfo?.latencyMs !== null && syncInfo?.latencyMs !== undefined && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded ml-auto sm:ml-1">
                {syncInfo.latencyMs}ms
              </span>
            )}
          </div>

          <div
            className={`text-sm sm:text-base font-black mt-0.5 font-mono tracking-tight truncate ${badge.textColor}`}
          >
            {badge.label}
          </div>

          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-mono">
            <span className="truncate">
              Synchr.:{" "}
              {syncInfo?.lastSyncTime
                ? syncInfo.lastSyncTime.toLocaleTimeString("pl-PL")
                : "Aktywna"}
            </span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-[10px] text-teal-400/90 group-hover:underline hidden sm:inline">
              Szczegóły ↗
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {onTriggerSync && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTriggerSync();
              }}
              disabled={isSyncing || !isOnline}
              title="Wymuś synchronizację z Firestore"
              className="p-2 bg-[#030712] hover:bg-slate-900 text-slate-300 hover:text-white rounded-lg border border-slate-800/90 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin text-amber-400" : ""}`} />
            </button>
          )}

          <div className="p-2.5 bg-[#030712] rounded-lg border border-slate-800/90 shadow-inner group-hover:border-slate-700 transition">
            <StatusIcon className={`w-5 h-5 ${badge.iconColor}`} />
          </div>
        </div>
      </div>
    </div>
  );
};

