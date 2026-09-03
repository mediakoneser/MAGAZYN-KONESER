/**
 * Silnik Sugerowania Cen Rynkowych Allegro dla Części Samochodowych
 * Stacja Demontażu Pojazdów PHU U KONESERA Mysłakowice
 */

export interface AllegroPriceEstimate {
  category: string;
  minPrice: number;
  avgPrice: number;
  maxPrice: number;
  currency: "PLN";
  confidence: "Wysoka" | "Średnia" | "Orientacyjna";
  demandLevel: "Wysoki" | "Średni" | "Umiarkowany";
  notes: string;
  source: "allegro_market_benchmark" | "google_grounding" | "historical_sales";
}

// Baza rynkowych benchmarków cenowych Allegro dla najczęstszych kategorii części używanych (OE)
const CATEGORY_BENCHMARKS: Array<{
  keywords: string[];
  categoryName: string;
  min: number;
  avg: number;
  max: number;
  demand: "Wysoki" | "Średni" | "Umiarkowany";
  notes: string;
}> = [
  {
    keywords: ["alternator", "alt 140", "alt 120", "ładowania"],
    categoryName: "Alternatory i osprzęt",
    min: 120,
    avg: 180,
    max: 260,
    demand: "Wysoki",
    notes: "Popularna część eksploatacyjna. Ceny zależą od natężenia (120A/140A/180A) i stanu koła pasowego.",
  },
  {
    keywords: ["rozrusznik", "rozrusz", "starter"],
    categoryName: "Rozruszniki",
    min: 80,
    avg: 130,
    max: 190,
    demand: "Wysoki",
    notes: "Wysoka rotacja na Allegro, szczególnie w sezonie zimowym.",
  },
  {
    keywords: ["lampa tył", "lampa tylna", "światło tylne", "klosz tył", "lt ", "lampy tył"],
    categoryName: "Lampy tylne i klosze",
    min: 60,
    avg: 110,
    max: 220,
    demand: "Wysoki",
    notes: "Wycena zależy od wersji (zwykła żarówkowa vs LED / Lift) oraz kompletności wkładu żarówek.",
  },
  {
    keywords: ["reflektor", "lampa przód", "reflektor przedni", "xenon", "bixenon", "led"],
    categoryName: "Reflektory przednie",
    min: 140,
    avg: 290,
    max: 650,
    demand: "Wysoki",
    notes: "Kluczowa jest przejrzystość klosza i brak urwanych uchwytów montażowych.",
  },
  {
    keywords: ["kompresor", "sprężarka klimatyzacji", "klimatyzacji", "pompa klimy"],
    categoryName: "Kompresory klimatyzacji",
    min: 180,
    avg: 280,
    max: 450,
    demand: "Wysoki",
    notes: "Wysoki popyt wiosną i latem. Wymaga zabezpieczenia zaślepkami przed wilgocią.",
  },
  {
    keywords: ["pompa wspomagania", "wspomaganie", "maglownica", "przekładnia kierownicza"],
    categoryName: "Układ kierowniczy i wspomaganie",
    min: 120,
    avg: 220,
    max: 380,
    demand: "Średni",
    notes: "Sprawdzana pod kątem szczelności i braku opiłków.",
  },
  {
    keywords: ["przepustnica", "przepustnicy"],
    categoryName: "Przepustnice powietrza",
    min: 80,
    avg: 140,
    max: 220,
    demand: "Średni",
    notes: "Część o małych gabarytach, łatwa w taniej wysyłce Paczkomatem.",
  },
  {
    keywords: ["turbosprężarka", "turbo", "turbina", "garrett"],
    categoryName: "Turbosprężarki",
    min: 350,
    avg: 650,
    max: 1200,
    demand: "Wysoki",
    notes: "Wymaga weryfikacji luzu wzdłużnego i poprzecznego wirnika oraz gruszki geometrii.",
  },
  {
    keywords: ["wtryskiwacz", "wtrysk", "common rail", "pompowtrysk", "wtryski"],
    categoryName: "Układ wtryskowy (Wtryskiwacze)",
    min: 120,
    avg: 240,
    max: 450,
    demand: "Wysoki",
    notes: "Cena za 1 szt. Bosch/Siemens/Denso. Weryfikacja kodu IMA.",
  },
  {
    keywords: ["sterownik", "ecu", "komputer silnika", "moduł bsi", "moduł komfortu"],
    categoryName: "Sterowniki i elektronika (ECU)",
    min: 100,
    avg: 190,
    max: 380,
    demand: "Średni",
    notes: "Bardzo poszukiwane w kompletach ze stacyjką i kluczykiem.",
  },
  {
    keywords: ["licznik", "zegary", "deska", "wyświetlacz"],
    categoryName: "Zestawy wskaźników / Liczniki",
    min: 70,
    avg: 130,
    max: 240,
    demand: "Średni",
    notes: "Zależne od rodzaju paliwa (Diesel/Benzyna) i wersji z pełnym FIS/MFA.",
  },
  {
    keywords: ["daszek", "ramka", "kratka", "nawiew", "panel", "przełącznik", "włącznik"],
    categoryName: "Elementy wnętrza i przełączniki",
    min: 35,
    avg: 65,
    max: 120,
    demand: "Średni",
    notes: "Wysoka marża ze względu na niski koszt pozyskania z auta.",
  },
  {
    keywords: ["drzwi", "poszycie", "klapa", "maska", "błotnik", "zderzak"],
    categoryName: "Blacharka i elementy karoserii",
    min: 150,
    avg: 280,
    max: 550,
    demand: "Średni",
    notes: "Wycena zależy od kodu lakieru (oryginalny lakier bez szpachli to +30% ceny).",
  },
  {
    keywords: ["lusterko", "wkład lusterka", "lusterka"],
    categoryName: "Lusterka zewnętrzne",
    min: 60,
    avg: 110,
    max: 200,
    demand: "Wysoki",
    notes: "Wersje elektryczne, podgrzewane, z kierunkowskazem.",
  },
  {
    keywords: ["pedał", "pedal", "potencjometr gazu", "ramię pedału"],
    categoryName: "Pedały i sterowanie",
    min: 45,
    avg: 80,
    max: 130,
    demand: "Umiarkowany",
    notes: "Popularne w grupie VAG / Opel.",
  },
];

