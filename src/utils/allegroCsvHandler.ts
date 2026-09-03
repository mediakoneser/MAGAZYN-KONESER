import { PartItem } from "../types";
import { stripHtml, detectCarMake } from "./dataSanitizer";

export const ALLEGRO_CSV_COLUMNS = [
  "GTIN",
  "EXTERNAL_ID",
  "NAME",
  "STOCK",
  "PRICE",
  "MPN",
  "DESCRIPTION",
  "IMAGE1",
  "IMAGE2",
  "IMAGE3",
  "IMAGE4",
  "IMAGE5",
  "IMAGE6",
  "IMAGE7",
  "IMAGE8",
  "IMAGE9",
  "IMAGE10",
  "IMAGE11",
  "IMAGE12",
  "IMAGE13",
  "IMAGE14",
  "IMAGE15",
  "IMAGE16",
  "AI_COCREATED",
  "CATEGORY",
  "BRAND",
  "COLOR",
  "SIZE",
  "MATERIAL",
] as const;

export interface AllegroCsvRow {
  gtin: string;
  externalId: string;
  name: string;
  stock: number;
  price: number;
  mpn: string;
  description: string;
  images: string[];
  aiCocreated: string;
  category: string;
  brand: string;
  color: string;
  size: string;
  material: string;
  rawRowIndex: number;
  isValid: boolean;
  validationErrors: string[];
  validationWarnings: string[];
}

