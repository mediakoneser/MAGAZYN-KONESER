import React, { useState, useMemo } from "react";
import {
  Warehouse,
  Download,
  Plus,
  Minus,
  Search,
  Trash2,
  Edit,
  Tag,
  Car,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Filter,
  RefreshCw,
  Cloud,
  CheckCircle2,
  Clock,
  Camera,
  Layers,
  ExternalLink,
  AlertTriangle,
  AlertOctagon,
  Package,
  Bell,
  X,
  QrCode,
  History,
  ArrowRightLeft,
  Scan,
  HardDrive,
  FileText,
} from "lucide-react";
import { PartItem, PartStatus } from "../types";
import { stripHtml } from "../utils/dataSanitizer";
import { deletePartFromFirestore, savePartToFirestore } from "../lib/firestoreService";
import { publishOfferToAllegro } from "../utils/allegroService";
import { smartMatchPart } from "../utils/smartSearch";
import { ensurePartCompleteHistory } from "../utils/partHistoryService";
import { downloadAuctionPdf } from "../utils/auctionPdfGenerator";
import { WarehouseRacksModal } from "./WarehouseRacksModal";
import { PartHistoryModal } from "./PartHistoryModal";
import { WarehouseCardModal } from "./WarehouseCardModal";
import { AllegroSalesCenterEditorModal } from "./AllegroSalesCenterEditorModal";
import { Images, Image as ImageIcon, UploadCloud } from "lucide-react";

interface WarehouseTabProps {
  drafts: PartItem[];
  setDrafts: React.Dispatch<React.SetStateAction<PartItem[]>>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onEditPart: (part: PartItem) => void;
  onNavigateToScanner: () => void;
  onNavigateToWorker?: () => void;
  onExportCsv: () => void;
  onSanitizeDatabase?: () => void;
  onNavigateToGoogleDrive?: () => void;
}

