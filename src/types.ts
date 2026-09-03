export * from "./types/canonicalProduct";
export * from "./types/businessCore";
export * from "./types/marketplaceTypes";

export type UserRole = "Właściciel / Szef" | "Kierownik Magazynu" | "Pracownik / Demontażysta" | "Sprzedawca / E-commerce";

export type PartStatus = "Dostępny" | "Zarezerwowany" | "Sprzedany" | "W przygotowaniu" | "Zutylizowany";

export type AllegroOfferStatus = "draft" | "active" | "ended" | "validating" | "error";

export interface AllegroListingInfo {
  offerId?: string;
  status?: AllegroOfferStatus;
  offerUrl?: string;
  publishedAt?: string;
  price?: number;
  categoryName?: string;
  categoryId?: string;
  errorMessage?: string;
  lastSyncAt?: string;
  signature?: string; // Sygnatura = Regał WMS (np. "MAGDA 1")
  ean?: string;
  manufacturer?: string; // np. "Toyota OE", "Volkswagen OE"
  manufacturerAddress?: string;
  manufacturerEmail?: string;
  safetyInformation?: string;
  gpsrCompliant?: boolean;
  smartEligible?: boolean;
  viewsCount?: number;
  soldUnitsCount?: number;
  watchersCount?: number;
}

export interface AllegroConfig {
  clientId: string;
  clientSecret: string;
  apiKeyToken?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  allegroLogin?: string;
  authType?: "device_code" | "token" | "client_credentials";
  baseLinkerToken?: string;
  sandbox: boolean;
  sellerName: string;
  sellerNip: string;
  city: string;
  postCode: string;
  province: string;
  phone: string;
  shippingTableId: string;
  impliedWarrantyId: string;
  returnPolicyId: string;
  isConnected: boolean;
  lastConnectedAt?: string;
}

export type PartQualityGrade = "A+ (Jak nowy / Oryginał)" | "A (Bardzo dobry / Sprawny 100%)" | "B (Ślady użytkowania)" | "C (Do regeneracji / Na części)";

export interface VehicleInfo {
  marka: string;
  model: string;
  rocznik: string;
  vin?: string;
  kodSilnika?: string;
  kodLakieru?: string;
}

export interface PriceInfo {
  brutto: number;
  netto: number;
}

export interface OcrResults {
  numer_magazynowy: string;
  napisy_markerem?: string;
}

export interface AuctionTemplates {
  allegroTitle?: string;
  allegroDescriptionHtml?: string;
  ovokoTitle?: string;
  olxText?: string;
}

export type PartHistoryEventType =
  | "DEMONTAŻ"
  | "ODŁOŻENIE_NA_REGAŁ"
  | "PRZENIESIENIE_REGAŁU"
  | "WYSTAWIENIE_OFERTY"
  | "ZMIANA_CENY"
  | "REZERWACJA"
  | "ANULOWANIE_REZERWACJI"
  | "SPRZEDAŻ"
  | "POBRANIE_Z_MAGAZYNU"
  | "KOREKTA_STANU"
  | "UTYLIZACJA_BDO";

export type ListingPlatform = "Allegro" | "Ovoko / RRR" | "OLX" | "ShopGold / Sklep Własny" | "eBay Motors";

export interface PartPlatformListing {
  platform: ListingPlatform;
  offerId?: string;
  url?: string;
  status: "Aktywna" | "Szkic" | "Zakończona" | "Błąd";
  publishedAt?: string;
  pricePln?: number;
  lastSyncAt?: string;
}

export interface PartHistoryEntry {
  id: string;
  timestamp: string;
  eventType: PartHistoryEventType;
  authorName: string;
  authorRole?: string;
  details: string;
  previousLocation?: string; // Stary regał (np. "MAG 14")
  newLocation?: string;      // Nowy regał (np. "MAG 03")
  platform?: ListingPlatform;
  buyerInfo?: string;
  orderNumber?: string;
  salePricePln?: number;
  notes?: string;
}

export interface WarehouseRackInfo {
  rackCode: string; // np. "MAG 14"
  sector: string;   // np. "Sektor A - Silniki i Osprzęt"
  shelfLevel?: string; // np. "Półka 2 / Rząd B"
  capacityLimit?: number;
  description?: string;
  qrCodeValue: string; // "RACK:MAG 14"
  barcodeValue: string; // "RACK-MAG-14"
}

