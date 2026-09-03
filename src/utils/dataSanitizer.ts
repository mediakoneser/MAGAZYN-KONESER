import { PartItem } from "../types";

// Popular automotive makes in Poland & Europe
export const KNOWN_CAR_MAKES = [
  "Alfa Romeo",
  "Audi",
  "BMW",
  "Chevrolet",
  "Chrysler",
  "Citroen",
  "Citroën",
  "Dacia",
  "Daewoo",
  "Dodge",
  "Fiat",
  "Ford",
  "Honda",
  "Hyundai",
  "Iveco",
  "Jaguar",
  "Jeep",
  "Kia",
  "Lancia",
  "Land Rover",
  "Lexus",
  "Mazda",
  "Mercedes-Benz",
  "Mercedes",
  "Mini",
  "Mitsubishi",
  "Nissan",
  "Opel",
  "Peugeot",
  "Porsche",
  "Renault",
  "Rover",
  "Saab",
  "Seat",
  "Skoda",
  "Škoda",
  "Smart",
  "Subaru",
  "Suzuki",
  "Toyota",
  "Volkswagen",
  "VW",
  "Volvo",
];

/**
 * Remove HTML tags, decode common HTML entities, and trim whitespace
 */
export function stripHtml(str: string | undefined | null): string {
  if (!str) return "";
  let clean = String(str);
  // Replace HTML break tags with space
  clean = clean.replace(/<br\s*[\/]?>/gi, " ");
  clean = clean.replace(/<\/p>/gi, " ");
  // Strip all other HTML tags
  clean = clean.replace(/<[^>]+>/g, " ");
  // Decode common HTML entities
  clean = clean
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&oacute;/gi, "ó")
    .replace(/&Oacute;/gi, "Ó")
    .replace(/&plusmn;/gi, "±");
  // Collapse multiple spaces
  clean = clean.replace(/\s+/g, " ").trim();
  return clean;
}

/**
 * Clean & detect proper car brand from text or messy input
 */
export function detectCarMake(rawMake: string, title = ""): { make: string; model: string } {
  const cleanMake = stripHtml(rawMake);
  const cleanTitle = stripHtml(title);
  const combined = `${cleanMake} ${cleanTitle}`.toLowerCase();

  for (const make of KNOWN_CAR_MAKES) {
    const makeLower = make.toLowerCase();
    // Check word boundary
    const regex = new RegExp(`\\b${makeLower}\\b`, "i");
    if (regex.test(combined)) {
      // Normalize VW -> Volkswagen
      const normalizedMake = make === "VW" ? "Volkswagen" : make === "Škoda" ? "Skoda" : make;
      return { make: normalizedMake, model: "" };
    }
  }

  // If cleanMake looks like a normal brand name (< 25 chars, no html leftover, not just digits)
  if (
    cleanMake &&
    cleanMake.length > 1 &&
    cleanMake.length <= 25 &&
    !cleanMake.includes("<") &&
    !cleanMake.includes(">") &&
    !cleanMake.includes(";") &&
    !/^\d+$/.test(cleanMake) &&
    cleanMake !== "-1"
  ) {
    return { make: cleanMake, model: "" };
  }

  return { make: "Inne / Uniwersalna", model: "" };
}

/**
 * Sanitize an entire PartItem object to guarantee clean display and filtering
 */
export function sanitizePartItem(item: PartItem): PartItem {
  if (!item || !item.listingData) return item;

  const rawSamochod = (item.listingData.samochod || {}) as { marka?: string; model?: string; rocznik?: string };
  const rawMarka = rawSamochod.marka || item.listingData.marka || "";
  const rawModel = rawSamochod.model || item.listingData.model || "";
  const rawRocznik = rawSamochod.rocznik || item.listingData.rocznik || "";
  const rawKategoria = item.listingData.kategoria || "";
  const rawOpis = item.listingData.opis || "";
  const rawNumery = item.listingData.numery_czesci || "";
  const rawRegal = item.listingData.ocr_wyniki?.numer_magazynowy || "";

  // Clean strings
  const cleanKategoria = stripHtml(rawKategoria) || "Część samochodowa";
  const cleanModel = stripHtml(rawModel);
  const cleanRocznik = stripHtml(rawRocznik);
  const cleanNumery = stripHtml(rawNumery);
  const cleanOpis = stripHtml(rawOpis);
  const cleanRegal = stripHtml(rawRegal) || "MAG 14";

  // Check if make is dirty/corrupted
  let cleanMake = stripHtml(rawMarka);
  if (
    !cleanMake ||
    cleanMake.length > 25 ||
    cleanMake.includes("<") ||
    cleanMake.includes(">") ||
    cleanMake === "-1" ||
    cleanMake.includes("Alternator") ||
    cleanMake.includes("Czesc") ||
    cleanMake.includes("demontazu") ||
    /^\d+$/.test(cleanMake)
  ) {
    const detected = detectCarMake(rawMarka, `${cleanKategoria} ${cleanOpis} ${cleanModel}`);
    cleanMake = detected.make;
  }

  return {
    ...item,
    listingData: {
      ...item.listingData,
      kategoria: cleanKategoria,
      opis: cleanOpis,
      numery_czesci: cleanNumery,
      samochod: {
        marka: cleanMake,
        model: cleanModel || rawModel,
        rocznik: cleanRocznik,
      },
      ocr_wyniki: {
        ...(item.listingData.ocr_wyniki || {}),
        numer_magazynowy: cleanRegal,
        napisy_markerem: stripHtml(item.listingData.ocr_wyniki?.napisy_markerem),
      },
    },
  };
}

/**
 * Sanitize an array of PartItems
 */
export function sanitizePartItems(items: PartItem[]): PartItem[] {
  if (!Array.isArray(items)) return [];
  return items.map(sanitizePartItem);
}