export const SAMPLE_ALLEGRO_CSV_TEXT = `GTIN,EXTERNAL_ID,NAME,STOCK,PRICE,MPN,DESCRIPTION,IMAGE1,IMAGE2,IMAGE3,IMAGE4,IMAGE5,IMAGE6,IMAGE7,IMAGE8,IMAGE9,IMAGE10,IMAGE11,IMAGE12,IMAGE13,IMAGE14,IMAGE15,IMAGE16,AI_COCREATED,CATEGORY,BRAND,COLOR,SIZE,MATERIAL
5901234567891,AGD-ZMYW15,Zmywarka 60 cm A+++ Inverter,1000,1999.99,DFX-9082-A ,"Nowoczesna zmywarka wolnostojąca o szerokości 60 cm, mieszcząca 15 kompletów naczyń. Wyposażona w cichy i energooszczędny silnik inwerterowy oraz 8 programów mycia, w tym program higieniczny 70°C i krótki 30 minut. Posiada opóźnienie startu i wyświetlacz LED. Klasa energetyczna A+++.",https://twoja.strona.pl/obrazek1.jpg,https://twoja.strona.pl/obrazek2.jpg,https://twoja.strona.pl/obrazek3.jpg,https://twoja.strona.pl/obrazek4.jpg,https://twoja.strona.pl/obrazek5.jpg,,,,,,,,,,,,https://twoja.strona.pl/obrazek1.jpg | https://twoja.strona.pl/obrazek3.jpg,AGD Duże/Kuchnia,HomeLux,Biały,85x60x60 cm,Stal nierdzewna
7890123456780,AGD-EKSPR22,Ekspres Ciśnieniowy Automatyczny LatteGo,15,2499,78-PN43-X2 ,"Pełnoautomatyczny ekspres do kawy z intuicyjnym panelem dotykowym. System LatteGo umożliwia szybkie przygotowanie kaw mlecznych (Cappuccino, Latte Macchiato) ze świeżego mleka. Posiada ceramiczny młynek z 12 stopniami regulacji. Filtr AquaClean zapewnia czystość wody.",https://twoja.strona.pl/obrazek1.jpg,https://twoja.strona.pl/obrazek2.jpg,https://twoja.strona.pl/obrazek3.jpg,https://twoja.strona.pl/obrazek4.jpg,https://twoja.strona.pl/obrazek5.jpg,,,,,,,,,,,,,AGD Małe/Kawa,AromaPro,Czarny matowy,35x25x45 cm,Tworzywo sztuczne
4001112223330,AGD-MIKR3,Kuchenka Mikrofalowa Grill 20L,33,349.95,MBR-2026-REV,"Kompaktowa kuchenka mikrofalowa o pojemności 20 litrów, wyposażona w funkcję grill. 5 poziomów mocy mikrofal (do 800W) i funkcja rozmrażania wagowego. Wnętrze pokryte emalią ułatwiającą czyszczenie. Idealna do małej kuchni.",https://twoja.strona.pl/obrazek1.jpg,https://twoja.strona.pl/obrazek2.jpg,https://twoja.strona.pl/obrazek3.jpg,https://twoja.strona.pl/obrazek4.jpg,https://twoja.strona.pl/obrazek5.jpg,,,,,,,,,,,,,AGD Małe/Kuchnia,QuickHeat,Srebrny,26x44x35 cm,Stal lakierowana
9876543210986,AGD-ODKU1,Odkurzacz Bezprzewodowy Pionowy V9,50,899.95,TX-4451-BLU,Lekki i mocny odkurzacz pionowy 2w1 (pionowy i ręczny) z cyfrowym silnikiem bezszczotkowym. Czas pracy do 60 minut w trybie Eco. Zaawansowany system filtracji HEPA. Łatwy do opróżnienia pojemnik i zestaw wymiennych końcówek do różnych powierzchni.,https://twoja.strona.pl/obrazek1.jpg,https://twoja.strona.pl/obrazek2.jpg,https://twoja.strona.pl/obrazek3.jpg,https://twoja.strona.pl/obrazek4.jpg,https://twoja.strona.pl/obrazek5.jpg,,,,,,,,,,,,,AGD Małe/Sprzątanie,CleanMax,Grafitowy,26x44x50 cm,Aluminium/Plastik
1122334455660,ACC-PLEC01,Plecak Turystyczny 40L Wodoodporny,88,159,9987-XZ,"Wytrzymały plecak trekkingowy o pojemności 40 litrów. Wykonany z wodoodpornego poliestru Rip-Stop. Posiada regulowany system wentylacji pleców, pas biodrowy i piersiowy oraz liczne kieszenie boczne i zewnętrzne uchwyty na sprzęt. Idealny na jednodniowe wycieczki.",https://twoja.strona.pl/obrazek1.jpg,https://twoja.strona.pl/obrazek2.jpg,https://twoja.strona.pl/obrazek3.jpg,https://twoja.strona.pl/obrazek4.jpg,https://twoja.strona.pl/obrazek5.jpg,,,,,,,,,,,,,Turystyka/Akcesoria,TrailGo,Zielony leśny,40 Litrów,Poliester Rip-Stop
2004006008000,PRD-BLUZA05,Bluza Męska Bawełniana z Kapturem,112,119.5,PRD-BLUZA05,"Klasyczna bluza męska z kapturem i kieszenią kangurką. Wykonana z grubej, mięsistej bawełny o gramaturze 320 g/m². Wewnętrzna strona drapana, zapewnia ciepło. Ściągacze przy mankietach i na dole bluzy. Idealna na chłodniejsze dni i do codziennego użytku.",https://twoja.strona.pl/obrazek1.jpg,https://twoja.strona.pl/obrazek2.jpg,https://twoja.strona.pl/obrazek3.jpg,https://twoja.strona.pl/obrazek4.jpg,https://twoja.strona.pl/obrazek5.jpg,,,,,,,,,,,,,Odzież Męska,StreetWear,Szary Melanż,XL,Bawełna 80%
3344556677880,PRD-SZPILK1,Szpilki Skórzane Czarne Klasyczne,45,299.5,PRD-SZPILK1,"Eleganckie czarne szpilki wykonane z wysokiej jakości skóry naturalnej. Klasyczny, smukły fason z noskiem w szpic i obcasem 9 cm. Wyściółka ze skóry gwarantuje komfort. Ponadczasowy model, niezbędny w każdej garderobie formalnej i wieczorowej.",https://twoja.strona.pl/obrazek1.jpg,https://twoja.strona.pl/obrazek2.jpg,https://twoja.strona.pl/obrazek3.jpg,https://twoja.strona.pl/obrazek4.jpg,,,,,,,,,,,,,,Obuwie Damskie,Elegance,Czarny,38,Skóra naturalna
6005004003000,AGD-LODZKA05,Lodówka Side-by-Side Total No Frost,5,3999.5,6005004003000,Duża lodówka dwudrzwiowa Side-by-Side o pojemności całkowitej 600 litrów. System Total No Frost eliminuje szron i lód. Wyposażona w dystrybutor wody i lodu (wymaga podłączenia do wody) oraz strefę zero (komora świeżości). Klasa energetyczna E (Nowa). Dotykowy panel sterowania.,https://twoja.strona.pl/obrazek1.jpg,https://twoja.strona.pl/obrazek2.jpg,https://twoja.strona.pl/obrazek3.jpg,,,,,,,,,,,,,,,AGD Duże/Chłodzenie,ArcticCool,Stal Inox,180x90x70cm,Stal nierdzewna
7788990011220,ELT-LAPTOP02,"Laptop Ultrabook 14"" i7 16GB RAM",18,5590.45,TG-1234-1234,"Ultrabook biznesowy 14 cali z matrycą Full HD. Procesor Intel Core i7, 16 GB pamięci RAM i szybki dysk SSD NVMe 512 GB. Ultralekka obudowa z aluminium. Bateria wytrzymująca do 10 godzin pracy. System operacyjny Windows 11 Pro. Idealny do pracy zdalnej i mobilnej.",https://twoja.strona.pl/obrazek1.jpg,https://twoja.strona.pl/obrazek2.jpg,https://twoja.strona.pl/obrazek3.jpg,,,,,,,,,,,,,,,Elektronika/Komputery,TechGear,Kosmiczny szary,14 cali,Aluminium/Magnez
8899001122330,KCH-GARN07,Zestaw Garnków Indukcyjnych 8 Elementów,25,499.95,CM-GAR-8-EL,"Komplet 4 garnków i 4 pokrywek wykonanych z wysokiej jakości stali nierdzewnej 18/10. Grube, wielowarstwowe dno akutermiczne zapewnia szybkie i równomierne nagrzewanie. Nadają się do wszystkich typów kuchenek, w tym indukcyjnych. Można myć w zmywarce.",https://twoja.strona.pl/obrazek1.jpg,https://twoja.strona.pl/obrazek2.jpg,https://twoja.strona.pl/obrazek3.jpg,,,,,,,,,,,,,,,Kuchnia/Wyposażenie,CookMaster,Srebrny (połysk),,Stal nierdzewna 18/10`;

