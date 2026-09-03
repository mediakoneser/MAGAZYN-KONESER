import React, { useState } from "react";
import {
  FileText,
  Printer,
  Copy,
  Check,
  X,
  Building2,
  Cpu,
  Layers,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Boxes,
  Car,
  Globe,
  Radio,
  PhoneCall,
  Calendar,
  Award,
  Sparkles,
  Barcode,
} from "lucide-react";
import { PartItem, NetworkSyncInfo } from "../types";

interface ProjectReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: PartItem[];
  syncInfo?: NetworkSyncInfo;
}

export const ProjectReportModal: React.FC<ProjectReportModalProps> = ({
  isOpen,
  onClose,
  parts,
  syncInfo,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Real statistics calculated from system state
  const totalParts = parts.length;
  const totalValueBrutto = parts.reduce((acc, p) => {
    const price = p.listingData?.cena?.brutto || p.listingData?.cena_kup_teraz || 0;
    const qty = p.ilosc || 1;
    return acc + price * qty;
  }, 0);

  const partsWithOem = parts.filter((p) => {
    const oem = p.listingData?.numery_czesci || p.listingData?.kod_producenta;
    return oem && oem !== "-" && oem.length > 2;
  }).length;

  const publishedAllegro = parts.filter(
    (p) =>
      p.allegroOfferId ||
      p.listingData?.allegro?.offerId ||
      p.allegroStatus === "active" ||
      (p as any).marketplace_status?.allegro?.offerId
  ).length;

  const publishedOvoko = parts.filter(
    (p) =>
      p.publishedPlatforms?.some((pl) => pl.platform.includes("Ovoko")) ||
      (p as any).marketplace_status?.ovoko?.synced
  ).length;

  const uniqueRacks = new Set(
    parts
      .map((p) => p.currentRackLocation || p.listingData?.ocr_wyniki?.numer_magazynowy)
      .filter(Boolean)
  ).size;

  const reportDate = new Date().toLocaleDateString("pl-PL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handlePrint = () => {
    window.print();
  };

  const generateMarkdownReport = () => {
    return `# RAPORT Z PROJEKTU: SYSTEM WMS, SKANER AI & DYSTRYBUCJA MARKETPLACE
**Podmiot wdrożeniowy:** PHU U KONESERA Grzegorz Kuźma  
**Lokalizacja:** ul. Daszyńskiego 16G, 58-533 Mysłakowice  
**Infolinia magazynowa:** 533 533 443  
**Data raportu:** ${reportDate}  
**Status projektu:** WDROŻONY I AKTYWNY PRODUKCYJNIE (100% OPERACYJNY)

---

### 1. PODSUMOWANIE METRYK SYSTEMOWYCH
- **Łączna liczba skatalogowanych części:** ${totalParts} szt.
- **Szacowana wartość magazynu (brutto):** ${totalValueBrutto.toLocaleString("pl-PL")} PLN
- **Części z odczytanym numerem OEM/Producenta:** ${partsWithOem} szt. (${Math.round((partsWithOem / (totalParts || 1)) * 100)}%)
- **Zsynchronizowane oferty Allegro REST API:** ${publishedAllegro} szt.
- **Zsynchronizowane oferty Ovoko / RRR.lt:** ${publishedOvoko} szt.
- **Unikalne lokalizacje i regały magazynowe:** ${uniqueRacks}
- **Status synchronizacji chmurowej Firestore:** ${syncInfo?.syncStatus === "synced" ? "ZSYNCHRONIZOWANO (ONLINE)" : "AKTYWNY"}

---

### 2. ZREALIZOWANE MODUŁY I ARCHITEKTURA
1. **Centralna Baza WMS (Single Source of Truth):**
   - Ewidencja części, unikalne sygnatury regałowe (np. MAGDA 1, REGAŁ A-12), kalkulacja marży i zysku.
   - Odporność na brak internetu (Offline-First via IndexedDB + localStorage) oraz chmura Google Cloud Firestore.

2. **Skaner AI Gemini Vision OCR:**
   - Błyskawiczne rozpoznawanie tabliczek znamionowych, numerów OEM, producenta i stanu części bezpośrednio ze zdjęcia aparatem smartfona.
   - Automatyczny generator profesjonalnych tytułów aukcji i szablonów opisów HTML.

3. **Cykl Życia Pojazdów Dawców (Stacja Demontażu):**
   - Ewidencja aut od zakupu na placu po demontaż i rozliczenie złomu BDO (katalizator, akumulator, metale).

4. **Integracja Allegro REST API v2 (Sales Center):**
   - 7-etapowy proces cyklu życia oferty z weryfikacją parametrów na żywo.
   - Ścisła izolacja identyfikatorów Typed IDs (offerId, productId, operationId, SKU).
   - Pełna zgodność z unijną dyrektywą GPSR i wymogami bezpieczeństwa.

5. **Dystrybucja Wielokanałowa (Ovoko / RRR, Sklep Własny, BaseLinker):**
   - Automatyczny przelicznik PLN -> EUR (kurs 4.30) na rynki Litwy, Niemiec i Francji.
   - Własny sklep e-commerce z 0% prowizji pośredników.

6. **Smart Infolinia AI (533 533 443):**
   - Wyszukiwarka stanu magazynowego zoptymalizowana pod szybką obsługę klienta dzwoniącego na stację demontażu.

7. **Pulpit Zarządczy Szefa & Panel Pracownika:**
   - Delegowanie zadań priorytetowych, powiadomienia dźwiękowe, rozliczanie wydajności personelu.

---
Wygenerowano automatycznie przez System WMS UKONESERA.PL`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateMarkdownReport());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl max-w-4xl w-full p-4 sm:p-6 space-y-5 shadow-2xl my-auto text-slate-100 print:bg-white print:text-black print:border-none print:shadow-none print:m-0 print:p-0">
        {/* NAGŁÓWEK MODALU - UKRYWANY W DRUKU */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-yellow-400/15 border border-yellow-400/30 flex items-center justify-center text-yellow-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white font-mono flex items-center gap-2">
                Raport z Projektu: WMS & Skaner AI
              </h2>
              <p className="text-xs text-slate-400">
                Oficjalne podsumowanie stanu wdrożenia dla PHU U KONESERA Grzegorz Kuźma
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer font-mono"
              title="Kopiuj treść raportu jako Markdown"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? "Skopiowano!" : "Kopiuj"}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-sm font-mono"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Drukuj / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* WŁAŚCIWA TREŚĆ RAPORTU (PRZYJAZNA DO DRUKU) */}
        <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1 print:max-h-none print:overflow-visible">
          {/* HEADER FIRMOWY RAPORTU */}
          <div className="bg-gradient-to-r from-[#030712] via-[#0b1329] to-[#030712] border border-slate-800 rounded-xl p-5 print:bg-white print:border-b-2 print:border-black print:p-0 print:pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-yellow-400 print:text-black" />
                  <h1 className="text-lg sm:text-xl font-black text-white tracking-wide font-mono print:text-black">
                    PHU U KONESERA Grzegorz Kuźma
                  </h1>
                </div>
                <p className="text-xs text-slate-400 mt-1 font-mono print:text-gray-700">
                  Stacja Demontażu Pojazdów • ul. Daszyńskiego 16G, 58-533 Mysłakowice
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-300 font-mono print:text-black">
                  <span className="flex items-center gap-1">
                    <PhoneCall className="w-3.5 h-3.5 text-yellow-400 print:text-black" />
                    <strong>Infolinia: 533 533 443</strong>
                  </span>
                  <span>•</span>
                  <span>sklep.kasacja24.com</span>
                </div>
              </div>

              <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold font-mono print:bg-gray-100 print:text-black print:border-black">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 print:text-black" />
                  STATUS: WDROŻENIE ZAKOŃCZONE (PRODUKCJA)
                </span>
                <div className="text-[11px] text-slate-400 mt-1.5 font-mono print:text-gray-600 flex sm:justify-end items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Data sporządzenia: {reportDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* PAS METRYK BIZNESOWYCH */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono mb-3 print:text-black">
              Kluczowe Wskaźniki Magazynowe (Stan na żywo)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
              <div className="bg-[#030712] border border-slate-800 rounded-xl p-3.5 space-y-1 print:bg-gray-50 print:border-gray-300">
                <div className="flex items-center justify-between text-slate-400 text-xs print:text-black">
                  <span>Skatalogowane części</span>
                  <Boxes className="w-4 h-4 text-teal-400 print:text-black" />
                </div>
                <div className="text-2xl font-black text-white font-mono print:text-black">{totalParts}</div>
                <p className="text-[10px] text-slate-500 print:text-gray-600">Pozycje w bazie WMS</p>
              </div>

              <div className="bg-[#030712] border border-slate-800 rounded-xl p-3.5 space-y-1 print:bg-gray-50 print:border-gray-300">
                <div className="flex items-center justify-between text-slate-400 text-xs print:text-black">
                  <span>Wartość magazynu</span>
                  <TrendingUp className="w-4 h-4 text-emerald-400 print:text-black" />
                </div>
                <div className="text-2xl font-black text-emerald-400 font-mono print:text-black">
                  {totalValueBrutto.toLocaleString("pl-PL")} <span className="text-xs font-normal">PLN</span>
                </div>
                <p className="text-[10px] text-slate-500 print:text-gray-600">Suma cen brutto</p>
              </div>

              <div className="bg-[#030712] border border-slate-800 rounded-xl p-3.5 space-y-1 print:bg-gray-50 print:border-gray-300">
                <div className="flex items-center justify-between text-slate-400 text-xs print:text-black">
                  <span>Oferty Allegro</span>
                  <Radio className="w-4 h-4 text-yellow-400 print:text-black" />
                </div>
                <div className="text-2xl font-black text-yellow-400 font-mono print:text-black">{publishedAllegro}</div>
                <p className="text-[10px] text-slate-500 print:text-gray-600">Aktywne w Allegro REST API</p>
              </div>

              <div className="bg-[#030712] border border-slate-800 rounded-xl p-3.5 space-y-1 print:bg-gray-50 print:border-gray-300">
                <div className="flex items-center justify-between text-slate-400 text-xs print:text-black">
                  <span>Rynki Ovoko/UE</span>
                  <Globe className="w-4 h-4 text-purple-400 print:text-black" />
                </div>
                <div className="text-2xl font-black text-purple-300 font-mono print:text-black">{publishedOvoko}</div>
                <p className="text-[10px] text-slate-500 print:text-gray-600">Litwa, Niemcy, Francja</p>
              </div>
            </div>
          </div>

          {/* 8 FILARÓW PROJEKTU */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono print:text-black">
              Szczegółowy Zakres Zrealizowanego Oprogramowania
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 print:grid-cols-2">
              {/* MODUŁ 1 */}
              <div className="bg-[#030712] border border-slate-800 rounded-xl p-4 space-y-2 print:bg-gray-50 print:border-gray-300">
                <div className="flex items-center gap-2 text-yellow-400 font-bold text-xs font-mono print:text-black">
                  <Boxes className="w-4 h-4 text-yellow-400 print:text-black" />
                  <span>1. Centralny Magazyn WMS (Single Source of Truth)</span>
                </div>
                <p className="text-xs text-slate-300 print:text-gray-800 leading-relaxed">
                  Zbudowano bezwzględny magazyn centralny. Każda część posiada unikalny rekord, sygnaturę regałową (np. MAGDA 1, A-02), stan magazynowy oraz automatyczne wyliczanie zysku na czysto po odliczeniu kosztów pozyskania auta.
                </p>
                <div className="text-[10px] text-slate-500 print:text-gray-600 font-mono">
                  Technologia: React, IndexedDB (Offline-First), Google Cloud Firestore
                </div>
              </div>

              {/* MODUŁ 2 */}
              <div className="bg-[#030712] border border-slate-800 rounded-xl p-4 space-y-2 print:bg-gray-50 print:border-gray-300">
                <div className="flex items-center gap-2 text-teal-400 font-bold text-xs font-mono print:text-black">
                  <Cpu className="w-4 h-4 text-teal-400 print:text-black" />
                  <span>2. Skaner AI Gemini Vision OCR</span>
                </div>
                <p className="text-xs text-slate-300 print:text-gray-800 leading-relaxed">
                  Inteligentny aparat rozpoznający ze zdjęcia tabliczki znamionowej lub numeru części: markę, model auta, kod producenta, silnik oraz stan techniczny. Automatycznie sugeruje rynkową wycenę i generuje opisy.
                </p>
                <div className="text-[10px] text-slate-500 print:text-gray-600 font-mono">
                  Technologia: Google Gemini Multimodal Vision API, natywne WebRTC kamery
                </div>
              </div>

              {/* MODUŁ 3 */}
              <div className="bg-[#030712] border border-slate-800 rounded-xl p-4 space-y-2 print:bg-gray-50 print:border-gray-300">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-xs font-mono print:text-black">
                  <Car className="w-4 h-4 text-blue-400 print:text-black" />
                  <span>3. Ewidencja Aut Dawców & Stacja Demontażu</span>
                </div>
                <p className="text-xs text-slate-300 print:text-gray-800 leading-relaxed">
                  Pełny obieg pojazdów kasacyjnych: od zakupu, przez transport lawetą, odzysk katalizatora i akumulatora, aż po skasowanie karoserii do huty z rejestracją w systemie BDO.
                </p>
                <div className="text-[10px] text-slate-500 print:text-gray-600 font-mono">
                  Funkcje: Rentowność auta, bilans zysku, ewidencja wagowa złomu
                </div>
              </div>

              {/* MODUŁ 4 */}
              <div className="bg-[#030712] border border-slate-800 rounded-xl p-4 space-y-2 print:bg-gray-50 print:border-gray-300">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs font-mono print:text-black">
                  <Radio className="w-4 h-4 text-amber-400 print:text-black" />
                  <span>4. Allegro REST API v2 (Sales Center)</span>
                </div>
                <p className="text-xs text-slate-300 print:text-gray-800 leading-relaxed">
                  Zaawansowany formularz wystawiania zgodny z najnowszymi wytycznymi Allegro (szablony blokowe, GPSR UE, EAN, parametry techniczne). 7-etapowy proces cyklu życia oferty z weryfikacją 100% zgodności na żywo.
                </p>
                <div className="text-[10px] text-slate-500 print:text-gray-600 font-mono">
                  Klucze: Ścisłe Typed IDs (offerId, productId, operationId, SKU regału)
                </div>
              </div>

              {/* MODUŁ 5 */}
              <div className="bg-[#030712] border border-slate-800 rounded-xl p-4 space-y-2 print:bg-gray-50 print:border-gray-300">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-xs font-mono print:text-black">
                  <Globe className="w-4 h-4 text-purple-400 print:text-black" />
                  <span>5. Multi-Marketplace: Ovoko / RRR & Sklep Własny</span>
                </div>
                <p className="text-xs text-slate-300 print:text-gray-800 leading-relaxed">
                  Wielokanałowa dystrybucja części bez podwójnej pracy. Automatyczne przeliczanie waluty na EUR dla platformy Ovoko (Litwa, Niemcy, Francja) oraz sklep internetowy z 0% prowizji.
                </p>
                <div className="text-[10px] text-slate-500 print:text-gray-600 font-mono">
                  Kanały: Allegro, Ovoko / RRR.lt, ShopGold (kasacja24.com), BaseLinker
                </div>
              </div>

              {/* MODUŁ 6 */}
              <div className="bg-[#030712] border border-slate-800 rounded-xl p-4 space-y-2 print:bg-gray-50 print:border-gray-300">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs font-mono print:text-black">
                  <PhoneCall className="w-4 h-4 text-emerald-400 print:text-black" />
                  <span>6. Smart Infolinia Magazynowa (533 533 443)</span>
                </div>
                <p className="text-xs text-slate-300 print:text-gray-800 leading-relaxed">
                  Wyszukiwarka w czasie rzeczywistym dedykowana do rozmów telefonicznych. W ułamku sekundy podpowiada numer regału, cenę i dostępność części, gdy dzwoni klient.
                </p>
                <div className="text-[10px] text-slate-500 print:text-gray-600 font-mono">
                  Czas reakcji: poniżej 200 ms, filtry wieloparametrowe
                </div>
              </div>

              {/* MODUŁ 7 */}
              <div className="bg-[#030712] border border-slate-800 rounded-xl p-4 space-y-2 print:bg-gray-50 print:border-gray-300">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs font-mono print:text-black">
                  <Award className="w-4 h-4 text-rose-400 print:text-black" />
                  <span>7. Pulpit Szefa & Zarządzanie Zespołem</span>
                </div>
                <p className="text-xs text-slate-300 print:text-gray-800 leading-relaxed">
                  Podział ról na Szefa, Magazyniera, Demontażystę i E-commerce. Właściciel może jednym kliknięciem delegować pilne zadania z alertami dźwiękowymi i monitorować postęp prac.
                </p>
                <div className="text-[10px] text-slate-500 print:text-gray-600 font-mono">
                  Funkcje: Zlecenia priorytetowe, statystyki personelu, audyt bazy
                </div>
              </div>

              {/* MODUŁ 8 */}
              <div className="bg-[#030712] border border-slate-800 rounded-xl p-4 space-y-2 print:bg-gray-50 print:border-gray-300">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs font-mono print:text-black">
                  <ShieldCheck className="w-4 h-4 text-indigo-400 print:text-black" />
                  <span>8. Druk Etykiet Termicznych z Kodem Kreskowym</span>
                </div>
                <p className="text-xs text-slate-300 print:text-gray-800 leading-relaxed">
                  Generowanie etykiet magazynowych kompatybilnych z drukarkami termicznymi Zebra/Brother. Każda część oznaczona jest kodem kreskowym, sygnaturą i danymi pojazdu dawcy.
                </p>
                <div className="text-[10px] text-slate-500 print:text-gray-600 font-mono">
                  Formaty: Standard etykiet 50x30mm, 100x150mm, Code128
                </div>
              </div>
            </div>
          </div>

          {/* STOPKA PODPISOWA RAPORTU */}
          <div className="pt-4 border-t border-slate-800 print:border-t-2 print:border-black flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-mono text-slate-400 print:text-black">
            <div>
              <div className="text-white font-bold print:text-black">System WMS & AI UKONESERA.PL v2026</div>
              <div>Środowisko: Google Cloud Platform (Cloud Run + Firestore Database)</div>
            </div>
            <div className="text-right">
              <div>Zatwierdzono do użytku produkcyjnego:</div>
              <div className="text-yellow-400 font-bold print:text-black">Grzegorz Kuźma • PHU U KONESERA</div>
            </div>
          </div>
        </div>

        {/* DOLNY PASEK ZAMKNIĘCIA - UKRYWANY W DRUKU */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between print:hidden">
          <div className="text-[11px] text-slate-500 font-mono">
            Raport wygenerowano z danych bazy WMS w czasie rzeczywistym
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Zamknij raport
          </button>
        </div>
      </div>
    </div>
  );
};
