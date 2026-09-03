import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Recycle,
  Clock,
  Car,
  Percent,
  Award,
  AlertTriangle,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Search,
  Printer,
  Download,
  Calendar,
  User,
  Wrench,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  PieChart,
  BarChart3,
  Flame,
  Info,
} from "lucide-react";
import { VehicleLifecycleRecord, PartItem, StaffMember } from "../types";
import {
  calculateVehicleFinancials,
  calculateFleetProfitabilityMetrics,
  LIFECYCLE_STAGES,
} from "../utils/vehicleFinancials";

interface VehicleProfitabilityDashboardProps {
  vehicles: VehicleLifecycleRecord[];
  allParts: PartItem[];
  staffList?: StaffMember[];
  onSelectVehicle?: (vehicle: VehicleLifecycleRecord) => void;
  onNavigateToWorkerStation?: (vehicleInternalNo?: string) => void;
}

export const VehicleProfitabilityDashboard: React.FC<VehicleProfitabilityDashboardProps> = ({
  vehicles,
  allParts,
  staffList = [],
  onSelectVehicle,
  onNavigateToWorkerStation,
}) => {
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedWorker, setSelectedWorker] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"profit_desc" | "profit_asc" | "roi_desc" | "margin_desc" | "days_asc" | "cost_desc">("profit_desc");

  // Filter vehicles according to controls
  const filteredVehicles = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return vehicles.filter((v) => {
      const matchesSearch =
        !q ||
        v.internalNumber.toLowerCase().includes(q) ||
        (v.vin && v.vin.toLowerCase().includes(q)) ||
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q);

      const matchesBrand = selectedBrand === "all" || v.make.toLowerCase() === selectedBrand.toLowerCase();
      const matchesWorker = selectedWorker === "all" || v.assignedWorkerName === selectedWorker;
      const matchesStatus = selectedStatus === "all" || v.lifecycleStatus === selectedStatus;

      return matchesSearch && matchesBrand && matchesWorker && matchesStatus;
    });
  }, [vehicles, searchQuery, selectedBrand, selectedWorker, selectedStatus]);

  // Comprehensive Fleet Metrics
  const fleetMetrics = useMemo(() => {
    return calculateFleetProfitabilityMetrics(filteredVehicles, allParts);
  }, [filteredVehicles, allParts]);

  // Extract unique brands for filtering
  const availableBrands = useMemo(() => {
    const brands = new Set(vehicles.map((v) => v.make).filter(Boolean));
    return Array.from(brands);
  }, [vehicles]);

  // Sorted list of all evaluated vehicles for the detailed table
  const sortedDetailedVehicles = useMemo(() => {
    const list = filteredVehicles.map((v) => ({
      vehicle: v,
      financials: calculateVehicleFinancials(v, allParts),
    }));

    list.sort((a, b) => {
      switch (sortBy) {
        case "profit_desc":
          return b.financials.projectedNetProfitPln - a.financials.projectedNetProfitPln;
        case "profit_asc":
          return a.financials.projectedNetProfitPln - b.financials.projectedNetProfitPln;
        case "roi_desc":
          return b.financials.roiPercentage - a.financials.roiPercentage;
        case "margin_desc":
          return b.financials.marginPercentage - a.financials.marginPercentage;
        case "days_asc":
          return (a.financials.dismantleDurationDays ?? 99) - (b.financials.dismantleDurationDays ?? 99);
        case "cost_desc":
          return b.financials.totalCostPln - a.financials.totalCostPln;
        default:
          return b.financials.projectedNetProfitPln - a.financials.projectedNetProfitPln;
      }
    });

    return list;
  }, [filteredVehicles, allParts, sortBy]);

  // Export report to CSV
  const handleExportCsv = () => {
    const headers = [
      "Nr Wewnętrzny",
      "Pojazd",
      "VIN",
      "Status",
      "Cena Zakupu (PLN)",
      "Koszt Lawety (PLN)",
      "Koszty Dodatkowe (PLN)",
      "Koszty Całkowite (PLN)",
      "Przychód Części Sprzedane (PLN)",
      "Wartość Części Magazyn (PLN)",
      "Przychód Części Razem (PLN)",
      "Przychód Złom BDO (PLN)",
      "Przychód Całkowity (PLN)",
      "Zysk Netto (PLN)",
      "Marża (%)",
      "ROI (%)",
      "Czas Demontażu (Dni)",
      "Demontażysta",
    ];

    const rows = sortedDetailedVehicles.map(({ vehicle, financials }) => [
      vehicle.internalNumber,
      `"${vehicle.make} ${vehicle.model} ${vehicle.year}"`,
      vehicle.vin || "",
      vehicle.lifecycleStatus,
      financials.purchasePricePln,
      financials.towTruckCostPln,
      financials.additionalCostsPln,
      financials.totalCostPln,
      financials.partsSoldGrossPln,
      financials.partsInStockGrossPln,
      financials.partsSoldGrossPln + financials.partsInStockGrossPln,
      financials.scrapTotalRevenuePln,
      financials.totalRevenueGrossPln,
      financials.projectedNetProfitPln,
      financials.marginPercentage,
      financials.roiPercentage,
      financials.dismantleDurationDays ?? "-",
      vehicle.assignedWorkerName || "",
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(";"), ...rows.map((e) => e.join(";"))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Raport_Rentownosci_Pojazdow_PHU_Koneser_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5 print:p-0">
      {/* TOP HEADER & CONTROL BAR */}
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-4.5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-gradient-to-br from-yellow-400 to-amber-500 text-slate-950 rounded-xl font-bold shadow-md shadow-yellow-500/20">
              <TrendingUp className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
                Dashboard Rentowności Pojazdów & Efektywności SDP
                <span className="px-2 py-0.5 text-[10px] bg-yellow-400/10 text-yellow-300 border border-yellow-400/30 rounded-full">
                  Analiza Finansowa ERP
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Kompleksowa kalkulacja marży, przychodów z części i złomu BDO, kosztów zakupu i czasu demontażu
              </p>
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto">
          <button
            onClick={handleExportCsv}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold rounded-xl border border-slate-700 transition"
            title="Eksportuj do pliku CSV / Excel"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Eksportuj CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold rounded-xl border border-slate-700 transition"
            title="Drukuj raport rentowności"
          >
            <Printer className="w-3.5 h-3.5 text-sky-400" />
            <span>Drukuj Raport</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Szukaj po marce, modelu, nr wewn, VIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900/90 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-yellow-400"
            />
          </div>

          {/* Marka Filter */}
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 text-xs focus:outline-none focus:border-yellow-400"
          >
            <option value="all">Wszystkie marki ({vehicles.length})</option>
            {availableBrands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 text-xs focus:outline-none focus:border-yellow-400"
          >
            <option value="all">Wszystkie etapy cyklu</option>
            <option value="PRZYJĘCIE_I_WYCENA">1. Przyjęcie & Wycena</option>
            <option value="ZAKUPIONY_NA_PLACU">2. Na placu (Oczekuje)</option>
            <option value="W_TRAKCIE_DEMONTAŻU">3. W trakcie demontażu</option>
            <option value="DEMONTAŻ_ZAKOŃCZONY">4. Części w WMS</option>
            <option value="ROZLICZONY_I_ZŁOM_BDO">5. Rozliczony & Złom BDO</option>
          </select>

          {/* Demontażysta Filter */}
          <select
            value={selectedWorker}
            onChange={(e) => setSelectedWorker(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 text-xs focus:outline-none focus:border-yellow-400"
          >
            <option value="all">Wszyscy mechanicy</option>
            {staffList.map((st) => (
              <option key={st.id} value={st.name}>
                {st.name} ({st.role})
              </option>
            ))}
          </select>
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[11px] font-mono">Sortuj:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-yellow-300 text-xs font-mono font-bold focus:outline-none focus:border-yellow-400"
          >
            <option value="profit_desc">Zysk Netto: Najwyższy (TOP)</option>
            <option value="profit_asc">Zysk Netto: Najniższy</option>
            <option value="roi_desc">Zwrot z inwestycji (ROI %)</option>
            <option value="margin_desc">Marża handlowa (%)</option>
            <option value="days_asc">Czas demontażu: Najszybszy</option>
            <option value="cost_desc">Koszty zakupu: Najwyższe</option>
          </select>
        </div>
      </div>

      {/* 6 GŁÓWNYCH KAFELKÓW KPI Z WYMOGÓW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* KPI 1: Średni Zysk na Samochód */}
        <div className="bg-gradient-to-b from-[#0e1626] to-[#0a0e1a] border border-emerald-500/30 rounded-xl p-3.5 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 text-slate-400 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-emerald-300">
              Średni Zysk / Auto
            </span>
            <div className="p-1 bg-emerald-500/20 text-emerald-400 rounded">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <div className="text-xl font-black text-emerald-400 font-mono">
              +{fleetMetrics.averageProfitPerVehicle.toLocaleString("pl-PL")} PLN
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1 pt-1 border-t border-slate-800">
              <span>Zrealizowany:</span>
              <span className="text-slate-200 font-bold">
                +{fleetMetrics.averageRealizedProfitPerVehicle.toLocaleString("pl-PL")} PLN
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: Przychód z Części */}
        <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-3.5 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 text-slate-400 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-sky-300">
              Przychód z Części
            </span>
            <div className="p-1 bg-sky-500/20 text-sky-400 rounded">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <div className="text-xl font-black text-sky-400 font-mono">
              {fleetMetrics.totalPartsRevenueGross.toLocaleString("pl-PL")} PLN
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1 pt-1 border-t border-slate-800">
              <span className="text-emerald-400">Sprzedane: {fleetMetrics.totalPartsRevenueSold} zł</span>
              <span className="text-slate-400">WMS: {fleetMetrics.totalPartsRevenueInStock} zł</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Przychód ze Złomu */}
        <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-3.5 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 text-slate-400 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-purple-300">
              Przychód ze Złomu
            </span>
            <div className="p-1 bg-purple-500/20 text-purple-400 rounded">
              <Recycle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <div className="text-xl font-black text-purple-400 font-mono">
              {fleetMetrics.totalScrapRevenue.toLocaleString("pl-PL")} PLN
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1 pt-1 border-t border-slate-800">
              <span>BDO & Kat & Aku:</span>
              <span className="text-purple-300 font-bold">100% płynność</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Koszty Całkowite */}
        <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-3.5 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 text-slate-400 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-red-300">
              Koszty (Zakup + Lawety)
            </span>
            <div className="p-1 bg-red-500/20 text-red-400 rounded">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <div className="text-xl font-black text-red-400 font-mono">
              {fleetMetrics.totalCosts.toLocaleString("pl-PL")} PLN
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1 pt-1 border-t border-slate-800">
              <span>Auta: {fleetMetrics.totalPurchaseCosts} zł</span>
              <span>Lawety: {fleetMetrics.totalTowCosts} zł</span>
            </div>
          </div>
        </div>

        {/* KPI 5: Marża i ROI */}
        <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-3.5 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 text-slate-400 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-yellow-300">
              Marża & ROI
            </span>
            <div className="p-1 bg-yellow-500/20 text-yellow-400 rounded">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <div className="text-xl font-black text-yellow-400 font-mono">
              {fleetMetrics.averageMarginPercent}%{" "}
              <span className="text-xs text-yellow-300/80 font-normal">marży</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1 pt-1 border-t border-slate-800">
              <span>Średni ROI:</span>
              <span className="text-emerald-400 font-bold">+{fleetMetrics.averageRoiPercent}%</span>
            </div>
          </div>
        </div>

        {/* KPI 6: Czas od zakupu do demontażu */}
        <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-3.5 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 text-slate-400 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-amber-300">
              Śr. Czas Demontażu
            </span>
            <div className="p-1 bg-amber-500/20 text-amber-400 rounded">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <div className="text-xl font-black text-amber-400 font-mono">
              {fleetMetrics.averageDismantleDays}{" "}
              <span className="text-xs text-amber-300/80 font-normal">dni / auto</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1 pt-1 border-t border-slate-800">
              <span>Zakończone:</span>
              <span className="text-slate-200 font-bold">{fleetMetrics.completedDismantlesCount} pojazdów</span>
            </div>
          </div>
        </div>
      </div>

      {/* SEKCJA 1 & 2: NAJBARDZIEJ vs NAJMNIEJ DOCHODOWE POJAZDY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* NAJBARDZIEJ DOCHODOWE POJAZDY (TOP PROFITABLE) */}
        <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-lg">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-white font-mono flex items-center gap-2">
                  Najbardziej Dochodowe Pojazdy (TOP ROI & Zysk)
                </h3>
                <p className="text-[10px] text-slate-400">Pojazdy generujące najwyższą marżę i zwrot z zakupu</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full font-bold">
              Liderzy Zysku
            </span>
          </div>

          <div className="space-y-2.5">
            {fleetMetrics.mostProfitableVehicles.slice(0, 3).map(({ vehicle, financials }, idx) => (
              <div
                key={vehicle.id}
                onClick={() => onSelectVehicle && onSelectVehicle(vehicle)}
                className="group p-3 bg-slate-900/80 hover:bg-slate-800/90 border border-emerald-500/20 hover:border-emerald-500/50 rounded-xl transition cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center font-mono font-black text-xs shrink-0 mt-0.5">
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white group-hover:text-yellow-300 transition">
                        {vehicle.make} {vehicle.model}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">({vehicle.year})</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                      <span className="text-yellow-300/90 font-bold">{vehicle.internalNumber}</span>
                      <span>•</span>
                      <span>Koszty: {financials.totalCostPln} zł</span>
                      <span>•</span>
                      <span className="text-purple-300">Złom: {financials.scrapTotalRevenuePln} zł</span>
                      <span>•</span>
                      <span className="text-sky-300">Części: {financials.partsSoldGrossPln + financials.partsInStockGrossPln} zł</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                  <div className="text-left sm:text-right">
                    <div className="text-sm font-black text-emerald-400 font-mono">
                      +{financials.projectedNetProfitPln.toLocaleString("pl-PL")} PLN
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono">
                      <span className="text-emerald-300 font-bold">ROI: +{financials.roiPercentage}%</span>
                      <span className="text-slate-500">|</span>
                      <span className="text-yellow-300">Marża: {financials.marginPercentage}%</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* NAJMNIEJ DOCHODOWE POJAZDY (LOWEST PROFIT / DIAGNOSTYKA) */}
        <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-white font-mono flex items-center gap-2">
                  Najmniej Dochodowe Pojazdy & Diagnostyka
                </h3>
                <p className="text-[10px] text-slate-400">Pojazdy z niską marżą i wskazówki optymalizacji zakupowej</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-full font-bold">
              Watchlist Marży
            </span>
          </div>

          <div className="space-y-2.5">
            {fleetMetrics.leastProfitableVehicles.map(({ vehicle, financials, diagnosticReason }, idx) => (
              <div
                key={vehicle.id}
                onClick={() => onSelectVehicle && onSelectVehicle(vehicle)}
                className="group p-3 bg-slate-900/80 hover:bg-slate-800/90 border border-amber-500/20 hover:border-amber-500/50 rounded-xl transition cursor-pointer flex flex-col justify-between gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white group-hover:text-amber-300 transition">
                        {vehicle.make} {vehicle.model}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">({vehicle.year})</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 bg-slate-800 text-yellow-300 border border-slate-700 rounded font-bold">
                        {vehicle.internalNumber}
                      </span>
                    </div>
                    <div className="text-[10px] text-amber-300/90 flex items-center gap-1 mt-1 font-mono">
                      <Info className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>{diagnosticReason}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-slate-200 font-mono">
                      +{financials.projectedNetProfitPln.toLocaleString("pl-PL")} PLN
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Marża: <span className="text-yellow-400 font-bold">{financials.marginPercentage}%</span> (ROI: +{financials.roiPercentage}%)
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1.5 border-t border-slate-800/80">
                  <span>Zakup: {financials.purchasePricePln} zł | Laweta: {financials.towTruckCostPln} zł</span>
                  <span className="text-slate-400 group-hover:text-yellow-300 transition flex items-center gap-0.5">
                    Szczegóły <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SEKCJA 3: SZCZEGÓŁOWA TABELA FINANSOWA WSZYSTKICH POJAZDÓW */}
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-white font-mono flex items-center gap-2">
              Szczegółowa Tabela Rentowności & Kosztów Floty ({sortedDetailedVehicles.length} pojazdów)
            </h3>
            <p className="text-[10px] text-slate-400">
              Przychody z części, złom BDO, koszty zakupu, marża i czas od zakupu do demontażu
            </p>
          </div>
          <div className="text-[10px] text-slate-400 font-mono bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            Suma Zysku Floty:{" "}
            <span className="text-emerald-400 font-bold">
              +{fleetMetrics.totalProjectedProfit.toLocaleString("pl-PL")} PLN
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 font-mono text-[10px] uppercase tracking-wider border-b border-slate-800">
                <th className="py-2.5 px-3">Pojazd & Nr Wewn</th>
                <th className="py-2.5 px-3">Etap Cyklu</th>
                <th className="py-2.5 px-3 text-right">Koszty Zakupu</th>
                <th className="py-2.5 px-3 text-right">Przychód Części</th>
                <th className="py-2.5 px-3 text-right">Przychód Złom BDO</th>
                <th className="py-2.5 px-3 text-right">Przychód Razem</th>
                <th className="py-2.5 px-3 text-right">Zysk Netto</th>
                <th className="py-2.5 px-3 text-center">Marża %</th>
                <th className="py-2.5 px-3 text-center">ROI %</th>
                <th className="py-2.5 px-3 text-center">Czas Demontażu</th>
                <th className="py-2.5 px-3 text-center">Akcja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {sortedDetailedVehicles.map(({ vehicle, financials }) => {
                const isTopProfit = financials.projectedNetProfitPln >= 1800;
                const isLowMargin = financials.marginPercentage < 40;

                return (
                  <tr
                    key={vehicle.id}
                    className="hover:bg-slate-800/50 transition cursor-pointer group"
                    onClick={() => onSelectVehicle && onSelectVehicle(vehicle)}
                  >
                    {/* POJAZD */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-white group-hover:text-yellow-300 transition flex items-center gap-1.5">
                        <span>{vehicle.make} {vehicle.model}</span>
                        <span className="text-[10px] text-slate-400 font-normal">({vehicle.year})</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                        <span className="px-1 py-0.2 bg-yellow-400/10 text-yellow-300 border border-yellow-400/30 rounded font-bold">
                          {vehicle.internalNumber}
                        </span>
                        {vehicle.engineCode && (
                          <span className="text-slate-500">{vehicle.engineCode}</span>
                        )}
                      </div>
                    </td>

                    {/* STATUS */}
                    <td className="py-3 px-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-700 bg-slate-900 text-slate-300 whitespace-nowrap">
                        {vehicle.lifecycleStatus.replace(/_/g, " ")}
                      </span>
                      {vehicle.assignedWorkerName && (
                        <div className="text-[9px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <User className="w-2.5 h-2.5" />
                          <span>{vehicle.assignedWorkerName}</span>
                        </div>
                      )}
                    </td>

                    {/* KOSZTY */}
                    <td className="py-3 px-3 text-right">
                      <div className="font-bold text-red-400">
                        {financials.totalCostPln.toLocaleString("pl-PL")} zł
                      </div>
                      <div className="text-[9px] text-slate-500">
                        Aut: {financials.purchasePricePln} | Law: {financials.towTruckCostPln}
                      </div>
                    </td>

                    {/* PRZYCHÓD CZĘŚCI */}
                    <td className="py-3 px-3 text-right">
                      <div className="font-bold text-sky-300">
                        {(financials.partsSoldGrossPln + financials.partsInStockGrossPln).toLocaleString("pl-PL")} zł
                      </div>
                      <div className="text-[9px] text-slate-500">
                        Sprzedane: {financials.partsSoldGrossPln} zł ({financials.partsCountSold} szt)
                      </div>
                    </td>

                    {/* PRZYCHÓD ZŁOM BDO */}
                    <td className="py-3 px-3 text-right">
                      <div className="font-bold text-purple-300">
                        {financials.scrapTotalRevenuePln.toLocaleString("pl-PL")} zł
                      </div>
                      <div className="text-[9px] text-slate-500">
                        Kat: {vehicle.catalystValuePln || 0} zł | {vehicle.scrapWeightKg} kg
                      </div>
                    </td>

                    {/* PRZYCHÓD RAZEM */}
                    <td className="py-3 px-3 text-right">
                      <div className="font-bold text-slate-200">
                        {financials.totalRevenueGrossPln.toLocaleString("pl-PL")} zł
                      </div>
                    </td>

                    {/* ZYSK NETTO */}
                    <td className="py-3 px-3 text-right">
                      <div
                        className={`font-black text-sm ${
                          financials.projectedNetProfitPln > 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        +{financials.projectedNetProfitPln.toLocaleString("pl-PL")} PLN
                      </div>
                      <div className="text-[9px] text-slate-400">
                        Zrealizowany: +{financials.netRealizedProfitPln} zł
                      </div>
                    </td>

                    {/* MARŻA */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          financials.marginPercentage >= 50
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : financials.marginPercentage >= 35
                            ? "bg-yellow-500/15 text-yellow-300 border border-yellow-500/30"
                            : "bg-red-500/15 text-red-300 border border-red-500/30"
                        }`}
                      >
                        {financials.marginPercentage}%
                      </span>
                    </td>

                    {/* ROI */}
                    <td className="py-3 px-3 text-center">
                      <span className="text-emerald-300 font-bold text-xs">
                        +{financials.roiPercentage}%
                      </span>
                    </td>

                    {/* CZAS DEMONTAŻU */}
                    <td className="py-3 px-3 text-center">
                      {financials.dismantleDurationDays !== null ? (
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {financials.dismantleDurationDays} {financials.dismantleDurationDays === 1 ? "dzień" : "dni"}
                          </span>
                          <span className="text-[9px] text-slate-500">
                            {vehicle.dismantleEndDate ? "Zakończony" : "W trakcie"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[10px]">W kolejce</span>
                      )}
                    </td>

                    {/* AKCJA */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectVehicle) onSelectVehicle(vehicle);
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-yellow-400 hover:text-slate-950 text-slate-300 rounded-lg text-[10px] font-bold transition border border-slate-700 hover:border-yellow-400"
                      >
                        Karta Auta
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SEKCJA 4: ANALIZA MAREK I STRUKTURY PRZYCHODÓW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* RANKING MAREK */}
        <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-white font-mono flex items-center gap-2">
              <Car className="w-4 h-4 text-sky-400" />
              Rentowność Wg Marek
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Średnia marża</span>
          </div>

          <div className="space-y-2">
            {fleetMetrics.brandProfitability.map((b) => (
              <div key={b.brand} className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span>{b.brand}</span>
                    <span className="text-[10px] text-slate-400 font-normal">({b.count} szt.)</span>
                  </span>
                  <span className="text-emerald-400 font-bold">
                    +{b.profit.toLocaleString("pl-PL")} zł
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Przychód: {b.totalRevenue} zł</span>
                  <span className="text-yellow-300 font-bold">Marża: {b.marginPercent}%</span>
                  <span>Śr. czas: {b.avgDismantleDays} dni</span>
                </div>
                {/* Visual Progress bar */}
                <div className="w-full h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 to-emerald-400 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(10, b.marginPercent))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* STRUKTURA PRZYCHODU (CZĘŚCI vs ZŁOM BDO vs KOSZTY) */}
        <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-white font-mono flex items-center gap-2">
              <PieChart className="w-4 h-4 text-purple-400" />
              Struktura Finansowa Floty
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Udział w obrocie</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {/* Pasek łączny */}
            <div className="h-3 w-full bg-slate-800 rounded-lg overflow-hidden flex">
              <div
                className="bg-sky-400 h-full"
                style={{
                  width: `${
                    fleetMetrics.totalRevenueGross > 0
                      ? (fleetMetrics.totalPartsRevenueGross / fleetMetrics.totalRevenueGross) * 100
                      : 50
                  }%`,
                }}
                title="Części WMS"
              />
              <div
                className="bg-purple-400 h-full"
                style={{
                  width: `${
                    fleetMetrics.totalRevenueGross > 0
                      ? (fleetMetrics.totalScrapRevenue / fleetMetrics.totalRevenueGross) * 100
                      : 50
                  }%`,
                }}
                title="Złom BDO & Metale"
              />
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                  <span className="text-slate-300">Przychód z Części (WMS + Sprzedaż)</span>
                </div>
                <span className="text-sky-400 font-bold">{fleetMetrics.totalPartsRevenueGross} PLN</span>
              </div>

              <div className="flex items-center justify-between p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                  <span className="text-slate-300">Przychód ze Złomu & BDO & Katalizatorów</span>
                </div>
                <span className="text-purple-400 font-bold">{fleetMetrics.totalScrapRevenue} PLN</span>
              </div>

              <div className="flex items-center justify-between p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="text-slate-300">Koszty Zakupu i Transportu</span>
                </div>
                <span className="text-red-400 font-bold">{fleetMetrics.totalCosts} PLN</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-emerald-500/10 rounded-lg border border-emerald-500/30 text-emerald-400 font-bold">
                <span>Rzeczywisty / Szacowany Zysk Netto</span>
                <span>+{fleetMetrics.totalProjectedProfit} PLN</span>
              </div>
            </div>
          </div>
        </div>

        {/* EFEKTYWNOŚĆ DEMONTAŻYSTÓW */}
        <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-white font-mono flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-400" />
              Wydajność Demontażystów
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Czas i zysk</span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            {fleetMetrics.workerEfficiency.map((w) => (
              <div key={w.workerName} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="font-bold text-white">{w.workerName}</span>
                  </div>
                  <span className="text-emerald-400 font-bold">
                    +{w.totalProfitGenerated.toLocaleString("pl-PL")} zł
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Pojazdów: {w.vehiclesCount}</span>
                  <span>Części w WMS: {w.partsCount} szt.</span>
                  <span className="text-amber-300 font-bold flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {w.avgDismantleDays} dni / auto
                  </span>
                </div>

                {onNavigateToWorkerStation && (
                  <button
                    onClick={() => onNavigateToWorkerStation()}
                    className="w-full text-center text-[10px] py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 hover:text-white transition"
                  >
                    Przejdź do Stanowiska Demontażu & Prowizji ➔
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
