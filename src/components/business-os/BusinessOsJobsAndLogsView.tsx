import React, { useState, useEffect } from "react";
import {
  Activity,
  Terminal,
  Clock,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Shield,
  Search,
  RefreshCw,
  Filter,
  Layers,
  ChevronDown,
  ChevronRight,
  Code,
  XCircle,
} from "lucide-react";
import { ApiLogEntry, AuditLogEntry } from "../../types/businessCore";
import { BusinessJob, jobQueueService } from "../../services/jobQueueService";
import { apiLogService } from "../../services/apiLogService";
import { auditLogService } from "../../services/auditLogService";

export const BusinessOsJobsAndLogsView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<"JOBS" | "API_LOGS" | "AUDIT">("JOBS");

  // Job Queue state
  const [jobs, setJobs] = useState<BusinessJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<BusinessJob | null>(null);

  // API logs state
  const [apiLogs, setApiLogs] = useState<ApiLogEntry[]>([]);
  const [apiSearch, setApiSearch] = useState("");
  const [selectedApiLog, setSelectedApiLog] = useState<ApiLogEntry | null>(null);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(() => {
      setJobs(jobQueueService.getJobs());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const refreshAll = () => {
    setJobs(jobQueueService.getJobs());
    setApiLogs(apiLogService.getLogs());
    setAuditLogs(auditLogService.getLogs());
  };

  const handleRetryJob = (jobId: string) => {
    jobQueueService.retryJob(jobId);
    setJobs(jobQueueService.getJobs());
  };

  const handleCancelJob = (jobId: string) => {
    jobQueueService.cancelJob(jobId);
    setJobs(jobQueueService.getJobs());
  };

  const filteredApiLogs = apiLogs.filter((l) => {
    if (!apiSearch) return true;
    const q = apiSearch.toLowerCase();
    return (
      l.correlationId.toLowerCase().includes(q) ||
      l.integration.toLowerCase().includes(q) ||
      l.endpoint.toLowerCase().includes(q) ||
      String(l.httpStatus).includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Terminal className="w-5 h-5 text-yellow-400" />
            <h1 className="text-xl font-black text-white tracking-tight">
              Kolejka Zadań & Diagnostyka API
            </h1>
          </div>
          <p className="text-xs text-slate-300">
            Monitor asynchronicznych zadań synchronizacji, audyt zapytań HTTP z maskowaniem tokenów i dziennik zmian.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={refreshAll}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg border border-slate-700 flex items-center gap-2 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Odśwież</span>
          </button>
        </div>
      </div>

      {/* SUB-TABS SELECTOR */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab("JOBS")}
          className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition flex items-center gap-2 ${
            activeSubTab === "JOBS"
              ? "bg-yellow-400 text-slate-950 shadow-sm"
              : "text-slate-400 hover:text-white bg-slate-900/60"
          }`}
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Kolejka Zadań ({jobs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("API_LOGS")}
          className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition flex items-center gap-2 ${
            activeSubTab === "API_LOGS"
              ? "bg-yellow-400 text-slate-950 shadow-sm"
              : "text-slate-400 hover:text-white bg-slate-900/60"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Logi API & Correlation ID ({apiLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("AUDIT")}
          className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition flex items-center gap-2 ${
            activeSubTab === "AUDIT"
              ? "bg-yellow-400 text-slate-950 shadow-sm"
              : "text-slate-400 hover:text-white bg-slate-900/60"
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Audyt Zmian ({auditLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: JOB QUEUE */}
      {activeSubTab === "JOBS" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className={`p-4 bg-slate-900 border rounded-xl cursor-pointer transition ${
                  selectedJob?.id === job.id
                    ? "border-yellow-400 bg-slate-850"
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800 uppercase font-bold">
                        {job.targetSystem}
                      </span>
                      <span className="text-xs font-mono text-yellow-400 font-bold">{job.correlationId}</span>
                    </div>
                    <div className="text-xs font-bold text-white mt-1.5">{job.title}</div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        job.status === "SUCCESS"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : job.status === "PROCESSING"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse"
                          : job.status === "FAILED"
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {job.status}
                    </span>
                    <div className="text-[10px] font-mono text-slate-400 mt-1">
                      Próba {job.attempts} / {job.maxAttempts}
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Utworzono: {job.createdAt.substring(11, 19)}</span>
                  {job.status === "FAILED" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRetryJob(job.id);
                      }}
                      className="text-yellow-400 hover:underline font-bold"
                    >
                      [ PONÓW PRÓBĘ ]
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-5">
            {selectedJob ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 sticky top-20">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400">SZCZEGÓŁY ZADANIA</span>
                    <h3 className="text-xs font-mono font-bold text-yellow-400">{selectedJob.correlationId}</h3>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                    {selectedJob.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400">Typ zadania:</span>{" "}
                    <span className="font-mono text-white">{selectedJob.type}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Kanał docelowy:</span>{" "}
                    <span className="font-bold text-white uppercase">{selectedJob.targetSystem}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Licznik prób:</span>{" "}
                    <span className="font-mono text-white">
                      {selectedJob.attempts} z {selectedJob.maxAttempts}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-3">
                  <h4 className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2">
                    Dziennik wykonania (Execution Steps)
                  </h4>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1.5 text-slate-300 max-h-60 overflow-y-auto">
                    {selectedJob.logs.map((log, i) => (
                      <div key={i} className="text-slate-300">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => handleRetryJob(selectedJob.id)}
                    className="flex-1 py-1.5 px-3 bg-yellow-400 text-slate-950 font-black text-xs rounded hover:bg-yellow-300 transition"
                  >
                    Ponów zadanie (Retry)
                  </button>
                  <button
                    onClick={() => handleCancelJob(selectedJob.id)}
                    className="py-1.5 px-3 bg-slate-800 text-slate-300 font-bold text-xs rounded hover:bg-slate-700 transition"
                  >
                    Anuluj
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl text-slate-400 text-xs">
                Wybierz zadanie z listy po lewej, aby podejrzeć szczegółowy dziennik kroków wykonawczych.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: API DIAGNOSTICS & LOGS */}
      {activeSubTab === "API_LOGS" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={apiSearch}
              onChange={(e) => setApiSearch(e.target.value)}
              placeholder="Filtruj logi po Correlation ID (BUS-...), integracji, adresie URL, kodzie HTTP..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-yellow-400 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-500 font-mono transition"
            />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px] bg-slate-950/60">
                    <th className="p-3">Correlation ID</th>
                    <th className="p-3">Integracja</th>
                    <th className="p-3">Metoda & Endpoint</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Czas</th>
                    <th className="p-3 text-right">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredApiLogs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedApiLog(log)}
                      className="hover:bg-slate-850/50 cursor-pointer transition"
                    >
                      <td className="p-3 text-yellow-400 font-bold">{log.correlationId}</td>
                      <td className="p-3 text-slate-200">{log.integration}</td>
                      <td className="p-3 text-slate-300">
                        <span className="font-bold text-white mr-1.5">{log.method}</span>
                        <span className="text-slate-400 truncate max-w-xs inline-block align-bottom">
                          {log.endpoint}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                            log.httpStatus >= 200 && log.httpStatus < 300
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}
                        >
                          {log.httpStatus}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">{log.durationMs} ms</td>
                      <td className="p-3 text-right text-slate-400 text-[10px]">
                        {log.timestamp.substring(11, 19)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* LOG DETAIL MODAL */}
          {selectedApiLog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
              <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400">SZCZEGÓŁY ZAPYTANIA HTTP</span>
                    <h3 className="text-sm font-mono font-bold text-yellow-400">
                      {selectedApiLog.correlationId}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedApiLog(null)}
                    className="text-slate-400 hover:text-white transition"
                  >
                    Zamknij
                  </button>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px]">
                    <div>
                      <span className="text-slate-400">Integracja:</span> {selectedApiLog.integration}
                    </div>
                    <div>
                      <span className="text-slate-400">Metoda:</span> {selectedApiLog.method}
                    </div>
                    <div>
                      <span className="text-slate-400">Status HTTP:</span> {selectedApiLog.httpStatus}
                    </div>
                    <div>
                      <span className="text-slate-400">Czas odpowiedzi:</span> {selectedApiLog.durationMs} ms
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px]">URL Endpoint:</span>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800 text-white break-all text-[11px]">
                      {selectedApiLog.endpoint}
                    </div>
                  </div>

                  {selectedApiLog.responsePayloadSnippet && (
                    <div>
                      <span className="text-slate-400 text-[11px]">Odpowiedź API (Maskowane tokeny/hasła):</span>
                      <pre className="bg-slate-950 p-3 rounded border border-slate-800 text-slate-300 text-[10px] overflow-x-auto max-h-48">
                        {selectedApiLog.responsePayloadSnippet}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {activeSubTab === "AUDIT" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px] bg-slate-950/60">
                  <th className="p-3.5">Użytkownik / Operator</th>
                  <th className="p-3.5">Akcja</th>
                  <th className="p-3.5">Typ Obiektu</th>
                  <th className="p-3.5">Podsumowanie Zmian</th>
                  <th className="p-3.5 text-right font-mono">Data i Czas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-850/40 transition">
                    <td className="p-3.5 font-bold text-white">{log.userName}</td>
                    <td className="p-3.5 font-mono text-[11px] text-yellow-400">{log.action}</td>
                    <td className="p-3.5 font-mono text-[11px]">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {log.entityType}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-300">{log.changesSummary}</td>
                    <td className="p-3.5 text-right font-mono text-slate-400 text-[11px]">
                      {log.timestamp.substring(0, 16).replace("T", " ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
