import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { StatsBar } from "./components/StatsBar";
import { WarehouseTab } from "./components/WarehouseTab";
import { ScannerTab } from "./components/ScannerTab";
import { WorkerStationTab } from "./components/WorkerStationTab";
import { InfolineTab } from "./components/InfolineTab";
import { BossPanelTab } from "./components/BossPanelTab";
import { InstructionsTab } from "./components/InstructionsTab";
import { ImportCsvTab } from "./components/ImportCsvTab";
import { OnlineShopTab } from "./components/OnlineShopTab";
import { AllegroTab } from "./components/AllegroTab";
import { ShopGoldTab } from "./components/ShopGoldTab";
import { VehiclesLifecycleTab } from "./components/VehiclesLifecycleTab";
import { AllegroDiagnosticsView } from "./components/AllegroDiagnosticsView";
import { OvokoIntegrationTab } from "./components/OvokoIntegrationTab";
import { CompareMarketplacesView } from "./components/CompareMarketplacesView";
import { GoogleDriveTab } from "./components/GoogleDriveTab";
import { GmailTab } from "./components/GmailTab";
import { CarPartsCatalogTab } from "./components/CarPartsCatalogTab";
import { CentralProductEditorModal } from "./components/CentralProductEditorModal";
import { CanonicalProduct } from "./types/canonicalProduct";
import { BusinessOsDashboardView } from "./components/business-os/BusinessOsDashboardView";
import { BusinessOsContractorsView } from "./components/business-os/BusinessOsContractorsView";
import { BusinessOsOrdersView } from "./components/business-os/BusinessOsOrdersView";
import { BusinessOsFinanceView } from "./components/business-os/BusinessOsFinanceView";
import { BusinessOsIntegrationsHubView } from "./components/business-os/BusinessOsIntegrationsHubView";
import { BusinessOsIssuesView } from "./components/business-os/BusinessOsIssuesView";
import { BusinessOsJobsAndLogsView } from "./components/business-os/BusinessOsJobsAndLogsView";
import { BusinessOsPublicDataView } from "./components/business-os/BusinessOsPublicDataView";
import { externalMappingService } from "./services/externalMappingService";
import { ApiKeyModal } from "./components/ApiKeyModal";
import { DirectAdminExportModal } from "./components/DirectAdminExportModal";
import { CloudRunDeploymentModal } from "./components/CloudRunDeploymentModal";
import { NotificationCenterModal } from "./components/NotificationCenterModal";
import { VoiceAssistantModal } from "./components/VoiceAssistantModal";
import { FloatingVoiceAndNotificationBar } from "./components/FloatingVoiceAndNotificationBar";
import { NetworkSyncDiagnosticModal } from "./components/NetworkSyncDiagnosticModal";
import { useNetworkAndFirestoreSync } from "./hooks/useNetworkAndFirestoreSync";
import { initialWarehouseParts } from "./data/mockParts";
import { initialVehicleLifecycleRecords } from "./data/mockVehicles";
import { initialWorkerTasks } from "./data/mockWorkerData";
import {
  getStoredNotifications,
  saveStoredNotifications,
  notifyBossUrgentTask,
  notifyFirestoreSyncStatus,
  dispatchAppNotification,
  NOTIFICATION_EVENT,
} from "./services/notificationService";
import { analyzePartWithGemini, askInfolineAssistant } from "./utils/geminiVision";
import { generateAuctionTemplates } from "./utils/auctionGenerator";
import { uploadAuctionPdfToDrive, isDriveAutoSyncEnabled } from "./lib/googleDriveService";
import { useAuth } from "./lib/AuthContext";
import {
  safeSaveToLocalStorage,
  safeLoadFromLocalStorage,
  loadDraftsFromIndexedDB,
  saveDraftsToIndexedDB,
} from "./utils/storage";
import { sanitizePartItems, sanitizePartItem } from "./utils/dataSanitizer";
import {
  fetchPartsFromFirestore,
  savePartToFirestore,
  deletePartFromFirestore,
  batchSyncPartsToFirestore,
} from "./lib/firestoreService";
import {
  ActiveTabType,
  PartItem,
  PartListingData,
  ChatMessage,
  StaffMember,
  UserRole,
  VehicleLifecycleRecord,
  WorkerTask,
  AppNotification,
} from "./types";

