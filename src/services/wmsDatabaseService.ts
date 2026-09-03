import {
  VehicleDonor,
  VehicleFinancialFlow,
  PartItem,
  PartHistoryLog,
  WmsOrder,
  OrderItemPicking,
  DeadStockReport,
  DeadStockBucket,
  DeadStockAgeRange,
  EmployeePerformance,
  WmsSmartAlert,
} from "../types";

/**
 * Unified WMS 2.0 Database Client Service
 * Bridges Cloud SQL endpoints, Firestore, and client-side reactive state.
 */
export class WmsDatabaseService {
  /**
   * Fetch all vehicles (dawce) from Cloud SQL with graceful fallback
   */
  static async getVehicles(): Promise<VehicleDonor[]> {
    try {
      const res = await fetch("/api/sql/vehicles");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.vehicles)) {
          return json.vehicles.map(this.normalizeVehicleRecord);
        }
      }
    } catch (err) {
      console.warn("WmsDatabaseService.getVehicles network warning:", err);
    }
    // Fallback: LocalStorage cache
    return this.getLocalVehicles();
  }

  /**
   * Upsert a vehicle (karta pojazdu)
   */
  static async saveVehicle(vehicle: Partial<VehicleDonor> & { id: string; internalNumber: string; brand: string }): Promise<VehicleDonor> {
    const totalCost = (vehicle.purchasePrice || 0) + (vehicle.transportCost || 0) + (vehicle.additionalCosts || 0);
    const scrapVal = vehicle.scrapValue !== undefined ? vehicle.scrapValue : (vehicle.scrapWeightKg || 0) * (vehicle.scrapPricePerKg || 0.85);

    const fullVehicle: VehicleDonor = {
      id: vehicle.id,
      internalNumber: vehicle.internalNumber,
      vin: vehicle.vin || "",
      brand: vehicle.brand,
      model: vehicle.model || "",
      generation: vehicle.generation || "",
      year: vehicle.year || new Date().getFullYear(),
      engineCode: vehicle.engineCode || "",
      engineDisplacement: vehicle.engineDisplacement || "",
      fuelType: vehicle.fuelType || "Diesel",
      paintCode: vehicle.paintCode || "",
      mileageKm: vehicle.mileageKm || 0,
      purchasePrice: vehicle.purchasePrice || 0,
      transportCost: vehicle.transportCost || 0,
      additionalCosts: vehicle.additionalCosts || 0,
      totalCost,
      assignedMechanicId: vehicle.assignedMechanicId || "",
      assignedMechanicName: vehicle.assignedMechanicName || "Jan Kowalski",
      receivedAt: vehicle.receivedAt || new Date().toISOString().slice(0, 10),
      dismantleStatus: vehicle.dismantleStatus || "waiting",
      scrapWeightKg: vehicle.scrapWeightKg || 0,
      scrapPricePerKg: vehicle.scrapPricePerKg || 0.85,
      scrapValue: scrapVal,
      catalystValue: vehicle.catalystValue || 0,
      batteryValue: vehicle.batteryValue || 0,
      harvestedPartIds: vehicle.harvestedPartIds || [],
      partsCountTotal: vehicle.partsCountTotal || 0,
      partsCountSold: vehicle.partsCountSold || 0,
      partsCountInStock: vehicle.partsCountInStock || 0,
      partsSoldGross: vehicle.partsSoldGross || 0,
      partsInStockGross: vehicle.partsInStockGross || 0,
      totalRevenue: vehicle.totalRevenue || 0,
      realizedProfit: vehicle.realizedProfit || 0,
      projectedProfit: vehicle.projectedProfit || 0,
      marginPercentage: vehicle.marginPercentage || 0,
      roiPercentage: vehicle.roiPercentage || 0,
      photos: vehicle.photos || [],
      notes: vehicle.notes || "",
      createdAt: vehicle.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to Cloud SQL
    try {
      await fetch("/api/sql/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...fullVehicle,
          purchasePricePln: fullVehicle.purchasePrice,
          towTruckCostPln: fullVehicle.transportCost,
          additionalCostsPln: fullVehicle.additionalCosts,
          totalCostPln: fullVehicle.totalCost,
          scrapEstimatedValuePln: fullVehicle.scrapValue,
          photos: JSON.stringify(fullVehicle.photos),
        }),
      });
    } catch (e) {
      console.warn("Could not save vehicle to Cloud SQL:", e);
    }

    // Save to local cache
    const current = this.getLocalVehicles();
    const idx = current.findIndex((v) => v.id === fullVehicle.id);
    if (idx >= 0) {
      current[idx] = fullVehicle;
    } else {
      current.unshift(fullVehicle);
    }
    localStorage.setItem("ukonesera_wms_vehicles", JSON.stringify(current));

    return fullVehicle;
  }

  /**
   * Calculate complete financial flow: KOSZTY → CZĘŚCI → ZŁOM → PRZYCHÓD → ZYSK
   */
  static computeVehicleFinancialFlow(vehicle: VehicleDonor, vehicleParts: PartItem[]): VehicleFinancialFlow {
    const totalCosts = (vehicle.purchasePrice || 0) + (vehicle.transportCost || 0) + (vehicle.additionalCosts || 0);
    
    const partsSold = vehicleParts.filter((p) => (p.status as string) === "Sprzedany" || (p.status as string) === "sold");
    const partsInStock = vehicleParts.filter((p) => (p.status as string) === "Dostępny" || (p.status as string) === "in_stock");

    const partsSoldRevenue = partsSold.reduce((acc, p) => acc + (p.soldPrice || p.listingData?.cena?.brutto || 0), 0);
    const partsInStockValue = partsInStock.reduce((acc, p) => acc + (p.listingData?.cena?.brutto || 0), 0);

    const scrapValue = (vehicle.scrapWeightKg || 0) * (vehicle.scrapPricePerKg || 0.85);
    const catalyst = vehicle.catalystValue || 0;
    const battery = vehicle.batteryValue || 0;
    const totalScrap = scrapValue + catalyst + battery;

    const realizedRevenue = partsSoldRevenue + (vehicle.dismantleStatus === "scrapped" ? totalScrap : 0);
    const projectedTotalRevenue = partsSoldRevenue + partsInStockValue + totalScrap;

    const realizedNet = realizedRevenue - totalCosts;
    const projectedNet = projectedTotalRevenue - totalCosts;

    return {
      costs: {
        purchase: vehicle.purchasePrice || 0,
        transport: vehicle.transportCost || 0,
        additional: vehicle.additionalCosts || 0,
        total: totalCosts,
      },
      parts: {
        countTotal: vehicleParts.length,
        countSold: partsSold.length,
        countInStock: partsInStock.length,
        revenueSold: partsSoldRevenue,
        valueInStock: partsInStockValue,
      },
      scrap: {
        weightKg: vehicle.scrapWeightKg || 0,
        ratePerKg: vehicle.scrapPricePerKg || 0.85,
        estimatedValue: scrapValue,
        totalScrapValue: totalScrap,
      },
      revenue: {
        realized: realizedRevenue,
        projected: projectedTotalRevenue,
      },
      profit: {
        realizedNet,
        projectedNet,
        roiPercent: totalCosts > 0 ? (projectedNet / totalCosts) * 100 : 0,
        marginPercent: projectedTotalRevenue > 0 ? (projectedNet / projectedTotalRevenue) * 100 : 0,
      },
    };
  }

  /**
   * Dead Stock Report Generation (0–30, 31–90, 91–180, 181–365, 365+ days)
   */
  static calculateDeadStockReport(parts: PartItem[]): DeadStockReport {
    const inStock = parts.filter(
      (p) => (p.status as string) === "Dostępny" || (p.status as string) === "in_stock"
    );
    const now = Date.now();

    const buckets: Record<DeadStockAgeRange, DeadStockBucket> = {
      "0-30": { rangeKey: "0-30", rangeLabel: "0–30 dni", partsCount: 0, totalMarketValuePln: 0, totalCostBasisPln: 0, parts: [] },
      "31-90": { rangeKey: "31-90", rangeLabel: "31–90 dni", partsCount: 0, totalMarketValuePln: 0, totalCostBasisPln: 0, parts: [] },
      "91-180": { rangeKey: "91-180", rangeLabel: "91–180 dni", partsCount: 0, totalMarketValuePln: 0, totalCostBasisPln: 0, parts: [] },
      "181-365": { rangeKey: "181-365", rangeLabel: "181–365 dni", partsCount: 0, totalMarketValuePln: 0, totalCostBasisPln: 0, parts: [] },
      "365+": { rangeKey: "365+", rangeLabel: "365+ dni", partsCount: 0, totalMarketValuePln: 0, totalCostBasisPln: 0, parts: [] },
    };

    let totalInventoryValue = 0;

    for (const part of inStock) {
      const createdTime = part.createdAt ? new Date(part.createdAt).getTime() : now;
      const days = Math.max(0, Math.floor((now - createdTime) / (1000 * 60 * 60 * 24)));
      const priceGross = part.listingData?.cena?.brutto || part.salePriceGross || 0;
      const costBasis = part.allocatedCostBasis || 0;

      totalInventoryValue += priceGross;

      let key: DeadStockAgeRange = "0-30";
      if (days > 365) key = "365+";
      else if (days > 180) key = "181-365";
      else if (days > 90) key = "91-180";
      else if (days > 30) key = "31-90";

      const title =
        part.listingData?.auctionTemplates?.allegroTitle ||
        part.listingData?.kategoria ||
        part.listingData?.opis ||
        "Część samochodowa";

      buckets[key].partsCount += 1;
      buckets[key].totalMarketValuePln += priceGross;
      buckets[key].totalCostBasisPln += costBasis;
      buckets[key].parts.push({
        id: part.id,
        name: title,
        oem: part.listingData?.numery_czesci,
        rackLocation: part.currentRackLocation || "BRAK REGAŁU",
        daysInWarehouse: days,
        priceGross,
        costBasis,
      });
    }

    const deadStockValue =
      buckets["91-180"].totalMarketValuePln +
      buckets["181-365"].totalMarketValuePln +
      buckets["365+"].totalMarketValuePln;

    return {
      totalInventoryCount: inStock.length,
      totalInventoryValuePln: totalInventoryValue,
      deadStockValuePln: deadStockValue,
      buckets,
    };
  }

  /**
   * Intelligent WMS Alerts Engine (with domain rules for auto parts dismantling)
   */
  static generateSmartAlerts(parts: PartItem[], orders: WmsOrder[] = []): WmsSmartAlert[] {
    const alerts: WmsSmartAlert[] = [];
    const now = Date.now();

    // Rule 1: Parts in stock with NO rack location assigned
    const unlocatedParts = parts.filter(
      (p) =>
        ((p.status as string) === "Dostępny" || (p.status as string) === "in_stock") &&
        (!p.currentRackLocation || p.currentRackLocation.trim() === "")
    );
    if (unlocatedParts.length > 0) {
      alerts.push({
        id: "alert-unlocated-parts",
        type: "missing_rack",
        severity: "warning",
        title: `${unlocatedParts.length} części bez przypisanego regału`,
        message: `Części przyjęte do magazynu, ale brak fizycznej lokalizacji na regale (np. ${unlocatedParts
          .slice(0, 3)
          .map((p) => p.listingData?.kategoria || p.listingData?.opis || p.id)
          .join(", ")})`,
        suggestedAction: "Przypisz lokalizację regałową w Magazynie",
        actionTab: "magazyn",
        createdAt: new Date().toISOString(),
      });
    }

    // Rule 2: Dead Stock (>180 days)
    const deadStockParts = parts.filter((p) => {
      const isAvailable = (p.status as string) === "Dostępny" || (p.status as string) === "in_stock";
      if (!isAvailable) return false;
      const days = Math.floor((now - new Date(p.createdAt || now).getTime()) / (1000 * 60 * 60 * 24));
      return days > 180;
    });
    if (deadStockParts.length > 0) {
      const deadValue = deadStockParts.reduce((acc, p) => acc + (p.listingData?.cena?.brutto || 0), 0);
      alerts.push({
        id: "alert-dead-stock",
        type: "dead_stock",
        severity: "warning",
        title: `Martwy magazyn: ${deadStockParts.length} pozycji leży >180 dni`,
        message: `Zamrożony kapitał o wartości ${deadValue.toLocaleString()} PLN. Rozważ obniżkę ceny lub przecenę na Allegro/ShopGold.`,
        suggestedAction: "Przejdź do analizy wieku magazynu",
        actionTab: "magazyn",
        createdAt: new Date().toISOString(),
      });
    }

    // Rule 3: Parts in stock but NOT listed on any sales channel
    const unlistedParts = parts.filter((p) => {
      const isAvailable = (p.status as string) === "Dostępny" || (p.status as string) === "in_stock";
      if (!isAvailable) return false;
      const hasAllegro = Boolean(p.allegroOfferId || p.isListedAllegro);
      const hasShopGold = Boolean(p.isListedShopGold);
      const hasBaseLinker = Boolean(p.isListedBaseLinker);
      return !hasAllegro && !hasShopGold && !hasBaseLinker;
    });
    if (unlistedParts.length > 0) {
      alerts.push({
        id: "alert-unlisted-parts",
        type: "unlisted_part",
        severity: "info",
        title: `${unlistedParts.length} części zmagazynowanych bez aktywnej oferty`,
        message: `Części są fizycznie na regałach, ale nie zostały jeszcze wystawione na Allegro ani w ShopGold.`,
        suggestedAction: "Wystaw oferty przez moduł Allegro / ShopGold",
        actionTab: "allegro",
        createdAt: new Date().toISOString(),
      });
    }

    // Rule 4: Pending orders awaiting picking
    const pendingPicking = orders.filter((o) => o.pickingStatus === "pending" || o.pickingStatus === "in_picking");
    if (pendingPicking.length > 0) {
      alerts.push({
        id: "alert-pending-picking",
        type: "sync_conflict",
        severity: "critical",
        title: `${pendingPicking.length} zamówień oczekuje na skompletowanie (picking)`,
        message: `Klienci opłacili zamówienia — magazynier musi pobrać części z regałów i przekazać do pakowania.`,
        suggestedAction: "Otwórz terminal kompletacji zamówień",
        actionTab: "magazyn",
        createdAt: new Date().toISOString(),
      });
    }

    return alerts;
  }

  /**
   * Log part lifecycle audit trail
   */
  static async logPartLifecycleAction(entry: {
    partId: string;
    action: string;
    details: string;
    userName?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await fetch("/api/sql/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partId: entry.partId,
          action: entry.action,
          details: entry.details,
          userName: entry.userName || "Użytkownik WMS",
          metadata: entry.metadata || {},
        }),
      });
    } catch (e) {
      console.warn("Could not record part history log to Cloud SQL:", e);
    }
  }

  // LocalStorage Helpers
  private static getLocalVehicles(): VehicleDonor[] {
    try {
      const data = localStorage.getItem("ukonesera_wms_vehicles");
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn("Failed to read local vehicles:", e);
    }
    return [];
  }

  private static normalizeVehicleRecord(raw: any): VehicleDonor {
    return {
      id: raw.id,
      internalNumber: raw.internalNumber || raw.internal_number || raw.id,
      vin: raw.vin || "",
      brand: raw.brand || "Inna",
      model: raw.model || "",
      generation: raw.generation || "",
      year: raw.year || "",
      engineCode: raw.engineCode || raw.engine_code || "",
      engineDisplacement: raw.engineDisplacement || raw.engine_displacement || "",
      fuelType: raw.fuelType || raw.fuel_type || "Diesel",
      paintCode: raw.paintCode || raw.paint_code || "",
      mileageKm: raw.mileageKm || raw.mileage_km || 0,
      purchasePrice: raw.purchasePricePln || raw.purchase_price_pln || 0,
      transportCost: raw.towTruckCostPln || raw.tow_truck_cost_pln || 0,
      additionalCosts: raw.additionalCostsPln || raw.additional_costs_pln || 0,
      totalCost: raw.totalCostPln || raw.total_cost_pln || 0,
      assignedMechanicId: raw.assignedWorkerId || raw.assigned_worker_id || "",
      assignedMechanicName: raw.assignedWorkerName || raw.assigned_worker_name || "Pracownik Stacji",
      receivedAt: raw.intakeDate || raw.intake_date || new Date().toISOString().slice(0, 10),
      dismantleStatus: raw.dismantleStatus || raw.dismantle_status || "waiting",
      scrapWeightKg: raw.scrapWeightKg || raw.scrap_weight_kg || 0,
      scrapPricePerKg: raw.scrapRatePerKg || raw.scrap_rate_per_kg || 0.85,
      scrapValue: raw.scrapEstimatedValuePln || raw.scrap_estimated_value_pln || 0,
      catalystValue: raw.catalystValuePln || raw.catalyst_value_pln || 0,
      batteryValue: raw.batteryValuePln || raw.battery_value_pln || 0,
      harvestedPartIds: [],
      partsCountTotal: 0,
      partsCountSold: 0,
      partsCountInStock: 0,
      partsSoldGross: 0,
      partsInStockGross: 0,
      totalRevenue: 0,
      realizedProfit: 0,
      projectedProfit: 0,
      marginPercentage: 0,
      roiPercentage: 0,
      photos: raw.photos ? (typeof raw.photos === "string" ? JSON.parse(raw.photos) : raw.photos) : [],
      notes: raw.notes || "",
      createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
      updatedAt: raw.updatedAt || raw.updated_at || new Date().toISOString(),
    };
  }
}
