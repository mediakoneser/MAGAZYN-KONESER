/**
 * MARKETPLACE TYPES & STRICT SEPARATION OF IDENTIFIERS
 * 
 * Rules:
 * 1. Never save an ID without defining its specific type.
 * 2. Maintain strict separation between Master, Allegro, Ovoko, BaseLinker, and ShopGold IDs.
 */

// Lifecycle states for Allegro Offer Creation Flow
export type AllegroLifecycleStatus =
  | "REQUESTED"
  | "PROCESSING"
  | "CREATED"
  | "PUBLISHED"
  | "VERIFIED"
  | "FAILED"
  | "UNKNOWN";

// Specific Typed IDs for Allegro
export interface AllegroTypedIds {
  offerId?: string;       // The public/sale offer ID on Allegro (e.g., "1749281923")
  productId?: string;     // Allegro Product Catalog ID (e.g., "prod-8849-xyz")
  operationId?: string;   // Async command/operation UUID (e.g., "89a31bc0-...")
  externalId?: string;    // Seller's unique external ID (e.g., "WMS-10492")
  sku?: string;           // Warehouse SKU / Rack signature (e.g., "MAG-ALT-01")
}

// Specific Typed IDs for Ovoko
export interface OvokoTypedIds {
  productId?: string;     // Unique Ovoko/RRR inventory item ID (e.g., "ovk_8920194")
  partCode?: string;      // Ovoko internal part code
  categoryId?: string;    // Ovoko category ID
  stockSyncId?: string;   // Stock update transaction ID
  priceSyncId?: string;   // Price update transaction ID
}

// Specific Typed IDs for BaseLinker
export interface BaseLinkerTypedIds {
  productId?: string;     // BaseLinker catalog product ID
  inventoryId?: string;   // BaseLinker inventory ID (e.g. "inv_3")
  variantId?: string;     // BaseLinker variant ID
}

// Specific Typed IDs for ShopGold
export interface ShopGoldTypedIds {
  productId?: string;     // ShopGold MySQL product_id (e.g. "sg_5091")
  categoryId?: string;    // ShopGold products_to_categories ID
}

// Complete Separate ID container for Master Products
export interface MasterMarketplaceIds {
  allegro: AllegroTypedIds;
  ovoko: OvokoTypedIds;
  baselinker: BaseLinkerTypedIds;
  shopgold: ShopGoldTypedIds;
}

// Verification difference report
export interface FieldVerificationDiff<T = any> {
  expected: T;
  actual?: T;
  match: boolean;
}

export interface OfferVerificationResult {
  offerId: string;
  verifiedAt: string;
  overallMatch: boolean;
  fields: {
    offerId: FieldVerificationDiff<string>;
    title: FieldVerificationDiff<string>;
    price: FieldVerificationDiff<number>;
    stock: FieldVerificationDiff<number>;
    category: FieldVerificationDiff<string>;
    status: FieldVerificationDiff<string>;
  };
  discrepancies: string[];
  rawAllegroOffer?: any;
}

// Diagnostic step types
export type DiagnosticStage =
  | "REQUEST"
  | "RESPONSE"
  | "OPERATION"
  | "OFFER"
  | "PUBLICATION"
  | "VERIFICATION";

export interface AllegroDiagnosticEntry {
  id: string;
  timestamp: string;
  sku: string;
  externalId: string;
  operationId: string;
  offerId?: string;
  productId?: string;
  stage: DiagnosticStage;
  status: AllegroLifecycleStatus;
  httpStatus?: number;
  httpResponseSnippet?: string;
  message: string;
  verificationComparison?: OfferVerificationResult;
  payload?: any;
}

// Multi-Marketplace comparison item
export interface MarketplaceChannelState {
  channel: "MASTER" | "ALLEGRO" | "OVOKO" | "BASELINKER" | "SHOPGOLD";
  id?: string;
  title: string;
  price: number;
  currency: string;
  stock: number;
  category: string;
  status: string;
  lastSync?: string;
  url?: string;
}

export interface MarketplaceComparisonMatrix {
  masterSku: string;
  masterId: string;
  channels: {
    master: MarketplaceChannelState;
    allegro: MarketplaceChannelState;
    ovoko: MarketplaceChannelState;
    baselinker: MarketplaceChannelState;
    shopgold: MarketplaceChannelState;
  };
  hasDiscrepancies: boolean;
  discrepancyList: string[];
}

export interface MarketplaceComparisonItem {
  sku: string;
  hasDiscrepancies: boolean;
  discrepancies: string[];
  master: {
    title: string;
    price: number;
    stock: number;
    category: string;
    status: string;
  };
  allegro: {
    offerId?: string;
    price?: number;
    stock?: number;
    category?: string;
    status?: string;
  };
  ovoko: {
    productId?: string;
    priceEur?: number;
    pricePln?: number;
    stock?: number;
    category?: string;
    status?: string;
  };
  baselinker: {
    productId?: string;
    inventoryId?: string;
    price?: number;
    stock?: number;
    category?: string;
    status?: string;
  };
  shopgold: {
    productId?: string;
    categoryId?: string;
    price?: number;
    stock?: number;
    category?: string;
    status?: string;
  };
}
