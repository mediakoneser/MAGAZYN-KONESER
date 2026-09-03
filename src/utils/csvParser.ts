import { PartItem } from "../types";
import { stripHtml, detectCarMake } from "./dataSanitizer";
import { parseAllegroCsv, convertAllegroRowsToPartItems } from "./allegroCsvHandler";

/**
 * Robust CSV parser that handles multi-line quoted fields, semicolons, commas, tabs, and headers
 */
export function parseCsvText(csvText: string): PartItem[] {
  if (!csvText || !csvText.trim()) return [];

  // Check if this is the Allegro 29-column CSV format
  const firstLineUpper = (csvText.split(/\r\n|\n|\r/)[0] || "").toUpperCase();
  if (
    (firstLineUpper.includes("GTIN") && firstLineUpper.includes("PRICE")) ||
    (firstLineUpper.includes("EXTERNAL_ID") && firstLineUpper.includes("STOCK")) ||
    firstLineUpper.includes("IMAGE1")
  ) {
    const allegroResult = parseAllegroCsv(csvText);
    if (allegroResult.success && allegroResult.rows.length > 0) {
      return convertAllegroRowsToPartItems(allegroResult.rows);
    }
  }

  // Determine delimiter: test first line
  const firstLine = csvText.split(/\r\n|\n|\r/)[0] || "";
  let delimiter = ";";
  if (firstLine.includes(";") && !firstLine.includes("\t")) {
    delimiter = ";";
  } else if (firstLine.includes("\t")) {
    delimiter = "\t";
  } else if (firstLine.includes(",")) {
    delimiter = ",";
  }

  // Parse CSV records respecting quotes
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      // End of field
      currentRow.push(currentField);
      currentField = "";
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++; // skip \n
      }
      currentRow.push(currentField);
      currentField = "";
      if (currentRow.some((f) => f.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  // Push last field/row if any
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((f) => f.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) return [];

  // Header detection
  const headerRow = rows[0].map((h) => stripHtml(h).toLowerCase());
  let hasHeaders = false;

  let colName = -1;
  let colMake = -1;
  let colModel = -1;
  let colYear = -1;
  let colOem = -1;
  let colPriceGross = -1;
  let colPriceNet = -1;
  let colRack = -1;
  let colDesc = -1;

  headerRow.forEach((h, idx) => {
    if (h.includes("kategori") || h.includes("nazwa") || h.includes("tytuł") || h.includes("tytul") || h.includes("name")) {
      colName = idx;
      hasHeaders = true;
    } else if (h.includes("marka") || h.includes("brand") || h.includes("make")) {
      colMake = idx;
      hasHeaders = true;
    } else if (h.includes("model")) {
      colModel = idx;
      hasHeaders = true;
    } else if (h.includes("rocznik") || h.includes("rok") || h.includes("year")) {
      colYear = idx;
      hasHeaders = true;
    } else if (h.includes("oem") || h.includes("sku") || h.includes("numer") || h.includes("kod") || h.includes("sygnatura")) {
      colOem = idx;
      hasHeaders = true;
    } else if (h.includes("brutto") || (h.includes("cena") && !h.includes("netto")) || h.includes("price")) {
      colPriceGross = idx;
      hasHeaders = true;
    } else if (h.includes("netto")) {
      colPriceNet = idx;
      hasHeaders = true;
    } else if (h.includes("regał") || h.includes("regal") || h.includes("rack") || h.includes("magazyn") || h.includes("lokalizacja")) {
      colRack = idx;
      hasHeaders = true;
    } else if (h.includes("opis") || h.includes("desc")) {
      colDesc = idx;
      hasHeaders = true;
    }
  });

  const startIndex = hasHeaders ? 1 : 0;
  const parts: PartItem[] = [];

  for (let i = startIndex; i < rows.length; i++) {
    const cols = rows[i];
    if (cols.length < 2) continue;

    let rawCategory = "";
    let rawMake = "";
    let rawModel = "";
    let rawYear = "";
    let rawOem = "";
    let rawPrice = "60";
    let rawRack = "";
    let rawDesc = "";

    if (hasHeaders) {
      if (colName !== -1 && cols[colName]) rawCategory = cols[colName];
      if (colMake !== -1 && cols[colMake]) rawMake = cols[colMake];
      if (colModel !== -1 && cols[colModel]) rawModel = cols[colModel];
      if (colYear !== -1 && cols[colYear]) rawYear = cols[colYear];
      if (colOem !== -1 && cols[colOem]) rawOem = cols[colOem];
      if (colPriceGross !== -1 && cols[colPriceGross]) rawPrice = cols[colPriceGross];
      if (colRack !== -1 && cols[colRack]) rawRack = cols[colRack];
      if (colDesc !== -1 && cols[colDesc]) rawDesc = cols[colDesc];
    } else {
      // Fallback column indexing
      rawCategory = cols[1] || cols[0] || `Część #${i}`;
      rawMake = cols[2] || "";
      rawModel = cols[3] || "";
      rawYear = cols[4] || "";
      rawOem = cols[5] || "";
      rawPrice = cols[6] || "60";
      rawRack = cols[8] || cols[7] || "";
    }

    const cleanCategory = stripHtml(rawCategory) || `Część z importu #${i}`;
    let cleanMake = stripHtml(rawMake);
    const cleanModel = stripHtml(rawModel);
    const cleanYear = stripHtml(rawYear);
    const cleanOem = stripHtml(rawOem);
    const cleanRack = stripHtml(rawRack) || `MAG ${((i % 60) + 1).toString().padStart(2, "0")}`;
    const cleanDesc = stripHtml(rawDesc);

    // Auto-detect brand if corrupt or empty
    if (!cleanMake || cleanMake.length > 25 || cleanMake.includes("<") || cleanMake === "-1" || /^\d+$/.test(cleanMake)) {
      const detected = detectCarMake(rawMake, `${cleanCategory} ${cleanDesc} ${cleanModel}`);
      cleanMake = detected.make;
    }

    // Parse price
    const numPrice = parseFloat(rawPrice.replace(",", ".").replace(/[^\d.]/g, "")) || 50;
    const brutto = Math.round(numPrice);
    const netto = Math.round(brutto / 1.23);

    parts.push({
      id: `imported_${Date.now()}_${i}`,
      listingData: {
        samochod: {
          marka: cleanMake,
          model: cleanModel || (cleanMake !== "Inne / Uniwersalna" ? cleanMake : ""),
          rocznik: cleanYear,
        },
        kategoria: cleanCategory,
        jakosc: "Używany (Oryginał OE)",
        pozycja_czesci: "Standard",
        opis: cleanDesc || `Oryginalna część samochodowa ${cleanMake} - ${cleanCategory}. Stacja Demontażu Pojazdów PHU U Konesera, Mysłakowice.`,
        producent: `OE ${cleanMake}`,
        numery_czesci: cleanOem,
        cena: { brutto, netto },
        ocr_wyniki: {
          numer_magazynowy: cleanRack,
          napisy_markerem: "IMPORT CSV",
        },
      },
      status: "Dostępny",
      createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    });
  }

  return parts;
}
