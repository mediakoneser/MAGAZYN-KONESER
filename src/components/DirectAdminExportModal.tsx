import React, { useState } from "react";
import {
  FileCode,
  Copy,
  Check,
  Download,
  ExternalLink,
  X,
  ShieldCheck,
  Globe,
  Smartphone,
  Server,
  AlertTriangle,
  Info,
  CheckCircle2,
} from "lucide-react";

interface DirectAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DirectAdminExportModal: React.FC<DirectAdminModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [activeTab, setActiveTab] = useState<"quick_link" | "directadmin_html" | "dns_guide">("quick_link");

  if (!isOpen) return null;

  // Actual production cloud URL of the running application
  const liveCloudUrl = "https://ais-pre-pwqwg5ifo2gpcumdt7jmb7-401945512229.europe-west3.run.app";
  const devCloudUrl = "https://ais-dev-pwqwg5ifo2gpcumdt7jmb7-401945512229.europe-west3.run.app";

  // Production-grade Fullscreen Portal Wrapper for sklep.kasacja24.com / DirectAdmin
  const directAdminCode = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>UKONESERA.PL - Magazyn WMS, Skaner AI & Stacja Demontażu</title>
  <meta name="description" content="System WMS i Skaner AI dla stacji demontażu pojazdów PHU U KONESERA Mysłakowice z ewidencją części i synchronizacją Allegro / Ovoko." />
  <meta name="theme-color" content="#030712" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: #030712;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    #app-frame {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    }
    .fallback-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #0b0f19;
      border-top: 1px solid #1e293b;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: #94a3b8;
      z-index: 9999;
    }
    .fallback-bar a {
      color: #facc15;
      text-decoration: none;
      font-weight: bold;
      padding: 4px 10px;
      background: rgba(250, 204, 21, 0.1);
      border: 1px solid rgba(250, 204, 21, 0.3);
      border-radius: 6px;
    }
  </style>
</head>
<body>
  <!-- Pełny system WMS & Skaner AI dla PHU U KONESERA (sklep.kasacja24.com) -->
  <iframe
    id="app-frame"
    src="${liveCloudUrl}"
    allow="camera *; microphone *; geolocation *; clipboard-read; clipboard-write; autoplay; fullscreen"
    allowfullscreen="true"
    loading="eager"
    title="PHU U KONESERA - WMS & Skaner AI"
  ></iframe>

  <div class="fallback-bar">
    <span>PHU U KONESERA • Mysłakowice, ul. Daszyńskiego 16G • Tel. 533 533 443</span>
    <a href="${liveCloudUrl}" target="_blank" rel="noopener noreferrer">
      Otwórz w nowym oknie ↗
    </a>
  </div>
