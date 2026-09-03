import React, { useState, useEffect, useRef } from "react";
import {
  HardDrive,
  FolderPlus,
  Upload,
  RefreshCw,
  Search,
  Folder,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  FileCode,
  File as GenericFile,
  Trash2,
  ExternalLink,
  Download,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Database,
  ArrowLeft,
  Loader2,
  LogOut,
  User,
  Info,
  Check,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  FileCheck,
  Layers,
} from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import {
  DriveFile,
  DriveAboutInfo,
  getDriveAbout,
  listDriveFiles,
  createDriveFolder,
  uploadFileToDrive,
  deleteDriveFile,
  backupCatalogToDrive,
  ensureWmsFolder,
  ensurePartsInventoryDateFolder,
  uploadAuctionPdfToDrive,
  syncMissingAuctionPdfsToDrive,
  isDriveAutoSyncEnabled,
  setDriveAutoSyncEnabled,
  formatBytes,
} from "../lib/googleDriveService";
import { downloadAuctionPdf } from "../utils/auctionPdfGenerator";
import { PartItem } from "../types";

interface GoogleDriveTabProps {
  parts: PartItem[];
  onNotify?: (title: string, message: string, priority?: "info" | "success" | "warning" | "critical") => void;
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

export const GoogleDriveTab: React.FC<GoogleDriveTabProps> = ({
  parts,
  onNotify,
}) => {
  const { user, accessToken, signInWithGoogle, signOut, loading: authLoading } = useAuth();

  const [aboutInfo, setAboutInfo] = useState<DriveAboutInfo | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Navigation & filtering
  const [currentFolderId, setCurrentFolderId] = useState<string>("root");
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: "root", name: "Mój Dysk" },
  ]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterType, setFilterType] = useState<"all" | "folder" | "json" | "csv" | "image">("all");

  // Creation & upload states
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>("");
  const [isBackingUpWms, setIsBackingUpWms] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);

  // Destructive deletion modal (MANDATORY per Workspace Integration skill)
  const [fileToDelete, setFileToDelete] = useState<DriveFile | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Automated /Parts/Inventory/YYYY-MM-DD sync state
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => isDriveAutoSyncEnabled());
  const [isSyncingAllPdfs, setIsSyncingAllPdfs] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; file: string } | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);
  const targetInventoryPath = `/Parts/Inventory/${todayStr}`;

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load about info & files when accessToken changes or folder changes
  const loadData = async (token: string, folderId: string, search: string, filter: string) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch about info if not loaded
      getDriveAbout(token)
        .then((info) => setAboutInfo(info))
        .catch((e) => console.warn("Could not fetch about info:", e));

      // 2. Fetch files
      const filterArg = filter === "all" ? undefined : filter;
      const res = await listDriveFiles(token, {
        folderId: search ? undefined : folderId,
        searchQuery: search || undefined,
        mimeTypeFilter: filterArg,
      });

      setFiles(res.files || []);
    } catch (err: any) {
      console.error("Error loading Drive files:", err);
      setError(err.message || "Nie udało się załadować zawartości Dysku Google.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      loadData(accessToken, currentFolderId, searchQuery, filterType);
    }
  }, [accessToken, currentFolderId, filterType]);

  const handleRefresh = () => {
    if (accessToken) {
      loadData(accessToken, currentFolderId, searchQuery, filterType);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessToken) {
      loadData(accessToken, currentFolderId, searchQuery, filterType);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    if (accessToken) {
      loadData(accessToken, currentFolderId, "", filterType);
    }
  };

  // Folder navigation
  const navigateToFolder = (folderId: string, folderName: string) => {
    setBreadcrumbs((prev) => [...prev, { id: folderId, name: folderName }]);
    setCurrentFolderId(folderId);
    setSearchQuery("");
  };

  const navigateToBreadcrumb = (index: number) => {
    const target = breadcrumbs[index];
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    setCurrentFolderId(target.id);
    setSearchQuery("");
  };

  // Google Sign-In handler
  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      const res = await signInWithGoogle();
      if (res?.accessToken) {
        setSuccessMessage("Pomyślnie połączono z Dyskiem Google!");
        if (onNotify) {
          onNotify("Dysk Google", "Pomyślnie uwierzytelniono i połączono z Dyskiem Google.", "success");
        }
      }
    } catch (err: any) {
      setError(err.message || "Błąd logowania przez Google.");
    } finally {
      setIsSigningIn(false);
    }
  };

  // Create folder handler
  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !accessToken) return;
    setLoading(true);
    try {
      const targetParent = currentFolderId === "root" ? undefined : currentFolderId;
      await createDriveFolder(accessToken, newFolderName.trim(), targetParent);
      setNewFolderName("");
      setIsCreatingFolder(false);
      setSuccessMessage(`Utworzono folder: "${newFolderName.trim()}"`);
      await loadData(accessToken, currentFolderId, searchQuery, filterType);
    } catch (err: any) {
      setError(err.message || "Błąd podczas tworzenia folderu.");
    } finally {
      setLoading(false);
    }
  };

  // Upload file handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || !accessToken) return;

    setIsUploading(true);
    setError(null);
    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const targetParent = currentFolderId === "root" ? undefined : currentFolderId;
        await uploadFileToDrive(accessToken, {
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          content: file,
          parentId: targetParent,
        });
      }
      setSuccessMessage(`Pomyślnie wgrano ${fileList.length} plik(ów) na Dysk Google.`);
      if (onNotify) {
        onNotify("Dysk Google", `Wgrano ${fileList.length} plik(ów) do folderu na Dysku.`, "success");
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadData(accessToken, currentFolderId, searchQuery, filterType);
    } catch (err: any) {
      setError(err.message || "Błąd wgrywania pliku.");
    } finally {
      setIsUploading(false);
    }
  };

  // Backup entire WMS to Drive
  const handleBackupWms = async () => {
    if (!accessToken) return;
    setIsBackingUpWms(true);
    setError(null);
    try {
      const backupFile = await backupCatalogToDrive(accessToken, parts);
      setSuccessMessage(`Utworzono pełną kopię zapasową WMS: ${backupFile.name}`);
      if (onNotify) {
        onNotify(
          "Kopia WMS w Drive",
          `Zapisano kopię zapasową ${parts.length} części w folderze PHU U Konesera na Dysku Google.`,
          "success"
        );
      }
      await loadData(accessToken, currentFolderId, searchQuery, filterType);
    } catch (err: any) {
      setError(err.message || "Błąd tworzenia kopii zapasowej.");
    } finally {
      setIsBackingUpWms(false);
    }
  };

  // Open / Ensure standard WMS folder
  const handleOpenWmsFolder = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const folderId = await ensureWmsFolder(accessToken);
      navigateToFolder(folderId, "PHU U Konesera - Magazyn WMS");
    } catch (err: any) {
      setError(err.message || "Nie udało się otworzyć folderu WMS.");
    } finally {
      setLoading(false);
    }
  };

  // Toggle automated PDF upload on part creation
  const handleToggleAutoSync = () => {
    const next = !autoSyncEnabled;
    setAutoSyncEnabled(next);
    setDriveAutoSyncEnabled(next);
    if (onNotify) {
      onNotify(
        "Dysk Google",
        next
          ? "Włączono automatyczne tworzenie /Parts/Inventory/YYYY-MM-DD i eksport szablonów PDF."
          : "Wyłączono automatyczny eksport szablonów PDF do Dysku Google.",
        "info"
      );
    }
  };

  // Open / Ensure today's /Parts/Inventory/YYYY-MM-DD folder
  const handleOpenTodayPartsFolder = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const { folderId, folderPath } = await ensurePartsInventoryDateFolder(accessToken);
      setBreadcrumbs([
        { id: "root", name: "Mój Dysk" },
        { id: "parts_folder", name: "Parts" },
        { id: "inventory_folder", name: "Inventory" },
        { id: folderId, name: todayStr },
      ]);
      setCurrentFolderId(folderId);
      setSuccessMessage(`Przejście do folderu aukcji części: ${folderPath}`);
      await loadData(accessToken, folderId, "", "all");
    } catch (err: any) {
      setError(err.message || "Nie udało się otworzyć folderu /Parts/Inventory/YYYY-MM-DD.");
    } finally {
      setLoading(false);
    }
  };

  // Batch export all parts' auction PDF templates to /Parts/Inventory/YYYY-MM-DD
  const handleSyncAllPdfs = async () => {
    if (!accessToken) return;
    setIsSyncingAllPdfs(true);
    setError(null);
    try {
      const res = await syncMissingAuctionPdfsToDrive(
        accessToken,
        parts,
        (current, total, file) => {
          setSyncProgress({ current, total, file });
        }
      );
      setSuccessMessage(`Pomyślnie wyeksportowano ${res.successCount} szablonów aukcji PDF do ${targetInventoryPath}`);
      if (onNotify) {
        onNotify(
          "Synchronizacja PDF z Dyskiem Google",
          `Zapisano ${res.successCount} plików PDF w ${targetInventoryPath}.`,
          "success"
        );
      }
      await loadData(accessToken, currentFolderId, searchQuery, filterType);
    } catch (err: any) {
      setError(err.message || "Błąd podczas masowej synchronizacji szablonów PDF.");
    } finally {
      setIsSyncingAllPdfs(false);
      setSyncProgress(null);
    }
  };

  // Delete file handler with explicit confirmation
  const handleConfirmDelete = async () => {
    if (!fileToDelete || !accessToken) return;
    setIsDeleting(true);
    try {
      await deleteDriveFile(accessToken, fileToDelete.id);
      setSuccessMessage(`Usunięto z Dysku Google: ${fileToDelete.name}`);
      if (onNotify) {
        onNotify("Dysk Google", `Trwale usunięto plik: ${fileToDelete.name}`, "info");
      }
      setFileToDelete(null);
      await loadData(accessToken, currentFolderId, searchQuery, filterType);
    } catch (err: any) {
      setError(err.message || "Błąd podczas usuwania pliku.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper for file icons
  const renderFileIcon = (file: DriveFile) => {
    if (file.mimeType === "application/vnd.google-apps.folder") {
      return <Folder className="w-5 h-5 text-amber-400 fill-amber-400/20 shrink-0" />;
    }
    if (file.mimeType.includes("image/")) {
      return <ImageIcon className="w-5 h-5 text-emerald-400 shrink-0" />;
    }
    if (file.mimeType === "application/json" || file.name.endsWith(".json")) {
      return <FileCode className="w-5 h-5 text-teal-400 shrink-0" />;
    }
    if (file.mimeType.includes("csv") || file.name.endsWith(".csv")) {
      return <FileSpreadsheet className="w-5 h-5 text-green-400 shrink-0" />;
    }
    if (file.mimeType.includes("pdf") || file.mimeType.includes("document") || file.mimeType.includes("text/")) {
      return <FileText className="w-5 h-5 text-blue-400 shrink-0" />;
    }
    return <GenericFile className="w-5 h-5 text-slate-400 shrink-0" />;
  };

  // Calculate quota percent
  const quotaUsage = aboutInfo?.storageQuota?.usage ? parseInt(aboutInfo.storageQuota.usage, 10) : 0;
  const quotaLimit = aboutInfo?.storageQuota?.limit ? parseInt(aboutInfo.storageQuota.limit, 10) : 0;
  const quotaPercent = quotaLimit > 0 ? Math.min(100, Math.round((quotaUsage / quotaLimit) * 100)) : 0;

  // Render view if user is not authenticated or accessToken is missing
  if (!accessToken) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 font-mono">
        {/* HERO CARD */}
        <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-xl">
          <div className="inline-flex p-3 bg-yellow-400/10 border border-yellow-400/30 rounded-2xl text-yellow-400 mb-2">
            <HardDrive className="w-10 h-10" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Integracja z Dyskiem Google (Google Drive)
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Połącz aplikację stacji demontażu <strong className="text-yellow-400">PHU U Konesera</strong> z Dyskiem Google,
            aby jednym kliknięciem archiwizować karty magazynowe WMS, eksportować pliki CSV dla Allegro oraz
            bezpiecznie przechowywać ujęcia i zdjęcia zdemontowanych części samochodowych.
          </p>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 max-w-lg mx-auto text-left text-xs space-y-2 text-slate-400">
            <div className="flex items-center gap-2 text-slate-200 font-bold">
              <Info className="w-4 h-4 text-teal-400" />
              <span>Możliwości po połączeniu z Dyskiem:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
              <li>Automatyczne tworzenie kopii zapasowej bazy WMS ({parts.length} części w pamięci).</li>
              <li>Dedykowany folder magazynowy: <code className="text-yellow-400">PHU U Konesera - Magazyn WMS</code>.</li>
              <li>Przeglądanie, wyszukiwanie i pobieranie plików z poziomu aplikacji.</li>
              <li>Wgrywanie zdjęć części bezpośrednio do chmury Google Drive.</li>
            </ul>
          </div>

          {/* OFFICIAL SIGN IN WITH GOOGLE BUTTON (MANDATORY GSI STYLE) */}
          <div className="pt-4 flex flex-col items-center justify-center gap-3">
            <button
              onClick={handleGoogleLogin}
              disabled={isSigningIn || authLoading}
              className="gsi-material-button cursor-pointer transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
              style={{
                backgroundColor: "#131314",
                color: "#e3e3e3",
                border: "1px solid #8e918f",
                borderRadius: "20px",
                padding: "10px 24px",
                display: "inline-flex",
                alignItems: "center",
                gap: "12px",
                fontSize: "14px",
                fontWeight: 600,
                fontFamily: "system-ui, -apple-system, sans-serif",
                cursor: "pointer",
              }}
            >
              <div className="gsi-material-button-icon" style={{ width: "20px", height: "20px" }}>
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block" }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span className="gsi-material-button-contents">
                {isSigningIn ? "Logowanie..." : "Połącz z Google Drive"}
              </span>
            </button>
            <p className="text-[10px] text-slate-500">
              Aplikacja uzyska dostęp do Twojego Dysku Google wyłącznie za Twoją zgodą.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Authenticated Drive UI
  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-5 space-y-4 font-mono text-slate-200">
      {/* TOP STATUS & PROFILE BAR */}
      <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-3 sm:p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          {aboutInfo?.user?.photoLink ? (
            <img
              src={aboutInfo.user.photoLink}
              alt="Avatar"
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full border border-yellow-400/40"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-yellow-400/20 border border-yellow-400/40 flex items-center justify-center text-yellow-400">
              <User className="w-5 h-5" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">
                {aboutInfo?.user?.displayName || user?.displayName || "Użytkownik Google"}
              </span>
              <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Połączono z Google Drive
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {aboutInfo?.user?.emailAddress || user?.email}
            </p>
          </div>
        </div>

        {/* STORAGE QUOTA & LOGOUT */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {aboutInfo?.storageQuota && (
            <div className="text-right">
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span>Pojemność Dysku:</span>
                <span className="font-bold text-yellow-400">
                  {formatBytes(quotaUsage)} / {quotaLimit > 0 ? formatBytes(quotaLimit) : "Bez limitu"}
                </span>
              </div>
              {quotaLimit > 0 && (
                <div className="w-32 bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                  <div
                    className={`h-full ${quotaPercent > 85 ? "bg-red-500" : "bg-yellow-400"}`}
                    style={{ width: `${quotaPercent}%` }}
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenWmsFolder}
              className="px-2.5 py-1.5 bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Przejdź do dedykowanego folderu stacji PHU U Konesera"
            >
              <Folder className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Folder WMS</span>
            </button>

            <button
              onClick={signOut}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-lg text-xs transition cursor-pointer"
              title="Rozłącz konto Google"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* SUCCESS & ERROR BANNERS */}
      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2.5 text-xs text-emerald-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:underline text-[10px]">
            Zamknij
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2.5 text-xs text-red-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:underline text-[10px]">
            Zamknij
          </button>
        </div>
      )}

      {/* DEDICATED /Parts/Inventory/YYYY-MM-DD AUTOMATION CARD */}
      <div className="bg-linear-to-r from-[#0b1120] via-slate-900 to-[#0b1120] border border-amber-500/40 rounded-xl p-4 shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="p-1 bg-amber-400/20 text-amber-400 rounded-md border border-amber-400/30">
                <FileCheck className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Automatyczna struktura folderów i szablony PDF aukcji
                <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full font-mono border border-amber-400/30">
                  {targetInventoryPath}
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Przy dodawaniu części w stacji demontażu system automatycznie tworzy na Dysku hierarchię{" "}
              <code className="text-amber-300 font-bold bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                /Parts/Inventory/{todayStr}
              </code>{" "}
              i wgrywa wygenerowany szablon aukcji PDF ze specyfikacją techniczną, zdjęciami oraz sygnaturą regałową.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end">
            {/* TOGGLE AUTO-SYNC */}
            <button
              onClick={handleToggleAutoSync}
              className={`px-3 py-2 rounded-lg border text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                autoSyncEnabled
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                  : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
              }`}
              title="Włącz/wyłącz automatyczny eksport PDF przy każdym zatwierdzeniu części"
            >
              {autoSyncEnabled ? (
                <>
                  <ToggleRight className="w-4 h-4 text-emerald-400" />
                  <span>Auto-eksport: WŁĄCZONY</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4 text-slate-500" />
                  <span>Auto-eksport: WYŁĄCZONY</span>
                </>
              )}
            </button>

            {/* OPEN TODAY'S FOLDER */}
            <button
              onClick={handleOpenTodayPartsFolder}
              disabled={loading}
              className="px-3 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              title="Przejdź bezpośrednio do folderu z dzisiejszą datą na Dysku Google"
            >
              <Folder className="w-4 h-4" />
              <span>Otwórz {todayStr}</span>
            </button>

            {/* BATCH SYNC PDFS */}
            <button
              onClick={handleSyncAllPdfs}
              disabled={isSyncingAllPdfs || loading}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 font-bold text-xs rounded-lg transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              title="Wygeneruj i wgraj szablony PDF dla wszystkich części z magazynu"
            >
              {isSyncingAllPdfs ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-400" />
              )}
              <span>{isSyncingAllPdfs ? "Generowanie..." : `Synchronizuj PDF (${parts.length})`}</span>
            </button>
          </div>
        </div>

        {/* PROGRESS BAR */}
        {syncProgress && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-300 truncate max-w-md">
                Wgrywanie szablonu: <strong className="text-white">{syncProgress.file}</strong>
              </span>
              <span className="text-slate-400 font-bold">
                {syncProgress.current} / {syncProgress.total} (
                {Math.round((syncProgress.current / syncProgress.total) * 100)}%)
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all duration-200"
                style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ACTIONS TOOLBAR */}
      <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5 shadow-xs">
        {/* BREADCRUMBS */}
        <div className="flex items-center gap-1 text-xs overflow-x-auto py-1 max-w-full">
          {breadcrumbs.length > 1 && (
            <button
              onClick={() => navigateToBreadcrumb(breadcrumbs.length - 2)}
              className="p-1 text-slate-400 hover:text-yellow-400 rounded hover:bg-slate-900 transition mr-1"
              title="Poziom wyżej"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.id}>
              {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />}
              <button
                onClick={() => navigateToBreadcrumb(idx)}
                className={`px-1.5 py-0.5 rounded transition truncate max-w-[140px] text-xs ${
                  idx === breadcrumbs.length - 1
                    ? "text-yellow-400 font-bold bg-yellow-400/10"
                    : "text-slate-400 hover:text-white"
                }`}
                title={crumb.name}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* BUTTONS: BACKUP, NEW FOLDER, UPLOAD, REFRESH */}
        <div className="flex flex-wrap items-center gap-2">
          {/* BACKUP WMS TO DRIVE */}
          <button
            onClick={handleBackupWms}
            disabled={isBackingUpWms || loading}
            className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
            title="Eksportuj pełną bazę części WMS do pliku JSON w Google Drive"
          >
            {isBackingUpWms ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Database className="w-3.5 h-3.5" />
            )}
            <span>{isBackingUpWms ? "Tworzenie kopii..." : `Kopia WMS (${parts.length})`}</span>
          </button>

          {/* NEW FOLDER BUTTON */}
          <button
            onClick={() => setIsCreatingFolder(true)}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Nowy folder</span>
          </button>

          {/* UPLOAD FILE BUTTON */}
          <label className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer">
            {isUploading ? (
              <Loader2 className="w-3.5 h-3.5 text-teal-400 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5 text-teal-400" />
            )}
            <span className="hidden sm:inline">{isUploading ? "Wgrywanie..." : "Wgraj plik"}</span>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
          </label>

          {/* REFRESH */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-lg text-xs transition cursor-pointer disabled:opacity-50"
            title="Odśwież pliki"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-yellow-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        {/* SEARCH FORM */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Szukaj plików na Dysku Google..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#030712] border border-slate-800 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-mono"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
            >
              ×
            </button>
          )}
        </form>

        {/* TYPE FILTERS */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {[
            { id: "all", label: "Wszystkie" },
            { id: "folder", label: "Foldery" },
            { id: "json", label: "Kopie WMS (JSON)" },
            { id: "csv", label: "Arkusze (CSV)" },
            { id: "image", label: "Zdjęcia" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as any)}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition whitespace-nowrap ${
                filterType === tab.id
                  ? "bg-yellow-400 text-slate-950 shadow-xs"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* NEW FOLDER MODAL / INLINE BAR */}
      {isCreatingFolder && (
        <div className="bg-slate-900/90 border border-amber-500/40 rounded-xl p-3 flex flex-wrap items-center gap-2 animate-in fade-in">
          <FolderPlus className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-bold text-amber-300">Nazwa nowego folderu:</span>
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            placeholder="np. Kopia_2026_Allegro lub Zdjecia_BMW"
            autoFocus
            className="flex-1 min-w-[200px] bg-[#030712] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-400"
          />
          <button
            onClick={handleCreateFolder}
            disabled={!newFolderName.trim()}
            className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer disabled:opacity-50"
          >
            Utwórz
          </button>
          <button
            onClick={() => {
              setIsCreatingFolder(false);
              setNewFolderName("");
            }}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition cursor-pointer"
          >
            Anuluj
          </button>
        </div>
      )}

      {/* FILES TABLE / GRID */}
      <div className="bg-[#0b1120] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="border-b border-slate-800 px-4 py-2.5 bg-slate-900/50 flex items-center justify-between text-xs text-slate-400 font-bold">
          <span>Nazwa pliku / elementu</span>
          <div className="flex items-center gap-6">
            <span className="hidden sm:inline">Rozmiar</span>
            <span className="hidden md:inline">Ostatnia modyfikacja</span>
            <span>Akcje</span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
            <span className="text-xs font-mono">Wczytywanie zawartości Google Drive...</span>
          </div>
        ) : files.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Folder className="w-10 h-10 mx-auto text-slate-700" />
            <p className="text-xs font-bold text-slate-400">Ten folder jest pusty</p>
            <p className="text-[11px] text-slate-600">
              Wgraj pliki lub kliknij "Kopia WMS", aby zarchiwizować dane magazynowe stacji demontażu.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {files.map((file) => {
              const isFolder = file.mimeType === "application/vnd.google-apps.folder";

              return (
                <div
                  key={file.id}
                  className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-900/40 transition group"
                >
                  {/* ICON & NAME */}
                  <div
                    className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                    onClick={() => {
                      if (isFolder) {
                        navigateToFolder(file.id, file.name);
                      } else if (file.webViewLink) {
                        window.open(file.webViewLink, "_blank");
                      }
                    }}
                  >
                    {renderFileIcon(file)}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs truncate font-bold ${
                            isFolder ? "text-yellow-400 hover:underline" : "text-slate-200"
                          }`}
                        >
                          {file.name}
                        </span>
                        {file.name.includes("Kopia_Zapasowa_WMS") && (
                          <span className="text-[9px] px-1 bg-teal-500/20 text-teal-300 rounded border border-teal-500/30">
                            WMS BACKUP
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* DETAILS & ACTIONS */}
                  <div className="flex items-center gap-4 text-xs shrink-0">
                    <span className="text-slate-400 text-[11px] hidden sm:inline w-16 text-right">
                      {isFolder ? "Folder" : formatBytes(file.size)}
                    </span>

                    <span className="text-slate-500 text-[11px] hidden md:inline w-28 text-right">
                      {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString("pl-PL") : "—"}
                    </span>

                    {/* ACTION ICONS */}
                    <div className="flex items-center gap-1">
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-slate-400 hover:text-yellow-400 rounded hover:bg-slate-800 transition"
                          title="Otwórz w Google Drive (nowa karta)"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}

                      {file.webContentLink && !isFolder && (
                        <a
                          href={file.webContentLink}
                          download
                          className="p-1.5 text-slate-400 hover:text-teal-400 rounded hover:bg-slate-800 transition"
                          title="Pobierz plik"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}

                      {/* DESTRUCTIVE ACTION BUTTON (OPENS CONFIRMATION DIALOG) */}
                      <button
                        onClick={() => setFileToDelete(file)}
                        className="p-1.5 text-slate-500 hover:text-red-400 rounded hover:bg-red-500/10 transition cursor-pointer"
                        title="Usuń z Dysku Google"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FOOTER INFO */}
      <div className="text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 px-1">
        <span>PHU U Konesera / KM Złom • Integracja z oficjalnym API Google Drive v3</span>
        <span>ID Projektu Google Cloud: wystawka-ai</span>
      </div>

      {/* MANDATORY USER CONFIRMATION DIALOG FOR DESTRUCTIVE OPERATION */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0b1120] border border-red-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Potwierdzenie usunięcia</h3>
                <p className="text-xs text-red-400 font-bold">Dysk Google (Operacja niszcząca)</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Czy na pewno chcesz trwale usunąć poniższy element z Dysku Google?
            </p>

            <div className="bg-[#030712] border border-slate-800 rounded-xl p-3 text-xs space-y-1">
              <div className="font-bold text-yellow-400 truncate flex items-center gap-2">
                {renderFileIcon(fileToDelete)}
                <span>{fileToDelete.name}</span>
              </div>
              <div className="text-[10px] text-slate-400 flex justify-between">
                <span>Typ: {fileToDelete.mimeType}</span>
                <span>Rozmiar: {formatBytes(fileToDelete.size)}</span>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 text-[11px] text-amber-300">
              Uwaga: Tej operacji nie można cofnąć. Plik zostanie trwale usunięty z Twojego konta Google Drive.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Anuluj
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>{isDeleting ? "Usuwanie..." : "Tak, usuń trwale"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
