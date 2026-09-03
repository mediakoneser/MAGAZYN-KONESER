/**
 * BUSINESS OS v1 — Central Business Core Data Models
 * 
 * "BUSINESS OS owns the business data. External integrations synchronize with Business OS;
 * they do not own the business data."
 */

export type EntitySource = "REGON" | "CEIDG" | "KRS" | "GUS" | "MANUAL" | "SYSTEM" | "ALLEGRO" | "OVOKO" | "SHOPGOLD";

export type ContractorType = "SUPPLIER" | "CUSTOMER" | "PARTNER" | "INSTITUTION" | "OTHER";

export interface MasterContractor {
  id: string;
  nip: string;
  regon?: string;
  krs?: string;
  name: string;
  shortName?: string;
  type: ContractorType;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  country: string;
  bankAccount?: string;
  source: EntitySource;
  verifiedAt?: string;
  verificationSource?: string;
  status: "ACTIVE" | "PENDING_VERIFICATION" | "BLOCKED";
  notes?: string;
  totalOrdersCount?: number;
  totalSpendPln?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductOEM {
  id: string;
  oemNumber: string;
  cleanOemNumber: string; // alphanumeric only, uppercase
  manufacturer: string;
  isPrimary: boolean;
  notes?: string;
}

export interface InventoryLocation {
  warehouseCode: string; // e.g., "MAG_GLOWNY", "PLAC_A"
  rack: string;          // e.g., "MAGDA 1", "R03"
  shelf?: string;        // e.g., "04"
  spot?: string;         // e.g., "12"
}

export interface InventoryMovement {
  id: string;
  productId: string;
  productSku: string;
  timestamp: string;
  previousStock: number;
  newStock: number;
  difference: number;
  reason: 
    | "SPRZEDAŻ_ALLEGRO"
    | "SPRZEDAŻ_OVOKO"
    | "SPRZEDAŻ_SHOPGOLD"
    | "SPRZEDAŻ_STACJONARNA"
    | "PRZYJĘCIE_DEMONTAŻ"
    | "PRZESUNIĘCIE_MAGAZYNOWE"
    | "KOREKTA_INWENTARYZACJA"
    | "ZWROT_KLIENTA"
    | "UTYLIZACJA_BDO";
  orderId?: string;
  sourceLocation?: string;
  targetLocation?: string;
  performedBy: string;
  notes?: string;
}

export type ExternalSystem = "allegro" | "ovoko" | "baselinker" | "shopgold" | "custom";

export type ExternalMappingStatus = "ACTIVE" | "DRAFT" | "SYNCING" | "ERROR" | "NONE";

export interface ExternalMapping {
  id: string;
  masterProductId: string;
  masterSku: string;
  system: ExternalSystem;
  externalId: string;       // e.g. Allegro Offer ID, Ovoko Product ID, ShopGold Product ID
  secondaryId?: string;     // e.g. Allegro Product Catalog ID, Operation UUID
  status: ExternalMappingStatus;
  externalPrice?: number;
  externalStock?: number;
  externalUrl?: string;
  lastSyncAt?: string;
  lastVerifiedAt?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export type OrderChannel = "ALLEGRO" | "OVOKO" | "SHOPGOLD" | "OFFLINE_STACJA" | "BASELINKER" | "INNE";

export type OrderPaymentStatus = "PAID" | "PENDING" | "CASH_ON_DELIVERY" | "REFUNDED" | "CANCELLED";

export type OrderFulfillmentStatus = 
  | "NEW" 
  | "IN_PREPARATION" 
  | "READY_FOR_PICKUP" 
  | "DISPATCHED" 
  | "DELIVERED" 
  | "CANCELLED" 
  | "RETURNED" 
  | "COMPLAINT";

export interface OrderItem {
  id: string;
  productId: string;
  sku: string;
  name: string;
  oem?: string;
  quantity: number;
  unitPriceGross: number;
  unitPriceNet: number;
  vatRate: number;
  rackLocation?: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "ORD-2026-0042"
  channel: OrderChannel;
  externalOrderId?: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
    pickupPoint?: string; // e.g. Paczkomat code
  };
  invoiceRequested: boolean;
  invoiceNip?: string;
  invoiceCompanyName?: string;
  items: OrderItem[];
  totalGrossPln: number;
  totalNetPln: number;
  shippingCostGrossPln: number;
  paymentStatus: OrderPaymentStatus;
  paymentMethod: string;
  fulfillmentStatus: OrderFulfillmentStatus;
  trackingNumber?: string;
  carrierName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type DocumentType = 
  | "INVOICE" 
  | "PROFORMA" 
  | "CONTRACT" 
  | "MAGAZINE_PZ" 
  | "MAGAZINE_WZ" 
  | "OFFICIAL_SDP_KASACJA" 
  | "BDO_WASTE_TRANSFER" 
  | "WARRANTY" 
  | "COMPLAINT";

export interface BusinessDocument {
  id: string;
  documentNumber: string;
  type: DocumentType;
  title: string;
  contractorId?: string;
  contractorName?: string;
  orderId?: string;
  productId?: string;
  issueDate: string;
  dueDate?: string;
  amountGrossPln?: number;
  amountNetPln?: number;
  status: "DRAFT" | "ISSUED" | "PAID" | "ARCHIVED" | "CANCELLED";
  fileUrl?: string;
  notes?: string;
  createdAt: string;
}

export interface FinanceOverview {
  todayRevenuePln: number;
  weekRevenuePln: number;
  monthRevenuePln: number;
  todayProfitGrossPln: number;
  estimatedMarginPercentage: number;
  openOrdersCount: number;
  pendingPaymentsSumPln: number;
  unpaidInvoicesCount: number;
  averageOrderValuePln: number;
}

export type IntegrationStatusCode = 
  | "NOT_CONFIGURED" 
  | "AUTH_REQUIRED" 
  | "CONNECTED" 
  | "SYNCING" 
  | "WARNING" 
  | "ERROR" 
  | "DISCONNECTED";

export interface IntegrationAccountInfo {
  code: ExternalSystem | "regon" | "ceidg" | "gus" | "bip";
  name: string;
  category: "MARKETPLACE" | "E_COMMERCE" | "PUBLIC_REGISTRY" | "ERP";
  status: IntegrationStatusCode;
  accountIdentifier?: string; // e.g. Allegro login or REGON User Key
  lastSyncAt?: string;
  lastError?: string;
  healthScore: number; // 0-100%
  activeOffersCount?: number;
  pendingJobsCount?: number;
  isSandbox?: boolean;
}

export interface ApiLogEntry {
  id: string;
  correlationId: string; // e.g. "BUS-2026-000123"
  integration: string;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  httpStatus: number;
  durationMs: number;
  status: "SUCCESS" | "WARNING" | "ERROR";
  errorSummary?: string;
  requestPayloadSnippet?: string; // Sanitize secrets!
  responsePayloadSnippet?: string;
  triggeredBy: string;
  timestamp: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: "PRODUCT" | "INVENTORY" | "ORDER" | "CONTRACTOR" | "INTEGRATION" | "SYSTEM";
  entityId: string;
  changesSummary: string;
  timestamp: string;
}

export interface BusinessIssue {
  id: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  category: "ALLEGRO" | "OVOKO" | "MAGAZYN" | "DOKUMENTY" | "FINANSE" | "INTEGRACJE";
  title: string;
  description: string;
  affectedEntityId?: string;
  targetTab: string;
  quickActionLabel: string;
  quickActionData?: any;
  createdAt: string;
}
