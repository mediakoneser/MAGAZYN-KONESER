import { PartItem } from "../types";

/**
 * Remove Polish diacritics and normalize accents
 */
export function removeDiacritics(str: string): string {
  if (!str) return "";
  return str
    .replace(/[ąĄ]/g, "a")
    .replace(/[ćĆ]/g, "c")
    .replace(/[ęĘ]/g, "e")
    .replace(/[łŁ]/g, "l")
    .replace(/[ńŃ]/g, "n")
    .replace(/[óÓ]/g, "o")
    .replace(/[śŚ]/g, "s")
    .replace(/[źŹ]/g, "z")
    .replace(/[żŻ]/g, "z")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Clean text for standard tokenization: lowercase, no diacritics, simplified punctuation
 */
export function normalizeText(str: string): string {
  if (!str) return "";
  return removeDiacritics(str.toLowerCase())
    .replace(/[^\w\s\d]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Clean alphanumeric string (e.g., OEM numbers, VIN, Part Codes without spaces/dashes)
 */
export function cleanCode(str: string): string {
  if (!str) return "";
  return removeDiacritics(str.toLowerCase()).replace(/[^a-z0-9]/g, "");
}

/**
 * Automotive Polish Stemming & Synonym expansion dictionary
 */
const SYNONYMS_MAP: Record<string, string[]> = {
  // Oświetlenie
  reflektor: ["lampa", "reflektory", "lampy", "swiatlo", "xenon", "led", "bixenon", "zarowka"],
  lampa: ["reflektor", "reflektory", "lampy", "swiatlo", "tylna", "przednia", "led", "halogen"],
  halogen: ["przeciwmgielne", "przeciwmgielna", "lampa"],
  // Nadwozie & Blacharka
  szyba: ["szyby", "szybe", "czolowa", "boczna", "tylna", "trojkat", "drzwiowa"],
  zderzak: ["zderzaka", "zderzaki", "dokladka", "dyfuzor", "hokej"],
  blotnik: ["blotnika", "blotniki", "nadkole"],
  błotnik: ["blotnik", "blotnika", "nadkole"],
  maska: ["maski", "maske", "pokrywa silnika"],
  klapa: ["klapy", "klape", "bagaznik", "pokrywa bagaznika", "tylna"],
  drzwi: ["drzwiowe", "drzwiami", "poszycie"],
  lusterko: ["lusterka", "lusterkiem", "wklad", "obudowa"],
  grill: ["atrapa", "kratka", "nerki", "wlot"],
  atrapa: ["grill", "kratka", "nerki"],
  // Układ Napędowy & Silnik
  silnik: ["motor", "silnika", "jednostka", "agregat", "slupek"],
  motor: ["silnik", "slupek"],
  skrzynia: ["skrzyni", "skrzynie", "biegow", "manual", "automat", "dsg", "tiptronic"],
  sprzeglo: ["sprzegla", "dwumasa", "docisk", "tarcza"],
  turbosprezarka: ["turbo", "turbina", "turbosprezarki", "vnt", "garrett"],
  turbina: ["turbo", "turbosprezarka", "vnt"],
  turbo: ["turbina", "turbosprezarka"],
  wtrysk: ["wtryski", "wtryskiwacz", "wtryskiwacze", "common rail", "pompowtrysk"],
  wtryskiwacz: ["wtrysk", "wtryski", "pompowtryskiwacz"],
  pompa: ["pompka", "wtryskowa", "paliwa", "wspomagania", "abs", "esp"],
  alternator: ["pradnica", "ladowanie"],
  rozrusznik: ["starter"],
  kolektor: ["ssacy", "wydechowy"],
  katalizator: ["kat", "dpf", "fap", "tlumik", "wydech"],
  dpf: ["fap", "katalizator", "filtr czastek"],
  // Zawieszenie & Hamulce
  zacisk: ["zacisku", "zaciski", "jarzmo", "hamulcowy"],
  tarcza: ["tarcze", "hamulcowa", "hamulcowe"],
  amortyzator: ["amortyzatory", "amory", "kolumna", "mcpherson"],
  wahacz: ["wahacze", "wahacza", "tuleja", "sworzen"],
  zwrotnica: ["zwrotnice", "piasta", "lozysko"],
  belka: ["sanki", "wspornik", "rama", "wozek"],
  maglownica: ["przekladnia", "kierownicza", "wspomaganie"],
  // Elektronika
  sterownik: ["komputer", "ecu", "modul", "bsi", "uch", "sam", "sensor"],
  komputer: ["sterownik", "ecu", "modul"],
  ecu: ["sterownik", "komputer", "silnika"],
  licznik: ["zegary", "zegar", "wyswietlacz", "zegary"],
  radio: ["nawigacja", "navi", "radioodtwarzacz", "ekran", "mmi", "rns"],
  // Strony i pozycje
  lewa: ["lewy", "lewe", "lh", "left", "l"],
  lewy: ["lewa", "lewe", "lh", "left", "l"],
  prawa: ["prawy", "prawe", "rh", "right", "p"],
  prawy: ["prawa", "prawe", "rh", "right", "p"],
  przod: ["przedni", "przednia", "przednie", "front"],
  przedni: ["przod", "przednia", "przednie", "front"],
  tyl: ["tylny", "tylna", "tylne", "rear", "back"],
  tylny: ["tyl", "tylna", "tylne", "rear"],
  gora: ["gorny", "gorna", "gorne"],
  dol: ["dolny", "dolna", "dolne"],
  // Marki i skróty
  vw: ["volkswagen", "passat", "golf", "touran", "polo"],
  volkswagen: ["vw"],
  mercedes: ["merc", "benz", "w203", "w204", "w211", "w212"],
  bmw: ["e46", "e90", "e60", "f10", "f30"],
  citroen: ["cytryna", "c3", "c4", "c5", "berlingo", "xsara", "picasso"],
  peugeot: ["206", "207", "307", "308", "407", "508", "partner"],
  renault: ["megane", "scenic", "laguna", "clio", "master", "trafic"],
};

/**
 * Get all expanded search variations for a given word
 */
export function getWordVariations(word: string): string[] {
  const norm = normalizeText(word);
  if (!norm) return [];

  const variations = new Set<string>();
  variations.add(norm);

  // Check synonyms dictionary
  if (SYNONYMS_MAP[norm]) {
    SYNONYMS_MAP[norm].forEach((s) => variations.add(normalizeText(s)));
  }

  // Also check if any key in map contains or matches this word
  for (const [key, syns] of Object.entries(SYNONYMS_MAP)) {
    if (key === norm || syns.some((s) => normalizeText(s) === norm)) {
      variations.add(normalizeText(key));
      syns.forEach((s) => variations.add(normalizeText(s)));
    }
  }

  // Polish stem endings trimming (basic heuristic for common car part word forms)
  // e.g. "szyby" -> "szyb", "reflektory" -> "reflektor", "przednia" -> "przedn"
  if (norm.length > 4) {
    const trimmed = norm.replace(/(ami|ach|ych|ego|emu|owe|owa|owy|ych|ie|em|om|ce|ka|ek|ów|ow|y|a|e|u|i|o)$/i, "");
    if (trimmed.length >= 3) {
      variations.add(trimmed);
    }
  }

  return Array.from(variations).filter((v) => v.length >= 2);
}

/**
 * Extracts a unified searchable text bundle for a PartItem
 */
export function extractPartSearchableText(part: PartItem): {
  unifiedText: string;
  normalizedText: string;
  cleanOemCodes: string[];
  cleanWarehouseCode: string;
} {
  const data = part.listingData || ({} as any);
  const veh = data.samochod || {};

  const make = veh.marka || data.marka || "";
  const model = veh.model || data.model || "";
  const generation = veh.generacja || data.generacja || "";
  const year = veh.rok_produkcji || veh.rocznik || data.rocznik || "";
  const engine = veh.silnik || data.silnik || veh.pojemnosc || "";
  const engineCode = veh.kod_silnika || data.kod_silnika || "";
  const paintCode = veh.kod_lakieru || data.kod_lakieru || "";
  const category = data.kategoria || "";
  const title = data.tytul || data.title || `${make} ${model} ${category}`;
  const partNumbers = data.numery_czesci || data.oem || "";
  const partNumberReplacement = data.numery_zamiennikow || "";
  const rack = data.ocr_wyniki?.numer_magazynowy || data.numer_magazynowy || data.regal || "";
  const placement = `${data.strona_zabudowy || ""} ${data.przod_tyl || ""} ${data.lewa_prawa || ""}`;
  const worker = part.createdByName || data.workerName || "";
  const notes = data.uwagi_stan || data.stan_opis || data.opis || "";
  const condition = data.stan || "";
  const status = part.status || "Dostępny";
  const allegroId = part.allegroOfferId || data.allegro?.offerId || "";

  const unified = [
    title,
    category,
    make,
    model,
    generation,
    year,
    engine,
    engineCode,
    paintCode,
    partNumbers,
    partNumberReplacement,
    rack,
    placement,
    worker,
    notes,
    condition,
    status,
    allegroId,
  ]
    .filter(Boolean)
    .join(" ");

  const normalized = normalizeText(unified);

  // Extract cleaned alphanumeric codes
  const oemTokens = (partNumbers + " " + partNumberReplacement + " " + engineCode + " " + paintCode)
    .split(/[\s,;/|-]+/)
    .map(cleanCode)
    .filter((c) => c.length >= 3);

  const cleanWarehouse = cleanCode(rack);

  return {
    unifiedText: unified,
    normalizedText: normalized,
    cleanOemCodes: oemTokens,
    cleanWarehouseCode: cleanWarehouse,
  };
}

/**
 * Smart Multi-Token Matching:
 * Evaluates whether every token in `query` matches the item,
 * regardless of word order, with diacritics resilience, OEM code flexibility, and synonyms.
 * 
 * Example:
 * Query "szyba citroen" matches "Citroen C4 Szyba czołowa"
 * Query "citroen szyba" matches "Citroen C4 Szyba czołowa"
 * Query "reflektor audi a4" matches "Audi A4 B8 Lampa przednia prawa"
 * Query "1k0953549bk" matches "1K0 953 549 BK"
 */
export function smartMatchPart(part: PartItem, rawQuery: string): boolean {
  if (!rawQuery || !rawQuery.trim()) return true;

  const query = rawQuery.trim();
  const queryNormalized = normalizeText(query);
  if (!queryNormalized) return true;

  const { normalizedText, cleanOemCodes, cleanWarehouseCode } = extractPartSearchableText(part);

  // 1. Direct normalized full phrase match (fast path)
  if (normalizedText.includes(queryNormalized)) {
    return true;
  }

  // 2. Direct clean code match (e.g. searching OEM without spaces or dashes)
  const queryClean = cleanCode(query);
  if (queryClean.length >= 3) {
    if (cleanWarehouseCode && cleanWarehouseCode.includes(queryClean)) {
      return true;
    }
    if (cleanOemCodes.some((oem) => oem.includes(queryClean) || queryClean.includes(oem))) {
      return true;
    }
  }

  // 3. Multi-token smart search (ALL tokens must match in any order)
  const queryTokens = queryNormalized.split(/\s+/).filter((t) => t.length > 0);
  if (queryTokens.length === 0) return true;

  const allTokensMatched = queryTokens.every((token) => {
    // Check if token directly exists in normalized text
    if (normalizedText.includes(token)) {
      return true;
    }

    // Check if token matches any clean OEM code
    const tokenClean = cleanCode(token);
    if (tokenClean.length >= 3) {
      if (cleanOemCodes.some((oem) => oem.includes(tokenClean) || tokenClean.includes(oem))) {
        return true;
      }
      if (cleanWarehouseCode && cleanWarehouseCode.includes(tokenClean)) {
        return true;
      }
    }

    // Check synonym / stem variations for this token
    const variations = getWordVariations(token);
    for (const v of variations) {
      if (normalizedText.includes(v)) {
        return true;
      }
    }

    return false;
  });

  return allTokensMatched;
}

/**
 * Generic Smart Match for arbitrary strings/objects
 */
export function smartMatchText(
  targetTextOrArray: string | string[] | undefined | null,
  rawQuery: string
): boolean {
  if (!rawQuery || !rawQuery.trim()) return true;
  if (!targetTextOrArray) return false;

  const textToSearch = Array.isArray(targetTextOrArray)
    ? targetTextOrArray.filter(Boolean).join(" ")
    : String(targetTextOrArray);

  const queryNormalized = normalizeText(rawQuery);
  const targetNormalized = normalizeText(textToSearch);

  if (!queryNormalized) return true;
  if (targetNormalized.includes(queryNormalized)) return true;

  const queryTokens = queryNormalized.split(/\s+/).filter((t) => t.length > 0);
  return queryTokens.every((token) => {
    if (targetNormalized.includes(token)) return true;
    const variations = getWordVariations(token);
    return variations.some((v) => targetNormalized.includes(v));
  });
}

/**
 * Filters an array of parts using the smart search algorithm
 */
export function smartFilterParts(parts: PartItem[], query: string): PartItem[] {
  if (!query || !query.trim()) return parts;
  return parts.filter((part) => smartMatchPart(part, query));
}
