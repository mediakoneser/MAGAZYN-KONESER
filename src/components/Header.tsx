import React, { useState } from "react";
import {
  Car,
  Warehouse,
  Sparkles,
  Headphones,
  Settings,
  BookOpen,
  UploadCloud,
  ShoppingBag,
  Layers,
  Key,
  FileCode,
  Sparkle,
  Phone,
  MapPin,
  Clock,
  LogIn,
  LogOut,
  UserCheck,
  Cloud,
  Camera,
  Shield,
  Globe,
  Activity,
  GitCompare,
  Bell,
  Mic,
  Zap,
  Wifi,
  WifiOff,
  CloudCheck,
  ClipboardList,
  Building2,
  TrendingUp,
  AlertTriangle,
  Terminal,
  Briefcase,
  HardDrive,
  Database,
  Mail,
} from "lucide-react";
import { ActiveTabType, UserRole, NetworkSyncInfo } from "../types";
import { useAuth } from "../lib/AuthContext";

interface HeaderProps {
  activeTab: ActiveTabType;
  setActiveTab: (tab: ActiveTabType) => void;
  onOpenApiKeyModal: () => void;
  onOpenDirectAdminModal: () => void;
  onOpenProjectReport?: () => void;
  onSanitizeDatabase?: () => void;
  onSyncFirestore?: () => void;
  isSyncingFirestore?: boolean;
  hasApiKey: boolean;
  totalPartsCount?: number;
  currentUserRole?: UserRole;
  onOpenNotificationModal?: () => void;
  onOpenVoiceModal?: () => void;
  unreadNotificationsCount?: number;
  urgentNotificationsCount?: number;
  syncInfo?: NetworkSyncInfo;
  onOpenDiagnostics?: () => void;
  onOpenDeployModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenApiKeyModal,
  onOpenDirectAdminModal,
  onOpenProjectReport,
  onSanitizeDatabase,
  onSyncFirestore,
  isSyncingFirestore,
  hasApiKey,
  totalPartsCount = 0,
  currentUserRole = "Właściciel / Szef",
  onOpenNotificationModal,
  onOpenVoiceModal,
  unreadNotificationsCount = 0,
  urgentNotificationsCount = 0,
  syncInfo,
  onOpenDiagnostics,
  onOpenDeployModal,
}) => {
  const { user, accessToken, signInWithGoogle, signOut, loading: authLoading } = useAuth();

  const tabs = [
    { id: "business_dashboard" as ActiveTabType, label: "Business OS", icon: Briefcase, highlight: true },
    { id: "pojazdy" as ActiveTabType, label: "Karty Pojazdów & Flota", icon: Car },
    { id: "magazyn" as ActiveTabType, label: "Magazyn WMS", icon: Warehouse },
    { id: "pracownik" as ActiveTabType, label: "Stanowisko Pracownika", icon: Camera },
    { id: "skaner" as ActiveTabType, label: "Skaner AI & Wycena", icon: Sparkles },
    { id: "tecdoc_catalog" as ActiveTabType, label: "Katalog TecDoc / VIN", icon: Database, highlight: true },
    { id: "allegro" as ActiveTabType, label: "Aukcje Allegro", icon: Layers },
    { id: "ovoko" as ActiveTabType, label: "Ovoko / RRR", icon: Globe, highlight: true },
    { id: "shopgold" as ActiveTabType, label: "Sklep ShopGold", icon: ShoppingBag },
    { id: "google_drive" as ActiveTabType, label: "Dysk Google", icon: HardDrive, highlight: true },
    { id: "gmail" as ActiveTabType, label: "Gmail (Poczta)", icon: Mail, highlight: true },
    { id: "business_orders" as ActiveTabType, label: "Zamówienia", icon: ShoppingBag },
    { id: "business_contractors" as ActiveTabType, label: "Kontrahenci & NIP", icon: Building2 },
    { id: "business_finance" as ActiveTabType, label: "Finanse", icon: TrendingUp },
    { id: "business_integrations" as ActiveTabType, label: "Hub Integracji", icon: Globe },
    { id: "business_issues" as ActiveTabType, label: "Problemy", icon: AlertTriangle },
    { id: "business_logs" as ActiveTabType, label: "Logi & Zadania", icon: Terminal },
    { id: "business_public_data" as ActiveTabType, label: "Dane Publiczne", icon: Building2 },
    { id: "allegro_diagnostics" as ActiveTabType, label: "Allegro Diagnostyka", icon: Activity },
    { id: "compare_marketplaces" as ActiveTabType, label: "Porównaj Rynki", icon: GitCompare },
    { id: "szef" as ActiveTabType, label: "Panel Szefa", icon: Shield },
    { id: "infolinia" as ActiveTabType, label: "Infolinia AI", icon: Headphones },
    { id: "sklep" as ActiveTabType, label: "Katalog Klienta", icon: ShoppingBag },
    { id: "import" as ActiveTabType, label: "Import CSV", icon: UploadCloud },
    { id: "instrukcja" as ActiveTabType, label: "Instrukcja", icon: BookOpen },
  ];

  return (
    <header className="border-b border-slate-800/90 bg-[#070b14]/98 sticky top-0 z-40 backdrop-blur-md shadow-md">
      {/* TOP BRAND & CONTACT BAR */}
      <div className="max-w-7xl mx-auto px-3 sm:px-5 py-2 flex flex-col md:flex-row items-center justify-between gap-2 border-b border-slate-850/80">
        {/* BRANDING */}
        <div className="flex items-center justify-between w-full md:w-auto gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg shadow-sm text-slate-950 flex items-center justify-center shrink-0">
              <Car className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-white font-mono">
                  UKONESERA.PL
                </h1>
                <a
                  href="tel:533533443"
                  className="text-xs px-2 py-0.5 bg-yellow-400 text-slate-950 font-mono font-black rounded hover:bg-yellow-300 transition flex items-center gap-1 shadow-xs"
                >
                  <Phone className="w-3 h-3" />
                  <span>533 533 443</span>
                </a>
                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 font-mono font-bold rounded border border-emerald-500/20 hidden sm:inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Stacja Demontażu Pojazdów
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                <span>PHU U Konesera Grzegorz Kuźma</span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5 text-teal-400 inline" /> Mysłakowice, ul. Daszyńskiego 16G
                </span>
              </p>
            </div>
          </div>

          {/* Quick buttons on mobile */}
          <div className="flex items-center gap-1.5 md:hidden">
            {syncInfo && (
              <button
                onClick={onOpenDiagnostics}
                title={
                  syncInfo.isOnline
                    ? `Status: Online • Firestore ${syncInfo.syncStatus} (${syncInfo.latencyMs ?? 0}ms)`
                    : "Status: Brak połączenia z siecią (Offline)"
                }
                className={`p-1.5 border rounded-lg text-xs cursor-pointer flex items-center gap-1 font-mono ${
                  syncInfo.syncStatus === "synced"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : syncInfo.syncStatus === "syncing"
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    syncInfo.syncStatus === "synced"
                      ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)] animate-pulse"
                      : syncInfo.syncStatus === "syncing"
                      ? "bg-amber-400 animate-spin"
                      : "bg-rose-500"
                  }`}
                ></span>
                {syncInfo.isOnline ? (
                  <Wifi className="w-3 h-3" />
                ) : (
                  <WifiOff className="w-3 h-3 text-rose-400" />
                )}
              </button>
            )}

            {/* GOOGLE DRIVE STATUS BUTTON */}
            <button
              onClick={() => setActiveTab("google_drive")}
              title={accessToken ? "Dysk Google: Połączono (kliknij, aby zarządzać plikami)" : "Dysk Google: Kliknij, aby połączyć"}
              className={`p-1.5 border rounded-lg text-xs transition cursor-pointer flex items-center gap-1 ${
                accessToken
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-yellow-400"
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              {accessToken && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
            </button>

            {user ? (
              <button
                onClick={signOut}
                title="Wyloguj"
                className="p-1.5 bg-slate-900 border border-slate-800 text-red-400 rounded-lg text-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={signInWithGoogle}
                title="Zaloguj przez Google"
                className="p-1.5 bg-yellow-400 text-slate-950 font-bold rounded-lg text-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
              </button>
            )}
            {onOpenProjectReport && (
              <button
                onClick={onOpenProjectReport}
                title="Raport z Projektu WMS"
                className="p-1.5 bg-yellow-400/20 border border-yellow-400/40 text-yellow-300 rounded-lg hover:bg-yellow-400/30 text-xs"
              >
                <ClipboardList className="w-3.5 h-3.5" />
              </button>
            )}
            {onOpenDeployModal && (
              <button
                onClick={onOpenDeployModal}
                title="Wdróż na Google Cloud Run (BETA)"
                className="p-1.5 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 rounded-lg hover:bg-cyan-500/30 text-xs cursor-pointer"
              >
                <Cloud className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onOpenDirectAdminModal}
              title="DirectAdmin HTML"
              className="p-1.5 bg-slate-900 border border-slate-800 text-teal-400 rounded-lg hover:bg-slate-800 text-xs"
            >
              <FileCode className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onOpenApiKeyModal}
              title="Klucz Gemini"
              className="p-1.5 bg-slate-900 border border-slate-800 text-yellow-400 rounded-lg hover:bg-slate-800 text-xs"
            >
              <Key className="w-3.5 h-3.5" />
            </button>
            {onOpenVoiceModal && (
              <button
                onClick={onOpenVoiceModal}
                title="Dyktafon mowy i asystent głosowy"
                className="p-1.5 bg-amber-400/20 border border-amber-400/40 text-amber-300 rounded-lg text-xs cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5" />
              </button>
            )}
            {onOpenNotificationModal && (
              <button
                onClick={onOpenNotificationModal}
                title="Centrum powiadomień"
                className={`relative p-1.5 border rounded-lg text-xs cursor-pointer ${
                  urgentNotificationsCount > 0
                    ? "bg-red-500/20 border-red-500 text-red-400 animate-pulse"
                    : unreadNotificationsCount > 0
                    ? "bg-slate-900 border-amber-500/40 text-amber-400"
                    : "bg-slate-900 border-slate-800 text-slate-400"
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                {unreadNotificationsCount > 0 && (
                  <span
                    className={`absolute -top-1 -right-1 w-3.5 h-3.5 text-[8px] font-black rounded-full flex items-center justify-center ${
                      urgentNotificationsCount > 0 ? "bg-red-500 text-white" : "bg-amber-400 text-slate-950"
                    }`}
                  >
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* RIGHT QUICK ACTIONS & AUTH BAR */}
        <div className="hidden md:flex items-center gap-2">
          {/* REAL-TIME NETWORK & FIRESTORE INDICATOR */}
          {syncInfo && (
            <button
              onClick={onOpenDiagnostics}
              title="Kliknij, aby otworzyć diagnostykę połączenia z siecią i bazy Firestore"
              className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition cursor-pointer ${
                syncInfo.syncStatus === "synced"
                  ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  : syncInfo.syncStatus === "syncing"
                  ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30"
                  : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  syncInfo.syncStatus === "synced"
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse"
                    : syncInfo.syncStatus === "syncing"
                    ? "bg-amber-400 animate-spin"
                    : "bg-rose-500"
                }`}
              ></span>
              {syncInfo.isOnline ? (
                <Wifi className="w-3 h-3 text-emerald-400" />
              ) : (
                <WifiOff className="w-3 h-3 text-rose-400" />
              )}
              <span>
                {syncInfo.syncStatus === "synced"
                  ? "Sieć: Online | Firestore OK"
                  : syncInfo.syncStatus === "syncing"
                  ? "Synchronizuję Firestore..."
                  : "Tryb Offline (Lokalny)"}
              </span>
              {syncInfo.latencyMs !== null && (
                <span className="text-[9px] bg-slate-900/80 px-1 py-0.2 rounded border border-slate-700 text-slate-300">
                  {syncInfo.latencyMs}ms
                </span>
              )}
            </button>
          )}

          <div className="text-[10px] text-slate-400 font-mono bg-[#030712] px-2.5 py-1 rounded-md border border-slate-800/80 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-teal-400" />
            <span>Pon-Pt: 9:00 - 17:00 | Sob: 9:00 - 14:00</span>
          </div>

          {/* CLOUD FIRESTORE SYNC */}
          {onSyncFirestore && (
            <button
              onClick={onSyncFirestore}
              disabled={isSyncingFirestore}
              title="Zsynchronizuj bazę części z chmurą Firebase Firestore"
              className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer font-mono disabled:opacity-50"
            >
              <Cloud className={`w-3 h-3 text-emerald-400 ${isSyncingFirestore ? "animate-spin" : ""}`} />
              <span>{isSyncingFirestore ? "Synchronizuję..." : "Cloud Firestore"}</span>
            </button>
          )}

          {onSanitizeDatabase && (
            <button
              onClick={onSanitizeDatabase}
              title="Oczyść i napraw znaczniki HTML w całej bazie"
              className="px-2.5 py-1 bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer font-mono"
            >
              <Sparkle className="w-3 h-3 text-yellow-400" />
              <span>Napraw bazę</span>
            </button>
          )}

          {onOpenProjectReport && (
            <button
              onClick={onOpenProjectReport}
              title="Zobacz oficjalny Raport z Projektu dla PHU U Konesera"
              className="px-2.5 py-1 bg-yellow-400/15 hover:bg-yellow-400/25 text-yellow-300 border border-yellow-400/35 rounded-md text-[11px] font-bold transition flex items-center gap-1 whitespace-nowrap cursor-pointer font-mono shadow-xs"
            >
              <ClipboardList className="w-3.5 h-3.5 text-yellow-400" />
              <span>Raport Projektu</span>
            </button>
          )}

          {onOpenDeployModal && (
            <button
              onClick={onOpenDeployModal}
              title="Centrum Wdrożenia na Google Cloud Run (BETA) & Dockerfile"
              className="px-2.5 py-1 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 rounded-md text-[11px] font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer font-mono shadow-xs"
            >
              <Cloud className="w-3.5 h-3.5 text-cyan-400" />
              <span>Cloud Run BETA</span>
            </button>
          )}

          <button
            onClick={onOpenDirectAdminModal}
            title="Pobierz gotowy plik public_html/index.html dla DirectAdmin"
            className="px-2.5 py-1 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-md text-[11px] font-bold transition flex items-center gap-1 whitespace-nowrap cursor-pointer font-mono"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>DirectAdmin HTML</span>
          </button>

          <button
            onClick={onOpenApiKeyModal}
            title="Ustawienia klucza Gemini Vision API"
            className={`p-1.5 rounded-md text-[11px] font-bold transition border flex items-center gap-1 cursor-pointer ${
              hasApiKey
                ? "bg-yellow-400/15 text-yellow-400 border-yellow-400/30 hover:bg-yellow-400/25"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
            }`}
          >
            <Key className="w-3.5 h-3.5" />
          </button>

          {/* DYKTAFON MOWY & ASYSTENT GŁOSOWY */}
          {onOpenVoiceModal && (
            <button
              onClick={onOpenVoiceModal}
              title="Dyktafon mowy & sterowanie panelem głosem (pl-PL)"
              className="px-2.5 py-1 bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/30 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer font-mono shadow-xs"
            >
              <Mic className="w-3.5 h-3.5 text-amber-400" />
              <span>Dyktafon</span>
            </button>
          )}

          {/* CENTRUM POWIADOMIEŃ WEWNĄTRZ APLIKACJI */}
          {onOpenNotificationModal && (
            <button
              onClick={onOpenNotificationModal}
              title="Centrum powiadomień i pilne zadania szefa"
              className={`relative px-2.5 py-1 rounded-md text-[11px] font-bold transition border flex items-center gap-1.5 cursor-pointer font-mono ${
                urgentNotificationsCount > 0
                  ? "bg-red-500/20 hover:bg-red-500/30 text-red-300 border-red-500/50 animate-pulse shadow-xs"
                  : unreadNotificationsCount > 0
                  ? "bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border-amber-400/30"
                  : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800"
              }`}
            >
              {urgentNotificationsCount > 0 ? (
                <Zap className="w-3.5 h-3.5 text-red-400 animate-pulse" />
              ) : (
                <Bell className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>Powiadomienia</span>
              {unreadNotificationsCount > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                    urgentNotificationsCount > 0
                      ? "bg-red-500 text-white animate-bounce"
                      : "bg-amber-400 text-slate-950"
                  }`}
                >
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
          )}

          {/* FIREBASE AUTH GOOGLE BUTTON */}
          {user ? (
            <div className="flex items-center gap-1.5 pl-1">
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md text-[11px] font-mono text-slate-200">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "User"}
                    className="w-4 h-4 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span className="truncate max-w-[100px]">{user.displayName || user.email?.split("@")[0]}</span>
              </div>
              <button
                onClick={signOut}
                title="Wyloguj z Firebase"
                className="p-1 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/40 rounded-md text-[10px] font-bold transition cursor-pointer"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              disabled={authLoading}
              title="Zaloguj się kontem Google przez Firebase Auth"
              className="px-2.5 py-1 bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 text-slate-950 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer font-mono shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Zaloguj Google</span>
            </button>
          )}
        </div>
      </div>

      {/* BOTTOM NAV TABS - FULL WIDTH, CLEAN & WRAPPABLE */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-1.5">
        <nav className="flex flex-wrap items-center gap-1 justify-start">
          {tabs.map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap font-mono ${
                  isActive
                    ? "bg-yellow-400 text-slate-950 shadow-xs font-black ring-1 ring-yellow-300"
                    : tab.highlight
                    ? "bg-teal-500/15 text-teal-300 hover:bg-teal-500/25 border border-teal-500/30"
                    : "bg-slate-950/60 text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-850/80"
                }`}
              >
                <IconComp
                  className={`w-3.5 h-3.5 ${
                    isActive ? "text-slate-950 stroke-[2.5]" : tab.highlight ? "text-teal-400" : "text-yellow-400/80"
                  }`}
                />
                <span>{tab.label}</span>
                {tab.id === "magazyn" && totalPartsCount > 0 && (
                  <span
                    className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isActive
                        ? "bg-slate-950 text-yellow-400"
                        : "bg-yellow-400/15 text-yellow-300"
                    }`}
                  >
                    {totalPartsCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
