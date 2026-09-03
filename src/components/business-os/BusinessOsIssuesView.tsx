import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  ArrowRight,
  ShieldAlert,
  RefreshCw,
  Layers,
  ShoppingBag,
  Warehouse,
  FileText,
} from "lucide-react";
import { PartItem, ActiveTabType } from "../../types";
import { BusinessIssue } from "../../types/businessCore";
import { businessCoreService } from "../../services/businessCoreService";

interface BusinessOsIssuesViewProps {
  parts: PartItem[];
  onNavigateTab: (tab: ActiveTabType) => void;
}

export const BusinessOsIssuesView: React.FC<BusinessOsIssuesViewProps> = ({
  parts,
  onNavigateTab,
}) => {
  const [issues, setIssues] = useState<BusinessIssue[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");

  useEffect(() => {
    loadIssues();
  }, [parts]);

  const loadIssues = () => {
    setIssues(businessCoreService.detectBusinessIssues(parts));
  };

  const filtered = issues.filter((i) => {
    const matchesCat = categoryFilter === "ALL" || i.category === categoryFilter;
    const matchesSev = severityFilter === "ALL" || i.severity === severityFilter;
    return matchesCat && matchesSev;
  });

  const criticalCount = issues.filter((i) => i.severity === "CRITICAL").length;
  const warningCount = issues.filter((i) => i.severity === "WARNING").length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-black text-white tracking-tight">
              Centrum Problemów & Diagnostyki Operacyjnej
            </h1>
          </div>
          <p className="text-xs text-slate-300">
            Zautomatyzowane reguły detekcji błędów marketplace, braków w stanach WMS i niezgodności cenowych.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-3 py-1.5 bg-red-950/40 border border-red-500/30 text-red-300 rounded-lg">
            Krytyczne: <strong>{criticalCount}</strong>
          </span>
          <span className="px-3 py-1.5 bg-amber-950/40 border border-amber-500/30 text-amber-300 rounded-lg">
            Ostrzeżenia: <strong>{warningCount}</strong>
          </span>
          <button
            onClick={loadIssues}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            title="Przeskanuj ponownie"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3">
        <div className="flex items-center gap-2">
          {["ALL", "ALLEGRO", "OVOKO", "MAGAZYN", "FINANSE"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                categoryFilter === cat
                  ? "bg-yellow-400 text-slate-950 shadow-sm"
                  : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {cat === "ALL" ? "Wszystkie obszary" : cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-1.5 font-medium"
          >
            <option value="ALL">Wszystkie priorytety</option>
            <option value="CRITICAL">Tylko krytyczne</option>
            <option value="WARNING">Tylko ostrzeżenia</option>
            <option value="INFO">Informacyjne</option>
          </select>
        </div>
      </div>

      {/* ISSUES LIST */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <div className="font-bold text-slate-100 text-sm">Brak aktywnych problemów!</div>
            <p className="text-xs text-slate-400">
              Wszystkie oferty marketplace, stany magazynowe i dokumenty spełniają reguły spójności.
            </p>
          </div>
        ) : (
          filtered.map((issue) => (
            <div
              key={issue.id}
              className={`p-5 rounded-xl border transition ${
                issue.severity === "CRITICAL"
                  ? "bg-red-950/15 border-red-500/30 hover:border-red-500/50"
                  : issue.severity === "WARNING"
                  ? "bg-amber-950/15 border-amber-500/30 hover:border-amber-500/50"
                  : "bg-slate-900 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        issue.severity === "CRITICAL"
                          ? "bg-red-500/20 text-red-300 border border-red-500/30"
                          : issue.severity === "WARNING"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      }`}
                    >
                      {issue.severity}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 uppercase bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {issue.category}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white">{issue.title}</h3>
                  <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">{issue.description}</p>
                </div>

                <div className="shrink-0">
                  <button
                    onClick={() => onNavigateTab(issue.targetTab as ActiveTabType)}
                    className="w-full sm:w-auto px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition"
                  >
                    <span>{issue.quickActionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