export interface PartListingData {
  marka?: string;
  model?: string;
  rocznik?: string;
  samochod?: VehicleInfo;
  kategoria: string;
  jakosc?: string;
  pozycja_czesci?: string;
  opis: string;
  producent: string;
  numery_czesci: string;
  cena: PriceInfo;
  ocr_wyniki: OcrResults;
  zdjecia?: string[];
  ilosc?: number;
  stan_magazynowy?: number;
  minStanAlert?: number;
  // Auction outputs generated automatically upon photo analysis
  auctionTemplates?: AuctionTemplates;
  workerName?: string;
  qualityGrade?: PartQualityGrade;
  allegro?: AllegroListingInfo;
  publishedPlatforms?: PartPlatformListing[];
  // Google Drive integration: auction PDF metadata
  drivePdfUrl?: string;
  driveFileId?: string;
  driveFolder?: string;
  driveSyncedAt?: string;
}

export interface PartItem {
  id: string;
  barcode?: string; // e.g. "KNS-PART-0001"
  qrCode?: string;  // e.g. "PART:part_1"
  vehicleId?: string;
  vehicleInternalNo?: string;
  vehicleVin?: string;
  vehicleModelName?: string;
  dismantledByWorker?: string;
  dismantledAt?: string;
  currentRackLocation?: string; // np. "MAG 14"
  // Financial pro-rata calculation & pricing
  allocatedCostBasis?: number; // Koszt zakupu przypisany proporcjonalnie z pojazdu-dawcy
  salePriceNet?: number;
  salePriceGross?: number;
  // Aging & dead-stock analysis
  daysInWarehouse?: number;
  ageGroup?: "0-30" | "31-90" | "91-180" | "181-365" | "365+";
  // Multi-marketplace listing state
  isListedAllegro?: boolean;
  isListedShopGold?: boolean;
  isListedBaseLinker?: boolean;
  shopGoldProductId?: string;
  // Google Drive direct access
  drivePdfUrl?: string;
  driveFileId?: string;
  driveFolder?: string;
  driveSyncedAt?: string;
  reservedAt?: string;
  reservedBy?: string;
  soldAt?: string;
  soldTo?: string;
  soldPrice?: number;
  pickedFromRackAt?: string;
  pickedByWorker?: string;
  historyLogs?: PartHistoryEntry[];
  publishedPlatforms?: PartPlatformListing[];
  listingData: PartListingData;
  status: PartStatus;
  ilosc?: number;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  createdByName?: string;
  // Allegro quick reference
  allegroOfferId?: string;
  allegroOfferUrl?: string;
  allegroStatus?: AllegroOfferStatus;
  allegroPublishedAt?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  stationCode?: string;
  partsLoggedCount?: number;
  active: boolean;
  avatar?: string;
}

export type TaskPriority = "Krytyczny (Pilny)" | "Wysoki" | "Standardowy" | "Niski";
export type TaskStatus = "Do zrobienia" | "W trakcie" | "Zakończone";
export type TaskCategory = "Demontaż" | "Weryfikacja / Test" | "Magazyn / Regał" | "Segregacja / Złom" | "Pakowanie / Wysyłka";

export interface WorkerTask {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo?: string; // staff name or id
  vehicleTag?: string; // e.g. "Audi A4 B8 2.0 TDI"
  targetRack?: string; // e.g. "MAG 14"
  estimatedMinutes?: number;
  completedAt?: string;
  createdAt: string;
  createdBy?: string;
  aiGenerated?: boolean;
  isUrgent?: boolean;
  bossUrgentNote?: string;
  deadline?: string;
}

export interface WorkerProcedureTip {
  id: string;
  title: string;
  category: "Demontaż Podzespołów" | "Bezpieczeństwo & BHP" | "Procedury BDO & Recykling" | "Weryfikacja Jakości";
  difficulty: "Łatwy" | "Średni" | "Ekspert / Precyzja";
  tools: string[];
  steps: string[];
  warnings: string[];
  oemCheckRule?: string;
  badge?: string;
}

export type VehicleLifecycleStatus =
  | "PRZYJĘCIE_I_WYCENA"
  | "ZAKUPIONY_NA_PLACU"
  | "W_TRAKCIE_DEMONTAŻU"
  | "DEMONTAŻ_ZAKOŃCZONY"
  | "ROZLICZONY_I_ZŁOM_BDO";