/**
 * Validates GTIN / EAN-13, EAN-8 or UPC format and checksum
 */
export function validateGtin(gtin: string): { isValid: boolean; type?: string; message?: string } {
  if (!gtin) return { isValid: false, message: "Brak kodu GTIN" };
  const clean = gtin.trim().replace(/\s+/g, "");
  if (!/^\d+$/.test(clean)) {
    return { isValid: false, message: "GTIN może zawierać wyłącznie cyfry" };
  }
  if (![8, 12, 13, 14].includes(clean.length)) {
    return { isValid: false, message: `Nieprawidłowa długość (${clean.length} cyfr). Wymagane 8, 12, 13 lub 14 cyfr.` };
  }

  // Checksum calculation (standard Modulo 10 weight 3/1 algorithm)
  const digits = clean.split("").map(Number);
  const checkDigit = digits[digits.length - 1];
  let sum = 0;
  let weight = 3;
  for (let i = digits.length - 2; i >= 0; i--) {
    sum += digits[i] * weight;
    weight = weight === 3 ? 1 : 3;
  }
  const calculatedCheck = (10 - (sum % 10)) % 10;
  if (calculatedCheck !== checkDigit) {
    return { isValid: true, type: `EAN-${clean.length} (Ostrzeżenie: suma kontrolna)`, message: "Suma kontrolna może być niestandardowa" };
  }

  return { isValid: true, type: clean.length === 13 ? "EAN-13" : clean.length === 8 ? "EAN-8" : `GTIN-${clean.length}` };
}

/**
 * Splits raw CSV text into rows respecting quotes and escapes
 */
