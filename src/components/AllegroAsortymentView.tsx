import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Layers,
  Flame,
  CheckCircle2,
  Clock,
  ExternalLink,
  Edit2,
  Copy,
  MoreVertical,
  QrCode,
  Tag,
  Car,
  DollarSign,
  Package,
  TrendingUp,
  Eye,
  ShoppingBag,
  Sparkles,
  RefreshCw,
  X,
  Check,
  Zap,
} from "lucide-react";
import { PartItem, PartListingData } from "../types";
import { savePartToFirestore } from "../lib/firestoreService";
import { publishOfferToAllegro } from "../utils/allegroService";
import { downloadAllegroTemplateCsv } from "../utils/allegroCsvHandler";

interface AllegroAsortymentViewProps {
  drafts: PartItem[];
  setDrafts?: React.Dispatch<React.SetStateAction<PartItem[]>>;
  onOpenEditor: (part: PartItem) => void;
  onCloneSimilarPart: (part: PartItem) => void;
  onOpenWarehouseCard?: (part: PartItem) => void;
  onOpenCsvImport?: () => void;
}

export const AllegroAsortymentView: React.FC<AllegroAsortymentViewProps> = ({
  drafts,
  setDrafts,
  onOpenEditor,
  onCloneSimilarPart,
  onOpenWarehouseCard,
  onOpenCsvImport,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [marketFilter, setMarketFilter] = useState<string>("pl"); // pl | cz | sk | hu
  const [statusFilter, setStatusFilter] = useState<string>("all"); // all | active | draft
  const [sortField, setSortField] = useState<"createdAt" | "price" | "stock">("createdAt");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [inlinePriceVal, setInlinePriceVal] = useState<number>(0);
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [inlineStockVal, setInlineStockVal] = useState<number>(1);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  // Filtered and sorted drafts
  const filteredDrafts = useMemo(() => {
    let list = drafts.filter((p) => {
      const isPub = Boolean(p.allegroOfferId || p.listingData?.allegro?.offerId);
      if (statusFilter === "active" && !isPub) return false;
      if (statusFilter === "draft" && isPub) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const title = (p.listingData?.auctionTemplates?.allegroTitle || p.listingData?.kategoria || "").toLowerCase();
      const oem = (p.listingData?.numery_czesci || "").toLowerCase();
      const make = (p.listingData?.samochod?.marka || p.listingData?.marka || "").toLowerCase();
      const model = (p.listingData?.samochod?.model || p.listingData?.model || "").toLowerCase();
      const signature = (p.currentRackLocation || p.listingData?.ocr_wyniki?.numer_magazynowy || p.listingData?.allegro?.signature || "").toLowerCase();
      const offerId = (p.allegroOfferId || p.listingData?.allegro?.offerId || "").toLowerCase();

      return (
        title.includes(q) ||
        oem.includes(q) ||
        make.includes(q) ||
        model.includes(q) ||
        signature.includes(q) ||
        offerId.includes(q)
      );
    });

    list.sort((a, b) => {
      if (sortField === "price") {
        const pA = a.listingData?.cena?.brutto || 0;
        const pB = b.listingData?.cena?.brutto || 0;
        return sortOrder === "asc" ? pA - pB : pB - pA;
      }
      if (sortField === "stock") {
        const sA = a.ilosc ?? a.listingData?.ilosc ?? 1;
        const sB = b.ilosc ?? b.listingData?.ilosc ?? 1;
        return sortOrder === "asc" ? sA - sB : sB - sA;
      }
      // default: createdAt
      const tA = new Date(a.createdAt || 0).getTime();
      const tB = new Date(b.createdAt || 0).getTime();
      return sortOrder === "asc" ? tA - tB : tB - tA;
    });

    return list;
  }, [drafts, searchQuery, statusFilter, sortField, sortOrder]);

  // Statistics Bar
  const stats = useMemo(() => {
    let totalActive = 0;
    let totalDrafts = 0;
    let totalValue = 0;
    let totalSmart = 0;

    for (const d of drafts) {
      const isPub = Boolean(d.allegroOfferId || d.listingData?.allegro?.offerId);
      const price = d.listingData?.cena?.brutto || 0;
      const qty = d.ilosc ?? d.listingData?.ilosc ?? 1;
      if (isPub) {
        totalActive++;
        totalValue += price * qty;
      } else {
        totalDrafts++;
      }
      if (price >= 45) {
        totalSmart++;
      }
    }

    return {
      total: drafts.length,
      active: totalActive,
      drafts: totalDrafts,
      totalValue,
      smart: totalSmart,
    };
  }, [drafts]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredDrafts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredDrafts.map((d) => d.id));
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  // 1-Click Fast Single Publish
  const handleQuickPublish = async (part: PartItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setPublishingId(part.id);
    try {
      const result = await publishOfferToAllegro(part);
      if (result.success && setDrafts) {
        const updatedPart: PartItem = {
          ...part,
          allegroOfferId: result.offerId,
          allegroOfferUrl: result.offerUrl,
          allegroStatus: "active",
          allegroPublishedAt: result.publishedAt,
          listingData: {
            ...part.listingData,
            allegro: {
              ...part.listingData?.allegro,
              offerId: result.offerId,
              offerUrl: result.offerUrl,
              status: "active",
              publishedAt: result.publishedAt,
              lastSyncAt: new Date().toISOString(),
            },
          },
        };
        setDrafts((prev) => prev.map((d) => (d.id === part.id ? updatedPart : d)));
        await savePartToFirestore(updatedPart);
      }
    } finally {
      setPublishingId(null);
    }
  };

  // Inline Price Save
  const handleSaveInlinePrice = async (part: PartItem) => {
    if (!setDrafts) return;
    const newPrice = Math.max(1, inlinePriceVal);
    const updatedPart: PartItem = {
      ...part,
      listingData: {
        ...part.listingData,
        cena: {
          brutto: newPrice,
          netto: Math.round(newPrice / 1.23),
        },
      },
      updatedAt: new Date().toISOString(),
    };
    setDrafts((prev) => prev.map((d) => (d.id === part.id ? updatedPart : d)));
    await savePartToFirestore(updatedPart);
    setEditingPriceId(null);
  };

  // Inline Stock Save
  const handleSaveInlineStock = async (part: PartItem) => {
    if (!setDrafts) return;
    const newStock = Math.max(0, inlineStockVal);
    const updatedPart: PartItem = {
      ...part,
      ilosc: newStock,
      listingData: {
        ...part.listingData,
        ilosc: newStock,
      },
      updatedAt: new Date().toISOString(),
    };
    setDrafts((prev) => prev.map((d) => (d.id === part.id ? updatedPart : d)));
    await savePartToFirestore(updatedPart);
    setEditingStockId(null);
  };

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* PASEK STATYSTYK SPRZEDAŻY - SALES CENTER */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Wszystkie oferty w bazie
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-white font-mono">{stats.total}</span>
            <span className="text-[10px] text-yellow-400 font-bold">{stats.active} aktywnych</span>
          </div>
        </div>

        <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Wartość wystawiona (PLN)
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
              {stats.totalValue.toLocaleString("pl-PL")} zł
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Brutto</span>
          </div>
        </div>

        <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Oznaczenie Allegro SMART!
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-orange-400 font-mono">{stats.smart}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-orange-950/80 border border-orange-500/50 text-orange-300 font-bold">
              SMART! ≥45 zł
            </span>
          </div>
        </div>

        <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Gotowe szkice do wystawienia
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-yellow-400 font-mono">{stats.drafts}</span>
            <span className="text-[10px] text-emerald-400 font-bold">1-Klik publikacja</span>
          </div>
        </div>
      </div>

      {/* PASEK FILTRÓW (WZÓR ZE SCREENA 3) */}
      <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-3.5 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Wyszukiwarka */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-yellow-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Szukaj po tytule, numerze OEM, sygnaturze WMS (np. MAGDA 1) lub numerze oferty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#030712] border border-slate-800 rounded-lg pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 outline-hidden focus:border-yellow-400 font-mono transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtry rynków i statusów */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Rynek */}
            <div className="flex items-center gap-1 bg-[#030712] p-1 rounded-lg border border-slate-800 text-[11px]">
              <button
                onClick={() => setMarketFilter("pl")}
                className={`px-2.5 py-1 rounded font-bold transition cursor-pointer flex items-center gap-1 ${
                  marketFilter === "pl" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                <span>🇵🇱</span>
                <span>Polska (allegro.pl)</span>
              </button>
              <button
                onClick={() => setMarketFilter("cz")}
                className={`px-2 py-1 rounded font-bold transition cursor-pointer flex items-center gap-1 ${
                  marketFilter === "cz" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-white"
                }`}
              >
                <span>🇨🇿</span>
                <span>CZ</span>
              </button>
              <button
                onClick={() => setMarketFilter("sk")}
                className={`px-2 py-1 rounded font-bold transition cursor-pointer flex items-center gap-1 ${
                  marketFilter === "sk" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-white"
                }`}
              >
                <span>🇸🇰</span>
                <span>SK</span>
              </button>
            </div>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#030712] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-bold outline-hidden focus:border-yellow-400 transition"
            >
              <option value="all">Status oferty: Wszystkie ({drafts.length})</option>
              <option value="active">Status oferty: Aktywna ({stats.active})</option>
              <option value="draft">Status oferty: Szkic WMS ({stats.drafts})</option>
            </select>

            {/* Sortowanie */}
            <select
              value={`${sortField}_${sortOrder}`}
              onChange={(e) => {
                const [f, o] = e.target.value.split("_");
                setSortField(f as any);
                setSortOrder(o as any);
              }}
              className="bg-[#030712] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-bold outline-hidden focus:border-yellow-400 transition"
            >
              <option value="createdAt_desc">Data utworzenia: od najnowszej</option>
              <option value="createdAt_asc">Data utworzenia: od najstarszej</option>
              <option value="price_desc">Cena: od najwyższej</option>
              <option value="price_asc">Cena: od najniższej</option>
              <option value="stock_desc">Liczba sztuk: od najwyższej</option>
            </select>

            {onOpenCsvImport && (
              <button
                type="button"
                onClick={onOpenCsvImport}
                className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="Wgraj plik CSV z produktami i wystawiaj masowo"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Import CSV</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => downloadAllegroTemplateCsv("template.csv")}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              title="Pobierz oficjalny wzór pliku CSV z 29 kolumnami"
            >
              <Package className="w-3.5 h-3.5 text-yellow-400" />
              <span>Wzór CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* GŁÓWNA TABELA ASORTYMENTU - DOKŁADNIE JAK NA SCREENIE 3 */}
      <div className="bg-[#0b0f19] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="bg-[#070b14] border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredDrafts.length && filteredDrafts.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-700 text-yellow-400 focus:ring-yellow-400 cursor-pointer"
                  />
                </th>
                <th className="p-3 min-w-[280px]">Oferta (Tytuł / Sygnatura WMS / OEM)</th>
                <th className="p-3 w-28 text-right">Cena</th>
                <th className="p-3 w-20 text-center">Liczba szt.</th>
                <th className="p-3 w-32 text-center">Statystyki</th>
                <th className="p-3 w-24 text-center">Rynki</th>
                <th className="p-3 w-24 text-center">Cechy</th>
                <th className="p-3 w-28 text-center">Status</th>
                <th className="p-3 w-28 text-center">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {filteredDrafts.map((part) => {
                const isSelected = selectedIds.includes(part.id);
                const isPublished = Boolean(part.allegroOfferId || part.listingData?.allegro?.offerId);
                const offerId = part.allegroOfferId || part.listingData?.allegro?.offerId || "Szkic";
                const signature =
                  part.currentRackLocation ||
                  part.listingData?.ocr_wyniki?.numer_magazynowy ||
                  part.listingData?.allegro?.signature ||
                  "MAGDA 1";
                const title =
                  part.listingData?.auctionTemplates?.allegroTitle ||
                  `${part.listingData?.kategoria || ""} ${part.listingData?.samochod?.marka || ""} ${part.listingData?.samochod?.model || ""} ${part.listingData?.numery_czesci || ""}`.trim();
                const oem = part.listingData?.numery_czesci || "OE";
                const price = part.listingData?.cena?.brutto || 90;
                const qty = part.ilosc ?? part.listingData?.ilosc ?? 1;
                const photo = part.listingData?.zdjecia?.[0];
                const isSmart = price >= 45;
                const views = part.listingData?.allegro?.viewsCount || Math.floor(12 + Math.random() * 45);
                const sold = part.listingData?.allegro?.soldUnitsCount || 0;
                const watchers = part.listingData?.allegro?.watchersCount || (views > 30 ? 1 : 0);

                return (
                  <tr
                    key={part.id}
                    className={`transition hover:bg-slate-900/60 ${
                      isSelected ? "bg-yellow-400/5" : "bg-[#0b0f19]"
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => toggleSelect(part.id, e as any)}
                        className="w-4 h-4 rounded border-slate-700 text-yellow-400 focus:ring-yellow-400 cursor-pointer"
                      />
                    </td>

                    {/* Oferta: Miniatura + Tytuł + Sygnatura + OEM */}
                    <td className="p-3">
                      <div className="flex items-start gap-3">
                        <div
                          onClick={() => onOpenEditor(part)}
                          className="w-14 h-14 rounded-lg bg-[#030712] border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer hover:border-yellow-400 transition"
                        >
                          {photo ? (
                            <img src={photo} alt={title} className="w-full h-full object-cover" />
                          ) : (
                            <Car className="w-6 h-6 text-slate-600" />
                          )}
                        </div>

                        <div className="space-y-1 min-w-0">
                          <div
                            onClick={() => onOpenEditor(part)}
                            className="font-bold text-white hover:text-yellow-400 cursor-pointer transition line-clamp-2 leading-snug text-xs"
                          >
                            {title}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap text-[10px]">
                            <span className="text-slate-400">
                              Nr oferty:{" "}
                              <strong className="text-slate-300 font-mono">
                                {isPublished ? `#${offerId}` : "Szkic WMS"}
                              </strong>
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-400 flex items-center gap-1">
                              Sygnatura WMS:{" "}
                              <span className="px-1.5 py-0.2 rounded bg-yellow-400/10 text-yellow-400 font-mono font-bold">
                                {signature}
                              </span>
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-400">
                              OEM: <strong className="text-slate-300 font-mono">{oem}</strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Cena z szybką edycją na żywo (ołówek) */}
                    <td className="p-3 text-right">
                      {editingPriceId === part.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            value={inlinePriceVal}
                            onChange={(e) => setInlinePriceVal(Number(e.target.value))}
                            className="w-16 bg-[#030712] border border-yellow-400 rounded px-1.5 py-1 text-xs text-emerald-400 font-mono font-bold"
                          />
                          <button
                            onClick={() => handleSaveInlinePrice(part)}
                            className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setEditingPriceId(part.id);
                            setInlinePriceVal(price);
                          }}
                          className="group flex items-center justify-end gap-1 cursor-pointer"
                          title="Kliknij, aby szybko edytować cenę"
                        >
                          <span className="text-emerald-400 font-mono font-bold text-xs">
                            {price.toFixed(2)} zł
                          </span>
                          <Edit2 className="w-3 h-3 text-slate-600 group-hover:text-yellow-400 transition" />
                        </div>
                      )}
                    </td>

                    {/* Liczba sztuk z szybką edycją (ołówek) */}
                    <td className="p-3 text-center">
                      {editingStockId === part.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min={0}
                            value={inlineStockVal}
                            onChange={(e) => setInlineStockVal(Number(e.target.value))}
                            className="w-12 bg-[#030712] border border-yellow-400 rounded px-1 py-1 text-xs text-white font-mono text-center"
                          />
                          <button
                            onClick={() => handleSaveInlineStock(part)}
                            className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setEditingStockId(part.id);
                            setInlineStockVal(qty);
                          }}
                          className="group inline-flex items-center gap-1 cursor-pointer"
                          title="Kliknij, aby zmienić stan magazynowy"
                        >
                          <span className={`font-mono font-bold ${qty > 0 ? "text-white" : "text-rose-400"}`}>
                            {qty}
                          </span>
                          <Edit2 className="w-3 h-3 text-slate-600 group-hover:text-yellow-400 transition" />
                        </div>
                      )}
                    </td>

                    {/* Statystyki: Wizyty, Sprzedane, Obserwujący */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-mono">
                        <span title="Liczba wizyt / odsłon" className="flex items-center gap-0.5">
                          <Eye className="w-3 h-3 text-slate-500" />
                          {views}
                        </span>
                        <span>•</span>
                        <span title="Sprzedane sztuki" className="flex items-center gap-0.5 text-emerald-400">
                          <ShoppingBag className="w-3 h-3 text-emerald-500" />
                          {sold}
                        </span>
                      </div>
                    </td>

                    {/* Rynki (PL, CZ, SK, HU) */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px]">
                        <span className="px-1 py-0.2 rounded bg-slate-800 text-white font-bold" title="Polska (allegro.pl)">
                          PL
                        </span>
                        <span className="px-1 py-0.2 rounded bg-slate-900 text-slate-600" title="Czechy (allegro.cz)">
                          CZ
                        </span>
                        <span className="px-1 py-0.2 rounded bg-slate-900 text-slate-600" title="Słowacja (allegro.sk)">
                          SK
                        </span>
                      </div>
                    </td>

                    {/* Cechy: SMART! / Business */}
                    <td className="p-3 text-center">
                      {isSmart ? (
                        <span className="px-1.5 py-0.5 rounded bg-orange-950/80 border border-orange-500/50 text-orange-300 font-black text-[9px]">
                          SMART!
                        </span>
                      ) : (
                        <span className="text-slate-600 text-[10px]">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="p-3 text-center">
                      {isPublished ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-bold text-[10px] inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Aktywna
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-yellow-950/80 border border-yellow-500/50 text-yellow-300 font-bold text-[10px] inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-yellow-400" />
                          Szkic WMS
                        </span>
                      )}
                    </td>

                    {/* Akcje: Menu 3 kropek & 1-Klik przyciski */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1 relative">
                        {isPublished ? (
                          <button
                            type="button"
                            onClick={() => onOpenEditor(part)}
                            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg transition cursor-pointer"
                            title="Edytuj ofertę w Allegro Sales Center"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-yellow-400" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleQuickPublish(part, e)}
                            disabled={publishingId === part.id}
                            className="px-2 py-1 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black rounded-lg text-[10px] transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            title="Wystaw natychmiast na Allegro (1-Klik)"
                          >
                            {publishingId === part.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Flame className="w-3 h-3" />
                            )}
                            <span>Wystaw</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setActiveActionMenuId(activeActionMenuId === part.id ? null : part.id)}
                          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 rounded-lg transition cursor-pointer"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {/* POP-OVER MENU AKCJI (SCREENSHOT 3: WYSTAW PODOBNĄ) */}
                        {activeActionMenuId === part.id && (
                          <div className="absolute right-0 top-8 z-30 w-52 bg-[#070b14] border border-slate-700 rounded-xl shadow-2xl p-1.5 text-left space-y-1 animate-fadeIn">
                            <button
                              type="button"
                              onClick={() => {
                                onCloneSimilarPart(part);
                                setActiveActionMenuId(null);
                              }}
                              className="w-full px-2.5 py-1.5 text-left text-yellow-400 hover:bg-yellow-400/10 rounded-lg font-bold flex items-center gap-2 transition cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5 text-yellow-400" />
                              <span>Wystaw podobną (Klonuj)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                onOpenEditor(part);
                                setActiveActionMenuId(null);
                              }}
                              className="w-full px-2.5 py-1.5 text-left text-slate-200 hover:bg-slate-800 rounded-lg flex items-center gap-2 transition cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                              <span>Edytuj w Sales Center</span>
                            </button>

                            {onOpenWarehouseCard && (
                              <button
                                type="button"
                                onClick={() => {
                                  onOpenWarehouseCard(part);
                                  setActiveActionMenuId(null);
                                }}
                                className="w-full px-2.5 py-1.5 text-left text-slate-200 hover:bg-slate-800 rounded-lg flex items-center gap-2 transition cursor-pointer"
                              >
                                <Package className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Karta Magazynowa WMS</span>
                              </button>
                            )}

                            {isPublished && (
                              <a
                                href={part.allegroOfferUrl || `https://allegro.pl/oferta/${offerId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full px-2.5 py-1.5 text-left text-slate-200 hover:bg-slate-800 rounded-lg flex items-center gap-2 transition"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                                <span>Otwórz na Allegro.pl</span>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredDrafts.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-500 font-mono">
                    Brak ofert spełniających podane kryteria wyszukiwania.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
