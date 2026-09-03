import { PartItem, PartListingData } from "../types";

export interface ShopGoldConfig {
  apiUrl: string; // e.g. "https://sklep.ukonesera.pl/api/v1"
  apiKey: string; // e.g. "sg_live_ukonesera_8492048204"
  apiSecret: string;
  storeName: string; // "PHU U Konesera - Sklep Części Samochodowych"
  storeUrl: string; // "https://sklep.ukonesera.pl"
  currency: string; // "PLN"
  defaultVat: number; // 23
  priceMarkupPercent: number; // 0, 5, 10, etc.
  autoSyncStock: boolean;
  categoryMappingMode: "brand_model" | "part_category" | "hierarchical";
  isConnected: boolean;
  lastConnectedAt?: string;
  lastSyncAt?: string;
  productsInShopCount?: number;
  ordersCount?: number;
}

export const defaultShopGoldConfig: ShopGoldConfig = {
  apiUrl: "https://sklep.ukonesera.pl/api/v1",
  apiKey: "sg_konesera_live_myslakowice_2026",
  apiSecret: "sec_9948271048201847192",
  storeName: "Sklep PHU U Konesera (ukonesera.pl)",
  storeUrl: "https://sklep.ukonesera.pl",
  currency: "PLN",
  defaultVat: 23,
  priceMarkupPercent: 0,
  autoSyncStock: true,
  categoryMappingMode: "hierarchical",
  isConnected: true,
  lastConnectedAt: "2026-09-01 10:15",
  lastSyncAt: "2026-09-01 10:15",
  productsInShopCount: 48,
  ordersCount: 12,
};

export interface ShopGoldProductPayload {
  id: string;
  sku: string; // Kod produktu / OEM
  oem_number: string;
  name: string;
  category_path: string;
  price_gross: number;
  price_net: number;
  vat_rate: number;
  stock_quantity: number;
  weight_kg: number;
  condition: string; // "Używany (Oryginał OE - Stan BDB)"
  quality_grade: string; // "A" | "A+" | "B"
  rack_location: string;
  car_brand: string;
  car_model: string;
  car_year: string;
  mounting_position: string;
  description_html: string;
  description_short: string;
  photos: string[];
  status: "active" | "hidden";
  warranty_days: number;
  dismantle_station: string;
}

export interface ShopGoldSyncResult {
  success: boolean;
  totalProcessed: number;
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  logs: string[];
  timestamp: string;
}

export interface ShopGoldOrder {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryCity: string;
  deliveryAddress: string;
  paymentMethod: "Przelew Online / BLIK" | "Płatność przy odbiorze (Pobranie)" | "Odbiór osobisty (Mysłakowice)";
  shippingMethod: "Kurier DPD / InPost (Części standardowe)" | "Kurier Gabaryt / Paleta" | "Odbiór osobisty w Mysłakowicach";
  status: "Nowe zamówienie" | "W trakcie kompletacji (WMS)" | "Wysłane" | "Odebrane / Zrealizowane" | "Anulowane";
  items: {
    partId: string;
    sku: string;
    name: string;
    carModel: string;
    priceGross: number;
    quantity: number;
    rackLocation: string;
  }[];
  totalAmountGross: number;
  createdAt: string;
}

export const mockShopGoldOrders: ShopGoldOrder[] = [
  {
    orderId: "sg_ord_10842",
    orderNumber: "SG/2026/08/10842",
    customerName: "Janusz Kowalczyk (Auto Serwis)",
    customerPhone: "+48 602 119 448",
    customerEmail: "serwis.kowalczyk@wp.pl",
    deliveryCity: "Jelenia Góra",
    deliveryAddress: "ul. Wolności 142/3",
    paymentMethod: "Przelew Online / BLIK",
    shippingMethod: "Odbiór osobisty w Mysłakowicach",
    status: "W trakcie kompletacji (WMS)",
    items: [
      {
        partId: "p_1",
        sku: "03G903023",
        name: "Alternator 140A Bosch VAG 1.9 / 2.0 TDI",
        carModel: "Volkswagen Passat B6",
        priceGross: 180,
        quantity: 1,
        rackLocation: "MAG 14",
      },
    ],
    totalAmountGross: 180,
    createdAt: "2026-09-01 08:30",
  },
  {
    orderId: "sg_ord_10841",
    orderNumber: "SG/2026/08/10841",
    customerName: "Tomasz Adamski",
    customerPhone: "+48 501 883 291",
    customerEmail: "tomasz.adamski@gmail.com",
    deliveryCity: "Wrocław",
    deliveryAddress: "ul. Powstańców Śląskich 28",
    paymentMethod: "Płatność przy odbiorze (Pobranie)",
    shippingMethod: "Kurier DPD / InPost (Części standardowe)",
    status: "Nowe zamówienie",
    items: [
      {
        partId: "p_2",
        sku: "6Y6945111",
        name: "Lampa tylna lewa Skoda Fabia I Kombi",
        carModel: "Skoda Fabia I",
        priceGross: 90,
        quantity: 1,
        rackLocation: "MAG 08",
      },
    ],
    totalAmountGross: 115, // 90 + 25 wysyłka pobraniowa
    createdAt: "2026-08-31 17:45",
  },
  {
    orderId: "sg_ord_10839",
    orderNumber: "SG/2026/08/10839",
    customerName: "Marek Wójcik",
    customerPhone: "+48 694 330 112",
    customerEmail: "m.wojcik@interia.pl",
    deliveryCity: "Kamienna Góra",
    deliveryAddress: "ul. Kościuszki 12",
    paymentMethod: "Przelew Online / BLIK",
    shippingMethod: "Kurier DPD / InPost (Części standardowe)",
    status: "Wysłane",
    items: [
      {
        partId: "p_3",
        sku: "1K0820803",
        name: "Kompresor klimatyzacji Sanden Denso VAG",
        carModel: "Volkswagen Golf V",
        priceGross: 260,
        quantity: 1,
        rackLocation: "MAG 22",
      },
    ],
    totalAmountGross: 279,
    createdAt: "2026-08-30 11:20",
  },
];

