import { AllegroCategoryParameterDef, CanonicalProduct } from "../types/canonicalProduct";

export interface AllegroCategoryMeta {
  id: string;
  name: string;
  path: string[];
  leaf: boolean;
  requiredParameters: AllegroCategoryParameterDef[];
  optionalParameters: AllegroCategoryParameterDef[];
}

export const KNOWN_ALLEGRO_CATEGORIES: Record<string, AllegroCategoryMeta> = {
  // Motoryzacja > Części samochodowe > Układ elektryczny, zapłon > Alternatory
  "253106": {
    id: "253106",
    name: "Alternatory",
    path: ["Motoryzacja", "Części samochodowe", "Układ elektryczny, zapłon", "Alternatory"],
    leaf: true,
    requiredParameters: [
      {
        id: "11323",
        name: "Stan",
        type: "dictionary",
        required: true,
        dictionary: [
          { id: "11323_1", value: "Nowy" },
          { id: "11323_2", value: "Używany" },
          { id: "11323_3", value: "Regenerowany" },
          { id: "11323_4", value: "Po zwrocie" },
        ],
      },
      {
        id: "201385",
        name: "Producent części",
        type: "string",
        required: true,
      },
      {
        id: "201386",
        name: "Numer katalogowy części",
        type: "string",
        required: true,
      },
      {
        id: "201387",
        name: "Jakość części (zgodnie z GVO)",
        type: "dictionary",
        required: true,
        dictionary: [
          { id: "Q_OE", value: "O - oryginał z logo producenta pojazdu (OE)" },
          { id: "Q_OEM", value: "Q - oryginał z logo producenta części (OEM, OES)" },
          { id: "Q_PJ", value: "P - zamiennik o jakości porównywalnej do oryginału" },
          { id: "Q_Z", value: "Z - zamiennik" },
        ],
      },
    ],
    optionalParameters: [
      { id: "201388", name: "Prąd ładowania alternatora", type: "string", required: false, unit: "A" },
      { id: "201389", name: "Napięcie", type: "string", required: false, unit: "V" },
      { id: "201390", name: "Koło pasowe", type: "string", required: false },
      { id: "201391", name: "Typ samochodu", type: "string", required: false },
      { id: "201392", name: "Wersja", type: "string", required: false },
      { id: "201393", name: "Numery katalogowe zamienników", type: "string", required: false },
    ],
  },

  // Motoryzacja > Części samochodowe > Silniki i osprzęt > Turbosprężarki
  "253108": {
    id: "253108",
    name: "Turbosprężarki",
    path: ["Motoryzacja", "Części samochodowe", "Silniki i osprzęt", "Turbosprężarki"],
    leaf: true,
    requiredParameters: [
      {
        id: "11323",
        name: "Stan",
        type: "dictionary",
        required: true,
        dictionary: [
          { id: "11323_1", value: "Nowy" },
          { id: "11323_2", value: "Używany" },
          { id: "11323_3", value: "Regenerowany" },
        ],
      },
      { id: "201385", name: "Producent części", type: "string", required: true },
      { id: "201386", name: "Numer katalogowy części", type: "string", required: true },
      { id: "201387", name: "Jakość części (zgodnie z GVO)", type: "dictionary", required: true, dictionary: [
        { id: "Q_OE", value: "O - oryginał z logo producenta pojazdu (OE)" },
        { id: "Q_OEM", value: "Q - oryginał z logo producenta części (OEM, OES)" },
      ]},
    ],
    optionalParameters: [
      { id: "201394", name: "Rodzaj paliwa", type: "string", required: false },
      { id: "201395", name: "Pojemność silnika", type: "string", required: false },
    ],
  },

  // Motoryzacja > Części samochodowe > Oświetlenie > Reflektory i lampy
  "253110": {
    id: "253110",
    name: "Lampy przednie i reflektory",
    path: ["Motoryzacja", "Części samochodowe", "Oświetlenie", "Lampy przednie"],
    leaf: true,
    requiredParameters: [
      {
        id: "11323",
        name: "Stan",
        type: "dictionary",
        required: true,
        dictionary: [
          { id: "11323_1", value: "Nowy" },
          { id: "11323_2", value: "Używany" },
        ],
      },
      { id: "201385", name: "Producent części", type: "string", required: true },
      { id: "201386", name: "Numer katalogowy części", type: "string", required: true },
      {
        id: "201400",
        name: "Strona zabudowy",
        type: "dictionary",
        required: true,
        dictionary: [
          { id: "SIDE_L", value: "Lewa (od kierowcy)" },
          { id: "SIDE_R", value: "Prawa (od pasażera)" },
          { id: "SIDE_LR", value: "Komplet lewa + prawa" },
        ],
      },
      {
        id: "201401",
        name: "Ruch",
        type: "dictionary",
        required: true,
        dictionary: [
          { id: "RHD_NO", value: "Prawostronny (Europa, wersja kontynentalna)" },
          { id: "RHD_YES", value: "Lewostronny (Anglik, RHD)" },
        ],
      },
    ],
    optionalParameters: [
      { id: "201402", name: "Technologia świateł", type: "string", required: false },
      { id: "201403", name: "Regulacja wysokości", type: "string", required: false },
    ],
  },

  // Domyślna kategoria motoryzacyjna
  "50849": {
    id: "50849",
    name: "Części samochodowe (Kategoria Główna)",
    path: ["Motoryzacja", "Części samochodowe"],
    leaf: true,
    requiredParameters: [
      {
        id: "11323",
        name: "Stan",
        type: "dictionary",
        required: true,
        dictionary: [
          { id: "11323_1", value: "Nowy" },
          { id: "11323_2", value: "Używany" },
          { id: "11323_3", value: "Regenerowany" },
        ],
      },
      { id: "201385", name: "Producent części", type: "string", required: true },
      { id: "201386", name: "Numer katalogowy części", type: "string", required: true },
    ],
    optionalParameters: [
      { id: "201387", name: "Jakość części (zgodnie z GVO)", type: "string", required: false },
      { id: "201391", name: "Typ samochodu", type: "string", required: false },
      { id: "201400", name: "Strona zabudowy", type: "string", required: false },
    ],
  },

  // AGD i Dom
  "10": {
    id: "10",
    name: "Dom i Ogród > AGD",
    path: ["Dom i Ogród", "AGD"],
    leaf: true,
    requiredParameters: [
      {
        id: "11323",
        name: "Stan",
        type: "dictionary",
        required: true,
        dictionary: [
          { id: "11323_1", value: "Nowy" },
          { id: "11323_2", value: "Używany" },
        ],
      },
      { id: "11324", name: "Marka", type: "string", required: true },
      { id: "11325", name: "Model", type: "string", required: true },
    ],
    optionalParameters: [
      { id: "11326", name: "Kolor dominujący", type: "string", required: false },
      { id: "11327", name: "Materiał", type: "string", required: false },
    ],
  },
};