export function parseRawCsvRows(csvText: string): string[][] {
  if (!csvText || !csvText.trim()) return [];

  // Determine delimiter
  const firstLine = csvText.split(/\r\n|\n|\r/)[0] || "";
  let delimiter = ",";
  if (firstLine.includes(";") && (!firstLine.includes(",") || firstLine.split(";").length > firstLine.split(",").length)) {
    delimiter = ";";
  } else if (firstLine.includes("\t")) {
    delimiter = "\t";
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = "";
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      currentRow.push(currentField.trim());
      currentField = "";
      if (currentRow.some((f) => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Parses Allegro 29-column CSV into validated rows
 */
export function parseAllegroCsv(csvText: string): {
  success: boolean;
  rows: AllegroCsvRow[];
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  columnsFound: string[];
} {
  const rawRows = parseRawCsvRows(csvText);
  if (rawRows.length === 0) {
    return {
      success: false,
      rows: [],
      totalRows: 0,
      validRowsCount: 0,
      invalidRowsCount: 0,
      columnsFound: [],
    };
  }

  // Detect header row
  const headerMap: Record<string, number> = {};
  const firstRow = rawRows[0].map((h) => h.toUpperCase().trim());

  firstRow.forEach((col, idx) => {
    headerMap[col] = idx;
    if (col.includes("GTIN") || col.includes("EAN")) headerMap["GTIN"] = idx;
    if (col.includes("EXTERNAL_ID") || col.includes("SKU") || col.includes("ID_ZEWN")) headerMap["EXTERNAL_ID"] = idx;
    if (col.includes("NAME") || col.includes("TYTUL") || col.includes("NAZWA")) headerMap["NAME"] = idx;
    if (col.includes("STOCK") || col.includes("ILOSC") || col.includes("STAN")) headerMap["STOCK"] = idx;
    if (col.includes("PRICE") || col.includes("CENA")) headerMap["PRICE"] = idx;
    if (col.includes("MPN") || col.includes("KOD_PRODUCENTA") || col.includes("OEM")) headerMap["MPN"] = idx;
    if (col.includes("DESCRIPTION") || col.includes("OPIS")) headerMap["DESCRIPTION"] = idx;
    if (col.includes("CATEGORY") || col.includes("KATEGORIA")) headerMap["CATEGORY"] = idx;
    if (col.includes("BRAND") || col.includes("MARKA") || col.includes("PRODUCENT")) headerMap["BRAND"] = idx;
    if (col.includes("COLOR") || col.includes("KOLOR")) headerMap["COLOR"] = idx;
    if (col.includes("SIZE") || col.includes("ROZMIAR")) headerMap["SIZE"] = idx;
    if (col.includes("MATERIAL") || col.includes("MATERIAL")) headerMap["MATERIAL"] = idx;
    if (col.includes("AI_COCREATED")) headerMap["AI_COCREATED"] = idx;
  });

  // Track image columns IMAGE1..IMAGE16
  const imageColIndices: number[] = [];
  for (let imgNum = 1; imgNum <= 16; imgNum++) {
    const key = `IMAGE${imgNum}`;
    const directIdx = firstRow.indexOf(key);
    if (directIdx !== -1) {
      imageColIndices.push(directIdx);
    }
  }

  // If no IMAGE1..16 headers detected, fallback to standard column positions 7..22
  if (imageColIndices.length === 0 && firstRow.length >= 24) {
    for (let colIdx = 7; colIdx <= 22; colIdx++) {
      imageColIndices.push(colIdx);
    }
  }

  const hasStandardHeaders = Boolean(headerMap["NAME"] !== undefined || headerMap["GTIN"] !== undefined);
  const startRow = hasStandardHeaders ? 1 : 0;

  const parsedList: AllegroCsvRow[] = [];

  for (let r = startRow; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (row.length === 0 || row.every((c) => !c.trim())) continue;

    const getVal = (colName: string, defaultIdx: number): string => {
      const idx = headerMap[colName] !== undefined ? headerMap[colName] : defaultIdx;
      return idx < row.length ? row[idx].trim() : "";
    };

    const gtin = getVal("GTIN", 0);
    const externalId = getVal("EXTERNAL_ID", 1) || `SKU-${Date.now().toString(36).toUpperCase()}-${r}`;
    const name = stripHtml(getVal("NAME", 2));
    const rawStock = getVal("STOCK", 3);
    const rawPrice = getVal("PRICE", 4);
    const mpn = getVal("MPN", 5);
    const description = getVal("DESCRIPTION", 6);
    const aiCocreated = getVal("AI_COCREATED", 23);
    const category = getVal("CATEGORY", 24);
    const brand = getVal("BRAND", 25);
    const color = getVal("COLOR", 26);
    const size = getVal("SIZE", 27);
    const material = getVal("MATERIAL", 28);

    // Collect all valid image URLs
    const images: string[] = [];
    if (imageColIndices.length > 0) {
      imageColIndices.forEach((cIdx) => {
        if (cIdx < row.length && row[cIdx]?.trim().startsWith("http")) {
          images.push(row[cIdx].trim());
        }
      });
    } else {
      // Look through row for http URLs
      row.forEach((cell) => {
        if (cell.trim().startsWith("http://") || cell.trim().startsWith("https://")) {
          images.push(cell.trim());
        }
      });
    }

    // Number parsing
    const stock = Math.max(1, parseInt(rawStock.replace(/[^\d]/g, ""), 10) || 1);
    const parsedPrice = parseFloat(rawPrice.replace(",", ".").replace(/[^\d.]/g, "")) || 0;
    const price = Math.round(parsedPrice * 100) / 100;

    // Validation
    const validationErrors: string[] = [];
    const validationWarnings: string[] = [];

    if (!name && !gtin) {
      validationErrors.push("Wymagany GTIN lub Nazwa produktu");
    }
    if (price <= 0) {
      validationErrors.push("Cena musi być większa niż 0.00 zł");
    }
    if (stock <= 0) {
      validationErrors.push("Stan magazynowy musi wynosić min. 1 sztukę");
    }

    if (gtin) {
      const gtinCheck = validateGtin(gtin);
      if (!gtinCheck.isValid) {
        validationWarnings.push(gtinCheck.message || "Błąd formatu GTIN");
      }
    } else {
      validationWarnings.push("Brak GTIN (produkt zostanie wystawiony na podstawie parametrów)");
    }

    if (images.length === 0) {
      validationWarnings.push("Brak zdjęć w ofercie");
    }

    const isValid = validationErrors.length === 0;

    parsedList.push({
      gtin,
      externalId,
      name: name || `Produkt Allegro #${r}`,
      stock,
      price: price || 99.0,
      mpn,
      description: description || name,
      images,
      aiCocreated,
      category: category || "Części samochodowe / Akcesoria",
      brand: brand || (name ? detectCarMake(name, description).make : "Uniwersalny"),
      color,
      size,
      material,
      rawRowIndex: r + 1,
      isValid,
      validationErrors,
      validationWarnings,
    });
  }

  const validRowsCount = parsedList.filter((r) => r.isValid).length;
  const invalidRowsCount = parsedList.length - validRowsCount;

  return {
    success: parsedList.length > 0,
    rows: parsedList,
    totalRows: parsedList.length,
    validRowsCount,
    invalidRowsCount,
    columnsFound: firstRow,
  };
}

/**
 * Converts parsed Allegro CSV rows into application's native PartItem structure
 */
export function convertAllegroRowsToPartItems(rows: AllegroCsvRow[], defaultRackPrefix = "MAG"): PartItem[] {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 16).replace("T", " ");

  return rows.map((r, idx) => {
    const rackNumber = `${defaultRackPrefix} ${((idx % 60) + 1).toString().padStart(2, "0")}`;
    const detectedMake = r.brand && r.brand !== "Uniwersalny" ? r.brand : detectCarMake(r.name, r.description).make;
    const brutto = r.price;
    const netto = Math.round((brutto / 1.23) * 100) / 100;

    return {
      id: `allg_csv_${Date.now()}_${idx}_${r.externalId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
      barcode: r.gtin ? `EAN-${r.gtin}` : `KNS-${r.externalId}`,
      qrCode: `ALLEGRO:${r.externalId}:${r.gtin || "NOGTIN"}`,
      currentRackLocation: rackNumber,
      ilosc: r.stock,
      status: "Dostępny",
      createdAt: dateStr,
      createdByName: "Import Masowy CSV",
      listingData: {
        kategoria: r.category || "Części i Akcesoria",
        opis: r.description,
        producent: r.brand || detectedMake,
        numery_czesci: r.mpn || r.externalId,
        jakosc: "Oryginał / Nowy",
        pozycja_czesci: "Standard",
        cena: {
          brutto,
          netto,
        },
        zdjecia: r.images,
        ilosc: r.stock,
        stan_magazynowy: r.stock,
        samochod: {
          marka: detectedMake,
          model: r.size || detectedMake,
          rocznik: "2024-2026",
        },
        ocr_wyniki: {
          numer_magazynowy: rackNumber,
          napisy_markerem: `CSV GTIN:${r.gtin || "-"} SKU:${r.externalId}`,
        },
        allegro: {
          ean: r.gtin,
          signature: rackNumber,
          categoryName: r.category,
          price: brutto,
          manufacturer: r.brand || detectedMake,
          smartEligible: brutto >= 45,
          gpsrCompliant: true,
        },
        auctionTemplates: {
          allegroTitle: r.name.slice(0, 75),
          allegroDescriptionHtml: `<div class="item-description"><h2>${r.name}</h2><p>${r.description}</p><ul><li>Producent: ${r.brand}</li><li>Kod MPN / OEM: ${r.mpn || r.externalId}</li><li>EAN / GTIN: ${r.gtin || "Brak"}</li></ul></div>`,
        },
      },
    };
  });
}

/**
 * Exports application's PartItem[] array into the official 29-column Allegro CSV format
 */
export function exportPartsToAllegroCsv(parts: PartItem[]): string {
  const escapeCsv = (val: any): string => {
    if (val === undefined || val === null) return "";
    const str = String(val).trim();
    if (str.includes(",") || str.includes(";") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = ALLEGRO_CSV_COLUMNS.join(",");
  const dataRows = parts.map((part) => {
    const ld = part.listingData;
    const gtin = ld?.allegro?.ean || (part.barcode?.startsWith("EAN-") ? part.barcode.replace("EAN-", "") : "");
    const externalId = part.id || `PART-${part.barcode || "ITEM"}`;
    const name = ld?.auctionTemplates?.allegroTitle || ld?.kategoria || "Część samochodowa";
    const stock = part.ilosc || ld?.ilosc || ld?.stan_magazynowy || 1;
    const price = ld?.cena?.brutto || 50;
    const mpn = ld?.numery_czesci || ld?.ocr_wyniki?.numer_magazynowy || "";
    const description = ld?.opis || name;

    const photos = ld?.zdjecia || [];
    const imgCols: string[] = [];
    for (let i = 0; i < 16; i++) {
      imgCols.push(escapeCsv(photos[i] || ""));
    }

    const aiCocreated = "";
    const category = ld?.allegro?.categoryName || ld?.kategoria || "Motoryzacja/Części samochodowe";
    const brand = ld?.allegro?.manufacturer || ld?.producent || ld?.samochod?.marka || "OE";
    const color = "";
    const size = ld?.samochod?.model || "";
    const material = "";

    const rowFields = [
      escapeCsv(gtin),
      escapeCsv(externalId),
      escapeCsv(name),
      escapeCsv(stock),
      escapeCsv(price.toFixed(2)),
      escapeCsv(mpn),
      escapeCsv(description),
      ...imgCols,
      escapeCsv(aiCocreated),
      escapeCsv(category),
      escapeCsv(brand),
      escapeCsv(color),
      escapeCsv(size),
      escapeCsv(material),
    ];

    return rowFields.join(",");
  });

  return "\uFEFF" + [headerLine, ...dataRows].join("\n");
}

/**
 * Triggers instant browser download of `template.csv`
 */
export function downloadAllegroTemplateCsv(filename = "template.csv") {
  const blob = new Blob(["\uFEFF" + SAMPLE_ALLEGRO_CSV_TEXT], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
