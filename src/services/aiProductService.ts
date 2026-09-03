import { CanonicalProduct } from "../types/canonicalProduct";

export interface AiProductOptimizationResult {
  optimizedTitle: string;
  suggestedCategory: string;
  suggestedCategoryId: string;
  optimizedDescriptionRaw: string;
  optimizedDescriptionHtml: string;
  suggestedParameters: Record<string, string>;
  seoKeywords: string[];
  keyHighlights: string[];
  aiCocreatedDeclaration: boolean;
}

/**
 * Optimizes a canonical product using Google Gemini AI via server API
 */
export async function optimizeProductWithAi(
  product: CanonicalProduct,
  apiKey?: string
): Promise<{ success: boolean; data?: AiProductOptimizationResult; error?: string }> {
  try {
    const response = await fetch("/api/ai/optimize-product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product: {
          id: product.id,
          sku: product.sku,
          name: product.name,
          brand: product.brand,
          mpn: product.mpn,
          category: product.category_name,
          description: product.description_raw,
          parameters: product.parameters,
          price: product.price_gross,
          imagesCount: product.images.length,
        },
        apiKey,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Błąd optymalizacji AI");
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (err: any) {
    console.warn("Server AI optimize error, using intelligent client heuristic fallback:", err);

    // Intelligent fallback rule engine if server is offline or missing key
    const brand = product.brand || "OE";
    const mpn = product.mpn ? `OE ${product.mpn}` : "";
    const cleanName = product.name.replace(/\s+/g, " ").trim();
    const fallbackTitle = `${cleanName} ${brand} ${mpn}`.slice(0, 75).trim();

    return {
      success: true,
      data: {
        optimizedTitle: fallbackTitle,
        suggestedCategory: product.category_name || "Motoryzacja > Części samochodowe",
        suggestedCategoryId: product.category_id || "50849",
        optimizedDescriptionRaw: `${product.name}\n\nOryginalna część samochodowa z demontażu na licencjonowanej stacji recyklingu PHU U Konesera w Mysłakowicach. Element w pełni sprawny technicznie, sprawdzony przed demontażem. Objęty gwarancją rozruchową.\n\nProducent: ${brand}\nNumer katalogowy: ${product.mpn || "Oznaczenie oryginalne"}\nStan: ${product.parameters?.["stan"] || "Używany 100% sprawny"}`,
        optimizedDescriptionHtml: `<h1>${fallbackTitle}</h1><p>Oryginalna część z demontażu stacji PHU U Konesera w Mysłakowicach.</p><h2>Specyfikacja techniczna</h2><ul><li><b>Marka:</b> ${brand}</li><li><b>Numer OEM:</b> ${product.mpn || "-"}</li><li><b>Stan:</b> ${product.parameters?.["stan"] || "Używany"}</li></ul>`,
        suggestedParameters: {
          "Stan": "Używany",
          "Producent części": brand,
          "Numer katalogowy części": product.mpn || product.sku,
          "Jakość części (zgodnie z GVO)": "O - oryginał z logo producenta pojazdu (OE)",
        },
        seoKeywords: [brand, product.category_name, product.mpn].filter(Boolean),
        keyHighlights: ["100% oryginał", "Sprawdzony technicznie", "Gwarancja rozruchowa", "Szybka wysyłka 24h"],
        aiCocreatedDeclaration: true,
      },
    };
  }
}