/**
 * Sugeruje rynkową cenę Allegro na podstawie kategorii, marki, modelu i numeru OEM
 */
export function estimateAllegroMarketPrice(
  categoryName: string,
  carMake?: string,
  carModel?: string,
  oemNumber?: string
): AllegroPriceEstimate {
  const query = `${categoryName || ""} ${oemNumber || ""} ${carMake || ""}`.toLowerCase();

  // Szukaj dopasowania w bazie benchmarków Allegro
  let match = CATEGORY_BENCHMARKS.find((b) =>
    b.keywords.some((k) => query.includes(k.toLowerCase()))
  );

  // Mnożnik marki (np. BMW, Audi, Mercedes mają wyższe ceny na Allegro niż Fiat czy Daewoo)
  let makeMultiplier = 1.0;
  const upperMake = (carMake || "").toUpperCase();
  if (upperMake.includes("BMW") || upperMake.includes("MERCEDES") || upperMake.includes("AUDI") || upperMake.includes("VOLVO") || upperMake.includes("LEXUS")) {
    makeMultiplier = 1.35;
  } else if (upperMake.includes("VOLKSWAGEN") || upperMake.includes("SKODA") || upperMake.includes("SEAT") || upperMake.includes("FORD") || upperMake.includes("OPEL") || upperMake.includes("TOYOTA")) {
    makeMultiplier = 1.0;
  } else if (upperMake.includes("RENAULT") || upperMake.includes("PEUGEOT") || upperMake.includes("CITROEN") || upperMake.includes("FIAT")) {
    makeMultiplier = 0.9;
  }

  if (match) {
    const min = Math.round(match.min * makeMultiplier);
    const avg = Math.round(match.avg * makeMultiplier);
    const max = Math.round(match.max * makeMultiplier);

    return {
      category: match.categoryName,
      minPrice: min,
      avgPrice: avg,
      maxPrice: max,
      currency: "PLN",
      confidence: "Wysoka",
      demandLevel: match.demand,
      notes: `${match.notes} (Uwzględniono współczynnik marki ${carMake || "Grupa VAG"}: x${makeMultiplier.toFixed(2)}).`,
      source: "allegro_market_benchmark",
    };
  }

  // Domyślny estymator dla pozostałych części samochodowych
  const baseAvg = 110;
  return {
    category: categoryName || "Część samochodowa z demontażu",
    minPrice: Math.round(50 * makeMultiplier),
    avgPrice: Math.round(baseAvg * makeMultiplier),
    maxPrice: Math.round(190 * makeMultiplier),
    currency: "PLN",
    confidence: "Orientacyjna",
    demandLevel: "Średni",
    notes: `Orientacyjna wycena na podstawie średniej koszyka części używanych na Allegro dla marki ${carMake || "pojazdu"}.`,
    source: "allegro_market_benchmark",
  };
}
