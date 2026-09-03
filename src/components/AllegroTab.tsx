import React, { useState, useMemo } from "react";
import {
  Layers,
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  Send,
  Copy,
  Check,
  FileCode,
  Sparkles,
  Car,
  Tag,
  Settings,
  AlertCircle,
  Clock,
  ArrowRight,
  Eye,
  CheckSquare,
  Square,
  Search,
  Building,
  Truck,
  Smartphone,
  Flame,
  X,
  Sliders,
  Store,
  Zap,
  Package,
  Box,
  Globe,
  Activity,
} from "lucide-react";
import { PartItem, PartListingData, AllegroConfig } from "../types";
import { generateAuctionTemplates } from "../utils/auctionGenerator";
import {
  getStoredAllegroConfig,
  saveStoredAllegroConfig,
  publishOfferToAllegro,
  testAllegroApiConnection,
  getAllegroCategoryForPart,
} from "../utils/allegroService";
import { AllegroSettingsModal } from "./AllegroSettingsModal";
import { AllegroSalesCenterEditorModal } from "./AllegroSalesCenterEditorModal";
import { AllegroAsortymentView } from "./AllegroAsortymentView";
import { AllegroMultiPlatformEditor } from "./AllegroMultiPlatformEditor";
import { AllegroCsvImportModal } from "./AllegroCsvImportModal";
import { IntegrationCenterTab } from "./IntegrationCenterTab";
import { AllegroIntegrationDashboard } from "./AllegroIntegrationDashboard";
import { AllegroDiagnosticsView } from "./AllegroDiagnosticsView";
import { OvokoIntegrationTab } from "./OvokoIntegrationTab";
import { CompareMarketplacesView } from "./CompareMarketplacesView";
import { CentralProductEditorModal } from "./CentralProductEditorModal";
import { CanonicalProduct } from "../types/canonicalProduct";
import { savePartToFirestore } from "../lib/firestoreService";
import { smartMatchPart } from "../utils/smartSearch";
import { exportPartsToAllegroCsv, downloadAllegroTemplateCsv } from "../utils/allegroCsvHandler";

interface AllegroTabProps {
  drafts: PartItem[];
  setDrafts?: React.Dispatch<React.SetStateAction<PartItem[]>>;
  onOpenWarehouseCard?: (part: PartItem) => void;
}

