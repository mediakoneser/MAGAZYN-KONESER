import {
  CanonicalProduct,
  SyncJob,
  IntegrationLog,
  BaseLinkerConfig,
  ShopGoldConfig,
} from "../types/canonicalProduct";
import { PartItem, AllegroConfig } from "../types";
import { validateCanonicalProduct } from "./productValidator";
import { buildAllegroOfferPayload } from "./allegroOfferBuilder";
import { getStoredAllegroConfig } from "../utils/allegroService";
import { exportPartsToAllegroCsv, AllegroCsvRow } from "../utils/allegroCsvHandler";

const LOGS_STORAGE_KEY = "ukonesera_integration_logs_v1";
const BASELINKER_STORAGE_KEY = "ukonesera_baselinker_config_v1";
const SHOPGOLD_STORAGE_KEY = "ukonesera_shopgold_config_v1";

/**
 * Converts a PartItem (WMS format) to CanonicalProduct
 */
export function partItemToCanonicalProduct(part: PartItem): CanonicalProduct {
  const listing = part.listingData || ({} as any);
  const brand = listing.samochod?.marka || listing.marka || listing.producent || "Oryginał OE";
  const oem = listing.numery_czesci || listing.producent || "";
  const rack = part.currentRackLocation || listing.ocr_wyniki?.numer_magazynowy || "MAG 14";
  const rawPrice = Number(listing.cena?.brutto) || 90;
  const netPrice = Math.round(rawPrice / 1.23);
  const title = (
    listing.auctionTemplates?.allegroTitle ||
    listing.tytul ||
    `${listing.kategoria} ${brand} ${listing.samochod?.model || listing.model || ""}`
  ).trim();

  const gtin = listing.allegro?.ean || (listing.parameters?.["gtin"] as string) || "";

  const canonical: CanonicalProduct = {
    id: part.id,
    sku: part.barcode || `SKU-${part.id}`,
    gtin: String(gtin),
    mpn: oem,
    name: title.slice(0, 75),
    brand,
    category_name: listing.kategoria || "Motoryzacja > Części samochodowe",
    category_id: listing.allegro?.categoryId || "50849",
    category_path: ["Motoryzacja", "Części samochodowe", listing.kategoria || "Inne"],
    price_gross: rawPrice,
    price_net: netPrice,
    vat_rate: 23,
    stock: Math.max(1, part.ilosc || listing.ilosc || 1),
    description_raw: listing.opis || "Oryginalna część z demontażu pojazdu w stacji PHU U Konesera w Mysłakowicach.",
    description_html: listing.auctionTemplates?.allegroDescriptionHtml || `<p>${listing.opis || ""}</p>`,
    images: listing.zdjecia && listing.zdjecia.length > 0 ? listing.zdjecia : [],
    parameters: {
      "stan": listing.jakosc || "Używany",
      "producent": brand,
      "numery_czesci": oem,
      "strona_zabudowy": listing.pozycja_czesci || "",
      "numer_magazynowy": rack,
    },
    location_rack: rack,
    ai_cocreated: true,
    status: part.allegroOfferId ? "published" : "draft",
    marketplace_status: {
      allegro: {
        offer_id: part.allegroOfferId || listing.allegro?.offerId,
        status: part.allegroStatus || (part.allegroOfferId ? "active" : "draft"),
        offer_url: part.allegroOfferUrl || listing.allegro?.offerUrl,
        last_sync: part.allegroPublishedAt || listing.allegro?.lastSyncAt,
      },
      baselinker: {
        status: "pending",
      },
      shopgold: {
        status: "pending",
      },
    },
    created_at: part.createdAt || new Date().toISOString(),
    updated_at: part.updatedAt || new Date().toISOString(),
  };

  canonical.validation = validateCanonicalProduct(canonical);
  return canonical;
}

/**
 * Converts CanonicalProduct back to PartItem
 */
