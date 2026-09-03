import { CanonicalProduct } from "../types/canonicalProduct";
import { buildAllegroParameters, matchAllegroCategory } from "./allegroCategoryService";
import { AllegroConfig } from "../types";

export interface AllegroRestOfferPayload {
  name: string;
  category: {
    id: string;
  };
  product?: {
    id?: string;
  };
  parameters: Array<{
    id: string;
    values?: string[];
    valuesIds?: string[];
    rangeValue?: any;
  }>;
  description: {
    sections: Array<{
      items: Array<{
        type: "TEXT" | "IMAGE";
        content?: string;
        url?: string;
      }>;
    }>;
  };
  images: Array<{
    url: string;
  }>;
  sellingMode: {
    format: "BUY_NOW";
    price: {
      amount: string;
      currency: "PLN";
    };
  };
  stock: {
    available: number;
    unit: "UNIT";
  };
  location: {
    countryCode: "PL";
    province: string;
    city: string;
    postCode: string;
  };
  delivery: {
    shippingRates: {
      id: string;
    };
    handlingTime?: string;
  };
  afterSalesServices?: {
    impliedWarranty?: { id: string };
    returnPolicy?: { id: string };
  };
  external?: {
    id: string;
  };
  tax?: {
    percentage: string;
  };
}

/**
 * Converts CanonicalProduct to Allegro REST API payload
 */
export function buildAllegroOfferPayload(
  product: CanonicalProduct,
  config?: Partial<AllegroConfig>
): AllegroRestOfferPayload {
  // 1. Category Resolution
  let categoryId = product.category_id;
  if (!categoryId || categoryId === "50849") {
    const matched = matchAllegroCategory(product.category_name, product.name, product.brand);
    categoryId = matched.id;
  }

  // 2. Title formulation (strictly max 75 chars)
  let title = product.name.trim();
  if (title.length > 75) {
    title = title.slice(0, 75).trim();
  }

  // 3. Parameters
  const parameters = buildAllegroParameters(product, categoryId);

  // 4. Structured Description HTML to Allegro Sections
  const rawDesc = product.description_raw || "Oryginalna część z demontażu pojazdu. 100% sprawna, sprawdzona technicznie.";
  const descriptionSections: Array<{
    items: Array<{ type: "TEXT" | "IMAGE"; content?: string; url?: string }>;
  }> = [
    {
      items: [
        {
          type: "TEXT",
          content: `<h1>${title}</h1><p>${rawDesc.replace(/\n/g, "<br/>")}</p>`,
        },
      ],
    },
  ];

  // If we have secondary images, add them in alternating layout sections
  if (product.images.length > 1) {
    descriptionSections.push({
      items: [
        {
          type: "IMAGE",
          url: product.images[1],
        },
        {
          type: "TEXT",
          content: `<h2>Specyfikacja i oznaczenia producenta</h2><p><b>Marka:</b> ${product.brand || "Oryginał"}<br/><b>Numer katalogowy / OEM:</b> ${product.mpn || "-"}<br/><b>Sygnatura WMS:</b> ${product.sku || product.location_rack || "-"}</p>`,
        },
      ],
    });
  }

  // 5. Images array
  const formattedImages = (product.images || [])
    .filter((img) => img && img.trim().length > 0)
    .slice(0, 16)
    .map((url) => ({ url }));

  // Fallback placeholder image if none present
  if (formattedImages.length === 0) {
    formattedImages.push({
      url: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=800&auto=format&fit=crop&q=80",
    });
  }

  // 6. Price string formatting
  const priceAmount = (Number(product.price_gross) || 10).toFixed(2);

  // 7. Config fallbacks
  const shippingRateId = product.shipping_rate_id || config?.shippingTableId || "1 smart";
  const warrantyId = product.implied_warranty_id || config?.impliedWarrantyId || "gwarancja-12m";
  const returnPolicyId = product.return_policy_id || config?.returnPolicyId || "zwrot-14dni";

  return {
    name: title,
    category: {
      id: categoryId,
    },
    ...(product.product_match?.allegroProductId
      ? { product: { id: product.product_match.allegroProductId } }
      : {}),
    parameters,
    description: {
      sections: descriptionSections,
    },
    images: formattedImages,
    sellingMode: {
      format: "BUY_NOW",
      price: {
        amount: priceAmount,
        currency: "PLN",
      },
    },
    stock: {
      available: Math.max(1, Math.floor(product.stock || 1)),
      unit: "UNIT",
    },
    location: {
      countryCode: "PL",
      province: config?.province || "DOLNOSLASKIE",
      city: config?.city || "Mysłakowice",
      postCode: config?.postCode || "58-533",
    },
    delivery: {
      shippingRates: {
        id: shippingRateId,
      },
      handlingTime: "PT24H", // Wysyłka w 24h
    },
    afterSalesServices: {
      impliedWarranty: { id: warrantyId },
      returnPolicy: { id: returnPolicyId },
    },
    external: {
      id: product.sku || product.id,
    },
    tax: {
      percentage: String(product.vat_rate || 23),
    },
  };
}
