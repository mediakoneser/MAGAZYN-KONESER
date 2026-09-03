import React, { useState, useEffect } from "react";
import {
  GitCompare,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Search,
  ExternalLink,
  ChevronDown,
  Layers,
  ArrowRight,
  TrendingUp,
  Box,
  Sliders,
  Sparkles,
  DollarSign,
  Package,
} from "lucide-react";
import { MarketplaceComparisonItem } from "../types/marketplaceTypes";

interface CompareMarketplacesViewProps {
  onOpenProductEditor?: (sku: string) => void;
  onSelectProduct?: (sku: string) => void;
  onOpenAllegroDiagnostics?: (offerId?: string) => void;
}

const FALLBACK_COMPARISONS: MarketplaceComparisonItem[] = [
  {
    sku: "MAG-ALT-01",
    hasDiscrepancies: false,
    discrepancies: [],
    master: {
      title: "Alternator Denso 14V 120A Toyota Avensis T27 2.0 D-4D",
      price: 280,
      stock: 1,
      category: "Alternatory (Układ elektryczny)",
      status: "ACTIVE",
    },
    allegro: {
      offerId: "1749281923",
      price: 280,
      stock: 1,
      category: "50849 (Alternatory)",
      status: "ACTIVE",
    },
    ovoko: {
      productId: "ovk_8849201",
      priceEur: 65,
      pricePln: 280,
      stock: 1,
      category: "ovk_cat_alternators",
      status: "ACTIVE",
    },
    baselinker: {
      productId: "bl_981245",
      inventoryId: "inv_default",
      price: 280,
      stock: 1,
      category: "Magazyn Główny > Elektryka",
      status: "ACTIVE",
    },
    shopgold: {
      productId: "sg_5091",
      price: 280,
      stock: 1,
      category: "Alternatory",
      status: "ACTIVE",
    },
  },
  {
    sku: "MAG-KOMP-04",
    hasDiscrepancies: true,
    discrepancies: ["Różnica ceny w Allegro: 369 PLN (Master: 350 PLN, +19 PLN narzut prowizyjny)"],
    master: {
      title: "Kompresor klimatyzacji Sanden 5N0820803A VW Passat B6 2.0 TDI",
      price: 350,
      stock: 1,
      category: "Kompresory klimatyzacji",
      status: "ACTIVE",
    },
    allegro: {
      offerId: "1749281924",
      price: 369,
      stock: 1,
      category: "50860 (Sprężarki)",
      status: "ACTIVE",
    },
    ovoko: {
      productId: "ovk_8849202",
      priceEur: 82,
      pricePln: 350,
      stock: 1,
      category: "ovk_cat_ac_compressors",
      status: "ACTIVE",
    },
    baselinker: {
      productId: "bl_981249",
      inventoryId: "inv_default",
      price: 350,
      stock: 1,
      category: "Klimatyzacja",
      status: "ACTIVE",
    },
    shopgold: {
      productId: "sg_5099",
      price: 350,
      stock: 1,
      category: "Klimatyzacja",
      status: "ACTIVE",
    },
  },
];

