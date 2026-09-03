import React, { useState } from "react";
import {
  HelpCircle,
  X,
  FileSpreadsheet,
  Globe,
  Key,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  Server,
  Terminal,
  Layers,
  ArrowRight,
  Download,
} from "lucide-react";
import { downloadAllegroTemplateCsv } from "../utils/allegroCsvHandler";

interface IntegrationGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAllegroSettings?: () => void;
}

export const IntegrationGuideModal: React.FC<IntegrationGuideModalProps> = ({
  isOpen,
  onClose,
  onOpenAllegroSettings,
}) => {
  const [activeChannel, setActiveChannel] = useState<"allegro_csv" | "allegro_api" | "shopgold" | "baselinker">("allegro_csv");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl max-w-4xl w-full p-4 sm:p-6 space-y-4 shadow-2xl max-h-[92vh] flex flex-col my-auto text-slate-100">
        {/* NAGŁÓWEK */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base font-mono">
                  Przewodnik Konfiguracji Integracji
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400 text-[10px] font-mono font-bold border border-teal-500/30">
                  PHU U Konesera
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Kompletna instrukcja łączenia WMS z Allegro (CSV & API), ShopGold oraz BaseLinker
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PRZEŁĄCZNIK KANAŁÓW */}
        <div className="flex items-center gap-1.5 bg-[#030712] p-1 rounded-xl border border-slate-800 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveChannel("allegro_csv")}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer font-mono shrink-0 ${
              activeChannel === "allegro_csv"
                ? "bg-orange-500 text-slate-950 font-black shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>1. Allegro Masowy CSV (Najprostszy)</span>
          </button>

          <button
            onClick={() => setActiveChannel("allegro_api")}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer font-mono shrink-0 ${
              activeChannel === "allegro_api"
                ? "bg-orange-500 text-slate-950 font-black shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Key className="w-4 h-4" />
            <span>2. Allegro REST API (1-Click)</span>
          </button>

          <button
            onClick={() => setActiveChannel("shopgold")}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer font-mono shrink-0 ${
              activeChannel === "shopgold"
                ? "bg-teal-500 text-slate-950 font-black shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>3. ShopGold (sklep.kasacja24.com)</span>
          </button>

          <button
            onClick={() => setActiveChannel("baselinker")}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer font-mono shrink-0 ${
              activeChannel === "baselinker"
                ? "bg-blue-500 text-slate-950 font-black shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>4. BaseLinker API</span>
          </button>
        </div>

        {/* ZAWARTOŚĆ */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs leading-relaxed">
          {/* KROK 1: ALLEGRO MASOWY CSV */}
          {activeChannel === "allegro_csv" && (
            <div className="space-y-4">
              <div className="bg-[#030712] border border-orange-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-orange-400 font-mono text-sm flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4" />
                    Wystawianie aukcji Allegro przez plik CSV (Oficjalny Szablon 29 Kolumn)
                  </h4>
                  <button
                    onClick={() => downloadAllegroTemplateCsv("szablon_allegro_template.csv")}
                    className="px-2.5 py-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-[11px] rounded-lg border border-orange-500/40 flex items-center gap-1.5 transition font-mono cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Pobierz szablon Allegro</span>
                  </button>
                </div>

                <p className="text-slate-300">
                  Nasz system WMS generuje pliki <strong>w 100% zgodne z oficjalnym szablonem Allegro:</strong>{" "}
                  <code>import-and-list-csv-template-polish-version.csv</code>. Nie musisz ręcznie wypełniać żadnych arkuszy kalkulacyjnych ani kodów HTML!
                </p>

                <div className="space-y-2.5 bg-slate-900/60 p-3.5 rounded-lg border border-slate-800">
                  <div className="font-bold text-white font-mono flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Instrukcja krok po kroku:
                  </div>
                  <ol className="space-y-2 list-decimal pl-4 text-slate-300">
                    <li>
                      <strong>W Skanerze WMS:</strong> Przy każdej zdemontowanej części kliknij{" "}
                      <span className="text-orange-400 font-bold">"Dodaj do kolejki Allegro CSV"</span> (lub pobierz plik z 1 częścią od razu).
                    </li>
                    <li>
                      <strong>Wybierz "Pobierz Paczkę CSV dla Allegro":</strong> System wygeneruje plik <code>allegro_import_X_czesci.csv</code> z kodowaniem UTF-8 z BOM (polskie znaki bez krzaczków).
                    </li>
                    <li>
                      <strong>Otwórz Allegro:</strong> Wejdź na stronę:{" "}
                      <a
                        href="https://allegro.pl/moje-allegro/sprzedaz/asortyment"
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal-400 underline font-mono inline-flex items-center gap-1"
                      >
                        allegro.pl/moje-allegro/sprzedaz/asortyment <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                    <li>
                      <strong>Wystaw z pliku:</strong> W prawym górnym rogu asortymentu kliknij przycisk <strong>"Wystaw z pliku"</strong>.
                    </li>
                    <li>
                      <strong>Wskaż pobrany plik:</strong> Przeciągnij pobrany z WMS plik CSV. Allegro automatycznie przypisze parametry, ceny, opisy i sygnaturę z numerem regału (np. <code>MAG 14</code>).
                    </li>
                  </ol>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-[#030712] border border-slate-800 rounded-xl space-y-1.5">
                  <span className="font-mono text-[11px] font-bold text-emerald-400 block">
                    Automatyczna zgodność z GPSR UE 2023/988:
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Każdy wiersz CSV zawiera kompletne dane producenta części (OE/Aftermarket) oraz dane podmiotu wprowadzającego (PHU U Konesera, Mysłakowice), spełniając unijne wymogi prawne na Allegro.
                  </p>
                </div>
                <div className="p-3 bg-[#030712] border border-slate-800 rounded-xl space-y-1.5">
                  <span className="font-mono text-[11px] font-bold text-yellow-400 block">
                    Optymalizacja Tytułów (75 znaków):
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Tytuły w pliku CSV zawierają Markę, Model, Kod części OEM i Stan magazynowy, zoptymalizowane pod algorytmy wyszukiwarki Allegro Trafność.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* KROK 2: ALLEGRO REST API */}
          {activeChannel === "allegro_api" && (
            <div className="space-y-4">
              <div className="bg-[#030712] border border-orange-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-orange-400 font-mono text-sm flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    Bezpośrednie wystawianie aukcji przez Allegro REST API (1-Click)
                  </h4>
                  {onOpenAllegroSettings && (
                    <button
                      onClick={onOpenAllegroSettings}
                      className="px-2.5 py-1 bg-orange-500 text-slate-950 text-[11px] rounded-lg font-bold flex items-center gap-1.5 transition font-mono cursor-pointer"
                    >
                      <span>Otwórz Ustawienia Allegro</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <p className="text-slate-300">
                  Dzięki połączeniu API możesz wystawiać oferty bezpośrednio ze Skanera lub Magazynu WMS jednym kliknięciem myszy, bez pobierania i wgrywania plików.
                </p>

                <div className="space-y-2 bg-slate-900/60 p-3.5 rounded-lg border border-slate-800">
                  <div className="font-bold text-white font-mono flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Jak wygenerować klucze aplikacji w Allegro Developer Portal:
                  </div>
                  <ol className="space-y-2 list-decimal pl-4 text-slate-300">
                    <li>
                      Wejdź na:{" "}
                      <a
                        href="https://apps.developer.allegro.pl"
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal-400 underline font-mono inline-flex items-center gap-1"
                      >
                        apps.developer.allegro.pl <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                    <li>
                      Zaloguj się kontem firmowym PHU U Konesera i kliknij <strong>"Zarejestruj nową aplikację"</strong>.
                    </li>
                    <li>
                      Podaj nazwę aplikacji (np. <code>Koneser WMS Myslakowice</code>), typ aplikacji: <em>"Aplikacja webowa / REST"</em>.
                    </li>
                    <li>
                      Jako <strong>Redirect URI</strong> wpisz adres Twojego systemu (lub <code>http://localhost:3000/api/allegro/callback</code>).
                    </li>
                    <li>
                      Skopiuj wygenerowany <strong>Client ID</strong> i <strong>Client Secret</strong> i wklej w zakładce <em>Allegro &gt; Ustawienia Integracji</em> w naszym systemie.
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* KROK 3: SHOPGOLD */}
          {activeChannel === "shopgold" && (
            <div className="space-y-4">
              <div className="bg-[#030712] border border-teal-500/30 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-teal-400 font-mono text-sm flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Synchronizacja ze sklepem internetowym ShopGold (sklep.kasacja24.com)
                </h4>
                <p className="text-slate-300">
                  Nasz system WMS posiada wbudowany generator plików CSV/XML zoptymalizowanych pod mechanizm importu oprogramowania <strong>ShopGold</strong>.
                </p>

                <div className="space-y-2 bg-slate-900/60 p-3.5 rounded-lg border border-slate-800">
                  <div className="font-bold text-white font-mono flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Automatyczna ścieżka importu w ShopGold:
                  </div>
                  <ol className="space-y-2 list-decimal pl-4 text-slate-300">
                    <li>W menu WMS przejdź do zakładki <strong>"ShopGold"</strong>.</li>
                    <li>
                      Wybierz pod-zakładkę <strong>"Eksport CSV / XML"</strong> i pobierz aktualny plik asortymentu magazynowego.
                    </li>
                    <li>
                      Zaloguj się do panelu administracyjnego sklepu ShopGold (<code>sklep.kasacja24.com/admin</code>).
                    </li>
                    <li>
                      Przejdź do: <em>Narzędzia &gt; Import danych &gt; Import z pliku CSV produktów</em>.
                    </li>
                    <li>
                      Wybierz pobrany plik z WMS. Sklep automatycznie zaktualizuje stany magazynowe, ceny, zdjęcia oraz kategorie pojazdów!
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* KROK 4: BASELINKER */}
          {activeChannel === "baselinker" && (
            <div className="space-y-4">
              <div className="bg-[#030712] border border-blue-500/30 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-blue-400 font-mono text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Integracja z BaseLinker przez API Token
                </h4>
                <p className="text-slate-300">
                  BaseLinker pozwala na centralne zarządzanie zamówieniami z Allegro, eBay, Otomoto i sklepu internetowego.
                </p>

                <div className="space-y-2 bg-slate-900/60 p-3.5 rounded-lg border border-slate-800">
                  <div className="font-bold text-white font-mono flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Skąd pobrać Token API w BaseLinkerze:
                  </div>
                  <ol className="space-y-2 list-decimal pl-4 text-slate-300">
                    <li>Zaloguj się do panelu <code>panel.baselinker.com</code>.</li>
                    <li>W lewym dolnym rogu kliknij na nazwę swojego konta &gt; <strong>Konto / inne</strong>.</li>
                    <li>Przejdź do zakładki <strong>Profil</strong> &gt; sekcja <strong>API</strong>.</li>
                    <li>Kliknij <em>"Generuj nowy token API"</em> i skopiuj uzyskany ciąg znaków.</li>
                    <li>Wklej token w zakładce <em>Integracje &gt; BaseLinker</em> w naszym WMS.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* DOLNY PASEK */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-[11px] font-mono text-slate-400">
            Wsparcie techniczne stacji: <strong>533 533 443</strong> (Mysłakowice)
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl transition cursor-pointer font-mono"
          >
            Rozumiem, zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
