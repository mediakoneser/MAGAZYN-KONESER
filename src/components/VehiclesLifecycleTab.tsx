import React, { useState, useMemo } from "react";
import {
  Car,
  Plus,
  Search,
  Filter,
  TrendingUp,
  DollarSign,
  Package,
  Wrench,
  Calendar,
  User,
  Recycle,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Eye,
  Edit3,
  Trash2,
  Sparkles,
  ChevronRight,
  Printer,
  FileSpreadsheet,
  AlertTriangle
} from "lucide-react";
import {
  VehicleLifecycleRecord,
  PartItem,
  StaffMember,
  VehicleLifecycleStatus,
} from "../types";
import { calculateVehicleFinancials, LIFECYCLE_STAGES } from "../utils/vehicleFinancials";
import { VehicleDetailCardModal } from "./VehicleDetailCardModal";
import { VehicleAddModal } from "./VehicleAddModal";
import { VehicleProfitabilityDashboard } from "./VehicleProfitabilityDashboard";

interface VehiclesLifecycleTabProps {
  vehicles: VehicleLifecycleRecord[];
  setVehicles: React.Dispatch<React.SetStateAction<VehicleLifecycleRecord[]>>;
  allParts: PartItem[];
  setAllParts: React.Dispatch<React.SetStateAction<PartItem[]>>;
  staffList: StaffMember[];
  onNavigateToWorkerStation?: (vehicleInternalNo?: string) => void;
  onNavigateToScanner?: (vehicleInfo?: any) => void;
  currentUserRole?: string;
}

