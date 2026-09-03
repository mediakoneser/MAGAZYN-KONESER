import { VehicleLifecycleRecord, PartItem, VehicleFinancialSummary } from "../types";

/**
 * Calculates complete real-time financial metrics for a vehicle card in PHU U Konesera WMS/ERP
 */
export function calculateVehicleFinancials(
  vehicle: VehicleLifecycleRecord,
  allParts: PartItem[]
): VehicleFinancialSummary {
  const purchasePrice = Number(vehicle.purchasePricePln) || 0;
  const towTruckCost = Number(vehicle.towTruckCostPln) || 0;
  const additionalCosts = Number(vehicle.additionalCostsPln) || 0;
  const totalCostPln = purchasePrice + towTruckCost + additionalCosts;

  // Find all parts linked to this vehicle
  const linkedParts = allParts.filter(
    (p) =>
      p.vehicleId === vehicle.id ||
      (p.vehicleInternalNo && p.vehicleInternalNo === vehicle.internalNumber) ||
      (vehicle.dismantledPartIds && vehicle.dismantledPartIds.includes(p.id)) ||
      // Fallback matching by brand/model match if explicit ID missing
      (p.listingData?.samochod?.vin && vehicle.vin && p.listingData.samochod.vin === vehicle.vin)
  );

  let partsSoldGrossPln = 0;
  let partsSoldNetPln = 0;
  let partsInStockGrossPln = 0;
  let partsInStockNetPln = 0;
  let partsCountSold = 0;
  let partsCountInStock = 0;

  for (const part of linkedParts) {
    const qty = Math.max(1, part.listingData?.ilosc ?? part.ilosc ?? 1);
    const grossPrice = Number(part.listingData?.cena?.brutto) || 0;
    const netPrice = Number(part.listingData?.cena?.netto) || (grossPrice > 0 ? Math.round(grossPrice / 1.23) : 0);

    if (part.status === "Sprzedany") {
      partsSoldGrossPln += grossPrice * qty;
      partsSoldNetPln += netPrice * qty;
      partsCountSold += qty;
    } else if (part.status !== "Zutylizowany") {
      partsInStockGrossPln += grossPrice * qty;
      partsInStockNetPln += netPrice * qty;
      partsCountInStock += qty;
    }
  }

  // Scrap & Recycling BDO Revenue calculation
  const scrapWeight = Number(vehicle.scrapWeightKg) || 0;
  const scrapRate = Number(vehicle.scrapRatePerKg) || 0.85;
  const scrapMetalVal = scrapWeight * scrapRate;
  const catalystVal = Number(vehicle.catalystValuePln) || 0;
  const batteryVal = Number(vehicle.batteryValuePln) || 0;
  const aluminumVal = Number(vehicle.aluminumScrapValuePln) || 0;

  const scrapTotalRevenuePln = Math.round(scrapMetalVal + catalystVal + batteryVal + aluminumVal);

  // Totals
  const totalRevenueGrossPln = Math.round(partsSoldGrossPln + partsInStockGrossPln + scrapTotalRevenuePln);
  const totalRealizedRevenuePln = Math.round(partsSoldGrossPln + scrapTotalRevenuePln);
  const netRealizedProfitPln = Math.round(totalRealizedRevenuePln - totalCostPln);
  const projectedNetProfitPln = Math.round(totalRevenueGrossPln - totalCostPln);
  const roiPercentage = totalCostPln > 0 ? Math.round((projectedNetProfitPln / totalCostPln) * 100) : 0;

  // Dismantle duration in days calculation (czas od zakupu/przyjęcia do zakończenia demontażu)
  let dismantleDurationDays: number | null = null;
  if (vehicle.intakeDate) {
    const intakeTime = new Date(vehicle.intakeDate).getTime();
    if (vehicle.dismantleEndDate) {
      const endTime = new Date(vehicle.dismantleEndDate).getTime();
      dismantleDurationDays = Math.max(1, Math.round((endTime - intakeTime) / (1000 * 60 * 60 * 24)));
    } else if (vehicle.dismantleStartDate) {
      // In progress
      const nowTime = new Date("2026-09-01").getTime(); // Use current system timeline
      dismantleDurationDays = Math.max(1, Math.round((nowTime - intakeTime) / (1000 * 60 * 60 * 24)));
    }
  }

  // Margin calculation: (Przychód - Koszt) / Przychód * 100%
  const marginPercentage = totalRevenueGrossPln > 0 
    ? Math.round(((totalRevenueGrossPln - totalCostPln) / totalRevenueGrossPln) * 100)
    : 0;

  return {
    purchasePricePln: purchasePrice,
    towTruckCostPln: towTruckCost,
    additionalCostsPln: additionalCosts,
    totalCostPln,
    partsSoldGrossPln: Math.round(partsSoldGrossPln),
    partsSoldNetPln: Math.round(partsSoldNetPln),
    partsInStockGrossPln: Math.round(partsInStockGrossPln),
    partsInStockNetPln: Math.round(partsInStockNetPln),
    scrapTotalRevenuePln,
    totalRevenueGrossPln,
    totalRealizedRevenuePln,
    netRealizedProfitPln,
    projectedNetProfitPln,
    roiPercentage,
    marginPercentage,
    dismantleDurationDays,
    partsCountTotal: linkedParts.length,
    partsCountSold,
    partsCountInStock,
  };
}

