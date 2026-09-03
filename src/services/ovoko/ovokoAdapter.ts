/**
 * OVOKO INTEGRATION ADAPTER
 * 
 * Provides isolated API client and services for Ovoko/RRR marketplace:
 * - OvokoApiClient
 * - OvokoProductService
 * - OvokoCategoryService
 * - OvokoStockService
 * - OvokoPriceService
 * - OvokoSyncService
 * 
 * Never mixes Ovoko identifiers with Allegro identifiers.
 */

export interface OvokoConfig {
  apiUrl: string;
  apiKey: string;
  sellerId: string;
  sellerName: string;
  environment: "production" | "sandbox";
  currency: "EUR" | "PLN";
  priceMarkupPercentage: number;
  autoSyncStock: boolean;
  autoSyncPrices: boolean;
  lastConnectedAt?: string;
  isConnected: boolean;
}

export interface OvokoProductItem {
  ovokoProductId: string;   // Unique Ovoko ID
  sku: string;              // Warehouse SKU
  partName: string;
  carBrand: string;
  carModel: string;
  carYear: number | string;
  oeNumber: string;
  categoryId: string;
  categoryName: string;
  priceEur: number;
  pricePln: number;
  stock: number;
  status: "active" | "inactive" | "pending_review" | "sold" | "error";
  locationRack: string;
  images: string[];
  lastSyncAt: string;
  externalUrl?: string;
}

export interface OvokoCategory {
  id: string;
  name: string;
  parentId?: string | null;
  level: number;
  children?: OvokoCategory[];
}

export interface OvokoQueueItem {
  id: string;
  ovokoProductId?: string;
  sku: string;
  action: "create" | "update_stock" | "update_price" | "deactivate";
  status: "queued" | "processing" | "completed" | "failed";
  attempts: number;
  payload: any;
  response?: any;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OvokoLogEntry {
  id: string;
  timestamp: string;
  stage: "CONNECTION" | "PRODUCT" | "CATEGORY" | "STOCK" | "PRICE" | "SYNC";
  action: string;
  status: "success" | "error" | "warning" | "info";
  ovokoProductId?: string;
  sku?: string;
  message: string;
  httpStatus?: number;
  latencyMs?: number;
}

// 1. OvokoApiClient
export class OvokoApiClient {
  private baseUrl = "/api/ovoko";

  async getStatus(): Promise<{ success: boolean; config: OvokoConfig; pingMs?: number; message?: string }> {
    const res = await fetch(`${this.baseUrl}/status`);
    return await res.json();
  }

  async testConnection(): Promise<{ success: boolean; pingMs: number; message: string; accountInfo?: any }> {
    const res = await fetch(`${this.baseUrl}/connection/test`, { method: "POST" });
    return await res.json();
  }

  async configure(config: Partial<OvokoConfig>): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${this.baseUrl}/connection/configure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    return await res.json();
  }
}

// 2. OvokoProductService
export class OvokoProductService {
  private baseUrl = "/api/ovoko";

  async getProducts(): Promise<{ success: boolean; products: OvokoProductItem[] }> {
    const res = await fetch(`${this.baseUrl}/products`);
    return await res.json();
  }

  async createOrUpdateProduct(product: Partial<OvokoProductItem>): Promise<{
    success: boolean;
    ovokoProductId: string;
    status: string;
    message: string;
    rawResponse?: any;
  }> {
    const res = await fetch(`${this.baseUrl}/products/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    });
    return await res.json();
  }

  async getProductById(ovokoProductId: string): Promise<{ success: boolean; product: OvokoProductItem }> {
    const res = await fetch(`${this.baseUrl}/products/${encodeURIComponent(ovokoProductId)}`);
    return await res.json();
  }
}

// 3. OvokoCategoryService
export class OvokoCategoryService {
  private baseUrl = "/api/ovoko";

  async getCategories(): Promise<{ success: boolean; categories: OvokoCategory[] }> {
    const res = await fetch(`${this.baseUrl}/categories`);
    return await res.json();
  }

  async mapCategory(internalCategory: string, ovokoCategoryId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${this.baseUrl}/categories/map`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ internalCategory, ovokoCategoryId }),
    });
    return await res.json();
  }
}

// 4. OvokoStockService
export class OvokoStockService {
  private baseUrl = "/api/ovoko";

  async updateStock(ovokoProductId: string, sku: string, newStock: number): Promise<{
    success: boolean;
    stockSyncId: string;
    currentStock: number;
    message: string;
  }> {
    const res = await fetch(`${this.baseUrl}/stock/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ovokoProductId, sku, stock: newStock }),
    });
    return await res.json();
  }
}

// 5. OvokoPriceService
export class OvokoPriceService {
  private baseUrl = "/api/ovoko";

  async updatePrice(
    ovokoProductId: string,
    sku: string,
    priceEur: number,
    pricePln?: number
  ): Promise<{
    success: boolean;
    priceSyncId: string;
    newPriceEur: number;
    message: string;
  }> {
    const res = await fetch(`${this.baseUrl}/price/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ovokoProductId, sku, priceEur, pricePln }),
    });
    return await res.json();
  }
}

// 6. OvokoSyncService
export class OvokoSyncService {
  private baseUrl = "/api/ovoko";

  async addToQueue(item: Omit<OvokoQueueItem, "id" | "attempts" | "createdAt" | "updatedAt">): Promise<{
    success: boolean;
    queueItemId: string;
    message: string;
  }> {
    const res = await fetch(`${this.baseUrl}/queue/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    return await res.json();
  }

  async getQueue(): Promise<{ success: boolean; queue: OvokoQueueItem[] }> {
    const res = await fetch(`${this.baseUrl}/queue`);
    return await res.json();
  }

  async processQueue(): Promise<{ success: boolean; processed: number; failed: number; message: string }> {
    const res = await fetch(`${this.baseUrl}/queue/process`, { method: "POST" });
    return await res.json();
  }

  async getLogs(): Promise<{ success: boolean; logs: OvokoLogEntry[] }> {
    const res = await fetch(`${this.baseUrl}/logs`);
    return await res.json();
  }
}

// Export single singleton instance bundle
export const ovokoApiClient = new OvokoApiClient();
export const ovokoProductService = new OvokoProductService();
export const ovokoCategoryService = new OvokoCategoryService();
export const ovokoStockService = new OvokoStockService();
export const ovokoPriceService = new OvokoPriceService();
export const ovokoSyncService = new OvokoSyncService();