export const VehiclesLifecycleTab: React.FC<VehiclesLifecycleTabProps> = ({
  vehicles,
  setVehicles,
  allParts,
  setAllParts,
  staffList,
  onNavigateToWorkerStation,
  onNavigateToScanner,
  currentUserRole = "Właściciel / Szef",
}) => {
  const [activeSubView, setActiveSubView] = useState<"ewidencja" | "rentownosc">("rentownosc");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [workerFilter, setWorkerFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modals state
  const [selectedVehicleForModal, setSelectedVehicleForModal] = useState<VehicleLifecycleRecord | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Fleet-wide calculations
  const fleetSummary = useMemo(() => {
    let totalInvestedCost = 0;
    let totalPartsSoldGross = 0;
    let totalPartsInStockGross = 0;
    let totalScrapRevenue = 0;
    let totalRevenue = 0;
    let totalRealizedProfit = 0;
    let totalProjectedProfit = 0;
    let totalPartsCount = 0;

    for (const v of vehicles) {
      const fin = calculateVehicleFinancials(v, allParts);
      totalInvestedCost += fin.totalCostPln;
      totalPartsSoldGross += fin.partsSoldGrossPln;
      totalPartsInStockGross += fin.partsInStockGrossPln;
      totalScrapRevenue += fin.scrapTotalRevenuePln;
      totalRevenue += fin.totalRevenueGrossPln;
      totalRealizedProfit += fin.netRealizedProfitPln;
      totalProjectedProfit += fin.projectedNetProfitPln;
      totalPartsCount += fin.partsCountTotal;
    }

    const averageRoi = totalInvestedCost > 0 ? Math.round((totalProjectedProfit / totalInvestedCost) * 100) : 0;

    return {
      totalVehicles: vehicles.length,
      totalInvestedCost,
      totalPartsSoldGross,
      totalPartsInStockGross,
      totalScrapRevenue,
      totalRevenue,
      totalRealizedProfit,
      totalProjectedProfit,
      totalPartsCount,
      averageRoi,
    };
  }, [vehicles, allParts]);

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return vehicles.filter((v) => {
      const matchesSearch =
        !q ||
        v.internalNumber.toLowerCase().includes(q) ||
        (v.vin && v.vin.toLowerCase().includes(q)) ||
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        (v.engineCode && v.engineCode.toLowerCase().includes(q)) ||
        (v.assignedWorkerName && v.assignedWorkerName.toLowerCase().includes(q));

      const matchesStatus = statusFilter === "all" || v.lifecycleStatus === statusFilter;
      const matchesWorker = workerFilter === "all" || v.assignedWorkerName === workerFilter;

      return matchesSearch && matchesStatus && matchesWorker;
    });
  }, [vehicles, searchQuery, statusFilter, workerFilter]);

  const handleUpdateVehicle = (updated: VehicleLifecycleRecord) => {
    setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
    setSelectedVehicleForModal(updated);
  };

  const handleAddVehicle = (newVeh: VehicleLifecycleRecord) => {
    setVehicles((prev) => [newVeh, ...prev]);
    setSelectedVehicleForModal(newVeh);
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    if (confirm("Czy na pewno chcesz usunąć ten pojazd z ewidencji stacji demontażu?")) {
      setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
      if (selectedVehicleForModal?.id === vehicleId) {
        setSelectedVehicleForModal(null);
      }
    }
  };

  const handleAddNewPartFromVehicle = (v: VehicleLifecycleRecord) => {
    if (onNavigateToScanner) {
      onNavigateToScanner({
        marka: v.make,
        model: v.model,
        rocznik: v.year,
        vin: v.vin,
        kodSilnika: v.engineCode,
        kodLakieru: v.paintCode,
        vehicleId: v.id,
        vehicleInternalNo: v.internalNumber,
      });
    }
  };

  const getStatusBadge = (status: VehicleLifecycleStatus) => {
    switch (status) {
      case "PRZYJĘCIE_I_WYCENA":
        return { label: "1. Przyjęcie & Wycena", bg: "bg-sky-500/15 text-sky-300 border-sky-500/30" };
      case "ZAKUPIONY_NA_PLACU":
        return { label: "2. Na placu (Oczekuje)", bg: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" };
      case "W_TRAKCIE_DEMONTAŻU":
        return { label: "3. W trakcie demontażu", bg: "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse" };
      case "DEMONTAŻ_ZAKOŃCZONY":
        return { label: "4. Części w WMS", bg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" };
      case "ROZLICZONY_I_ZŁOM_BDO":
        return { label: "5. Rozliczony & Złom BDO", bg: "bg-purple-500/15 text-purple-300 border-purple-500/30" };
      default:
        return { label: status, bg: "bg-slate-800 text-slate-300 border-slate-700" };
    }
  };

  return (
    <div className="space-y-4">
      {/* TOP VIEW SWITCHER */}
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-2 sm:p-2.5 shadow-md flex flex-wrap items-center justify-between gap-2 font-mono">
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveSubView("rentownosc")}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
              activeSubView === "rentownosc"
                ? "bg-yellow-400 text-slate-950 shadow-md shadow-yellow-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Dashboard Rentowności Pojazdów</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeSubView === "rentownosc"
                  ? "bg-slate-950 text-yellow-300"
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
              }`}
            >
              Śr. zysk +{fleetSummary.totalVehicles > 0 ? Math.round(fleetSummary.totalProjectedProfit / fleetSummary.totalVehicles) : 0} zł
            </span>
          </button>

          <button
            onClick={() => setActiveSubView("ewidencja")}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
              activeSubView === "ewidencja"
                ? "bg-yellow-400 text-slate-950 shadow-md shadow-yellow-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>Ewidencja & Karty Pojazdów ({vehicles.length})</span>
          </button>
        </div>

        {/* QUICK ADD BUTTON IN HEADER */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-yellow-300 border border-yellow-400/30 hover:border-yellow-400 font-mono font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Przyjmij Nowy Pojazd</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: DEDYKOWANY DASHBOARD RENTOWNOŚCI POJAZDÓW */}
      {activeSubView === "rentownosc" && (
        <VehicleProfitabilityDashboard
          vehicles={vehicles}
          allParts={allParts}
          staffList={staffList}
          onSelectVehicle={(v) => setSelectedVehicleForModal(v)}
          onNavigateToWorkerStation={onNavigateToWorkerStation}
        />
      )}

      {/* VIEW 2: EWIDENCJA & KARTY POJAZDÓW */}
      {activeSubView === "ewidencja" && (
        <>
          {/* END-TO-END WORKFLOW STEPPER BANNER */}
          <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-4 shadow-md">
            <div className="flex items-center justify-between gap-2 mb-3 border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-yellow-400 text-slate-950 rounded-lg">
                  <Sparkles className="w-4 h-4 stroke-[2.5]" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider text-white font-mono">
                  Kompleksowy Cykl Życia Pojazdu w Stacji Demontażu PHU U KONESERA
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                AUTO ➔ WYCENA ➔ DEMONTAŻ ➔ MAGAZYN ➔ SPRZEDAŻ ➔ ZYSK
              </span>
            </div>

            {/* STEPPER HORIZONTAL BAR */}
            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-1.5 text-center font-mono">
              {LIFECYCLE_STAGES.map((stg, i) => (
                <div
                  key={stg.key}
                  className={`p-2 rounded-lg border flex flex-col justify-center items-center gap-0.5 ${stg.badgeBg} ${stg.badgeBorder}`}
                  title={stg.description}
                >
                  <span className="text-[9px] text-slate-400 font-bold">{i + 1}</span>
                  <span className={`text-[11px] font-black ${stg.badgeText} leading-tight`}>{stg.short}</span>
                </div>
              ))}
            </div>
          </div>

          {/* FLEET FINANCIAL KPI METRICS (PODSUMOWANIE FLOTY & ZYSKÓW) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {/* KAPITAŁ ZAINWESTOWANY */}
            <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">Łączny Koszt Aut</span>
                <DollarSign className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="mt-1.5">
                <div className="text-base sm:text-lg font-black text-rose-400 font-mono">
                  {fleetSummary.totalInvestedCost.toLocaleString("pl-PL")} zł
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {fleetSummary.totalVehicles} aut (Zakup + Lawety)
                </div>
              </div>
            </div>

            {/* SPRZEDANE CZĘŚCI */}
            <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">Sprzedaż Części</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="mt-1.5">
                <div className="text-base sm:text-lg font-black text-emerald-400 font-mono">
                  {fleetSummary.totalPartsSoldGross.toLocaleString("pl-PL")} zł
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Gotówka zrealizowana
                </div>
              </div>
            </div>

            {/* WARTOŚĆ NA REGAŁACH WMS */}
            <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase">Na Regałach WMS</span>
                <Package className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="mt-1.5">
                <div className="text-base sm:text-lg font-black text-cyan-400 font-mono">
                  {fleetSummary.totalPartsInStockGross.toLocaleString("pl-PL")} zł
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {fleetSummary.totalPartsCount} pozyskanych części
                </div>
              </div>
            </div>

            {/* RECYKLING I ZŁOM BDO */}
            <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-purple-400 font-bold uppercase">Złom & Surowce BDO</span>
                <Recycle className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="mt-1.5">
                <div className="text-base sm:text-lg font-black text-purple-400 font-mono">
                  {fleetSummary.totalScrapRevenue.toLocaleString("pl-PL")} zł
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Wraki + Katalizatory + Aku
                </div>
              </div>
            </div>

            {/* ŁĄCZNY PRZYCHÓD */}
            <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-yellow-400 font-bold uppercase">Łączny Przychód</span>
                <Layers className="w-3.5 h-3.5 text-yellow-400" />
              </div>
              <div className="mt-1.5">
                <div className="text-base sm:text-lg font-black text-yellow-400 font-mono">
                  {fleetSummary.totalRevenue.toLocaleString("pl-PL")} zł
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Części + Magazyn + Złom
                </div>
              </div>
            </div>

            {/* ŚREDNI ZYSK I ROI */}
            <div className="bg-gradient-to-br from-emerald-950/70 via-emerald-900/30 to-[#0b0f19] border border-emerald-500/40 rounded-xl p-3 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-emerald-300 font-bold uppercase flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Zysk Netto Floty
                </span>
                <span className="text-[10px] font-mono font-black px-1.5 py-0.2 rounded bg-emerald-400/20 text-emerald-300">
                  ROI {fleetSummary.averageRoi}%
                </span>
              </div>
              <div className="mt-1.5">
                <div className="text-base sm:text-lg font-black text-emerald-400 font-mono">
                  +{fleetSummary.totalProjectedProfit.toLocaleString("pl-PL")} zł
                </div>
                <div className="text-[10px] text-slate-300 font-mono mt-0.5">
                  Prognozowany czysty zysk
                </div>
              </div>
            </div>
          </div>

      {/* SEARCH, FILTER & ACTION BAR */}
      <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-3 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
        {/* SEARCH */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj: nr wewn, VIN, marka, silnik..."
            className="w-full bg-[#030712] border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-mono"
          />
        </div>

        {/* FILTERS & ADD BUTTON */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
          {/* STATUS FILTER */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#030712] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-300 focus:border-yellow-400 focus:outline-none cursor-pointer"
          >
            <option value="all">Wszystkie statusy cyklu</option>
            <option value="PRZYJĘCIE_I_WYCENA">1. Przyjęcie & Wycena</option>
            <option value="ZAKUPIONY_NA_PLACU">2. Zakupiony na placu</option>
            <option value="W_TRAKCIE_DEMONTAŻU">3. W trakcie demontażu</option>
            <option value="DEMONTAŻ_ZAKOŃCZONY">4. Demontaż zakończony</option>
            <option value="ROZLICZONY_I_ZŁOM_BDO">5. Rozliczony & Złom BDO</option>
          </select>

          {/* WORKER FILTER */}
          <select
            value={workerFilter}
            onChange={(e) => setWorkerFilter(e.target.value)}
            className="bg-[#030712] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-300 focus:border-yellow-400 focus:outline-none cursor-pointer"
          >
            <option value="all">Wszyscy mechanicy</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>

          {/* ADD VEHICLE BUTTON */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-mono font-black text-xs rounded-lg transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Przyjmij Nowy Pojazd</span>
          </button>
        </div>
      </div>

      {/* VEHICLES GRID VIEW */}
      {filteredVehicles.length === 0 ? (
        <div className="text-center py-16 bg-[#0b0f19] border border-dashed border-slate-800 rounded-2xl p-6 font-mono text-xs text-slate-400">
          <Car className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="font-bold text-slate-300">Nie znaleziono pojazdów spełniających wybrane kryteria.</p>
          <p className="mt-1 text-slate-500">Zmień filtry lub kliknij „Przyjmij Nowy Pojazd”, aby zarejestrować auto w stacji demontażu.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVehicles.map((vehicle) => {
            const fin = calculateVehicleFinancials(vehicle, allParts);
            const statusBadge = getStatusBadge(vehicle.lifecycleStatus);

            return (
              <div
                key={vehicle.id}
                className="bg-[#0b0f19] border border-slate-800/90 hover:border-yellow-400/50 rounded-2xl p-4 flex flex-col justify-between transition duration-200 shadow-md group relative overflow-hidden"
              >
                {/* TOP HEADER */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-yellow-400 text-slate-950 text-xs font-mono font-black rounded shadow-xs">
                          {vehicle.internalNumber}
                        </span>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${statusBadge.bg}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                      <h3 className="text-base font-black text-white mt-1.5 group-hover:text-yellow-300 transition">
                        {vehicle.make} {vehicle.model}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono">
                        Rocznik: <strong className="text-slate-200">{vehicle.year}</strong> • Silnik: <strong className="text-slate-200">{vehicle.engineCode}</strong>
                      </p>
                    </div>

                    {/* ROI BADGE */}
                    <div className="text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-md font-mono font-black border ${
                        fin.roiPercentage >= 50
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : fin.roiPercentage >= 0
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      }`}>
                        ROI {fin.roiPercentage}%
                      </span>
                      <div className="text-[10px] text-slate-400 font-mono mt-1">
                        Zysk: <strong className={fin.projectedNetProfitPln >= 0 ? "text-emerald-400" : "text-rose-400"}>
                          +{fin.projectedNetProfitPln} zł
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* VIN & MECHANIC BAR */}
                  <div className="mt-3 py-1.5 px-2.5 bg-[#030712] rounded-lg border border-slate-850 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400 truncate">
                      VIN: <strong className="text-amber-300 select-all">{vehicle.vin || "BRAK"}</strong>
                    </span>
                    <span className="text-slate-300 flex items-center gap-1 shrink-0 ml-2">
                      <User className="w-3 h-3 text-emerald-400" />
                      {vehicle.assignedWorkerName || "Brak"}
                    </span>
                  </div>

                  {/* FINANCIAL MINI-LEDGER */}
                  <div className="mt-3 grid grid-cols-3 gap-1.5 text-center font-mono text-xs">
                    <div className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                      <span className="text-[9px] text-slate-400 uppercase block">Koszt Zakupu</span>
                      <span className="font-bold text-rose-400">{fin.totalCostPln} zł</span>
                    </div>
                    <div className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                      <span className="text-[9px] text-slate-400 uppercase block">Części ({fin.partsCountTotal})</span>
                      <span className="font-bold text-cyan-400">{fin.partsSoldGrossPln + fin.partsInStockGrossPln} zł</span>
                    </div>
                    <div className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                      <span className="text-[9px] text-slate-400 uppercase block">Złom BDO</span>
                      <span className="font-bold text-purple-400">{fin.scrapTotalRevenuePln} zł</span>
                    </div>
                  </div>

                  {/* PARTS PROGRESS BAR */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                      <span>Pozyskane części: <strong>{fin.partsCountTotal} szt.</strong></span>
                      <span>Sprzedane: <strong className="text-emerald-400">{fin.partsCountSold} szt.</strong></span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-400 h-full"
                        style={{
                          width: `${fin.partsCountTotal > 0 ? (fin.partsCountSold / fin.partsCountTotal) * 100 : 0}%`,
                        }}
                        title={`Sprzedano ${fin.partsCountSold} z ${fin.partsCountTotal}`}
                      />
                      <div
                        className="bg-cyan-400 h-full"
                        style={{
                          width: `${fin.partsCountTotal > 0 ? (fin.partsCountInStock / fin.partsCountTotal) * 100 : 0}%`,
                        }}
                        title={`W magazynie ${fin.partsCountInStock}`}
                      />
                    </div>
                  </div>
                </div>

                {/* BOTTOM ACTIONS */}
                <div className="mt-4 pt-3 border-t border-slate-850 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedVehicleForModal(vehicle)}
                    className="flex-1 py-1.5 px-3 bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Otwórz Pełną Kartę</span>
                  </button>

                  <button
                    onClick={() => handleAddNewPartFromVehicle(vehicle)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition cursor-pointer"
                    title="Dodaj nową część z tego auta"
                  >
                    <Plus className="w-4 h-4 text-emerald-400" />
                  </button>

                  {currentUserRole === "Właściciel / Szef" && (
                    <button
                      onClick={() => handleDeleteVehicle(vehicle.id)}
                      className="p-1.5 bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 rounded-lg transition cursor-pointer"
                      title="Usuń pojazd z ewidencji"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </>
      )}

      {/* FULL VEHICLE CARD MODAL */}
      {selectedVehicleForModal && (
        <VehicleDetailCardModal
          vehicle={selectedVehicleForModal}
          onClose={() => setSelectedVehicleForModal(null)}
          allParts={allParts}
          staffList={staffList}
          onUpdateVehicle={handleUpdateVehicle}
          onAddNewPartForVehicle={handleAddNewPartFromVehicle}
        />
      )}

      {/* ADD VEHICLE MODAL */}
      {isAddModalOpen && (
        <VehicleAddModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddVehicle={handleAddVehicle}
          existingVehiclesCount={vehicles.length}
          staffList={staffList}
        />
      )}
    </div>
  );
};
