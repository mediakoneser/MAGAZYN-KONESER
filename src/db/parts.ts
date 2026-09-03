import { db } from "./index.ts";
import { parts, externalCatalogQueries } from "./schema.ts";
import { eq, desc } from "drizzle-orm";

export interface PartInput {
  id: string;
  sku: string;
  barcode?: string;
  qrCode?: string;
  name: string;
  brand: string;
  model?: string;
  year?: string;
  oemNumber?: string;
  alternativeOems?: string;
  compatibilityList?: string;
  vin?: string;
  rack?: string;
  shelf?: string;
  pricePln?: number;
  salePriceNet?: number;
  salePriceGross?: number;
  soldPrice?: number;
  allocatedCostBasis?: number;
  status?: string;
  category?: string;
  condition?: string;
  description?: string;
  photos?: string;
  userId?: number;
  vehicleId?: string;
  isListedAllegro?: boolean;
  isListedShopGold?: boolean;
  isListedBaseLinker?: boolean;
  allegroOfferId?: string;
  shopGoldProductId?: string;
  daysInWarehouse?: number;
  ageGroup?: string;
  dismantledByWorker?: string;
  dismantledAt?: string;
  pickedByWorker?: string;
  pickedAt?: string;
  reservedAt?: string;
  reservedBy?: string;
  soldAt?: string;
  soldTo?: string;
  drivePdfUrl?: string;
  driveFileId?: string;
  driveFolder?: string;
}

export async function getAllPartsFromSql() {
  try {
    return await db.select().from(parts).orderBy(desc(parts.createdAt));
  } catch (error) {
    console.error("Database query failed in getAllPartsFromSql:", error);
    throw new Error("Failed to load inventory from PostgreSQL.", { cause: error });
  }
}

export async function upsertPartInSql(partData: PartInput) {
  try {
    const values = {
      id: partData.id,
      sku: partData.sku,
      barcode: partData.barcode || null,
      qrCode: partData.qrCode || null,
      name: partData.name,
      brand: partData.brand,
      model: partData.model || null,
      year: partData.year || null,
      oemNumber: partData.oemNumber || null,
      alternativeOems: partData.alternativeOems || null,
      compatibilityList: partData.compatibilityList || null,
      vin: partData.vin || null,
      rack: partData.rack || null,
      shelf: partData.shelf || null,
      pricePln: partData.pricePln || 0,
      salePriceNet: partData.salePriceNet || null,
      salePriceGross: partData.salePriceGross || partData.pricePln || 0,
      soldPrice: partData.soldPrice || null,
      allocatedCostBasis: partData.allocatedCostBasis || 0,
      status: partData.status || "in_stock",
      category: partData.category || null,
      condition: partData.condition || null,
      description: partData.description || null,
      photos: partData.photos || null,
      userId: partData.userId || null,
      vehicleId: partData.vehicleId || null,
      isListedAllegro: Boolean(partData.isListedAllegro),
      isListedShopGold: Boolean(partData.isListedShopGold),
      isListedBaseLinker: Boolean(partData.isListedBaseLinker),
      allegroOfferId: partData.allegroOfferId || null,
      shopGoldProductId: partData.shopGoldProductId || null,
      daysInWarehouse: partData.daysInWarehouse || 0,
      ageGroup: partData.ageGroup || "0-30",
      dismantledByWorker: partData.dismantledByWorker || null,
      dismantledAt: partData.dismantledAt || null,
      pickedByWorker: partData.pickedByWorker || null,
      pickedAt: partData.pickedAt || null,
      reservedAt: partData.reservedAt || null,
      reservedBy: partData.reservedBy || null,
      soldAt: partData.soldAt || null,
      soldTo: partData.soldTo || null,
      drivePdfUrl: partData.drivePdfUrl || null,
      driveFileId: partData.driveFileId || null,
      driveFolder: partData.driveFolder || null,
      updatedAt: new Date(),
    };

    const result = await db
      .insert(parts)
      .values(values)
      .onConflictDoUpdate({
        target: parts.id,
        set: values,
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Database query failed in upsertPartInSql:", error);
    throw new Error("Failed to save part in PostgreSQL.", { cause: error });
  }
}

/**
 * Dead Stock Analysis: groups inventory parts into:
 * 0–30 dni, 31–90 dni, 91–180 dni, 181–365 dni, 365+ dni
 */
export async function getDeadStockAnalysisFromSql() {
  try {
    const allParts = await getAllPartsFromSql();
    const inStock = allParts.filter((p) => p.status === "in_stock" || p.status === "dostepny");

    const now = Date.now();
    const buckets = {
      "0-30": { range: "0–30 dni", count: 0, totalValue: 0, totalCostBasis: 0, parts: [] as any[] },
      "31-90": { range: "31–90 dni", count: 0, totalValue: 0, totalCostBasis: 0, parts: [] as any[] },
      "91-180": { range: "91–180 dni", count: 0, totalValue: 0, totalCostBasis: 0, parts: [] as any[] },
      "181-365": { range: "181–365 dni", count: 0, totalValue: 0, totalCostBasis: 0, parts: [] as any[] },
      "365+": { range: "365+ dni", count: 0, totalValue: 0, totalCostBasis: 0, parts: [] as any[] },
    };

    for (const part of inStock) {
      const createdTime = part.createdAt ? new Date(part.createdAt).getTime() : now;
      const days = Math.max(0, Math.floor((now - createdTime) / (1000 * 60 * 60 * 24)));
      const value = part.pricePln || part.salePriceGross || 0;
      const cost = part.allocatedCostBasis || 0;

      let key: keyof typeof buckets = "0-30";
      if (days > 365) key = "365+";
      else if (days > 180) key = "181-365";
      else if (days > 90) key = "91-180";
      else if (days > 30) key = "31-90";

      buckets[key].count += 1;
      buckets[key].totalValue += value;
      buckets[key].totalCostBasis += cost;
      buckets[key].parts.push({
        id: part.id,
        name: part.name,
        oem: part.oemNumber,
        rack: part.rack,
        days,
        pricePln: value,
        costBasis: cost,
      });
    }

    const totalDeadStockValue =
      buckets["91-180"].totalValue + buckets["181-365"].totalValue + buckets["365+"].totalValue;

    return {
      success: true,
      totalInStockCount: inStock.length,
      totalDeadStockValue,
      buckets,
    };
  } catch (error: any) {
    console.warn("Dead stock calculation error:", error?.message);
    return {
      success: false,
      error: error?.message,
      buckets: {},
      totalDeadStockValue: 0,
    };
  }
}

export async function saveCatalogQueryCache(
  queryType: string,
  queryValue: string,
  source: string,
  resultData: any
) {
  try {
    await db.insert(externalCatalogQueries).values({
      queryType,
      queryValue,
      source,
      resultData: JSON.stringify(resultData),
    });
  } catch (error) {
    console.warn("Failed to cache external catalog query:", error);
  }
}

export async function getCachedCatalogQuery(queryType: string, queryValue: string) {
  try {
    const records = await db
      .select()
      .from(externalCatalogQueries)
      .where(eq(externalCatalogQueries.queryValue, queryValue))
      .orderBy(desc(externalCatalogQueries.createdAt))
      .limit(1);

    if (records.length > 0) {
      return JSON.parse(records[0].resultData);
    }
    return null;
  } catch (error) {
    console.warn("Failed to retrieve cached catalog query:", error);
    return null;
  }
}
