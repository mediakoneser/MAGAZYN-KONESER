import React, { useState, useMemo } from "react";
import {
  Shield,
  Users,
  Award,
  TrendingUp,
  Layers,
  FileSpreadsheet,
  Building,
  Phone,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  Clock,
  Sparkles,
  Tag,
  DollarSign,
  UserCheck,
  Car,
  Sliders,
  SlidersHorizontal,
  Wrench,
  Percent,
  Database,
  Activity,
  FileText,
  RefreshCw,
  Zap,
  ShoppingBag,
  HardDrive,
  Mic,
  Bell,
} from "lucide-react";
import {
  PartItem,
  StaffMember,
  UserRole,
  PartStatus,
  VehicleDismantleRecord,
} from "../types";
import { initialVehicleDismantleQueue } from "../data/mockWorkerData";
import { SqlDatabasePanel } from "./SqlDatabasePanel";
import { BossLiveAssistant } from "./BossLiveAssistant";
import { ShopGoldTab } from "./ShopGoldTab";
import { DatabaseInstructionsTab } from "./DatabaseInstructionsTab";
import { VehiclePurchaseCalculator } from "./VehiclePurchaseCalculator";
import { MechanicCommissionReportsTab } from "./MechanicCommissionReportsTab";

interface BossPanelTabProps {
  drafts: PartItem[];
  setDrafts: React.Dispatch<React.SetStateAction<PartItem[]>>;
  onExportCsv: () => void;
  staffList: StaffMember[];
  setStaffList: React.Dispatch<React.SetStateAction<StaffMember[]>>;
  currentUserRole: UserRole;
  setCurrentUserRole: (role: UserRole) => void;
  vehicles?: VehicleDismantleRecord[];
  setVehicles?: React.Dispatch<React.SetStateAction<VehicleDismantleRecord[]>>;
  apiKey?: string;
  onOpenNotificationModal?: () => void;
  onOpenVoiceModal?: () => void;
}