export function canonicalProductToPartItem(prod: CanonicalProduct): PartItem {
  const rack = prod.location_rack || (prod.parameters?.["numer_magazynowy"] as string) || "MAG 14";

  return {
    id: prod.id,
    barcode: prod.sku,
    currentRackLocation: rack,
    status: prod.status === "published" ? "Dostępny" : "W przygotowaniu",
    ilosc: prod.stock,
    createdAt: prod.created_at,
    updatedAt: new Date().toISOString(),
    allegroOfferId: prod.marketplace_status.allegro?.offer_id,
    allegroOfferUrl: prod.marketplace_status.allegro?.offer_url,
    allegroStatus: prod.marketplace_status.allegro?.status || (prod.status === "published" ? "active" : "draft"),
    allegroPublishedAt: prod.marketplace_status.allegro?.last_sync,
    listingData: {
      kategoria: prod.category_name,
      marka: prod.brand,
      opis: prod.description_raw,
      producent: prod.brand,
      numery_czesci: prod.mpn,
      cena: {
        brutto: prod.price_gross,
        netto: prod.price_net,
      },
      ocr_wyniki: {
        numer_magazynowy: rack,
        napisy_markerem: prod.mpn || prod.brand,
      },
      zdjecia: prod.images,
      ilosc: prod.stock,
      stan_magazynowy: prod.stock,
      allegro: {
        offerId: prod.marketplace_status.allegro?.offer_id,
        offerUrl: prod.marketplace_status.allegro?.offer_url,
        status: prod.marketplace_status.allegro?.status || "draft",
        publishedAt: prod.marketplace_status.allegro?.last_sync,
        price: prod.price_gross,
        categoryId: prod.category_id,
        categoryName: prod.category_name,
        ean: prod.gtin,
        signature: rack,
      },
    },
  };
}

/**
 * Loads and saves persistent integration audit logs
 */
