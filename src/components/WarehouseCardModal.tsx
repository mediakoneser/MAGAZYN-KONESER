import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Camera,
  Upload,
  Image as ImageIcon,
  Images,
  Trash2,
  Star,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Car,
  Tag,
  Package,
  Calendar,
  User,
  CheckCircle2,
  Plus,
  Save,
  Edit,
  History,
  QrCode,
  ExternalLink,
  Layers,
  AlertCircle,
  FileText,
  Copy,
  Sparkles,
  Search,
  Check,
  HardDrive,
  Download,
} from "lucide-react";
import { PartItem, PartListingData, PartQualityGrade, PartStatus } from "../types";
import { compressImageFile, extractImagesFromClipboardEvent } from "../utils/imageOptimizer";
import { downloadAuctionPdf } from "../utils/auctionPdfGenerator";

interface WarehouseCardModalProps {
  isOpen: boolean;
  part: PartItem;
  onClose: () => void;
  onUpdatePart: (updatedPart: PartItem) => Promise<void> | void;
  onOpenHistory?: (part: PartItem) => void;
  onOpenAllegroEditor?: (part: PartItem) => void;
}

export const WarehouseCardModal: React.FC<WarehouseCardModalProps> = ({
  isOpen,
  part,
  onClose,
  onUpdatePart,
  onOpenHistory,
  onOpenAllegroEditor,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Active selected image index in gallery
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [isFullscreenGallery, setIsFullscreenGallery] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [urlInput, setUrlInput] = useState<string>("");
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
  const [isEditingData, setIsEditingData] = useState<boolean>(false);
  const [isSavedToast, setIsSavedToast] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Local editable form state
  const [formData, setFormData] = useState<PartListingData>(() => ({
    ...part.listingData,
    zdjecia: part.listingData?.zdjecia ? [...part.listingData.zdjecia] : [],
  }));

  const [rackLocation, setRackLocation] = useState<string>(
    part.currentRackLocation || part.listingData?.ocr_wyniki?.numer_magazynowy || "MAG 14"
  );
  const [partStatus, setPartStatus] = useState<PartStatus>(part.status || "Dostępny");
  const [stockQuantity, setStockQuantity] = useState<number>(
    part.listingData?.ilosc ?? part.ilosc ?? 1
  );

  // Sync state if part changes
  useEffect(() => {
    setFormData({
      ...part.listingData,
      zdjecia: part.listingData?.zdjecia ? [...part.listingData.zdjecia] : [],
    });
    setRackLocation(part.currentRackLocation || part.listingData?.ocr_wyniki?.numer_magazynowy || "MAG 14");
    setPartStatus(part.status || "Dostępny");
    setStockQuantity(part.listingData?.ilosc ?? part.ilosc ?? 1);
    setSelectedImageIndex(0);
  }, [part]);

  const images = formData.zdjecia || [];

  // Clipboard paste listener
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!isOpen) return;
      const images = await extractImagesFromClipboardEvent(e);
      if (images && images.length > 0) {
        e.preventDefault();
        e.stopPropagation();

        const updatedImages = [...(formData.zdjecia || []), ...images];
        const updatedFormData = {
          ...formData,
          zdjecia: updatedImages,
        };
        setFormData(updatedFormData);

        const updatedPart: PartItem = {
          ...part,
          listingData: updatedFormData,
        };
        await onUpdatePart(updatedPart);

        setSelectedImageIndex(updatedImages.length - 1);
        showSavedFeedback();
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isOpen, formData, part, onUpdatePart]);

  if (!isOpen) return null;

  // Upload handler for files / camera
  const handleUploadFiles = async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    if (fileArr.length === 0) return;

    setIsUploading(true);
    const newCompressedImages: string[] = [];

    for (const file of fileArr) {
      try {
        const compressed = await compressImageFile(file, 1280, 1280, 0.85);
        if (compressed) {
          newCompressedImages.push(compressed);
        }
      } catch (err) {
        console.warn("Błąd kompresji zdjęcia:", err);
      }
    }

    if (newCompressedImages.length > 0) {
      const updatedImages = [...(formData.zdjecia || []), ...newCompressedImages];
      const updatedFormData = {
        ...formData,
        zdjecia: updatedImages,
      };
      setFormData(updatedFormData);

      // Auto persist
      const updatedPart: PartItem = {
        ...part,
        listingData: updatedFormData,
      };
      await onUpdatePart(updatedPart);

      // Switch gallery to newest uploaded photo
      setSelectedImageIndex(updatedImages.length - 1);
      showSavedFeedback();
    }

    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  // Add image by URL
  const handleAddImageUrl = async () => {
    if (!urlInput.trim()) return;
    const cleanUrl = urlInput.trim();
    const updatedImages = [...(formData.zdjecia || []), cleanUrl];
    const updatedFormData = {
      ...formData,
      zdjecia: updatedImages,
    };
    setFormData(updatedFormData);
    setUrlInput("");
    setShowUrlInput(false);

    const updatedPart: PartItem = {
      ...part,
      listingData: updatedFormData,
    };
    await onUpdatePart(updatedPart);
    setSelectedImageIndex(updatedImages.length - 1);
    showSavedFeedback();
  };

  // Delete image
  const handleDeleteImage = async (indexToDelete: number) => {
    const updatedImages = (formData.zdjecia || []).filter((_, idx) => idx !== indexToDelete);
    const updatedFormData = {
      ...formData,
      zdjecia: updatedImages,
    };
    setFormData(updatedFormData);

    if (selectedImageIndex >= updatedImages.length) {
      setSelectedImageIndex(Math.max(0, updatedImages.length - 1));
    }

    const updatedPart: PartItem = {
      ...part,
      listingData: updatedFormData,
    };
    await onUpdatePart(updatedPart);
    showSavedFeedback();
  };

  // Set as primary/cover photo (move to index 0)
  const handleSetPrimaryImage = async (indexToPrimary: number) => {
    if (indexToPrimary === 0 || !formData.zdjecia) return;
    const targetImage = formData.zdjecia[indexToPrimary];
    const remaining = formData.zdjecia.filter((_, idx) => idx !== indexToPrimary);
    const updatedImages = [targetImage, ...remaining];

    const updatedFormData = {
      ...formData,
      zdjecia: updatedImages,
    };
    setFormData(updatedFormData);
    setSelectedImageIndex(0);

    const updatedPart: PartItem = {
      ...part,
      listingData: updatedFormData,
    };
    await onUpdatePart(updatedPart);
    showSavedFeedback();
  };

  const showSavedFeedback = () => {
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 2500);
  };

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Save general form edits
  const handleSaveAllDetails = async () => {
    const updatedFormData: PartListingData = {
      ...formData,
      ilosc: stockQuantity,
      stan_magazynowy: stockQuantity,
      ocr_wyniki: {
        ...(formData.ocr_wyniki || {}),
        numer_magazynowy: rackLocation,
      },
    };

    const updatedPart: PartItem = {
      ...part,
      currentRackLocation: rackLocation,
      status: partStatus,
      ilosc: stockQuantity,
      listingData: updatedFormData,
      updatedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    };

    await onUpdatePart(updatedPart);
    setIsEditingData(false);
    showSavedFeedback();
  };

  const vehicle = formData.samochod || {
    marka: formData.marka || "Skoda",
    model: formData.model || "Fabia",
    rocznik: formData.rocznik || "",
    vin: part.vehicleVin || "",
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* HEADER BAR */}
        <div className="bg-[#030712] border-b border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-yellow-400/10 border border-yellow-400/30 rounded-lg text-yellow-400 shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-yellow-400/15 text-yellow-300 border border-yellow-400/30">
                  {rackLocation}
                </span>
                <span className="text-[10px] font-mono text-slate-400 truncate">
                  ID: {part.id} | {part.barcode || `KNS-${part.id}`}
                </span>
                {isSavedToast && (
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1 animate-pulse">
                    <CheckCircle2 className="w-3 h-3" /> Zapisano zmiany
                  </span>
                )}
              </div>
              <h2 className="text-sm sm:text-base font-black text-white truncate mt-0.5">
                {formData.kategoria || "Karta Magazynowa WMS"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* GOOGLE DRIVE PDF LINK */}
            {(part.drivePdfUrl || part.listingData?.drivePdfUrl) && (
              <a
                href={part.drivePdfUrl || part.listingData?.drivePdfUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer font-mono"
                title={`Otwórz szablon aukcji PDF zapisany w ${part.driveFolder || "/Parts/Inventory/..."} na Dysku Google`}
              >
                <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Dysk Google PDF</span>
              </a>
            )}

            {/* DOWNLOAD AUCTION PDF TEMPLATE */}
            <button
              type="button"
              onClick={() => downloadAuctionPdf(part)}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer font-mono"
              title="Pobierz gotowy szablon aukcji w formacie PDF (A4 z kodem QR i specyfikacją)"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Szablon PDF</span>
            </button>

            {onOpenAllegroEditor && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAllegroEditor(part);
                }}
                className="px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 font-black rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md"
                title="Wystaw lub edytuj ofertę w Allegro Sales Center (1-Klik)"
              >
                <Layers className="w-3.5 h-3.5 text-slate-950" />
                <span className="hidden sm:inline">Allegro Sales Center (1-Klik)</span>
              </button>
            )}
            {onOpenHistory && (
              <button
                onClick={() => {
                  onClose();
                  onOpenHistory(part);
                }}
                className="px-2.5 py-1.5 bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/30 text-yellow-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer font-mono"
                title="Otwórz pełną historię części, ślad audytowy i kody QR"
              >
                <History className="w-3.5 h-3.5 text-yellow-400" />
                <span className="hidden sm:inline">Historia & QR</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MAIN BODY: 2 COLUMNS (GALLERY & DETAILS) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEWA KOLUMNA: GALERIA I MULTI-UPLOAD ZDJĘĆ (LG: COL-7) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-[#030712] border border-slate-800 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Images className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      Galeria Zdjęć Części ({images.length})
                    </span>
                  </div>

                  {/* UPLOAD ACTIONS */}
                  <div className="flex items-center gap-1.5">
                    {/* Native File Upload */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => e.target.files && handleUploadFiles(e.target.files)}
                      className="hidden"
                    />
                    {/* Camera Direct Capture */}
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      onChange={(e) => e.target.files && handleUploadFiles(e.target.files)}
                      className="hidden"
                    />

                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={isUploading}
                      className="px-2.5 py-1 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer font-mono"
                      title="Zrób zdjęcie aparatem ze smartfona lub tabletu"
                    >
                      <Camera className="w-3.5 h-3.5 text-teal-400" />
                      <span className="hidden sm:inline">Aparat</span>
                    </button>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="px-2.5 py-1 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs font-mono"
                      title="Wgraj jedno lub kilka zdjęć z komputera"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploading ? "Wgrywanie..." : "Dodaj zdjęcia"}</span>
                    </button>

                    <button
                      onClick={() => setShowUrlInput(!showUrlInput)}
                      className="p-1 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg transition"
                      title="Dodaj zdjęcie przez link URL"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* OPTIONAL URL INPUT */}
                {showUrlInput && (
                  <div className="flex items-center gap-2 bg-[#070b14] p-2 rounded-lg border border-slate-800 animate-in fade-in">
                    <input
                      type="url"
                      placeholder="Wklej bezpośredni link do zdjęcia (https://...)"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                    />
                    <button
                      onClick={handleAddImageUrl}
                      className="px-3 py-1 bg-yellow-400 text-slate-950 font-bold text-xs rounded hover:bg-yellow-300 transition"
                    >
                      Dodaj URL
                    </button>
                  </div>
                )}

                {/* MAIN LARGE PHOTO DISPLAY */}
                <div className="relative rounded-xl overflow-hidden bg-black border border-slate-850 aspect-4/3 flex items-center justify-center group select-none">
                  {images.length > 0 ? (
                    <>
                      <img
                        src={images[selectedImageIndex] || images[0]}
                        alt={formData.kategoria}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain cursor-zoom-in transition-transform duration-300 group-hover:scale-102"
                        onClick={() => setIsFullscreenGallery(true)}
                      />

                      {/* BADGE: GŁÓWNE ZDJĘCIE */}
                      {selectedImageIndex === 0 && (
                        <div className="absolute top-2.5 left-2.5 bg-yellow-400 text-slate-950 text-[10px] font-black font-mono px-2 py-0.5 rounded shadow-md flex items-center gap-1">
                          <Star className="w-3 h-3 fill-slate-950" />
                          <span>ZDJĘCIE GŁÓWNE (OKŁADKA)</span>
                        </div>
                      )}

                      {/* COUNTER BADGE */}
                      <div className="absolute bottom-2.5 right-2.5 bg-black/75 backdrop-blur-sm text-slate-300 text-[11px] font-mono px-2 py-0.5 rounded border border-white/10">
                        {selectedImageIndex + 1} / {images.length}
                      </div>

                      {/* CONTROLS: PREV / NEXT */}
                      {images.length > 1 && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
                            }}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition opacity-70 group-hover:opacity-100 cursor-pointer border border-white/10"
                            title="Poprzednie zdjęcie"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition opacity-70 group-hover:opacity-100 cursor-pointer border border-white/10"
                            title="Następne zdjęcie"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </>
                      )}

                      {/* FULLSCREEN BUTTON */}
                      <button
                        onClick={() => setIsFullscreenGallery(true)}
                        className="absolute top-2.5 right-2.5 p-1.5 bg-black/60 hover:bg-black/90 text-white rounded-lg transition opacity-70 group-hover:opacity-100 cursor-pointer border border-white/10"
                        title="Otwórz pełny ekran (HD)"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>

                      {/* ACTIONS ON ACTIVE IMAGE */}
                      <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {selectedImageIndex !== 0 && (
                          <button
                            onClick={() => handleSetPrimaryImage(selectedImageIndex)}
                            className="px-2 py-1 bg-yellow-400/90 hover:bg-yellow-400 text-slate-950 text-[10px] font-bold rounded flex items-center gap-1 cursor-pointer shadow font-mono"
                            title="Ustaw to zdjęcie jako główne (będzie wyświetlane na liście i miniaturkach)"
                          >
                            <Star className="w-3 h-3" /> Ustaw jako główne
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteImage(selectedImageIndex)}
                          className="px-2 py-1 bg-rose-600/90 hover:bg-rose-600 text-white text-[10px] font-bold rounded flex items-center gap-1 cursor-pointer shadow font-mono"
                          title="Usuń to zdjęcie"
                        >
                          <Trash2 className="w-3 h-3" /> Usuń
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-6 space-y-2">
                      <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <p className="text-xs text-slate-400 font-mono">Brak przypisanych zdjęć do tej części</p>
                      <p className="text-[11px] text-slate-500">
                        Przeciągnij pliki, kliknij <b>Dodaj zdjęcia</b> lub wklej ze schowka (<b>Ctrl+V</b>)
                      </p>
                    </div>
                  )}
                </div>

                {/* THUMBNAILS CAROUSEL */}
                {images.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin pt-1">
                    {images.map((img, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-lg overflow-hidden border-2 cursor-pointer transition group/thumb ${
                          selectedImageIndex === idx
                            ? "border-yellow-400 ring-2 ring-yellow-400/30"
                            : "border-slate-800 hover:border-slate-600 opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={img}
                          alt={`Miniaturka ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        {idx === 0 && (
                          <div className="absolute top-0.5 left-0.5 bg-yellow-400 text-slate-950 p-0.5 rounded shadow">
                            <Star className="w-2.5 h-2.5 fill-slate-950" />
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteImage(idx);
                          }}
                          className="absolute top-0.5 right-0.5 bg-rose-600 text-white p-0.5 rounded opacity-0 group-hover/thumb:opacity-100 transition"
                          title="Usuń miniaturkę"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}

                    {/* Quick Add Thumbnail Button */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-lg border-2 border-dashed border-slate-800 hover:border-yellow-400/60 bg-slate-950/50 flex flex-col items-center justify-center text-slate-500 hover:text-yellow-400 transition cursor-pointer"
                      title="Dodaj kolejne zdjęcie"
                    >
                      <Plus className="w-5 h-5" />
                      <span className="text-[9px] font-mono mt-0.5">Dodaj</span>
                    </button>
                  </div>
                )}

                {/* DROPZONE HELPER FOOTER */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files) handleUploadFiles(e.dataTransfer.files);
                  }}
                  className="border border-dashed border-slate-800 hover:border-yellow-400/40 rounded-lg p-2 text-center text-[10px] text-slate-400 font-mono bg-[#070b14]"
                >
                  Możesz przeciągnąć i upuścić pliki ze zdjęciami tutaj lub wkleić bezpośrednio (Ctrl + V).
                </div>
              </div>
            </div>

            {/* PRAWA KOLUMNA: DANE KARTY MAGAZYNOWEJ WMS (LG: COL-5) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[#030712] border border-slate-800 rounded-xl p-4 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-yellow-400" />
                    Szczegóły Magazynowe WMS
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isEditingData ? (
                      <button
                        onClick={handleSaveAllDetails}
                        className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer font-mono"
                      >
                        <Save className="w-3.5 h-3.5" /> Zapisz
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsEditingData(true)}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer font-mono"
                      >
                        <Edit className="w-3.5 h-3.5 text-yellow-400" /> Edytuj
                      </button>
                    )}
                  </div>
                </div>

                {/* FORM FIELDS */}
                <div className="space-y-3 text-xs">
                  {/* KATEGORIA / NAZWA CZĘŚCI */}
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                      Kategoria Części / Nazwa
                    </label>
                    {isEditingData ? (
                      <input
                        type="text"
                        value={formData.kategoria}
                        onChange={(e) => setFormData({ ...formData, kategoria: e.target.value })}
                        className="w-full bg-[#070b14] border border-slate-800 focus:border-yellow-400 rounded-lg px-2.5 py-1.5 text-white text-xs font-semibold"
                      />
                    ) : (
                      <div className="text-white font-bold bg-[#070b14] p-2 rounded-lg border border-slate-850">
                        {formData.kategoria}
                      </div>
                    )}
                  </div>

                  {/* POJAZD DAWCA & VIN */}
                  <div className="p-2.5 bg-[#070b14] rounded-lg border border-slate-850 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
                        <Car className="w-3 h-3 text-teal-400" /> Pojazd Dawca
                      </span>
                      {part.vehicleInternalNo && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-yellow-400/15 text-yellow-300 border border-yellow-400/30 rounded">
                          {part.vehicleInternalNo}
                        </span>
                      )}
                    </div>
                    {isEditingData ? (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Marka"
                          value={vehicle.marka || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              samochod: { ...(formData.samochod || {}), marka: e.target.value },
                            })
                          }
                          className="bg-[#030712] border border-slate-800 rounded px-2 py-1 text-white text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Model"
                          value={vehicle.model || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              samochod: { ...(formData.samochod || {}), model: e.target.value },
                            })
                          }
                          className="bg-[#030712] border border-slate-800 rounded px-2 py-1 text-white text-xs"
                        />
                      </div>
                    ) : (
                      <div className="text-slate-200 font-semibold">
                        {vehicle.marka} {vehicle.model} {vehicle.rocznik && `(${vehicle.rocznik})`}
                      </div>
                    )}

                    {vehicle.vin && (
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
                        <span>VIN: {vehicle.vin}</span>
                        <button
                          onClick={() => handleCopy(vehicle.vin || "", "vin")}
                          className="hover:text-yellow-400 p-0.5"
                          title="Kopiuj VIN"
                        >
                          {copiedField === "vin" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* REGAŁ WMS, STATUS I ILOŚĆ */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                        Regał WMS
                      </label>
                      {isEditingData ? (
                        <input
                          type="text"
                          value={rackLocation}
                          onChange={(e) => setRackLocation(e.target.value.toUpperCase())}
                          className="w-full bg-[#070b14] border border-yellow-400/50 rounded-lg px-2 py-1.5 text-yellow-400 font-mono font-bold text-xs"
                        />
                      ) : (
                        <div className="bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 font-mono font-bold px-2 py-1.5 rounded-lg text-center">
                          {rackLocation}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                        Status
                      </label>
                      {isEditingData ? (
                        <select
                          value={partStatus}
                          onChange={(e) => setPartStatus(e.target.value as PartStatus)}
                          className="w-full bg-[#070b14] border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200 text-xs"
                        >
                          <option value="Dostępny">Dostępny</option>
                          <option value="Zarezerwowany">Zarezerwowany</option>
                          <option value="Sprzedany">Sprzedany</option>
                          <option value="W przygotowaniu">W przygotowaniu</option>
                          <option value="Zutylizowany">Zutylizowany</option>
                        </select>
                      ) : (
                        <div
                          className={`font-mono font-bold px-2 py-1.5 rounded-lg text-center ${
                            partStatus === "Dostępny"
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              : partStatus === "Zarezerwowany"
                              ? "bg-yellow-400/15 text-yellow-300 border border-yellow-400/30"
                              : "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                          }`}
                        >
                          {partStatus}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                        Stan (szt.)
                      </label>
                      {isEditingData ? (
                        <input
                          type="number"
                          min="0"
                          value={stockQuantity}
                          onChange={(e) => setStockQuantity(Number(e.target.value))}
                          className="w-full bg-[#070b14] border border-slate-800 rounded-lg px-2 py-1.5 text-white font-mono font-bold text-xs text-center"
                        />
                      ) : (
                        <div className="bg-[#070b14] border border-slate-850 text-white font-mono font-bold px-2 py-1.5 rounded-lg text-center">
                          {stockQuantity} szt.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* NUMERY OEM & OZNACZENIE */}
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                      Numery Części (OEM / Zamienniki)
                    </label>
                    {isEditingData ? (
                      <input
                        type="text"
                        value={formData.numery_czesci || ""}
                        onChange={(e) => setFormData({ ...formData, numery_czesci: e.target.value })}
                        placeholder="np. 6Y6945111"
                        className="w-full bg-[#070b14] border border-slate-800 focus:border-yellow-400 rounded-lg px-2.5 py-1.5 text-yellow-300 font-mono text-xs"
                      />
                    ) : (
                      <div className="bg-[#070b14] p-2 rounded-lg border border-slate-850 font-mono text-yellow-300 flex items-center justify-between">
                        <span>{formData.numery_czesci || "Brak numeru OEM"}</span>
                        {formData.numery_czesci && (
                          <button
                            onClick={() => handleCopy(formData.numery_czesci, "oem")}
                            className="hover:text-white p-0.5 text-slate-400"
                            title="Kopiuj numer OEM"
                          >
                            {copiedField === "oem" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* CENA BRUTTO & NETTO */}
                  <div className="p-3 bg-[#070b14] rounded-lg border border-slate-850 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">Cena Sprzedaży</span>
                      {isEditingData ? (
                        <div className="flex items-center gap-1 mt-1">
                          <input
                            type="number"
                            value={formData.cena?.brutto || 0}
                            onChange={(e) => {
                              const b = Number(e.target.value) || 0;
                              const n = Math.round(b / 1.23);
                              setFormData({ ...formData, cena: { brutto: b, netto: n } });
                            }}
                            className="w-24 bg-[#030712] border border-slate-800 rounded px-2 py-1 text-emerald-400 font-black text-sm font-mono"
                          />
                          <span className="text-emerald-400 font-bold font-mono">PLN brutto</span>
                        </div>
                      ) : (
                        <div className="text-lg font-black text-emerald-400 font-mono">
                          {formData.cena?.brutto || 0} PLN <span className="text-[11px] text-slate-400 font-normal">brutto</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono text-slate-500 uppercase block">Wartość Netto (VAT 23%)</span>
                      <span className="text-xs font-mono text-slate-300 font-semibold">
                        {formData.cena?.netto || Math.round((formData.cena?.brutto || 0) / 1.23)} PLN netto
                      </span>
                    </div>
                  </div>

                  {/* OPIS STANU I UWAGI */}
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                      Opis Stanu i Parametry
                    </label>
                    {isEditingData ? (
                      <textarea
                        rows={3}
                        value={formData.opis || ""}
                        onChange={(e) => setFormData({ ...formData, opis: e.target.value })}
                        className="w-full bg-[#070b14] border border-slate-800 focus:border-yellow-400 rounded-lg p-2 text-slate-200 text-xs leading-relaxed"
                      />
                    ) : (
                      <div className="bg-[#070b14] p-2.5 rounded-lg border border-slate-850 text-slate-300 text-xs leading-relaxed max-h-28 overflow-y-auto">
                        {formData.opis || "Brak opisu technicznego."}
                      </div>
                    )}
                  </div>

                  {/* METADANE DEMONTAŻU */}
                  <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-yellow-400" />
                      <span>{part.dismantledByWorker || formData.workerName || "Demontażysta"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-end">
                      <Calendar className="w-3.5 h-3.5 text-teal-400" />
                      <span>{part.createdAt || "2026-08-28"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-[#030712] border-t border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] font-mono text-slate-400 hidden sm:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>WMS PHU U Konesera - Mysłakowice</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-bold transition cursor-pointer font-mono"
            >
              Zamknij
            </button>

            {isEditingData && (
              <button
                onClick={handleSaveAllDetails}
                className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-lg text-xs font-black transition cursor-pointer shadow-xs font-mono flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Zapisz zmiany w karcie</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FULLSCREEN LIGHTBOX GALLERY MODAL */}
      {isFullscreenGallery && images.length > 0 && (
        <div
          className="fixed inset-0 z-60 bg-black/95 flex flex-col justify-between p-4 animate-in fade-in"
          onClick={() => setIsFullscreenGallery(false)}
        >
          <div className="flex items-center justify-between text-white z-10 px-2 py-1">
            <div className="font-mono text-xs font-bold text-yellow-400 flex items-center gap-2">
              <span>{formData.kategoria}</span>
              <span className="text-slate-400">({selectedImageIndex + 1} / {images.length})</span>
            </div>
            <button
              onClick={() => setIsFullscreenGallery(false)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white cursor-pointer transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div
            className="flex-1 flex items-center justify-center p-2 relative select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[selectedImageIndex]}
              alt={formData.kategoria}
              className="max-h-[85vh] max-w-[95vw] object-contain rounded-lg shadow-2xl"
            />

            {images.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                  className="absolute left-4 p-3 bg-black/70 hover:bg-black/90 text-white rounded-full transition cursor-pointer border border-white/20"
                >
                  <ChevronLeft className="w-7 h-7" />
                </button>
                <button
                  onClick={() => setSelectedImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                  className="absolute right-4 p-3 bg-black/70 hover:bg-black/90 text-white rounded-full transition cursor-pointer border border-white/20"
                >
                  <ChevronRight className="w-7 h-7" />
                </button>
              </>
            )}
          </div>

          <div className="flex justify-center gap-2 overflow-x-auto py-2" onClick={(e) => e.stopPropagation()}>
            {images.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt=""
                onClick={() => setSelectedImageIndex(idx)}
                className={`w-14 h-14 object-cover rounded cursor-pointer border-2 transition ${
                  selectedImageIndex === idx ? "border-yellow-400 scale-105" : "border-transparent opacity-60 hover:opacity-100"
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