export interface VehicleLifecycleRecord {
  id: string;
  internalNumber: string; // e.g. "KONESER-2026/01"
  vin: string;
  make: string;
  model: string;
  generation?: string;
  year: string;
  engineCode: string;
  engineDisplacement?: string; // e.g. "1.9 TDI"
  powerHp?: string; // e.g. "130 KM"
  fuelType?: "Diesel" | "Benzyna" | "Benzyna+LPG" | "Hybryda" | "Elektryczny";
  paintCode?: string; // e.g. "LC9Z"
  mileageKm?: number;
  condition:
    | "Kompletny / Jeżdżący"
    | "Powypadkowy (Przód)"
    | "Powypadkowy (Tył/Bok)"
    | "Zatarty silnik"
    | "Spalony"
    | "Anglik / Bez prawa rej."
    | "Wrak / Karoseria";

  // Financials & Acquisition Costs
  purchasePricePln: number;
  towTruckCostPln: number; // Koszt transportu / lawety
  additionalCostsPln: number; // Dodatkowe koszty (mechanik, holowanie, opłaty, mycie)
  additionalCostsNotes?: string;

  // Personnel & Timeline
  assignedWorkerId?: string;
  assignedWorkerName: string; // Pracownik odpowiedzialny za demontaż
  intakeDate: string; // Data przyjęcia
  dismantleStartDate?: string; // Data rozpoczęcia demontażu
  dismantleEndDate?: string; // Data zakończenia demontażu

  // Lifecycle Status
  lifecycleStatus: VehicleLifecycleStatus;

  // Scrap & Recycling (BDO)
  scrapWeightKg: number; // Waga karoserii po demontażu
  scrapRatePerKg: number; // Stawka za kg złomu (np. 0.85 PLN)
  catalystValuePln: number; // Wartość katalizatora / DPF
  batteryValuePln: number; // Wartość akumulatora
  aluminumScrapValuePln: number; // Felgi / stopy aluminium

  // Parts harvested
  dismantledPartIds: string[]; // Powiązane ID części w WMS

