import { CanonicalProduct, ProductValidationResult, ProductValidationError } from "../types/canonicalProduct";

// Allegro forbidden promotional words in titles that trigger algorithmic penalty or rejection
const PROMOTED_TITLE_PATTERNS = [
  /\bhit\b/i,
  /\bpromocja\b/i,
  /\bsuper cena\b/i,
  /\bokazja\b/i,
  /\bpolecam\b/i,
  /\bwyprzedaż\b/i,
  /\bnowość\b/i,
  /\btanio\b/i,
  /\bgratis\b/i,
  /\bbestseller\b/i,
];

/**
 * Validates GTIN string with Modulo 10 algorithm
 * STRICT REQUIREMENT: GTIN must always be a string!
 */
export function validateGtinString(gtin: unknown): { isValid: boolean; message: string; standard?: string } {
  if (typeof gtin !== "string") {
    return {
      isValid: false,
      message: "GTIN musi być typu tekstowego (string), nie liczbą!",
    };
  }

  const clean = gtin.trim().replace(/\s+/g, "");
  if (!clean) {
    return { isValid: false, message: "Brak kodu GTIN / EAN." };
  }

  if (!/^\d+$/.test(clean)) {
    return { isValid: false, message: "GTIN może składać się wyłącznie z cyfr (0-9)." };
  }

  if (![8, 12, 13, 14].includes(clean.length)) {
    return {
      isValid: false,
      message: `Nieprawidłowa długość kodu GTIN: ${clean.length} cyfr. Dopuszczalne: 8 (EAN-8), 12 (UPC-A), 13 (EAN-13), 14 (ITF-14).`,
    };
  }

  // Modulo-10 check digit verification
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
    return {
      isValid: false,
      message: `Błędna cyfra kontrolna GTIN (oczekiwano: ${calculatedCheck}, odczytano: ${checkDigit}).`,
      standard: clean.length === 13 ? "EAN-13" : `GTIN-${clean.length}`,
    };
  }

  const standard =
    clean.length === 13
      ? "EAN-13"
      : clean.length === 8
      ? "EAN-8"
      : clean.length === 12
      ? "UPC-A"
      : "GTIN-14";

  return {
    isValid: true,
    message: `Poprawny kod ${standard}`,
    standard,
  };
}

/**
 * Validates a single canonical product against Allegro marketplace standards
 */