/**
 * Format listing data to ShopGold Product structure
 */
export function mapPartToShopGoldProduct(
  part: PartItem,
  markupPercent = 0
): ShopGoldProductPayload {
  const ld = part.listingData || ({} as PartListingData);
  const brand = ld.samochod?.marka || ld.marka || "Uniwersalna";
  const model = ld.samochod?.model || ld.model || "Część";
  const year = ld.samochod?.rocznik || ld.rocznik || "2000-2015";
  const cat = ld.kategoria || "Część samochodowa";
  const oem = ld.numery_czesci || ld.producent || "OEM";
  const rack = ld.ocr_wyniki?.numer_magazynowy || "MAG 01";

  const rawGross = Number(ld.cena?.brutto || 100);
  const calculatedGross =
    markupPercent > 0
      ? Math.round(rawGross * (1 + markupPercent / 100))
      : rawGross;
  const net = Math.round(calculatedGross / 1.23);

  const title = `${cat} ${brand} ${model} ${year} ${oem !== "OEM" ? `OE ${oem}` : ""}`.trim();
  const sku = (oem !== "OEM" && oem.length > 2) ? oem.split(/[\s,/]+/)[0] : `UK-${part.id.substring(0, 8).toUpperCase()}`;

  const descriptionHtml = `
<div class="shopgold-part-card">
  <h2>${title}</h2>
  <div class="part-badges">
    <span class="badge-station">Stacja Demontażu Pojazdów PHU U Konesera (Mysłakowice)</span>
    <span class="badge-gvo">Zgodność ze standardem GVO i GPSR UE 2023/988</span>
  </div>
  <table class="table-specs">
    <tr><th>Marka pojazdu:</th><td><strong>${brand}</strong></td></tr>
    <tr><th>Model / Generacja:</th><td>${model}</td></tr>
    <tr><th>Rocznik:</th><td>${year}</td></tr>
    <tr><th>Kategoria:</th><td>${cat}</td></tr>
    <tr><th>Pozycja montażowa:</th><td>${ld.pozycja_czesci || "Standardowa"}</td></tr>
    <tr><th>Numery katalogowe OEM:</th><td><strong>${oem}</strong></td></tr>
    <tr><th>Stan techniczny:</th><td>Używany, 100% sprawny, przetestowany przed demontażem</td></tr>
    <tr><th>Lokalizacja magazynowa:</th><td>Regał ${rack} (Mysłakowice, ul. Daszyńskiego 16G)</td></tr>
    <tr><th>Gwarancja rozruchowa:</th><td>14 dni gwarancji rozruchowej</td></tr>
  </table>
  <div class="part-description">
    <h3>Opis techniczny podzespołu:</h3>
    <p>${ld.opis || "Oryginalna część samochodowa z legalnej stacji recyklingu aut PHU U KONESERA. Sprawdzona, gotowa do montażu."}</p>
  </div>
  <div class="contact-info">
    <p>Masz pytania lub chcesz potwierdzić pasowanie po numerze VIN? Zadzwoń: <strong>533 533 443</strong></p>
  </div>
</div>
`.trim();

  return {
    id: part.id,
    sku,
    oem_number: oem,
    name: title,
    category_path: `${brand} > ${model} > ${cat}`,
    price_gross: calculatedGross,
    price_net: net,
    vat_rate: 23,
    stock_quantity: part.ilosc || ld.stan_magazynowy || 1,
    weight_kg: 2.5,
    condition: "Używany (Oryginał OE)",
    quality_grade: (ld.qualityGrade as string) || "A",
    rack_location: rack,
    car_brand: brand,
    car_model: model,
    car_year: year,
    mounting_position: ld.pozycja_czesci || "Standard",
    description_html: descriptionHtml,
    description_short: `${cat} do ${brand} ${model} (${year}). Oryginał OE ${oem}. Regał ${rack}.`,
    photos: ld.zdjecia || [],
    status: "active",
    warranty_days: 14,
    dismantle_station: "PHU U Konesera Mysłakowice, ul. Daszyńskiego 16G (tel. 533 533 443)",
  };
}

