import React, { useState } from "react";
import {
  Layers,
  Sparkles,
  Flame,
  CheckCircle2,
  Copy,
  ExternalLink,
  Tag,
  Car,
  Globe,
  ShoppingBag,
  Store,
  Check,
  Zap,
} from "lucide-react";
import { PartItem } from "../types";
import { generateAuctionTemplates } from "../utils/auctionGenerator";

interface AllegroMultiPlatformEditorProps {
  selectedPart: PartItem | null;
  onOpenEditor: (part: PartItem) => void;
  onPublishAllegro: (part: PartItem) => void;
  isPublishing: boolean;
}

export const AllegroMultiPlatformEditor: React.FC<AllegroMultiPlatformEditorProps> = ({
  selectedPart,
  onOpenEditor,
  onPublishAllegro,
  isPublishing,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!selectedPart) {
    return (
      <div className="py-20 text-center text-slate-500 font-mono text-xs">
        Wybierz część z listy, aby zarządzać szablonami wieloplatformowymi.
      </div>
    );
  }

  const templates =
    selectedPart.listingData.auctionTemplates || generateAuctionTemplates(selectedPart.listingData);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const isAllegroPub = Boolean(
    selectedPart.allegroOfferId || selectedPart.listingData?.allegro?.offerId
  );

  return (
    <div className="space-y-4 font-sans text-xs">
      <div className="bg-[#030712] border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-400 font-mono font-bold text-[10px]">
              {selectedPart.currentRackLocation || selectedPart.listingData.ocr_wyniki?.numer_magazynowy || "MAG 14"}
            </span>
            <h3 className="text-sm font-bold text-white font-mono">
              {selectedPart.listingData.kategoria} — {selectedPart.listingData.samochod?.marka}{" "}
              {selectedPart.listingData.samochod?.model}
            </h3>
          </div>
          <p className="text-[11px] text-slate-400">
            OEM: <strong className="text-white font-mono">{selectedPart.listingData.numery_czesci || "OE"}</strong> • Cena:{" "}
            <strong className="text-emerald-400 font-mono">{selectedPart.listingData.cena?.brutto} PLN</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenEditor(selectedPart)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-yellow-400 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Otwórz Formularz Allegro Sales Center</span>
          </button>
        </div>
      </div>

      {/* GRID 4 PLATFORM */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PLATFORMA 1: ALLEGRO.PL */}
        <div className="bg-[#0b0f19] border border-yellow-400/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-orange-600 text-white flex items-center justify-center font-black text-xs">
                A
              </span>
              <strong className="text-white text-xs">Allegro REST API (Polska & CEE)</strong>
            </div>
            {isAllegroPub ? (
              <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-bold text-[10px]">
                Aktywna #{selectedPart.allegroOfferId}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-yellow-950/80 border border-yellow-500/50 text-yellow-300 font-bold text-[10px]">
                Gotowy szkic
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Tytuł (maks. 75 znaków):</span>
              <span className="font-mono text-[10px] text-yellow-400 font-bold">
                {templates.allegroTitle.length}/75
              </span>
            </div>
            <div className="p-2 rounded-lg bg-[#030712] border border-slate-800 text-xs font-bold text-white font-mono">
              {templates.allegroTitle}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onPublishAllegro(selectedPart)}
              disabled={isPublishing}
              className="flex-1 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 font-black rounded-lg text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>{isAllegroPub ? "Aktualizuj ofertę" : "Wystaw 1-Klik"}</span>
            </button>
            <button
              type="button"
              onClick={() => handleCopy(templates.allegroDescriptionHtml, "allegro_html_multi")}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              {copiedKey === "allegro_html_multi" ? "Skopiowano!" : "Kopiuj HTML"}
            </button>
          </div>
        </div>

        {/* PLATFORMA 2: OVOKO / RRR.LT */}
        <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center font-black text-xs">
                O
              </span>
              <strong className="text-white text-xs">Ovoko / RRR.lt (Rynek Europejski)</strong>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Automatyczny XML / API</span>
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-400 block">Tytuł Ovoko ze znacznikiem regału:</span>
            <div className="p-2 rounded-lg bg-[#030712] border border-slate-800 text-xs text-white font-mono">
              {templates.ovokoTitle}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleCopy(templates.ovokoTitle, "ovoko_title_copied")}
              className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-yellow-400" />
              <span>{copiedKey === "ovoko_title_copied" ? "Skopiowano tytuł!" : "Kopiuj tytuł Ovoko"}</span>
            </button>
          </div>
        </div>

        {/* PLATFORMA 3: OLX.PL */}
        <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-teal-600 text-white flex items-center justify-center font-black text-xs">
                O
              </span>
              <strong className="text-white text-xs">OLX.pl (Sprzedaż lokalna & wysyłka)</strong>
            </div>
            <span className="text-[10px] text-slate-400">Tekst czysty</span>
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-400 block">Treść ogłoszenia OLX:</span>
            <textarea
              rows={3}
              readOnly
              value={templates.olxText}
              className="w-full bg-[#030712] border border-slate-800 rounded-lg p-2 text-[10px] text-slate-300 font-mono"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleCopy(templates.olxText, "olx_text_copied")}
              className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-teal-400" />
              <span>{copiedKey === "olx_text_copied" ? "Skopiowano opis OLX!" : "Kopiuj tekst OLX"}</span>
            </button>
          </div>
        </div>

        {/* PLATFORMA 4: SKLEP WŁASNY (SHOPGOLD) */}
        <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center font-black text-xs">
                S
              </span>
              <strong className="text-white text-xs">Sklep Własny (ShopGold / E-sklep)</strong>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold">Synchronizacja 0% prowizji</span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Cena w sklepie:</span>
              <strong className="text-emerald-400 font-mono">{selectedPart.listingData.cena?.brutto} PLN</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Stan magazynowy:</span>
              <strong className="text-white font-mono">{selectedPart.ilosc ?? 1} szt.</strong>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleCopy(JSON.stringify(selectedPart, null, 2), "shopgold_json")}
              className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Store className="w-3.5 h-3.5 text-emerald-400" />
              <span>{copiedKey === "shopgold_json" ? "Skopiowano dane!" : "Eksportuj do Sklepu"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
