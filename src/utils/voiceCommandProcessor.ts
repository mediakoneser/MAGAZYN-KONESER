import { ActiveTabType, PartListingData } from "../types";

export interface VoiceCommandResult {
  action: "NAVIGATE" | "SEARCH" | "SYNC" | "URGENT_TASK" | "PARSE_PART" | "UNKNOWN";
  targetTab?: ActiveTabType;
  searchQuery?: string;
  taskTitle?: string;
  parsedPart?: Partial<PartListingData>;
  feedbackMessage: string;
}

// Speak response via browser SpeechSynthesis if available
export function speakFeedback(text: string, enabled: boolean = true): void {
  if (!enabled) return;
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel(); // cancel previous speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pl-PL";
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // Pick Polish voice if present
    const voices = window.speechSynthesis.getVoices();
    const plVoice = voices.find((v) => v.lang.includes("pl"));
    if (plVoice) {
      utterance.voice = plVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    // Speech synthesis may fail or be restricted
  }
}

// Process voice transcript into actionable panel actions
export function processVoiceCommand(transcript: string): VoiceCommandResult {
  const normalized = transcript.toLowerCase().trim();

  // 1. Navigation Commands
  if (normalized.includes("magazyn") || normalized.includes("pokaż części") || normalized.includes("części")) {
    return {
      action: "NAVIGATE",
      targetTab: "magazyn",
      feedbackMessage: "Przełączam na magazyn części.",
    };
  }

  if (normalized.includes("skaner") || normalized.includes("nowa część") || normalized.includes("skanuj") || normalized.includes("aparat")) {
    return {
      action: "NAVIGATE",
      targetTab: "skaner",
      feedbackMessage: "Otwieram Skaner AI i formularz części.",
    };
  }

  if (normalized.includes("diagnostyka allegro") || normalized.includes("diagnostyk")) {
    return {
      action: "NAVIGATE",
      targetTab: "allegro_diagnostics",
      feedbackMessage: "Otwieram diagnostykę API Allegro.",
    };
  }

  if (normalized.includes("allegro") || normalized.includes("aukcje")) {
    return {
      action: "NAVIGATE",
      targetTab: "allegro",
      feedbackMessage: "Przechodzę do Centrum Allegro.",
    };
  }

  if (normalized.includes("ovoko") || normalized.includes("rrr")) {
    return {
      action: "NAVIGATE",
      targetTab: "ovoko",
      feedbackMessage: "Otwieram integrację z Ovoko.",
    };
  }

  if (normalized.includes("porównaj") || normalized.includes("rynki") || normalized.includes("compare")) {
    return {
      action: "NAVIGATE",
      targetTab: "compare_marketplaces",
      feedbackMessage: "Otwieram matrycę porównania rynków.",
    };
  }

  if (normalized.includes("szef") || normalized.includes("panel szefa") || normalized.includes("zarząd")) {
    return {
      action: "NAVIGATE",
      targetTab: "szef",
      feedbackMessage: "Otwieram Panel Szefa i Zarządu.",
    };
  }

  if (normalized.includes("pracownik") || normalized.includes("stanowisko") || normalized.includes("zadania")) {
    return {
      action: "NAVIGATE",
      targetTab: "pracownik",
      feedbackMessage: "Otwieram Stanowisko Pracownika.",
    };
  }

  if (normalized.includes("pojazdy") || normalized.includes("auta") || normalized.includes("samochody") || normalized.includes("flota")) {
    return {
      action: "NAVIGATE",
      targetTab: "pojazdy",
      feedbackMessage: "Otwieram rejestr pojazdów.",
    };
  }

  if (normalized.includes("infolinia") || normalized.includes("telefon") || normalized.includes("klient")) {
    return {
      action: "NAVIGATE",
      targetTab: "infolinia",
      feedbackMessage: "Otwieram Infolinię AI.",
    };
  }

  // 2. Cloud Firestore Sync Command
  if (
    normalized.includes("synchronizuj") ||
    normalized.includes("firestore") ||
    normalized.includes("chmur") ||
    normalized.includes("zapisz bazę")
  ) {
    return {
      action: "SYNC",
      feedbackMessage: "Uruchamiam synchronizację z chmurą Firestore.",
    };
  }

  // 3. Search in Warehouse Command: "szukaj [fraza]", "znajdź [fraza]", "wyszukaj [fraza]"
  const searchMatch = normalized.match(/(?:szukaj|znajdź|wyszukaj|znajdz)\s+(.+)/i);
  if (searchMatch && searchMatch[1]) {
    const query = searchMatch[1].trim();
    return {
      action: "SEARCH",
      targetTab: "magazyn",
      searchQuery: query,
      feedbackMessage: `Wyszukuję w magazynie: ${query}`,
    };
  }

  // 4. Urgent Boss Task Creation: "pilne zadanie [treść]", "dodaj zadanie [treść]"
  const taskMatch = normalized.match(/(?:pilne zadanie|nowe zadanie|zadanie dla pracownika|zleć)\s+(.+)/i);
  if (taskMatch && taskMatch[1]) {
    return {
      action: "URGENT_TASK",
      taskTitle: taskMatch[1].trim(),
      feedbackMessage: `Tworzę pilne zadanie od szefa: ${taskMatch[1].trim()}`,
    };
  }

  // 5. Intelligent Part Parser (if user dictates part details)
  const parsed = parseVoicePartDictation(transcript);
  if (parsed.kategoria || parsed.samochod?.marka || parsed.cena?.brutto) {
    return {
      action: "PARSE_PART",
      parsedPart: parsed,
      feedbackMessage: `Rozpoznano dane części: ${parsed.kategoria || ""} ${parsed.samochod?.marka || ""} ${parsed.samochod?.model || ""}`,
    };
  }

  return {
    action: "UNKNOWN",
    feedbackMessage: "Nie rozpoznano polecenia. Spróbuj np.: 'Otwórz magazyn', 'Szukaj alternator', 'Synchronizuj Firestore' lub podyktuj opis części.",
  };
}