/**
 * Generate official ShopGold XML Product Feed format
 */
export function generateShopGoldXmlFeed(parts: PartItem[], config: ShopGoldConfig): string {
  const products = parts.map((p) => mapPartToShopGoldProduct(p, config.priceMarkupPercent));

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<shopgold_feed version="2.0" generated="${new Date().toISOString()}" store="${config.storeName}">\n`;
  xml += `  <store_info>\n`;
  xml += `    <name>${escapeXml(config.storeName)}</name>\n`;
  xml += `    <url>${escapeXml(config.storeUrl)}</url>\n`;
  xml += `    <currency>${config.currency}</currency>\n`;
  xml += `    <generator>OVOKO Fast Lister Pro &amp; WMS Enterprise</generator>\n`;
  xml += `  </store_info>\n`;
  xml += `  <categories>\n`;

  // Collect unique category paths
  const uniqueCats = Array.from(new Set(products.map((p) => p.category_path)));
  uniqueCats.forEach((catPath, idx) => {
    xml += `    <category id="${idx + 1}">${escapeXml(catPath)}</category>\n`;
  });
  xml += `  </categories>\n`;

  xml += `  <products count="${products.length}">\n`;
  products.forEach((prod) => {
    xml += `    <product id="${prod.id}">\n`;
    xml += `      <sku>${escapeXml(prod.sku)}</sku>\n`;
    xml += `      <oem_number>${escapeXml(prod.oem_number)}</oem_number>\n`;
    xml += `      <name><![CDATA[${prod.name}]]></name>\n`;
    xml += `      <category><![CDATA[${prod.category_path}]]></category>\n`;
    xml += `      <brand>${escapeXml(prod.car_brand)}</brand>\n`;
    xml += `      <model>${escapeXml(prod.car_model)}</model>\n`;
    xml += `      <year>${escapeXml(prod.car_year)}</year>\n`;
    xml += `      <mounting_position>${escapeXml(prod.mounting_position)}</mounting_position>\n`;
    xml += `      <price_gross>${prod.price_gross.toFixed(2)}</price_gross>\n`;
    xml += `      <price_net>${prod.price_net.toFixed(2)}</price_net>\n`;
    xml += `      <vat_rate>${prod.vat_rate}</vat_rate>\n`;
    xml += `      <stock_quantity>${prod.stock_quantity}</stock_quantity>\n`;
    xml += `      <condition>${escapeXml(prod.condition)}</condition>\n`;
    xml += `      <quality_grade>${escapeXml(prod.quality_grade)}</quality_grade>\n`;
    xml += `      <rack_location>${escapeXml(prod.rack_location)}</rack_location>\n`;
    xml += `      <warranty_days>${prod.warranty_days}</warranty_days>\n`;
    xml += `      <description_short><![CDATA[${prod.description_short}]]></description_short>\n`;
    xml += `      <description_long><![CDATA[${prod.description_html}]]></description_long>\n`;
    xml += `      <images count="${prod.photos.length}">\n`;
    prod.photos.forEach((photoUrl, pIdx) => {
      // Avoid massive data URLs in XML feed, provide clean representation or hosted path
      const safeUrl = photoUrl.startsWith("data:")
        ? `https://sklep.ukonesera.pl/img/parts/${prod.sku}_${pIdx + 1}.jpg`
        : photoUrl;
      xml += `        <image main="${pIdx === 0 ? "1" : "0"}">${escapeXml(safeUrl)}</image>\n`;
    });
    xml += `      </images>\n`;
    xml += `    </product>\n`;
  });

  xml += `  </products>\n`;
  xml += `</shopgold_feed>`;
  return xml;
}

/**
 * Generate official ShopGold CSV Import file
 */
