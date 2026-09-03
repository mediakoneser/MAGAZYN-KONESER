import { PartItem, PartHistoryEntry, PartHistoryEventType, WarehouseRackInfo, ListingPlatform } from "../types";

/**
 * Predefined standard warehouse racks for PHU U Konesera
 */
export const STANDARD_WAREHOUSE_RACKS: WarehouseRackInfo[] = [
  {
    rackCode: "MAG 01",
    sector: "Sektor A1 - Silniki & Głowice",
    shelfLevel: "Poziom 1 (Posadzka / Palety)",
    capacityLimit: 12,
    description: "Ciężkie podzespoły mechaniczne, silniki kpl, bloki",
    qrCodeValue: "RACK:MAG 01",
    barcodeValue: "RACK-MAG-01",
  },
  {
    rackCode: "MAG 02",
    sector: "Sektor A2 - Skrzynie Biegów & Dyfry",
    shelfLevel: "Poziom 1 (Palety)",
    capacityLimit: 16,
    description: "Skrzynie manualne, automatyczne DSG, reduktory 4x4",
    qrCodeValue: "RACK:MAG 02",
    barcodeValue: "RACK-MAG-02",
  },
  {
    rackCode: "MAG 03",
    sector: "Sektor B1 - Turbosprężarki & Układ Dolotowy",
    shelfLevel: "Półka B2 (Wzmocniona)",
    capacityLimit: 25,
    description: "Turbiny Garret/KKK, kolektory, przepustnice",
    qrCodeValue: "RACK:MAG 03",
    barcodeValue: "RACK-MAG-03",
  },
  {
    rackCode: "MAG 12",
    sector: "Sektor B2 - Alternatory, Rozruszniki & Kompresory",
    shelfLevel: "Półka B3",
    capacityLimit: 30,
    description: "Osprzęt elektryczny silnika po testach",
    qrCodeValue: "RACK:MAG 12",
    barcodeValue: "RACK-MAG-12",
  },
  {
    rackCode: "MAG 14",
    sector: "Sektor C1 - Oświetlenie Przód / Tył",
    shelfLevel: "Półki C1-C3 (Pianka ochronna)",
    capacityLimit: 40,
    description: "Reflektory Xenon/LED, lampy zespolone tył",
    qrCodeValue: "RACK:MAG 14",
    barcodeValue: "RACK-MAG-14",
  },
  {
    rackCode: "MAG 24",
    sector: "Sektor D1 - Wnętrze & Deski Rozdzielcze",
    shelfLevel: "Półka D2",
    capacityLimit: 35,
    description: "Zegary, panele nawiewu, ramki, boczki",
    qrCodeValue: "RACK:MAG 24",
    barcodeValue: "RACK-MAG-24",
  },
  {
    rackCode: "MAG 30",
    sector: "Sektor D2 - Zespoły Pedałów, Dźwignie & Przełączniki",
    shelfLevel: "Półka D3",
    capacityLimit: 50,
    description: "Pedały, mechanizmy wycieraczek, manetki",
    qrCodeValue: "RACK:MAG 30",
    barcodeValue: "RACK-MAG-30",
  },
  {
    rackCode: "MAG 45",
    sector: "Sektor E1 - Sterowniki ECU, Moduły & BSI",
    shelfLevel: "Szafa ESD / Antystatyczna",
    capacityLimit: 60,
    description: "Sterowniki silnika, moduły komfortu, radary ACC",
    qrCodeValue: "RACK:MAG 45",
    barcodeValue: "RACK-MAG-45",
  },
  {
    rackCode: "MAG 70",
    sector: "Sektor E2 - Wtryskiwacze & Pompy CR",
    shelfLevel: "Szafa Precyzyjna",
    capacityLimit: 80,
    description: "Układy wtryskowe Bosch/Delphi/Siemens zabezpieczone olejem",
    qrCodeValue: "RACK:MAG 70",
    barcodeValue: "RACK-MAG-70",
  },
  {
    rackCode: "MAG 71",
    sector: "Sektor F1 - Kierownice & Pakiety Sport/M",
    shelfLevel: "Półka F2 (Pokrowce)",
    capacityLimit: 20,
    description: "Kierownice skórzane, dekory wnętrza, fotele",
    qrCodeValue: "RACK:MAG 71",
    barcodeValue: "RACK-MAG-71",
  },
  {
    rackCode: "MAG 72",
    sector: "Sektor F2 - Zawieszenie & Hamulce",
    shelfLevel: "Regał Ciężki",
    capacityLimit: 30,
    description: "Zaciski hamulcowe, zwrotnice, sanki, półosie",
    qrCodeValue: "RACK:MAG 72",
    barcodeValue: "RACK-MAG-72",
  },
  {
    rackCode: "MAG 99",
    sector: "Sektor K - Kwarantanna / Do weryfikacji",
    shelfLevel: "Kosz przyjęć",
    capacityLimit: 50,
    description: "Części oczekujące na test, mycie ultradźwiękowe lub wycenę",
    qrCodeValue: "RACK:MAG 99",
    barcodeValue: "RACK-MAG-99",
  },
];