/**
 * Automatically maps a raw category or product keywords to the best Allegro Category
 */
export function matchAllegroCategory(
  categoryName: string,
  productTitle: string,
  brand?: string
): { id: string; name: string; path: string[]; confidence: number } {
  const combined = `${categoryName} ${productTitle} ${brand || ""}`.toLowerCase();

  if (combined.includes("alternator") || combined.includes("prądnica")) {
    return {
      id: "253106",
      name: KNKNOWN_CATEGORY_NAME("253106"),
      path: KNOWN_ALLEGRO_CATEGORIES["253106"].path,
      confidence: 0.95,
    };
  }

  if (combined.includes("turbo") || combined.includes("turbosprężark")) {
    return {
      id: "253108",
      name: KNKNOWN_CATEGORY_NAME("253108"),
      path: KNOWN_ALLEGRO_CATEGORIES["253108"].path,
      confidence: 0.95,
    };
  }

  if (
    combined.includes("lampa") ||
    combined.includes("reflektor") ||
    combined.includes("ksenon") ||
    combined.includes("xenon") ||
    combined.includes("światł")
  ) {
    return {
      id: "253110",
      name: KNKNOWN_CATEGORY_NAME("253110"),
      path: KNOWN_ALLEGRO_CATEGORIES["253110"].path,
      confidence: 0.92,
    };
  }

  if (
    combined.includes("agd") ||
    combined.includes("zmywarka") ||
    combined.includes("lodówka") ||
    combined.includes("ekspres") ||
    combined.includes("odkurzacz")
  ) {
    return {
      id: "10",
      name: KNKNOWN_CATEGORY_NAME("10"),
      path: KNOWN_ALLEGRO_CATEGORIES["10"].path,
      confidence: 0.9,
    };
  }

  // Fallback to general automotive parts
  return {
    id: "50849",
    name: KNKNOWN_CATEGORY_NAME("50849"),
    path: KNOWN_ALLEGRO_CATEGORIES["50849"].path,
    confidence: 0.75,
  };
}