export const WarehouseTab: React.FC<WarehouseTabProps> = ({
  drafts,
  setDrafts,
  searchQuery,
  setSearchQuery,
  onEditPart,
  onNavigateToScanner,
  onNavigateToWorker,
  onExportCsv,
  onSanitizeDatabase,
  onNavigateToGoogleDrive,
}) => {
  const [filterBrand, setFilterBrand] = useState<string>("all");
  const [filterRack, setFilterRack] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAllegro, setFilterAllegro] = useState<string>("all");
  const [filterStock, setFilterStock] = useState<string>("all"); // all | out_of_stock | in_stock | multi_stock
  const [isAlertBannerVisible, setIsAlertBannerVisible] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  // WMS Racks, Part History, Warehouse Card & Allegro Sales Center Modals
  const [isRacksModalOpen, setIsRacksModalOpen] = useState<boolean>(false);
  const [selectedPartForHistory, setSelectedPartForHistory] = useState<PartItem | null>(null);
  const [selectedPartForCardModal, setSelectedPartForCardModal] = useState<PartItem | null>(null);
  const [selectedPartForAllegroEditor, setSelectedPartForAllegroEditor] = useState<PartItem | null>(null);
  const [racksModalInitialCode, setRacksModalInitialCode] = useState<string>("");

  // 1-Click "Wystaw podobną" (Clone to new part in central DB)
  const handleCloneSimilarPart = async (basePart: PartItem) => {
    const newId = `PART-${Date.now().toString(36).toUpperCase()}`;
    const baseRack = basePart.currentRackLocation || basePart.listingData?.ocr_wyniki?.numer_magazynowy || "MAG 14";
    const clonedPart: PartItem = {
      ...basePart,
      id: newId,
      allegroOfferId: undefined,
      allegroOfferUrl: undefined,
      allegroStatus: "draft",
      allegroPublishedAt: undefined,
      currentRackLocation: baseRack,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      historyLogs: [
        {
          id: `hist-${Date.now()}`,
          timestamp: new Date().toISOString(),
          eventType: "ODŁOŻENIE_NA_REGAŁ",
          authorName: "Pracownik WMS",
          details: `Sklonowano parametry z części #${basePart.id} do nowej pozycji w WMS`,
          notes: `Wystaw podobną - utworzono nowy rekord w centralnej bazie`,
        },
      ],
      listingData: {
        ...basePart.listingData,
        ocr_wyniki: {
          ...basePart.listingData.ocr_wyniki,
          numer_magazynowy: baseRack,
        },
        allegro: {
          ...basePart.listingData.allegro,
          offerId: undefined,
          offerUrl: undefined,
          status: "draft",
          signature: baseRack,
        },
      },
    };

    setDrafts((prev) => [clonedPart, ...prev]);
    await savePartToFirestore(clonedPart);
    setSelectedPartForAllegroEditor(clonedPart);
  };

  // Calculate out-of-stock (0 pcs) and total statistics (1 piece is normal stock for car dismantler)
  const { outOfStockDrafts, inStockDrafts, totalPieces } = useMemo(() => {
    let outCount: PartItem[] = [];
    let inCount: PartItem[] = [];
    let pieces = 0;

    for (const d of drafts) {
      const qty = d.listingData?.ilosc ?? d.ilosc ?? 1;
      pieces += Math.max(0, qty);
      if (d.status !== "Zutylizowany" && d.status !== "Sprzedany") {
        if (qty <= 0) {
          outCount.push(d);
        } else {
          inCount.push(d);
        }
      }
    }

    return {
      outOfStockDrafts: outCount,
      inStockDrafts: inCount,
      totalPieces: pieces,
    };
  }, [drafts]);

  // Extract clean list of unique brands
  const brands = useMemo(() => {
    const brandSet = new Set<string>();
    for (const d of drafts) {
      let rawMake = d.listingData?.samochod?.marka || d.listingData?.marka || "";
      const cleanMake = stripHtml(rawMake).trim();
      if (
        cleanMake &&
        cleanMake.length <= 25 &&
        !cleanMake.includes("<") &&
        !cleanMake.includes(">") &&
        !cleanMake.includes(";") &&
        cleanMake !== "-1" &&
        !/^\d+$/.test(cleanMake)
      ) {
        brandSet.add(cleanMake);
      }
    }
    return Array.from(brandSet).sort((a, b) => a.localeCompare(b, "pl"));
  }, [drafts]);

  // Extract clean list of unique warehouse racks (MAG XX)
  const racks = useMemo(() => {
    const rackSet = new Set<string>();
    for (const d of drafts) {
      const r = stripHtml(d.listingData?.ocr_wyniki?.numer_magazynowy || "").trim();
      if (r && r.length <= 15 && !r.includes("<")) {
        rackSet.add(r);
      }
    }
    return Array.from(rackSet).sort((a, b) => a.localeCompare(b, "pl", { numeric: true }));
  }, [drafts]);

  // Filter drafts with Smart Search Engine
  const filteredDrafts = useMemo(() => {
    return drafts.filter((d) => {
      const data = d.listingData || ({} as any);
      const vehicle = data.samochod || {};
      const marka = stripHtml(vehicle.marka || data.marka || "").toLowerCase();
      const regal = stripHtml(data.ocr_wyniki?.numer_magazynowy || "").toLowerCase();
      const status = d.status || "Dostępny";
      const stockQty = data.ilosc ?? d.ilosc ?? 1;

      // Smart multi-token order-independent and diacritic-tolerant search
      const matchesSearch = smartMatchPart(d, searchQuery);

      const matchesBrand =
        filterBrand === "all" ||
        marka === filterBrand.toLowerCase();

      const matchesRack =
        filterRack === "all" ||
        regal === filterRack.toLowerCase();

      const matchesStatus =
        filterStatus === "all" ||
        status === filterStatus;

      const matchesAllegro =
        filterAllegro === "all"
          ? true
          : filterAllegro === "published"
          ? Boolean(d.allegroOfferId || d.listingData?.allegro?.offerId)
          : !d.allegroOfferId && !d.listingData?.allegro?.offerId;

      const matchesStock =
        filterStock === "all"
          ? true
          : filterStock === "out_of_stock"
          ? stockQty <= 0
          : filterStock === "multi_stock"
          ? stockQty >= 2
          : stockQty >= 1;

      return (
        matchesSearch &&
        matchesBrand &&
        matchesRack &&
        matchesStatus &&
        matchesAllegro &&
        matchesStock
      );
    });
  }, [drafts, searchQuery, filterBrand, filterRack, filterStatus, filterAllegro, filterStock]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredDrafts.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredDrafts.length);
  const currentDrafts = filteredDrafts.slice(startIndex, endIndex);

  // Quick Allegro Publication
  const handleQuickPublishAllegro = async (part: PartItem) => {
    setPublishingId(part.id);
    try {
      const res = await publishOfferToAllegro(part);
      if (res.success) {
        const updated: PartItem = {
          ...part,
          allegroOfferId: res.offerId,
          allegroOfferUrl: res.offerUrl,
          allegroStatus: "active",
          allegroPublishedAt: res.publishedAt,
          listingData: {
            ...part.listingData,
            allegro: {
              offerId: res.offerId,
              offerUrl: res.offerUrl,
              status: "active",
              publishedAt: res.publishedAt,
            },
          },
        };
        setDrafts((prev) => prev.map((d) => (d.id === part.id ? updated : d)));
        await savePartToFirestore(updated);
      }
    } catch (e: any) {
      alert("Błąd wystawiania na Allegro: " + (e?.message || "Błąd"));
    } finally {
      setPublishingId(null);
    }
  };

  // Status Change directly from row
  const handleQuickStatusChange = async (partId: string, newStatus: PartStatus) => {
    const target = drafts.find((d) => d.id === partId);
    if (!target) return;
    const updated: PartItem = { ...target, status: newStatus, updatedAt: new Date().toLocaleString("pl-PL") };
    setDrafts((prev) => prev.map((d) => (d.id === partId ? updated : d)));
    await savePartToFirestore(updated);
  };

  // Quick Quantity Stepper (+ / -) directly from row
  const handleQuickQuantityChange = async (partId: string, delta: number) => {
    const target = drafts.find((d) => d.id === partId);
    if (!target) return;
    const currentQty = target.listingData?.ilosc ?? target.ilosc ?? 1;
    const newQty = Math.max(0, currentQty + delta);

    const updated: PartItem = {
      ...target,
      ilosc: newQty,
      listingData: {
        ...target.listingData,
        ilosc: newQty,
      },
      updatedAt: new Date().toLocaleString("pl-PL"),
    };

    setDrafts((prev) => prev.map((d) => (d.id === partId ? updated : d)));
    await savePartToFirestore(updated);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleBrandChange = (val: string) => {
    setFilterBrand(val);
    setCurrentPage(1);
  };

  const handleRackChange = (val: string) => {
    setFilterRack(val);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (val: string) => {
    setFilterStatus(val);
    setCurrentPage(1);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Czy na pewno usunąć tę część z ewidencji magazynu WMS i chmury Firestore?")) {
      setDrafts((prev) => prev.filter((x) => x.id !== id));
      deletePartFromFirestore(id);
    }
  };

  return (
    <div className="bg-[#0b0f19] border border-slate-800/90 rounded-xl p-3 sm:p-4 space-y-3 shadow-xs">
      {/* AUTOMATIC ZERO STOCK ALERT BANNER (ONLY WHEN 0 PCS) */}
      {outOfStockDrafts.length > 0 && isAlertBannerVisible && (
        <div className="bg-gradient-to-r from-rose-950/70 via-rose-900/30 to-[#0b0f19] border border-rose-500/50 rounded-xl p-3 sm:p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40 shrink-0 mt-0.5 relative">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-300 font-mono flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-rose-400" />
                  Alert Magazynowy WMS • Wyprzedane Pozycje
                </span>
                <span className="px-2 py-0.2 bg-rose-400/20 text-rose-300 text-[10px] font-bold rounded-full font-mono border border-rose-400/40">
                  Stan: 0 szt. (Brak)
                </span>
              </div>
              <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                Wykryto <strong className="text-rose-400 font-black">{outOfStockDrafts.length} pozycji</strong> o zerowym stanie magazynowym (0 szt.).
                <span className="text-slate-400 ml-1 text-[11px]">Części z 1 sztuką są w 100% dostępne w magazynie.</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            {filterStock === "out_of_stock" ? (
              <button
                onClick={() => {
                  setFilterStock("all");
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <span>Pokaż wszystkie ({drafts.length})</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setFilterStock("out_of_stock");
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-mono font-black transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Filter className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Pokaż wyprzedane (0 szt.)</span>
              </button>
            )}

            <button
              onClick={() => setIsAlertBannerVisible(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition cursor-pointer"
              title="Ukryj alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* HEADER & CONTROLS */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 font-mono">
              <Warehouse className="w-4 h-4 text-yellow-400" />
              Ewidencja Magazynu WMS (Cloud Firestore)
            </h2>
            <span className="text-xs px-2 py-0.5 bg-yellow-400/15 text-yellow-300 rounded-md border border-yellow-400/30 font-mono font-bold">
              {filteredDrafts.length.toLocaleString("pl-PL")} pozycji ({totalPieces} szt.)
            </span>
            {outOfStockDrafts.length > 0 && (
              <button
                onClick={() => {
                  setFilterStock(filterStock === "out_of_stock" ? "all" : "out_of_stock");
                  setCurrentPage(1);
                }}
                className={`text-xs px-2 py-0.5 rounded-md border font-mono font-bold flex items-center gap-1 transition cursor-pointer ${
                  filterStock === "out_of_stock"
                    ? "bg-rose-600 text-white border-rose-500"
                    : "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border-rose-500/30"
                }`}
                title="Kliknij, aby przefiltrować wyprzedane pozycje (0 szt.)"
              >
                <AlertOctagon className="w-3 h-3 text-rose-400" />
                <span>Brak na stanie: {outOfStockDrafts.length}</span>
              </button>
            )}
            {filteredDrafts.length !== drafts.length && (
              <span className="text-[11px] text-slate-400 font-mono">
                (z {drafts.length.toLocaleString("pl-PL")} łącznie)
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
            PHU U Konesera Grzegorz Kuźma • Mysłakowice, ul. Daszyńskiego 16G
          </p>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* SEARCH INPUT WITH SMART SEARCH */}
          <div className="relative flex-1 sm:flex-initial min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-yellow-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Smart Search (np. szyba citroen, oem)..."
              title="Smart Search: Szukaj słów kluczowych w dowolnej kolejności (np. 'szyba citroen', 'reflektor audi', '03L130277')"
              className="bg-[#030712] border border-slate-800 hover:border-slate-700 pl-8 pr-7 py-1.5 rounded-lg text-xs text-white focus:outline-none focus:border-yellow-400 w-full sm:w-64 transition font-mono shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute right-2 top-2 text-slate-400 hover:text-white p-0.5"
                title="Wyczyść wyszukiwanie"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* STAN MAGAZYNOWY (STOCK FILTER) */}
          <div className="flex items-center gap-1">
            <select
              value={filterStock}
              onChange={(e) => {
                setFilterStock(e.target.value);
                setCurrentPage(1);
              }}
              className={`bg-[#030712] border px-2.5 py-1.5 rounded-lg text-xs font-bold focus:outline-none cursor-pointer font-mono ${
                filterStock === "out_of_stock"
                  ? "border-rose-400 text-rose-400 bg-rose-950/20"
                  : "border-slate-800 text-slate-300 focus:border-yellow-400"
              }`}
            >
              <option value="all">Stan: Wszystkie</option>
              <option value="in_stock">🟢 Dostępne na stanie (≥ 1 szt.)</option>
              <option value="out_of_stock">🔴 Brak na stanie (0 szt.)</option>
              <option value="multi_stock">📦 Wiele sztuk (≥ 2 szt.)</option>
            </select>
          </div>

          {/* ALLEGRO FILTER */}
          <div className="flex items-center gap-1">
            <select
              value={filterAllegro}
              onChange={(e) => {
                setFilterAllegro(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#030712] border border-yellow-400/40 px-2.5 py-1.5 rounded-lg text-xs text-yellow-400 font-bold focus:outline-none focus:border-yellow-400 cursor-pointer font-mono"
            >
              <option value="all">Allegro (Wszystkie)</option>
              <option value="published">Wystawione na Allegro</option>
              <option value="drafts">Szkice niewystawione</option>
            </select>
          </div>

          {/* STATUS FILTER */}
          <div className="flex items-center gap-1">
            <select
              value={filterStatus}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="bg-[#030712] border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs text-yellow-400 font-bold focus:outline-none focus:border-yellow-400 cursor-pointer font-mono"
            >
              <option value="all">Wszystkie statusy</option>
              <option value="Dostępny">Dostępny</option>
              <option value="Zarezerwowany">Zarezerwowany</option>
              <option value="Sprzedany">Sprzedany</option>
              <option value="W przygotowaniu">W przygotowaniu</option>
              <option value="Zutylizowany">Zutylizowany</option>
            </select>
          </div>

          {/* BRAND FILTER */}
          <div className="flex items-center gap-1">
            <select
              value={filterBrand}
              onChange={(e) => handleBrandChange(e.target.value)}
              className="bg-[#030712] border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-yellow-400 cursor-pointer font-mono max-w-[130px]"
            >
              <option value="all">Wszystkie marki ({brands.length})</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* RACK FILTER */}
          {racks.length > 0 && (
            <div className="flex items-center gap-1">
              <select
                value={filterRack}
                onChange={(e) => handleRackChange(e.target.value)}
                className="bg-[#030712] border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-yellow-400 cursor-pointer font-mono max-w-[110px]"
              >
                <option value="all">Regały ({racks.length})</option>
                {racks.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* WMS RACKS & QR SCANNER BUTTON */}
          <button
            onClick={() => {
              setRacksModalInitialCode("");
              setIsRacksModalOpen(true);
            }}
            className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black rounded-lg whitespace-nowrap cursor-pointer transition shadow-md shadow-yellow-500/20 flex items-center gap-1.5 font-mono"
            title="Otwórz widok regałów magazynowych, skanera QR/Barcode i relokacji"
          >
            <QrCode className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Regały & Kody QR (WMS)</span>
          </button>

          {/* CSV EXPORT */}
          <button
            onClick={onExportCsv}
            className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition font-mono"
            title="Eksportuj bazę do pliku CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>CSV</span>
          </button>

          {/* GOOGLE DRIVE SYNC & BACKUP */}
          {onNavigateToGoogleDrive && (
            <button
              onClick={onNavigateToGoogleDrive}
              className="px-2.5 py-1.5 bg-yellow-400/10 border border-yellow-400/30 hover:bg-yellow-400/20 text-yellow-400 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition font-mono"
              title="Kopia zapasowa i archiwum w Google Drive"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Dysk Google</span>
            </button>
          )}

          {/* WORKER PHOTO STATION */}
          {onNavigateToWorker && (
            <button
              onClick={onNavigateToWorker}
              className="px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black rounded-lg whitespace-nowrap cursor-pointer transition shadow-xs flex items-center gap-1.5 font-mono"
            >
              <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Stanowisko Foto AI</span>
            </button>
          )}
        </div>
      </div>

      {/* TABLE OF PARTS */}
      <div className="overflow-x-auto rounded-lg border border-slate-800/80">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider font-mono bg-[#070b14]">
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Zdjęcia (WMS)</th>
              <th className="py-2.5 px-3">Regał WMS</th>
              <th className="py-2.5 px-3">Stan (Ilość)</th>
              <th className="py-2.5 px-3">Kategoria części / Opis</th>
              <th className="py-2.5 px-3">Pojazd (Marka & Model)</th>
              <th className="py-2.5 px-3">Numery OEM</th>
              <th className="py-2.5 px-3">Cena Brutto</th>
              <th className="py-2.5 px-3">Allegro</th>
              <th className="py-2.5 px-3">Pracownik</th>
              <th className="py-2.5 px-3 text-right">Akcje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {currentDrafts.length > 0 ? (
              currentDrafts.map((d) => {
                const vehicle = d.listingData?.samochod || {
                  marka: d.listingData?.marka || "Uniwersalna",
                  model: d.listingData?.model || "",
                  rocznik: d.listingData?.rocznik || "",
                };
                const cleanMarka = stripHtml(vehicle.marka) || "Uniwersalna";
                const cleanModel = stripHtml(vehicle.model);
                const cleanKat = stripHtml(d.listingData?.kategoria) || "Część samochodowa";
                const cleanOem = stripHtml(d.listingData?.numery_czesci);
                const rack = stripHtml(d.listingData?.ocr_wyniki?.numer_magazynowy) || "MAG 14";
                const worker = d.createdByName || d.listingData?.workerName || "Grzegorz";
                const qty = d.listingData?.ilosc ?? d.ilosc ?? 1;
                const partPhotos = d.listingData?.zdjecia || [];

                return (
                  <tr
                    key={d.id}
                    className="hover:bg-slate-900/60 transition-colors group"
                  >
                    {/* STATUS DROPDOWN */}
                    <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                      <select
                        value={d.status || "Dostępny"}
                        onChange={(e) => handleQuickStatusChange(d.id, e.target.value as PartStatus)}
                        className={`text-[11px] font-bold px-2 py-0.5 rounded border focus:outline-none cursor-pointer ${
                          d.status === "Dostępny"
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : d.status === "Zarezerwowany"
                            ? "bg-yellow-400/15 text-yellow-300 border-yellow-400/30"
                            : d.status === "Sprzedany"
                            ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
                            : d.status === "W przygotowaniu"
                            ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                            : "bg-slate-900 text-slate-400 border-slate-700"
                        }`}
                      >
                        <option value="Dostępny" className="bg-[#0b0f19] text-emerald-400">Dostępny</option>
                        <option value="Zarezerwowany" className="bg-[#0b0f19] text-yellow-300">Zarezerwowany</option>
                        <option value="Sprzedany" className="bg-[#0b0f19] text-blue-300">Sprzedany</option>
                        <option value="W przygotowaniu" className="bg-[#0b0f19] text-purple-300">W przygotowaniu</option>
                        <option value="Zutylizowany" className="bg-[#0b0f19] text-slate-400">Zutylizowany</option>
                      </select>
                    </td>

                    {/* ZDJĘCIA / GALERIA MINIATURKA */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedPartForCardModal(d)}
                        className="flex items-center gap-1.5 p-1 bg-[#030712] hover:bg-slate-800/80 rounded-lg border border-slate-800 hover:border-yellow-400/50 transition cursor-pointer group/photo"
                        title={`Otwórz Kartę Magazynową i Galerię (${partPhotos.length} zdjęć) / Wgraj nowe zdjęcia`}
                      >
                        {partPhotos.length > 0 ? (
                          <div className="relative w-8 h-8 rounded overflow-hidden bg-black shrink-0 border border-slate-700">
                            <img
                              src={partPhotos[0]}
                              alt="Miniaturka"
                              className="w-full h-full object-cover group-hover/photo:scale-110 transition-transform duration-200"
                            />
                            {partPhotos.length > 1 && (
                              <div className="absolute bottom-0 right-0 bg-yellow-400 text-slate-950 font-mono font-bold text-[8px] px-1 rounded-tl">
                                +{partPhotos.length - 1}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        )}
                        <div className="text-left hidden sm:block">
                          <span className="text-[10px] font-mono font-bold text-yellow-400 block flex items-center gap-0.5">
                            <Images className="w-2.5 h-2.5" /> {partPhotos.length} {partPhotos.length === 1 ? "foto" : "zdjęć"}
                          </span>
                          <span className="text-[9px] text-slate-400 hover:text-white font-mono block">
                            + Dodaj foto
                          </span>
                        </div>
                      </button>
                    </td>

                    {/* REGAŁ WMS */}
                    <td className="py-2.5 px-3 font-mono text-yellow-400 font-bold whitespace-nowrap">
                      <button
                        onClick={() => {
                          setRacksModalInitialCode(rack);
                          setIsRacksModalOpen(true);
                        }}
                        className="px-2 py-0.5 bg-yellow-400/10 hover:bg-yellow-400/20 rounded border border-yellow-400/25 flex items-center gap-1 w-fit text-[11px] cursor-pointer transition"
                        title={`Kliknij, aby otworzyć wszystkie części na regale ${rack}`}
                      >
                        <Tag className="w-3 h-3 text-yellow-400 shrink-0" />
                        <span>{rack}</span>
                      </button>
                    </td>

                    {/* STAN MAGAZYNOWY & STATUS DOSTĘPNOŚCI + STEPPER */}
                    <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {qty <= 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-600/60 shadow-xs">
                            <AlertOctagon className="w-3 h-3 text-rose-400 shrink-0" />
                            <span>0 szt. (Brak)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <Package className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>{qty} szt.</span>
                          </span>
                        )}

                        {/* SZYBKA ZMIANA ILOŚCI (+ / -) */}
                        <div className="flex items-center bg-[#030712] border border-slate-800 rounded px-0.5 py-0.5 gap-0.5">
                          <button
                            onClick={() => handleQuickQuantityChange(d.id, -1)}
                            disabled={qty <= 0}
                            className="w-4 h-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 rounded flex items-center justify-center text-[10px] font-bold cursor-pointer transition"
                            title="Zmniejsz stan o 1 sztukę"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="text-[10px] text-slate-300 font-bold px-1 min-w-[14px] text-center">
                            {qty}
                          </span>
                          <button
                            onClick={() => handleQuickQuantityChange(d.id, 1)}
                            className="w-4 h-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center justify-center text-[10px] font-bold cursor-pointer transition"
                            title="Zwiększ stan o 1 sztukę"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* KATEGORIA CZĘŚCI */}
                    <td className="py-2.5 px-3 max-w-[260px]">
                      <div className="font-bold text-white leading-snug line-clamp-2">
                        {cleanKat}
                      </div>
                      {d.listingData?.pozycja_czesci && (
                        <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                          {stripHtml(d.listingData.pozycja_czesci)}
                        </span>
                      )}
                    </td>

                    {/* POJAZD */}
                    <td className="py-2.5 px-3 text-slate-300 max-w-[190px]">
                      <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                        <Car className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        <span className="truncate">
                          {cleanMarka} {cleanModel}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1 mt-0.5">
                        {d.vehicleInternalNo && (
                          <span className="text-[9px] font-mono px-1 py-0.2 bg-yellow-400/15 text-yellow-300 border border-yellow-400/30 rounded font-bold">
                            {d.vehicleInternalNo}
                          </span>
                        )}
                        {vehicle.rocznik && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            {stripHtml(vehicle.rocznik)}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* NUMERY OEM */}
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      {cleanOem ? (
                        <span className="bg-[#030712] px-1.5 py-0.5 rounded border border-slate-800 text-[11px] inline-block font-mono">
                          {cleanOem}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    {/* CENA BRUTTO */}
                    <td className="py-2.5 px-3 font-black text-emerald-400 font-mono text-xs sm:text-sm whitespace-nowrap">
                      {d.listingData?.cena?.brutto || 0} PLN
                    </td>

                    {/* ALLEGRO STATUS & LINK */}
                    <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                      {d.allegroOfferId || d.listingData?.allegro?.offerId ? (
                        <a
                          href={
                            d.allegroOfferUrl ||
                            d.listingData?.allegro?.offerUrl ||
                            `https://allegro.pl/oferta/${d.allegroOfferId || d.listingData?.allegro?.offerId}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-0.5 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 rounded text-[10px] font-bold flex items-center gap-1 w-fit transition shadow-xs"
                          title="Otwórz aukcję na Allegro"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>#{d.allegroOfferId || d.listingData?.allegro?.offerId}</span>
                          <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-80" />
                        </a>
                      ) : (
                        <button
                          onClick={() => handleQuickPublishAllegro(d)}
                          disabled={publishingId === d.id}
                          className="px-2 py-0.5 bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/30 text-yellow-300 hover:text-yellow-200 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
                          title="Wystaw aukcję z tego szkicu na Allegro"
                        >
                          {publishingId === d.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin text-yellow-400" />
                          ) : (
                            <Layers className="w-3 h-3 text-yellow-400" />
                          )}
                          <span>Wystaw Allegro</span>
                        </button>
                      )}
                    </td>

                    {/* PRACOWNIK */}
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      <span className="truncate max-w-[110px] block">{worker}</span>
                    </td>

                    {/* AKCJE */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {/* DRIVE PDF LINK */}
                        {(d.drivePdfUrl || d.listingData?.drivePdfUrl) && (
                          <a
                            href={d.drivePdfUrl || d.listingData?.drivePdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/35 text-blue-300 rounded transition cursor-pointer"
                            title={`Otwórz szablon aukcji PDF zapisany na Dysku Google (${d.driveFolder || "/Parts/Inventory/..."})`}
                          >
                            <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                          </a>
                        )}

                        {/* DOWNLOAD AUCTION PDF */}
                        <button
                          onClick={() => downloadAuctionPdf(d)}
                          className="p-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-300 hover:text-amber-200 rounded transition cursor-pointer"
                          title="Pobierz szablon aukcji w PDF (A4)"
                        >
                          <FileText className="w-3.5 h-3.5 text-amber-400" />
                        </button>

                        <button
                          onClick={() => setSelectedPartForCardModal(d)}
                          className="px-2 py-1 bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/35 text-teal-300 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer font-mono shadow-xs"
                          title="Otwórz pełną Kartę Magazynową WMS ze zdjęciami, parametrami technicznymi i historią"
                        >
                          <Images className="w-3 h-3 text-teal-400" />
                          <span>Karta WMS</span>
                        </button>
                        <button
                          onClick={() => setSelectedPartForHistory(ensurePartCompleteHistory(d))}
                          className="px-2 py-1 bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/30 text-yellow-300 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer font-mono"
                          title="Zobacz pełną historię części (z jakiego auta, kto zdemontował, kiedy wystawiono, rezerwacje, sprzedaż) oraz kody QR i relokację"
                        >
                          <History className="w-3 h-3 text-yellow-400" />
                          <span>Historia & QR</span>
                        </button>
                        <button
                          onClick={() => onEditPart(d)}
                          className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer font-mono"
                          title="Edytuj kartę w skanerze"
                        >
                          <Edit className="w-3 h-3 text-yellow-400" />
                          <span>Edytuj</span>
                        </button>
                        <button
                          onClick={() => handleDelete(d.id)}
                          className="px-2 py-1 bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer border border-red-900/40 font-mono"
                          title="Usuń z magazynu i chmury Firestore"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Usuń</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={10} className="text-center py-12 text-slate-500">
                  <Warehouse className="w-8 h-8 mx-auto text-slate-700 mb-2" />
                  <p className="font-semibold text-slate-400 text-xs">
                    Brak części spełniających kryteria wyszukiwania
                  </p>
                  <p className="text-[11px] mt-1 text-slate-600 font-mono">
                    Zmień frazę w wyszukiwarce lub wybierz inny status/markę.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION BAR */}
      {filteredDrafts.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <span>
              Wyświetlono <strong className="text-white">{startIndex + 1}</strong>–
              <strong className="text-white">{endIndex}</strong> z{" "}
              <strong className="text-yellow-400">{filteredDrafts.length.toLocaleString("pl-PL")}</strong> pozycji
            </span>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1">
              <span>Na stronę:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-[#030712] border border-slate-800 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:border-yellow-400"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage <= 1}
              className="px-2.5 py-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 rounded disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Poprzednia</span>
            </button>

            <span className="px-2.5 py-1 bg-[#030712] border border-slate-800 rounded text-slate-300 font-bold">
              {safeCurrentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage >= totalPages}
              className="px-2.5 py-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 rounded disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer transition"
            >
              <span>Następna</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* WMS RACKS & QR MODAL */}
      {isRacksModalOpen && (
        <WarehouseRacksModal
          isOpen={isRacksModalOpen}
          onClose={() => setIsRacksModalOpen(false)}
          parts={drafts}
          initialScannedCode={racksModalInitialCode}
          onUpdatePart={async (updatedPart) => {
            setDrafts((prev) => prev.map((p) => (p.id === updatedPart.id ? updatedPart : p)));
            await savePartToFirestore(updatedPart);
          }}
          onSelectPartForEdit={(p) => {
            setIsRacksModalOpen(false);
            onEditPart(p);
          }}
        />
      )}

      {/* PART HISTORY & QR MODAL */}
      {selectedPartForHistory && (
        <PartHistoryModal
          isOpen={Boolean(selectedPartForHistory)}
          part={selectedPartForHistory}
          onClose={() => setSelectedPartForHistory(null)}
          onUpdatePart={async (updatedPart) => {
            setDrafts((prev) => prev.map((p) => (p.id === updatedPart.id ? updatedPart : p)));
            setSelectedPartForHistory(updatedPart);
            await savePartToFirestore(updatedPart);
          }}
        />
      )}

      {/* WMS WAREHOUSE CARD & MULTI-IMAGE GALLERY MODAL */}
      {selectedPartForCardModal && (
        <WarehouseCardModal
          isOpen={Boolean(selectedPartForCardModal)}
          part={selectedPartForCardModal}
          onClose={() => setSelectedPartForCardModal(null)}
          onUpdatePart={async (updatedPart) => {
            setDrafts((prev) => prev.map((p) => (p.id === updatedPart.id ? updatedPart : p)));
            setSelectedPartForCardModal(updatedPart);
            await savePartToFirestore(updatedPart);
          }}
          onOpenAllegroEditor={(part) => {
            setSelectedPartForAllegroEditor(part);
          }}
        />
      )}

      {/* ALLEGRO SALES CENTER 1-KLIK EDITOR MODAL */}
      {selectedPartForAllegroEditor && (
        <AllegroSalesCenterEditorModal
          isOpen={Boolean(selectedPartForAllegroEditor)}
          part={selectedPartForAllegroEditor}
          onClose={() => setSelectedPartForAllegroEditor(null)}
          onSavePart={async (updatedPart) => {
            setDrafts((prev) => prev.map((p) => (p.id === updatedPart.id ? updatedPart : p)));
            await savePartToFirestore(updatedPart);
          }}
          onCloneSimilarPart={handleCloneSimilarPart}
        />
      )}
    </div>
  );
};
