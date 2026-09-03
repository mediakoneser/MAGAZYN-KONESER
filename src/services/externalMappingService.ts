/**
 * ExternalMapping Service — Business OS v1
 * 
 * Rules:
 * 1. Maintain strict separation between Master Product, Allegro Offer ID,
 *    Allegro Product ID, Operation UUID, Ovoko ID, and ShopGold ID.
 * 2. Eliminate ID ambiguity across all sales channels.
 */

import { ExternalMapping, ExternalSystem, ExternalMappingStatus } from "../types/businessCore";
import { PartItem } from "../types";

const MAPPINGS_STORAGE_KEY = "business_os_external_mappings_v1";

class ExternalMappingService {
  private mappings: Map<string, ExternalMapping> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(MAPPINGS_STORAGE_KEY);
      if (stored) {
        const parsed: ExternalMapping[] = JSON.parse(stored);
        parsed.forEach((m) => {
          this.mappings.set(m.id, m);
        });
      }
    } catch (e) {
      console.warn("Could not load external mappings from storage:", e);
    }
  }

  private persist() {
    try {
      const list = Array.from(this.mappings.values());
      localStorage.setItem(MAPPINGS_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn("Could not persist external mappings:", e);
    }
  }

  public getAll(): ExternalMapping[] {
    return Array.from(this.mappings.values());
  }

  public getByMasterId(masterProductId: string): ExternalMapping[] {
    return this.getAll().filter((m) => m.masterProductId === masterProductId);
  }

  public getBySystem(system: ExternalSystem): ExternalMapping[] {
    return this.getAll().filter((m) => m.system === system);
  }

  public findByExternalId(system: ExternalSystem, externalId: string): ExternalMapping | undefined {
    return this.getAll().find((m) => m.system === system && m.externalId === externalId);
  }

  public setMapping(params: {
    masterProductId: string;
    masterSku: string;
    system: ExternalSystem;
    externalId: string;
    secondaryId?: string;
    status: ExternalMappingStatus;
    externalPrice?: number;
    externalStock?: number;
    externalUrl?: string;
    errorMessage?: string;
    metadata?: Record<string, any>;
  }): ExternalMapping {
    const id = `${params.masterProductId}_${params.system}`;
    const existing = this.mappings.get(id);

    const updated: ExternalMapping = {
      id,
      masterProductId: params.masterProductId,
      masterSku: params.masterSku,
      system: params.system,
      externalId: params.externalId,
      secondaryId: params.secondaryId || existing?.secondaryId,
      status: params.status,
      externalPrice: params.externalPrice ?? existing?.externalPrice,
      externalStock: params.externalStock ?? existing?.externalStock,
      externalUrl: params.externalUrl || existing?.externalUrl,
      lastSyncAt: new Date().toISOString(),
      lastVerifiedAt: new Date().toISOString(),
      errorMessage: params.errorMessage,
      metadata: { ...(existing?.metadata || {}), ...(params.metadata || {}) },
    };

    this.mappings.set(id, updated);
    this.persist();
    return updated;
  }

  public removeMapping(masterProductId: string, system: ExternalSystem): boolean {
    const id = `${masterProductId}_${system}`;
    const res = this.mappings.delete(id);
    if (res) this.persist();
    return res;
  }

  /**
   * Initializes or refreshes mappings from current PartItem repository
   */
  public syncFromParts(parts: PartItem[]) {
    parts.forEach((part) => {
      const sku = part.barcode || part.id;
      const listing = part.listingData;

      // 1. Allegro mapping
      if (listing?.allegro?.offerId || part.allegroOfferId) {
        const offerId = listing?.allegro?.offerId || part.allegroOfferId || "";
        const statusStr = listing?.allegro?.status || part.allegroStatus || "draft";
        const statusMap: Record<string, ExternalMappingStatus> = {
          active: "ACTIVE",
          draft: "DRAFT",
          ended: "NONE",
          error: "ERROR",
          validating: "SYNCING",
        };

        this.setMapping({
          masterProductId: part.id,
          masterSku: sku,
          system: "allegro",
          externalId: offerId,
          secondaryId: listing?.allegro?.categoryId,
          status: statusMap[statusStr] || "DRAFT",
          externalPrice: listing?.cena?.brutto,
          externalStock: listing?.stan_magazynowy ?? 1,
          externalUrl: listing?.allegro?.offerUrl || part.allegroOfferUrl,
          errorMessage: listing?.allegro?.errorMessage,
          metadata: {
            signature: listing?.allegro?.signature || part.currentRackLocation,
            publishedAt: listing?.allegro?.publishedAt,
          },
        });
      }

      // 2. Ovoko mapping
      const ovokoPlatform = listing?.publishedPlatforms?.find((p) => p.platform.includes("Ovoko"));
      if (ovokoPlatform) {
        this.setMapping({
          masterProductId: part.id,
          masterSku: sku,
          system: "ovoko",
          externalId: ovokoPlatform.offerId || `OV-${part.id.substring(0, 8)}`,
          status: ovokoPlatform.status === "Aktywna" ? "ACTIVE" : "DRAFT",
          externalPrice: ovokoPlatform.pricePln || listing?.cena?.brutto,
          externalStock: listing?.stan_magazynowy ?? 1,
          externalUrl: ovokoPlatform.url,
        });
      }

      // 3. ShopGold mapping
      const shopGoldPlatform = listing?.publishedPlatforms?.find((p) => p.platform.includes("ShopGold"));
      if (shopGoldPlatform) {
        this.setMapping({
          masterProductId: part.id,
          masterSku: sku,
          system: "shopgold",
          externalId: shopGoldPlatform.offerId || `SG-${part.id.substring(0, 8)}`,
          status: shopGoldPlatform.status === "Aktywna" ? "ACTIVE" : "DRAFT",
          externalPrice: shopGoldPlatform.pricePln || listing?.cena?.brutto,
          externalStock: listing?.stan_magazynowy ?? 1,
          externalUrl: shopGoldPlatform.url,
        });
      }
    });
  }
}

export const externalMappingService = new ExternalMappingService();
