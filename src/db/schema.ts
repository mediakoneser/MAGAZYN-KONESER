import { pgTable, serial, text, integer, timestamp, doublePrecision, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users table (synced with Firebase Auth UID or internal staff directory)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(), // Firebase Auth UID
  email: text("email").notNull(),
  name: text("name"),
  role: text("role").default("mechanic"), // 'szef' | 'magazynier' | 'mechanik' | 'sprzedawca'
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Vehicles table (Pojazdy dawcy / Karta Pojazdu)
export const vehicles = pgTable("vehicles", {
  id: text("id").primaryKey(), // np. "VEH_2026_001" lub UUID
  internalNumber: text("internal_number").notNull().unique(), // np. "2026/001" lub "KONESER-2026/01"
  vin: text("vin"),
  brand: text("brand").notNull(), // np. "Audi", "BMW", "Volkswagen"
  model: text("model").notNull(), // np. "A4 B8", "Passat B5 FL"
  generation: text("generation"), // np. "B8", "FL"
  year: text("year"), // np. "2011"
  engineCode: text("engine_code"), // np. "CAGA", "1.9 TDI AVF"
  engineDisplacement: text("engine_displacement"), // np. "2.0 TDI"
  fuelType: text("fuel_type"), // "Diesel" | "Benzyna" | "Benzyna+LPG" | "Hybryda"
  paintCode: text("paint_code"), // np. "LY9B", "LB5N"
  mileageKm: integer("mileage_km"),
  
  // Koszty i Finanse
  purchasePricePln: doublePrecision("purchase_price_pln").default(0), // Cena zakupu wraku
  towTruckCostPln: doublePrecision("tow_truck_cost_pln").default(0), // Koszt transportu / lawety
  additionalCostsPln: doublePrecision("additional_costs_pln").default(0), // Inne koszty (mycie, opłaty, robocizna)
  totalCostPln: doublePrecision("total_cost_pln").default(0), // Suma kosztów
  
  // Złom i Recykling (BDO)
  scrapWeightKg: doublePrecision("scrap_weight_kg").default(0), // Waga karoserii po demontażu
  scrapRatePerKg: doublePrecision("scrap_rate_per_kg").default(0.85), // Stawka za kg złomu
  scrapEstimatedValuePln: doublePrecision("scrap_estimated_value_pln").default(0), // Wartość złomu
  catalystValuePln: doublePrecision("catalyst_value_pln").default(0), // Katalizator / DPF
  batteryValuePln: doublePrecision("battery_value_pln").default(0), // Akumulator
  
  // Status i Przypisanie
  dismantleStatus: text("dismantle_status").default("waiting"), // "waiting" | "in_progress" | "completed" | "scrapped"
  assignedWorkerId: text("assigned_worker_id"),
  assignedWorkerName: text("assigned_worker_name"),
  
  // Daty i media
  intakeDate: text("intake_date"), // Data przyjęcia auta
  dismantleStartDate: text("dismantle_start_date"),
  dismantleEndDate: text("dismantle_end_date"),
  photos: text("photos"), // JSON string of image URLs
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Parts table for WMS inventory
export const parts = pgTable("parts", {
  id: text("id").primaryKey(), // SKU or custom ID (np. "part_1741000000")
  userId: integer("user_id").references(() => users.id),
  vehicleId: text("vehicle_id").references(() => vehicles.id), // Klucz obcy do pojazdu dawcy
  sku: text("sku").notNull(),
  barcode: text("barcode"), // Kod kreskowy KNS-XXXXX
  qrCode: text("qr_code"),
  name: text("name").notNull(),
  brand: text("brand").notNull(),
  model: text("model"),
  year: text("year"),
  oemNumber: text("oem_number"),
  alternativeOems: text("alternative_oems"), // JSON string or comma-separated
  compatibilityList: text("compatibility_list"), // JSON string of compatible vehicles
  vin: text("vin"),
  category: text("category"),
  condition: text("condition"), // "A_EXCELLENT" | "B_VERY_GOOD" | "C_GOOD" | "D_FOR_REPAIR"
  
  // Lokalizacja regałowa WMS
  rack: text("rack"), // np. "MAG 14", "REG-A-03"
  shelf: text("shelf"), // Półka / poziom
  
  // Finanse części i pro-rata kosztu pojazdu
  allocatedCostBasis: doublePrecision("allocated_cost_basis").default(0), // Proporcjonalna część kosztu zakupu auta
  pricePln: integer("price_pln"), // Cena bazowa brutto
  salePriceNet: doublePrecision("sale_price_net"),
  salePriceGross: doublePrecision("sale_price_gross"),
  soldPrice: doublePrecision("sold_price"),
  
  // Statusy i kanały sprzedaży
  status: text("status").default("in_stock"), // "in_stock" | "reserved" | "sold" | "scrapped" | "damaged"
  isListedAllegro: boolean("is_listed_allegro").default(false),
  isListedShopGold: boolean("is_listed_shopgold").default(false),
  isListedBaseLinker: boolean("is_listed_baselinker").default(false),
  allegroOfferId: text("allegro_offer_id"),
  shopGoldProductId: text("shopgold_product_id"),
  
  // Wiekowanie (Martwy Magazyn)
  daysInWarehouse: integer("days_in_warehouse").default(0),
  ageGroup: text("age_group").default("0-30"), // "0-30" | "31-90" | "91-180" | "181-365" | "365+"
  
  // Pracownik demontażu i magazynier
  dismantledByWorker: text("dismantled_by_worker"),
  dismantledAt: text("dismantled_at"),
  pickedByWorker: text("picked_by_worker"),
  pickedAt: text("picked_at"),
  
  // Sprzedaż i rezerwacje
  reservedAt: text("reserved_at"),
  reservedBy: text("reserved_by"),
  soldAt: text("sold_at"),
  soldTo: text("sold_to"),
  
  // Integracja Google Drive
  drivePdfUrl: text("drive_pdf_url"),
  driveFileId: text("drive_file_id"),
  driveFolder: text("drive_folder"),
  
  description: text("description"),
  photos: text("photos"), // JSON string of photo URLs
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Part History Logs table (Śledzenie całego cyklu: DEMONTAŻ → MAGAZYN → REGAŁ → WYSTAWIENIE → REZERWACJA → SPRZEDAŻ → POBRANIE → WYSYŁKA)
export const partHistoryLogs = pgTable("part_history_logs", {
  id: serial("id").primaryKey(),
  partId: text("part_id").notNull().references(() => parts.id),
  action: text("action").notNull(), // 'DEMONTAŻ' | 'LOKALIZACJA' | 'PRZENIESIENIE' | 'WYSTAWIENIE' | 'ZMIANA_CENY' | 'REZERWACJA' | 'SPRZEDAŻ' | 'POBRANIE' | 'WYSYŁKA'
  userId: text("user_id"),
  userName: text("user_name"),
  details: text("details").notNull(),
  metadataJson: text("metadata_json"), // JSON string
  createdAt: timestamp("created_at").defaultNow(),
});

// Orders table for WMS Orders & Picking Station
export const orders = pgTable("orders", {
  id: text("id").primaryKey(), // np. "ORD_12345" lub numer Allegro
  orderNumber: text("order_number").notNull().unique(), // np. "#UK-2026/094"
  source: text("source").notNull(), // 'allegro' | 'shopgold' | 'baselinker' | 'phone' | 'direct_sale'
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  deliveryAddress: text("delivery_address"),
  
  itemsJson: text("items_json").notNull(), // JSON list: [{ partId, name, oem, rackLocation, priceGross, isPicked }]
  totalGross: doublePrecision("total_gross").default(0),
  paymentStatus: text("payment_status").default("pending"), // 'paid' | 'cod' | 'pending'
  
  // Cykl kompletacji magazynowej (Picking)
  pickingStatus: text("picking_status").default("pending"), // 'pending' | 'in_picking' | 'picked' | 'packed' | 'shipped'
  assignedPickerId: text("assigned_picker_id"),
  assignedPickerName: text("assigned_picker_name"),
  
  // Wysyłka i przewoźnik
  shippingCarrier: text("shipping_carrier"), // 'InPost Paczkomat' | 'DPD' | 'Pocztex' | 'Odbiór osobisty'
  trackingNumber: text("tracking_number"),
  
  createdAt: timestamp("created_at").defaultNow(),
  pickedAt: timestamp("picked_at"),
  shippedAt: timestamp("shipped_at"),
});

// Employee Performance & Commissions (Prowizje i wyniki pracowników)
export const employeeCommissions = pgTable("employee_commissions", {
  id: serial("id").primaryKey(),
  workerId: text("worker_id").notNull(),
  workerName: text("worker_name").notNull(),
  role: text("role").notNull(), // 'mechanic' | 'warehouseman' | 'salesman'
  month: text("month").notNull(), // np. "2026-09"
  partsDismantledCount: integer("parts_dismantled_count").default(0),
  partsSoldCount: integer("parts_sold_count").default(0),
  totalSalesVolume: doublePrecision("total_sales_volume").default(0),
  totalNetProfitGenerated: doublePrecision("total_net_profit_generated").default(0),
  commissionRatePercent: doublePrecision("commission_rate_percent").default(0),
  commissionEarned: doublePrecision("commission_earned").default(0),
  bonusAmount: doublePrecision("bonus_amount").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// External catalog queries cache (TecDoc, autokey, VIN lookups)
export const externalCatalogQueries = pgTable("external_catalog_queries", {
  id: serial("id").primaryKey(),
  queryType: text("query_type").notNull(), // 'vin' | 'oem'
  queryValue: text("query_value").notNull(),
  source: text("source").notNull(), // 'tecdoc' | 'autokey' | 'internal'
  resultData: text("result_data").notNull(), // JSON string
  createdAt: timestamp("created_at").defaultNow(),
});

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
  parts: many(parts),
}));

export const vehiclesRelations = relations(vehicles, ({ many }) => ({
  parts: many(parts),
}));

export const partsRelations = relations(parts, ({ one, many }) => ({
  user: one(users, {
    fields: [parts.userId],
    references: [users.id],
  }),
  vehicle: one(vehicles, {
    fields: [parts.vehicleId],
    references: [vehicles.id],
  }),
  historyLogs: many(partHistoryLogs),
}));

export const partHistoryLogsRelations = relations(partHistoryLogs, ({ one }) => ({
  part: one(parts, {
    fields: [partHistoryLogs.partId],
    references: [parts.id],
  }),
}));

