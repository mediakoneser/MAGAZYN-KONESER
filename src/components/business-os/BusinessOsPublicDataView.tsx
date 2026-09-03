import React, { useState, useEffect } from "react";
import {
  Building2,
  Search,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Globe,
  Database,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import {
  regonConnector,
  ceidgConnector,
  validateNipChecksum,
  ExternalRecord,
} from "../../services/publicDataConnectors";
import { auditLogService } from "../../services/auditLogService";

export const BusinessOsPublicDataView: React.FC = () => {
  const [activeRegistry, setActiveRegistry] = useState<"REGON" | "CEIDG">("REGON");
  const [nipQuery, setNipQuery] = useState("6112803248"); // Default to PHU U Konesera
  const [isLoading, setIsLoading] = useState(false);
  const [record, setRecord] = useState<ExternalRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    handleLookup(nipQuery);
  }, [activeRegistry]);

  const handleLookup = async (nipToSearch: string) => {
    if (!nipToSearch) return;
    setIsLoading(true);
    setError(null);
    setRecord(null);

    const val = validateNipChecksum(nipToSearch);
    if (!val.isValid) {
      setError(val.message);
      setIsLoading(false);
      return;
    }

    try {
      const connector = activeRegistry === "REGON" ? regonConnector : ceidgConnector;
      const res = await connector.fetchByNip(val.cleanNip);
      if (res) {
        setRecord(res);
        auditLogService.record({
          action: "ODPYTANIE_REJESTRU_PUBLICZNEGO",
          entityType: "CONTRACTOR",
          entityId: val.cleanNip,
          changesSummary: `Pobrano dane NIP ${val.cleanNip} z rejestru ${activeRegistry}`,
        });
      } else {
        setError(`Nie znaleziono rekordu w rejestrze ${activeRegistry}.`);
      }
    } catch (err: any) {
      setError(err.message || `Błąd połączenia z bazą ${activeRegistry}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyJson = () => {
    if (!record) return;
    navigator.clipboard.writeText(JSON.stringify(record, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-black text-white tracking-tight">
              Konektory Danych Publicznych (REGON, CEIDG, TERYT, BDO)
            </h1>
          </div>
          <p className="text-xs text-slate-300">
            Oficjalne rejestry państwowe z automatycznym oznaczaniem źródła (source) i znacznika czasu pobrania (retrievedAt).
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-emerald-400">
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/40 border border-emerald-500/30 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>BIR 1.1 & CEIDG Online</span>
          </span>
        </div>
      </div>

      {/* REGISTRY PICKER & SEARCH BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveRegistry("REGON")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono transition ${
              activeRegistry === "REGON"
                ? "bg-yellow-400 text-slate-950"
                : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
            }`}
          >
            GUS REGON (BIR 1.1)
          </button>
          <button
            onClick={() => setActiveRegistry("CEIDG")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono transition ${
              activeRegistry === "CEIDG"
                ? "bg-yellow-400 text-slate-950"
                : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
            }`}
          >
            CEIDG (dane.biznes.gov.pl)
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={nipQuery}
              onChange={(e) => setNipQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup(nipQuery)}
              placeholder="Wpisz 10-cyfrowy NIP podmiotu..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-yellow-400 rounded-lg px-3.5 py-2 text-xs text-white font-mono placeholder:text-slate-500 transition"
            />
          </div>

          <button
            onClick={() => handleLookup(nipQuery)}
            disabled={isLoading}
            className="w-full sm:w-auto px-5 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Pobierz z rejestru</span>
          </button>
        </div>

        {/* PRESET SHORTCUT BUTTONS */}
        <div className="flex items-center gap-2 pt-1 text-xs text-slate-400">
          <span className="text-[11px]">Szybkie wyszukiwanie:</span>
          <button
            onClick={() => {
              setNipQuery("6112803248");
              handleLookup("6112803248");
            }}
            className="text-[11px] font-mono text-yellow-400 hover:underline"
          >
            PHU U Konesera (6112803248)
          </button>
          <span>•</span>
          <button
            onClick={() => {
              setNipQuery("8981012345");
              handleLookup("8981012345");
            }}
            className="text-[11px] font-mono text-yellow-400 hover:underline"
          >
            Auto Części Wrocław (8981012345)
          </button>
        </div>
      </div>

      {/* ERROR DISPLAY */}
      {error && (
        <div className="p-4 bg-red-950/20 border border-red-500/30 text-red-300 rounded-xl text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* RECORD DISPLAY */}
      {record && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold">
                  ZWERYFIKOWANO • {record.source}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Pobrano: {record.retrievedAt.substring(0, 19).replace("T", " ")}
                </span>
              </div>
              <h2 className="text-base font-bold text-white">{record.rawData.name}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {record.rawData.street}, {record.rawData.postalCode} {record.rawData.city}
              </p>
            </div>

            <button
              onClick={handleCopyJson}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-mono text-xs rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Skopiowano JSON" : "Kopiuj rekord"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[11px]">Numer NIP:</span>
              <div className="font-bold text-white text-sm mt-0.5">{record.rawData.nip}</div>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[11px]">Numer REGON:</span>
              <div className="font-bold text-white text-sm mt-0.5">{record.rawData.regon || "Brak"}</div>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[11px]">Status w rejestrze:</span>
              <div className="font-bold text-emerald-400 text-sm mt-0.5">{record.rawData.status || "AKTYWNY"}</div>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[11px]">Rejestr BDO:</span>
              <div className="font-bold text-yellow-400 text-sm mt-0.5">{record.rawData.bdoNumber || "Zgodny z procedurą"}</div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
              Surowy Obiekt JSON (Format Zgodny z MasterContractor)
            </h4>
            <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-64">
              {JSON.stringify(record, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