const API_KEY_STORAGE = "ukonesera_gemini_key_v2026";
const STAFF_STORAGE_KEY = "ukonesera_staff_list_v1";
const VEHICLES_STORAGE_KEY = "ukonesera_vehicles_lifecycle_v1";

const initialStaff: StaffMember[] = [
  {
    id: "staff_1",
    name: "Grzegorz Kuźma",
    email: "grzegorz@ukonesera.pl",
    role: "Właściciel / Szef",
    stationCode: "Mysłakowice Główny",
    partsLoggedCount: 42,
    active: true,
  },
  {
    id: "staff_2",
    name: "Marek Demontaż",
    email: "marek.demontaz@ukonesera.pl",
    role: "Pracownik / Demontażysta",
    stationCode: "Stanowisko 1 (Plac A)",
    partsLoggedCount: 28,
    active: true,
  },
  {
    id: "staff_3",
    name: "Piotr Magazynier",
    email: "piotr.magazyn@ukonesera.pl",
    role: "Kierownik Magazynu",
    stationCode: "Hala WMS - Regały MAG 01-20",
    partsLoggedCount: 35,
    active: true,
  },
  {
    id: "staff_4",
    name: "Anna E-commerce",
    email: "anna.sprzedaz@ukonesera.pl",
    role: "Sprzedawca / E-commerce",
    stationCode: "Biuro Obsługi & Allegro",
    partsLoggedCount: 15,
    active: true,
  },
];