/**
 * Generate a unique part barcode
 */
export function generatePartBarcode(partId: string): string {
  const cleanId = partId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return `KNS-${cleanId.slice(0, 10)}`;
}

/**
 * Generate formatted timestamp in Polish local format
 */
export function formatCurrentTimestamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min}`;
}

/**
 * Create a new history event for a part
 */
export function createHistoryEntry(
  eventType: PartHistoryEventType,
  authorName: string,
  details: string,
  options?: {
    previousLocation?: string;
    newLocation?: string;
    platform?: ListingPlatform;
    buyerInfo?: string;
    orderNumber?: string;
    salePricePln?: number;
    notes?: string;
    timestamp?: string;
  }
): PartHistoryEntry {
  return {
    id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: options?.timestamp || formatCurrentTimestamp(),
    eventType,
    authorName,
    details,
    previousLocation: options?.previousLocation,
    newLocation: options?.newLocation,
    platform: options?.platform,
    buyerInfo: options?.buyerInfo,
    orderNumber: options?.orderNumber,
    salePricePln: options?.salePricePln,
    notes: options?.notes,
  };
}

/**
 * Ensure a PartItem has complete history initialized if it was created earlier
 */
export function ensurePartCompleteHistory(part: PartItem): PartItem {
  const rack = part.listingData?.ocr_wyniki?.numer_magazynowy || part.currentRackLocation || "MAG 14";
  const worker = part.listingData?.workerName || part.dismantledByWorker || "Marek Demontaż";
  const vehicle = part.vehicleInternalNo || part.listingData?.samochod?.marka
    ? `${part.listingData?.samochod?.marka || ""} ${part.listingData?.samochod?.model || ""}`.trim()
    : "Pojazd ze stacji demontażu";
  const createdDate = part.createdAt || "2026-08-28 10:00";

  let logs = [...(part.historyLogs || [])];

  // If logs are empty, initialize the default lifecycle trail based on part status
  if (logs.length === 0) {
    // 1. Demontaż
    logs.push(
      createHistoryEntry(
        "DEMONTAŻ",
        worker,
        `Zdemontowano z pojazdu ${part.vehicleInternalNo || vehicle} (VIN: ${part.listingData?.samochod?.vin || "Sprawdzony w bazie"})`,
        { timestamp: createdDate }
      )
    );

    // 2. Odłożenie na regał
    logs.push(
      createHistoryEntry(
        "ODŁOŻENIE_NA_REGAŁ",
        worker,
        `Przyjęto na stan magazynu WMS i odłożono na regał ${rack}`,
        { newLocation: rack, timestamp: createdDate }
      )
    );

    // 3. Wystawienie oferty (Allegro / Ovoko)
    const platforms: ListingPlatform[] = ["Allegro", "ShopGold / Sklep Własny"];
    if (part.listingData?.allegro?.status === "active" || part.status === "Dostępny" || part.status === "Sprzedany") {
      logs.push(
        createHistoryEntry(
          "WYSTAWIENIE_OFERTY",
          "Katarzyna Sprzedaż",
          `Opublikowano ofertę w cenie ${part.listingData?.cena?.brutto || 120} zł`,
          {
            platform: "Allegro",
            timestamp: createdDate,
          }
        )
      );
    }

    // If reserved
    if (part.status === "Zarezerwowany") {
      logs.push(
        createHistoryEntry(
          "REZERWACJA",
          "Tomasz BOK",
          `Rezerwacja dla klienta telefonicznego (Kaucja 50 zł, odbiór osobisty)`,
          {
            buyerInfo: "Klient detaliczny (Jelenia Góra)",
            timestamp: "2026-08-29 14:10",
          }
        )
      );
    }

    // If sold
    if (part.status === "Sprzedany") {
      logs.push(
        createHistoryEntry(
          "SPRZEDAŻ",
          "Katarzyna Sprzedaż",
          `Sprzedano przez Allegro (Zamówienie #AL-${part.id.toUpperCase()}) za ${part.listingData?.cena?.brutto || 150} zł`,
          {
            platform: "Allegro",
            orderNumber: `AL-${part.id.toUpperCase()}`,
            salePricePln: part.listingData?.cena?.brutto || 150,
            buyerInfo: "P.H.U. Auto-Naprawa (Kraków)",
            timestamp: "2026-08-30 11:20",
          }
        )
      );
      logs.push(
        createHistoryEntry(
          "POBRANIE_Z_MAGAZYNU",
          "Marek Demontaż",
          `Pobrano z regału ${rack} i przekazano do strefy pakowania paczkomat/kurier DPD`,
          {
            previousLocation: rack,
            timestamp: "2026-08-30 12:00",
          }
        )
      );
    }
  }

  // Pre-fill platform listings if missing
  const publishedPlatforms = part.publishedPlatforms || [
    {
      platform: "Allegro",
      status: part.status === "Sprzedany" ? "Zakończona" : "Aktywna",
      offerId: part.allegroOfferId || `ALLEGRO-${part.id}`,
      url: part.allegroOfferUrl || `https://allegro.pl/oferta/auto-koneser-${part.id}`,
      publishedAt: createdDate,
      pricePln: part.listingData?.cena?.brutto || 100,
    },
    {
      platform: "ShopGold / Sklep Własny",
      status: part.status === "Sprzedany" ? "Zakończona" : "Aktywna",
      url: `https://czesci-koneser.pl/produkt/${part.id}`,
      publishedAt: createdDate,
      pricePln: part.listingData?.cena?.brutto || 100,
    },
    {
      platform: "Ovoko / RRR",
      status: part.status === "Sprzedany" ? "Zakończona" : "Aktywna",
      publishedAt: createdDate,
      pricePln: part.listingData?.cena?.brutto || 100,
    },
  ];

  return {
    ...part,
    barcode: part.barcode || generatePartBarcode(part.id),
    qrCode: part.qrCode || `PART:${part.id}`,
    currentRackLocation: rack,
    dismantledByWorker: worker,
    dismantledAt: part.dismantledAt || createdDate,
    historyLogs: logs,
    publishedPlatforms,
  };
}

