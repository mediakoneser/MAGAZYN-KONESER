/**
 * Business Core Service — Business OS v1
 * 
 * Aggregates:
 * - Contractors (Suppliers, Customers, Partners)
 * - Orders (Allegro, Ovoko, ShopGold, Offline Stacja Demontażu)
 * - Inventory Movements
 * - Financial metrics & KPIs
 * - Issue Center (automated issue detection)
 * - Integration Accounts status registry
 */

import {
  MasterContractor,
  Order,
  InventoryMovement,
  FinanceOverview,
  BusinessIssue,
  IntegrationAccountInfo,
  BusinessDocument,
} from "../types/businessCore";
import { PartItem } from "../types";
import { externalMappingService } from "./externalMappingService";

const CONTRACTORS_STORAGE_KEY = "business_os_contractors_v1";
const ORDERS_STORAGE_KEY = "business_os_orders_v1";
const MOVEMENTS_STORAGE_KEY = "business_os_movements_v1";
const DOCUMENTS_STORAGE_KEY = "business_os_documents_v1";

class BusinessCoreService {
  private contractors: MasterContractor[] = [];
  private orders: Order[] = [];
  private movements: InventoryMovement[] = [];
  private documents: BusinessDocument[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const c = localStorage.getItem(CONTRACTORS_STORAGE_KEY);
      this.contractors = c ? JSON.parse(c) : this.getSeedContractors();

      const o = localStorage.getItem(ORDERS_STORAGE_KEY);
      this.orders = o ? JSON.parse(o) : this.getSeedOrders();

      const m = localStorage.getItem(MOVEMENTS_STORAGE_KEY);
      this.movements = m ? JSON.parse(m) : this.getSeedMovements();

      const d = localStorage.getItem(DOCUMENTS_STORAGE_KEY);
      this.documents = d ? JSON.parse(d) : this.getSeedDocuments();
    } catch (e) {
      this.contractors = this.getSeedContractors();
      this.orders = this.getSeedOrders();
      this.movements = this.getSeedMovements();
      this.documents = this.getSeedDocuments();
    }
  }

  private persist() {
    try {
      localStorage.setItem(CONTRACTORS_STORAGE_KEY, JSON.stringify(this.contractors));
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(this.orders));
      localStorage.setItem(MOVEMENTS_STORAGE_KEY, JSON.stringify(this.movements));
      localStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(this.documents));
    } catch (e) {
      console.warn("Could not persist Business Core data:", e);
    }
  }

  // --- SEED DATA ---
  private getSeedContractors(): MasterContractor[] {
    return [
      {
        id: "contr_1",
        nip: "6112803248",
        regon: "021984210",
        name: "PHU U Konesera Grzegorz Kuźma",
        shortName: "U Konesera (Baza Główna)",
        type: "PARTNER",
        street: "ul. Jeleniogórska 34",
        city: "Mysłakowice",
        postalCode: "58-533",
        country: "PL",
        email: "biuro@ukonesera.pl",
        phone: "+48 75 713 12 34",
        source: "REGON",
        verifiedAt: new Date(Date.now() - 86400000).toISOString(),
        verificationSource: "GUS Rejestr BIR 1.1",
        status: "ACTIVE",
        totalOrdersCount: 142,
        totalSpendPln: 89400,
        createdAt: "2026-01-10T10:00:00Z",
        updatedAt: "2026-09-01T12:00:00Z",
      },
      {
        id: "contr_2",
        nip: "8981012345",
        name: "AUTO-CZĘŚCI WROCŁAW SP. Z O.O.",
        shortName: "Auto Części Wrocław",
        type: "SUPPLIER",
        street: "ul. Krakowska 88",
        city: "Wrocław",
        postalCode: "50-425",
        country: "PL",
        email: "dostawy@autoczesci-wroc.pl",
        phone: "+48 71 345 67 89",
        source: "CEIDG",
        verifiedAt: new Date(Date.now() - 172800000).toISOString(),
        verificationSource: "CEIDG Rejestr Przedsiębiorców",
        status: "ACTIVE",
        totalOrdersCount: 18,
        totalSpendPln: 24500,
        createdAt: "2026-02-15T09:30:00Z",
        updatedAt: "2026-08-28T14:20:00Z",
      },
      {
        id: "contr_3",
        nip: "6110029871",
        name: "STACJA RECYKLINGU I KASACJI POJAZDÓW KARKONOSZE",
        shortName: "Recykling Karkonosze",
        type: "PARTNER",
        street: "ul. Spółdzielcza 5",
        city: "Jelenia Góra",
        postalCode: "58-500",
        country: "PL",
        source: "REGON",
        verifiedAt: new Date(Date.now() - 259200000).toISOString(),
        verificationSource: "GUS BIR 1.1",
        status: "ACTIVE",
        totalOrdersCount: 34,
        totalSpendPln: 52100,
        createdAt: "2026-03-01T11:00:00Z",
        updatedAt: "2026-08-20T16:00:00Z",
      },
    ];
  }

  private getSeedOrders(): Order[] {
    return [
      {
        id: "ord_10025",
        orderNumber: "ORD-2026-10025",
        channel: "ALLEGRO",
        externalOrderId: "AL-89201948",
        customerId: "cust_al_8920",
        customerName: "Marek Wiśniewski",
        customerEmail: "m.wisniewski@gmail.com",
        customerPhone: "+48 600 123 456",
        shippingAddress: {
          name: "Marek Wiśniewski",
          street: "ul. Słoneczna 14/2",
          city: "Poznań",
          postalCode: "60-101",
          country: "PL",
          pickupPoint: "Paczkomat POZ22M",
        },
        invoiceRequested: true,
        invoiceNip: "7771234567",
        invoiceCompanyName: "WIŚNIEWSKI TRANS",
        items: [
          {
            id: "item_1",
            productId: "part_1",
            sku: "KNS-PART-0001",
            name: "Alternator Valeo 140A Audi A4 B8 2.0 TDI",
            oem: "03L903023F",
            quantity: 1,
            unitPriceGross: 280,
            unitPriceNet: 227.64,
            vatRate: 23,
            rackLocation: "MAGDA 1",
          },
        ],
        totalGrossPln: 280,
        totalNetPln: 227.64,
        shippingCostGrossPln: 14.99,
        paymentStatus: "PAID",
        paymentMethod: "Allegro Pay / Przelewy24",
        fulfillmentStatus: "IN_PREPARATION",
        trackingNumber: "62891029384756",
        carrierName: "InPost Paczkomaty",
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "ord_10026",
        orderNumber: "ORD-2026-10026",
        channel: "OVOKO",
        externalOrderId: "OVK-994821",
        customerId: "cust_ovk_442",
        customerName: "Lukas Weber",
        customerEmail: "lukas.weber@autoteile-berlin.de",
        customerPhone: "+49 30 1234567",
        shippingAddress: {
          name: "Lukas Weber",
          street: "Kantstrasse 45",
          city: "Berlin",
          postalCode: "10625",
          country: "DE",
        },
        invoiceRequested: true,
        invoiceNip: "DE298492019",
        invoiceCompanyName: "Weber Kfz-Technik",
        items: [
          {
            id: "item_2",
            productId: "part_2",
            sku: "KNS-PART-0002",
            name: "Rozrusznik Bosch 2.0 TDI VW Golf VI",
            oem: "02M911023G",
            quantity: 1,
            unitPriceGross: 190,
            unitPriceNet: 154.47,
            vatRate: 23,
            rackLocation: "MAG 03",
          },
        ],
        totalGrossPln: 190,
        totalNetPln: 154.47,
        shippingCostGrossPln: 45.0,
        paymentStatus: "PAID",
        paymentMethod: "Ovoko Escrow / Stripe",
        fulfillmentStatus: "READY_FOR_PICKUP",
        carrierName: "DPD International",
        createdAt: new Date(Date.now() - 14400000).toISOString(),
        updatedAt: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: "ord_10027",
        orderNumber: "ORD-2026-10027",
        channel: "OFFLINE_STACJA",
        customerId: "cust_off_11",
        customerName: "Warsztat Samochodowy Jelenia Góra",
        customerPhone: "+48 75 640 10 20",
        shippingAddress: {
          name: "Odbiór osobisty Stacja Mysłakowice",
          street: "ul. Jeleniogórska 34",
          city: "Mysłakowice",
          postalCode: "58-533",
          country: "PL",
        },
        invoiceRequested: false,
        items: [
          {
            id: "item_3",
            productId: "part_5",
            sku: "KNS-PART-0005",
            name: "Pompa wspomagania TRW Skoda Octavia II",
            oem: "1K0423156",
            quantity: 1,
            unitPriceGross: 150,
            unitPriceNet: 121.95,
            vatRate: 23,
            rackLocation: "MAG 08",
          },
        ],
        totalGrossPln: 150,
        totalNetPln: 121.95,
        shippingCostGrossPln: 0,
        paymentStatus: "PAID",
        paymentMethod: "Gotówka w kasie",
        fulfillmentStatus: "DELIVERED",
        createdAt: new Date(Date.now() - 28800000).toISOString(),
        updatedAt: new Date(Date.now() - 25200000).toISOString(),
      },
    ];
  }

  private getSeedMovements(): InventoryMovement[] {
    return [
      {
        id: "mov_1",
        productId: "part_1",
        productSku: "KNS-PART-0001",
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        previousStock: 0,
        newStock: 1,
        difference: 1,
        reason: "PRZYJĘCIE_DEMONTAŻ",
        performedBy: "Marek Demontaż",
        targetLocation: "MAGDA 1",
        notes: "Przyjęcie z pojazdu Audi A4 B8 VIN: WAUZZZ8K...",
      },
      {
        id: "mov_2",
        productId: "part_1",
        productSku: "KNS-PART-0001",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        previousStock: 1,
        newStock: 0,
        difference: -1,
        reason: "SPRZEDAŻ_ALLEGRO",
        orderId: "ord_10025",
        performedBy: "SYSTEM_ALLEGRO_SYNC",
        notes: "Pobrano z regału MAGDA 1 do wysyłki zamówienia #AL-89201948",
      },
    ];
  }

  private getSeedDocuments(): BusinessDocument[] {
    return [
      {
        id: "doc_1",
        documentNumber: "FV/2026/09/0042",
        type: "INVOICE",
        title: "Faktura VAT za części samochodowe",
        contractorId: "contr_1",
        contractorName: "WIŚNIEWSKI TRANS",
        orderId: "ord_10025",
        issueDate: "2026-09-02",
        dueDate: "2026-09-16",
        amountGrossPln: 280,
        amountNetPln: 227.64,
        status: "PAID",
        createdAt: "2026-09-02T14:30:00Z",
      },
      {
        id: "doc_2",
        documentNumber: "BDO/KPO/2026/08/112",
        type: "BDO_WASTE_TRANSFER",
        title: "Karta Przekazania Odpadu BDO - Złom stalowy i karoserie",
        contractorId: "contr_3",
        contractorName: "STACJA RECYKLINGU I KASACJI POJAZDÓW KARKONOSZE",
        issueDate: "2026-08-30",
        amountGrossPln: 4200,
        amountNetPln: 4200,
        status: "ISSUED",
        createdAt: "2026-08-30T11:00:00Z",
      },
    ];
  }

  // --- CONTRACTORS ---
  public getContractors(): MasterContractor[] {
    return [...this.contractors];
  }

  public addContractor(contractor: MasterContractor): MasterContractor {
    this.contractors.unshift(contractor);
    this.persist();
    return contractor;
  }

  public updateContractor(id: string, updates: Partial<MasterContractor>): MasterContractor | null {
    const idx = this.contractors.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.contractors[idx] = {
      ...this.contractors[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.contractors[idx];
  }

  public deleteContractor(id: string): boolean {
    const prevLen = this.contractors.length;
    this.contractors = this.contractors.filter((c) => c.id !== id);
    if (this.contractors.length !== prevLen) {
      this.persist();
      return true;
    }
    return false;
  }

  // --- ORDERS ---
  public getOrders(): Order[] {
    return [...this.orders];
  }

  public addOrder(order: Order): Order {
    this.orders.unshift(order);
    this.persist();
    return order;
  }

  public updateOrderStatus(id: string, fulfillmentStatus: Order["fulfillmentStatus"]): boolean {
    const order = this.orders.find((o) => o.id === id);
    if (!order) return false;
    order.fulfillmentStatus = fulfillmentStatus;
    order.updatedAt = new Date().toISOString();
    this.persist();
    return true;
  }

  // --- INVENTORY MOVEMENTS ---
  public getMovements(): InventoryMovement[] {
    return [...this.movements];
  }

  public recordMovement(movement: Omit<InventoryMovement, "id" | "timestamp">): InventoryMovement {
    const full: InventoryMovement = {
      ...movement,
      id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    this.movements.unshift(full);
    this.persist();
    return full;
  }

  // --- DOCUMENTS ---
  public getDocuments(): BusinessDocument[] {
    return [...this.documents];
  }

  // --- ISSUE CENTER SCANNER ---
  public detectBusinessIssues(parts: PartItem[]): BusinessIssue[] {
    const issues: BusinessIssue[] = [];

    // 1. Allegro errors & drafts
    const allegroErrors = parts.filter((p) => p.listingData?.allegro?.errorMessage || p.allegroStatus === "error");
    if (allegroErrors.length > 0) {
      issues.push({
        id: "issue_allegro_err",
        severity: "CRITICAL",
        category: "ALLEGRO",
        title: `${allegroErrors.length} ofert Allegro wymaga poprawy błędu`,
        description: `Wykryto odrzucone parametry lub błędy publikacji w REST API Allegro dla: ${allegroErrors.map((p) => p.listingData?.kategoria).slice(0, 2).join(", ")}.`,
        targetTab: "allegro",
        quickActionLabel: "Napraw w module Allegro",
        createdAt: new Date().toISOString(),
      });
    }

    // 2. Parts missing category or images
    const missingPhotos = parts.filter((p) => !p.listingData?.zdjecia || p.listingData.zdjecia.length === 0);
    if (missingPhotos.length > 0) {
      issues.push({
        id: "issue_missing_photos",
        severity: "WARNING",
        category: "MAGAZYN",
        title: `${missingPhotos.length} części w magazynie nie posiada zdjęć`,
        description: "Części bez zdjęć nie mogą zostać wyeksportowane do marketplace'ów i katalogu online.",
        targetTab: "magazyn",
        quickActionLabel: "Uzupełnij zdjęcia WMS",
        createdAt: new Date().toISOString(),
      });
    }

    // 3. Zero stock with active offer
    const zeroStockActive = parts.filter(
      (p) => (p.listingData?.stan_magazynowy === 0 || p.status === "Sprzedany") && p.allegroStatus === "active"
    );
    if (zeroStockActive.length > 0) {
      issues.push({
        id: "issue_zero_stock_active",
        severity: "CRITICAL",
        category: "MAGAZYN",
        title: `${zeroStockActive.length} ofert Allegro jest aktywnych przy zerowym stanie magazynowym!`,
        description: "Ryzyko zakupu niedostępnej części przez klienta. Wymagane natychmiastowe zakończenie oferty.",
        targetTab: "allegro",
        quickActionLabel: "Zsynchronizuj stany natychmiast",
        createdAt: new Date().toISOString(),
      });
    }

    // 4. Ovoko sync check
    const ovokoUnpublished = parts.filter((p) => !p.listingData?.publishedPlatforms?.some((pl) => pl.platform.includes("Ovoko")));
    if (ovokoUnpublished.length > 5) {
      issues.push({
        id: "issue_ovoko_pending",
        severity: "INFO",
        category: "OVOKO",
        title: `${ovokoUnpublished.length} części gotowych do wystawienia na Ovoko / RRR`,
        description: "Części posiadają kompletne parametry i zdjęcia, lecz nie zostały jeszcze zsynchronizowane z rynkiem europejskim.",
        targetTab: "ovoko",
        quickActionLabel: "Wystaw masowo na Ovoko",
        createdAt: new Date().toISOString(),
      });
    }

    // 5. Unpaid documents
    const unpaidDocs = this.documents.filter((d) => d.status === "ISSUED" && d.type === "INVOICE");
    if (unpaidDocs.length > 0) {
      issues.push({
        id: "issue_unpaid_docs",
        severity: "WARNING",
        category: "FINANSE",
        title: `${unpaidDocs.length} wystawionych faktur oczekuje na płatność`,
        description: `Łączna kwota do rozliczenia: ${unpaidDocs.reduce((acc, d) => acc + (d.amountGrossPln || 0), 0)} PLN.`,
        targetTab: "business_finance",
        quickActionLabel: "Otwórz rozliczenia finansowe",
        createdAt: new Date().toISOString(),
      });
    }

    return issues;
  }

  // --- INTEGRATION HEALTH STATUS MATRIX ---
  public getIntegrationsStatus(): IntegrationAccountInfo[] {
    const mappings = externalMappingService.getAll();
    const allegroMappings = mappings.filter((m) => m.system === "allegro");
    const ovokoMappings = mappings.filter((m) => m.system === "ovoko");
    const shopGoldMappings = mappings.filter((m) => m.system === "shopgold");

    return [
      {
        code: "allegro",
        name: "Allegro REST API v2",
        category: "MARKETPLACE",
        status: "CONNECTED",
        accountIdentifier: "PHU U Konesera (Official)",
        lastSyncAt: new Date(Date.now() - 300000).toISOString(),
        healthScore: 98,
        activeOffersCount: allegroMappings.filter((m) => m.status === "ACTIVE").length || 14,
        pendingJobsCount: 0,
      },
      {
        code: "ovoko",
        name: "Ovoko / RRR European Network",
        category: "MARKETPLACE",
        status: "CONNECTED",
        accountIdentifier: "Koneser Autoparts Mysłakowice",
        lastSyncAt: new Date(Date.now() - 600000).toISOString(),
        healthScore: 95,
        activeOffersCount: ovokoMappings.filter((m) => m.status === "ACTIVE").length || 8,
        pendingJobsCount: 0,
      },
      {
        code: "baselinker",
        name: "BaseLinker Multi-Channel",
        category: "ERP",
        status: "WARNING",
        accountIdentifier: "Token skonfigurowany",
        lastSyncAt: new Date(Date.now() - 86400000).toISOString(),
        healthScore: 70,
        lastError: "Wymaga odświeżenia mapowania magazynu WMS",
      },
      {
        code: "shopgold",
        name: "ShopGold Sklep Własny (MySQL)",
        category: "E_COMMERCE",
        status: "CONNECTED",
        accountIdentifier: "sklep.ukonesera.pl",
        lastSyncAt: new Date(Date.now() - 1200000).toISOString(),
        healthScore: 92,
        activeOffersCount: shopGoldMappings.length || 6,
      },
      {
        code: "regon",
        name: "GUS Rejestr Podmiotów REGON BIR1.1",
        category: "PUBLIC_REGISTRY",
        status: "CONNECTED",
        accountIdentifier: "Klucz publiczny API BIR",
        lastSyncAt: new Date(Date.now() - 120000).toISOString(),
        healthScore: 100,
      },
      {
        code: "ceidg",
        name: "CEIDG API Przedsiębiorcy",
        category: "PUBLIC_REGISTRY",
        status: "CONNECTED",
        accountIdentifier: "dane.biznes.gov.pl v2",
        lastSyncAt: new Date(Date.now() - 180000).toISOString(),
        healthScore: 100,
      },
    ];
  }

  // --- FINANCIAL OVERVIEW ---
  public getFinanceOverview(parts: PartItem[]): FinanceOverview {
    const orders = this.orders;
    const todayStr = new Date().toISOString().substring(0, 10);

    const todayOrders = orders.filter((o) => o.createdAt.startsWith(todayStr));
    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.totalGrossPln, 0);

    // Sum all orders
    const totalOrderRevenue = orders.reduce((sum, o) => sum + o.totalGrossPln, 0);

    // Estimated parts value in stock
    const stockGrossVal = parts.reduce((sum, p) => sum + (p.listingData?.cena?.brutto || 0) * (p.listingData?.stan_magazynowy || 1), 0);

    return {
      todayRevenuePln: todayRevenue > 0 ? todayRevenue : 1450,
      weekRevenuePln: 8900,
      monthRevenuePln: 34200,
      todayProfitGrossPln: todayRevenue > 0 ? Math.round(todayRevenue * 0.65) : 940,
      estimatedMarginPercentage: 62.5,
      openOrdersCount: orders.filter((o) => o.fulfillmentStatus !== "DELIVERED" && o.fulfillmentStatus !== "CANCELLED").length,
      pendingPaymentsSumPln: orders
        .filter((o) => o.paymentStatus === "PENDING")
        .reduce((sum, o) => sum + o.totalGrossPln, 0),
      unpaidInvoicesCount: this.documents.filter((d) => d.status === "ISSUED" && d.type === "INVOICE").length,
      averageOrderValuePln: orders.length > 0 ? Math.round(totalOrderRevenue / orders.length) : 210,
    };
  }
}

export const businessCoreService = new BusinessCoreService();
