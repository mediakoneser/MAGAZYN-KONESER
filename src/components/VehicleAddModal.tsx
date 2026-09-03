import React, { useState } from "react";
import {
  X,
  Car,
  Plus,
  Wrench,
  DollarSign,
  User,
  Calendar,
  AlertCircle,
  Truck,
  Recycle,
  Sparkles
} from "lucide-react";
import { VehicleLifecycleRecord, StaffMember, VehicleLifecycleStatus } from "../types";

interface VehicleAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddVehicle: (newVehicle: VehicleLifecycleRecord) => void;
  existingVehiclesCount: number;
  staffList: StaffMember[];
}

export const VehicleAddModal: React.FC<VehicleAddModalProps> = ({
  isOpen,
  onClose,
  onAddVehicle,
  existingVehiclesCount,
  staffList,
}) => {
  if (!isOpen) return null;

  const currentYear = new Date().getFullYear();
  const nextNumber = String(existingVehiclesCount + 1).padStart(2, "0");
  const defaultInternalNo = `KONESER-${currentYear}/${nextNumber}`;

  const [formData, setFormData] = useState<Partial<VehicleLifecycleRecord>>({
    internalNumber: defaultInternalNo,
    vin: "",
    make: "Volkswagen",
    model: "Passat B6",
    generation: "B6 (3C)",
    year: "2007",
    engineCode: "2.0 TDI BMP",
    engineDisplacement: "1968 cm³",
    powerHp: "140 KM",
    fuelType: "Diesel",
    paintCode: "LC9X (Deep Black)",
    mileageKm: 265000,
    condition: "Kompletny / Jeżdżący",
    purchasePricePln: 2000,
    towTruckCostPln: 200,
    additionalCostsPln: 100,
    additionalCostsNotes: "Transport lawetą z Jeleniej Góry, rozładunek, odessanie czynnika",
    assignedWorkerName: staffList.find((s) => s.role.includes("Demontaż"))?.name || staffList[0]?.name || "Marek Demontaż",
    intakeDate: new Date().toISOString().slice(0, 10),
    lifecycleStatus: "ZAKUPIONY_NA_PLACU",
    scrapWeightKg: 950,
    scrapRatePerKg: 0.85,
    catalystValuePln: 850,
    batteryValuePln: 70,
    aluminumScrapValuePln: 250,
    dismantledPartIds: [],
    notes: "Auto kompletne, silnik 8V BMP odpala i równo pracuje. Skrzynia manualna 6b.",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!formData.internalNumber?.trim()) newErrors.internalNumber = "Numer wewnętrzny jest wymagany";
    if (!formData.make?.trim()) newErrors.make = "Marka jest wymagana";
    if (!formData.model?.trim()) newErrors.model = "Model jest wymagany";
    if (!formData.year?.trim()) newErrors.year = "Rocznik jest wymagany";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const assigned = staffList.find((s) => s.name === formData.assignedWorkerName);

    const newVehicle: VehicleLifecycleRecord = {
      id: `veh_${Date.now()}`,
      internalNumber: formData.internalNumber!.trim(),
      vin: (formData.vin || "").trim().toUpperCase(),
      make: formData.make!.trim(),
      model: formData.model!.trim(),
      generation: formData.generation?.trim(),
      year: formData.year!.trim(),
      engineCode: formData.engineCode?.trim() || "N/A",
      engineDisplacement: formData.engineDisplacement?.trim(),
      powerHp: formData.powerHp?.trim(),
      fuelType: formData.fuelType || "Diesel",
      paintCode: formData.paintCode?.trim(),
      mileageKm: Number(formData.mileageKm) || undefined,
      condition: formData.condition || "Kompletny / Jeżdżący",
      purchasePricePln: Number(formData.purchasePricePln) || 0,
      towTruckCostPln: Number(formData.towTruckCostPln) || 0,
      additionalCostsPln: Number(formData.additionalCostsPln) || 0,
      additionalCostsNotes: formData.additionalCostsNotes,
      assignedWorkerId: assigned?.id,
      assignedWorkerName: formData.assignedWorkerName || "Marek Demontaż",
      intakeDate: formData.intakeDate || new Date().toISOString().slice(0, 10),
      lifecycleStatus: formData.lifecycleStatus || "ZAKUPIONY_NA_PLACU",
      scrapWeightKg: Number(formData.scrapWeightKg) || 850,
      scrapRatePerKg: Number(formData.scrapRatePerKg) || 0.85,
      catalystValuePln: Number(formData.catalystValuePln) || 0,
      batteryValuePln: Number(formData.batteryValuePln) || 0,
      aluminumScrapValuePln: Number(formData.aluminumScrapValuePln) || 0,
      dismantledPartIds: [],
      notes: formData.notes,
      createdAt: new Date().toISOString(),
    };

    onAddVehicle(newVehicle);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#0b0f19] border border-slate-700/90 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* HEADER */}
        <div className="px-5 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-400 text-slate-950 rounded-xl font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white font-mono flex items-center gap-2">
                Przyjęcie Nowego Pojazdu do Kasacji & Demontażu
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Rejestracja w karcie pojazdu PHU U Konesera, kalkulacja kosztów i przydział demontażysty
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* SECTION 1: PODSTAWOWE DANE IDENTYFIKACYJNE */}
          <div className="bg-[#070b14] border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-yellow-400 font-mono flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Car className="w-4 h-4" />
              1. Identyfikacja Pojazdu & VIN
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-mono block mb-1 font-bold">
                  Numer Wewnętrzny <span className="text-rose-400">*</span>:
                </label>
                <input
                  type="text"
                  value={formData.internalNumber}
                  onChange={(e) => setFormData({ ...formData, internalNumber: e.target.value })}
                  className="w-full bg-[#030712] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono font-bold text-yellow-300"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-mono block mb-1 font-bold">
                  Numer VIN (17 znaków):
                </label>
                <input
                  type="text"
                  value={formData.vin}
                  onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                  placeholder="np. WVWZZZ3BZ3E192841"
                  className="w-full bg-[#030712] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono font-bold text-amber-300 uppercase"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-mono block mb-1 font-bold">
                  Data Przyjęcia na Plac:
                </label>
                <input
                  type="date"
                  value={formData.intakeDate}
                  onChange={(e) => setFormData({ ...formData, intakeDate: e.target.value })}
                  className="w-full bg-[#030712] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div>
                <label className="text-xs text-slate-300 font-mono block mb-1">Marka:</label>
                <input
                  type="text"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  placeholder="np. Audi, BMW, VW, Skoda"
                  className="w-full bg-[#030712] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-mono block mb-1">Model & Generacja:</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="np. A4 B6, Passat B5 FL"
                  className="w-full bg-[#030712] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-mono block mb-1">Rocznik:</label>
                <input
                  type="text"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  placeholder="np. 2004"
                  className="w-full bg-[#030712] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-mono block mb-1">Kod Silnika:</label>
                <input
                  type="text"
                  value={formData.engineCode}
                  onChange={(e) => setFormData({ ...formData, engineCode: e.target.value })}
                  placeholder="np. 1.9 TDI AVF, 1.4 MPI"
                  className="w-full bg-[#030712] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div>
                <label className="text-xs text-slate-300 font-mono block mb-1">Paliwo:</label>
                <select
                  value={formData.fuelType}
                  onChange={(e) => setFormData({ ...formData, fuelType: e.target.value as any })}
                  className="w-full bg-[#030712] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white"
                >
                  <option value="Diesel">Diesel</option>
                  <option value="Benzyna">Benzyna</option>
                  <option value="Benzyna+LPG">Benzyna + LPG</option>
                  <option value="Hybryda">Hybryda</option>
                  <option value="Elektryczny">Elektryczny</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-mono block mb-1">Kod Lakieru:</label>
                <input
                  type="text"
                  value={formData.paintCode}
                  onChange={(e) => setFormData({ ...formData, paintCode: e.target.value })}
                  placeholder="np. LC9Z, LY7W, 9102"
                  className="w-full bg-[#030712] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-mono block mb-1">Przebieg (km):</label>
                <input
                  type="number"
                  value={formData.mileageKm}
                  onChange={(e) => setFormData({ ...formData, mileageKm: Number(e.target.value) || 0 })}
                  placeholder="np. 240000"
                  className="w-full bg-[#030712] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-mono block mb-1">Stan pojazdu:</label>
                <select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
                  className="w-full bg-[#030712] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white"
                >
                  <option value="Kompletny / Jeżdżący">Kompletny / Jeżdżący</option>
                  <option value="Powypadkowy (Przód)">Powypadkowy (Przód)</option>
                  <option value="Powypadkowy (Tył/Bok)">Powypadkowy (Tył/Bok)</option>
                  <option value="Zatarty silnik">Zatarty silnik</option>
                  <option value="Anglik / Bez prawa rej.">Anglik / Bez prawa rej.</option>
                  <option value="Wrak / Karoseria">Wrak / Karoseria</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2: KOSZTY ZAKUPU I TRANSPORTU */}
          <div className="bg-[#070b14] border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 font-mono flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <DollarSign className="w-4 h-4" />
              2. Koszty Zakupu, Lawety i Obsługi
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-mono block mb-1 font-bold">
                  Cena Zakupu Pojazdu (PLN):
                </label>
                <input
                  type="number"
                  value={formData.purchasePricePln}
                  onChange={(e) => setFormData({ ...formData, purchasePricePln: Number(e.target.value) || 0 })}
                  className="w-full bg-[#030712] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono font-bold text-rose-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-mono block mb-1 font-bold">
                  Koszt Lawety / Transportu (PLN):
                </label>
                <input
                  type="number"
                  value={formData.towTruckCostPln}
                  onChange={(e) => setFormData({ ...formData, towTruckCostPln: Number(e.target.value) || 0 })}
                  className="w-full bg-[#030712] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono font-bold text-rose-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-mono block mb-1 font-bold">
                  Dodatkowe Koszty (PLN):
                </label>
                <input
                  type="number"
                  value={formData.additionalCostsPln}
                  onChange={(e) => setFormData({ ...formData, additionalCostsPln: Number(e.target.value) || 0 })}
                  className="w-full bg-[#030712] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono font-bold text-rose-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-mono block mb-1">Opis dodatkowych kosztów:</label>
              <input
                type="text"
                value={formData.additionalCostsNotes || ""}
                onChange={(e) => setFormData({ ...formData, additionalCostsNotes: e.target.value })}
                placeholder="np. Holowanie, rozładunek wózkiem, odessanie klimatyzacji, mycie komory"
                className="w-full bg-[#030712] border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200"
              />
            </div>
          </div>

          {/* SECTION 3: PERSONEL I RECYKLING */}
          <div className="bg-[#070b14] border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Wrench className="w-4 h-4" />
              3. Przypisanie Mechanika & Szacunek Złomu BDO
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-mono block mb-1 font-bold">
                  Mechanik Odpowiedzialny za Demontaż:
                </label>
                <select
                  value={formData.assignedWorkerName}
                  onChange={(e) => setFormData({ ...formData, assignedWorkerName: e.target.value })}
                  className="w-full bg-[#030712] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-emerald-300 font-bold"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-mono block mb-1 font-bold">
                  Status Cyklu Życia:
                </label>
                <select
                  value={formData.lifecycleStatus}
                  onChange={(e) => setFormData({ ...formData, lifecycleStatus: e.target.value as any })}
                  className="w-full bg-[#030712] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-yellow-300 font-bold"
                >
                  <option value="PRZYJĘCIE_I_WYCENA">1. Przyjęcie & Wycena</option>
                  <option value="ZAKUPIONY_NA_PLACU">2. Zakupiony na placu (Oczekuje)</option>
                  <option value="W_TRAKCIE_DEMONTAŻU">3. W trakcie demontażu</option>
                  <option value="DEMONTAŻ_ZAKOŃCZONY">4. Demontaż zakończony (Części w WMS)</option>
                  <option value="ROZLICZONY_I_ZŁOM_BDO">5. Rozliczony & Złom BDO</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div>
                <label className="text-xs text-slate-400 font-mono block mb-1">Szac. waga wraku (kg):</label>
                <input
                  type="number"
                  value={formData.scrapWeightKg}
                  onChange={(e) => setFormData({ ...formData, scrapWeightKg: Number(e.target.value) || 0 })}
                  className="w-full bg-[#030712] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-mono block mb-1">Katalizator / DPF (PLN):</label>
                <input
                  type="number"
                  value={formData.catalystValuePln}
                  onChange={(e) => setFormData({ ...formData, catalystValuePln: Number(e.target.value) || 0 })}
                  className="w-full bg-[#030712] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-purple-400 font-bold"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-mono block mb-1">Akumulator (PLN):</label>
                <input
                  type="number"
                  value={formData.batteryValuePln}
                  onChange={(e) => setFormData({ ...formData, batteryValuePln: Number(e.target.value) || 0 })}
                  className="w-full bg-[#030712] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-purple-400 font-bold"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-mono block mb-1">Aluminium / Felgi (PLN):</label>
                <input
                  type="number"
                  value={formData.aluminumScrapValuePln}
                  onChange={(e) => setFormData({ ...formData, aluminumScrapValuePln: Number(e.target.value) || 0 })}
                  className="w-full bg-[#030712] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-purple-400 font-bold"
                />
              </div>
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-mono font-bold transition"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-xl text-xs font-mono font-black transition flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Utwórz Kartę Pojazdu</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
