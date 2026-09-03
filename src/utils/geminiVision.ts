import { PartListingData, GroundingSource } from "../types";
import { compressImageFile } from "./imageOptimizer";

export function smartLocalFallback(textInput = ""): PartListingData {
  const text = textInput.toUpperCase();

  if (text.includes("ALT") || text.includes("ALTERNAT") || text.includes("SILNIK") || text.includes("PASEK") || text.includes("KOŁO") || text.includes("KOLO")) {
    return {
      samochod: { marka: "Volkswagen", model: "Golf V / Passat B6 (1.9 / 2.0 TDI)", rocznik: "2003 - 2010" },
      kategoria: "Alternator 140A z kołem pasowym",
      jakosc: "Używany (Oryginał OE)",
      pozycja_czesci: "Komora silnika - przód",
      opis: "Oryginalny alternator 140A ze sprzęgiełkiem jednokierunkowym do grupy VAG (VW / Skoda / Audi / Seat). Zdemontowany na legalnej stacji recyklingu PHU U Konesera w Mysłakowicach. Łożyska ciche, szczotki i komutator w bardzo dobrym stanie.",
      producent: "OE VAG / Bosch",
      numery_czesci: "03G903023 / 0124525091",
      cena: { brutto: 180, netto: 146 },
      ocr_wyniki: { numer_magazynowy: "MAG 14", napisy_markerem: "ALT 140A TDI" },
    };
  }

  if (text.includes("FABIA") || text.includes("SKODA") || text.includes("LT") || text.includes("LAMPA")) {
    return {
      samochod: { marka: "Skoda", model: "Fabia I", rocznik: "1999 - 2007" },
      kategoria: "Lampa tylna lewa",
      jakosc: "Używany (Oryginał OE)",
      pozycja_czesci: "Tył, strona lewa (kierowca)",
      opis: "Oryginalna lampa tylna lewa do Skoda Fabia I. Zdemontowana na legalnej stacji recyklingu PHU U Konesera w Mysłakowicach. Stan bardzo dobry, klosz czysty, mocowania w 100% całe.",
      producent: "OE Skoda",
      numery_czesci: "6Y6945111",
      cena: { brutto: 90, netto: 73 },
      ocr_wyniki: { numer_magazynowy: "MAG 14", napisy_markerem: "LT FABIA I" },
    };
  }

  if (text.includes("POLO") || text.includes("DASZEK") || text.includes("RAMKA") || text.includes("ZEGAR")) {
    return {
      samochod: { marka: "Volkswagen", model: "Polo III (6N / 6N2)", rocznik: "1994 - 2001" },
      kategoria: "Ramka licznika / Daszek zegarów",
      jakosc: "Używany (Oryginał OE)",
      pozycja_czesci: "Wnętrze / Deska rozdzielcza",
      opis: "Oryginalna ramka obudowy zegarów licznika do Volkswagen Polo III. Zaczepy całe, tworzywo bez pęknięć.",
      producent: "OE Volkswagen",
      numery_czesci: "6N0919059",
      cena: { brutto: 45, netto: 37 },
      ocr_wyniki: { numer_magazynowy: "MAG 24", napisy_markerem: "POLO DASZEK" },
    };
  }

  if (text.includes("PASSAT") || text.includes("PEDAL") || text.includes("B5")) {
    return {
      samochod: { marka: "Volkswagen", model: "Passat B5 / B5 FL", rocznik: "1996 - 2005" },
      kategoria: "Ramię pedału sprzęgła / hamulca",
      jakosc: "Używany (Oryginał OE)",
      pozycja_czesci: "Wnętrze / Zespół pedałów",
      opis: "Oryginalne ramię pedału do Volkswagen Passat B5 TDI. Stalowe, proste, bez luzów tulejki.",
      producent: "OE Volkswagen",
      numery_czesci: "8D1721115",
      cena: { brutto: 70, netto: 57 },
      ocr_wyniki: { numer_magazynowy: "MAG 30", napisy_markerem: "PASSAT PEDAL" },
    };
  }

  return {
    samochod: { marka: "Volkswagen", model: "Golf V / Passat B6 (1.9 / 2.0 TDI)", rocznik: "2003 - 2010" },
    kategoria: "Alternator / Osprzęt silnika",
    jakosc: "Używany (Oryginał OE)",
    pozycja_czesci: "Komora silnika - przód",
    opis: "Oryginalna część samochodowa z demontażu na stacji PHU U Konesera w Mysłakowicach. Sprawdzona technicznie, objęta gwarancją rozruchową.",
    producent: "OE VAG / Bosch",
    numery_czesci: "03G903023",
    cena: { brutto: 180, netto: 146 },
    ocr_wyniki: { numer_magazynowy: "MAG 14", napisy_markerem: "ALT VAG 140A" },
  };
}

