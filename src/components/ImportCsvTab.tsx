import React, { useRef, useState } from "react";
import { UploadCloud, FileSpreadsheet, Check, RefreshCw, Sparkles, Zap, Download } from "lucide-react";
import { PartItem } from "../types";
import { parseCsvText } from "../utils/csvParser";
import { downloadAllegroTemplateCsv } from "../utils/allegroCsvHandler";
import { AllegroCsvImportModal } from "./AllegroCsvImportModal";

interface ImportCsvTabProps {
  onImportParts: (newParts: PartItem[]) => void;
}

export const ImportCsvTab: React.FC<ImportCsvTabProps> = ({ onImportParts }) => {
  const [importStatus, setImportStatus] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isAllegroModalOpen, setIsAllegroModalOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setImportStatus(`Wczytywanie i inteligentne analizowanie pliku ${file.name}...`);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = (evt.target?.result as string) || "";
        const parsedParts = parseCsvText(text);

        if (parsedParts.length > 0) {
          onImportParts(parsedParts);
          setImportStatus(
            `Pomyślnie zaimportowano ${parsedParts.length.toLocaleString("pl-PL")} pozycji! Usunięto znaczniki HTML, wykryto marki pojazdów i przypisano regały WMS.`
          );
        } else {
          setImportStatus("Nie znaleziono poprawnych wierszy do zaimportowania w wybranym pliku.");
        }
      } catch (err) {
        console.error("CSV import error:", err);
        setImportStatus("Wystąpił błąd podczas parsowania pliku CSV.");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setImportStatus("Nie udało się odczytać pliku.");
      setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  const handleGenerateSampleCsv = () => {
    const headers = [
      "ID",
      "Kategoria",
      "Marka",
      "Model",
      "Rocznik",
      "Numery_OEM",
      "Cena_Brutto",
      "Cena_Netto",
      "WMS_Regal",
      "Status",
    ];
    const rows = [
      ["IMP_01", "Reflektor przedni prawy", "Renault", "Clio II", "1998 - 2005", "7701047683", "120", "98", "MAG 18", "Dostępny"],
      ["IMP_02", "Alternator 120A", "Ford", "Focus MK2", "2004 - 2011", "3M5T-10300-YD", "160", "130", "MAG 44", "Dostępny"],
      ["IMP_03", "Zamek drzwi lewy przód", "Seat", "Leon I", "1999 - 2006", "3B1837015A", "75", "61", "MAG 12", "Dostępny"],
      ["IMP_04", "Sterownik silnika 1.9 TDI", "Volkswagen", "Passat B5", "1997 - 2005", "038906019HJ", "180", "146", "MAG 31", "Dostępny"],
      ["IMP_05", "Zacisk hamulcowy tył lewy", "Skoda", "Fabia I", "1999 - 2008", "6Q0615423A", "85", "69", "MAG 14", "Dostępny"],
    ];
    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(";"), ...rows.map((e) => e.join(";"))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "szablon_import_koneser_wms.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[#0b0f19] border border-slate-800/90 rounded-xl p-3.5 sm:p-5 space-y-4 shadow-xs">
      <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 font-mono">
            <UploadCloud className="w-4 h-4 text-yellow-400" />
            Import CSV / BaseLinker / OVOKO / Allegro
          </h2>
          <p className="text-[11px] text-slate-400 font-mono">
            Masowy import stanów magazynowych, usuwanie znaczników HTML i automatyczne mapowanie marek
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsAllegroModalOpen(true)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-sm font-mono"
          >
            <Zap className="w-3.5 h-3.5 text-slate-950" />
            <span>Kreator Masowego Wystawiania Allegro (29 Kolumn)</span>
          </button>

          <button
            onClick={() => downloadAllegroTemplateCsv("template.csv")}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-yellow-400 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer font-mono"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Pobierz template.csv</span>
          </button>

          <button
            onClick={handleGenerateSampleCsv}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer font-mono"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Wzór WMS</span>
          </button>
        </div>
      </div>

      {/* BANER KREATORA ALLEGRO */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-yellow-950/30 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-yellow-400/20 border border-yellow-400/40 text-yellow-300 font-mono font-bold text-[10px]">
              NOWOŚĆ 2026
            </span>
            <h3 className="text-white font-bold text-xs sm:text-sm font-mono">
              Masowe Wystawianie Allegro z Pliku CSV (29 Kolumn)
            </h3>
          </div>
          <p className="text-[11px] text-slate-300">
            Obsługuje <span className="text-yellow-400 font-mono font-semibold">GTIN, EXTERNAL_ID, NAME, STOCK, PRICE, MPN, DESCRIPTION, IMAGE1..16, AI_COCREATED, CATEGORY, BRAND, COLOR, SIZE, MATERIAL</span>. 4-stopniowy asystent weryfikacji i publikacji REST API.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAllegroModalOpen(true)}
          className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <Zap className="w-4 h-4" />
          <span>Otwórz Kreator Allegro</span>
        </button>
      </div>

      {/* DRAG & DROP ZONE */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-800/90 hover:border-yellow-400/60 bg-[#030712] rounded-xl p-6 sm:p-8 text-center cursor-pointer transition space-y-2.5"
      >
        <div className="w-12 h-12 rounded-lg bg-yellow-400/10 text-yellow-400 flex items-center justify-center mx-auto border border-yellow-400/20">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div className="space-y-0.5">
          <span className="text-xs sm:text-sm font-bold text-white block font-mono">
            Wybierz lub upuść plik CSV (np. Base__Produkty.csv, eksport z Allegro lub OVOKO)
          </span>
          <p className="text-[11px] text-slate-400 font-mono">
            Obsługuje formaty rozdzielane średnikiem (;), przecinkiem (,) lub tabulatorem z kodowaniem UTF-8 / Windows-1250
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs rounded-lg shadow-xs cursor-pointer font-mono inline-flex items-center gap-1.5"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Wybierz plik z dysku</span>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt"
        onChange={handleFileUpload}
        className="hidden"
      />

      {isProcessing && (
        <div className="bg-[#030712] p-3.5 rounded-lg border border-yellow-400/30 text-xs text-yellow-400 font-mono flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>{importStatus}</span>
        </div>
      )}

      {!isProcessing && importStatus && (
        <div className="bg-[#030712] p-3.5 rounded-lg border border-teal-500/30 text-xs text-teal-300 font-semibold flex items-center gap-2 font-mono">
          <Check className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{importStatus}</span>
        </div>
      )}

      {/* HIGHLIGHT BOXES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        <div className="bg-[#030712] p-3 rounded-lg border border-slate-800 text-xs space-y-1">
          <div className="text-yellow-400 font-bold font-mono flex items-center gap-1.5 text-[11px]">
            <Sparkles className="w-3.5 h-3.5" />
            Automatyczne czyszczenie HTML
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Nasz algorytm usuwa znaczniki &lt;p&gt;, &lt;br&gt;, encje &amp;nbsp; oraz inne formatowania wklejone z BaseLinkera, dzięki czemu filtry marek i modeli działają idealnie.
          </p>
        </div>

        <div className="bg-[#030712] p-3 rounded-lg border border-slate-800 text-xs space-y-1">
          <div className="text-teal-400 font-bold font-mono flex items-center gap-1.5 text-[11px]">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Wsparcie dla plików powyżej 15 000 rekordów
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Dzięki silnikowi IndexedDB i stronicowaniu baza WMS przetwarza tysiące części płynnie i bez opóźnień.
          </p>
        </div>
      </div>

      {/* MODAL MASOWEGO WYSTAWIANIA ALLEGRO CSV */}
      <AllegroCsvImportModal
        isOpen={isAllegroModalOpen}
        onClose={() => setIsAllegroModalOpen(false)}
        onImportComplete={(newParts) => {
          onImportParts(newParts);
          setImportStatus(`Pomyślnie zaimportowano i przygotowano ${newParts.length} pozycji w asortymencie Allegro!`);
        }}
      />
    </div>
  );
};
