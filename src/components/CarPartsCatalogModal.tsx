import React, { useState } from "react";
import {
  Search,
  Database,
  Car,
  Tag,
  Layers,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  PlusCircle,
  X,
  Loader2,
  Cpu,
  Key,
  Info,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  searchCarPartsCatalog,
  CatalogSearchResult,
} from "../services/carPartsCatalogService";
import { PartListingData, PartItem } from "../types";

interface CarPartsCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  initialType?: "oem" | "vin";
  onApplyToFormData?: (data: Partial<PartListingData>) => void;
  onAddToWms?: (part: PartItem) => void;
  onNotify?: (title: string, message: string, priority?: "info" | "success" | "warning" | "critical") => void;
}

export const CarPartsCatalogModal: React.FC<CarPartsCatalogModalProps> = ({
  isOpen,
  onClose,
  initialQuery = "",
  initialType = "oem",
  onApplyToFormData,
  onAddToWms,
  onNotify,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [searchType, setSearchType] = useState<"oem" | "vin">(initialType);
  const [preferredSource, setPreferredSource] = useState<"auto" | "tecdoc" | "autokey">("auto");
  const [customApiKey, setCustomApiKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CatalogSearchResult | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!isOpen) return null;

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
        setError(res.error || "Nie znaleziono danych w katalogach TecDoc / Autokey.");
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
    if (!result || !onApplyToFormData) return;

    // Construct merged part numbers string
    const altNums = result.alternativeOems.map((a) => `${a.brand}: ${a.number}`).join(" | ");
    const fullPartNumbers = `${result.oemNumber}${altNums ? ` (${altNums})` : ""}`;

    // Construct compatibility and specs description
    const compatSummary = result.compatibilityList
      .slice(0, 5)
      .map((c) => `• ${c.make} ${c.model} (${c.years}) silnik: ${c.engine || "wszystkie"}`)
      .join("\n");

    const specsSummary = Object.entries(result.specifications || {})
      .map(([k, v]) => `• ${k}: ${v}`)
      .join("\n");

    const description = `Oryginalna część z katalogu ${result.source} dla numeru OEM: ${result.oemNumber}.\n\nKompatybilność z pojazdami:\n${compatSummary}\n\nParametry techniczne:\n${specsSummary}\n\nZdemontowano na stacji demontażu PHU U Konesera w Mysłakowicach.`;

    const primaryCompat = result.compatibilityList[0];

    onApplyToFormData({
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
      onNotify("Katalog części", `Zastosowano parametry ${result.partName} w formularzu WMS!`, "success");
    }
    onClose();
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
      onNotify("Karta WMS", `Dodano część ${result.partName} (${sku}) do Magazynu WMS!`, "success");
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-[#0b0f19] border border-slate-700/90 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* NAGŁÓWEK */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#070b14]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Baza Części Samochodowych: TecDoc & autokey.pl
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Cloud SQL Cache
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Wyszukiwanie według numeru OEM lub VIN z pobieraniem zamienników i kompatybilności do WMS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CIAŁO MODALA */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* PRZEŁĄCZNIK TYPU SZUKANIA I KONTROLKI */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#030712] p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5 bg-[#0b0f19] p-1 rounded-lg border border-slate-800">
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

            <div className="flex items-center gap-2">
              <select
                value={preferredSource}
                onChange={(e) => setPreferredSource(e.target.value as any)}
                className="bg-[#0b0f19] text-xs font-mono text-slate-300 border border-slate-800 rounded-lg px-3 py-1.5 focus:outline-hidden focus:border-amber-400"
              >
                <option value="auto">Baza: Wszystkie (TecDoc + Autokey)</option>
                <option value="tecdoc">Baza: TecDoc WebService</option>
                <option value="autokey">Baza: Autokey.pl API</option>
              </select>

              <button
                type="button"
                onClick={() => setShowKeyInput(!showKeyInput)}
                className="px-2.5 py-1.5 bg-[#0b0f19] hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                title="Wprowadź własny klucz API TecDoc / autokey.pl"
              >
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Klucz API</span>
              </button>
            </div>
          </div>

          {/* OSOBNY PANEL WPISYWANIA KLUCZA API */}
          {showKeyInput && (
            <div className="p-3 bg-amber-400/5 border border-amber-400/20 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-amber-300">
                <span className="font-bold flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" /> Opcjonalny własny klucz API TecDoc lub Autokey.pl
                </span>
                <span className="text-[10px] text-slate-400">
                  (Domyślnie używane są klucze z .env / serwera)
                </span>
              </div>
              <input
                type="password"
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                placeholder="Wklej klucz API TecDoc lub autokey.pl..."
                className="w-full bg-[#030712] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-hidden focus:border-amber-400"
              />
            </div>
          )}

          {/* PASEK WYSZUKIWARKI */}
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
                    ? "Wpisz numer OEM części (np. 03G903023, 6Y6945111, 1K0820803S)..."
                    : "Wpisz 17-znakowy numer VIN (np. WVWZZZ1KZ6W000001, TMBEF61U...)..."
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
              <span>Szukaj w katalogu</span>
            </button>
          </div>

          {/* SZYBKIE PRZYKŁADY */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            <span className="text-slate-400 text-[11px]">Szybkie testy OEM/VIN:</span>
            <button
              type="button"
              onClick={() => {
                setSearchType("oem");
                setQuery("03G903023");
                handleSearch("03G903023", "oem");
              }}
              className="px-2 py-0.5 rounded bg-[#030712] hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] cursor-pointer"
            >
              03G903023 (Alternator VAG)
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchType("oem");
                setQuery("6Y6945111");
                handleSearch("6Y6945111", "oem");
              }}
              className="px-2 py-0.5 rounded bg-[#030712] hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] cursor-pointer"
            >
              6Y6945111 (Lampa Fabia I)
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchType("oem");
                setQuery("1K0820803S");
                handleSearch("1K0820803S", "oem");
              }}
              className="px-2 py-0.5 rounded bg-[#030712] hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] cursor-pointer"
            >
              1K0820803S (Kompresor Golf V)
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchType("vin");
                setQuery("WVWZZZ1KZ6W000001");
                handleSearch("WVWZZZ1KZ6W000001", "vin");
              }}
              className="px-2 py-0.5 rounded bg-[#030712] hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] cursor-pointer"
            >
              VIN: Golf V 1.9 TDI
            </button>
          </div>

          {/* BŁĄD */}
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* WYNIKI WYSZUKIWANIA */}
          {result && (
            <div className="space-y-4 pt-2 border-t border-slate-800">
              {/* KARTA GŁÓWNA CZĘŚCI */}
              <div className="bg-[#070b14] border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/30 text-[10px] font-mono font-bold">
                        {result.source}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                        {result.primaryBrand}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white">{result.partName}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Kategoria: <strong className="text-slate-200">{result.category}</strong> | Główny OEM:{" "}
                      <strong className="text-amber-400">{result.oemNumber}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {onApplyToFormData && (
                      <button
                        type="button"
                        onClick={handleApplyToScanner}
                        className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl font-mono transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Zastosuj w skanowaniu WMS</span>
                      </button>
                    )}
                    {onAddToWms && (
                      <button
                        type="button"
                        onClick={handleAddDirectlyToWms}
                        className="px-3.5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl font-mono transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Dodaj do Magazynu WMS</span>
                      </button>
                    )}
                  </div>
                </div>

                {result.marketDescription && (
                  <p className="text-xs text-slate-300 leading-relaxed bg-[#030712] p-3 rounded-lg border border-slate-800/80">
                    {result.marketDescription}
                  </p>
                )}
              </div>

              {/* SEKCJA ZAMIENNIKÓW I NUMERÓW ALTERNATYWNYCH */}
              <div className="bg-[#070b14] border border-slate-800 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-400" /> Alternatywne Numery Części i Zamienniki (Cross-References)
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Łącznie: <strong>{result.alternativeOems.length}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
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
                        title="Skopiuj numer"
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

              {/* SEKCJA KOMPATYBILNOŚCI Z POJAZDAMI */}
              <div className="bg-[#070b14] border border-slate-800 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-teal-400" /> Kompatybilność Pojazdów (Fitment Matrix)
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Modele: <strong>{result.compatibilityList.length}</strong>
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-800 rounded-lg">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#030712] text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-2 px-3">Marka i Model</th>
                        <th className="py-2 px-3">Generacja</th>
                        <th className="py-2 px-3">Wersja silnika</th>
                        <th className="py-2 px-3">Roczniki</th>
                        <th className="py-2 px-3">Nadwozie</th>
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
                          <td className="py-2 px-3 text-slate-300">{c.years}</td>
                          <td className="py-2 px-3 text-slate-400">{c.bodyType || "Wszystkie"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PARAMETRY TECHNICZNE */}
              {result.specifications && Object.keys(result.specifications).length > 0 && (
                <div className="bg-[#070b14] border border-slate-800 rounded-xl p-4 space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-amber-400" /> Parametry Techniczne
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(result.specifications).map(([key, val], idx) => (
                      <div key={idx} className="bg-[#030712] p-2 rounded border border-slate-800 text-xs font-mono">
                        <span className="text-slate-400 text-[10px] block">{key}</span>
                        <span className="text-slate-200 font-bold block">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* STOPKA */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-[#070b14] text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Katalog TecDoc / autokey.pl zintegrowany z Cloud SQL i WMS</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition cursor-pointer font-bold"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