export interface FleetProfitabilityMetrics {
  totalVehicles: number;
  totalCosts: number;
  totalPurchaseCosts: number;
  totalTowCosts: number;
  totalAdditionalCosts: number;
  totalPartsRevenueSold: number;
  totalPartsRevenueInStock: number;
  totalPartsRevenueGross: number;
  totalScrapRevenue: number;
  totalRevenueGross: number;
  totalRealizedRevenue: number;
  totalProjectedProfit: number;
  totalRealizedProfit: number;
  averageProfitPerVehicle: number;
  averageRealizedProfitPerVehicle: number;
  averageMarginPercent: number;
  averageRoiPercent: number;
  averageDismantleDays: number;
  completedDismantlesCount: number;
  inProgressDismantlesCount: number;
  waitingDismantlesCount: number;
  mostProfitableVehicles: Array<{
    vehicle: VehicleLifecycleRecord;
    financials: VehicleFinancialSummary;
  }>;
  leastProfitableVehicles: Array<{
    vehicle: VehicleLifecycleRecord;
    financials: VehicleFinancialSummary;
    diagnosticReason: string;
  }>;
  brandProfitability: Array<{
    brand: string;
    count: number;
    totalCost: number;
    totalRevenue: number;
    profit: number;
    marginPercent: number;
    avgDismantleDays: number;
  }>;
  workerEfficiency: Array<{
    workerName: string;
    vehiclesCount: number;
    partsCount: number;
    totalProfitGenerated: number;
    avgDismantleDays: number;
  }>;
}