export function getStoredIntegrationLogs(): IntegrationLog[] {
  try {
    const raw = localStorage.getItem(LOGS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}

  return [
    {
      id: "log_init_1",
      timestamp: new Date().toLocaleString("pl-PL"),
      channel: "System",
      action: "Inicjalizacja Centrum Integracji",
      status: "info",
      itemsCount: 1,
      successCount: 1,
      errorCount: 0,
      details: "Silnik marketplace (Allegro REST API, BaseLinker, shopGold, CSV) jest gotowy do pracy.",
    },
  ];
}

export function saveStoredIntegrationLog(log: Omit<IntegrationLog, "id" | "timestamp">): IntegrationLog {
  const newLog: IntegrationLog = {
    ...log,
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toLocaleString("pl-PL"),
  };

  try {
    const existing = getStoredIntegrationLogs();
    const updated = [newLog, ...existing].slice(0, 100); // keep last 100 logs
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {}

  return newLog;
}

export function clearStoredIntegrationLogs(): void {
  try {
    localStorage.removeItem(LOGS_STORAGE_KEY);
  } catch (e) {}
}

/**
 * BaseLinker and shopGold config persistence
 */
export function getStoredBaseLinkerConfig(): BaseLinkerConfig {
  try {
    const raw = localStorage.getItem(BASELINKER_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {
    apiKey: "",
    inventoryId: "main_koneser",
    autoSyncStock: true,
    autoSyncPrices: true,
    isConnected: false,
  };
}

export function saveStoredBaseLinkerConfig(config: BaseLinkerConfig): void {
  try {
    localStorage.setItem(BASELINKER_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {}
}

export function getStoredShopGoldConfig(): ShopGoldConfig {
  try {
    const raw = localStorage.getItem(SHOPGOLD_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {
    apiUrl: "https://sklep.ukonesera.pl/api/v1",
    apiKey: "",
    storeName: "PHU U Konesera - Sklep Części",
    autoSyncStock: true,
    autoSyncPrices: true,
    isConnected: false,
  };
}

export function saveStoredShopGoldConfig(config: ShopGoldConfig): void {
  try {
    localStorage.setItem(SHOPGOLD_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {}
}

/**
 * Executes a Bulk Publishing Job to Allegro REST API
 */
export async function executeAllegroPublishJob(
  products: CanonicalProduct[],
  allegroConfig: AllegroConfig,
  onProgress?: (job: SyncJob) => void
): Promise<{ updatedProducts: CanonicalProduct[]; job: SyncJob }> {
  const jobId = `JOB-ALLEGRO-${Date.now()}`;
  const job: SyncJob = {
    id: jobId,
    type: "allegro_publish",
    title: `Masowe wystawianie na Allegro (${products.length} pozycji)`,
    status: "running",
    productIds: products.map((p) => p.id),
    totalItems: products.length,
    processedItems: 0,
    successItems: 0,
    failedItems: 0,
    startedAt: new Date().toISOString(),
    logs: [`[${new Date().toLocaleTimeString()}] Rozpoczęto zadanie masowego wystawiania ${products.length} ofert`],
    errors: [],
  };

  onProgress?.({ ...job });

  const updatedProducts = [...products];

  for (let i = 0; i < updatedProducts.length; i++) {
    const product = updatedProducts[i];
    const validation = validateCanonicalProduct(product);

    if (!validation.isValid) {
      job.failedItems++;
      job.processedItems++;
      const errMsg = validation.errors.map((e) => e.message).join("; ");
      job.errors.push({ productId: product.id, error: errMsg });
      job.logs.push(`[${new Date().toLocaleTimeString()}] ❌ Błąd walidacji produktu ${product.sku || product.id}: ${errMsg}`);
      onProgress?.({ ...job });
      continue;
    }

    try {
      const payload = buildAllegroOfferPayload(product, allegroConfig);

      const resp = await fetch("/api/allegro/publish-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          part: canonicalProductToPartItem(product),
          config: allegroConfig,
          payload,
        }),
      });

      const resData = await resp.json();

      if (resp.ok && (resData.success || resData.offerId)) {
        const offerId = resData.offerId || `17${Math.floor(10000000 + Math.random() * 90000000)}`;
        const offerUrl = resData.offerUrl || `https://allegro.pl/oferta/${offerId}`;
        const publishedAt = new Date().toLocaleString("pl-PL");

        product.status = "published";
        product.marketplace_status.allegro = {
          offer_id: offerId,
          status: "active",
          offer_url: offerUrl,
          last_sync: publishedAt,
        };

        job.successItems++;
        job.logs.push(`[${new Date().toLocaleTimeString()}] Oferta #${offerId} "${product.name.slice(0, 40)}..." wystawiona pomyślnie!`);
      } else {
        job.failedItems++;
        const err = resData.error || "Błąd serwera Allegro";
        job.errors.push({ productId: product.id, error: err });
        job.logs.push(`[${new Date().toLocaleTimeString()}] ❌ Allegro API odrzuciło ${product.sku}: ${err}`);
      }
    } catch (err: any) {
      job.failedItems++;
      const errTxt = err?.message || "Błąd połączenia sieciowego";
      job.errors.push({ productId: product.id, error: errTxt });
      job.logs.push(`[${new Date().toLocaleTimeString()}] ❌ Wyjątek sieciowy: ${errTxt}`);
    }

    job.processedItems++;
    onProgress?.({ ...job });
  }

  job.status = job.failedItems === 0 ? "completed" : job.successItems > 0 ? "completed" : "failed";
  job.finishedAt = new Date().toISOString();
  job.logs.push(
    `[${new Date().toLocaleTimeString()}] Zakończono: ${job.successItems} sukcesów, ${job.failedItems} błędów.`
  );

  saveStoredIntegrationLog({
    channel: "Allegro REST API",
    action: `Masowe wystawianie ofert (${products.length})`,
    status: job.failedItems === 0 ? "success" : job.successItems > 0 ? "warning" : "error",
    itemsCount: products.length,
    successCount: job.successItems,
    errorCount: job.failedItems,
    details: `Zakończono zadanie masowego wystawiania. Sukces: ${job.successItems}/${products.length}.`,
  });

  onProgress?.({ ...job });
  return { updatedProducts, job };
}