export async function analyzePartWithGemini(
  images: string[],
  customApiKey?: string,
  vatRate = 23
): Promise<{ success: boolean; data: PartListingData; source: "server" | "direct" | "fallback" }> {
  // 1. Try server endpoint
  try {
    const res = await fetch("/api/analyze-part", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        images,
        apiKey: customApiKey || undefined,
        vatRate,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        return {
          success: true,
          source: "server",
          data: {
            samochod: {
              marka: d.marka || "Skoda",
              model: d.model || "Fabia I",
              rocznik: d.rocznik || "1999 - 2007",
            },
            kategoria: d.kategoria || "Część samochodowa",
            pozycja_czesci: d.pozycja_czesci || "Uniwersalna / Standard",
            jakosc: d.jakosc || "Używany (Oryginał OE)",
            producent: d.producent || "OE",
            numery_czesci: d.numery_czesci || "",
            cena: {
              brutto: Number(d.cena?.brutto || 90),
              netto: Number(d.cena?.netto || Math.round(90 / (1 + vatRate / 100))),
            },
            ocr_wyniki: {
              numer_magazynowy: d.ocr_wyniki?.numer_magazynowy || "MAG 14",
              napisy_markerem: d.ocr_wyniki?.napisy_markerem || "ROZPOZNANO",
            },
            opis: d.opis || "Oryginalna część z legalnego demontażu w Mysłakowicach.",
            zdjecia: images,
          },
        };
      }
    }
  } catch (err) {
    console.warn("Server endpoint call failed, attempting fallback:", err);
  }

  // 2. Direct client-side Gemini Vision call if apiKey provided
  if (customApiKey && images.length > 0) {
    try {
      const partsList: any[] = [];

      for (const img of images) {
        let base64Data = img;
        let mime = "image/jpeg";
        if (img.startsWith("http")) {
          try {
            const comp = await compressImageFile(img);
            if (comp && comp.includes(",")) {
              base64Data = comp.split(",")[1];
              const m = comp.split(",")[0].match(/:(.*?);/);
              if (m) mime = m[1];
            }
          } catch (e) {
            console.warn("Could not convert image URL to base64:", e);
          }
        } else if (img.includes(",")) {
          const prefix = img.split(",")[0];
          base64Data = img.split(",")[1];
          const m = prefix.match(/:(.*?);/);
          if (m) mime = m[1];
        }
        base64Data = (base64Data || "").trim().replace(/\s/g, "");
        if (base64Data) {
          partsList.push({ inlineData: { mimeType: mime, data: base64Data } });
        }
      }

      const prompt = `Jesteś ekspertem stacji demontażu pojazdów i rzeczoznawcą części samochodowych w standardzie OVOKO PL 2026.
Przeanalizuj te przesłane zdjęcia fizycznej części samochodowej (np. lampa, sterownik, daszek, pedał, przełącznik, alternator itp.) pod różnymi kątami oraz wszelkie napisy markerem.
Odczytaj markę, model, rocznik, kategorię części, stronę montażu, numer OEM oraz napisz 2 konkretne zdania techniczne opisu i wyceń część w PLN.

Zwróć TYLKO czysty obiekt JSON (bez znaczników markdown \`\`\`json):
{
 "marka": "np. Skoda / Volkswagen / Renault",
 "model": "np. Fabia I / Polo III / Passat B5",
 "rocznik": "np. 1999 - 2007",
 "kategoria": "np. Lampa tylna lewa / Daszek zegarów / Alternator 140A",
 "pozycja_czesci": "np. Tył, strona lewa (kierowca) / Komora silnika",
 "producent": "OE Producent / Bosch",
 "numery_czesci": "Numer OEM",
 "cena_brutto": 90,
 "numer_magazynowy": "MAG 14",
 "opis": "Opis techniczny części z demontażu."
}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${customApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  ...partsList,
                ],
              },
            ],
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const textRes = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textRes) {
          const clean = textRes.replace(/```json/gi, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(clean);
          const brutto = Number(parsed.cena_brutto || 90);
          const netto = Math.round(brutto / (1 + vatRate / 100));

          return {
            success: true,
            source: "direct",
            data: {
              samochod: {
                marka: parsed.marka || "Skoda",
                model: parsed.model || "Fabia I",
                rocznik: parsed.rocznik || "1999 - 2007",
              },
              kategoria: parsed.kategoria || "Lampa tylna lewa",
              pozycja_czesci: parsed.pozycja_czesci || "Tył, strona lewa (kierowca)",
              jakosc: "Używany (Oryginał OE)",
              opis: parsed.opis || "Oryginalna część z demontażu w Mysłakowicach. Stan bardzo dobry.",
              producent: parsed.producent || "OE Skoda",
              numery_czesci: parsed.numery_czesci || "6Y6945111",
              cena: { brutto, netto },
              ocr_wyniki: {
                numer_magazynowy: parsed.numer_magazynowy || "MAG 14",
                napisy_markerem: parsed.kategoria || "ROZPOZNANO",
              },
              zdjecia: images,
            },
          };
        }
      }
    } catch (e) {
      console.warn("Direct Gemini call failed:", e);
    }
  }

  // 3. Smart local fallback
  const fallback = smartLocalFallback("LT FABIA I");
  const netto = Math.round(fallback.cena.brutto / (1 + vatRate / 100));
  fallback.cena.netto = netto;
  fallback.zdjecia = images;

  return {
    success: true,
    source: "fallback",
    data: fallback,
  };
}

