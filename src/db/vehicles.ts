import { db } from "./index.ts";
import { vehicles, parts } from "./schema.ts";
import { eq, desc, sql } from "drizzle-orm";

export interface VehicleInput {
  id: string;
  internalNumber: string;
  vin?: string;
  brand: string;
  model: string;
  generation?: string;
  year?: string;
  engineCode?: string;
  engineDisplacement?: string;
  fuelType?: string;
  paintCode?: string;
  mileageKm?: number;
  purchasePricePln?: number;
  towTruckCostPln?: number;
  additionalCostsPln?: number;
  totalCostPln?: number;
  scrapWeightKg?: number;
  scrapRatePerKg?: number;
  scrapEstimatedValuePln?: number;
  catalystValuePln?: number;
  batteryValuePln?: number;
  dismantleStatus?: "waiting" | "in_progress" | "completed" | "scrapped";
  assignedWorkerId?: string;
  assignedWorkerName?: string;
  intakeDate?: string;
  dismantleStartDate?: string;
  dismantleEndDate?: string;
  photos?: string;
  notes?: string;
}

export async function getAllVehiclesFromSql() {
  try {
    return await db.select().from(vehicles).orderBy(desc(vehicles.createdAt));
  } catch (error) {
    console.warn("Could not load vehicles from Cloud SQL (fallback may be used):", error);
    return [];
  }
}

export async function getVehicleByIdFromSql(vehicleId: string) {
  try {
    const res = await db.select().from(vehicles).where(eq(vehicles.id, vehicleId)).limit(1);
    return res[0] || null;
  } catch (error) {
    console.warn(`Could not load vehicle ${vehicleId} from Cloud SQL:`, error);
    return null;
  }
}

export async function upsertVehicleInSql(vehicleData: VehicleInput) {
  try {
    const totalCost =
      (vehicleData.purchasePricePln || 0) +
      (vehicleData.towTruckCostPln || 0) +
      (vehicleData.additionalCostsPln || 0);

    const scrapVal =
      vehicleData.scrapEstimatedValuePln !== undefined
        ? vehicleData.scrapEstimatedValuePln
        : (vehicleData.scrapWeightKg || 0) * (vehicleData.scrapRatePerKg || 0.85);

    const values = {
      id: vehicleData.id,
      internalNumber: vehicleData.internalNumber,
      vin: vehicleData.vin || null,
      brand: vehicleData.brand,
      model: vehicleData.model,
      generation: vehicleData.generation || null,
      year: vehicleData.year ? String(vehicleData.year) : null,
      engineCode: vehicleData.engineCode || null,
      engineDisplacement: vehicleData.engineDisplacement || null,
      fuelType: vehicleData.fuelType || null,
      paintCode: vehicleData.paintCode || null,
      mileageKm: vehicleData.mileageKm || null,
      purchasePricePln: vehicleData.purchasePricePln || 0,
      towTruckCostPln: vehicleData.towTruckCostPln || 0,
      additionalCostsPln: vehicleData.additionalCostsPln || 0,
      totalCostPln: vehicleData.totalCostPln !== undefined ? vehicleData.totalCostPln : totalCost,
      scrapWeightKg: vehicleData.scrapWeightKg || 0,
      scrapRatePerKg: vehicleData.scrapRatePerKg || 0.85,
      scrapEstimatedValuePln: scrapVal,
      catalystValuePln: vehicleData.catalystValuePln || 0,
      batteryValuePln: vehicleData.batteryValuePln || 0,
      dismantleStatus: vehicleData.dismantleStatus || "waiting",
      assignedWorkerId: vehicleData.assignedWorkerId || null,
      assignedWorkerName: vehicleData.assignedWorkerName || null,
      intakeDate: vehicleData.intakeDate || new Date().toISOString().slice(0, 10),
      dismantleStartDate: vehicleData.dismantleStartDate || null,
      dismantleEndDate: vehicleData.dismantleEndDate || null,
      photos: vehicleData.photos || null,
      notes: vehicleData.notes || null,
      updatedAt: new Date(),
    };

    const result = await db
      .insert(vehicles)
      .values(values)
      .onConflictDoUpdate({
        target: vehicles.id,
        set: values,
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Database upsert failed in upsertVehicleInSql:", error);
    throw error;
  }
}

/**
 * Calculates financial flow: KOSZTY → CZĘŚCI → ZŁOM → PRZYCHÓD → ZYSK for a given vehicle
 */
export async function calculateVehicleFinancialFlow(vehicleId: string) {
  try {
    const vehicle = await getVehicleByIdFromSql(vehicleId);
    if (!vehicle) return null;

    // Get parts for this vehicle
    const vehicleParts = await db
      .select()
      .from(parts)
      .where(eq(parts.vehicleId, vehicleId));

    const partsSold = vehicleParts.filter((p) => p.status === "sold");
    const partsInStock = vehicleParts.filter((p) => p.status === "in_stock" || p.status === "dostepny");

    const partsSoldRevenue = partsSold.reduce(
      (acc, p) => acc + (p.soldPrice || p.pricePln || 0),
      0
    );
    const partsInStockValue = partsInStock.reduce(
      (acc, p) => acc + (p.pricePln || 0),
      0
    );

    const scrapRevenue =
      (vehicle.scrapEstimatedValuePln || 0) +
      (vehicle.catalystValuePln || 0) +
      (vehicle.batteryValuePln || 0);

    const realizedRevenue = partsSoldRevenue + (vehicle.dismantleStatus === "scrapped" ? scrapRevenue : 0);
    const projectedTotalRevenue = partsSoldRevenue + partsInStockValue + scrapRevenue;

    const totalCosts = vehicle.totalCostPln || 0;
    const realizedProfit = realizedRevenue - totalCosts;
    const projectedProfit = projectedTotalRevenue - totalCosts;

    return {
      vehicleId,
      internalNumber: vehicle.internalNumber,
      brand: vehicle.brand,
      model: vehicle.model,
      // Flow nodes
      costs: {
        purchase: vehicle.purchasePricePln || 0,
        transport: vehicle.towTruckCostPln || 0,
        additional: vehicle.additionalCostsPln || 0,
        total: totalCosts,
      },
      parts: {
        totalCount: vehicleParts.length,
        soldCount: partsSold.length,
        inStockCount: partsInStock.length,
        soldRevenue: partsSoldRevenue,
        inStockValue: partsInStockValue,
      },
      scrap: {
        weightKg: vehicle.scrapWeightKg || 0,
        ratePerKg: vehicle.scrapRatePerKg || 0.85,
        estimatedValue: vehicle.scrapEstimatedValuePln || 0,
        catalyst: vehicle.catalystValuePln || 0,
        battery: vehicle.batteryValuePln || 0,
        totalScrap: scrapRevenue,
      },
      revenue: {
        realized: realizedRevenue,
        projected: projectedTotalRevenue,
      },
      profit: {
        realizedProfit,
        projectedProfit,
        roiPercentage: totalCosts > 0 ? (projectedProfit / totalCosts) * 100 : 0,
        marginPercentage: projectedTotalRevenue > 0 ? (projectedProfit / projectedTotalRevenue) * 100 : 0,
      },
    };
  } catch (error) {
    console.error("calculateVehicleFinancialFlow error:", error);
    return null;
  }
}