</body>
</html>`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(directAdminCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([directAdminCode], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "index.html";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl max-w-3xl w-full p-4 sm:p-6 space-y-4 shadow-2xl max-h-[92vh] flex flex-col">
        {/* NAGŁÓWEK */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base font-mono">
                Połączenie i Wdrożenie Systemu WMS
              </h3>
              <p className="text-xs text-slate-400">
                PHU U KONESERA • Domena sklep.kasacja24.com & Dostęp Chmurowy
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

        {/* ALERTY WYJAŚNIAJĄCY DLA UŻYTKOWNIKA (ODPOWIEDŹ NA ZRZUT EKRANU) */}
        <div className="p-3 bg-amber-950/30 border border-yellow-400/40 rounded-xl flex items-start gap-3 text-xs text-yellow-200 shrink-0">
          <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <div className="font-bold text-yellow-300">
              Dlaczego na Twoim ekranie pojawił się tylko czarny pasek z napisem?
            </div>
            <p className="text-[11px] text-yellow-200/90">
              Otworzyłeś plik lokalnie z dysku (<code>file:///C:/.../index.html</code>). Plik otwarty z dysku komputera nie ma połączenia z serwerem i bazą danych. 
              Twój pełny system WMS (ze skanerem, ewidencją części i Allegro) działa online w chmurze Google Cloud. 
              Poniżej masz bezpośredni link oraz gotowy plik na Twój serwer.
            </p>
          </div>
        </div>

        {/* ZAKŁADKI METOD POŁĄCZENIA */}
        <div className="flex items-center gap-1 bg-[#030712] p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab("quick_link")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "quick_link"
                ? "bg-yellow-400 text-slate-950 shadow-sm font-black"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>1. Bezpośredni Link Online (Najszybciej)</span>
          </button>

          <button
            onClick={() => setActiveTab("directadmin_html")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "directadmin_html"
                ? "bg-teal-400 text-slate-950 shadow-sm font-black"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>2. Plik na sklep.kasacja24.com (DirectAdmin)</span>
          </button>

          <button
            onClick={() => setActiveTab("dns_guide")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "dns_guide"
                ? "bg-blue-500 text-white shadow-sm font-black"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Server className="w-4 h-4" />
            <span>3. Podpięcie DNS / CNAME</span>
          </button>
        </div>

        {/* ZAWARTOŚĆ PRZEWIJANA */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* TAB 1: BEZPOŚREDNI LINK DO CHMURY */}
          {activeTab === "quick_link" && (
            <div className="space-y-3.5">
              <div className="bg-[#030712] border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Oficjalny adres produkcyjny Twojego systemu WMS
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold">
                    ONLINE • 100% DZIAŁA
                  </span>
                </div>

                <div className="bg-[#070b14] p-3 rounded-lg border border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <code className="text-xs font-mono text-yellow-300 break-all select-all font-bold">
                    {liveCloudUrl}
                  </code>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleCopyUrl(liveCloudUrl)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-md transition flex items-center gap-1 cursor-pointer"
                    >
                      {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedUrl ? "Skopiowano!" : "Kopiuj"}</span>
                    </button>
                    <a
                      href={liveCloudUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black rounded-md transition flex items-center gap-1 shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Otwórz Teraz</span>
                    </a>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Możesz zapisać ten link w zakładkach przeglądarki na komputerze w biurze, na laptopie oraz na smartfonie na placu demontażu. Działa od razu, nie wymaga instalacji żadnych serwerów.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                  <div className="font-bold text-xs text-white flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-teal-400" />
                    <span>Dostęp z Telefonu na Placu</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Otwórz powyższy link w przeglądarce Chrome lub Safari na telefonie. Kliknij "Dodaj do ekranu głównego", a zyskasz ikonę aplikacji WMS z aparatem do skanowania części.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                  <div className="font-bold text-xs text-white flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-blue-400" />
                    <span>Baza Danych w Chmurze</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Wszystkie części, regały, zdjęcia i oferty Allegro zapisują się automatycznie w Google Cloud Firestore oraz w pamięci offline urządzenia.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PLIK NA DIRECTADMIN (sklep.kasacja24.com) */}
          {activeTab === "directadmin_html" && (
            <div className="space-y-3.5">
              <div className="bg-[#030712] p-4 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2 text-teal-300 font-bold font-mono text-xs">
                  <ShieldCheck className="w-4 h-4 text-teal-400" />
                  <span>Ścieżka docelowa w DirectAdmin na Twoim serwerze:</span>
                </div>
                <code className="block bg-[#070b14] px-3 py-2 rounded-lg font-mono text-teal-300 text-xs border border-slate-800 break-all select-all">
                  /domains/sklep.kasacja24.com/public_html/index.html
                </code>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Zaktualizowaliśmy kod pliku <code>index.html</code>. Teraz jest to pełnoekranowy portal, który automatycznie ładuje działający system WMS ze skanerem, aparatem fotograficznym i Allegro.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Kod gotowego pliku index.html:</span>
                  <span>Uprawnienia: aparat, mikrofon, schowek</span>
                </div>
                <textarea
                  readOnly
                  value={directAdminCode}
                  rows={8}
                  className="w-full bg-[#030712] border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-300 focus:outline-hidden"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={handleCopyCode}
                  className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs rounded-xl cursor-pointer transition shadow-md flex items-center justify-center gap-2 font-mono"
                >
                  {copied ? <Check className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? "Skopiowano kod HTML!" : "Kopiuj kod do schowka"}</span>
                </button>

                <button
                  onClick={handleDownloadHtml}
                  className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl cursor-pointer transition shadow-md flex items-center justify-center gap-2 font-mono"
                >
                  <Download className="w-4 h-4" />
                  <span>Pobierz plik index.html</span>
                </button>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
                <strong>Jak wgrać do DirectAdmin w 3 krokach:</strong>
                <ol className="list-decimal pl-4 space-y-0.5 text-[11px] text-slate-300">
                  <li>Zaloguj się do swojego panelu DirectAdmin (np. kasacja24.com:2222).</li>
                  <li>Wejdź w <strong>Menedżer Plików</strong> → folder <code>domains/sklep.kasacja24.com/public_html</code>.</li>
                  <li>Wgraj pobrany plik <code>index.html</code> (zastępując stary). Po wejściu na <code>sklep.kasacja24.com</code> natychmiast odpali się pełny system WMS!</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 3: PODPIĘCIE DNS / CNAME */}
          {activeTab === "dns_guide" && (
            <div className="space-y-3.5">
              <div className="bg-[#030712] p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-xs font-mono">
                  <Server className="w-4 h-4" />
                  <span>Bezpośrednie podpięcie domeny sklep.kasacja24.com w DNS</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Jeśli chcesz, aby domena <code>sklep.kasacja24.com</code> bezpośrednio kierowała na aplikację w chmurze (bez ramki iframe), możesz ustawić rekord CNAME w strefie DNS swojej domeny.
                </p>

                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2 font-mono text-xs">
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400">Typ rekordu:</span>
                    <strong className="text-yellow-400">CNAME</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400">Host / Nazwa:</span>
                    <strong className="text-white">sklep</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Wartość / Cel:</span>
                    <strong className="text-teal-400 break-all">ais-pre-pwqwg5ifo2gpcumdt7jmb7-401945512229.europe-west3.run.app</strong>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">
                  Czas propagacji rekordu DNS wynosi od 5 minut do 2 godzin. W tym czasie rekomendujemy korzystanie z bezpośredniego linku chmurowego lub pliku index.html z zakładki 2.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* STOPKA */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 font-mono">
            PHU U Konesera • Infolinia: 533 533 443
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-xs transition cursor-pointer"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