  notes?: string;
  photos?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface VehicleFinancialSummary {
  purchasePricePln: number;
  towTruckCostPln: number;
  additionalCostsPln: number;
  totalCostPln: number;
  partsSoldGrossPln: number;
  partsSoldNetPln: number;
  partsInStockGrossPln: number;
  partsInStockNetPln: number;
  scrapTotalRevenuePln: number;
  totalRevenueGrossPln: number;
  totalRealizedRevenuePln: number;
  netRealizedProfitPln: number;
  projectedNetProfitPln: number;
  roiPercentage: number;
  marginPercentage: number; // Marża handlowa %: (Przychód - Koszt) / Przychód * 100
  dismantleDurationDays: number | null; // Czas od zakupu/przyjęcia do zakończenia demontażu w dniach
  partsCountTotal: number;
  partsCountSold: number;
  partsCountInStock: number;
}

export interface VehicleDismantleRecord {
  id: string;
  internalNumber?: string;
  make: string;
  model: string;
  year: string;
  vin?: string;
  engineCode?: string;
  paintCode?: string;
  status: "W kolejce do demontażu" | "W trakcie demontażu" | "Części zmagazynowane" | "Skarosowany / Złom BDO";
  estimatedPartsValue: number;
  scrapWeightKg?: number;
  assignedWorker?: string;
  entryDate: string;
}

export interface VehiclePurchaseValuation {
  id: string;
  make: string;
  model: string;
  year: string;
  engine: string;
  vin?: string;
  condition: "Jeżdżący / Kompletny" | "Powypadkowy (Lekko)" | "Mocno rozbity / Spalony" | "Zatarty silnik" | "Anglik / Bez prawa rejestracji";
  catalystIncluded: boolean;
  alloyWheels: boolean;
  batteryIncluded: boolean;
  askingPricePln: number;
  towTruckCostPln: number;
  weightKg: number;
  scrapRatePerKg: number;
  topValuableParts: Array<{
    name: string;
    estimatedPricePln: number;
    demandLevel: "Błyskawiczny (1-3 dni)" | "Wysoki (1-2 tyg)" | "Średni" | "Niski";
    salvageProbability: number; // 0-100%
  }>;
  estimatedScrapValuePln: number;
  estimatedPartsTotalGrossPln: number;
  estimatedLaborCostPln: number;
  netProfitPln: number;
  roiPercentage: number;
  recommendation: "KUPUJ NATYCHMIAST (Wysoki zysk)" | "WARTE ZAKUPU (Standard)" | "NEGOCJUJ CENĘ" | "ODRADZANE (Ryzyko straty)";
  decisionNotes?: string;
  createdAt: string;
  evaluatedBy?: string;
}

export interface MechanicCommissionReport {
  mechanicId: string;
  mechanicName: string;
  role: UserRole;
  avatar?: string;
  baseSalaryPln: number;
  commissionRatePercent: number; // e.g. 8%
  period: string; // e.g. "Kwiecień 2026"
  totalPartsDismantled: number;
  totalPartsSold: number;
  totalInventoryValueGenerated: number;
  totalRealizedSalesValue: number;
  calculatedCommissionPln: number;
  bonusPln: number;
  totalPayoutPln: number;
  speedRatingScore: number; // 1-100
  qualityApprovalRate: number; // 0-100%
  breakdownByCategory: Record<string, { count: number; value: number }>;
}

export interface AiAgentRecommendation {
  id: string;
  type: "low_stock" | "missing_oem" | "pricing_optimization" | "allegro_draft" | "dismantle_opportunity";
  title: string;
  description: string;
  impact: "Wysoki zysk" | "Oszczędność czasu" | "Zgodność prawna / BDO" | "Magazyn";
  suggestedAction: string;
  status?: "pending" | "applied" | "dismissed";
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ChatMessage {
  id?: string;
  sender: "bot" | "user" | "system";
  text: string;
  timestamp?: string;
  sources?: GroundingSource[];
  isSearchingGoogle?: boolean;
}

export type ActiveTabType =
  | "business_dashboard"
  | "business_contractors"
  | "business_orders"
  | "business_finance"
  | "business_integrations"
  | "business_issues"
  | "business_logs"
  | "business_public_data"
  | "magazyn"
  | "pojazdy"
  | "skaner"
  | "pracownik"
  | "agent_ai"
  | "szef"
  | "allegro"
  | "allegro_diagnostics"
  | "ovoko"
  | "compare_marketplaces"
  | "shopgold"
  | "infolinia"
  | "sklep"
  | "google_drive"
  | "gmail"
  | "tecdoc_catalog"
  | "import"
  | "instrukcja";

export type FirestoreSyncStatus = "synced" | "syncing" | "offline" | "error";

export interface NetworkSyncInfo {
  isOnline: boolean;
  syncStatus: FirestoreSyncStatus;
  lastSyncTime: Date | null;
  latencyMs: number | null;
  pendingWritesCount: number;
  errorMessage: string | null;
  databaseId: string;
  collectionName: string;
  totalSyncedCount: number;
}

export type NotificationType =
  | "boss_urgent_task"
  | "firestore_sync"
  | "system"
  | "allegro_status"
  | "google_drive";
export type NotificationPriority = "critical" | "warning" | "info" | "success";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  priority: NotificationPriority;
  actionTab?: ActiveTabType;
  taskId?: string;
  meta?: {
    count?: number;
    error?: string;
    details?: string;
    syncType?: "pull" | "push" | "batch" | "status" | "connection";
  };
}

// ==========================================
// WMS 2.0 DATA MODELS (PHASE 2 SPECIFICATION)
// ==========================================

/**
 * 1. POJAZD DAWCA (KARTA POJAZDU WMS 2.0)
 * Pełny cykl: ZAKUP AUTA → PRZYJĘCIE → WYCENA → DEMONTAŻ → CZĘŚCI → ZŁOM → ROZLICZENIE
 */
export interface VehicleDonor {
  id: string; // np. "VEH_2026_001"
  internalNumber: string; // "2026/001" lub "KONESER-2026/01"
  vin?: string;
  brand: string; // np. "Volkswagen", "Audi", "BMW"
  model: string; // np. "Passat B5 FL", "A4 B8"
  generation?: string; // np. "B5 GP", "B8"
  year: number | string; // np. 2004
  engineCode?: string; // np. "1.9 TDI AVF"
  engineDisplacement?: string; // np. "1896 cm³"
  fuelType?: "Diesel" | "Benzyna" | "Benzyna+LPG" | "Hybryda" | "Elektryczny";
  paintCode?: string; // np. "LB5N"
  mileageKm?: number;

