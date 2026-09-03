import {
  validateGtinString,
  validateCanonicalProduct,
  validateBulkProducts,
} from "../../services/productValidator";
import {
  matchAllegroCategory,
  buildAllegroParameters,
  KNOWN_ALLEGRO_CATEGORIES,
} from "../../services/allegroCategoryService";
import { buildAllegroOfferPayload } from "../../services/allegroOfferBuilder";
import { matchProductWithAllegroCatalog } from "../../services/allegroMatchingService";
import {
  partItemToCanonicalProduct,
  canonicalProductToPartItem,
  getStoredIntegrationLogs,
  saveStoredIntegrationLog,
} from "../../services/syncService";
import {
  parseAllegroCsv,
  exportPartsToAllegroCsv,
  SAMPLE_ALLEGRO_CSV_TEXT,
} from "../allegroCsvHandler";
import { CanonicalProduct } from "../../types/canonicalProduct";
import { PartItem } from "../../types";

export interface TestCaseResult {
  id: number;
  name: string;
  category: string;
  passed: boolean;
  message: string;
  durationMs: number;
  details?: any;
}

/**
 * Full Suite of 16 Unit Tests for Product Management and Marketplace Integrations
 */
export async function runProductManagementTestSuite(): Promise<{
  totalTests: number;
  passedCount: number;
  failedCount: number;
  durationMs: number;
  results: TestCaseResult[];
}> {
  const startTime = Date.now();
  const results: TestCaseResult[] = [];

  const runTest = async (
    id: number,
    name: string,
    category: string,
    fn: () => void | Promise<void>
  ) => {
    const t0 = Date.now();
    try {
      await fn();
      results.push({
        id,
        name,
        category,
        passed: true,
        message: "Test zaliczony pomyślnie",
        durationMs: Date.now() - t0,
      });
    } catch (err: any) {
      results.push({
        id,
        name,
        category,
        passed: false,
        message: err?.message || "Błąd testu",
        durationMs: Date.now() - t0,
        details: err?.stack,
      });
    }
  };

  // Test 1: GTIN String Validation with Modulo 10
  await runTest(1, "Walidacja GTIN (EAN-13, EAN-8 poprawna suma kontrolna)", "Walidacja", () => {
    const res13 = validateGtinString("5901234567891");
    if (!res13.isValid) throw new Error(`Oczekiwano poprawnego EAN-13, otrzymano: ${res13.message}`);

    const res8 = validateGtinString("12345670");
    if (!res8.isValid && !res8.standard) throw new Error("Błąd walidacji EAN-8");
  });

  // Test 2: GTIN Invalid Checksum Detection
  await runTest(2, "Wykrywanie błędnej cyfry kontrolnej GTIN", "Walidacja", () => {
    const resInvalid = validateGtinString("5901234567890"); // błędna cyfra kontrolna
    if (resInvalid.isValid) {
      throw new Error("Oczekiwano błędu sumy kontrolnej dla '5901234567890'");
    }
  });

  // Test 3: GTIN Type Safety (Must be string, reject number/null)
  await runTest(3, "Odrzucenie GTIN typu number / null (wymóg String)", "Walidacja", () => {
    const resNumber = validateGtinString(5901234567891 as any);
    if (resNumber.isValid) throw new Error("GTIN jako number powinien zostać odrzucony!");
    const resNull = validateGtinString(null as any);
    if (resNull.isValid) throw new Error("GTIN jako null powinien zostać odrzucony!");
  });

  // Test 4: Title Length Validation (Max 75 Chars for Allegro)
  await runTest(4, "Limit długości tytułu oferty (maksymalnie 75 znaków)", "Walidacja", () => {
    const longTitle = "A".repeat(80);
    const prod: Partial<CanonicalProduct> = { name: longTitle, price_gross: 100, stock: 1, images: ["img.jpg"] };
    const val = validateCanonicalProduct(prod);
    const hasLengthErr = val.errors.some((e) => e.code === "TITLE_TOO_LONG");
    if (!hasLengthErr) throw new Error("Oczekiwano błędu TITLE_TOO_LONG dla tytułu > 75 znaków");
  });

  // Test 5: Title Promotional Words Warning Detection
  await runTest(5, "Ostrzeżenie przed słowami zakazanymi w tytule (HIT, SUPER)", "Walidacja", () => {
    const prod: Partial<CanonicalProduct> = {
      name: "HIT! Alternator VW Golf V Super Okazja",
      price_gross: 150,
      stock: 1,
      images: ["img.jpg"],
    };
    const val = validateCanonicalProduct(prod);
    const hasPromoWarning = val.warnings.some((w) => w.code === "TITLE_PROMOTIONAL_WORDS");
    if (!hasPromoWarning) throw new Error("Oczekiwano ostrzeżenia TITLE_PROMOTIONAL_WORDS");
  });

  // Test 6: Price Validation (Gross > 0)
  await runTest(6, "Walidacja ceny brutto (> 0 PLN)", "Walidacja", () => {
    const prodZero: Partial<CanonicalProduct> = { name: "Część", price_gross: 0, stock: 1, images: ["img.jpg"] };
    const val = validateCanonicalProduct(prodZero);
    if (val.isValid) throw new Error("Cena 0 PLN nie powinna przejść walidacji!");
  });

  // Test 7: Stock Validation (Non-negative integer)
  await runTest(7, "Walidacja stanu magazynowego (liczba całkowita >= 0)", "Walidacja", () => {
    const prodInvalidStock: Partial<CanonicalProduct> = { name: "Część", price_gross: 100, stock: -5, images: ["img.jpg"] };
    const val = validateCanonicalProduct(prodInvalidStock);
    if (val.isValid) throw new Error("Ujemny stan magazynowy nie powinien przejść walidacji!");
  });

  // Test 8: Images Array Validation (Min 1, Max 16)
  await runTest(8, "Walidacja galerii zdjęć (min. 1 zdjęcie, max. 16)", "Walidacja", () => {
    const prodNoImg: Partial<CanonicalProduct> = { name: "Część", price_gross: 100, stock: 1, images: [] };
    const val = validateCanonicalProduct(prodNoImg);
    const hasImgErr = val.errors.some((e) => e.code === "IMAGES_MISSING");
    if (!hasImgErr) throw new Error("Brak zdjęć powinien zgłosić błąd IMAGES_MISSING");
  });

  // Test 9: Allegro Category Auto-Matching
  await runTest(9, "Automatyczne dopasowanie kategorii Allegro", "Kategorie", () => {
    const matchAlt = matchAllegroCategory("Części", "Alternator 140A Bosch Golf V", "VAG");
    if (matchAlt.id !== "253106") throw new Error(`Oczekiwano kategorii 253106 (Alternatory), otrzymano: ${matchAlt.id}`);

    const matchTurbo = matchAllegroCategory("Silnik", "Turbosprężarka Garrett 1.9 TDI", "Garrett");
    if (matchTurbo.id !== "253108") throw new Error(`Oczekiwano kategorii 253108 (Turbosprężarki), otrzymano: ${matchTurbo.id}`);
  });

  // Test 10: Allegro Parameters Builder Mapping
  await runTest(10, "Transformacja parametrów do formatu Allegro REST API", "Parametry", () => {
    const prod: CanonicalProduct = {
      id: "P1",
      sku: "SKU-1",
      gtin: "5901234567891",
      mpn: "03G903023",
      name: "Alternator 140A VAG",
      brand: "Bosch",
      category_name: "Alternatory",
      category_id: "253106",
      price_gross: 200,
      price_net: 162,
      vat_rate: 23,
      stock: 1,
      description_raw: "Sprawny alternator",
      description_html: "<p>Sprawny alternator</p>",
      images: ["https://example.com/img1.jpg"],
      parameters: { stan: "Używany", producent: "Bosch", numery_czesci: "03G903023" },
      status: "draft",
      marketplace_status: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const params = buildAllegroParameters(prod, "253106");
    const hasState = params.some((p) => p.id === "11323");
    const hasProducer = params.some((p) => p.id === "201385");
    const hasMpn = params.some((p) => p.id === "201386");

    if (!hasState || !hasProducer || !hasMpn) {
      throw new Error("Brak wymaganych parametrów (Stan, Producent lub MPN) w wyjściowym obiekcie");
    }
  });

  // Test 11: Allegro Offer Payload Builder Structure
  await runTest(11, "Generowanie pełnego payloadu oferty Allegro REST API", "Offer Builder", () => {
    const prod: CanonicalProduct = {
      id: "P1",
      sku: "SKU-ALT-01",
      gtin: "5901234567891",
      mpn: "03G903023",
      name: "Alternator 140A Bosch Golf V",
      brand: "Bosch",
      category_name: "Alternatory",
      category_id: "253106",
      price_gross: 250,
      price_net: 203,
      vat_rate: 23,
      stock: 2,
      description_raw: "Opis techniczny części",
      description_html: "<p>Opis</p>",
      images: ["https://example.com/img1.jpg"],
      parameters: { stan: "Używany" },
      status: "ready",
      marketplace_status: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const payload = buildAllegroOfferPayload(prod);
    if (!payload.name || payload.name.length > 75) throw new Error("Nieprawidłowy tytuł w payloadzie");
    if (payload.sellingMode.price.amount !== "250.00") throw new Error("Nieprawidłowa kwota ceny");
    if (payload.stock.available !== 2) throw new Error("Nieprawidłowy stan magazynowy");
    if (!payload.description.sections || payload.description.sections.length === 0) {
      throw new Error("Brak sekcji opisu HTML");
    }
  });

  // Test 12: Allegro Product Matching (Productization)
  await runTest(12, "Dopasowanie do katalogu produktów Allegro (Productization)", "Matching", async () => {
    const prod: CanonicalProduct = {
      id: "P1",
      sku: "SKU-1",
      gtin: "5901234567891",
      mpn: "03G903023",
      name: "Alternator",
      brand: "Bosch",
      category_name: "Alternatory",
      price_gross: 100,
      price_net: 81,
      vat_rate: 23,
      stock: 1,
      description_raw: "",
      description_html: "",
      images: [],
      parameters: {},
      status: "draft",
      marketplace_status: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const match = await matchProductWithAllegroCatalog(prod);
    if (!match.matched || match.similarityScore < 80) {
      throw new Error("Oczekiwano dopasowania na podstawie EAN o współczynniku > 80%");
    }
  });

  // Test 13: CSV Parsing & Export (29 Columns Canonical Format)
  await runTest(13, "Import i Eksport 29-kolumnowego pliku CSV Allegro", "CSV Engine", () => {
    const parsed = parseAllegroCsv(SAMPLE_ALLEGRO_CSV_TEXT);
    if (parsed.rows.length === 0) throw new Error("Błąd parsowania przykładowego pliku CSV");
    if (parsed.columnsFound.length < 25) throw new Error("Zbyt mała liczba kolumn CSV");

    // Test export
    const samplePart: PartItem = {
      id: "test_part_1",
      barcode: "SKU-1234",
      listingData: {
        kategoria: "Alternator",
        marka: "Volkswagen",
        opis: "Opis testowy",
        producent: "Bosch",
        numery_czesci: "03G903023",
        cena: { brutto: 199, netto: 161 },
        ocr_wyniki: { numer_magazynowy: "MAG 14" },
        zdjecia: ["https://example.com/img1.jpg"],
        allegro: { ean: "5901234567891" },
      },
      status: "Dostępny",
      createdAt: new Date().toISOString(),
    };

    const csvOut = exportPartsToAllegroCsv([samplePart]);
    if (!csvOut.includes("GTIN,EXTERNAL_ID,NAME")) throw new Error("Brak nagłówka 29-kolumnowego w wyeksportowanym CSV");
    if (!csvOut.includes("5901234567891")) throw new Error("Brak numeru GTIN w CSV");
  });

  // Test 14: Model Normalization (PartItem <-> CanonicalProduct)
  await runTest(14, "Normalizacja danych: PartItem <-> CanonicalProduct", "Normalizator", () => {
    const part: PartItem = {
      id: "part_demo_99",
      barcode: "KNS-PART-0099",
      currentRackLocation: "MAG 03",
      listingData: {
        kategoria: "Turbosprężarka",
        marka: "Audi",
        opis: "Stan bardzo dobry",
        producent: "Garrett",
        numery_czesci: "03L253019J",
        cena: { brutto: 650, netto: 528 },
        ocr_wyniki: { numer_magazynowy: "MAG 03" },
        zdjecia: ["https://example.com/turbo.jpg"],
        allegro: { ean: "5901234567891" },
      },
      status: "Dostępny",
      createdAt: new Date().toISOString(),
    };

    const canonical = partItemToCanonicalProduct(part);
    if (canonical.gtin !== "5901234567891") throw new Error("Błąd normalizacji GTIN");
    if (canonical.price_gross !== 650) throw new Error("Błąd normalizacji ceny brutto");
    if (canonical.location_rack !== "MAG 03") throw new Error("Błąd normalizacji regału WMS");

    const backToPart = canonicalProductToPartItem(canonical);
    if (backToPart.listingData.cena.brutto !== 650) throw new Error("Błąd powrotnej konwersji ceny");
  });

  // Test 15: Bulk Product Validator Engine
  await runTest(15, "Masowy silnik walidacji asortymentu (Bulk Validator)", "Walidacja", () => {
    const p1: CanonicalProduct = {
      id: "1",
      sku: "SKU-1",
      gtin: "5901234567891",
      mpn: "03G",
      name: "Poprawny produkt",
      brand: "VAG",
      category_name: "Części",
      price_gross: 100,
      price_net: 81,
      vat_rate: 23,
      stock: 1,
      description_raw: "Opis",
      description_html: "<p>Opis</p>",
      images: ["img.jpg"],
      parameters: {},
      status: "draft",
      marketplace_status: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const p2: CanonicalProduct = {
      id: "2",
      sku: "SKU-2",
      gtin: "123", // invalid
      mpn: "",
      name: "", // empty name
      brand: "",
      category_name: "",
      price_gross: -10, // negative price
      price_net: 0,
      vat_rate: 23,
      stock: -1,
      description_raw: "",
      description_html: "",
      images: [],
      parameters: {},
      status: "draft",
      marketplace_status: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const bulk = validateBulkProducts([p1, p2]);
    if (bulk.validCount !== 1 || bulk.invalidCount !== 1) {
      throw new Error(`Oczekiwano 1 poprawnego i 1 błędnego produktu, otrzymano: valid=${bulk.validCount}, invalid=${bulk.invalidCount}`);
    }
  });

  // Test 16: Integration Audit Trail & Persistence
  await runTest(16, "Rejestracja zdarzeń w Audyt Logu Integracji (IntegrationLog)", "Logi", () => {
    const log = saveStoredIntegrationLog({
      channel: "Allegro REST API",
      action: "Test walidacji audytu",
      status: "success",
      itemsCount: 1,
      successCount: 1,
      errorCount: 0,
      details: "Test pomyślnej rejestracji zdarzenia w audycie",
    });

    if (!log.id || !log.timestamp) throw new Error("Brak ID lub znacznika czasu w zapisanym logu");
    const logs = getStoredIntegrationLogs();
    const found = logs.some((l) => l.action === "Test walidacji audytu");
    if (!found) throw new Error("Nie odnaleziono zapisanego logu w pamięci");
  });

  const durationMs = Date.now() - startTime;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  return {
    totalTests: results.length,
    passedCount,
    failedCount,
    durationMs,
    results,
  };
}
