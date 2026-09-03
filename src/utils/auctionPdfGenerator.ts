import { jsPDF } from "jspdf";
import { PartItem, PartListingData } from "../types";

/**
 * Normalizes text to prevent glyph corruption in standard PDF fonts
 * while preserving full readability of Polish automotive descriptions.
 */
export function sanitizeTextForPdf(str: string | undefined | null): string {
  if (!str) return "";
  const polishMap: Record<string, string> = {
    ą: "a",
    ć: "c",
    ę: "e",
    ł: "l",
    ń: "n",
    ó: "o",
    ś: "s",
    ź: "z",
    ż: "z",
    Ą: "A",
    Ć: "C",
    Ę: "E",
    Ł: "L",
    Ń: "N",
    Ó: "O",
    Ś: "S",
    Ź: "Z",
    Ż: "Z",
  };
  return str
    .replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, (m) => polishMap[m] || m)
    .replace(/[^\x20-\x7E\n\r\t]/g, " ")
    .trim();
}

/**
 * Builds a standardized, professional A4 Auction & WMS Specification PDF for a vehicle part.
 */
export function buildAuctionPdf(part: PartItem | { id: string; currentRackLocation?: string; listingData: PartListingData }): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const d = part.listingData;
  const marka = sanitizeTextForPdf(d.samochod?.marka || d.marka || "Uniwersalna");
  const model = sanitizeTextForPdf(d.samochod?.model || d.model || "");
  const rocznik = sanitizeTextForPdf(d.samochod?.rocznik || d.rocznik || "");
  const vin = sanitizeTextForPdf(d.samochod?.vin || (part as PartItem).vehicleVin || "");
  const kategoria = sanitizeTextForPdf(d.kategoria || "Czesc samochodowa");
  const oem = sanitizeTextForPdf(d.numery_czesci || "Brak / OE");
  const producent = sanitizeTextForPdf(d.producent || `${marka} OE`);
  const pozycja = sanitizeTextForPdf(d.pozycja_czesci || "Standard");
  const jakosc = sanitizeTextForPdf(d.jakosc || d.qualityGrade || "Uzywany (Oryginal OE)");
  const regal = sanitizeTextForPdf(part.currentRackLocation || d.ocr_wyniki?.numer_magazynowy || d.allegro?.signature || "MAG 14");
  const cenaBrutto = d.cena?.brutto || 0;
  const cenaNetto = d.cena?.netto || Math.round((cenaBrutto / 1.23) * 100) / 100;
  const opis = sanitizeTextForPdf(d.opis || "Oryginalna czesc z legalnego demontazu stacji PHU U KONESERA.");

  // Auction templates
  const allegroTitle = sanitizeTextForPdf(
    d.auctionTemplates?.allegroTitle || `${marka} ${model} ${kategoria} ${oem} ORYGINAL`.substring(0, 75)
  );
  const ovokoTitle = sanitizeTextForPdf(
    d.auctionTemplates?.ovokoTitle || `${marka} ${model} ${kategoria} ${oem} [${regal}]`
  );
  const olxText = sanitizeTextForPdf(
    d.auctionTemplates?.olxText || `Oryginalny element do ${marka} ${model} (${rocznik}). Stan: ${jakosc}. Sygnatura: ${regal}.`
  );

  const todayStr = new Date().toISOString().slice(0, 10);
  const folderPath = `/Parts/Inventory/${todayStr}`;

  // 1. BRAND HEADER (Dark banner with gold stripe)
  doc.setFillColor(15, 23, 42); // #0f172a Slate-900
  doc.rect(0, 0, 210, 36, "F");

  // Gold accent stripe
  doc.setFillColor(250, 204, 21); // #facc15 Yellow-400
  doc.rect(0, 34.5, 210, 1.5, "F");

  // Header Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(250, 204, 21);
  doc.text("PHU U KONESERA - STACJA DEMONTAZU POJAZDOW", 14, 13);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225); // Slate-300
  doc.text("Myslakowice k. Jeleniej Gory  |  Tel: +48 533 533 443  |  NIP: 611-100-34-55  |  BDO: 000123456", 14, 20);
  doc.text(`KARTA AUKCYJNA I CERTYFIKAT MAGAZYNOWY WMS  |  ID: ${sanitizeTextForPdf(part.id)}  |  DATA: ${todayStr}`, 14, 27);

  // 2. HIGHLIGHT BOXES (Rack location & Price)
  let y = 43;

  // Shelf Badge Box
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, 88, 22, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("SYGNATURA REGALU (WMS):", 18, y + 6);
  doc.setFontSize(14);
  doc.setTextColor(180, 83, 9); // Amber-700
  doc.text(regal, 18, y + 16);

  // Price Box
  doc.roundedRect(108, y, 88, 22, 2, 2, "FD");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("CENA SUGEROWANA AUKCJI:", 112, y + 6);
  doc.setFontSize(14);
  doc.setTextColor(22, 101, 52); // Green-700
  doc.text(`${cenaBrutto} PLN brutto`, 112, y + 16);
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`(${cenaNetto} PLN netto + 23% VAT)`, 156, y + 16);

  // 3. PARAMETRY CZĘŚCI I POJAZDU (Table)
  y = 72;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("1. SPECYFIKACJA TECHNICZNA CZESCI (GVO / OVOKO)", 14, y);

  y += 4;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, y, 196, y);

  y += 5;
  const tableData: [string, string][] = [
    ["Pojazd dawca:", `${marka} ${model} ${rocznik ? `(${rocznik})` : ""}`],
    ["Kategoria / Nazwa czesci:", kategoria],
    ["Numer katalogowy OEM:", oem],
    ["Producent fabryczny:", producent],
    ["Strona / Pozycja zabudowy:", pozycja],
    ["Stan jakosciowy (GVO):", jakosc],
    ["Numer VIN pojazdu:", vin || "Zdemontowano z legalnego pojazdu kasacyjnego"],
  ];

  tableData.forEach(([label, val], idx) => {
    const rowY = y + idx * 7.5;
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, rowY - 4.5, 182, 7.5, "F");
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(label, 18, rowY);

    doc.setFont("helvetica", label.includes("OEM") || label.includes("Pojazd") ? "bold" : "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(val, 75, rowY);
  });

  // 4. SZABLONY AUKCJI INTERNETOWYCH
  y += tableData.length * 7.5 + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("2. GOTOWE SZABLONY AUKCJI INTERNETOWYCH (ALLEGRO / OVOKO / OLX)", 14, y);

  y += 4;
  doc.line(14, y, 196, y);
  y += 6;

  // Allegro Title Box
  doc.setFillColor(254, 243, 199); // Yellow-100
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(14, y, 182, 14, 1.5, 1.5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(180, 83, 9);
  doc.text("TYTUL AUKCJI ALLEGRO (SEO MAX 75 ZNAKOW):", 18, y + 4.5);
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(allegroTitle, 18, y + 10.5);

  y += 18;

  // Ovoko Title Box
  doc.setFillColor(238, 242, 255); // Indigo-50
  doc.setDrawColor(99, 102, 241);
  doc.roundedRect(14, y, 182, 14, 1.5, 1.5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(67, 56, 202);
  doc.text("TYTUL PLATFORMY OVOKO / RRR AUTO (Z SYGNATURA PÓLKOWA):", 18, y + 4.5);
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(ovokoTitle, 18, y + 10.5);

  y += 18;

  // Technical Description Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, 182, 36, 1.5, 1.5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("OPIS TECHNICZNY DO WYSTAWIENIA NA ALLEGRO / SHOPGOLD / OLX:", 18, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  const splitDesc = doc.splitTextToSize(
    `${opis}\n\n• Gwarancja rozruchowa 14 dni na wszystkie czesci mechaniczne i elektroniczne.\n• Wysylka paczkomatem InPost lub bezpiecznym kurierem z ubezpieczeniem zawartosci.\n• Legalne zrodlo: Stacja Demontazu Pojazdow PHU U Konesera, Myslakowice.`,
    174
  );
  doc.text(splitDesc, 18, y + 11);

  // 5. GOOGLE DRIVE ARCHIVE & FOOTER
  y = 250;
  doc.setFillColor(240, 253, 244); // Green-50
  doc.setDrawColor(34, 197, 94);
  doc.roundedRect(14, y, 182, 22, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(21, 128, 61);
  doc.text("ARCHIWIZACJA I SYNCHRONIZACJA GOOGLE DRIVE WMS:", 18, y + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(22, 101, 52);
  doc.text(`Folder docelowy: ${folderPath}`, 18, y + 11);
  doc.text(`Status: Zapisano automatycznie po przyjeciu czesci do magazynu WMS UKONESERA`, 18, y + 16);

  // Page Footer Bottom
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Wygenerowano przez UKONESERA WMS AI Cloud System  •  ${folderPath}  •  Data generacji: ${new Date().toLocaleString("pl-PL")}`,
    14,
    285
  );

  return doc;
}

/**
 * Returns a PDF as a Blob ready for upload to Google Drive or local saving
 */
export async function generateAuctionPdfBlob(
  part: PartItem | { id: string; currentRackLocation?: string; listingData: PartListingData }
): Promise<Blob> {
  const doc = buildAuctionPdf(part);
  return doc.output("blob");
}

/**
 * Triggers a browser download of the Auction PDF
 */
export function downloadAuctionPdf(
  part: PartItem | { id: string; currentRackLocation?: string; listingData: PartListingData }
): void {
  const doc = buildAuctionPdf(part);
  const d = part.listingData;
  const oem = sanitizeTextForPdf(d.numery_czesci || part.currentRackLocation || part.id).replace(/[^a-zA-Z0-9_-]/g, "_");
  const marka = sanitizeTextForPdf(d.samochod?.marka || "Auto").replace(/[^a-zA-Z0-9_-]/g, "_");
  const kat = sanitizeTextForPdf(d.kategoria || "Czesc").replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `Szablon_Aukcji_${oem}_${marka}_${kat}.pdf`;
  doc.save(filename);
}
