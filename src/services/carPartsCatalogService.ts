export interface AlternativePartNumber {
  number: string;
  brand: string;
  type: "OE" | "Aftermarket" | "Zamiennik";
}

export interface VehicleCompatibility {
  make: string;
  model: string;
  generation?: string;
  engine?: string;
  powerHp?: string;
  years: string;
  bodyType?: string;
  notes?: string;
}

export interface CatalogSearchResult {
  query: string;
  queryType: "oem" | "vin";
  source: string;
  partName: string;
  category: string;
  primaryBrand: string;
  oemNumber: string;
  vin?: string;
  alternativeOems: AlternativePartNumber[];
  compatibilityList: VehicleCompatibility[];
  specifications: Record<string, string>;
  estimatedPricePln: number;
  marketDescription?: string;
}

export async function searchCarPartsCatalog(params: {
  query: string;
  type: "oem" | "vin";
  preferredSource?: "tecdoc" | "autokey" | "auto";
  customApiKey?: string;
}): Promise<{ success: boolean; data?: CatalogSearchResult; error?: string }> {
  try {
    const res = await fetch("/api/catalog/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || `Błąd wyszukiwania (${res.status})` };
    }

    const data = await res.json();
    return { success: true, data: data.result };
  } catch (err: any) {
    console.error("Error searching car parts catalog:", err);
    return { success: false, error: err.message || "Błąd połączenia z bazą części" };
  }
}
