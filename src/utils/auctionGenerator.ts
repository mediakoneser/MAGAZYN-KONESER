import { PartListingData } from "../types";

/**
 * Builds ready-to-use Allegro HTML, Ovoko titles, and OLX descriptions for auto parts.
 * Complies with Polish GPSR UE 2023/988 and GVO regulations.
 */
export function generateAuctionTemplates(data: PartListingData): {
  allegroTitle: string;
  allegroDescriptionHtml: string;
  ovokoTitle: string;
  olxText: string;
} {
  const marka = (data.samochod?.marka || data.marka || "Uniwersalna").toUpperCase();
  const model = (data.samochod?.model || data.model || "").toUpperCase();
  const rocznik = data.samochod?.rocznik || data.rocznik || "";
  const kategoria = (data.kategoria || "CZĘŚĆ SAMOCHODOWA").toUpperCase();
  const oem = data.numery_czesci || "OE";
  const pozycja = data.pozycja_czesci || "";
  const regal = data.ocr_wyniki?.numer_magazynowy || data.allegro?.signature || "MAG 14";
  const jakosc = data.jakosc || data.qualityGrade || "Używany (Oryginał OE)";
  const brutto = data.cena?.brutto || 0;
  const producent = data.allegro?.manufacturer || data.producent || `${marka} OE`;

  // Allegro title limit is 75 chars - Optimized SEO pattern
  let rawTitle = `${marka} ${model} ${kategoria} ${pozycja ? pozycja + " " : ""}${oem} ORYGINAŁ`.trim();
  if (rawTitle.length > 75) {
    rawTitle = `${marka} ${model} ${kategoria} ${oem}`.trim();
  }
  if (rawTitle.length > 75) {
    rawTitle = rawTitle.substring(0, 75).trim();
  }
  const allegroTitle = rawTitle;

  // Ovoko Title
  const ovokoTitle = `${marka} ${model} ${kategoria} ${oem} [${regal}]`.trim();

  // Allegro HTML Standard Section matching Allegro Sales Center Form (Screenshots 4, 5, 5.2)
  const allegroDescriptionHtml = `
<div style="font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; max-width: 960px; margin: 0 auto; line-height: 1.6; font-size: 14px;">
  <div style="background: linear-gradient(135deg, #0b0f19 0%, #1e293b 100%); color: #ffffff; padding: 20px 24px; border-radius: 12px; margin-bottom: 20px; border-left: 6px solid #eab308;">
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800; color: #facc15;">${marka} ${model} - ${kategoria}</h1>
    <p style="margin: 0; font-size: 13px; color: #94a3b8;">
      Legalna Stacja Demontażu Pojazdów: <strong style="color: #ffffff;">PHU U KONESERA Grzegorz Kuźma</strong> | Mysłakowice k. Jeleniej Góry
    </p>
  </div>

  <div style="background: #ffffff; border: 1px solid #e2e8f0; padding: 20px; border-radius: 10px; margin-bottom: 18px;">
    <p style="font-size: 15px; color: #0f172a; margin: 0 0 14px 0; font-weight: 500;">
      Przedmiotem sprzedaży jest <strong>oryginalny ${data.kategoria?.toLowerCase() || "komponent"}</strong> dedykowany do modelu <strong>${marka} ${model}</strong> ${rocznik ? `(${rocznik})` : ""}.
    </p>
    
    <ul style="margin: 0 0 16px 0; padding-left: 20px; color: #334155;">
      <li style="margin-bottom: 8px;">
        <strong>Stan techniczny:</strong> Część w 100% sprawna, zdemontowana ze sprawnego pojazdu i poddana weryfikacji przed magazynowaniem.
      </li>
      <li style="margin-bottom: 8px;">
        <strong>Wizualnie:</strong> Posiada normalne ślady użytkowania widoczne na rzeczywistych zdjęciach (oznaczony sygnaturą magazynową <span style="background: #fef08a; color: #854d0e; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-weight: bold;">${regal}</span>).
      </li>
      <li style="margin-bottom: 8px;">
        <strong>Zalety:</strong> Oryginalny komponent fabryczny (OE ${producent}), bezproblemowa współpraca z instalacją pojazdu i brak błędów w sterowniku w przeciwieństwie do tanich zamienników.
      </li>
    </ul>

    ${data.opis ? `<div style="background: #f8fafc; border-left: 3px solid #3b82f6; padding: 12px 16px; border-radius: 6px; font-size: 13px; color: #475569; margin-top: 12px;"><strong>Dodatkowe informacje:</strong> ${data.opis}</div>` : ""}
  </div>

  <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 10px; margin-bottom: 18px;">
    <h2 style="font-size: 15px; font-weight: 700; margin: 0 0 14px 0; color: #0f172a; text-transform: uppercase; border-bottom: 2px solid #eab308; padding-bottom: 6px; display: inline-block;">
      Parametry Techniczne i Magazynowe:
    </h2>
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px 0; font-weight: 600; width: 38%; color: #64748b;">Marka i model pojazdu:</td>
        <td style="padding: 8px 0; color: #0f172a;"><strong>${marka} ${model}</strong> ${rocznik ? `(${rocznik})` : ""}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Producent części:</td>
        <td style="padding: 8px 0; color: #0f172a;"><strong>${producent}</strong></td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Numer katalogowy OEM:</td>
        <td style="padding: 8px 0; color: #0f172a; font-family: monospace; font-weight: 700; font-size: 14px; color: #1e40af;">${oem}</td>
      </tr>
      ${pozycja ? `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Strona zabudowy / pozycja:</td>
        <td style="padding: 8px 0; color: #0f172a;"><strong>${pozycja}</strong></td>
      </tr>` : ""}
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Stan części (zgodnie z GVO):</td>
        <td style="padding: 8px 0; color: #15803d; font-weight: bold;">${jakosc}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Sygnatura magazynowa (WMS):</td>
        <td style="padding: 8px 0; color: #b45309; font-weight: bold; font-family: monospace;">${regal}</td>
      </tr>
    </table>
  </div>

  <div style="background: #0f172a; color: #94a3b8; padding: 18px 20px; border-radius: 10px; font-size: 12px; border: 1px solid #334155; line-height: 1.6;">
    <p style="margin: 0 0 6px 0; font-weight: bold; color: #facc15;">INFORMACJA O SPRZEDAWCY & GPSR UE 2023/988:</p>
    <p style="margin: 0 0 4px 0; color: #f1f5f9;"><strong>PHU U KONESERA Grzegorz Kuźma</strong> | NIP: 611-236-47-28</p>
    <p style="margin: 0 0 4px 0;">Siedziba & Magazyn WMS: 58-533 Mysłakowice, ul. Daszyńskiego 16G (woj. Dolnośląskie)</p>
    <p style="margin: 0; color: #facc15;">Infolinia & Doradztwo: <strong>533 533 443</strong></p>
  </div>
</div>
`.trim();

  // Clean Plaintext OLX text
  const olxText = `
${allegroTitle} - ${brutto} zł

Witam,
Na sprzedaż oferuję: ${kategoria} do samochodu ${marka} ${model} (${rocznik}).
Numery części (OEM): ${oem}
Producent: ${producent}
Strona / Pozycja: ${pozycja || "Zgodna z foto"}
Stan techniczny: ${jakosc}
Regał WMS / Sygnatura: ${regal}

OPIS PRZEDMIOTU:
${data.opis || `Część w 100% sprawna, zdemontowana na legalnej stacji recyklingu aut PHU U Konesera w Mysłakowicach. Stan dokładnie jak na załączonych zdjęciach.`}

CENA: ${brutto} zł brutto (Wystawiamy Fakturę VAT lub Paragon)

ODBIÓR I WYSYŁKA:
- Odbiór osobisty: Mysłakowice, ul. Daszyńskiego 16G (obok Jeleniej Góry)
- Szybka wysyłka kurierska za pobraniem lub po przedpłacie.
- Telefon kontaktowy: 533 533 443
`.trim();

  return {
    allegroTitle,
    allegroDescriptionHtml,
    ovokoTitle,
    olxText,
  };
}
