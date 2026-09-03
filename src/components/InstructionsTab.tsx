import React, { useState } from "react";
import {
  BookOpen,
  Sparkles,
  Tag,
  Headphones,
  ShieldCheck,
  ArrowRight,
  Database,
  ShoppingBag,
  Bot,
  Layers,
  FileCode,
} from "lucide-react";
import { DatabaseInstructionsTab } from "./DatabaseInstructionsTab";

interface InstructionsTabProps {
  onNavigateToScanner: () => void;
  onNavigateToInfoline: () => void;
}

export const InstructionsTab: React.FC<InstructionsTabProps> = ({
  onNavigateToScanner,
  onNavigateToInfoline,
}) => {
  const [activeSubView, setActiveSubView] = useState<"general" | "database">("general");

  return (
    <div className="space-y-4">
      {/* SELEKTOR PODSTRON INSTRUKCJI */}
      <div className="bg-[#0b0f19] border border-slate-800/90 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-yellow-400" />
          <span className="font-mono text-sm font-bold text-white">Centrum Pomocy & Baza Wiedzy WMS</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubView("general")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeSubView === "general"
                ? "bg-yellow-400 text-slate-950 shadow-xs"
                : "bg-[#030712] text-slate-300 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Instrukcja Ogólna & ShopGold</span>
          </button>

          <button
            onClick={() => setActiveSubView("database")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeSubView === "database"
                ? "bg-yellow-400 text-slate-950 shadow-xs"
                : "bg-[#030712] text-slate-300 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Instrukcja Bazy Danych & Zapis Informacji</span>
          </button>
        </div>
      </div>

      {activeSubView === "database" ? (
        <DatabaseInstructionsTab />
      ) : (
        <div className="bg-[#0b0f19] border border-slate-800/90 rounded-xl p-3.5 sm:p-5 space-y-4 shadow-xs">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-yellow-400" />
              <h2 className="text-sm sm:text-base font-bold text-white font-mono">
                Instrukcja Obsługi Magazynu WMS, ShopGold & Gemini AI
              </h2>
            </div>
            <span className="text-[10px] px-2 py-0.5 bg-yellow-400/10 text-yellow-300 font-mono font-bold rounded border border-yellow-400/20">
              Wersja Enterprise 2026
            </span>
          </div>

          <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
            {/* KROK 1 */}
            <div className="bg-[#030712] p-3.5 rounded-lg border border-slate-800/90 space-y-1.5 hover:border-slate-700 transition">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-yellow-400 text-xs sm:text-sm flex items-center gap-1.5 font-mono">
                  <Sparkles className="w-3.5 h-3.5" /> 1. Skanowanie Zdjęć i AI Gemini Vision
                </h3>
                <button
                  onClick={onNavigateToScanner}
                  className="text-[10px] text-yellow-400 hover:text-yellow-300 font-bold flex items-center gap-1 cursor-pointer font-mono"
                >
                  Przejdź do skanera <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <p className="text-slate-400 leading-relaxed">
                W zakładce <strong>Skaner AI & Wycena</strong> wgraj jedno lub kilka zdjęć zdemontowanej części.
                Sztuczna inteligencja multimodalna rozpozna kształt przedmiotu, odczyta napisy z markerów (np. <strong>LT FABIA I</strong>),
                dopasuje numer katalogowy OEM oraz zaproponuje rynkową cenę w PLN.
              </p>
            </div>

            {/* KROK 2 */}
            <div className="bg-[#030712] p-3.5 rounded-lg border border-slate-800/90 space-y-1.5 hover:border-slate-700 transition">
              <h3 className="font-bold text-teal-400 text-xs sm:text-sm flex items-center gap-1.5 font-mono">
                <ShoppingBag className="w-3.5 h-3.5" /> 2. Integracja ze Sklepem ShopGold (sklep.ukonesera.pl)
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Zakładka <strong>Sklep ShopGold</strong> umożliwia 1-kliknięciową synchronizację stanu magazynowego z platformą e-sklepu.
                Możesz pobrać gotowy plik <strong>XML Feed</strong> (dla automatycznych harmonogramów ShopGold/Ceneo),
                plik <strong>CSV</strong> lub wygenerować skrypt <strong>SQL</strong> do natychmiastowego zasilenia bazy w panelu DirectAdmin/cPanel.
              </p>
            </div>

            {/* KROK 3 */}
            <div className="bg-[#030712] p-3.5 rounded-lg border border-slate-800/90 space-y-1.5 hover:border-slate-700 transition">
              <h3 className="font-bold text-amber-400 text-xs sm:text-sm flex items-center gap-1.5 font-mono">
                <Bot className="w-3.5 h-3.5" /> 3. Live Chat Gemini Asystent dla Szefa i Zarządu
              </h3>
              <p className="text-slate-400 leading-relaxed">
                W zakładce <strong>Panel Szefa & Zarządu ➔ Live Chat Gemini</strong> właściciel firmy ma do dyspozycji inteligentnego doradcę biznesowego,
                który w czasie rzeczywistym analizuje rentowność całego magazynu, kalkuluje wyceny aut z lawety,
                generuje zaawansowane zapytania SQL oraz rekomenduje strategie cenowe.
              </p>
            </div>

            {/* KROK 4 */}
            <div className="bg-[#030712] p-3.5 rounded-lg border border-slate-800/90 space-y-1.5 hover:border-slate-700 transition">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-emerald-400 text-xs sm:text-sm flex items-center gap-1.5 font-mono">
                  <Headphones className="w-3.5 h-3.5" /> 4. Smart Infolinia Telefoniczna & Chatbot
                </h3>
                <button
                  onClick={onNavigateToInfoline}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer font-mono"
                >
                  Otwórz infolinię <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Klienci dzwoniący pod nr <strong>533 533 443</strong> lub korzystający z formularza online
                uzyskują natychmiastową informację o dostępności części od ręki na placu w Mysłakowicach,
                warunkach odbioru oraz wyceny auta na złomowanie.
              </p>
            </div>

            {/* KROK 5 */}
            <div className="bg-[#030712] p-3.5 rounded-lg border border-slate-800/90 space-y-1.5">
              <h3 className="font-bold text-slate-200 text-xs sm:text-sm flex items-center gap-1.5 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> 5. Zgodność z GPSR UE 2023/988 i GVO
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Wszystkie generowane opisy i oferty zawierają wymagane prawem Unii Europejskiej informacje o producencie,
                stanie technicznym części używanej oraz certyfikowanej stacji recyklingu PHU U KONESERA.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
