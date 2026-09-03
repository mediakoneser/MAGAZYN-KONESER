import React, { useState, useEffect } from "react";
import {
  Globe,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Activity,
  Zap,
  ExternalLink,
  ShieldCheck,
  Server,
  Play,
} from "lucide-react";
import { IntegrationAccountInfo } from "../../types/businessCore";
import { businessCoreService } from "../../services/businessCoreService";
import { apiLogService } from "../../services/apiLogService";
import { jobQueueService } from "../../services/jobQueueService";

export const BusinessOsIntegrationsHubView: React.FC = () => {
  const [integrations, setIntegrations] = useState<IntegrationAccountInfo[]>([]);
  const [testingCode, setTestingCode] = useState<string | null>(null);
  const [syncingCode, setSyncingCode] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    code: string;
    success: boolean;
    text: string;
  } | null>(null);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = () => {
    setIntegrations(businessCoreService.getIntegrationsStatus());
  };

  const handleTestConnection = async (integration: IntegrationAccountInfo) => {
    setTestingCode(integration.code);
    setFeedbackMessage(null);
    const start = performance.now();

    try {
      const resp = await fetch(`/api/business-os/integrations/${integration.code}/test`, {
        method: "POST",
      });
      const data = await resp.json();
      const latencyMs = Math.round(performance.now() - start);

      apiLogService.recordLog({
        integration: integration.name,
        endpoint: `/api/business-os/integrations/${integration.code}/test`,
        method: "POST",
        httpStatus: resp.status,
        durationMs: latencyMs,
        responsePayload: data,
        triggeredBy: "OPERATOR_TEST_BUTTON",
      });

      setFeedbackMessage({
        code: integration.code,
        success: data.success,
        text: `${data.message || "Połączenie aktywne"} (${latencyMs} ms)`,
      });
    } catch (err: any) {
      setFeedbackMessage({
        code: integration.code,
        success: false,
        text: err.message || "Błąd nawiązywania połączenia",
      });
    } finally {
      setTestingCode(null);
      loadIntegrations();
    }
  };

  const handleTriggerSync = async (integration: IntegrationAccountInfo) => {
    setSyncingCode(integration.code);
    setFeedbackMessage(null);

    // Enqueue job into JobQueue
    const jobType =
      integration.code === "allegro"
        ? "ALLEGRO_OFFER_SYNC"
        : integration.code === "ovoko"
        ? "OVOKO_STOCK_SYNC"
        : "SHOPGOLD_CATALOG_SYNC";

    const job = jobQueueService.enqueueJob({
      type: jobType,
      title: `Synchronizacja stanów i ofert ${integration.name}`,
      targetSystem: integration.code,
    });

    try {
      const resp = await fetch(`/api/business-os/integrations/${integration.code}/sync`, {
        method: "POST",
      });
      const data = await resp.json();

      setFeedbackMessage({
        code: integration.code,
        success: true,
        text: `Zlecono zadanie w kolejce: ID ${job.correlationId}`,
      });
    } catch (err: any) {
      setFeedbackMessage({
        code: integration.code,
        success: false,
        text: err.message || "Nie udało się zlecić synchronizacji",
      });
    } finally {
      setTimeout(() => setSyncingCode(null), 800);
      loadIntegrations();
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-5 h-5 text-yellow-400" />
            <h1 className="text-xl font-black text-white tracking-tight">
              Centrum Integracji API & Marketplace
            </h1>
          </div>
          <p className="text-xs text-slate-300">
            Zarządzanie połączeniami REST API, tokenami autoryzacyjnymi, synchronizacją dwukierunkową i bramkami rejestrów państwowych.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadIntegrations}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-lg border border-slate-700 flex items-center gap-2 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Odśwież statusy</span>
          </button>
        </div>
      </div>

      {/* INTEGRATION CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((item) => {
          const isTesting = testingCode === item.code;
          const isSyncing = syncingCode === item.code;
          const feedback = feedbackMessage?.code === item.code ? feedbackMessage : null;

          return (
            <div
              key={item.code}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800 font-bold uppercase">
                      {item.category}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1.5">{item.name}</h3>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      item.status === "CONNECTED"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : item.status === "WARNING"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300 font-mono text-[11px] bg-slate-950/60 p-3 rounded-lg border border-slate-850">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Identyfikator:</span>
                    <span className="text-slate-200 truncate max-w-[170px]">{item.accountIdentifier || "Domyślny"}</span>
                  </div>
                  {item.activeOffersCount !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Aktywne oferty:</span>
                      <span className="text-yellow-400 font-bold">{item.activeOffersCount} szt.</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Ostatni sync:</span>
                    <span className="text-slate-400 text-[10px]">
                      {item.lastSyncAt ? item.lastSyncAt.substring(11, 16) : "Brak"}
                    </span>
                  </div>
                  {item.healthScore && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                      <span className="text-slate-400">Health score:</span>
                      <span className="text-emerald-400 font-bold">{item.healthScore}%</span>
                    </div>
                  )}
                </div>

                {/* FEEDBACK BANNER */}
                {feedback && (
                  <div
                    className={`mt-3 p-2.5 rounded text-xs font-mono ${
                      feedback.success
                        ? "bg-emerald-950/20 border border-emerald-500/30 text-emerald-300"
                        : "bg-red-950/20 border border-red-500/30 text-red-300"
                    }`}
                  >
                    {feedback.text}
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleTestConnection(item)}
                  disabled={isTesting}
                  className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs rounded border border-slate-700 flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                >
                  <Activity className={`w-3.5 h-3.5 text-blue-400 ${isTesting ? "animate-spin" : ""}`} />
                  <span>{isTesting ? "Testowanie..." : "Test Połączenia"}</span>
                </button>

                <button
                  onClick={() => handleTriggerSync(item)}
                  disabled={isSyncing}
                  className="flex-1 py-1.5 px-3 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs rounded flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                >
                  <Play className={`w-3 h-3 fill-slate-950 ${isSyncing ? "animate-pulse" : ""}`} />
                  <span>{isSyncing ? "Wysyłanie..." : "Sync Teraz"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