export function calculateFleetProfitabilityMetrics(
  vehicles: VehicleLifecycleRecord[],
  allParts: PartItem[]
): FleetProfitabilityMetrics {
  let totalCosts = 0;
  let totalPurchaseCosts = 0;
  let totalTowCosts = 0;
  let totalAdditionalCosts = 0;
  let totalPartsRevenueSold = 0;
  let totalPartsRevenueInStock = 0;
  let totalScrapRevenue = 0;
  let totalRevenueGross = 0;
  let totalRealizedRevenue = 0;
  let totalProjectedProfit = 0;
  let totalRealizedProfit = 0;

  let completedDaysSum = 0;
  let completedDaysCount = 0;
  let completedDismantlesCount = 0;
  let inProgressDismantlesCount = 0;
  let waitingDismantlesCount = 0;

  const vehicleWithFin = vehicles.map((v) => {
    const fin = calculateVehicleFinancials(v, allParts);
    totalCosts += fin.totalCostPln;
    totalPurchaseCosts += fin.purchasePricePln;
    totalTowCosts += fin.towTruckCostPln;
    totalAdditionalCosts += fin.additionalCostsPln;
    totalPartsRevenueSold += fin.partsSoldGrossPln;
    totalPartsRevenueInStock += fin.partsInStockGrossPln;
    totalScrapRevenue += fin.scrapTotalRevenuePln;
    totalRevenueGross += fin.totalRevenueGrossPln;
    totalRealizedRevenue += fin.totalRealizedRevenuePln;
    totalProjectedProfit += fin.projectedNetProfitPln;
    totalRealizedProfit += fin.netRealizedProfitPln;

    if (v.lifecycleStatus === "DEMONTAŻ_ZAKOŃCZONY" || v.lifecycleStatus === "ROZLICZONY_I_ZŁOM_BDO") {
      completedDismantlesCount++;
      if (fin.dismantleDurationDays !== null) {
        completedDaysSum += fin.dismantleDurationDays;
        completedDaysCount++;
      }
    } else if (v.lifecycleStatus === "W_TRAKCIE_DEMONTAŻU") {
      inProgressDismantlesCount++;
    } else {
      waitingDismantlesCount++;
    }

    return { vehicle: v, financials: fin };
  });

  const totalVehicles = vehicles.length;
  const averageProfitPerVehicle = totalVehicles > 0 ? Math.round(totalProjectedProfit / totalVehicles) : 0;
  const averageRealizedProfitPerVehicle = totalVehicles > 0 ? Math.round(totalRealizedProfit / totalVehicles) : 0;
  const averageMarginPercent = totalRevenueGross > 0 ? Math.round(((totalRevenueGross - totalCosts) / totalRevenueGross) * 100) : 0;
  const averageRoiPercent = totalCosts > 0 ? Math.round((totalProjectedProfit / totalCosts) * 100) : 0;
  const averageDismantleDays = completedDaysCount > 0 ? Math.round((completedDaysSum / completedDaysCount) * 10) / 10 : 2.5;

  // Sort by profit descending for top most profitable
  const sortedByProfitDesc = [...vehicleWithFin].sort(
    (a, b) => b.financials.projectedNetProfitPln - a.financials.projectedNetProfitPln
  );

  const mostProfitableVehicles = sortedByProfitDesc.slice(0, 5);

  // Sort by profit ascending for least profitable
  const sortedByProfitAsc = [...vehicleWithFin].sort(
    (a, b) => a.financials.projectedNetProfitPln - b.financials.projectedNetProfitPln
  );

  const leastProfitableVehicles = sortedByProfitAsc.slice(0, 3).map((item) => {
    let reason = "Niska szacunkowa wartość odzyskanych części w stosunku do ceny zakupu";
    if (item.financials.towTruckCostPln > item.financials.purchasePricePln * 0.25) {
      reason = "Wysoki udział kosztów transportu lawetą w cenie całkowitej";
    } else if (item.financials.scrapTotalRevenuePln < 800 && item.financials.partsCountTotal <= 2) {
      reason = "Niska masa wraku i mała liczba podzespołów zdatnych do odsprzedaży";
    } else if (item.financials.marginPercentage < 35) {
      reason = "Niska marża handlowa (<35%) – zalecana twardsza negocjacja ceny skupu";
    }
    return {
      ...item,
      diagnosticReason: reason,
    };
  });

  // Group by Brand
  const brandMap = new Map<string, { count: number; totalCost: number; totalRevenue: number; profit: number; daysSum: number; daysCount: number }>();
  for (const item of vehicleWithFin) {
    const b = item.vehicle.make || "Inne";
    const existing = brandMap.get(b) || { count: 0, totalCost: 0, totalRevenue: 0, profit: 0, daysSum: 0, daysCount: 0 };
    existing.count++;
    existing.totalCost += item.financials.totalCostPln;
    existing.totalRevenue += item.financials.totalRevenueGrossPln;
    existing.profit += item.financials.projectedNetProfitPln;
    if (item.financials.dismantleDurationDays) {
      existing.daysSum += item.financials.dismantleDurationDays;
      existing.daysCount++;
    }
    brandMap.set(b, existing);
  }

  const brandProfitability = Array.from(brandMap.entries()).map(([brand, val]) => ({
    brand,
    count: val.count,
    totalCost: val.totalCost,
    totalRevenue: val.totalRevenue,
    profit: val.profit,
    marginPercent: val.totalRevenue > 0 ? Math.round(((val.totalRevenue - val.totalCost) / val.totalRevenue) * 100) : 0,
    avgDismantleDays: val.daysCount > 0 ? Math.round((val.daysSum / val.daysCount) * 10) / 10 : 2,
  })).sort((a, b) => b.profit - a.profit);

  // Group by Worker
  const workerMap = new Map<string, { count: number; partsCount: number; profit: number; daysSum: number; daysCount: number }>();
  for (const item of vehicleWithFin) {
    const w = item.vehicle.assignedWorkerName || "Nieprzypisany";
    const existing = workerMap.get(w) || { count: 0, partsCount: 0, profit: 0, daysSum: 0, daysCount: 0 };
    existing.count++;
    existing.partsCount += item.financials.partsCountTotal;
    existing.profit += item.financials.projectedNetProfitPln;
    if (item.financials.dismantleDurationDays) {
      existing.daysSum += item.financials.dismantleDurationDays;
      existing.daysCount++;
    }
    workerMap.set(w, existing);
  }

  const workerEfficiency = Array.from(workerMap.entries()).map(([workerName, val]) => ({
    workerName,
    vehiclesCount: val.count,
    partsCount: val.partsCount,
    totalProfitGenerated: val.profit,
    avgDismantleDays: val.daysCount > 0 ? Math.round((val.daysSum / val.daysCount) * 10) / 10 : 2.5,
  })).sort((a, b) => b.totalProfitGenerated - a.totalProfitGenerated);

  return {
    totalVehicles,
    totalCosts,
    totalPurchaseCosts,
    totalTowCosts,
    totalAdditionalCosts,
    totalPartsRevenueSold,
    totalPartsRevenueInStock,
    totalPartsRevenueGross: totalPartsRevenueSold + totalPartsRevenueInStock,
    totalScrapRevenue,
    totalRevenueGross,
    totalRealizedRevenue,
    totalProjectedProfit,
    totalRealizedProfit,
    averageProfitPerVehicle,
    averageRealizedProfitPerVehicle,
    averageMarginPercent,
    averageRoiPercent,
    averageDismantleDays,
    completedDismantlesCount,
    inProgressDismantlesCount,
    waitingDismantlesCount,
    mostProfitableVehicles,
    leastProfitableVehicles,
    brandProfitability,
    workerEfficiency,
  };
}