export function validateCanonicalProduct(product: Partial<CanonicalProduct>): ProductValidationResult {
  const errors: ProductValidationError[] = [];
  const warnings: ProductValidationError[] = [];

  // 1. GTIN validation
  if (!product.gtin || product.gtin.trim() === "") {
    warnings.push({
      field: "gtin",
      code: "GTIN_MISSING",
      message: "Brak kodu GTIN/EAN. Oferta może mieć ograniczoną widoczność w wyszukiwarce Allegro.",
      severity: "warning",
    });
  } else {
    const gtinRes = validateGtinString(product.gtin);
    if (!gtinRes.isValid) {
      errors.push({
        field: "gtin",
        code: "GTIN_INVALID",
        message: gtinRes.message,
        severity: "error",
      });
    }
  }

  // 2. Title validation (Allegro limit: 75 chars)
  if (!product.name || product.name.trim() === "") {
    errors.push({
      field: "name",
      code: "TITLE_EMPTY",
      message: "Tytuł oferty nie może być pusty.",
      severity: "error",
    });
  } else {
    const title = product.name.trim();
    if (title.length > 75) {
      errors.push({
        field: "name",
        code: "TITLE_TOO_LONG",
        message: `Tytuł ma ${title.length} znaków. Maksymalna dozwolona długość w Allegro to 75 znaków.`,
        severity: "error",
      });
    } else if (title.length < 10) {
      warnings.push({
        field: "name",
        code: "TITLE_TOO_SHORT",
        message: "Tytuł jest bardzo krótki (<10 znaków). Zalecamy 50-75 znaków ze słowami kluczowymi.",
        severity: "warning",
      });
    }

    // Check for promotional keywords
    for (const pattern of PROMOTED_TITLE_PATTERNS) {
      if (pattern.test(title)) {
        warnings.push({
          field: "name",
          code: "TITLE_PROMOTIONAL_WORDS",
          message: "Tytuł zawiera słowa perswazyjne/reklamowe (np. 'HIT', 'SUPER', 'OKAZJA'), które naruszają regulamin Allegro.",
          severity: "warning",
        });
        break;
      }
    }
  }

  // 3. Price validation
  if (product.price_gross === undefined || product.price_gross === null || isNaN(product.price_gross)) {
    errors.push({
      field: "price_gross",
      code: "PRICE_MISSING",
      message: "Cena brutto jest wymagana.",
      severity: "error",
    });
  } else if (product.price_gross <= 0) {
    errors.push({
      field: "price_gross",
      code: "PRICE_NON_POSITIVE",
      message: "Cena brutto musi być większa od zera.",
      severity: "error",
    });
  }

  // 4. Stock validation
  if (product.stock === undefined || product.stock === null || isNaN(product.stock)) {
    errors.push({
      field: "stock",
      code: "STOCK_MISSING",
      message: "Liczba sztuk na stanie jest wymagana.",
      severity: "error",
    });
  } else if (product.stock < 0 || !Number.isInteger(product.stock)) {
    errors.push({
      field: "stock",
      code: "STOCK_INVALID",
      message: "Stan magazynowy musi być nieujemną liczbą całkowitą.",
      severity: "error",
    });
  }

  // 5. SKU / External ID
  if (!product.sku || product.sku.trim() === "") {
    warnings.push({
      field: "sku",
      code: "SKU_MISSING",
      message: "Brak sygnatury / SKU (EXTERNAL_ID). Może to utrudnić identyfikację w magazynie WMS.",
      severity: "warning",
    });
  }

  // 6. Brand / Manufacturer
  if (!product.brand || product.brand.trim() === "") {
    warnings.push({
      field: "brand",
      code: "BRAND_MISSING",
      message: "Brak podanej marki / producenta.",
      severity: "warning",
    });
  }

  // 7. Images
  if (!product.images || !Array.isArray(product.images) || product.images.length === 0) {
    errors.push({
      field: "images",
      code: "IMAGES_MISSING",
      message: "Wymagane jest przynajmniej 1 zdjęcie produktu.",
      severity: "error",
    });
  } else {
    if (product.images.length > 16) {
      warnings.push({
        field: "images",
        code: "TOO_MANY_IMAGES",
        message: `Produkt posiada ${product.images.length} zdjęć. Allegro obsługuje maksymalnie 16 zdjęć.`,
        severity: "warning",
      });
    }
  }

  // 8. Description
  if (!product.description_raw && !product.description_html) {
    warnings.push({
      field: "description",
      code: "DESCRIPTION_EMPTY",
      message: "Opis produktu jest pusty.",
      severity: "warning",
    });
  }

  return {
    isValid: errors.length === 0,
    hasWarnings: warnings.length > 0,
    errors,
    warnings,
  };
}

/**
 * Bulk validation utility
 */
export function validateBulkProducts(products: CanonicalProduct[]): {
  validCount: number;
  invalidCount: number;
  warningsCount: number;
  results: Map<string, ProductValidationResult>;
} {
  let validCount = 0;
  let invalidCount = 0;
  let warningsCount = 0;
  const results = new Map<string, ProductValidationResult>();

  for (const product of products) {
    const res = validateCanonicalProduct(product);
    results.set(product.id, res);
    if (res.isValid) {
      validCount++;
    } else {
      invalidCount++;
    }
    if (res.hasWarnings) {
      warningsCount++;
    }
  }

  return {
    validCount,
    invalidCount,
    warningsCount,
    results,
  };
}
