import React, { useState } from "react";
import {
  Database,
  Search,
  Car,
  Tag,
  Layers,
  Copy,
  Check,
  Cpu,
  Key,
  ShieldCheck,
  PlusCircle,
  Sparkles,
  Loader2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import {
  searchCarPartsCatalog,
  CatalogSearchResult,
} from "../services/carPartsCatalogService";
import { PartListingData, PartItem } from "../types";

interface CarPartsCatalogTabProps {
  onAddToWms?: (part: PartItem) => void;
  onSendToScanner?: (data: Partial<PartListingData>) => void;
  onNotify?: (title: string, message: string, priority?: "info" | "success" | "warning" | "critical") => void;
}

export const CarPartsCatalogTab: React.FC<CarPartsCatalogTabProps> = ({
  onAddToWms,
  onSendToScanner,
  onNotify,
}) => {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<"oem" | "vin">("oem");
  const [preferredSource, setPreferredSource] = useState<"auto" | "tecdoc" | "autokey">("auto");
  const [customApiKey, setCustomApiKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CatalogSearchResult | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleSearch = async (overrideQuery?: string, overrideType?: "oem" | "vin") => {
    const q = (overrideQuery !== undefined ? overrideQuery : query).trim();
    const t = overrideType || searchType;

    if (!q) {
      setError("Wprowadź numer OEM części lub 17-znakowy numer VIN.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await searchCarPartsCatalog({
        query: q,
        type: t,
        preferredSource,
        customApiKey: customApiKey || undefined,
      });

      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError(res.error || "Nie znaleziono części w katalogu.");
      }
    } catch (e: any) {
      setError(e.message || "Błąd podczas łączenia z katalogiem części.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleApplyToScanner = () => {
    if (!result || !onSendToScanner) return;

    const altNums = result.alternativeOems.map((a) => `${a.brand}: ${a.number}`).join(" | ");
    const fullPartNumbers = `${result.oemNumber}${altNums ? ` (${altNums})` : ""}`;
    const primaryCompat = result.compatibilityList[0];

    const compatSummary = result.compatibilityList
      .slice(0, 5)
      .map((c) => `• ${c.make} ${c.model} (${c.years}) silnik: ${c.engine || "wszystkie"}`)
      .join("\n");

    const specsSummary = Object.entries(result.specifications || {})
      .map(([k, v]) => `• ${k}: ${v}`)
      .join("\n");

    const description = `Część z bazy katalogowej ${result.source} dla OEM ${result.oemNumber}.\n\nKompatybilność:\n${compatSummary}\n\nSpecyfikacja:\n${specsSummary}\n\nStacja demontażu PHU U Konesera w Mysłakowicach.`;

    onSendToScanner({
      kategoria: result.category,
      producent: result.primaryBrand,
      numery_czesci: fullPartNumbers,
      opis: description,
      samochod: primaryCompat
        ? {
            marka: primaryCompat.make,
            model: primaryCompat.model,
            rocznik: primaryCompat.years,
            vin: result.vin || "",
          }
        : undefined,
      cena: {
        brutto: result.estimatedPricePln || 150,
        netto: Math.round((result.estimatedPricePln || 150) / 1.23),
      },
    });

    if (onNotify) {
      onNotify("Katalog części", "Przekazano parametry części do skanera WMS!", "success");
    }
  };

  const handleAddDirectlyToWms = () => {
    if (!result || !onAddToWms) return;

    const sku = `MAG-${result.oemNumber.replace(/[^A-Z0-9]/gi, "").slice(0, 8) || "PART"}`;
    const altNums = result.alternativeOems.map((a) => `${a.brand}: ${a.number}`).join(" | ");
    const fullPartNumbers = `${result.oemNumber}${altNums ? ` (${altNums})` : ""}`;
    const primaryCompat = result.compatibilityList[0];

    const newPart: PartItem = {
      id: `part_${Date.now()}`,
      barcode: `KNS-${Date.now().toString().slice(-6)}`,
      qrCode: `PART:${result.oemNumber}`,
      currentRackLocation: "MAG 14",
      status: "Dostępny",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      listingData: {
        kategoria: result.partName,
        producent: result.primaryBrand,
        numery_czesci: fullPartNumbers,
        opis: `Część wprowadzona z katalogu ${result.source}. Numer OEM: ${result.oemNumber}. Kompatybilna z: ${
          primaryCompat ? `${primaryCompat.make} ${primaryCompat.model}` : "Pojazdy grupy"
        }.`,
        samochod: primaryCompat
          ? {
              marka: primaryCompat.make,
              model: primaryCompat.model,
              rocznik: primaryCompat.years,
              vin: result.vin || "",
            }
          : undefined,
        cena: {
          brutto: result.estimatedPricePln || 150,
          netto: Math.round((result.estimatedPricePln || 150) / 1.23),
        },
        ocr_wyniki: {
          numer_magazynowy: "MAG 14",
          napisy_markerem: `${result.primaryBrand} ${result.oemNumber}`,
        },
        zdjecia: [],
        ilosc: 1,
        stan_magazynowy: 1,
      },
    };

    onAddToWms(newPart);
    if (onNotify) {
      onNotify("Magazyn WMS", `Dodano część ${result.partName} (${sku}) do Magazynu!`, "success");
    }
  };

  return (
    <div className="space-y-4">
      {/* GŁÓWNY NAGŁÓWEK */}
      <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center shadow-xs">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Katalog Części Samochodowych: TecDoc & autokey.pl API
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Cloud SQL Caching
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Wyszukiwanie numerów OEM i kodów VIN • Pobieranie zamienników i macierzy dopasowania do WMS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowKeyInput(!showKeyInput)}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-mono flex items-center gap-1.5 cursor-pointer"
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span>Klucze API (TecDoc / autokey.pl)</span>
          </button>
        </div>
      </div>

      {/* PANEL KLUCZY API */}
      {showKeyInput && (
        <div className="bg-[#0b0f19] border border-amber-400/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-amber-300">
            <span className="font-bold flex items-center gap-2">
              <Key className="w-4 h-4" /> Konfiguracja Kluczy API Bazy Części
            </span>
            <span className="text-slate-400 text-[11px]">
              Klucze środowiskowe: TECDOC_API_KEY, AUTOKEY_API_KEY
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 font-mono block mb-1">
                Klucz API TecDoc / Pegasus (Opcjonalny)
              </label>
              <input
                type="password"
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                placeholder="Wklej klucz API TecDoc WebService..."
                className="w-full bg-[#030712] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-hidden focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 font-mono block mb-1">
                Preferowana baza danych
              </label>
              <select
                value={preferredSource}
                onChange={(e) => setPreferredSource(e.target.value as any)}
                className="w-full bg-[#030712] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono focus:outline-hidden focus:border-amber-400"
              >
                <option value="auto">Inteligentne dopasowanie (TecDoc + autokey.pl + Baza OE)</option>
                <option value="tecdoc">TecDoc WebService (Pegasus API)</option>
                <option value="autokey">Autokey.pl API</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* SEKCJA WYSZUKIWARKI */}
      <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-[#030712] p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setSearchType("oem")}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-md transition flex items-center gap-1.5 cursor-pointer ${
                searchType === "oem"
                  ? "bg-amber-400 text-slate-950 shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Tag className="w-3.5 h-3.5" /> Numer OEM / Kod części
            </button>
            <button
              type="button"
              onClick={() => setSearchType("vin")}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-md transition flex items-center gap-1.5 cursor-pointer ${
                searchType === "vin"
                  ? "bg-amber-400 text-slate-950 shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Car className="w-3.5 h-3.5" /> Numer VIN pojazdu (17 znaków)
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Szybkie przykłady:</span>
            <button
              type="button"
              onClick={() => {
                setSearchType("oem");
                setQuery("03G903023");
                handleSearch("03G903023", "oem");
              }}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
            >
              03G903023 (Alternator)
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchType("oem");
                setQuery("1K0820803S");
                handleSearch("1K0820803S", "oem");
              }}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
            >
              1K0820803S (Klima)
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchType("vin");
                setQuery("WVWZZZ1KZ6W000001");
                handleSearch("WVWZZZ1KZ6W000001", "vin");
              }}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
            >
              VIN: Golf V
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder={
                searchType === "oem"
                  ? "Wpisz numer OEM części (np. 03G903023, 6Y6945111, 1K0820803S, 5Q0907530)..."
                  : "Wpisz 17-znakowy numer VIN (np. WVWZZZ1KZ6W000001, TMBEF61U6...)..."
              }
              className="w-full bg-[#030712] border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white font-mono placeholder:text-slate-500 focus:outline-hidden focus:border-amber-400 transition"
            />
          </div>
          <button
            type="button"
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
            className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono font-bold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 stroke-[3]" />}
            <span>Wyszukaj w katalogach</span>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* WYNIKI */}
      {result && (
        <div className="space-y-4">
          {/* KARTA GŁÓWNA */}
          <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/30 text-[10px] font-mono font-bold">
                    {result.source}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                    Producent: {result.primaryBrand}
                  </span>
                  <span className="text-slate-500 text-xs font-mono">• Typ zapytania: {result.queryType.toUpperCase()}</span>
                </div>
                <h3 className="text-lg font-bold text-white">{result.partName}</h3>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Kategoria: <strong className="text-slate-200">{result.category}</strong> | Główny OEM:{" "}
                  <strong className="text-amber-400 font-bold">{result.oemNumber}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                {onSendToScanner && (
                  <button
                    type="button"
                    onClick={handleApplyToScanner}
                    className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl font-mono transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Zastosuj w Skanerze WMS</span>
                  </button>
                )}
                {onAddToWms && (
                  <button
                    type="button"
                    onClick={handleAddDirectlyToWms}
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl font-mono transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Dodaj do Magazynu WMS</span>
                  </button>
                )}
              </div>
            </div>

            {result.marketDescription && (
              <p className="text-xs text-slate-300 leading-relaxed bg-[#030712] p-3.5 rounded-xl border border-slate-800">
                {result.marketDescription}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* ZAMIENNIKI I NUMERY ALTERNATYWNE */}
            <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-400" /> Zamienniki OE & Aftermarket ({result.alternativeOems.length})
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {result.alternativeOems.map((alt, idx) => (
                  <div
                    key={idx}
                    className="bg-[#030712] border border-slate-800 rounded-lg p-2.5 flex items-center justify-between text-xs font-mono"
                  >
                    <div className="truncate mr-2">
                      <span className="text-slate-400 text-[10px] block truncate">{alt.brand} ({alt.type})</span>
                      <span className="text-amber-300 font-bold truncate block">{alt.number}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(alt.number)}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition cursor-pointer shrink-0"
                      title="Kopiuj numer"
                    >
                      {copiedText === alt.number ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* PARAMETRY TECHNICZNE */}
            <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-amber-400" /> Specyfikacja Techniczna
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {Object.entries(result.specifications || {}).map(([key, val], idx) => (
                  <div key={idx} className="bg-[#030712] p-2.5 rounded-lg border border-slate-800 text-xs font-mono">
                    <span className="text-slate-400 text-[10px] block">{key}</span>
                    <span className="text-slate-200 font-bold block">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* MACIERZ DOPASOWANIA DO POJAZDÓW */}
          <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Car className="w-4 h-4 text-teal-400" /> Kompatybilne Pojazdy ({result.compatibilityList.length})
              </h4>
            </div>
            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#030712] text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Marka i Model</th>
                    <th className="py-2.5 px-3">Generacja</th>
                    <th className="py-2.5 px-3">Silnik / Wersja</th>
                    <th className="py-2.5 px-3">Moc</th>
                    <th className="py-2.5 px-3">Roczniki</th>
                    <th className="py-2.5 px-3">Nadwozie</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {result.compatibilityList.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-900/40">
                      <td className="py-2 px-3 font-bold text-white">
                        {c.make} {c.model}
                      </td>
                      <td className="py-2 px-3 text-slate-400">{c.generation || "-"}</td>
                      <td className="py-2 px-3 text-amber-300">{c.engine || "Wszystkie"}</td>
                      <td className="py-2 px-3 text-slate-400">{c.powerHp || "-"}</td>
                      <td className="py-2 px-3 text-slate-300">{c.years}</td>
                      <td className="py-2 px-3 text-slate-400">{c.bodyType || "Wszystkie"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