export function generateShopGoldCsv(parts: PartItem[], config: ShopGoldConfig): string {
  const products = parts.map((p) => mapPartToShopGoldProduct(p, config.priceMarkupPercent));

  const headers = [
    "id_produktu",
    "kod_producenta_sku",
    "numer_katalogowy_oem",
    "nazwa_produktu",
    "kategoria_drzewo",
    "cena_brutto",
    "cena_netto",
    "stawka_vat",
    "ilosc_magazynowa",
    "marka_pojazdu",
    "model_pojazdu",
    "rocznik",
    "pozycja_montazu",
    "stan_jakosc",
    "regal_magazynowy_wms",
    "gwarancja_dni",
    "opis_krotki",
    "opis_pelny_html",
    "zdjecie_glowne",
  ];

  const rows = products.map((p) => {
    const mainPhoto = p.photos[0] || "";
    const safePhoto = mainPhoto.startsWith("data:") ? `IMG_${p.sku}.JPG` : mainPhoto;
    return [
      escapeCsv(p.id),
      escapeCsv(p.sku),
      escapeCsv(p.oem_number),
      escapeCsv(p.name),
      escapeCsv(p.category_path),
      p.price_gross.toFixed(2),
      p.price_net.toFixed(2),
      p.vat_rate.toString(),
      p.stock_quantity.toString(),
      escapeCsv(p.car_brand),
      escapeCsv(p.car_model),
      escapeCsv(p.car_year),
      escapeCsv(p.mounting_position),
      escapeCsv(p.condition),
      escapeCsv(p.rack_location),
      p.warranty_days.toString(),
      escapeCsv(p.description_short),
      escapeCsv(p.description_html.replace(/\n/g, " ")),
      escapeCsv(safePhoto),
    ].join(";");
  });

  return [headers.join(";"), ...rows].join("\r\n");
}

/**
 * Direct ShopGold SQL schema & table mapper for direct MySQL connection
 */
export function generateShopGoldDirectSqlScript(parts: PartItem[]): string {
  const products = parts.map((p) => mapPartToShopGoldProduct(p, 0));

  let sql = `-- ==========================================================================\n`;
  sql += `-- SKRYPT INTEGRACJI BEZPOŚREDNIEJ WMS ➔ TABELE SHOPGOLD (MySQL / MariaDB)\n`;
  sql += `-- Baza sklepu: DirectAdmin cPanel ShopGold (sklep.ukonesera.pl)\n`;
  sql += `-- Wygenerowano: ${new Date().toLocaleString("pl-PL")}\n`;
  sql += `-- ==========================================================================\n\n`;

  sql += `-- 1. Mapowanie do tabeli głównej produktów ShopGold (products)\n`;
  sql += `INSERT INTO \`products\` (\n`;
  sql += `  \`products_id\`,\n`;
  sql += `  \`products_model\`,\n`;
  sql += `  \`products_price\`,\n`;
  sql += `  \`products_tax_class_id\`,\n`;
  sql += `  \`products_quantity\`,\n`;
  sql += `  \`products_weight\`,\n`;
  sql += `  \`products_status\`,\n`;
  sql += `  \`products_date_added\`,\n`;
  sql += `  \`products_rack_location\`\n`;
  sql += `) VALUES\n`;

  const pRows = products.map((p, idx) => {
    const numId = 10000 + idx + 1;
    return `  (${numId}, '${escapeSql(p.sku)}', ${p.price_gross.toFixed(2)}, 1, ${p.stock_quantity}, 2.50, 1, NOW(), '${escapeSql(p.rack_location)}')`;
  });
  sql += pRows.join(",\n") + `\nON DUPLICATE KEY UPDATE\n`;
  sql += `  \`products_price\` = VALUES(\`products_price\`),\n`;
  sql += `  \`products_quantity\` = VALUES(\`products_quantity\`),\n`;
  sql += `  \`products_rack_location\` = VALUES(\`products_rack_location\`);\n\n`;

  sql += `-- 2. Mapowanie do tabeli opisów i nazw (products_description - język polski id_lang=1)\n`;
  sql += `INSERT INTO \`products_description\` (\n`;
  sql += `  \`products_id\`,\n`;
  sql += `  \`language_id\`,\n`;
  sql += `  \`products_name\`,\n`;
  sql += `  \`products_description\`,\n`;
  sql += `  \`products_short_description\`\n`;
  sql += `) VALUES\n`;

  const dRows = products.map((p, idx) => {
    const numId = 10000 + idx + 1;
    return `  (${numId}, 1, '${escapeSql(p.name)}', '${escapeSql(p.description_html)}', '${escapeSql(p.description_short)}')`;
  });
  sql += dRows.join(",\n") + `\nON DUPLICATE KEY UPDATE\n`;
  sql += `  \`products_name\` = VALUES(\`products_name\`),\n`;
  sql += `  \`products_description\` = VALUES(\`products_description\`);\n\n`;

  sql += `-- Gotowe! Zaktualizowano ${products.length} pozycji w sklepie ShopGold.\n`;
  return sql;
}

// Helpers
function escapeXml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeCsv(str: string): string {
  if (!str) return '""';
  const clean = str.replace(/"/g, '""');
  return `"${clean}"`;
}

function escapeSql(str: string): string {
  if (!str) return "";
  return str.replace(/'/g, "''").replace(/\\/g, "\\\\");
}