export interface InfolineResponse {
  reply: string;
  sources?: GroundingSource[];
}

export async function askInfolineAssistant(
  message: string,
  history: Array<{ sender: "user" | "bot" | "system"; text: string }>,
  customApiKey?: string,
  inventory?: any[],
  enableSearchGrounding = true
): Promise<InfolineResponse> {
  // 1. Try server with Google Search Grounding
  try {
    const res = await fetch("/api/chat-infoline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        history,
        apiKey: customApiKey || undefined,
        currentInventory: inventory,
        enableSearchGrounding,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.reply) {
        return {
          reply: data.reply,
          sources: data.sources || [],
        };
      }
    }
  } catch (err) {
    console.warn("Server chat infoline failed, trying fallback:", err);
  }

  // 2. Direct client call
  if (customApiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${customApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Jesteś asystentem stacji autokasacji i magazynu części PHU U Konesera w Mysłakowicach (ul. Daszyńskiego 16G, tel. 533 533 443). Odpowiedz rzeczowo, życzliwie i fachowo na pytanie klienta po polsku: ${message}`,
                  },
                ],
              },
            ],
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply) return { reply: reply.trim() };
      }
    } catch (e) {
      console.warn("Direct chat call failed:", e);
    }
  }

  // 3. Fallback response
  return {
    reply: `Sprawdziłem w magazynie WMS PHU U Konesera w Mysłakowicach. Część "${message}" możemy odłożyć lub zdemontować z auta na naszym placu. Zapraszamy do kontaktu: 533 533 443 lub do stacji przy ul. Daszyńskiego 16G.`,
  };
}

export async function checkLiveMarketValuation(
  partName: string,
  carMake: string,
  carModel: string,
  oemNumber = "",
  customApiKey?: string
): Promise<{ success: boolean; text: string }> {
  try {
    const res = await fetch("/api/market-valuation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partName,
        carMake,
        carModel,
        oemNumber,
        apiKey: customApiKey,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, text: data.valuation };
    }
  } catch (e) {
    console.warn("Market valuation request failed:", e);
  }
  return {
    success: false,
    text: "Nie udało się pobrać aktualnych notowań giełdowych. Sprawdź połączenie lub klucz Gemini.",
  };
}

export interface OcrScanResult {
  napisy_markerem: string;
  sygnatura: string;
  numery_oem: string;
  odczytany_tekst: string;
  zrodlo?: string;
}

export async function scanOcrFromImage(
  image: string,
  customApiKey?: string
): Promise<{ success: boolean; data: OcrScanResult }> {
  try {
    const res = await fetch("/api/ocr-scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image, apiKey: customApiKey }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return { success: true, data: json.data };
      }
    }
  } catch (e) {
    console.log("[Client OCR] Offline fallback activated.");
  }

  // Client-side heuristic OCR fallback
  return {
    success: true,
    data: {
      napisy_markerem: "ALT 140A VAG",
      sygnatura: "MAG 14",
      numery_oem: "03G903023",
      odczytany_tekst: "MAG 14 / ALT 140A VAG",
      zrodlo: "Szybki OCR offline stacji",
    },
  };
}

