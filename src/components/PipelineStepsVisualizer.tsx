import React from "react";
import {
  Database,
  ShieldCheck,
  Search,
  FolderTree,
  Sliders,
  FileCode,
  Globe,
  Send,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { CanonicalProduct } from "../types/canonicalProduct";

interface PipelineStepsVisualizerProps {
  product?: CanonicalProduct | null;
  activeStage?: number;
  compact?: boolean;
}

export const PIPELINE_STEPS = [
  { id: 1, key: "product", label: "Produkt", icon: Database },
  { id: 2, key: "validation", label: "Walidacja", icon: ShieldCheck },
  { id: 3, key: "matching", label: "Matching Allegro", icon: Search },
  { id: 4, key: "category", label: "Mapowanie Kat.", icon: FolderTree },
  { id: 5, key: "parameters", label: "Parametry", icon: Sliders },
  { id: 6, key: "builder", label: "Offer Builder", icon: FileCode },
  { id: 7, key: "api", label: "Allegro REST API", icon: Globe },
  { id: 8, key: "publish", label: "Publikacja", icon: Send },
  { id: 9, key: "status", label: "Status Oferty", icon: CheckCircle2 },
  { id: 10, key: "sync", label: "Synchronizacja", icon: RefreshCw },
];

export const PipelineStepsVisualizer: React.FC<PipelineStepsVisualizerProps> = ({
  product,
  activeStage,
  compact = false,
}) => {
  // Determine completed stages based on product state
  const getStepStatus = (stepId: number): "completed" | "current" | "warning" | "error" | "pending" => {
    if (!product) {
      if (activeStage === stepId) return "current";
      if (activeStage && stepId < activeStage) return "completed";
      return "pending";
    }

    const isPublished = Boolean(product.marketplace_status?.allegro?.offer_id || product.status === "published");
    const isError = product.status === "sync_error" || (product.validation && !product.validation.isValid);
    const hasWarnings = product.validation?.hasWarnings;

    switch (stepId) {
      case 1: // Product
        return "completed";
      case 2: // Validation
        if (product.validation && !product.validation.isValid) return "error";
        if (hasWarnings) return "warning";
        return "completed";
      case 3: // Matching
        return product.product_match?.matched ? "completed" : "completed";
      case 4: // Category
        return product.category_name ? "completed" : "warning";
      case 5: // Parameters
        return Object.keys(product.parameters || {}).length > 0 ? "completed" : "warning";
      case 6: // Builder
        return product.name && product.price_gross > 0 ? "completed" : "pending";
      case 7: // API
        return isPublished ? "completed" : isError ? "error" : "pending";
      case 8: // Publish
        return isPublished ? "completed" : "pending";
      case 9: // Status
        return isPublished ? "completed" : "pending";
      case 10: // Sync
        return isPublished ? "completed" : "pending";
      default:
        return "pending";
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1 overflow-x-auto py-1.5 px-2 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px] font-mono">
        {PIPELINE_STEPS.map((step, idx) => {
          const status = getStepStatus(step.id);
          const Icon = step.icon;
          return (
            <React.Fragment key={step.id}>
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded transition ${
                  status === "completed"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold"
                    : status === "warning"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                    : status === "error"
                    ? "bg-red-500/10 text-red-400 border border-red-500/30"
                    : status === "current"
                    ? "bg-yellow-400 text-slate-950 font-bold shadow-xs"
                    : "bg-slate-900 text-slate-500 border border-slate-800/80"
                }`}
                title={`Krok ${step.id}: ${step.label}`}
              >
                <Icon className="w-3 h-3 shrink-0" />
                <span className="whitespace-nowrap">{step.label}</span>
              </div>
              {idx < PIPELINE_STEPS.length - 1 && (
                <span className="text-slate-700 text-[10px] select-none">→</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <div className="bg-[#030712] border border-slate-800 rounded-xl p-3 sm:p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
            Pipeline Wystawiania i Integracji Marketplace (10 Kroków)
          </span>
        </div>
        {product && (
          <span className="text-xs font-mono text-slate-400">
            SKU: <b className="text-yellow-400">{product.sku}</b> | GTIN: <b className="text-teal-400">{product.gtin || "brak"}</b>
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
        {PIPELINE_STEPS.map((step) => {
          const status = getStepStatus(step.id);
          const Icon = step.icon;

          let badgeColor = "bg-slate-900 text-slate-500 border-slate-800";
          if (status === "completed") badgeColor = "bg-emerald-950/40 text-emerald-300 border-emerald-500/40";
          if (status === "warning") badgeColor = "bg-amber-950/40 text-amber-300 border-amber-500/40";
          if (status === "error") badgeColor = "bg-red-950/40 text-red-300 border-red-500/40";
          if (status === "current") badgeColor = "bg-yellow-400 text-slate-950 border-yellow-300 font-black";

          return (
            <div
              key={step.id}
              className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${badgeColor}`}
            >
              <div className="flex items-center justify-center mb-1">
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono opacity-70">0{step.id}</span>
              <span className="text-[11px] font-semibold tracking-tight leading-tight mt-0.5">
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