// Auto-parse spoken text into structured auto part information
export function parseVoicePartDictation(text: string): Partial<PartListingData> {
  const normalized = text.toLowerCase();
  const carInfo: Record<string, string> = {};
  const priceInfo: Record<string, number> = {};
  const result: Partial<PartListingData> = {};

  // 1. Car Brands Detection
  const brands = [
    "volkswagen", "vw", "audi", "skoda", "seat", "opel", "bmw", "mercedes",
    "ford", "renault", "peugeot", "citroen", "fiat", "toyota", "honda",
    "nissan", "mazda", "hyundai", "kia", "volvo"
  ];
  for (const b of brands) {
    if (normalized.includes(b)) {
      carInfo.marka = b === "vw" ? "Volkswagen" : b.charAt(0).toUpperCase() + b.slice(1);
      break;
    }
  }

  // 2. Popular Models Detection
  const models = [
    { regex: /fabia\s*(i{1,3}|\d)?/i, name: "Fabia" },
    { regex: /octavia\s*(i{1,3}|\d)?/i, name: "Octavia" },
    { regex: /golf\s*([ivx\d]+)?/i, name: "Golf" },
    { regex: /passat\s*([b\d]+)?/i, name: "Passat" },
    { regex: /polo\s*([ivx\d]+)?/i, name: "Polo" },
    { regex: /a4\s*([b\d]+)?/i, name: "A4" },
    { regex: /a6\s*([c\d]+)?/i, name: "A6" },
    { regex: /a3\s*([p\d]+)?/i, name: "A3" },
    { regex: /astra\s*([a-z\d]+)?/i, name: "Astra" },
    { regex: /corsa\s*([a-z\d]+)?/i, name: "Corsa" },
    { regex: /focus\s*([ivx\d]+)?/i, name: "Focus" },
    { regex: /mondeo\s*([a-z\d]+)?/i, name: "Mondeo" },
  ];
  for (const m of models) {
    const match = normalized.match(m.regex);
    if (match) {
      carInfo.model = match[0].toUpperCase();
      break;
    }
  }

  // 3. Year (e.g., "rok 2007", "2005 rok", "rocznik 2006")
  const yearMatch = normalized.match(/(?:rok|rocznik|z roku)?\s*(199\d|20[0-2]\d)/i);
  if (yearMatch) {
    carInfo.rocznik = yearMatch[1];
  }

  // 4. Categories Detection
  const categories = [
    { regex: /lampa\s+tylna\s+(lewa|prawa)/i, name: "Lampa tylna" },
    { regex: /reflektor\s+(lewy|prawy|przedni)?/i, name: "Reflektor przedni" },
    { regex: /zderzak\s+(przedni|tylny)/i, name: "Zderzak" },
    { regex: /błotnik\s+(lewy|prawy|przedni|tylny)/i, name: "Błotnik" },
    { regex: /maska\s*(silnika)?/i, name: "Maska silnika" },
    { regex: /drzwi\s+(lewe|prawe|przód|tył)/i, name: "Drzwi" },
    { regex: /klapa\s+(bagażnika|tył)/i, name: "Klapa bagażnika" },
    { regex: /alternator/i, name: "Alternator" },
    { regex: /rozrusznik/i, name: "Rozrusznik" },
    { regex: /skrzynia\s*biegów/i, name: "Skrzynia biegów" },
    { regex: /sterownik\s*(silnika|ecu)?/i, name: "Sterownik ECU" },
    { regex: /lusterko\s*(lewe|prawe)?/i, name: "Lusterko zewnętrzne" },
    { regex: /chłodnica\s*(wody|klimatyzacji)?/i, name: "Chłodnica" },
    { regex: /zacisk\s+hamulcowy/i, name: "Zacisk hamulcowy" },
  ];
  for (const c of categories) {
    if (c.regex.test(normalized)) {
      result.kategoria = c.name;
      break;
    }
  }

  // 5. Price (e.g. "cena 150 złotych", "120 zł", "za 80 zł")
  const priceMatch = normalized.match(/(?:cena|za|kosztuje|kwota)?\s*(\d{2,5})\s*(?:zł|złotych|pln)/i);
  if (priceMatch) {
    const brutto = parseInt(priceMatch[1], 10);
    priceInfo.brutto = brutto;
    priceInfo.netto = Math.round((brutto / 1.23) * 100) / 100;
  }

  // 6. Quality Grade
  if (normalized.includes("bardzo dobry") || normalized.includes("sprawny")) {
    result.jakosc = "A (Bardzo dobry / Sprawny 100%)";
  } else if (normalized.includes("regeneracj") || normalized.includes("uszkodzon")) {
    result.jakosc = "C (Do regeneracji / Uszkodzony)";
  } else if (normalized.includes("dobry") || normalized.includes("drobne ślady")) {
    result.jakosc = "B (Dobry / Widoczne ślady)";
  }

  // 7. Full Description
  result.opis = text;

  if (Object.keys(carInfo).length > 0) {
    result.samochod = carInfo as any;
  }
  if (Object.keys(priceInfo).length > 0) {
    result.cena = priceInfo as any;
  }

  return result;
}