/**
 * Lifecycle flow definition helper
 */
export const LIFECYCLE_STAGES: Array<{
  key: string;
  label: string;
  short: string;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  description: string;
}> = [
  {
    key: "AUTO",
    label: "Pojazd",
    short: "Auto",
    color: "slate",
    badgeBg: "bg-slate-800/80",
    badgeBorder: "border-slate-700",
    badgeText: "text-slate-200",
    description: "Zgłoszenie / Identyfikacja pojazdu do kasacji lub skupu",
  },
  {
    key: "PRZYJĘCIE",
    label: "Przyjęcie i Wycena",
    short: "Przyjęcie",
    color: "sky",
    badgeBg: "bg-sky-500/15",
    badgeBorder: "border-sky-500/30",
    badgeText: "text-sky-300",
    description: "Wjazd na lawetę / plac, spisanie VIN, wycena AI i weryfikacja podzespołów",
  },
  {
    key: "ZAKUP",
    label: "Zakup i Formalności",
    short: "Zakup",
    color: "indigo",
    badgeBg: "bg-indigo-500/15",
    badgeBorder: "border-indigo-500/30",
    badgeText: "text-indigo-300",
    description: "Umowa K-S / Faktura, opłata lawety, rejestracja w ewidencji stacji",
  },
  {
    key: "DEMONTAŻ",
    label: "Demontaż na Stanowisku",
    short: "Demontaż",
    color: "amber",
    badgeBg: "bg-amber-500/15",
    badgeBorder: "border-amber-500/30",
    badgeText: "text-amber-300",
    description: "Prace demontażysty (Marek / Grzegorz), demontaż wartościowych podzespołów",
  },
  {
    key: "POZYSKANIE_CZĘŚCI",
    label: "Pozyskanie Części",
    short: "Części",
    color: "emerald",
    badgeBg: "bg-emerald-500/15",
    badgeBorder: "border-emerald-500/30",
    badgeText: "text-emerald-300",
    description: "Weryfikacja jakości, odczyt kodów OEM i opis techniczny",
  },
  {
    key: "MAGAZYN_REGAŁ",
    label: "Magazyn & Regał WMS",
    short: "Regał",
    color: "teal",
    badgeBg: "bg-teal-500/15",
    badgeBorder: "border-teal-500/30",
    badgeText: "text-teal-300",
    description: "Przypisanie lokalizacji regałowej (MAG 01-99), oznaczenie markerem",
  },
  {
    key: "WYSTAWIENIE",
    label: "Wystawienie E-commerce",
    short: "Wystawienie",
    color: "blue",
    badgeBg: "bg-blue-500/15",
    badgeBorder: "border-blue-500/30",
    badgeText: "text-blue-300",
    description: "Publikacja na Allegro, Ovoko, OLX i w sklepie ShopGold",
  },
  {
    key: "SPRZEDAŻ",
    label: "Sprzedaż & Pobranie",
    short: "Sprzedaż",
    color: "yellow",
    badgeBg: "bg-yellow-500/15",
    badgeBorder: "border-yellow-500/30",
    badgeText: "text-yellow-300",
    description: "Zamówienie klienta, pobranie z regału magazynowego, pakowanie",
  },
  {
    key: "ZŁOM_BDO",
    label: "Złom BDO & Karoseria",
    short: "Złom BDO",
    color: "purple",
    badgeBg: "bg-purple-500/15",
    badgeBorder: "border-purple-500/30",
    badgeText: "text-purple-300",
    description: "Ważenie karoserii, recykling katalizatora, akumulatora i instalacji BDO",
  },
  {
    key: "ROZLICZENIE_ZYSK",
    label: "Rozliczenie & Zysk",
    short: "Zysk",
    color: "emerald",
    badgeBg: "bg-emerald-500/20",
    badgeBorder: "border-emerald-400",
    badgeText: "text-emerald-400",
    description: "Końcowy bilans: Przychody - Koszty = Rzeczywisty Zysk Netto i ROI %",
  },
];
