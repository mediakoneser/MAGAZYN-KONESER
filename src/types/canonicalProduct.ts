export type ProductStatus =
  | "draft"
  | "validated"
  | "matching"
  | "ready"
  | "publishing"
  | "published"
  | "sync_error"
  | "archived";

export interface ProductValidationError {
  field: string;
  code: string;
  message: string;
  severity: "error" | "warning";
}

export interface ProductValidationResult {
  isValid: boolean;
  hasWarnings: boolean;
  errors: ProductValidationError[];
  warnings: ProductValidationError[];
}

export interface AllegroParameterValue {
  id?: string;
  value?: string;
  values?: string[];
  rangeValue?: {
    from?: string | number;
    to?: string | number;
  };
}

export interface AllegroCategoryParameterDef {
  id: string;
  name: string;
  type: "string" | "integer" | "float" | "dictionary" | "multivalued";
  required: boolean;
  unit?: string;
  dictionary?: Array<{ id: string; value: string }>;
  description?: string;
}

export interface AllegroProductMatchResult {
  matched: boolean;
  allegroProductId?: string;
  allegroProductName?: string;
  similarityScore: number;
  categoryName?: string;
  categoryId?: string;
  imageUrl?: string;
  parametersFound: Record<string, string>;
  isNewProductSuggestion?: boolean;
}

export interface CanonicalProduct {
  id: string; // Unique UUID
  sku: string; // EXTERNAL_ID / Sygnatura
  gtin: string; // MUST be string! EAN-8/12/13/14
  mpn: string; // Numer katalogowy producenta
  name: string; // Nazwa produktu (max 75 znaków dla Allegro)
  brand: string; // Marka / Producent
  category_name: string; // np. "Motoryzacja > Części > Silniki"
  category_id?: string; // ID kategorii Allegro / shopGold
  category_path?: string[];
  price_gross: number; // Cena brutto PLN
  price_net: number; // Cena netto PLN
  vat_rate: number; // Stawka VAT (np. 23)
  stock: number; // Stan magazynowy (integer)
  description_raw: string; // Czysty tekst opisu
  description_html: string; // Opis w formacie HTML (zgodny z sekcjami Allegro)
  images: string[]; // Tablica URL-i lub base64 zdjęć (do 16)
  parameters: Record<string, string | number | boolean | string[]>; // Parametry specyficzne
  allegro_parameters?: Record<string, string | string[] | number>; // Zmapowane parametry Allegro
  
  // Logistics & terms
  shipping_rate_id?: string;
  implied_warranty_id?: string;
  return_policy_id?: string;
  location_rack?: string; // Regał WMS (np. "MAG 14")
  ai_cocreated?: boolean | string; // Współtworzone przez AI (zgodnie z wymogami Allegro 2026)
  
  // Statuses
  status: ProductStatus;
  validation?: ProductValidationResult;
  product_match?: AllegroProductMatchResult;
  
  // Marketplace synchronization statuses & explicitly separated IDs
  marketplace_status: {
    allegro?: {
      offer_id?: string;
      offerId?: string; // Explicit typed offerId
      productId?: string; // Allegro catalog product ID
      operationId?: string; // Async operation UUID
      externalId?: string; // Seller external ID
      sku?: string; // Warehouse SKU
      lifecycleStatus?: "REQUESTED" | "PROCESSING" | "CREATED" | "PUBLISHED" | "VERIFIED" | "FAILED" | "UNKNOWN";
      status?: "draft" | "active" | "ended" | "validating" | "error";
      offer_url?: string;
      last_sync?: string;
      lastVerifiedAt?: string;
      error_message?: string;
      views_count?: number;
      sold_count?: number;
    };
    ovoko?: {
      productId?: string; // Unique Ovoko product ID (e.g. ovk_8849201)
      ovokoProductId?: string;
      partCode?: string;
      categoryId?: string;
      categoryName?: string;
      priceEur?: number;
      pricePln?: number;
      status?: "synced" | "active" | "error" | "pending" | "inactive";
      last_sync?: string;
      externalUrl?: string;
      error_message?: string;
    };
    baselinker?: {
      product_id?: string;
      productId?: string; // BaseLinker product ID
      inventoryId?: string; // Inventory ID
      status?: "synced" | "error" | "pending";
      last_sync?: string;
      error_message?: string;
    };
    shopgold?: {
      product_id?: string;
      productId?: string; // ShopGold MySQL product ID
      categoryId?: string;
      status?: "synced" | "error" | "pending";
      last_sync?: string;
      error_message?: string;
    };
  };

  created_at: string;
  updated_at: string;
}

export interface IntegrationLog {
  id: string;
  timestamp: string;
  channel: "Allegro REST API" | "BaseLinker API" | "shopGold" | "CSV Engine" | "AI Optimizer" | "System";
  action: string;
  status: "success" | "warning" | "error" | "info";
  itemsCount: number;
  successCount: number;
  errorCount: number;
  details: string;
  payloadSnippet?: string;
  rawResponse?: string;
}

export interface SyncJob {
  id: string;
  type: "allegro_publish" | "allegro_sync" | "baselinker_sync" | "shopgold_sync" | "csv_export" | "csv_import" | "ai_optimize";
  title: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  productIds: string[];
  totalItems: number;
  processedItems: number;
  successItems: number;
  failedItems: number;
  startedAt: string;
  finishedAt?: string;
  logs: string[];
  errors: Array<{ productId: string; error: string }>;
}

export interface BaseLinkerConfig {
  apiKey: string;
  inventoryId?: string;
  defaultPriceGroupId?: string;
  autoSyncStock: boolean;
  autoSyncPrices: boolean;
  isConnected: boolean;
  lastConnectedAt?: string;
}

export interface ShopGoldConfig {
  apiUrl: string;
  apiKey: string;
  storeName: string;
  autoSyncStock: boolean;
  autoSyncPrices: boolean;
  isConnected: boolean;
  lastConnectedAt?: string;
}