/**
 * Relocate a part to a new rack, recording previous & new location in history
 */
export function relocatePart(
  part: PartItem,
  newRackCode: string,
  authorName: string,
  notes?: string
): PartItem {
  const previousRack = part.currentRackLocation || part.listingData?.ocr_wyniki?.numer_magazynowy || "MAG 14";
  const timestamp = formatCurrentTimestamp();

  const historyEntry = createHistoryEntry(
    "PRZENIESIENIE_REGAŁU",
    authorName,
    `Przeniesiono z regału ${previousRack} na ${newRackCode}${notes ? ` (${notes})` : ""}`,
    {
      previousLocation: previousRack,
      newLocation: newRackCode,
      notes,
      timestamp,
    }
  );

  const updatedLogs = [historyEntry, ...(part.historyLogs || [])];

  return {
    ...part,
    currentRackLocation: newRackCode,
    historyLogs: updatedLogs,
    listingData: {
      ...part.listingData,
      ocr_wyniki: {
        ...(part.listingData?.ocr_wyniki || { numer_magazynowy: newRackCode }),
        numer_magazynowy: newRackCode,
      },
    },
    updatedAt: timestamp,
  };
}

/**
 * Reserve a part with history log
 */
export function reservePart(
  part: PartItem,
  buyerInfo: string,
  authorName: string,
  notes?: string
): PartItem {
  const timestamp = formatCurrentTimestamp();
  const historyEntry = createHistoryEntry(
    "REZERWACJA",
    authorName,
    `Zarezerwowano dla: ${buyerInfo}${notes ? `. Uwagi: ${notes}` : ""}`,
    {
      buyerInfo,
      notes,
      timestamp,
    }
  );

  return {
    ...part,
    status: "Zarezerwowany",
    reservedAt: timestamp,
    reservedBy: buyerInfo,
    historyLogs: [historyEntry, ...(part.historyLogs || [])],
    updatedAt: timestamp,
  };
}

/**
 * Mark a part as sold and picked with history log
 */
export function sellAndPickPart(
  part: PartItem,
  orderNumber: string,
  buyerInfo: string,
  salePricePln: number,
  platform: ListingPlatform,
  authorName: string,
  autoPick = true
): PartItem {
  const timestamp = formatCurrentTimestamp();
  const currentRack = part.currentRackLocation || part.listingData?.ocr_wyniki?.numer_magazynowy || "MAG 14";

  const saleEntry = createHistoryEntry(
    "SPRZEDAŻ",
    authorName,
    `Sprzedano za kwotę ${salePricePln} zł na platformie ${platform}. Zamówienie: #${orderNumber}, Kupujący: ${buyerInfo}`,
    {
      platform,
      orderNumber,
      buyerInfo,
      salePricePln,
      timestamp,
    }
  );

  const newLogs = [saleEntry];

  if (autoPick) {
    const pickEntry = createHistoryEntry(
      "POBRANIE_Z_MAGAZYNU",
      authorName,
      `Pobrano część z regału ${currentRack} i przekazano do pakowania wysyłkowego`,
      {
        previousLocation: currentRack,
        timestamp,
      }
    );
    newLogs.unshift(pickEntry);
  }

  return {
    ...part,
    status: "Sprzedany",
    soldAt: timestamp,
    soldTo: buyerInfo,
    soldPrice: salePricePln,
    pickedFromRackAt: autoPick ? timestamp : undefined,
    pickedByWorker: autoPick ? authorName : undefined,
    ilosc: 0,
    historyLogs: [...newLogs, ...(part.historyLogs || [])],
    updatedAt: timestamp,
  };
}
