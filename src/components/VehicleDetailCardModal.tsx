import React, { useState, useMemo } from "react";
import {
  X,
  Car,
  DollarSign,
  TrendingUp,
  Calendar,
  User,
  Wrench,
  Package,
  Layers,
  CheckCircle2,
  Clock,
  Printer,
  Edit3,
  Save,
  PlusCircle,
  Hash,
  Activity,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Recycle,
  Sparkles,
  Percent,
  Check
} from "lucide-react";
import {
  VehicleLifecycleRecord,
  PartItem,
  StaffMember,
  VehicleLifecycleStatus,
} from "../types";
import { calculateVehicleFinancials, LIFECYCLE_STAGES } from "../utils/vehicleFinancials";

interface VehicleDetailCardModalProps {
  vehicle: VehicleLifecycleRecord | null;
  onClose: () => void;
  allParts: PartItem[];
  staffList: StaffMember[];
  onUpdateVehicle: (updatedVehicle: VehicleLifecycleRecord) => void;
  onAddNewPartForVehicle?: (vehicle: VehicleLifecycleRecord) => void;
  onOpenPartDetails?: (part: PartItem) => void;
}

export const VehicleDetailCardModal: React.FC<VehicleDetailCardModalProps> = ({
  vehicle,
  onClose,
  allParts,
  staffList,
  onUpdateVehicle,
  onAddNewPartForVehicle,
  onOpenPartDetails,
}) => {
  if (!vehicle) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<VehicleLifecycleRecord>({ ...vehicle });
  const [activeSubTab, setActiveSubTab] = useState<"parts" | "costs" | "scrap" | "timeline" | "raw">("parts");
  const [partsFilter, setPartsFilter] = useState<"all" | "in_stock" | "sold">("all");

  // Keep formData in sync if vehicle prop changes
  React.useEffect(() => {
    setFormData({ ...vehicle });
  }, [vehicle]);

  // Real-time financial calculations
  const financials = useMemo(() => {
    return calculateVehicleFinancials(isEditing ? formData : vehicle, allParts);
  }, [vehicle, formData, isEditing, allParts]);

  // Parts linked to this vehicle
  const vehicleParts = useMemo(() => {
    return allParts.filter(
      (p) =>
        p.vehicleId === vehicle.id ||
        (p.vehicleInternalNo && p.vehicleInternalNo === vehicle.internalNumber) ||
        (vehicle.dismantledPartIds && vehicle.dismantledPartIds.includes(p.id)) ||
        (p.listingData?.samochod?.vin && vehicle.vin && p.listingData.samochod.vin === vehicle.vin)
    );
  }, [allParts, vehicle]);

  const filteredParts = useMemo(() => {
    if (partsFilter === "sold") {
      return vehicleParts.filter((p) => p.status === "Sprzedany");
    }
    if (partsFilter === "in_stock") {
      return vehicleParts.filter((p) => p.status !== "Sprzedany" && p.status !== "Zutylizowany");
    }
    return vehicleParts;
  }, [vehicleParts, partsFilter]);

  const handleSave = () => {
    onUpdateVehicle({
      ...formData,
      updatedAt: new Date().toISOString(),
    });
    setIsEditing(false);
  };

  const handleStatusChange = (newStatus: VehicleLifecycleStatus) => {
    const updated = {
      ...formData,
      lifecycleStatus: newStatus,
      updatedAt: new Date().toISOString(),
    };
    if (newStatus === "W_TRAKCIE_DEMONTAŻU" && !updated.dismantleStartDate) {
      updated.dismantleStartDate = new Date().toISOString().slice(0, 10);
    }
    if (newStatus === "DEMONTAŻ_ZAKOŃCZONY" && !updated.dismantleEndDate) {
      updated.dismantleEndDate = new Date().toISOString().slice(0, 10);
    }
    setFormData(updated);
    onUpdateVehicle(updated);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#0b0f19] border border-slate-700/90 rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden font-sans text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* MODAL HEADER */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-400/15 border border-yellow-400/40 rounded-xl text-yellow-400 shrink-0">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 bg-yellow-400 text-slate-950 text-xs font-black font-mono rounded tracking-wider shadow-xs">
                  {vehicle.internalNumber}
                </span>
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  {vehicle.make} {vehicle.model} {vehicle.generation ? `(${vehicle.generation})` : ""}
                </h2>
                <span className="text-xs text-slate-400 font-mono">
                  Rocznik: <strong className="text-slate-200">{vehicle.year}</strong>
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5 flex flex-wrap items-center gap-2">
                <span>VIN: <strong className="text-amber-300 font-mono select-all">{vehicle.vin || "BRAK"}</strong></span>
                <span className="text-slate-600">•</span>
                <span>Silnik: <strong className="text-slate-200">{vehicle.engineCode} {vehicle.engineDisplacement || ""}</strong></span>
                {vehicle.paintCode && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span>Lakier: <strong className="text-slate-200">{vehicle.paintCode}</strong></span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
              title="Drukuj kartę pojazdu"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Drukuj Kartę</span>
            </button>

            {isEditing ? (
              <button
                onClick={handleSave}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-mono font-black transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Zapisz zmiany</span>
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-lg text-xs font-mono font-black transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edytuj Kartę</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* WORKFLOW PROGRESS TRACKER */}
        <div className="bg-[#070b14] px-4 sm:px-6 py-2.5 border-b border-slate-800/80 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[720px] gap-2 text-xs font-mono">
            {[
              { status: "PRZYJĘCIE_I_WYCENA", label: "1. Przyjęcie & Wycena", icon: Clock },
              { status: "ZAKUPIONY_NA_PLACU", label: "2. Zakup / Plac", icon: DollarSign },
              { status: "W_TRAKCIE_DEMONTAŻU", label: "3. Demontaż na Stacji", icon: Wrench },
              { status: "DEMONTAŻ_ZAKOŃCZONY", label: "4. Części w Magazynie", icon: Package },
              { status: "ROZLICZONY_I_ZŁOM_BDO", label: "5. Złom BDO & Rozliczony", icon: ShieldCheck },
            ].map((step, idx) => {
              const currentStatus = isEditing ? formData.lifecycleStatus : vehicle.lifecycleStatus;
              const isCurrent = currentStatus === step.status;
              const StepIcon = step.icon;

              return (
                <button
                  key={step.status}
                  onClick={() => isEditing && handleStatusChange(step.status as VehicleLifecycleStatus)}
                  disabled={!isEditing}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border transition ${
                    isCurrent
                      ? "bg-yellow-400/20 border-yellow-400 text-yellow-300 font-bold shadow-xs"
                      : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                  } ${isEditing ? "cursor-pointer hover:border-yellow-400/50" : "cursor-default"}`}
                >
                  <StepIcon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{step.label}</span>
                  {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* MODAL MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* FINANCIAL DASHBOARD HERO (KOMPLETNY BILANS FINANSOWY POJAZDU) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            {/* KOSZT CAŁKOWITY */}
            <div className="bg-[#0f172a]/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                  Całkowity Koszt
                </span>
                <DollarSign className="w-4 h-4 text-rose-400" />
              </div>
              <div className="mt-2">
                <div className="text-lg sm:text-xl font-black text-rose-400 font-mono">
                  {financials.totalCostPln.toLocaleString("pl-PL")} zł
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Zakup: {financials.purchasePricePln} + Laweta: {financials.towTruckCostPln}
                </div>
              </div>
            </div>

            {/* SPRZEDANE CZĘŚCI */}
            <div className="bg-[#0f172a]/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                  Sprzedane Części
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2">
                <div className="text-lg sm:text-xl font-black text-emerald-400 font-mono">
                  {financials.partsSoldGrossPln.toLocaleString("pl-PL")} zł
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Odzyskano gotówkę ({financials.partsCountSold} szt.)
                </div>
              </div>
            </div>

            {/* W MAGAZYNIE WMS */}
            <div className="bg-[#0f172a]/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                  Części w Magazynie
                </span>
                <Package className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="mt-2">
                <div className="text-lg sm:text-xl font-black text-cyan-400 font-mono">
                  {financials.partsInStockGrossPln.toLocaleString("pl-PL")} zł
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Dostępne na regałach ({financials.partsCountInStock} szt.)
                </div>
              </div>
            </div>

            {/* WARTOŚĆ ZŁOMU */}
            <div className="bg-[#0f172a]/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-purple-400 font-bold uppercase tracking-wider">
                  Wartość Złomu BDO
                </span>
                <Recycle className="w-4 h-4 text-purple-400" />
              </div>
              <div className="mt-2">
                <div className="text-lg sm:text-xl font-black text-purple-400 font-mono">
                  {financials.scrapTotalRevenuePln.toLocaleString("pl-PL")} zł
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Wrak + Kat + Aku + Alu
                </div>
              </div>
            </div>

            {/* CAŁKOWITY PRZYCHÓD */}
            <div className="bg-[#0f172a]/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-yellow-400 font-bold uppercase tracking-wider">
                  Całkowity Przychód
                </span>
                <Layers className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="mt-2">
                <div className="text-lg sm:text-xl font-black text-yellow-400 font-mono">
                  {financials.totalRevenueGrossPln.toLocaleString("pl-PL")} zł
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Sprzedane + Magazyn + Złom
                </div>
              </div>
            </div>

            {/* RZECZYWISTY ZYSK (PROFIT & ROI) */}
            <div className={`border rounded-xl p-3 flex flex-col justify-between ${
              financials.projectedNetProfitPln >= 0
                ? "bg-gradient-to-br from-emerald-950/70 via-emerald-900/40 to-[#0b0f19] border-emerald-500/50"
                : "bg-gradient-to-br from-rose-950/70 via-rose-900/40 to-[#0b0f19] border-rose-500/50"
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-white font-bold uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Rzeczywisty Zysk
                </span>
                <span className={`text-xs px-1.5 py-0.2 rounded font-mono font-black ${
                  financials.roiPercentage >= 0 ? "bg-emerald-400/20 text-emerald-300" : "bg-rose-400/20 text-rose-300"
                }`}>
                  ROI {financials.roiPercentage}%
                </span>
              </div>
              <div className="mt-2">
                <div className={`text-lg sm:text-xl font-black font-mono ${
                  financials.projectedNetProfitPln >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}>
                  {financials.projectedNetProfitPln > 0 ? "+" : ""}
                  {financials.projectedNetProfitPln.toLocaleString("pl-PL")} zł
                </div>
                <div className="text-[10px] text-slate-300 font-mono mt-0.5">
                  Na czysto po odliczeniu kosztów
                </div>
              </div>
            </div>
          </div>

          {/* TWO-COLUMN DETAILS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* LEFT COLUMN: VEHICLE SPECS & HARMONOGRAM */}
            <div className="bg-[#070b14] border border-slate-800 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-yellow-400" />
                  Parametry Pojazdu & Stanowisko
                </h3>
              </div>

              {isEditing ? (
                <div className="space-y-3 text-xs font-mono">
                  <div>
                    <label className="text-slate-400 block mb-1">Numer Wewnętrzny:</label>
                    <input
                      type="text"
                      value={formData.internalNumber}
                      onChange={(e) => setFormData({ ...formData, internalNumber: e.target.value })}
                      className="w-full bg-[#030712] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Numer VIN:</label>
                    <input
                      type="text"
                      value={formData.vin}
                      onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                      className="w-full bg-[#030712] border border-slate-700 rounded-lg px-2.5 py-1.5 text-amber-300 font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 block mb-1">Marka:</label>
                      <input
                        type="text"
                        value={formData.make}
                        onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                        className="w-full bg-[#030712] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Model / Generacja:</label>
                      <input
                        type="text"
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        className="w-full bg-[#030712] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 block mb-1">Rocznik:</label>
                      <input
                        type="text"
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                        className="w-full bg-[#030712] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Kod Silnika:</label>
                      <input
                        type="text"
                        value={formData.engineCode}
                        onChange={(e) => setFormData({ ...formData, engineCode: e.target.value })}
                        className="w-full bg-[#030712] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Mechanik Odpowiedzialny:</label>
                    <select
                      value={formData.assignedWorkerName}
                      onChange={(e) => {
                        const selected = staffList.find((s) => s.name === e.target.value);
                        setFormData({
                          ...formData,
                          assignedWorkerName: e.target.value,
                          assignedWorkerId: selected?.id,
                        });
                      }}
                      className="w-full bg-[#030712] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white cursor-pointer"
                    >
                      {staffList.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name} ({s.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-850">
                    <span className="text-slate-400">Nr wewnętrzny:</span>
                    <span className="font-mono font-bold text-yellow-400">{vehicle.internalNumber}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-850">
                    <span className="text-slate-400">VIN:</span>
                    <span className="font-mono font-bold text-amber-300 select-all">{vehicle.vin || "BRAK"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-850">
                    <span className="text-slate-400">Silnik & Paliwo:</span>
                    <span className="font-mono text-slate-200">
                      {vehicle.engineCode} {vehicle.engineDisplacement} ({vehicle.fuelType || "Benzyna"})
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-850">
                    <span className="text-slate-400">Przebieg:</span>
                    <span className="font-mono text-slate-200">
                      {vehicle.mileageKm ? `${vehicle.mileageKm.toLocaleString("pl-PL")} km` : "Nieznany"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-850">
                    <span className="text-slate-400">Stan wyjściowy:</span>
                    <span className="font-mono px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[11px]">
                      {vehicle.condition}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-850">
                    <span className="text-slate-400">Odpowiedzialny mechanik:</span>
                    <span className="font-mono font-bold text-emerald-300 flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {vehicle.assignedWorkerName || "Nieprzypisany"}
                    </span>
                  </div>
                </div>
              )}

              {/* HARMONOGRAM DEMONTAŻU */}
              <div className="pt-2 border-t border-slate-800">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-2 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-teal-400" />
                  Harmonogram i Terminy
                </h4>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Data przyjęcia:</span>
                    <span className="text-slate-200">{vehicle.intakeDate}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Start demontażu:</span>
                    <span className="text-slate-200">{vehicle.dismantleStartDate || "Oczekuje"}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Koniec demontażu:</span>
                    <span className="text-slate-200">{vehicle.dismantleEndDate || "W toku"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT TWO COLUMNS: EXPENSE & SCRAP LEDGER + PARTS LIST */}
            <div className="lg:col-span-2 bg-[#070b14] border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4">
              {/* SUB TABS */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setActiveSubTab("parts")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      activeSubTab === "parts"
                        ? "bg-yellow-400 text-slate-950 shadow-xs"
                        : "bg-slate-850 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Lista Pozyskanych Części ({vehicleParts.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveSubTab("costs")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      activeSubTab === "costs"
                        ? "bg-yellow-400 text-slate-950 shadow-xs"
                        : "bg-slate-850 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Koszty & Transport</span>
                  </button>
                  <button
                    onClick={() => setActiveSubTab("scrap")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      activeSubTab === "scrap"
                        ? "bg-yellow-400 text-slate-950 shadow-xs"
                        : "bg-slate-850 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <Recycle className="w-3.5 h-3.5" />
                    <span>Złom & Surowce BDO</span>
                  </button>
                </div>

                {activeSubTab === "parts" && onAddNewPartForVehicle && (
                  <button
                    onClick={() => onAddNewPartForVehicle(vehicle)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-mono font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Dodaj Część</span>
                  </button>
                )}
              </div>

              {/* TAB 1: PARTS LIST */}
              {activeSubTab === "parts" && (
                <div className="space-y-3">
                  {/* FILTER BAR FOR PARTS */}
                  <div className="flex items-center justify-between gap-2 flex-wrap text-xs font-mono">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPartsFilter("all")}
                        className={`px-2 py-0.5 rounded ${
                          partsFilter === "all" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Wszystkie ({vehicleParts.length})
                      </button>
                      <button
                        onClick={() => setPartsFilter("in_stock")}
                        className={`px-2 py-0.5 rounded ${
                          partsFilter === "in_stock" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        W magazynie ({financials.partsCountInStock})
                      </button>
                      <button
                        onClick={() => setPartsFilter("sold")}
                        className={`px-2 py-0.5 rounded ${
                          partsFilter === "sold" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Sprzedane ({financials.partsCountSold})
                      </button>
                    </div>

                    <span className="text-slate-400">
                      Łączna wartość części: <strong className="text-yellow-400">{financials.partsSoldGrossPln + financials.partsInStockGrossPln} zł</strong>
                    </span>
                  </div>

                  {/* PARTS TABLE */}
                  {filteredParts.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-xl p-4">
                      Brak zarejestrowanych części dla tego kryterium.
                      <p className="mt-1 text-slate-400">
                        Kliknij „Dodaj Część” powyżej lub zeskanuj część na Stanowisku Pracownika.
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto border border-slate-800 rounded-xl">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-[#030712] text-slate-400 border-b border-slate-800 sticky top-0">
                          <tr>
                            <th className="py-2 px-3">Część / Kategoria</th>
                            <th className="py-2 px-2">Numery OEM</th>
                            <th className="py-2 px-2">Regał WMS</th>
                            <th className="py-2 px-2">Status</th>
                            <th className="py-2 px-3 text-right">Cena Brutto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850">
                          {filteredParts.map((part) => (
                            <tr
                              key={part.id}
                              onClick={() => onOpenPartDetails && onOpenPartDetails(part)}
                              className="hover:bg-slate-850/60 transition cursor-pointer"
                            >
                              <td className="py-2 px-3">
                                <div className="font-bold text-white">
                                  {part.listingData?.kategoria || "Część samochodowa"}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate max-w-xs">
                                  {part.listingData?.pozycja_czesci || part.listingData?.jakosc || ""}
                                </div>
                              </td>
                              <td className="py-2 px-2 text-yellow-300 font-mono font-bold">
                                {part.listingData?.numery_czesci || "—"}
                              </td>
                              <td className="py-2 px-2">
                                <span className="px-1.5 py-0.5 bg-yellow-400/10 text-yellow-400 rounded border border-yellow-400/20 text-[10px] font-bold">
                                  {part.listingData?.ocr_wyniki?.numer_magazynowy || "MAG ??"}
                                </span>
                              </td>
                              <td className="py-2 px-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    part.status === "Sprzedany"
                                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                      : "bg-slate-800 text-slate-300"
                                  }`}
                                >
                                  {part.status}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right font-black text-slate-100">
                                {part.listingData?.cena?.brutto || 0} zł
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: COSTS & EXPENSES */}
              {activeSubTab === "costs" && (
                <div className="space-y-4 font-mono text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-[#030712] p-3 rounded-xl border border-slate-800">
                      <label className="text-slate-400 block mb-1">Cena Zakupu Pojazdu (PLN):</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={formData.purchasePricePln}
                          onChange={(e) => setFormData({ ...formData, purchasePricePln: Number(e.target.value) || 0 })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold"
                        />
                      ) : (
                        <div className="text-base font-black text-rose-400 font-mono">
                          {vehicle.purchasePricePln.toLocaleString("pl-PL")} zł
                        </div>
                      )}
                    </div>

                    <div className="bg-[#030712] p-3 rounded-xl border border-slate-800">
                      <label className="text-slate-400 block mb-1">Koszt Lawety / Transportu (PLN):</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={formData.towTruckCostPln}
                          onChange={(e) => setFormData({ ...formData, towTruckCostPln: Number(e.target.value) || 0 })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold"
                        />
                      ) : (
                        <div className="text-base font-black text-rose-400 font-mono">
                          {vehicle.towTruckCostPln.toLocaleString("pl-PL")} zł
                        </div>
                      )}
                    </div>

                    <div className="bg-[#030712] p-3 rounded-xl border border-slate-800">
                      <label className="text-slate-400 block mb-1">Dodatkowe Koszty (PLN):</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={formData.additionalCostsPln}
                          onChange={(e) => setFormData({ ...formData, additionalCostsPln: Number(e.target.value) || 0 })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold"
                        />
                      ) : (
                        <div className="text-base font-black text-rose-400 font-mono">
                          {vehicle.additionalCostsPln.toLocaleString("pl-PL")} zł
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-[#030712] p-3 rounded-xl border border-slate-800">
                    <label className="text-slate-400 block mb-1">Opis dodatkowych kosztów / uwagi:</label>
                    {isEditing ? (
                      <textarea
                        value={formData.additionalCostsNotes || ""}
                        onChange={(e) => setFormData({ ...formData, additionalCostsNotes: e.target.value })}
                        rows={2}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                        placeholder="np. Odessanie klimatyzacji R134a, holowanie, mycie podwozia, opłaty celno-skarbowe"
                      />
                    ) : (
                      <p className="text-slate-300 text-xs">
                        {vehicle.additionalCostsNotes || "Brak dodatkowych uwag kosztowych."}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: SCRAP & BDO REVENUE */}
              {activeSubTab === "scrap" && (
                <div className="space-y-4 font-mono text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-[#030712] p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">Waga karoserii (kg):</span>
                      {isEditing ? (
                        <input
                          type="number"
                          value={formData.scrapWeightKg}
                          onChange={(e) => setFormData({ ...formData, scrapWeightKg: Number(e.target.value) || 0 })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white font-bold"
                        />
                      ) : (
                        <div className="text-sm font-bold text-white">{vehicle.scrapWeightKg} kg</div>
                      )}
                      <span className="text-[10px] text-slate-500">Stawka: {vehicle.scrapRatePerKg} zł/kg</span>
                    </div>

                    <div className="bg-[#030712] p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">Katalizator / DPF (PLN):</span>
                      {isEditing ? (
                        <input
                          type="number"
                          value={formData.catalystValuePln}
                          onChange={(e) => setFormData({ ...formData, catalystValuePln: Number(e.target.value) || 0 })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white font-bold"
                        />
                      ) : (
                        <div className="text-sm font-bold text-purple-400">{vehicle.catalystValuePln} zł</div>
                      )}
                    </div>

                    <div className="bg-[#030712] p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">Akumulator (PLN):</span>
                      {isEditing ? (
                        <input
                          type="number"
                          value={formData.batteryValuePln}
                          onChange={(e) => setFormData({ ...formData, batteryValuePln: Number(e.target.value) || 0 })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white font-bold"
                        />
                      ) : (
                        <div className="text-sm font-bold text-purple-400">{vehicle.batteryValuePln} zł</div>
                      )}
                    </div>

                    <div className="bg-[#030712] p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">Aluminium / Felgi (PLN):</span>
                      {isEditing ? (
                        <input
                          type="number"
                          value={formData.aluminumScrapValuePln}
                          onChange={(e) => setFormData({ ...formData, aluminumScrapValuePln: Number(e.target.value) || 0 })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white font-bold"
                        />
                      ) : (
                        <div className="text-sm font-bold text-purple-400">{vehicle.aluminumScrapValuePln} zł</div>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-purple-300">Łączny Odzysk ze Złomu & Surowców BDO:</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Zabezpiecza koszt zakupu pojazdu nawet przed sprzedażą pierwszej części.
                      </p>
                    </div>
                    <div className="text-lg font-black text-purple-400 font-mono">
                      {financials.scrapTotalRevenuePln.toLocaleString("pl-PL")} zł
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="px-4 sm:px-6 py-3 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>PHU U KONESERA WMS & ERP • Mysłakowice</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold transition cursor-pointer"
            >
              Zamknij Kartę
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
