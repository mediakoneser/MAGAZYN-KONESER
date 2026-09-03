import React, { useState } from "react";
import {
  ShoppingBag,
  Search,
  Car,
  Tag,
  PhoneCall,
  Check,
  Filter,
  X,
  Images,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Package,
  Layers,
  MapPin,
  Sparkles,
} from "lucide-react";
import { PartItem } from "../types";
import { smartMatchPart } from "../utils/smartSearch";
import { stripHtml } from "../utils/dataSanitizer";

interface OnlineShopTabProps {
  drafts: PartItem[];
}

export const OnlineShopTab: React.FC<OnlineShopTabProps> = ({ drafts }) => {
  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [orderedItem, setOrderedItem] = useState<PartItem | null>(null);
  const [galleryModalPart, setGalleryModalPart] = useState<PartItem | null>(null);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState<number>(0);

  const brands = Array.from(
    new Set(
      drafts
        .map((d) => d.listingData.samochod?.marka || d.listingData.marka)
        .filter(Boolean)
    )
  );

  const filtered = drafts.filter((d) => {
    const matchesSearch = smartMatchPart(d, search);
    const matchesBrand =
      selectedBrand === "all" ||
      (d.listingData.samochod?.marka || d.listingData.marka) === selectedBrand;
    return matchesSearch && matchesBrand;
  });

  const openGalleryModal = (item: PartItem, initialIndex: number = 0) => {
    setGalleryModalPart(item);
    setActiveGalleryIndex(initialIndex);
  };

  return (
    <div className="bg-[#0b0f19] border border-slate-800/90 rounded-xl p-3.5 sm:p-5 space-y-4 shadow-xs">
      <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 font-mono">
            <ShoppingBag className="w-4 h-4 text-yellow-400" />
            Katalog Części Online - PHU U KONESERA (ukonesera.pl)
          </h2>
          <p className="text-[11px] text-slate-400 font-mono">
            Dostępne od ręki zdemontowane oryginalne części samochodowe w Mysłakowicach • Zdjęcia rzeczywiste OE
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-yellow-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Smart Search (np. lampa fabia, turbo passat)..."
              title="Smart Search: Szukaj słów w dowolnej kolejności"
              className="bg-[#030712] border border-slate-800 hover:border-slate-700 pl-8 pr-7 py-1.5 rounded-lg text-xs text-white focus:outline-none focus:border-yellow-400 w-full transition font-mono"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-2 text-slate-400 hover:text-white p-0.5"
                title="Wyczyść"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="bg-[#030712] border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-yellow-400 cursor-pointer font-mono"
          >
            <option value="all">Wszystkie marki ({drafts.length})</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* PRODUCTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length > 0 ? (
          filtered.map((item) => {
            const v = item.listingData.samochod || {
              marka: item.listingData.marka || "Skoda",
              model: item.listingData.model || "Fabia",
              rocznik: item.listingData.rocznik || "",
            };
            const photos = item.listingData.zdjecia || [];
            const mainPhoto = photos[0];
            const rack = stripHtml(item.listingData.ocr_wyniki?.numer_magazynowy) || "MAG 14";

            return (
              <div
                key={item.id}
                className="bg-[#030712] border border-slate-800/90 rounded-xl overflow-hidden flex flex-col justify-between hover:border-slate-700 hover:shadow-lg transition group shadow-xs"
              >
                {/* PRODUCT CARD TOP / PHOTO GALLERY PREVIEW */}
                <div className="space-y-3">
                  <div className="relative aspect-[16/10] bg-black overflow-hidden group/img">
                    {mainPhoto ? (
                      <img
                        src={mainPhoto}
                        alt={item.listingData.kategoria}
                        className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300 cursor-pointer"
                        onClick={() => openGalleryModal(item, 0)}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-900/60 font-mono text-xs">
                        <ImageIcon className="w-8 h-8 mb-1 opacity-50" />
                        <span>Brak zdjęcia</span>
                      </div>
                    )}

                    {/* BADGES OVER PHOTO */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-black text-yellow-400 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded border border-yellow-400/40 font-mono shadow-xs">
                        {rack}
                      </span>
                      {item.status === "Dostępny" ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 backdrop-blur-md px-2 py-0.5 rounded border border-emerald-500/40 font-mono">
                          Dostępny
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-yellow-400 bg-yellow-950/80 backdrop-blur-md px-2 py-0.5 rounded border border-yellow-500/40 font-mono">
                          {item.status}
                        </span>
                      )}
                    </div>

                    {/* PHOTO COUNTER & QUICK LIGHTBOX BUTTON */}
                    {photos.length > 0 && (
                      <button
                        onClick={() => openGalleryModal(item, 0)}
                        className="absolute bottom-2.5 right-2.5 bg-black/80 hover:bg-black text-white text-[11px] font-mono font-bold px-2 py-1 rounded-lg border border-slate-700 backdrop-blur-md flex items-center gap-1.5 transition cursor-pointer shadow-md"
                        title="Otwórz pełną galerię zdjęć"
                      >
                        <Images className="w-3.5 h-3.5 text-yellow-400" />
                        <span>{photos.length} {photos.length === 1 ? "foto" : "zdjęcia"}</span>
                        <Maximize2 className="w-3 h-3 text-slate-400 ml-0.5" />
                      </button>
                    )}
                  </div>

                  {/* THUMBNAIL STRIP IF MULTIPLE PHOTOS */}
                  {photos.length > 1 && (
                    <div className="px-3 flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
                      {photos.slice(0, 4).map((p, idx) => (
                        <button
                          key={idx}
                          onClick={() => openGalleryModal(item, idx)}
                          className="w-12 h-10 rounded-md overflow-hidden border border-slate-800 hover:border-yellow-400 shrink-0 relative transition cursor-pointer"
                        >
                          <img src={p} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                          {idx === 3 && photos.length > 4 && (
                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-[10px] font-mono font-bold text-yellow-400">
                              +{photos.length - 4}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* CARD TEXT DETAILS */}
                  <div className="px-3.5 space-y-1.5">
                    <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-yellow-400 transition-colors leading-snug line-clamp-2">
                      {item.listingData.kategoria}
                    </h3>

                    <div className="text-xs text-slate-300 flex items-center gap-1.5 font-semibold">
                      <Car className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span className="truncate">
                        {v.marka} {v.model} {v.rocznik && `(${v.rocznik})`}
                      </span>
                    </div>

                    {item.listingData.numery_czesci && (
                      <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                        <Tag className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>OEM:</span>
                        <span className="text-slate-200 font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                          {item.listingData.numery_czesci}
                        </span>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed pt-1">
                      {item.listingData.opis}
                    </p>
                  </div>
                </div>

                {/* CARD FOOTER */}
                <div className="p-3.5 mt-3 pt-2.5 border-t border-slate-850 flex items-center justify-between">
                  <div>
                    <div className="text-base sm:text-lg font-black text-emerald-400 font-mono leading-none">
                      {item.listingData.cena?.brutto || 0} PLN
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                      netto: {item.listingData.cena?.netto || 0} PLN
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openGalleryModal(item, 0)}
                      className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition cursor-pointer"
                      title="Galeria zdjęć"
                    >
                      <Images className="w-4 h-4 text-yellow-400" />
                    </button>
                    <button
                      onClick={() => setOrderedItem(item)}
                      className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs rounded-lg transition cursor-pointer shadow-xs flex items-center gap-1 font-mono"
                    >
                      <span>Zamów</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs font-mono">
            Brak części pasujących do wybranych filtrów.
          </div>
        )}
      </div>

      {/* FULLSCREEN MULTI-IMAGE GALLERY LIGHTBOX MODAL */}
      {galleryModalPart && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-3 sm:p-6 animate-in fade-in duration-200">
          {/* TOP BAR */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 bg-yellow-400/20 border border-yellow-400/40 text-yellow-300 font-mono font-bold text-xs rounded-md">
                {stripHtml(galleryModalPart.listingData.ocr_wyniki?.numer_magazynowy) || "MAG 14"}
              </span>
              <div>
                <h3 className="font-bold text-white text-xs sm:text-sm">
                  {galleryModalPart.listingData.kategoria}
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  {galleryModalPart.listingData.samochod?.marka} {galleryModalPart.listingData.samochod?.model} • OEM: {galleryModalPart.listingData.numery_czesci || "Brak"}
                </p>
              </div>
            </div>

            <button
              onClick={() => setGalleryModalPart(null)}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 cursor-pointer transition"
              title="Zamknij galerię"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* MAIN IMAGE STAGE */}
          <div className="relative flex-1 flex items-center justify-center my-3 max-h-[70vh]">
            {galleryModalPart.listingData.zdjecia && galleryModalPart.listingData.zdjecia.length > 0 ? (
              <img
                src={galleryModalPart.listingData.zdjecia[activeGalleryIndex] || galleryModalPart.listingData.zdjecia[0]}
                alt="Zdjęcie części"
                className="max-h-full max-w-full object-contain rounded-lg shadow-2xl border border-slate-800"
              />
            ) : (
              <div className="text-slate-500 font-mono text-xs">Brak zdjęć dla tej części</div>
            )}

            {/* PREV / NEXT ARROWS */}
            {galleryModalPart.listingData.zdjecia && galleryModalPart.listingData.zdjecia.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setActiveGalleryIndex((prev) =>
                      prev === 0 ? (galleryModalPart.listingData.zdjecia?.length || 1) - 1 : prev - 1
                    )
                  }
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2.5 bg-black/70 hover:bg-black text-white rounded-full border border-slate-700 transition cursor-pointer backdrop-blur-sm"
                  title="Poprzednie zdjęcie"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() =>
                    setActiveGalleryIndex((prev) =>
                      prev === (galleryModalPart.listingData.zdjecia?.length || 1) - 1 ? 0 : prev + 1
                    )
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-black/70 hover:bg-black text-white rounded-full border border-slate-700 transition cursor-pointer backdrop-blur-sm"
                  title="Następne zdjęcie"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* BOTTOM THUMBNAILS & QUICK RESERVE ACTION */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800 pt-3">
            {/* THUMBNAILS */}
            <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
              {galleryModalPart.listingData.zdjecia?.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveGalleryIndex(idx)}
                  className={`w-14 h-12 rounded-lg overflow-hidden border-2 transition cursor-pointer shrink-0 ${
                    activeGalleryIndex === idx
                      ? "border-yellow-400 shadow-md ring-2 ring-yellow-400/20"
                      : "border-slate-800 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt={`Miniaturka ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-xs text-slate-400 font-mono block">Cena brutto</span>
                <span className="text-base font-black text-emerald-400 font-mono">
                  {galleryModalPart.listingData.cena?.brutto || 0} PLN
                </span>
              </div>
              <button
                onClick={() => {
                  const part = galleryModalPart;
                  setGalleryModalPart(null);
                  setOrderedItem(part);
                }}
                className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs rounded-lg transition cursor-pointer shadow-lg font-mono flex items-center gap-1.5"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Zarezerwuj / Zadzwoń</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ORDER MODAL */}
      {orderedItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="font-bold text-white text-xs font-mono uppercase tracking-wider">
                Rezerwacja części - PHU U KONESERA
              </h3>
              <button
                onClick={() => setOrderedItem(null)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#030712] p-3 rounded-lg border border-slate-800 text-xs space-y-1">
              <div className="font-bold text-yellow-400">
                {orderedItem.listingData.kategoria}
              </div>
              <div className="text-slate-300">
                {orderedItem.listingData.samochod?.marka} {orderedItem.listingData.samochod?.model}
              </div>
              <div className="text-emerald-400 font-mono font-bold text-sm pt-0.5">
                Cena: {orderedItem.listingData.cena?.brutto} PLN
              </div>
              <div className="text-slate-400 text-[11px] font-mono">
                Regał magazynowy: {orderedItem.listingData.ocr_wyniki?.numer_magazynowy || "MAG 14"}
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Część znajduje się fizycznie w naszym magazynie w Mysłakowicach. Skontaktuj się z nami telefonicznie, aby potwierdzić odbiór lub wysyłkę kurierską:
            </p>

            <a
              href="tel:533533443"
              className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs rounded-lg flex items-center justify-center gap-2 shadow-xs transition font-mono"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Zadzwoń: 533 533 443</span>
            </a>

            <button
              onClick={() => {
                alert("Część została wstępnie zarezerwowana na Twoją sesję!");
                setOrderedItem(null);
              }}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs rounded-lg transition cursor-pointer border border-slate-800 font-mono"
            >
              Zarezerwuj online
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