function KNKNOWN_CATEGORY_NAME(id: string): string {
  return KNOWN_ALLEGRO_CATEGORIES[id]?.name || "Części samochodowe";
}

/**
 * Builds standard Allegro Parameters payload from CanonicalProduct
 */
export function buildAllegroParameters(product: CanonicalProduct, categoryId: string): Array<{ id: string; values?: string[]; valuesIds?: string[]; rangeValue?: any }> {
  const catMeta = KNOWN_ALLEGRO_CATEGORIES[categoryId] || KNOWN_ALLEGRO_CATEGORIES["50849"];
  const parametersList: Array<{ id: string; values?: string[]; valuesIds?: string[] }> = [];

  // 1. Stan (State)
  const conditionVal = String(product.parameters?.["stan"] || product.parameters?.["condition"] || "Używany").toLowerCase();
  if (conditionVal.includes("nowy")) {
    parametersList.push({ id: "11323", valuesIds: ["11323_1"], values: ["Nowy"] });
  } else if (conditionVal.includes("regen")) {
    parametersList.push({ id: "11323", valuesIds: ["11323_3"], values: ["Regenerowany"] });
  } else {
    parametersList.push({ id: "11323", valuesIds: ["11323_2"], values: ["Używany"] });
  }

  // 2. Producent części
  const producer = product.brand || (product.parameters?.["producent"] as string) || "Oryginalny OE";
  parametersList.push({ id: "201385", values: [producer] });

  // 3. Numer katalogowy części (MPN / OEM)
  const mpn = product.mpn || (product.parameters?.["numery_czesci"] as string) || product.sku || "OE";
  parametersList.push({ id: "201386", values: [mpn] });

  // 4. Jakość części GVO
  parametersList.push({ id: "201387", valuesIds: ["Q_OE"], values: ["O - oryginał z logo producenta pojazdu (OE)"] });

  // 5. Strona zabudowy (jeśli występuje w parametrach lub nazwie)
  const textToScan = `${product.name} ${product.description_raw} ${JSON.stringify(product.parameters)}`.toLowerCase();
  if (textToScan.includes("lewa") || textToScan.includes("lewy") || textToScan.includes("kierowc")) {
    parametersList.push({ id: "201400", valuesIds: ["SIDE_L"], values: ["Lewa (od kierowcy)"] });
  } else if (textToScan.includes("prawa") || textToScan.includes("prawy") || textToScan.includes("pasażer")) {
    parametersList.push({ id: "201400", valuesIds: ["SIDE_R"], values: ["Prawa (od pasażera)"] });
  }

  // 6. EAN / GTIN parameter
  if (product.gtin && product.gtin.trim()) {
    parametersList.push({ id: "225693", values: [product.gtin.trim()] });
  }

  return parametersList;
}