export function App() {
  const { accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTabType>("magazyn");
  const [searchQuery, setSearchQuery] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isDirectAdminModalOpen, setIsDirectAdminModalOpen] = useState(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [vatRate, setVatRate] = useState<number>(23);
  const [isSyncingFirestore, setIsSyncingFirestore] = useState(false);
  const [enableSearchGrounding, setEnableSearchGrounding] = useState(true);

  // Staff & Roles state
  const [staffList, setStaffList] = useState<StaffMember[]>(() => {
    try {
      const stored = localStorage.getItem(STAFF_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return initialStaff;
  });

  const [currentUserRole, setCurrentUserRole] = useState<UserRole>("Właściciel / Szef");

  useEffect(() => {
    try {
      localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(staffList));
    } catch (e) {}
  }, [staffList]);

  // Vehicles Lifecycle state (Stacja Demontażu Pojazdów)
  const [vehicles, setVehicles] = useState<VehicleLifecycleRecord[]>(() => {
    try {
      const stored = localStorage.getItem(VEHICLES_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return initialVehicleLifecycleRecords;
  });

  useEffect(() => {
    try {
      localStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(vehicles));
    } catch (e) {}
  }, [vehicles]);

  // WMS Inventory items
  const [drafts, setDrafts] = useState<PartItem[]>(() => {
    const loaded = safeLoadFromLocalStorage();
    if (loaded && loaded.length > 0) {
      return sanitizePartItems(loaded);
    }
    return initialWarehouseParts;
  });

  // Async load from IndexedDB and Firebase Firestore on mount
  useEffect(() => {
    // 1. IndexedDB immediate local cache
    loadDraftsFromIndexedDB().then((idbParts) => {
      if (idbParts && idbParts.length > 0) {
        setDrafts(sanitizePartItems(idbParts));
      }
    });

    // 2. Fetch fresh cloud Firestore parts
    fetchPartsFromFirestore().then((cloudParts) => {
      if (cloudParts && cloudParts.length > 0) {
        setDrafts((prevLocal) => {
          // Merge unique items by id
          const existingIds = new Set(cloudParts.map((p) => p.id));
          const localOnly = prevLocal.filter((p) => !existingIds.has(p.id));
          const combined = [...cloudParts, ...localOnly];
          safeSaveToLocalStorage(combined);
          saveDraftsToIndexedDB(combined);
          return combined;
        });
      }
    });
  }, []);

  // Save drafts safely to local cache and sync cross-marketplace ID mappings
  useEffect(() => {
    safeSaveToLocalStorage(drafts);
    saveDraftsToIndexedDB(drafts);
    externalMappingService.syncFromParts(drafts);
  }, [drafts]);

  // Load API Key
  useEffect(() => {
    try {
      const savedKey = localStorage.getItem(API_KEY_STORAGE);
      if (savedKey) setApiKey(savedKey);
    } catch (e) {}
  }, []);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    try {
      localStorage.setItem(API_KEY_STORAGE, key);
    } catch (e) {}
  };

  // Real-time network and Firestore sync indicator
  const {
    syncInfo,
    measureFirestoreLatency,
    triggerManualSync,
    isMeasuringPing,
    syncStatus,
  } = useNetworkAndFirestoreSync(drafts.length);

  const [isDiagnosticModalOpen, setIsDiagnosticModalOpen] = useState(false);

  // Sync entire inventory with Firestore Cloud
  const handleSyncFirestore = async () => {
    setIsSyncingFirestore(true);
    try {
      await triggerManualSync(drafts);
    } finally {
      setIsSyncingFirestore(false);
    }
  };

  // Worker & Boss Tasks state
  const [tasks, setTasks] = useState<WorkerTask[]>(() => {
    try {
      const stored = localStorage.getItem("koneser_worker_tasks_v1");
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return initialWorkerTasks;
  });

  useEffect(() => {
    try {
      localStorage.setItem("koneser_worker_tasks_v1", JSON.stringify(tasks));
    } catch (e) {}
  }, [tasks]);

  // Notifications state
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    return getStoredNotifications();
  });
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);

  // Subscribe to NOTIFICATION_EVENT
  useEffect(() => {
    const handleNotification = (event: any) => {
      if (event.detail) {
        setNotifications((prev) => [event.detail, ...prev]);
        setActiveToast(event.detail);
      }
    };

    window.addEventListener(NOTIFICATION_EVENT, handleNotification);
    return () => window.removeEventListener(NOTIFICATION_EVENT, handleNotification);
  }, []);

  // Auto-dismiss toast after 6 seconds
  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  const handleMarkAllNotificationsAsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, isRead: true }));
      saveStoredNotifications(updated);
      return updated;
    });
  };

  const handleMarkNotificationAsRead = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, isRead: true } : n));
      saveStoredNotifications(updated);
      return updated;
    });
  };

  const handleDeleteNotification = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      saveStoredNotifications(updated);
      return updated;
    });
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
    saveStoredNotifications([]);
  };

  const handleAddUrgentBossTask = (
    title: string,
    desc: string,
    category: string = "Demontaż",
    rack: string = "MAG 14"
  ) => {
    const newTask: WorkerTask = {
      id: `task_${Date.now()}`,
      title,
      description: desc,
      category: category as any,
      priority: "Krytyczny (Pilny)",
      status: "Do zrobienia",
      assignedTo: "Marek Demontaż / Zespół",
      targetRack: rack,
      createdAt: new Date().toLocaleString("pl-PL"),
      createdBy: "Grzegorz Kuźma (Szef)",
      aiGenerated: false,
      isUrgent: true,
      bossUrgentNote: desc,
    };

    setTasks((prev) => [newTask, ...prev]);
    notifyBossUrgentTask(newTask, "Grzegorz Kuźma");
  };

  const handleApplyVoicePartData = (partialData: Partial<PartListingData>) => {
    setFormData((prev) => ({
      ...prev,
      ...partialData,
      samochod: {
        ...prev.samochod,
        ...(partialData.samochod || {}),
      },
      cena: {
        ...prev.cena,
        ...(partialData.cena || {}),
      },
      kategoria: partialData.kategoria || prev.kategoria,
      jakosc: (partialData.jakosc as any) || prev.jakosc,
      opis: partialData.opis ? `${partialData.opis}\n\n${prev.opis}` : prev.opis,
    }));
  };

  // One-click repair / sanitize entire database
  const handleSanitizeDatabase = () => {
    setDrafts((curr) => {
      const cleaned = sanitizePartItems(curr);
      safeSaveToLocalStorage(cleaned);
      saveDraftsToIndexedDB(cleaned);
      return cleaned;
    });
    alert("Baza magazynu została pomyślnie oczyszczona ze znaczników HTML i znormalizowana!");
  };

  // Skaner Form State
  const defaultFormData: PartListingData = {
    samochod: { marka: "Skoda", model: "Fabia I", rocznik: "1999 - 2007" },
    kategoria: "Lampa tylna lewa",
    jakosc: "A (Bardzo dobry / Sprawny 100%)",
    pozycja_czesci: "Tył, strona lewa (kierowca)",
    opis: "Oryginalna lampa tylna lewa do Skoda Fabia I. Zdemontowana na legalnej stacji recyklingu PHU U Konesera w Mysłakowicach. Stan bardzo dobry, klosz czysty, mocowania w 100% całe.",
    producent: "OE Skoda",
    numery_czesci: "6Y6945111",
    cena: { brutto: 90, netto: 73 },
    ocr_wyniki: { numer_magazynowy: "MAG 14", napisy_markerem: "LT FABIA I" },
  };

  const [formData, setFormData] = useState<PartListingData>(defaultFormData);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>("");
  const [editingPartId, setEditingPartId] = useState<string | null>(null);

  // Central Product Editor state (7 tabs: MASTER, ALLEGRO, OVOKO, BASELINKER, SHOPGOLD, HISTORY, API LOGS)
  const [centralEditorProduct, setCentralEditorProduct] = useState<CanonicalProduct | null>(null);
  const [isCentralEditorOpen, setIsCentralEditorOpen] = useState(false);

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

  // Chat Infoline State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      sender: "bot",
      text: "Dzień dobry! Tu Smart Infolinia Stacji Demontażu Pojazdów i Magazynu Części PHU U KONESERA w Mysłakowicach (ul. Daszyńskiego 16G, tel. 533 533 443). Asystent AI weryfikuje stany magazynowe WMS oraz bieżące ceny rynkowe z Google Search. W czym mogę pomóc?",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatTyping, setIsChatTyping] = useState(false);

  // Handle Gemini Vision Analysis
  const handleAnalyze = async (imagesToAnalyze?: string[]) => {
    setIsAnalyzing(true);
    const targetImages = (imagesToAnalyze && imagesToAnalyze.length > 0) ? imagesToAnalyze : uploadedImages;
    setAnalysisStatus(`Wysyłanie ${targetImages.length} ${targetImages.length === 1 ? "zdjęcia" : "zdjęć"} i analiza Gemini Vision AI...`);

    try {
      const result = await analyzePartWithGemini(targetImages, apiKey, vatRate);
      if (result && result.data) {
        // Auto generate auction templates
        const templates = generateAuctionTemplates(result.data);
        const enriched = { ...result.data, auctionTemplates: templates };
        setFormData(enriched);
        setAnalysisStatus(
          result.source === "server"
            ? `Pomyślnie przeanalizowano ${targetImages.length} ${targetImages.length === 1 ? "zdjęcie" : "zdjęć"} przez Gemini Vision na serwerze! Wygenerowano szablony aukcji.`
            : result.source === "direct"
            ? `Przeanalizowano ${targetImages.length} ${targetImages.length === 1 ? "zdjęcie" : "zdjęć"} przez Gemini Direct API! Wygenerowano szablony aukcji.`
            : "Dopasowano parametry części w standardzie OVOKO PL i Allegro!"
        );
      }
    } catch (err: any) {
      console.error("Analyze error:", err);
      setAnalysisStatus("Błąd podczas analizy. Wypełnij dane ręcznie lub spróbuj ponownie.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Save to WMS Warehouse & Firestore
  const handleSaveToWarehouse = async () => {
    setIsSaving(true);

    const rackLocation = formData.ocr_wyniki?.numer_magazynowy || formData.allegro?.signature || "MAG 14";
    const templates = generateAuctionTemplates(formData);
    const enrichedData = {
      ...formData,
      ocr_wyniki: {
        numer_magazynowy: rackLocation,
        napisy_markerem: formData.ocr_wyniki?.napisy_markerem || "",
      },
      allegro: {
        ...(formData.allegro || {}),
        signature: rackLocation,
      },
      sku: rackLocation,
      auctionTemplates: templates,
      zdjecia: uploadedImages,
    };

    let savedPartItem: PartItem;

    if (editingPartId) {
      // Update existing item
      savedPartItem = {
        id: editingPartId,
        currentRackLocation: rackLocation,
        listingData: enrichedData,
        status: "Dostępny",
        createdAt: new Date().toLocaleString("pl-PL"),
        updatedAt: new Date().toLocaleString("pl-PL"),
      };

      setDrafts((prev) =>
        prev.map((item) => (item.id === editingPartId ? savedPartItem : item))
      );
      savePartToFirestore(savedPartItem);
      setEditingPartId(null);
    } else {
      // Create new item
      savedPartItem = {
        id: `part_${Date.now()}`,
        currentRackLocation: rackLocation,
        listingData: enrichedData,
        status: "Dostępny",
        createdAt: new Date().toLocaleString("pl-PL"),
      };
      setDrafts((prev) => [savedPartItem, ...prev]);
      savePartToFirestore(savedPartItem);
    }

    // Google Drive Integration:
    // Automatically create folder structure (e.g., /Parts/Inventory/YYYY-MM-DD)
    // and upload generated auction PDF templates to these folders whenever a part is added to the WMS.
    if (isDriveAutoSyncEnabled()) {
      if (accessToken) {
        uploadAuctionPdfToDrive(accessToken, savedPartItem)
          .then((result) => {
            dispatchAppNotification({
              title: "Dysk Google: Szablon PDF zapisany",
              message: `Wygenerowano i wgrano szablon aukcji PDF do ${result.folderPath} (${result.file.name})`,
              type: "google_drive",
              priority: "success",
            });
            // Update part in local state with Drive link & folder
            const driveMeta = {
              drivePdfUrl: result.file.webViewLink,
              driveFileId: result.file.id,
              driveFolder: result.folderPath,
              driveSyncedAt: new Date().toLocaleString("pl-PL"),
            };
            setDrafts((prev) =>
              prev.map((p) =>
                p.id === savedPartItem.id
                  ? {
                      ...p,
                      ...driveMeta,
                      listingData: {
                        ...p.listingData,
                        ...driveMeta,
                      },
                    }
                  : p
              )
            );
          })
          .catch((driveErr: any) => {
            console.error("Auto upload PDF to Google Drive error:", driveErr);
            dispatchAppNotification({
              title: "Dysk Google: Błąd synchronizacji PDF",
              message: `Nie udało się przesłać szablonu PDF do /Parts/Inventory: ${driveErr.message}`,
              type: "google_drive",
              priority: "warning",
            });
          });
      } else {
        dispatchAppNotification({
          title: "Dysk Google: Wskazówka synchronizacji",
          message: "Część dodana do magazynu! Połącz konto w zakładce Dysk Google, aby automatycznie tworzyć foldery /Parts/Inventory/YYYY-MM-DD i wgrywać szablony aukcji PDF.",
          type: "google_drive",
          priority: "info",
        });
      }
    }

    setTimeout(() => {
      setIsSaving(false);
      setActiveTab("magazyn");
      setFormData(defaultFormData);
      setUploadedImages([]);
    }, 300);
  };

  // Edit existing part from warehouse table
  const handleEditPart = (part: PartItem) => {
    setEditingPartId(part.id);
    setFormData(part.listingData);
    if (part.listingData.zdjecia && part.listingData.zdjecia.length > 0) {
      setUploadedImages(part.listingData.zdjecia);
    }
    setActiveTab("skaner");
  };

  // Send message to Infoline Chatbot with Google Search Grounding
  const handleSendChat = async () => {
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    const newHistory: ChatMessage[] = [
      ...chatMessages,
      { sender: "user", text: userText },
    ];
    setChatMessages(newHistory);
    setChatInput("");
    setIsChatTyping(true);

    try {
      const response = await askInfolineAssistant(
        userText,
        newHistory,
        apiKey,
        drafts,
        enableSearchGrounding
      );
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: response.reply,
          sources: response.sources,
        },
      ]);
    } catch (e) {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Dziękujemy za kontakt. Prosimy o bezpośredni kontakt telefoniczny z naszym magazynem w Mysłakowicach pod numerem 533 533 443.",
        },
      ]);
    } finally {
      setIsChatTyping(false);
    }
  };

  // CSV Export for WMS
  const handleExportCsv = () => {
    const headers = [
      "ID",
      "Kategoria",
      "Marka",
      "Model",
      "Rocznik",
      "Pozycja_Montazowa",
      "Numery_OEM",
      "Cena_Brutto_PLN",
      "Cena_Netto_PLN",
      "Regal_WMS",
      "Opis_Techniczny",
      "Status",
      "Klasa_Jakosci",
      "Pracownik",
      "Data_Dodania",
    ];

    const rows = drafts.map((d) => {
      const v = d.listingData?.samochod || {
        marka: d.listingData?.marka || "",
        model: d.listingData?.model || "",
        rocznik: d.listingData?.rocznik || "",
      };
      return [
        d.id,
        `"${d.listingData?.kategoria || ""}"`,
        `"${v.marka || ""}"`,
        `"${v.model || ""}"`,
        `"${v.rocznik || ""}"`,
        `"${d.listingData?.pozycja_czesci || ""}"`,
        `"${d.listingData?.numery_czesci || ""}"`,
        d.listingData?.cena?.brutto || 0,
        d.listingData?.cena?.netto || 0,
        `"${d.listingData?.ocr_wyniki?.numer_magazynowy || ""}"`,
        `"${(d.listingData?.opis || "").replace(/"/g, '""')}"`,
        `"${d.status || "Dostępny"}"`,
        `"${d.listingData?.qualityGrade || d.listingData?.jakosc || ""}"`,
        `"${d.createdByName || d.listingData?.workerName || "Grzegorz"}"`,
        `"${d.createdAt}"`,
      ].join(";");
    });

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(";"), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `wms_koneser_myslakowice_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportParts = (newParts: PartItem[]) => {
    const cleaned = sanitizePartItems(newParts);
    setDrafts((prev) => [...cleaned, ...prev]);
    batchSyncPartsToFirestore(cleaned);
    setActiveTab("magazyn");
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans selection:bg-yellow-400 selection:text-slate-950">
      {/* NAGŁÓWEK GŁÓWNY */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onOpenDirectAdminModal={() => setIsDirectAdminModalOpen(true)}
        onSanitizeDatabase={handleSanitizeDatabase}
        onSyncFirestore={handleSyncFirestore}
        isSyncingFirestore={isSyncingFirestore}
        hasApiKey={Boolean(apiKey)}
        totalPartsCount={drafts.length}
        currentUserRole={currentUserRole}
        onOpenNotificationModal={() => setIsNotificationModalOpen(true)}
        onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
        unreadNotificationsCount={notifications.filter((n) => !n.isRead).length}
        urgentNotificationsCount={notifications.filter((n) => n.type === "boss_urgent_task" && !n.isRead).length}
        syncInfo={syncInfo}
        onOpenDiagnostics={() => setIsDiagnosticModalOpen(true)}
        onOpenDeployModal={() => setIsDeployModalOpen(true)}
      />

      {/* GŁÓWNY KONTENER APLIKACJI - HIGH DENSITY */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 flex-1 w-full space-y-4">
        {/* PAS METRYK BIZNESOWYCH ZE WSKAŹNIKIEM SIECI & FIRESTORE */}
        <StatsBar
          drafts={drafts}
          syncInfo={syncInfo}
          onTriggerSync={handleSyncFirestore}
          isSyncing={isSyncingFirestore || syncStatus === "syncing"}
          onOpenDiagnostics={() => setIsDiagnosticModalOpen(true)}
        />

        {/* ZAKŁADKI GŁÓWNE */}
        {activeTab === "pojazdy" && (
          <VehiclesLifecycleTab
            vehicles={vehicles}
            setVehicles={setVehicles}
            allParts={drafts}
            setAllParts={setDrafts}
            staffList={staffList}
            onNavigateToWorkerStation={(vehNo) => {
              setActiveTab("pracownik");
            }}
            onNavigateToScanner={(vehicleInfo) => {
              if (vehicleInfo) {
                setFormData((prev) => ({
                  ...prev,
                  samochod: {
                    ...prev.samochod,
                    marka: vehicleInfo.marka || prev.samochod.marka,
                    model: vehicleInfo.model || prev.samochod.model,
                    rocznik: vehicleInfo.rocznik || prev.samochod.rocznik,
                    vin: vehicleInfo.vin || prev.samochod.vin,
                  },
                  ocr_wyniki: {
                    ...prev.ocr_wyniki,
                    napisy_markerem: vehicleInfo.vehicleInternalNo || prev.ocr_wyniki.napisy_markerem,
                  },
                }));
              }
              setActiveTab("skaner");
            }}
            currentUserRole={currentUserRole}
          />
        )}

        {activeTab === "magazyn" && (
          <WarehouseTab
            drafts={drafts}
            setDrafts={setDrafts}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onEditPart={handleEditPart}
            onNavigateToScanner={() => {
              setEditingPartId(null);
              setFormData(defaultFormData);
              setUploadedImages([]);
              setActiveTab("skaner");
            }}
            onNavigateToWorker={() => setActiveTab("pracownik")}
            onExportCsv={handleExportCsv}
            onSanitizeDatabase={handleSanitizeDatabase}
            onNavigateToGoogleDrive={() => setActiveTab("google_drive")}
          />
        )}

        {activeTab === "pracownik" && (
          <WorkerStationTab
            drafts={drafts}
            setDrafts={setDrafts}
            onNavigateToWarehouse={() => setActiveTab("magazyn")}
            apiKey={apiKey}
            currentUserRole={currentUserRole}
            tasks={tasks}
            setTasks={setTasks}
          />
        )}

        {activeTab === "skaner" && (
          <ScannerTab
            formData={formData}
            setFormData={setFormData}
            uploadedImages={uploadedImages}
            setUploadedImages={setUploadedImages}
            isAnalyzing={isAnalyzing}
            isSaving={isSaving}
            analysisStatus={analysisStatus}
            vatRate={vatRate}
            setVatRate={setVatRate}
            onAnalyze={handleAnalyze}
            onSaveToWarehouse={handleSaveToWarehouse}
            onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
            apiKey={apiKey}
          />
        )}

        {activeTab === "szef" && (
          <BossPanelTab
            drafts={drafts}
            setDrafts={setDrafts}
            onExportCsv={handleExportCsv}
            staffList={staffList}
            setStaffList={setStaffList}
            currentUserRole={currentUserRole}
            setCurrentUserRole={setCurrentUserRole}
            apiKey={apiKey}
            onOpenNotificationModal={() => setIsNotificationModalOpen(true)}
            onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
          />
        )}

        {activeTab === "shopgold" && <ShopGoldTab drafts={drafts} />}

        {activeTab === "allegro" && (
          <AllegroTab
            drafts={drafts}
            setDrafts={setDrafts}
            onOpenWarehouseCard={(part) => {
              handleEditPart(part);
            }}
          />
        )}

        {activeTab === "allegro_diagnostics" && (
          <AllegroDiagnosticsView onOpenCentralEditor={(sku) => handleOpenCentralEditorBySku(sku)} />
        )}

        {activeTab === "ovoko" && (
          <OvokoIntegrationTab />
        )}

        {activeTab === "compare_marketplaces" && (
          <CompareMarketplacesView onSelectProduct={(sku) => handleOpenCentralEditorBySku(sku)} />
        )}

        {activeTab === "infolinia" && (
          <InfolineTab
            chatMessages={chatMessages}
            chatInput={chatInput}
            setChatInput={setChatInput}
            isChatTyping={isChatTyping}
            onSendChat={handleSendChat}
            drafts={drafts}
            enableSearchGrounding={enableSearchGrounding}
            setEnableSearchGrounding={setEnableSearchGrounding}
          />
        )}

        {activeTab === "instrukcja" && (
          <InstructionsTab
            onNavigateToScanner={() => setActiveTab("skaner")}
            onNavigateToInfoline={() => setActiveTab("infolinia")}
          />
        )}

        {activeTab === "import" && (
          <ImportCsvTab onImportParts={handleImportParts} />
        )}

        {activeTab === "sklep" && <OnlineShopTab drafts={drafts} />}

        {activeTab === "google_drive" && (
          <GoogleDriveTab
            parts={drafts}
            onNotify={(title, message, priority) => {
              dispatchAppNotification({
                type: "google_drive",
                title,
                message,
                priority: priority || "info",
                actionTab: "google_drive",
              });
            }}
          />
        )}

        {activeTab === "gmail" && (
          <GmailTab
            parts={drafts}
            onNotify={(title, message, priority) => {
              dispatchAppNotification({
                type: "system",
                title,
                message,
                priority: priority || "info",
                actionTab: "gmail",
              });
            }}
          />
        )}

        {activeTab === "tecdoc_catalog" && (
          <CarPartsCatalogTab
            onAddToWms={(newPart) => {
              setDrafts((prev) => [newPart, ...prev]);
              setActiveTab("magazyn");
            }}
            onSendToScanner={(data) => {
              setFormData((prev) => ({ ...prev, ...data }));
              setActiveTab("skaner");
            }}
            onNotify={(title, message, priority) => {
              dispatchAppNotification({
                type: "system",
                title,
                message,
                priority: priority || "info",
                actionTab: "tecdoc_catalog",
              });
            }}
          />
        )}

        {/* BUSINESS OS v1 TABS */}
        {activeTab === "business_dashboard" && (
          <BusinessOsDashboardView
            parts={drafts}
            onNavigateTab={setActiveTab}
            onOpenScanner={() => setActiveTab("skaner")}
            onOpenAllegro={() => setActiveTab("allegro")}
            onOpenWms={() => setActiveTab("magazyn")}
          />
        )}

        {activeTab === "business_contractors" && <BusinessOsContractorsView />}

        {activeTab === "business_orders" && <BusinessOsOrdersView />}

        {activeTab === "business_finance" && <BusinessOsFinanceView parts={drafts} />}

        {activeTab === "business_integrations" && <BusinessOsIntegrationsHubView />}

        {activeTab === "business_issues" && (
          <BusinessOsIssuesView parts={drafts} onNavigateTab={setActiveTab} />
        )}

        {activeTab === "business_logs" && <BusinessOsJobsAndLogsView />}

        {activeTab === "business_public_data" && <BusinessOsPublicDataView />}
      </main>

      {/* STOPKA HIGH DENSITY */}
      <footer className="border-t border-slate-850/80 bg-[#070b14] py-3 px-4 sm:px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>
              © 2026 <strong className="text-slate-300">PHU U KONESERA Grzegorz Kuźma</strong> | Mysłakowice, ul. Daszyńskiego 16G
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="font-mono text-slate-400">
              OVOKO Fast Lister Pro & WMS Enterprise (Firebase & Google Search)
            </span>
            <span className="text-slate-700">|</span>
            <span className="font-mono">
              Infolinia:{" "}
              <a href="tel:533533443" className="text-yellow-400 font-bold hover:underline">
                533 533 443
              </a>
            </span>
          </div>
        </div>
      </footer>

      {/* MODALE */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
      />

      <DirectAdminExportModal
        isOpen={isDirectAdminModalOpen}
        onClose={() => setIsDirectAdminModalOpen(false)}
      />

      {/* CENTRALNY EDYTOR PRODUKTU (7 ZAKŁADEK: MASTER, ALLEGRO, OVOKO, BASELINKER, SHOPGOLD, HISTORY, API LOGS) */}
      {isCentralEditorOpen && (
        <CentralProductEditorModal
          isOpen={isCentralEditorOpen}
          onClose={() => {
            setIsCentralEditorOpen(false);
            setCentralEditorProduct(null);
          }}
          product={centralEditorProduct}
          onSave={async (updated) => {
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
            setIsCentralEditorOpen(false);
          }}
        />
      )}

      {/* CENTRUM POWIADOMIEŃ WEWNĄTRZ APLIKACJI */}
      <NotificationCenterModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
        onMarkAsRead={handleMarkNotificationAsRead}
        onDeleteNotification={handleDeleteNotification}
        onClearAll={handleClearAllNotifications}
        onNavigateToTab={(tab) => setActiveTab(tab)}
        onAddUrgentBossTask={handleAddUrgentBossTask}
        onTriggerFirestoreSync={handleSyncFirestore}
        isSyncingFirestore={isSyncingFirestore}
      />

      {/* DYKTAFON MOWY & ASYSTENT OBSŁUGI PANELU */}
      <VoiceAssistantModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onApplySearchQuery={(query) => {
          setSearchQuery(query);
          setActiveTab("magazyn");
        }}
        onApplyPartData={handleApplyVoicePartData}
        onTriggerFirestoreSync={handleSyncFirestore}
        onAddUrgentBossTask={(title, desc) => handleAddUrgentBossTask(title, desc)}
      />

      {/* PŁYWAJĄCY PRZYCISK DYKTAFONU, DZWONKA I TOAST POWIADOMIEŃ */}
      <FloatingVoiceAndNotificationBar
        onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
        onOpenNotificationModal={() => setIsNotificationModalOpen(true)}
        activeToast={activeToast}
        onDismissToast={() => setActiveToast(null)}
        onNavigateToTab={(tab) => setActiveTab(tab)}
        unreadCount={notifications.filter((n) => !n.isRead).length}
        urgentCount={notifications.filter((n) => n.type === "boss_urgent_task" && !n.isRead).length}
      />

      {/* DIAGNOSTYKA POŁĄCZENIA I STATUSU FIRESTORE W CZASIE RZECZYWISTYM */}
      <NetworkSyncDiagnosticModal
        isOpen={isDiagnosticModalOpen}
        onClose={() => setIsDiagnosticModalOpen(false)}
        syncInfo={syncInfo}
        isMeasuringPing={isMeasuringPing}
        onMeasurePing={measureFirestoreLatency}
        onTriggerSync={handleSyncFirestore}
        isSyncing={isSyncingFirestore || syncStatus === "syncing"}
        localPartsCount={drafts.length}
      />

      {/* CENTRUM WDROŻENIA GOOGLE CLOUD RUN BETA & DOCKER */}
      <CloudRunDeploymentModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
      />
    </div>
  );
}

export default App;