  // Koszty Zakupu & Transportu
  purchasePrice: number; // Cena zakupu wraku (PLN)
  transportCost: number; // Koszt lawety / transportu (PLN)
  additionalCosts: number; // Koszty dodatkowe (holowanie, mycie, opłaty)
  totalCost: number; // Suma kosztów (purchasePrice + transportCost + additionalCosts)

  // Pracownik & Status
  assignedMechanicId?: string;
  assignedMechanicName: string; // Mechanik odpowiedzialny za demontaż
  receivedAt: string; // Data przyjęcia auta
  dismantleStatus: "waiting" | "in_progress" | "completed" | "scrapped";

  // Złom & Recykling BDO
  scrapWeightKg: number; // Waga karoserii po demontażu
  scrapPricePerKg: number; // Stawka za kg złomu (np. 0.85 PLN)
  scrapValue: number; // Wartość złomu (scrapWeightKg * scrapPricePerKg)
  catalystValue?: number; // Wartość katalizatora / DPF
  batteryValue?: number; // Wartość akumulatora

  // Podsumowanie części i zysku
  harvestedPartIds: string[]; // Identyfikatory części pozyskanych z pojazdu
  partsCountTotal: number;
  partsCountSold: number;
  partsCountInStock: number;
  partsSoldGross: number; // Przychód ze sprzedanych części
  partsInStockGross: number; // Szacowana wartość części w magazynie
  totalRevenue: number; // Realny przychód: partsSoldGross + (złom jeśli skarosowany)
  realizedProfit: number; // Realny zysk: partsSoldGross + złom - totalCost
  projectedProfit: number; // Szacowany zysk całkowity: partsSoldGross + partsInStockGross + scrapValue - totalCost
  marginPercentage: number;
  roiPercentage: number;

