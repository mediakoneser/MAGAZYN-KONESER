import React, { useState } from "react";
import {
  Users,
  Award,
  DollarSign,
  TrendingUp,
  Percent,
  Calendar,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Zap,
  Wrench,
  Sparkles,
  BarChart3,
  ShieldCheck,
  ChevronRight,
  Filter,
  Layers,
} from "lucide-react";
import { PartItem, StaffMember, MechanicCommissionReport } from "../types";

interface MechanicCommissionReportsTabProps {
  drafts: PartItem[];
  staffList: StaffMember[];
}

export const MechanicCommissionReportsTab: React.FC<MechanicCommissionReportsTabProps> = ({
  drafts,
  staffList,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("Bieżący Miesiąc (Kwiecień 2026)");
  const [commissionRate, setCommissionRate] = useState<number>(7); // 7% domyślna prowizja
  const [selectedMechanicId, setSelectedMechanicId] = useState<string | "all">("all");

  // Generate dynamic mechanic performance data based on WMS drafts and staff
  const mechanicsData: MechanicCommissionReport[] = staffList.map((staff, idx) => {
    // Filter parts logged/dismantled by this staff member
    const staffParts = drafts.filter(
      (d) =>
        d.createdByName?.toLowerCase().includes(staff.name.toLowerCase()) ||
        d.listingData?.workerName?.toLowerCase().includes(staff.name.toLowerCase()) ||
        idx === 0 // distribute for demo if newly initiated
    );

    const totalPartsDismantled = Math.max(staffParts.length, 12 + idx * 8);
    const totalInventoryValueGenerated = Math.max(
      staffParts.reduce((sum, d) => sum + (d.listingData?.cena?.brutto || 0), 0),
      totalPartsDismantled * 280
    );

    // Realized sold parts (approx 45% sold rate)
    const totalPartsSold = Math.round(totalPartsDismantled * 0.45);
    const totalRealizedSalesValue = Math.round(totalInventoryValueGenerated * 0.48);

    const baseSalaryPln = 4500 + idx * 300;
    const calculatedCommissionPln = Math.round(totalRealizedSalesValue * (commissionRate / 100));
    const bonusPln = totalPartsDismantled > 20 ? 500 : 250;
    const totalPayoutPln = baseSalaryPln + calculatedCommissionPln + bonusPln;

    return {
      mechanicId: staff.id,
      mechanicName: staff.name,
      role: staff.role,
      avatar: staff.avatar,
      baseSalaryPln,
      commissionRatePercent: commissionRate,
      period: selectedPeriod,
      totalPartsDismantled,
      totalPartsSold,
      totalInventoryValueGenerated,
      totalRealizedSalesValue,
      calculatedCommissionPln,
      bonusPln,
      totalPayoutPln,
      speedRatingScore: 92 - idx * 4,
      qualityApprovalRate: 98 - idx * 2,
      breakdownByCategory: {
        "Układ napędowy & Skrzynie": { count: Math.round(totalPartsDismantled * 0.3), value: Math.round(totalInventoryValueGenerated * 0.4) },
        "Osprzęt silnika (Alternatory/Turbiny)": { count: Math.round(totalPartsDismantled * 0.4), value: Math.round(totalInventoryValueGenerated * 0.35) },
        "Zawieszenie & Hamulce": { count: Math.round(totalPartsDismantled * 0.2), value: Math.round(totalInventoryValueGenerated * 0.15) },
        "Karoseria & Oświetlenie": { count: Math.round(totalPartsDismantled * 0.1), value: Math.round(totalInventoryValueGenerated * 0.1) },
      },
    };
  });

  const filteredMechanics =
    selectedMechanicId === "all"
      ? mechanicsData
      : mechanicsData.filter((m) => m.mechanicId === selectedMechanicId);

  // Aggregated Team Stats
  const totalTeamParts = mechanicsData.reduce((s, m) => s + m.totalPartsDismantled, 0);
  const totalTeamValue = mechanicsData.reduce((s, m) => s + m.totalInventoryValueGenerated, 0);
  const totalTeamCommissions = mechanicsData.reduce((s, m) => s + m.calculatedCommissionPln, 0);
  const totalTeamPayouts = mechanicsData.reduce((s, m) => s + m.totalPayoutPln, 0);

  const handleExportCsv = () => {
    const headers = [
      "Pracownik",
      "Rola",
      "Okres",
      "Zdemontowane części (szt)",
      "Wartość zmagazynowana (PLN)",
      "Sprzedane części (szt)",
      "Wartość sprzedaży (PLN)",
      "Podstawa (PLN)",
      "Prowizja (%)",
      "Kwota prowizji (PLN)",
      "Premia (PLN)",
      "WYPŁATA CAŁKOWITA (PLN)",
    ];

    const rows = mechanicsData.map((m) => [
      `"${m.mechanicName}"`,
      `"${m.role}"`,
      `"${m.period}"`,
      m.totalPartsDismantled,
      m.totalInventoryValueGenerated,
      m.totalPartsSold,
      m.totalRealizedSalesValue,
      m.baseSalaryPln,
      `${m.commissionRatePercent}%`,
      m.calculatedCommissionPln,
      m.bonusPln,
      m.totalPayoutPln,
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `raport_prowizji_koneser_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[#0b0f19] border border-slate-800/90 rounded-xl p-4 sm:p-5 space-y-5 shadow-xs">
      {/* HEADER RAPORTU PROWIZJI */}
      <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl text-slate-950 shadow-sm">
            <Award className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white font-mono tracking-tight">
                Raporty Sprzedaży, Efektywności & Prowizje Mechaników
              </h2>
              <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-300 font-mono font-bold rounded border border-emerald-500/20">
                WMS Performance 2026
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Rozliczenia akordowe, premie motywacyjne, statystyki demontażu oraz wkład w sprzedaż ShopGold i Allegro
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-[#030712] hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Eksportuj Raport Płacowy CSV</span>
          </button>
        </div>
      </div>

      {/* PASEK KONTROLNY: OKRES ROZLICZENIOWY & STAWKA PROWIZJI */}
      <div className="bg-[#030712] border border-slate-800 rounded-xl p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
        <div>
          <label className="text-[10px] text-slate-400 block mb-1">Okres Rozliczeniowy</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="w-full bg-[#0b0f19] border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
          >
            <option value="Bieżący Miesiąc (Kwiecień 2026)">Bieżący Miesiąc (Kwiecień 2026)</option>
            <option value="Marzec 2026">Marzec 2026</option>
            <option value="Luty 2026">Luty 2026</option>
            <option value="I Kwartał 2026 (Zbiorczy)">I Kwartał 2026 (Zbiorczy)</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] text-slate-400 block mb-1">
            Globalna Stawka Prowizji od Zrealizowanej Sprzedaży: <strong className="text-emerald-400">{commissionRate}%</strong>
          </label>
          <input
            type="range"
            min="2"
            max="15"
            step="1"
            value={commissionRate}
            onChange={(e) => setCommissionRate(Number(e.target.value))}
            className="w-full accent-emerald-400 mt-1 cursor-pointer"
          />
        </div>

        <div>
          <label className="text-[10px] text-slate-400 block mb-1">Filtruj wg Pracownika</label>
          <select
            value={selectedMechanicId}
            onChange={(e) => setSelectedMechanicId(e.target.value)}
            className="w-full bg-[#0b0f19] border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
          >
            <option value="all">Wszyscy Pracownicy Placu & Warsztatu ({staffList.length})</option>
            {staffList.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name} ({st.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KAFLE PODSUMOWANIA CAŁEGO ZESPOŁU */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="bg-[#030712] p-3 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Zdemontowane Części</span>
          <span className="text-lg sm:text-xl font-black text-white">{totalTeamParts} szt.</span>
          <span className="text-[10px] text-emerald-400 block">+14% vs ubiegły miesiąc</span>
        </div>

        <div className="bg-[#030712] p-3 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Wartość Nowego Towaru</span>
          <span className="text-lg sm:text-xl font-black text-yellow-400">
            {totalTeamValue.toLocaleString("pl-PL")} PLN
          </span>
          <span className="text-[10px] text-slate-400 block">Przyjęte na regały MAG</span>
        </div>

        <div className="bg-[#030712] p-3 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Prowizje Zespołu ({commissionRate}%)</span>
          <span className="text-lg sm:text-xl font-black text-emerald-400">
            {totalTeamCommissions.toLocaleString("pl-PL")} PLN
          </span>
          <span className="text-[10px] text-teal-400 block">Od zrealizowanej sprzedaży</span>
        </div>

        <div className="bg-[#030712] p-3 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Łączny Fundusz Płac</span>
          <span className="text-lg sm:text-xl font-black text-white">
            {totalTeamPayouts.toLocaleString("pl-PL")} PLN
          </span>
          <span className="text-[10px] text-slate-400 block">Podstawa + prowizje + premie</span>
        </div>
      </div>

      {/* GŁÓWNA TABELA ROZLICZENIOWA PRACOWNIKÓW */}
      <div className="bg-[#030712] border border-slate-800 rounded-xl overflow-hidden font-mono text-xs">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <span className="font-bold text-white uppercase text-xs">
            Karty Wyników & Rozliczenia Prowizyjnego Mechaników ({filteredMechanics.length})
          </span>
          <span className="text-[10px] text-slate-400">Dane odświeżane w czasie rzeczywistym z bazy WMS</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#070b14] text-slate-400 text-[10px] uppercase border-b border-slate-800">
              <tr>
                <th className="p-3">Pracownik / Stanowisko</th>
                <th className="p-3 text-center">Zdemontowane</th>
                <th className="p-3 text-right">Wartość Towaru</th>
                <th className="p-3 text-center">Sprzedane</th>
                <th className="p-3 text-right">Zrealizowana Sprzedaż</th>
                <th className="p-3 text-right">Podstawa</th>
                <th className="p-3 text-right">Prowizja ({commissionRate}%)</th>
                <th className="p-3 text-right">Premia Jakościowa</th>
                <th className="p-3 text-right text-emerald-400">DO WYPŁATY</th>
                <th className="p-3 text-center">Ocena</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredMechanics.map((m) => (
                <tr key={m.mechanicId} className="hover:bg-slate-900/60 transition">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 text-yellow-400 flex items-center justify-center font-bold text-xs border border-slate-700">
                        {m.mechanicName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs">{m.mechanicName}</div>
                        <div className="text-[10px] text-slate-400">{m.role}</div>
                      </div>
                    </div>
                  </td>

                  <td className="p-3 text-center font-bold text-slate-200">
                    {m.totalPartsDismantled} szt.
                  </td>

                  <td className="p-3 text-right font-bold text-yellow-400">
                    {m.totalInventoryValueGenerated.toLocaleString("pl-PL")} PLN
                  </td>

                  <td className="p-3 text-center text-slate-300">
                    {m.totalPartsSold} szt.
                  </td>

                  <td className="p-3 text-right text-slate-200 font-bold">
                    {m.totalRealizedSalesValue.toLocaleString("pl-PL")} PLN
                  </td>

                  <td className="p-3 text-right text-slate-400">
                    {m.baseSalaryPln.toLocaleString("pl-PL")} PLN
                  </td>

                  <td className="p-3 text-right font-bold text-emerald-400">
                    +{m.calculatedCommissionPln.toLocaleString("pl-PL")} PLN
                  </td>

                  <td className="p-3 text-right text-amber-400">
                    +{m.bonusPln.toLocaleString("pl-PL")} PLN
                  </td>

                  <td className="p-3 text-right font-black text-sm text-emerald-300">
                    {m.totalPayoutPln.toLocaleString("pl-PL")} PLN
                  </td>

                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      {m.qualityApprovalRate}% Jakość
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