export const BossPanelTab: React.FC<BossPanelTabProps> = ({
  drafts,
  setDrafts,
  onExportCsv,
  staffList,
  setStaffList,
  currentUserRole,
  setCurrentUserRole,
  vehicles: propVehicles,
  setVehicles: propSetVehicles,
  apiKey = "",
  onOpenNotificationModal,
  onOpenVoiceModal,
}) => {
  const [activeSection, setActiveSection] = useState<
    | "overview"
    | "purchase_calc"
    | "mechanic_commissions"
    | "live_ai"
    | "shopgold"
    | "db_instructions"
    | "fleet"
    | "pricing"
    | "database"
    | "staff"
    | "system"
    | "roles"
  >("overview");

  // Local vehicles queue if not passed from parent
  const [localVehicles, setLocalVehicles] = useState<VehicleDismantleRecord[]>(() => {
    try {
      const stored = localStorage.getItem("koneser_vehicles_queue_v1");
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return initialVehicleDismantleQueue;
  });

  const vehicles = propVehicles || localVehicles;
  const setVehicles = propSetVehicles || setLocalVehicles;

  // New Staff state
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<UserRole>("Pracownik / Demontażysta");
  const [newStaffStation, setNewStaffStation] = useState("Stanowisko 1 (Mysłakowice)");

  // Repricing Engine state
  const [markupPercent, setMarkupPercent] = useState<number>(10);
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>("all");

  // New Vehicle state
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [newCarMake, setNewCarMake] = useState("");
  const [newCarModel, setNewCarModel] = useState("");
  const [newCarYear, setNewCarYear] = useState("2006");
  const [newCarVin, setNewCarVin] = useState("");
  const [newCarEstValue, setNewCarEstValue] = useState<number>(3000);
  const [newCarWorker, setNewCarWorker] = useState("Marek Demontaż");

  // Financial and parts metrics
  const totalBrutto = drafts.reduce((a, b) => a + (b.listingData?.cena?.brutto || 0), 0);
  const totalNetto = drafts.reduce((a, b) => a + (b.listingData?.cena?.netto || 0), 0);

  // Status breakdown
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      Dostępny: 0,
      Zarezerwowany: 0,
      Sprzedany: 0,
      "W przygotowaniu": 0,
      Zutylizowany: 0,
    };
    for (const d of drafts) {
      const s = d.status || "Dostępny";
      counts[s] = (counts[s] || 0) + 1;
    }
    return counts;
  }, [drafts]);

  // Unique vehicle makes count
  const uniqueMakes = useMemo(() => {
    return new Set(
      drafts
        .map((d) => d.listingData?.samochod?.marka || d.listingData?.marka)
        .filter(Boolean)
    ).size;
  }, [drafts]);

  // Worker productivity ranking
  const workerStats = useMemo(() => {
    const stats: Record<string, number> = {};
    drafts.forEach((d) => {
      const w = d.createdByName || d.listingData?.workerName || "Nieprzypisany";
      stats[w] = (stats[w] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  }, [drafts]);

  // Handle staff addition
  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;

    const newMember: StaffMember = {
      id: `staff_${Date.now()}`,
      name: newStaffName.trim(),
      email: newStaffEmail.trim() || `${newStaffName.toLowerCase().replace(/\s+/g, ".")}@ukonesera.pl`,
      role: newStaffRole,
      stationCode: newStaffStation,
      partsLoggedCount: 0,
      active: true,
    };

    setStaffList((prev) => [...prev, newMember]);
    setNewStaffName("");
    setNewStaffEmail("");
  };

  const handleToggleStaff = (id: string) => {
    setStaffList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
    );
  };

  const handleDeleteStaff = (id: string) => {
    if (confirm("Czy na pewno usunąć pracownika?")) {
      setStaffList((prev) => prev.filter((s) => s.id !== id));
    }
  };

  // Handle Vehicle Queue Addition
  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCarMake.trim() || !newCarModel.trim()) return;

    const newRecord: VehicleDismantleRecord = {
      id: `veh_${Date.now()}`,
      make: newCarMake.trim(),
      model: newCarModel.trim(),
      year: newCarYear.trim(),
      vin: newCarVin.trim() || undefined,
      status: "W kolejce do demontażu",
      estimatedPartsValue: Number(newCarEstValue) || 2500,
      assignedWorker: newCarWorker,
      entryDate: new Date().toISOString().slice(0, 10),
    };

    setVehicles((prev) => [newRecord, ...prev]);
    setNewCarMake("");
    setNewCarModel("");
    setNewCarVin("");
    setIsAddingVehicle(false);
  };

  // Handle Bulk Repricing
  const handleApplyRepricing = () => {
    if (markupPercent === 0) return;
    const factor = 1 + markupPercent / 100;

    const updated = drafts.map((d) => {
      const brand = (d.listingData?.samochod?.marka || d.listingData?.marka || "").toLowerCase();
      if (selectedBrandFilter !== "all" && !brand.includes(selectedBrandFilter.toLowerCase())) {
        return d;
      }
      const currentGross = d.listingData?.cena?.brutto || 100;
      const newGross = Math.round(currentGross * factor);
      const newNet = Math.round(newGross / 1.23);

      return {
        ...d,
        listingData: {
          ...d.listingData,
          cena: {
            brutto: newGross,
            netto: newNet,
          },
        },
      };
    });

    setDrafts(updated);
    alert(`Pomyślnie zaktualizowano marżę o ${markupPercent > 0 ? "+" : ""}${markupPercent}% dla wybranych pozycji!`);
  };

  return (
    <div className="space-y-4">
      {/* HEADER PANELU ZAAWANSOWANEGO */}
      <div className="bg-[#0b0f19] border border-slate-800/90 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-400/10 text-yellow-400 border border-yellow-400/25 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                  Panel Szefa & Zaawansowanego Użytkownika
                </h2>
                <span className="text-[11px] px-2 py-0.5 bg-yellow-400/15 text-yellow-300 font-mono font-bold rounded border border-yellow-400/30">
                  {currentUserRole}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Nadzór finansowy, harmonogram aut do demontażu, zespół pracowników i reguły marżowe WMS.
              </p>
            </div>
          </div>

          {/* SZYBKI EKSPORT CSV, DYKTAFON & ZADANIA SZEFA */}
          <div className="flex items-center gap-2 flex-wrap">
            {onOpenVoiceModal && (
              <button
                onClick={onOpenVoiceModal}
                className="px-3 py-1.5 bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/30 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition shadow-xs"
              >
                <Mic className="w-3.5 h-3.5 text-amber-400" />
                <span>Dyktafon</span>
              </button>
            )}
            {onOpenNotificationModal && (
              <button
                onClick={onOpenNotificationModal}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition shadow-xs"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Zleć Pilne Zadanie</span>
              </button>
            )}
            <button
              onClick={onExportCsv}
              className="px-3 py-1.5 bg-[#030712] hover:bg-slate-900 text-yellow-400 border border-yellow-400/30 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Eksport CSV WMS</span>
            </button>
          </div>
        </div>

        {/* PRZEŁĄCZNIKI SEKCJI */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
          {[
            { id: "overview", label: "Finanse & Wyniki", icon: TrendingUp },
            { id: "purchase_calc", label: "Kalkulator Zakupu Aut (Laweta)", icon: Car, badge: "Zysk Laweta" },
            { id: "mechanic_commissions", label: "Raporty & Prowizje Mechaników", icon: Award, badge: "Prowizje" },
            { id: "live_ai", label: "Live Chat Gemini (Zarząd)", icon: Sparkles, badge: "AI Live" },
            { id: "shopgold", label: "Integracja ShopGold", icon: ShoppingBag, badge: "E-Sklep" },
            { id: "db_instructions", label: "Baza Danych & Zapis Informacji", icon: HardDrive, badge: "SQL Guide" },
            { id: "fleet", label: "Flota & Auta do Demontażu", icon: Car },
            { id: "pricing", label: "Kreator Marż & Reguły Cen", icon: Percent },
            { id: "database", label: "Baza Relacyjna SQL & Eksport", icon: Database },
            { id: "staff", label: "Zespół & Stanowiska", icon: Users },
            { id: "system", label: "Diagnostyka & Logi WMS", icon: Activity },
            { id: "roles", label: "Uprawnienia", icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  isActive
                    ? "bg-yellow-400 text-slate-950 shadow-xs"
                    : "bg-[#030712] text-slate-300 hover:bg-slate-800 border border-slate-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge && !isActive && (
                  <span className="text-[9px] px-1.5 py-0.2 bg-yellow-400/10 text-yellow-300 rounded border border-yellow-400/20 font-mono">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* SEKCJA: KALKULATOR ZYSKU Z ZAKUPU AUTA (LAWETA / SKUP) */}
      {activeSection === "purchase_calc" && (
        <VehiclePurchaseCalculator
          apiKey={apiKey}
          onSaveToQueue={(val) => {
            const newVeh: VehicleDismantleRecord = {
              id: "veh_" + Date.now(),
              make: val.make,
              model: val.model,
              year: val.year,
              vin: val.vin || "WVWZZZ" + Date.now().toString().slice(-6),
              engineCode: val.engine,
              status: "W kolejce do demontażu",
              estimatedPartsValue: val.estimatedPartsTotalGrossPln,
              scrapWeightKg: val.weightKg,
              entryDate: new Date().toISOString().split("T")[0],
            };
            setVehicles([newVeh, ...vehicles]);
          }}
        />
      )}

      {/* SEKCJA: RAPORTY SPRZEDAŻY & PROWIZJE MECHANIKÓW */}
      {activeSection === "mechanic_commissions" && (
        <MechanicCommissionReportsTab
          drafts={drafts}
          staffList={staffList}
        />
      )}

      {/* SEKCJA: LIVE CHAT GEMINI ASYSTENT DLA ZARZĄDU */}
      {activeSection === "live_ai" && (
        <BossLiveAssistant
          drafts={drafts}
          vehicles={vehicles}
          staffList={staffList}
          apiKey={apiKey}
          onNavigateToSql={() => setActiveSection("database")}
          onNavigateToShopGold={() => setActiveSection("shopgold")}
        />
      )}

      {/* SEKCJA: SHOPGOLD INTEGRACJA E-COMMERCE */}
      {activeSection === "shopgold" && (
        <ShopGoldTab drafts={drafts} />
      )}

      {/* SEKCJA: INSTRUKCJA POŁĄCZENIA Z BAZĄ DANYCH & ZAPIS INFORMACJI */}
      {activeSection === "db_instructions" && (
        <DatabaseInstructionsTab
          onNavigateToSqlConsole={() => setActiveSection("database")}
          onNavigateToShopGold={() => setActiveSection("shopgold")}
        />
      )}

      {/* SEKCJA 1: PRZEGLĄD FINANSOWY & KPI */}
      {activeSection === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-[#0b0f19] p-4 rounded-xl border border-slate-800/90 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">
                Łączna Wartość Brutto
              </span>
              <div className="text-2xl font-black text-yellow-400 font-mono">
                {totalBrutto.toLocaleString("pl-PL")} PLN
              </div>
              <span className="text-[11px] text-slate-400 block font-mono">
                Netto: {totalNetto.toLocaleString("pl-PL")} PLN
              </span>
            </div>

            <div className="bg-[#0b0f19] p-4 rounded-xl border border-slate-800/90 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">
                Pozycje w Magazynie
              </span>
              <div className="text-2xl font-black text-white font-mono">
                {drafts.length.toLocaleString("pl-PL")} szt.
              </div>
              <span className="text-[11px] text-slate-400 block font-mono">
                W {uniqueMakes} markach pojazdów
              </span>
            </div>

            <div className="bg-[#0b0f19] p-4 rounded-xl border border-slate-800/90 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">
                Zarezerwowane / Zamówione
              </span>
              <div className="text-2xl font-black text-teal-400 font-mono">
                {statusCounts["Zarezerwowany"] || 0} szt.
              </div>
              <span className="text-[11px] text-slate-400 block font-mono">
                Sprzedane: {statusCounts["Sprzedany"] || 0} szt.
              </span>
            </div>

            <div className="bg-[#0b0f19] p-4 rounded-xl border border-slate-800/90 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">
                Zespół Demontażu
              </span>
              <div className="text-2xl font-black text-white font-mono">
                {staffList.filter((s) => s.active).length} aktywnych
              </div>
              <span className="text-[11px] text-slate-400 block font-mono">
                Stacja Mysłakowice Daszyńskiego 16G
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[#0b0f19] border border-slate-800/90 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
                <Award className="w-4 h-4 text-yellow-400" /> Ranking Wprowadzania Części przez Pracowników
              </h3>
              <div className="divide-y divide-slate-850">
                {workerStats.map(([name, count], index) => (
                  <div key={name} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-yellow-400 font-mono font-bold text-[10px] flex items-center justify-center border border-slate-800">
                        {index + 1}
                      </span>
                      <span className="font-bold text-white">{name}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="px-2 py-0.5 bg-yellow-400/10 text-yellow-300 rounded border border-yellow-400/20 font-bold">
                        {count} części
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        ({Math.round((count / Math.max(1, drafts.length)) * 100)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0b0f19] border border-slate-800/90 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
                <Building className="w-4 h-4 text-teal-400" /> Dane Rejestrowe i Kontaktowe Stacji
              </h3>
              <div className="space-y-2 text-xs text-slate-300 font-mono">
                <div className="p-2.5 bg-[#030712] rounded-lg border border-slate-800 space-y-1">
                  <div className="text-yellow-400 font-bold">PHU U KONESERA Grzegorz Kuźma</div>
                  <div className="text-slate-400">NIP: 611-236-47-28 | REGON: 021239840</div>
                  <div className="text-slate-300">58-533 Mysłakowice, ul. Daszyńskiego 16G (Dolnośląskie)</div>
                </div>
                <div className="p-2.5 bg-[#030712] rounded-lg border border-slate-800 space-y-1">
                  <div className="text-teal-400 font-bold">Infolinia / Dyspozytor Lawet:</div>
                  <div className="text-white text-sm font-black flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-yellow-400" /> 533 533 443
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Godziny przyjęć: Pon-Pt 9:00 - 17:00, Sob 9:00 - 14:00
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEKCJA 2: FLOTA & AUTA DO DEMONTAŻU */}
      {activeSection === "fleet" && (
        <div className="space-y-4">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-white font-mono flex items-center gap-2">
                  <Car className="w-4 h-4 text-cyan-400" />
                  Kolejka Pojazdów do Demontażu & Kasacji ({vehicles.length})
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Planowanie rozbiórki samochodów sprowadzonych lawetą na plac w Mysłakowicach.
                </p>
              </div>

              <button
                onClick={() => setIsAddingVehicle(!isAddingVehicle)}
                className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-mono font-black rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Dodaj Pojazd z Lawety</span>
              </button>
            </div>

            {/* FORMULARZ PRZYJĘCIA AUTA */}
            {isAddingVehicle && (
              <form
                onSubmit={handleAddVehicle}
                className="p-4 bg-[#050914] border border-yellow-400/30 rounded-xl space-y-3 font-mono text-xs"
              >
                <div className="text-xs font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5" /> Wprowadzenie nowego pojazdu
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-slate-300 block mb-1">Marka:</label>
                    <input
                      type="text"
                      required
                      placeholder="np. Audi"
                      value={newCarMake}
                      onChange={(e) => setNewCarMake(e.target.value)}
                      className="w-full bg-[#030712] border border-slate-700 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Model / Silnik:</label>
                    <input
                      type="text"
                      required
                      placeholder="np. A6 C6 2.7 TDI"
                      value={newCarModel}
                      onChange={(e) => setNewCarModel(e.target.value)}
                      className="w-full bg-[#030712] border border-slate-700 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Rocznik:</label>
                    <input
                      type="text"
                      placeholder="2007"
                      value={newCarYear}
                      onChange={(e) => setNewCarYear(e.target.value)}
                      className="w-full bg-[#030712] border border-slate-700 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Szacowana Wartość Części (PLN):</label>
                    <input
                      type="number"
                      value={newCarEstValue}
                      onChange={(e) => setNewCarEstValue(Number(e.target.value))}
                      className="w-full bg-[#030712] border border-slate-700 rounded-lg p-2 text-yellow-400 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 block mb-1">Numer VIN / Zaświadczenie Kasacji:</label>
                    <input
                      type="text"
                      placeholder="WAUZZZ..."
                      value={newCarVin}
                      onChange={(e) => setNewCarVin(e.target.value)}
                      className="w-full bg-[#030712] border border-slate-700 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Przypisany Demontażysta:</label>
                    <select
                      value={newCarWorker}
                      onChange={(e) => setNewCarWorker(e.target.value)}
                      className="w-full bg-[#030712] border border-slate-700 rounded-lg p-2 text-white"
                    >
                      {staffList.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name} ({s.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingVehicle(false)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-yellow-400 text-slate-950 font-bold rounded-lg hover:bg-yellow-300"
                  >
                    Zapisz w kolejce
                  </button>
                </div>
              </form>
            )}

            {/* TABELA AUT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {vehicles.map((v) => (
                <div
                  key={v.id}
                  className="p-4 rounded-xl bg-[#070c18] border border-slate-800 font-mono text-xs space-y-2 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">
                      {v.make} {v.model} ({v.year})
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        v.status === "W trakcie demontażu"
                          ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
                          : v.status === "Części zmagazynowane"
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                      }`}
                    >
                      {v.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-slate-300 text-[11px]">
                    <div>
                      VIN: <span className="text-slate-400">{v.vin || "Brak (skup BDO)"}</span>
                    </div>
                    <div>
                      Data przyjęcia: <span className="text-slate-400">{v.entryDate}</span>
                    </div>
                    <div>
                      Wycena części: <strong className="text-emerald-400">+{v.estimatedPartsValue} PLN</strong>
                    </div>
                    <div>
                      Demontaż: <strong className="text-yellow-400">{v.assignedWorker || "Plac"}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SEKCJA 3: KREATOR MARŻ & REGUŁY CENOWE */}
      {activeSection === "pricing" && (
        <div className="space-y-4">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4 font-mono text-xs">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Percent className="w-4 h-4 text-emerald-400" />
                Automatyczny Silnik Marżowy & Wyceny Masowej
              </h3>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Dostosuj globalne marże w magazynie WMS dla wybranych marek lub całego asortymentu w oparciu o trendy Allegro i OVOKO.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Filtr Marki Pojazdu:</label>
                <select
                  value={selectedBrandFilter}
                  onChange={(e) => setSelectedBrandFilter(e.target.value)}
                  className="w-full bg-[#030712] border border-slate-800 rounded-lg p-2.5 text-white"
                >
                  <option value="all">Wszystkie marki ({drafts.length} pozycji)</option>
                  <option value="audi">Audi</option>
                  <option value="volkswagen">Volkswagen / VAG</option>
                  <option value="skoda">Skoda</option>
                  <option value="opel">Opel</option>
                  <option value="bmw">BMW</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Modyfikacja Ceny (%):</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={markupPercent}
                    onChange={(e) => setMarkupPercent(Number(e.target.value))}
                    className="w-full bg-[#030712] border border-slate-800 rounded-lg p-2.5 text-yellow-400 font-bold text-sm"
                  />
                  <span className="text-slate-400">%</span>
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleApplyRepricing}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer transition shadow-md"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Zastosuj Zmianę Marży</span>
                </button>
              </div>
            </div>

            <div className="p-3 bg-[#050914] border border-slate-800 rounded-lg text-slate-400 space-y-1">
              <span className="text-yellow-400 font-bold block">Wskazówka algorytmu AI:</span>
              <p className="font-sans text-xs">
                Wzrost cen o +10% na elementach blacharskich w rzadkich kodach lakieru (np. LC9Z, LY7W) nie obniża konwersji, a generuje średnio 420 PLN dodatkowego zysku z każdego rozbieranego pojazdu.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SEKCJA BAZA DANYCH RELACYJNA SQL */}
      {activeSection === "database" && (
        <SqlDatabasePanel drafts={drafts} setDrafts={setDrafts} vehicles={vehicles} />
      )}

      {/* SEKCJA 4: ZARZĄDZANIE PERSONELEM */}
      {activeSection === "staff" && (
        <div className="space-y-4">
          <div className="bg-[#0b0f19] border border-slate-800/90 rounded-xl p-4 sm:p-5 space-y-4 font-mono text-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-yellow-400" />
                  Zespół Pracowników Stacji ({staffList.length})
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Dodawaj pracowników, przypisuj stanowiska robocze i kontroluj dostęp do WMS.
                </p>
              </div>
            </div>

            {/* FORMULARZ PRACOWNIKA */}
            <form onSubmit={handleAddStaff} className="p-3 bg-[#050914] border border-slate-800 rounded-xl space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Imię i Nazwisko:</label>
                  <input
                    type="text"
                    required
                    placeholder="np. Piotr Nowicki"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    className="w-full bg-[#030712] border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Stanowisko / Rola:</label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as UserRole)}
                    className="w-full bg-[#030712] border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="Pracownik / Demontażysta">Pracownik / Demontażysta</option>
                    <option value="Magazynier / Przyjęcia">Magazynier / Przyjęcia</option>
                    <option value="Sprzedawca / E-commerce">Sprzedawca / E-commerce</option>
                    <option value="Szef / Właściciel">Szef / Właściciel</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Kod Stanowiska:</label>
                  <input
                    type="text"
                    placeholder="Stanowisko 2 (Plac BDO)"
                    value={newStaffStation}
                    onChange={(e) => setNewStaffStation(e.target.value)}
                    className="w-full bg-[#030712] border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black rounded-lg text-xs cursor-pointer transition shadow-xs"
                  >
                    + Dodaj do Zespołu
                  </button>
                </div>
              </div>
            </form>

            {/* LISTA PRACOWNIKÓW */}
            <div className="divide-y divide-slate-800">
              {staffList.map((staff) => (
                <div key={staff.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{staff.name}</span>
                      <span className="px-2 py-0.5 bg-slate-800 text-yellow-400 rounded text-[10px] border border-slate-700">
                        {staff.role}
                      </span>
                      {!staff.active && (
                        <span className="text-[10px] text-rose-400 font-bold">(Nieaktywny)</span>
                      )}
                    </div>
                    <div className="text-slate-400 text-xs flex gap-3">
                      <span>{staff.email}</span>
                      <span>• Stanowisko: {staff.stationCode || "Mysłakowice"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleStaff(staff.id)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                    >
                      {staff.active ? "Deaktywuj" : "Aktywuj"}
                    </button>
                    <button
                      onClick={() => handleDeleteStaff(staff.id)}
                      className="p-1.5 text-rose-400 hover:text-rose-300 rounded hover:bg-rose-950/30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SEKCJA 5: DIAGNOSTYKA & LOGI WMS */}
      {activeSection === "system" && (
        <div className="space-y-4">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4 font-mono text-xs">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Diagnostyka Systemu & Połączenie z Chmurą
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-[#040711] border border-emerald-500/30 rounded-xl space-y-1">
                <span className="text-slate-400 text-[10px] block font-bold">Cloud Firestore DB:</span>
                <span className="text-emerald-400 font-black text-sm flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> POŁĄCZONO (Online)
                </span>
                <span className="text-slate-500 text-[11px]">Kolekcja: koneser_parts_v1</span>
              </div>

              <div className="p-3 bg-[#040711] border border-cyan-500/30 rounded-xl space-y-1">
                <span className="text-slate-400 text-[10px] block font-bold">Silnik AI Vision & OCR:</span>
                <span className="text-cyan-300 font-black text-sm flex items-center gap-1">
                  <Sparkles className="w-4 h-4" /> Gemini 3.7 Flash
                </span>
                <span className="text-slate-500 text-[11px]">Backend Express /api/*</span>
              </div>

              <div className="p-3 bg-[#040711] border border-yellow-400/30 rounded-xl space-y-1">
                <span className="text-slate-400 text-[10px] block font-bold">Synchronizacja Allegro:</span>
                <span className="text-yellow-400 font-black text-sm flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> REST API Sandbox / Live
                </span>
                <span className="text-slate-500 text-[11px]">Token sesyjny aktywny</span>
              </div>
            </div>

            <div className="p-3.5 bg-[#030610] rounded-xl border border-slate-850 space-y-2">
              <h4 className="font-bold text-slate-300">Dziennik Zdarzeń Systemowych (Ostatnie 5 minut):</h4>
              <div className="space-y-1 text-[11px] text-slate-400">
                <div className="text-emerald-400">[WMS SYNC] Pomyślnie zsynchronizowano stan magazynowy z Firestore.</div>
                <div className="text-cyan-300">[AI VISION] Skaner rozpoznał moduł sterownika ECU (Bosch 0281011234).</div>
                <div className="text-slate-400">[BDO CHECK] Weryfikacja karty odpadu metali kolorowych zaliczona.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEKCJA 6: UPRAWNIENIA */}
      {activeSection === "roles" && (
        <div className="space-y-4">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4 font-mono text-xs">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-yellow-400" />
              Szybkie Przełączanie Aktywnej Roli Użytkownika
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {[
                "Szef / Właściciel",
                "Pracownik / Demontażysta",
                "Magazynier / Przyjęcia",
                "Sprzedawca / E-commerce",
              ].map((role) => (
                <button
                  key={role}
                  onClick={() => setCurrentUserRole(role as UserRole)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition ${
                    currentUserRole === role
                      ? "bg-yellow-400 text-slate-950 font-black border-yellow-400"
                      : "bg-[#070c18] text-slate-300 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="text-xs">{role}</div>
                  <div className="text-[10px] opacity-75 mt-1">
                    {currentUserRole === role ? "✓ Aktywna rola" : "Kliknij, aby aktywować"}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