  photos: string[]; // Zdjęcia pojazdu
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Wizualny przepływ finansowy: KOSZTY → CZĘŚCI → ZŁOM → PRZYCHÓD → ZYSK
 */
export interface VehicleFinancialFlow {
  costs: {
    purchase: number;
    transport: number;
    additional: number;
    total: number;
  };
  parts: {
    countTotal: number;
    countSold: number;
    countInStock: number;
    revenueSold: number;
    valueInStock: number;
  };
  scrap: {
    weightKg: number;
    ratePerKg: number;
    estimatedValue: number;
    totalScrapValue: number;
  };
  revenue: {
    realized: number;
    projected: number;
  };
  profit: {
    realizedNet: number;
    projectedNet: number;
    roiPercent: number;
    marginPercent: number;
  };
}

/**
 * 2. ŚLEDZENIE HISTORII CZĘŚCI (AUDIT TRAIL)
 * Cykl: DEMONTAŻ → MAGAZYN → REGAŁ → WYSTAWIENIE → REZERWACJA → SPRZEDAŻ → POBRANIE → WYSYŁKA
 */
export type PartLifecycleStep =
  | "DEMONTAŻ"
  | "MAGAZYN"
  | "REGAŁ"
  | "WYSTAWIENIE"
  | "ZMIANA_CENY"
  | "REZERWACJA"
  | "SPRZEDAŻ"
  | "POBRANIE"
  | "WYSYŁKA";

export interface PartHistoryLog {
  id: string | number;
  partId: string;
  action: PartLifecycleStep | string;
  timestamp: string;
  userId?: string;
  userName: string;
  details: string; // np. "Przypisano regał MAG 14 przez Jan Nowak"
  metadata?: {
    previousLocation?: string;
    newLocation?: string;
    orderId?: string;
    orderNumber?: string;
    platform?: string;
    price?: number;
    buyer?: string;
  };
}

/**
 * 3. CENTRUM ZAMÓWIEŃ I PICKING MAGAZYNIERA
 */
export interface OrderItemPicking {
  partId: string;
  name: string;
  oem?: string;
  rackLocation: string; // np. "MAG 14"
  priceGross: number;
  barcode?: string;
  isPicked?: boolean;
  pickedAt?: string;
}

export interface WmsOrder {
  id: string; // np. "ORD-12345"
  orderNumber: string; // np. "#UK-2026/094"
  source: "allegro" | "shopgold" | "baselinker" | "phone" | "direct_sale";
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  deliveryAddress?: string;
  items: OrderItemPicking[];
  totalGross: number;
  paymentStatus: "paid" | "cod" | "pending";
  pickingStatus: "pending" | "in_picking" | "picked" | "packed" | "shipped";
  assignedPickerId?: string;
  assignedPickerName?: string;
  shippingCarrier?: "InPost Paczkomat" | "DPD" | "Pocztex" | "Odbiór osobisty" | string;
  trackingNumber?: string;
  createdAt: string;
  pickedAt?: string;
  shippedAt?: string;
  notes?: string;
}

/**
 * 4. MARTWY MAGAZYN (WIEKOWANIE ASORTYMENTU)
 * Przedziały: 0–30 dni, 31–90 dni, 91–180 dni, 181–365 dni, 365+ dni
 */
export type DeadStockAgeRange = "0-30" | "31-90" | "91-180" | "181-365" | "365+";

export interface DeadStockBucket {
  rangeKey: DeadStockAgeRange;
  rangeLabel: "0–30 dni" | "31–90 dni" | "91–180 dni" | "181–365 dni" | "365+ dni";
  partsCount: number;
  totalMarketValuePln: number;
  totalCostBasisPln: number;
  parts: Array<{
    id: string;
    name: string;
    oem?: string;
    rackLocation?: string;
    daysInWarehouse: number;
    priceGross: number;
    costBasis: number;
  }>;
}

export interface DeadStockReport {
  totalInventoryCount: number;
  totalInventoryValuePln: number;
  deadStockValuePln: number; // suma 91+ dni
  buckets: Record<DeadStockAgeRange, DeadStockBucket>;
}

/**
 * 5. AI PRICING (INTELIGENTNA WYCENA CZĘŚCI)
 * Parametry: MOJA CENA / CENA SUGEROWANA / MINIMUM / OPTYMALNA / PEWNOŚĆ
 */
export interface AiPricingAnalysis {
  partId?: string;
  oemNumber?: string;
  partName: string;
  myPrice: number;
  suggestedPrice: number;
  minPrice: number;
  optimalPrice: number;
  confidenceScore: number; // 0-100%
  marketDataPointsCount: number;
  factors: {
    oemMatch: boolean;
    conditionGrade: string; // np. "GVO A (Idealny)"
    demandTrend: "bardzo_wysoki" | "wysoki" | "sredni" | "niski";
    historicalSalesCount: number;
    averageMarketPrice: number;
    minMarketPrice: number;
    maxMarketPrice: number;
  };
  recommendationReasoning: string;
}

/**
 * 6. PRACOWNICY I ROZLICZENIE PROWIZJI
 */
export interface EmployeePerformance {
  workerId: string;
  workerName: string;
  role: "mechanic" | "warehouseman" | "salesman" | "admin";
  partsDismantledCount: number;
  partsSoldCount: number;
  totalSalesVolume: number;
  totalNetProfitGenerated: number;
  commissionRatePercent: number; // np. 5%
  commissionEarned: number;
  bonusAmount: number;
  totalPayoutPln: number;
  month: string; // "2026-09"
}

/**
 * 7. INTELIGENTNE ALERTY WMS
 * Reguły specjalne: nie traktować automatycznie każdej pojedynczej używanej części jako problemu niskiego stanu!
 */
export type WmsAlertType =
  | "last_unit" // Ostatnia sztuka z rzadkiego modelu (info)
  | "dead_stock" // Część leży >180 dni bez rotacji (uwaga na zamrożony kapitał)
  | "unlisted_part" // Część w magazynie bez oferty Allegro/ShopGold
  | "outdated_price" // Cena nieaktualizowana od >90 dni w relacji do rynku
  | "missing_rack" // Część oznaczona jako dostępna, ale bez wpisanego regału
  | "sold_still_active" // Część sprzedana, ale wciąż widoczna jako dostępna w kanale
  | "sync_conflict"; // Rozbieżność stanów między WMS a platformą zewnętrzną

export interface WmsSmartAlert {
  id: string;
  type: WmsAlertType;
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  partId?: string;
  vehicleId?: string;
  orderId?: string;
  suggestedAction?: string;
  actionTab?: ActiveTabType;
  createdAt: string;
  isResolved?: boolean;
}