export const AllegroTab: React.FC<AllegroTabProps> = ({
  drafts,
  setDrafts,
  onOpenWarehouseCard,
}) => {
  const [allegroConfig, setAllegroConfig] = useState<AllegroConfig>(() => getStoredAllegroConfig());
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [mainViewMode, setMainViewMode] = useState<
    | "dashboard"
    | "allegro_diagnostics"
    | "ovoko"
    | "compare_marketplaces"
    | "integration_center"
    | "asortyment"
    | "editor"
    | "multichannel"
    | "settings"
  >("dashboard");

  // Central Product Editor state (7 tabs)
  const [isCentralEditorOpen, setIsCentralEditorOpen] = useState(false);
  const [centralEditorProduct, setCentralEditorProduct] = useState<CanonicalProduct | null>(null);

  const convertPartToCanonical = (part: PartItem): CanonicalProduct => {
    return {
      id: part.id,
      sku: part.listingData?.ocr_wyniki?.numer_magazynowy || part.id,
      gtin: part.listingData?.allegro?.ean || (part.listingData as any)?.ean || "",
      mpn: part.listingData?.numery_czesci || "",
      name: part.listingData?.kategoria || "Część samochodowa",
      brand: part.listingData?.samochod?.marka || part.listingData?.marka || "OEM",
      category_name: part.listingData?.kategoria || "Części samochodowe",
      category_id: part.listingData?.allegro?.categoryId || "50849",
      price_gross: part.listingData?.cena?.brutto || 100,
      price_net: part.listingData?.cena?.netto || 81.3,
      vat_rate: 23,
      stock: part.listingData?.ilosc || 1,
      description_raw: part.listingData?.opis || "",
      description_html: part.listingData?.opis || "",
      images: part.listingData?.zdjecia || [],
      parameters: {
        marka: part.listingData?.samochod?.marka || part.listingData?.marka || "",
        model: part.listingData?.samochod?.model || part.listingData?.model || "",
        rocznik: part.listingData?.samochod?.rocznik || part.listingData?.rocznik || "",
      },
      status: part.status === "Dostępny" ? "ready" : "archived",
      marketplace_status: {
        allegro: {
          offerId: part.allegroOfferId || part.listingData?.allegro?.offerId,
          offer_id: part.allegroOfferId || part.listingData?.allegro?.offerId,
          productId: part.listingData?.allegro?.categoryId,
          operationId: `op_${part.id}`,
          externalId: part.listingData?.ocr_wyniki?.numer_magazynowy || part.id,
          sku: part.listingData?.ocr_wyniki?.numer_magazynowy || part.id,
          lifecycleStatus: part.allegroStatus === "active" ? "VERIFIED" : "CREATED",
          status: part.allegroStatus === "active" ? "active" : "draft",
          offer_url: part.allegroOfferUrl || part.listingData?.allegro?.offerUrl,
          last_sync: part.allegroPublishedAt || part.listingData?.allegro?.publishedAt,
        },
        ovoko: {
          productId: `ovk_${part.id.toLowerCase()}`,
          ovokoProductId: `ovk_${part.id.toLowerCase()}`,
          priceEur: Math.round(((part.listingData?.cena?.brutto || 100) / 4.3) * 1.15),
          pricePln: part.listingData?.cena?.brutto || 100,
          status: "synced",
        },
        baselinker: {
          productId: `bl_${part.id}`,
          inventoryId: "inv_default",
          status: "synced",
        },
        shopgold: {
          productId: `sg_${part.id}`,
          categoryId: "cat_18",
          status: "synced",
        },
      },
      created_at: part.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  };

  const handleOpenCentralEditorBySku = (sku: string) => {
    const found = drafts.find(
      (d) => d.id === sku || d.listingData?.ocr_wyniki?.numer_magazynowy === sku
    );
    if (found) {
      setCentralEditorProduct(convertPartToCanonical(found));
    } else {
      // Create a skeleton canonical product for this SKU
      setCentralEditorProduct({
        id: sku,
        sku: sku,
        gtin: "",
        mpn: "",
        name: `Część magazynowa ${sku}`,
        brand: "OEM",
        category_name: "Części samochodowe",
        category_id: "50849",
        price_gross: 250,
        price_net: 203.25,
        vat_rate: 23,
        stock: 1,
        description_raw: "",
        description_html: "",
        images: [],
        parameters: {},
        status: "ready",
        marketplace_status: {
          allegro: {
            offerId: "1749281923",
            sku: sku,
            externalId: sku,
            lifecycleStatus: "VERIFIED",
            status: "active",
          },
          ovoko: {
            productId: `ovk_${sku.toLowerCase()}`,
            priceEur: 67,
            status: "synced",
          },
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    setIsCentralEditorOpen(true);
  };

  // Selected part for editor / preview
  const [selectedPartId, setSelectedPartId] = useState<string>(drafts[0]?.id || "");
  const [isEditorModalOpen, setIsEditorModalOpen] = useState<boolean>(false);
  const [editorModalPart, setEditorModalPart] = useState<PartItem | null>(null);
  const [isCsvImportModalOpen, setIsCsvImportModalOpen] = useState<boolean>(false);

  const handleExportCsv = () => {
    const partsToExport = selectedIds.length > 0
      ? drafts.filter((d) => selectedIds.includes(d.id))
      : drafts;
    const csvContent = exportPartsToAllegroCsv(partsToExport);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `allegro_asortyment_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "drafts_only" | "published_only">("all");

  // Publishing states
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishFeedback, setPublishFeedback] = useState<{
    success?: boolean;
    message?: string;
    offerId?: string;
    offerUrl?: string;
    publishedAt?: string;
  } | null>(null);

  // Bulk selection states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkPublishing, setIsBulkPublishing] = useState<boolean>(false);
  const [bulkProgress, setBulkProgress] = useState<string>("");

  // Sub-tabs in preview pane
  const [previewSubTab, setPreviewSubTab] = useState<"mockup" | "html" | "json" | "parameters">("mockup");

  const selectedPart = useMemo(() => {
    return drafts.find((d) => d.id === selectedPartId) || drafts[0] || null;
  }, [drafts, selectedPartId]);

  const currentTemplate = useMemo(() => {
    return selectedPart ? generateAuctionTemplates(selectedPart.listingData) : null;
  }, [selectedPart]);

  const currentAllegroCategory = useMemo(() => {
    if (!selectedPart) return { id: "50849", name: "Motoryzacja > Części samochodowe" };
    return getAllegroCategoryForPart(
      selectedPart.listingData.kategoria,
      selectedPart.listingData.samochod?.marka || selectedPart.listingData.marka
    );
  }, [selectedPart]);

  // Filter drafts with Smart Search Engine
  const filteredDrafts = useMemo(() => {
    return drafts.filter((d) => {
      const matchesQuery = smartMatchPart(d, searchQuery);
      const isPublished = Boolean(d.allegroOfferId || d.listingData?.allegro?.offerId);
      if (statusFilter === "drafts_only") return matchesQuery && !isPublished;
      if (statusFilter === "published_only") return matchesQuery && isPublished;
      return matchesQuery;
    });
  }, [drafts, searchQuery, statusFilter]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Open Full Sales Center Modal
  const handleOpenEditor = (part: PartItem) => {
    setEditorModalPart(part);
    setIsEditorModalOpen(true);
  };

  // 1-Click "Wystaw podobną" (Clone to new unique part in central DB)
  const handleCloneSimilarPart = async (basePart: PartItem) => {
    const newId = `PART-${Date.now().toString(36).toUpperCase()}`;
    const baseRack = basePart.currentRackLocation || basePart.listingData.ocr_wyniki?.numer_magazynowy || "MAG 14";
    const clonedListingData: PartListingData = {
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
      auctionTemplates: undefined, // will auto-generate
    };

    const newClonedPart: PartItem = {
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
          details: `Sklonowano parametry z części #${basePart.id} (Wystaw podobną)`,
          notes: `Utworzono nowy rekord w centralnej bazie danych WMS`,
        },
      ],
      listingData: clonedListingData,
    };

    if (setDrafts) {
      setDrafts((prev) => [newClonedPart, ...prev]);
    }
    await savePartToFirestore(newClonedPart);

    // Immediately open editor for the new part
    setEditorModalPart(newClonedPart);
    setIsEditorModalOpen(true);
  };

  // Save part from editor modal to central state & Firestore
  const handleSavePartFromModal = async (updatedPart: PartItem) => {
    if (setDrafts) {
      setDrafts((prev) => prev.map((d) => (d.id === updatedPart.id ? updatedPart : d)));
    }
    await savePartToFirestore(updatedPart);
  };

  // 1-Click Publish from Main Tab
  const handlePublishCurrentPart = async (targetPart?: PartItem) => {
    const partToPublish = targetPart || selectedPart;
    if (!partToPublish) return;

    setIsPublishing(true);
    setPublishFeedback(null);

    try {
      const result = await publishOfferToAllegro(partToPublish, allegroConfig);

      if (result.success) {
        const updatedPart: PartItem = {
          ...partToPublish,
          allegroOfferId: result.offerId,
          allegroOfferUrl: result.offerUrl,
          allegroStatus: "active",
          allegroPublishedAt: result.publishedAt,
          listingData: {
            ...partToPublish.listingData,
            allegro: {
              ...partToPublish.listingData.allegro,
              offerId: result.offerId,
              offerUrl: result.offerUrl,
              status: "active",
              publishedAt: result.publishedAt,
              lastSyncAt: new Date().toISOString(),
            },
          },
        };

        if (setDrafts) {
          setDrafts((prev) => prev.map((d) => (d.id === partToPublish.id ? updatedPart : d)));
        }
        await savePartToFirestore(updatedPart);

        setPublishFeedback({
          success: true,
          message: `Oferta wystawiona na Allegro (#${result.offerId})`,
          offerId: result.offerId,
          offerUrl: result.offerUrl,
          publishedAt: result.publishedAt,
        });
      } else {
        setPublishFeedback({
          success: false,
          message: result.message || "Błąd wystawiania oferty na Allegro. Sprawdź parametry.",
        });
      }
    } catch (err: any) {
      setPublishFeedback({
        success: false,
        message: `Błąd połączenia: ${err?.message || "Nieznany błąd"}`,
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Bulk Publish Handler
  const handleBulkPublish = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkPublishing(true);
    setBulkProgress(`Przygotowywanie ${selectedIds.length} ofert...`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < selectedIds.length; i++) {
      const id = selectedIds[i];
      const part = drafts.find((d) => d.id === id);
      if (!part) continue;

      setBulkProgress(`Wystawianie [${i + 1}/${selectedIds.length}]: ${part.listingData.kategoria}...`);

      try {
        const result = await publishOfferToAllegro(part, allegroConfig);
        if (result.success) {
          successCount++;
          const updatedPart: PartItem = {
            ...part,
            allegroOfferId: result.offerId,
            allegroOfferUrl: result.offerUrl,
            allegroStatus: "active",
            allegroPublishedAt: result.publishedAt,
            listingData: {
              ...part.listingData,
              allegro: {
                ...part.listingData.allegro,
                offerId: result.offerId,
                offerUrl: result.offerUrl,
                status: "active",
                publishedAt: result.publishedAt,
                lastSyncAt: new Date().toISOString(),
              },
            },
          };
          if (setDrafts) {
            setDrafts((prev) => prev.map((d) => (d.id === part.id ? updatedPart : d)));
          }
          await savePartToFirestore(updatedPart);
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setIsBulkPublishing(false);
    setSelectedIds([]);
    setBulkProgress("");
    setPublishFeedback({
      success: failCount === 0,
      message: `Zakończono masowe wystawianie: ${successCount} pomyślnie, ${failCount} błędów.`,
    });
  };

  const isSelectedPublished = Boolean(
    selectedPart?.allegroOfferId || selectedPart?.listingData?.allegro?.offerId
  );
  const activeOfferId =
    selectedPart?.allegroOfferId || selectedPart?.listingData?.allegro?.offerId;
  const activeOfferUrl =
    selectedPart?.allegroOfferUrl ||
    selectedPart?.listingData?.allegro?.offerUrl ||
    (activeOfferId ? `https://allegro.pl/oferta/${activeOfferId}` : undefined);

  return (
    <div className="space-y-4 max-w-7xl mx-auto font-sans text-xs">
      {/* GŁÓWNY HEADER ZAKŁADKI ALLEGRO */}
      <div className="bg-[#0b0f19] border border-yellow-400/40 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center font-black shadow-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white font-mono">
                  Allegro Sales Center & Generator Aukcji 1-Klik
                </h1>
                <span className="px-2 py-0.5 rounded bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 font-mono font-bold text-[10px]">
                  Centralna Baza WMS
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Wystawiaj, edytuj i klonuj oferty bezpośrednio z jednego rekordu magazynowego • Pełna zgodność z GPSR UE 2023/988
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsCsvImportModalOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-slate-950" />
              <span>Importuj produkty (Plik CSV)</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="Pobierz aktualny asortyment jako plik Allegro CSV (29 kolumn)"
            >
              <FileCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>Eksportuj do CSV</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (selectedPart) {
                  setCentralEditorProduct(convertPartToCanonical(selectedPart));
                } else if (drafts[0]) {
                  setCentralEditorProduct(convertPartToCanonical(drafts[0]));
                }
                setIsCentralEditorOpen(true);
              }}
              className="px-3.5 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-black rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer"
              title="Otwórz centralny edytor z 7 zakładkami: MASTER, ALLEGRO, OVOKO, BASELINKER, SHOPGOLD, HISTORY, API LOGS"
            >
              <Box className="w-3.5 h-3.5 text-white" />
              <span>Centralny Edytor (7 Zakładek)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-yellow-400" />
              <span>Cenniki i REST API</span>
            </button>

            {selectedPart && (
              <button
                type="button"
                onClick={() => handleOpenEditor(selectedPart)}
                className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 font-black rounded-xl transition flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                <span>Otwórz Formularz Wystawiania</span>
              </button>
            )}
          </div>
        </div>

        {/* PRZEŁĄCZNIK GŁÓWNYCH WIDOKÓW */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
          <div className="flex flex-wrap items-center gap-1 bg-[#030712] p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setMainViewMode("dashboard")}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                mainViewMode === "dashboard"
                  ? "bg-yellow-400 text-slate-950 font-black shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>Statusy Połączeń</span>
            </button>

            <button
              onClick={() => setMainViewMode("allegro_diagnostics")}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                mainViewMode === "allegro_diagnostics"
                  ? "bg-orange-500 text-white font-black shadow-sm"
                  : "text-orange-400 hover:text-orange-300"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>ALLEGRO → DIAGNOSTICS</span>
            </button>

            <button
              onClick={() => setMainViewMode("ovoko")}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                mainViewMode === "ovoko"
                  ? "bg-sky-500 text-white font-black shadow-sm"
                  : "text-sky-400 hover:text-sky-300"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>OVOKO INTEGRATION</span>
            </button>

            <button
              onClick={() => setMainViewMode("compare_marketplaces")}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                mainViewMode === "compare_marketplaces"
                  ? "bg-purple-600 text-white font-black shadow-sm"
                  : "text-purple-400 hover:text-purple-300"
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>COMPARE MARKETPLACES</span>
            </button>

            <button
              onClick={() => setMainViewMode("asortyment")}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                mainViewMode === "asortyment"
                  ? "bg-yellow-400 text-slate-950 font-black"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Mój Asortyment</span>
            </button>

            <button
              onClick={() => setMainViewMode("integration_center")}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                mainViewMode === "integration_center"
                  ? "bg-yellow-400 text-slate-950 font-black shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-orange-500" />
              <span>Centrum Integracji</span>
            </button>

            <button
              onClick={() => setMainViewMode("editor")}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                mainViewMode === "editor"
                  ? "bg-yellow-400 text-slate-950 font-black"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Szablony Aukcji</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <span>Stacja Kasacji:</span>
            <strong className="text-white">PHU U Konesera (Mysłakowice)</strong>
          </div>
        </div>
      </div>

      {/* FEEDBACK STATUSU */}
      {publishFeedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
            publishFeedback.success
              ? "bg-emerald-950/50 border-emerald-500/50 text-emerald-300"
              : "bg-rose-950/50 border-rose-500/50 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {publishFeedback.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="font-bold">{publishFeedback.message}</span>
          </div>
          {publishFeedback.offerUrl && (
            <a
              href={publishFeedback.offerUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1 transition"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Otwórz na Allegro</span>
            </a>
          )}
        </div>
      )}

      {/* WIDOK 0: STATUSY POŁĄCZEŃ & OAUTH TOKEN VAULT */}
      {mainViewMode === "dashboard" && (
        <AllegroIntegrationDashboard />
      )}

      {/* WIDOK: ALLEGRO DIAGNOSTICS (7-ETAPOWY CYKL ŻYCIA, [VERIFY OFFER], AUDYT) */}
      {mainViewMode === "allegro_diagnostics" && (
        <AllegroDiagnosticsView onOpenCentralEditor={(sku) => handleOpenCentralEditorBySku(sku)} />
      )}

      {/* WIDOK: OVOKO INTEGRATION (8 PODMODUŁÓW: CONNECTION, PRODUCTS, CATEGORIES, STOCK, PRICES, SYNC, QUEUE, LOGS) */}
      {mainViewMode === "ovoko" && (
        <OvokoIntegrationTab />
      )}

      {/* WIDOK: COMPARE MARKETPLACES (MASTER VS ALLEGRO VS OVOKO VS BASELINKER VS SHOPGOLD) */}
      {mainViewMode === "compare_marketplaces" && (
        <CompareMarketplacesView onSelectProduct={(sku) => handleOpenCentralEditorBySku(sku)} />
      )}

      {/* WIDOK GŁÓWNY: CENTRUM INTEGRACJI */}
      {mainViewMode === "integration_center" && (
        <IntegrationCenterTab
          drafts={drafts}
          setDrafts={setDrafts}
          onOpenWarehouseCard={onOpenWarehouseCard}
        />
      )}

      {/* WIDOK 1: MÓJ ASORTYMENT (TABLE LIKE SCREENSHOT 3) */}
      {mainViewMode === "asortyment" && (
        <AllegroAsortymentView
          drafts={drafts}
          setDrafts={setDrafts}
          onOpenEditor={handleOpenEditor}
          onCloneSimilarPart={handleCloneSimilarPart}
          onOpenWarehouseCard={onOpenWarehouseCard}
          onOpenCsvImport={() => setIsCsvImportModalOpen(true)}
        />
      )}

      {/* WIDOK 2: STUDIO SZABLONÓW & PODGLĄD KUPUJĄCEGO */}
      {mainViewMode === "editor" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* LEWA KOLUMNA: LISTA CZĘŚCI Z WYSZUKIWARKĄ (4 kolumny) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white font-mono text-xs">Wybierz część z bazy:</span>
                <span className="text-[10px] text-yellow-400 font-mono font-bold">
                  {filteredDrafts.length} pozycji
                </span>
              </div>

              {/* Wyszukiwarka */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-yellow-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Szukaj po tytule, OEM, regale..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#030712] border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-hidden focus:border-yellow-400 font-mono transition"
                />
              </div>

              {/* Lista części */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {filteredDrafts.map((draft) => {
                  const isSel = draft.id === selectedPartId;
                  const isPub = Boolean(draft.allegroOfferId || draft.listingData?.allegro?.offerId);
                  const oem = draft.listingData?.numery_czesci || "OE";
                  const rack =
                    draft.currentRackLocation ||
                    draft.listingData?.ocr_wyniki?.numer_magazynowy ||
                    "MAG 14";
                  const photo = draft.listingData?.zdjecia?.[0];

                  return (
                    <div
                      key={draft.id}
                      onClick={() => setSelectedPartId(draft.id)}
                      className={`p-2.5 rounded-xl border transition cursor-pointer flex items-start gap-2.5 ${
                        isSel
                          ? "bg-yellow-400/10 border-yellow-400 shadow-md"
                          : "bg-[#070b14] border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                        {photo ? (
                          <img src={photo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Car className="w-5 h-5 text-slate-600" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-[10px] text-yellow-400">
                            {rack}
                          </span>
                          {isPub ? (
                            <span className="text-[9px] text-emerald-400 font-bold">Aktywna</span>
                          ) : (
                            <span className="text-[9px] text-slate-500">Szkic</span>
                          )}
                        </div>

                        <div className="font-bold text-white truncate text-xs">
                          {draft.listingData?.kategoria} — {draft.listingData?.samochod?.marka}{" "}
                          {draft.listingData?.samochod?.model}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>OEM: {oem}</span>
                          <strong className="text-emerald-400">
                            {draft.listingData?.cena?.brutto || 90} zł
                          </strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* PRAWA KOLUMNA: PODGLĄD KUPUJĄCEGO & PRZYCISKI AKCJI (8 kolumn) */}
          <div className="lg:col-span-8 space-y-3">
            {selectedPart ? (
              <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-4 space-y-4">
                {/* Górny pasek wybranej części */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-400 font-mono font-bold text-[10px]">
                        {selectedPart.currentRackLocation || "MAG 14"}
                      </span>
                      <h2 className="text-sm font-bold text-white font-mono">
                        {currentTemplate?.allegroTitle}
                      </h2>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      ID rekordu: <strong className="text-white font-mono">{selectedPart.id}</strong> • OEM:{" "}
                      <strong className="text-white font-mono">
                        {selectedPart.listingData.numery_czesci || "OE"}
                      </strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCloneSimilarPart(selectedPart)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-yellow-400 border border-yellow-400/40 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer"
                      title="Sklonuj do nowej części w bazie"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Wystaw podobną</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditor(selectedPart)}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Edytuj w Sales Center</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePublishCurrentPart(selectedPart)}
                      disabled={isPublishing}
                      className="px-4 py-1.5 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 font-black rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {isPublishing ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Flame className="w-3.5 h-3.5" />
                      )}
                      <span>{isSelectedPublished ? "Aktualizuj" : "Wystaw 1-Klik"}</span>
                    </button>
                  </div>
                </div>

                {/* Paski podglądu sub-tabów */}
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <button
                    onClick={() => setPreviewSubTab("mockup")}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                      previewSubTab === "mockup"
                        ? "bg-yellow-400 text-slate-950 font-black"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Podgląd Kupującego Allegro
                  </button>
                  <button
                    onClick={() => setPreviewSubTab("html")}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                      previewSubTab === "html"
                        ? "bg-yellow-400 text-slate-950 font-black"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Kod HTML Opisu (GPSR UE)
                  </button>
                  <button
                    onClick={() => setPreviewSubTab("json")}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                      previewSubTab === "json"
                        ? "bg-yellow-400 text-slate-950 font-black"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    JSON REST API
                  </button>
                </div>

                {/* Treść mockupu */}
                {previewSubTab === "mockup" && (
                  <div className="bg-white text-slate-900 rounded-xl p-5 shadow-sm space-y-4 border border-slate-200">
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      <div className="w-44 h-44 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center">
                        {selectedPart.listingData.zdjecia?.[0] ? (
                          <img
                            src={selectedPart.listingData.zdjecia[0]}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Car className="w-10 h-10 text-slate-300" />
                        )}
                      </div>

                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                            {selectedPart.listingData.qualityGrade || "Używany (Oryginał OE)"}
                          </span>
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded">
                            Legalny demontaż: PHU U Konesera
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-slate-950 leading-snug">
                          {currentTemplate?.allegroTitle}
                        </h3>

                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-slate-950">
                            {selectedPart.listingData.cena?.brutto || 90},00 zł
                          </span>
                          <span className="text-xs text-slate-500">
                            ({Math.round((selectedPart.listingData.cena?.brutto || 90) / 1.23)} zł netto)
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                          <div>
                            Kategoria: <strong>{currentAllegroCategory.name}</strong>
                          </div>
                          <div>
                            Regał WMS:{" "}
                            <strong className="font-mono text-amber-700">
                              {selectedPart.currentRackLocation || "MAG 14"}
                            </strong>
                          </div>
                          <div>
                            Dostawa: <strong>Paczkomat / Kurier 24h</strong>
                          </div>
                          <div>
                            Gwarancja: <strong>Rozruchowa 14 dni</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-4">
                      <div
                        className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs overflow-x-auto"
                        dangerouslySetInnerHTML={{
                          __html: currentTemplate?.allegroDescriptionHtml || "",
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Kod HTML */}
                {previewSubTab === "html" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>Zgodne z Dyrektywą GPSR UE 2023/988 i standardem Allegro:</span>
                      <button
                        onClick={() =>
                          handleCopy(currentTemplate?.allegroDescriptionHtml || "", "html_copy")
                        }
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-yellow-400 border border-slate-700 rounded-lg font-bold transition cursor-pointer"
                      >
                        {copiedKey === "html_copy" ? "Skopiowano!" : "Kopiuj kod HTML"}
                      </button>
                    </div>
                    <textarea
                      rows={14}
                      readOnly
                      value={currentTemplate?.allegroDescriptionHtml || ""}
                      className="w-full bg-[#030712] border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-slate-300 leading-relaxed outline-hidden"
                    />
                  </div>
                )}

                {/* JSON REST API */}
                {previewSubTab === "json" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>Gotowa struktura dla endpointu Allegro REST API:</span>
                      <button
                        onClick={() =>
                          handleCopy(JSON.stringify(selectedPart, null, 2), "json_copy")
                        }
                        className="text-yellow-400 font-bold cursor-pointer"
                      >
                        {copiedKey === "json_copy" ? "Skopiowano JSON!" : "Kopiuj JSON"}
                      </button>
                    </div>
                    <pre className="w-full bg-[#030712] border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-96">
                      {JSON.stringify(selectedPart, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 font-mono">
                Brak wybranej części.
              </div>
            )}
          </div>
        </div>
      )}

      {/* WIDOK 3: WIELOPLATFORMOWY (ALLEGRO / OVOKO / OLX / SKLEP) */}
      {mainViewMode === "multichannel" && (
        <AllegroMultiPlatformEditor
          selectedPart={selectedPart}
          onOpenEditor={handleOpenEditor}
          onPublishAllegro={handlePublishCurrentPart}
          isPublishing={isPublishing}
        />
      )}

      {/* MODAL PEŁNEGO FORMULARZA ALLEGRO SALES CENTER */}
      {isEditorModalOpen && editorModalPart && (
        <AllegroSalesCenterEditorModal
          isOpen={isEditorModalOpen}
          part={editorModalPart}
          onClose={() => {
            setIsEditorModalOpen(false);
            setEditorModalPart(null);
          }}
          onSavePart={handleSavePartFromModal}
          onCloneSimilarPart={handleCloneSimilarPart}
        />
      )}

      {/* MODAL MASOWEGO IMPORTU CSV & WYSTAWIANIA ALLEGRO */}
      <AllegroCsvImportModal
        isOpen={isCsvImportModalOpen}
        onClose={() => setIsCsvImportModalOpen(false)}
        allegroConfig={allegroConfig}
        onImportComplete={(importedParts) => {
          if (setDrafts) {
            setDrafts((prev) => [...importedParts, ...prev]);
          }
          if (importedParts.length > 0) {
            setSelectedPartId(importedParts[0].id);
          }
        }}
      />

      {/* MODAL USTAWIEŃ REST API & CENNIKÓW */}
      <AllegroSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        config={allegroConfig}
        onSaveConfig={(newConfig) => {
          setAllegroConfig(newConfig);
          saveStoredAllegroConfig(newConfig);
        }}
      />

      {/* MODAL CENTRALNEGO EDYTORA PRODUKTU (7 ZAKŁADEK: MASTER, ALLEGRO, OVOKO, BASELINKER, SHOPGOLD, HISTORY, API LOGS) */}
      {isCentralEditorOpen && (
        <CentralProductEditorModal
          isOpen={isCentralEditorOpen}
          onClose={() => {
            setIsCentralEditorOpen(false);
            setCentralEditorProduct(null);
          }}
          product={centralEditorProduct}
          onSave={async (updated) => {
            if (setDrafts) {
              setDrafts((prev) =>
                prev.map((p) => {
                  if (p.id === updated.id || p.listingData?.ocr_wyniki?.numer_magazynowy === updated.sku) {
                    return {
                      ...p,
                      allegroOfferId: updated.marketplace_status?.allegro?.offerId,
                      allegroStatus: updated.marketplace_status?.allegro?.status === "active" ? "active" : "draft",
                      listingData: {
                        ...p.listingData,
                        kategoria: updated.name,
                        opis: updated.description_raw,
                        cena: {
                          ...p.listingData.cena,
                          brutto: updated.price_gross,
                          netto: updated.price_net,
                        },
                      },
                    };
                  }
                  return p;
                })
              );
            }
            setIsCentralEditorOpen(false);
          }}
        />
      )}
    </div>
  );
};