export const CompareMarketplacesView: React.FC<CompareMarketplacesViewProps> = ({
  onOpenProductEditor,
  onSelectProduct,
  onOpenAllegroDiagnostics,
}) => {
  const handleOpenEditor = (sku: string) => {
    if (onSelectProduct) onSelectProduct(sku);
    else if (onOpenProductEditor) onOpenProductEditor(sku);
  };
  const [comparisons, setComparisons] = useState<MarketplaceComparisonItem[]>(FALLBACK_COMPARISONS);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyDiscrepancies, setOnlyDiscrepancies] = useState(false);
  const [selectedSku, setSelectedSku] = useState<string | null>(null);

  const fetchComparisons = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/marketplaces/compare-all");
      if (!res.ok) {
        console.warn(`Compare all returned status: ${res.status}`);
        return;
      }
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.warn("Compare all returned non-JSON response");
        return;
      }
      const data = await res.json();
      if (data?.success && Array.isArray(data.comparisons)) {
        const normalized: MarketplaceComparisonItem[] = data.comparisons.map((c: any) => ({
          sku: String(c.sku || c.masterSku || c.id || "MAG-SKU"),
          hasDiscrepancies: Boolean(c.hasDiscrepancies),
          discrepancies: Array.isArray(c.discrepancies)
            ? c.discrepancies
            : Array.isArray(c.discrepancyList)
            ? c.discrepancyList
            : [],
          master: {
            title: String(c.master?.title || c.channels?.master?.title || "Produkt bez nazwy"),
            price: Number(c.master?.price ?? c.channels?.master?.price ?? 0),
            stock: Number(c.master?.stock ?? c.channels?.master?.stock ?? 0),
            category: String(c.master?.category || c.channels?.master?.category || "Części samochodowe"),
            status: String(c.master?.status || c.channels?.master?.status || "ACTIVE"),
          },
          allegro: {
            offerId: c.allegro?.offerId || c.channels?.allegro?.id || c.allegro?.id,
            price: c.allegro?.price ?? c.channels?.allegro?.price,
            stock: c.allegro?.stock ?? c.channels?.allegro?.stock,
            category: c.allegro?.category || c.channels?.allegro?.category,
            status: c.allegro?.status || c.channels?.allegro?.status,
          },
          ovoko: {
            productId: c.ovoko?.productId || c.channels?.ovoko?.id || c.ovoko?.id,
            priceEur: c.ovoko?.priceEur ?? c.channels?.ovoko?.price,
            pricePln: c.ovoko?.pricePln ?? (c.channels?.ovoko?.price ? Math.round(c.channels?.ovoko?.price * 4.3) : undefined),
            stock: c.ovoko?.stock ?? c.channels?.ovoko?.stock,
            category: c.ovoko?.category || c.channels?.ovoko?.category,
            status: c.ovoko?.status || c.channels?.ovoko?.status,
          },
          baselinker: {
            productId: c.baselinker?.productId || c.channels?.baselinker?.id,
            inventoryId: c.baselinker?.inventoryId || "inv_default",
            price: c.baselinker?.price ?? c.channels?.baselinker?.price,
            stock: c.baselinker?.stock ?? c.channels?.baselinker?.stock,
            category: c.baselinker?.category || c.channels?.baselinker?.category,
            status: c.baselinker?.status || c.channels?.baselinker?.status,
          },
          shopgold: {
            productId: c.shopgold?.productId || c.channels?.shopgold?.id,
            categoryId: c.shopgold?.categoryId,
            price: c.shopgold?.price ?? c.channels?.shopgold?.price,
            stock: c.shopgold?.stock ?? c.channels?.shopgold?.stock,
            category: c.shopgold?.category || c.channels?.shopgold?.category,
            status: c.shopgold?.status || c.channels?.shopgold?.status,
          },
        }));
        setComparisons(normalized);
      }
    } catch (e) {
      console.warn("Recovered marketplace comparisons fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparisons();
  }, []);

  const filtered = comparisons.filter((c) => {
    if (!c) return false;
    if (onlyDiscrepancies && !c.hasDiscrepancies) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const skuStr = (c.sku || "").toLowerCase();
      const titleStr = (c.master?.title || "").toLowerCase();
      const matchSku = skuStr.includes(q);
      const matchName = titleStr.includes(q);
      if (!matchSku && !matchName) return false;
    }
    return true;
  });

  const selectedItem = comparisons.find((c) => c?.sku === selectedSku) || comparisons[0];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-xs font-bold tracking-wider uppercase bg-purple-100 text-purple-800 rounded-md">
                OMNICHANNEL SYNC MATRIX
              </span>
              <span className="px-2.5 py-1 text-xs font-bold tracking-wider uppercase bg-slate-100 text-slate-700 rounded-md">
                COMPARE MARKETPLACES
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-2">
              Porównywarka Cen, Stanów i Kategorii między Kanałami
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              Bezpośrednie zestawienie danych między magazynem centralnym (<strong>MASTER</strong>) a kanałami
              sprzedaży (<strong>ALLEGRO</strong>, <strong>OVOKO</strong>, <strong>BASELINKER</strong>,{" "}
              <strong>SHOPGOLD</strong>). Narzędzie automatycznie wychwytuje rozbieżności w cenach, brak synchronizacji
              stanów magazynowych oraz odmienne kategorie.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchComparisons}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-medium rounded-lg transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Przelicz porównanie
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Szukaj po SKU lub tytule..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs w-64"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyDiscrepancies}
                onChange={(e) => setOnlyDiscrepancies(e.target.checked)}
                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="font-semibold text-purple-900">
                Tylko pozycje z rozbieżnościami (ceny/stany/kategorie)
              </span>
            </label>
          </div>

          <div className="text-xs text-slate-500">
            Wyświetlam <strong>{filtered.length}</strong> z {comparisons.length} produktów
          </div>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 gap-6">
        {filtered.map((item) => (
          <div
            key={item.sku}
            className={`bg-white border rounded-xl shadow-sm overflow-hidden transition ${
              item.hasDiscrepancies ? "border-amber-300" : "border-slate-200"
            }`}
          >
            {/* Item Card Header */}
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-200 text-slate-800 rounded">
                    SKU: {item.sku || "BRAK-SKU"}
                  </span>
                  {item.hasDiscrepancies ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      {(item.discrepancies || []).length} Rozbieżności
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      100% Zgodność Stanów i Cen
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-slate-900 text-sm mt-1">{item.master?.title || "Produkt bez nazwy"}</h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {(onOpenProductEditor || onSelectProduct) && (
                  <button
                    onClick={() => handleOpenEditor(item.sku)}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition cursor-pointer"
                  >
                    Edytor 7 Zakładek
                  </button>
                )}
                {item.allegro?.offerId && onOpenAllegroDiagnostics && (
                  <button
                    onClick={() => onOpenAllegroDiagnostics(item.allegro?.offerId)}
                    className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-800 text-xs font-semibold rounded-lg border border-orange-200 transition"
                  >
                    Diagnostyka Allegro
                  </button>
                )}
              </div>
            </div>

            {/* Channels Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Kanał / Marketplace</th>
                    <th className="py-2.5 px-4">Dedykowany ID</th>
                    <th className="py-2.5 px-4">Cena</th>
                    <th className="py-2.5 px-4">Stan Magazynowy</th>
                    <th className="py-2.5 px-4">Kategoria</th>
                    <th className="py-2.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* MASTER ROW */}
                  <tr className="bg-slate-50/40 font-medium">
                    <td className="py-3 px-4 flex items-center gap-1.5">
                      <Box className="w-4 h-4 text-slate-600" />
                      <strong className="text-slate-900">1. MASTER (WMS)</strong>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">sku: {item.sku}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{item.master?.price ?? 0} PLN</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-slate-200 rounded font-bold">{item.master?.stock ?? 0} szt.</span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{item.master?.category || "-"}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded font-semibold text-[11px]">
                        {item.master?.status || "ACTIVE"}
                      </span>
                    </td>
                  </tr>

                  {/* ALLEGRO ROW */}
                  <tr className="hover:bg-orange-50/30 transition">
                    <td className="py-3 px-4 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-orange-500" />
                      <span className="font-semibold text-orange-950">2. ALLEGRO</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {item.allegro?.offerId ? (
                        <div>
                          <span className="text-slate-400">offerId:</span>{" "}
                          <strong className="text-orange-700">#{item.allegro.offerId}</strong>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Brak offerId</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {item.allegro?.price !== undefined ? (
                        <span
                          className={`font-bold ${
                            item.allegro?.price !== item.master?.price ? "text-amber-700 bg-amber-50 px-1 py-0.5 rounded" : "text-slate-900"
                          }`}
                        >
                          {item.allegro.price} PLN
                          {item.allegro.price !== item.master?.price && (
                            <span className="text-[10px] text-amber-600 block font-normal">(marża Allegro)</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {item.allegro?.stock !== undefined ? (
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            item.allegro.stock !== item.master?.stock
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {item.allegro.stock} szt.
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{item.allegro?.category || "-"}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                          item.allegro?.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {item.allegro?.status || "BRAK"}
                      </span>
                    </td>
                  </tr>

                  {/* OVOKO ROW */}
                  <tr className="hover:bg-sky-50/30 transition">
                    <td className="py-3 px-4 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-500" />
                      <span className="font-semibold text-sky-950">3. OVOKO</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {item.ovoko?.productId ? (
                        <div>
                          <span className="text-slate-400">ovokoProductId:</span>{" "}
                          <strong className="text-sky-700">{item.ovoko.productId}</strong>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Brak ovokoId</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {item.ovoko?.priceEur !== undefined ? (
                        <span className="font-bold text-sky-800">
                          {item.ovoko.priceEur} EUR
                          <span className="text-[10px] text-slate-500 block font-normal font-mono">
                            (~{Math.round(item.ovoko.priceEur * 4.3)} PLN)
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {item.ovoko?.stock !== undefined ? (
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            item.ovoko.stock !== item.master?.stock
                              ? "bg-rose-100 text-rose-800"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {item.ovoko.stock} szt.
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{item.ovoko?.category || "-"}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[11px]">
                        {item.ovoko?.status || "BRAK"}
                      </span>
                    </td>
                  </tr>

                  {/* BASELINKER ROW */}
                  <tr className="hover:bg-blue-50/30 transition">
                    <td className="py-3 px-4 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="font-semibold text-blue-950">4. BASELINKER</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {item.baselinker?.productId ? (
                        <div>
                          <span className="text-slate-400">blProductId:</span>{" "}
                          <strong className="text-blue-700">#{item.baselinker.productId}</strong>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Brak blId</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {item.baselinker?.price !== undefined ? `${item.baselinker.price} PLN` : "-"}
                    </td>
                    <td className="py-3 px-4">
                      {item.baselinker?.stock !== undefined ? (
                        <span className="px-2 py-0.5 bg-slate-100 rounded font-bold text-slate-800">
                          {item.baselinker.stock} szt.
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{item.baselinker?.category || "-"}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[11px]">
                        {item.baselinker?.status || "BRAK"}
                      </span>
                    </td>
                  </tr>

                  {/* SHOPGOLD ROW */}
                  <tr className="hover:bg-amber-50/30 transition">
                    <td className="py-3 px-4 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="font-semibold text-amber-950">5. SHOPGOLD</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {item.shopgold?.productId ? (
                        <div>
                          <span className="text-slate-400">sgProductId:</span>{" "}
                          <strong className="text-amber-700">#{item.shopgold.productId}</strong>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Brak sgId</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {item.shopgold?.price !== undefined ? `${item.shopgold.price} PLN` : "-"}
                    </td>
                    <td className="py-3 px-4">
                      {item.shopgold?.stock !== undefined ? (
                        <span className="px-2 py-0.5 bg-slate-100 rounded font-bold text-slate-800">
                          {item.shopgold.stock} szt.
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{item.shopgold?.category || "-"}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[11px]">
                        {item.shopgold?.status || "BRAK"}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Discrepancies Footer if any */}
            {(item.discrepancies || []).length > 0 && (
              <div className="p-3 bg-amber-50/70 border-t border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Wykryte rozbieżności w kanałach:</strong>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(item.discrepancies || []).map((disc, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-white border border-amber-300 rounded font-medium">
                        {disc}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-sm">
            Nie znaleziono produktów spełniających podane kryteria wyszukiwania.
          </div>
        )}
      </div>
    </div>
  );
};
