import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  ShoppingBag,
  Package,
  Warehouse,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Globe,
  Layers,
  Search,
  Plus,
  Zap,
  ChevronRight,
  Database,
  Building2,
  FileText,
} from "lucide-react";
import { PartItem, ActiveTabType } from "../../types";
import { businessCoreService } from "../../services/businessCoreService";
import { externalMappingService } from "../../services/externalMappingService";
import {
  BusinessIssue,
  IntegrationAccountInfo,
  FinanceOverview,
  Order,
} from "../../types/businessCore";

interface BusinessOsDashboardViewProps {
  parts: PartItem[];
  onNavigateTab: (tab: ActiveTabType) => void;
  onOpenScanner?: () => void;
  onOpenAllegro?: () => void;
  onOpenWms?: () => void;
}

export const BusinessOsDashboardView: React.FC<BusinessOsDashboardViewProps> = ({
  parts,
  onNavigateTab,
  onOpenScanner,
  onOpenAllegro,
  onOpenWms,
}) => {
  const [issues, setIssues] = useState<BusinessIssue[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationAccountInfo[]>([]);
  const [finance, setFinance] = useState<FinanceOverview | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    refreshData();
  }, [parts]);

  const refreshData = () => {
    setIsRefreshing(true);
    externalMappingService.syncFromParts(parts);
    setIssues(businessCoreService.detectBusinessIssues(parts));
    setIntegrations(businessCoreService.getIntegrationsStatus());
    setFinance(businessCoreService.getFinanceOverview(parts));
    setOrders(businessCoreService.getOrders());
    setTimeout(() => setIsRefreshing(false), 400);
  };

  const totalPartsInStock = parts.reduce((acc, p) => acc + (p.listingData?.stan_magazynowy ?? 1), 0);
  const totalStockValueGross = parts.reduce(
    (acc, p) => acc + (p.listingData?.cena?.brutto || 0) * (p.listingData?.stan_magazynowy ?? 1),
    0
  );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* EXECUTIVE HEADER */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-400/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wider uppercase bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 font-mono">
                BUSINESS OS v1.0 • SOURCE OF TRUTH
              </span>
              <span className="text-xs text-slate-400 font-mono">PHU U KONESERA / KM ZŁOM</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Centrum Dowodzenia i Dashboard Operacyjny
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Zintegrowany ekosystem: Magazyn WMS, Marketplace (Allegro, Ovoko, ShopGold), Zamówienia i Rejestry Państwowe.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={refreshData}
              disabled={isRefreshing}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-2 transition"
              title="Odśwież wskaźniki i synchronizację"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-yellow-400" : ""}`} />
              <span>Odśwież stan</span>
            </button>

            <button
              onClick={() => onNavigateTab("business_contractors")}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-2 transition"
            >
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Sprawdź NIP</span>
            </button>

            <button
              onClick={() => onNavigateTab("skaner")}
              className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black rounded-lg shadow-sm flex items-center gap-2 transition"
            >
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              <span>Skaner AI części</span>
            </button>
          </div>
        </div>
      </div>

      {/* TOP 5 METRICS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Metric 1: Sprzedaż dzisiaj */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Sprzedaż dzisiaj</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {finance?.todayRevenuePln.toLocaleString("pl-PL")} <span className="text-xs font-normal text-slate-400">PLN</span>
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            <span>+18.4% w tym tyg.</span>
          </div>
        </div>

        {/* Metric 2: Zamówienia aktywne */}
        <div 
          onClick={() => onNavigateTab("business_orders")}
          className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl cursor-pointer hover:border-blue-500/50 transition group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Zamówienia</span>
            <ShoppingBag className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {orders.length} <span className="text-xs font-normal text-slate-400">szt.</span>
          </div>
          <div className="text-[11px] text-blue-400 mt-1">
            {orders.filter(o => o.fulfillmentStatus === "IN_PREPARATION").length} w realizacji na WMS
          </div>
        </div>

        {/* Metric 3: Produkty w katalogu */}
        <div 
          onClick={() => onNavigateTab("magazyn")}
          className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl cursor-pointer hover:border-yellow-500/50 transition group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Katalog Master</span>
            <Package className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {parts.length} <span className="text-xs font-normal text-slate-400">pozycji</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {parts.filter(p => p.allegroStatus === "active").length} aktywnych na Allegro
          </div>
        </div>

        {/* Metric 4: Stan magazynu */}
        <div 
          onClick={() => onNavigateTab("magazyn")}
          className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl cursor-pointer hover:border-indigo-500/50 transition group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Wartość WMS</span>
            <Warehouse className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {Math.round(totalStockValueGross).toLocaleString("pl-PL")} <span className="text-xs font-normal text-slate-400">PLN</span>
          </div>
          <div className="text-[11px] text-indigo-400 mt-1">
            {totalPartsInStock} szt. na regałach
          </div>
        </div>

        {/* Metric 5: Problemy do rozwiązania */}
        <div 
          onClick={() => onNavigateTab("business_issues")}
          className={`bg-slate-900/90 border p-4 rounded-xl cursor-pointer transition group ${
            issues.length > 0 ? "border-amber-500/50 hover:border-amber-400" : "border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Centrum problemów</span>
            <AlertTriangle className={`w-4 h-4 ${issues.length > 0 ? "text-amber-400 animate-pulse" : "text-slate-500"}`} />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {issues.length} <span className="text-xs font-normal text-slate-400">alertów</span>
          </div>
          <div className="text-[11px] text-amber-400 mt-1 font-semibold">
            {issues.filter(i => i.severity === "CRITICAL").length > 0 ? "Wymaga uwagi operatora" : "Wszystko w normie"}
          </div>
        </div>
      </div>

      {/* TWO COLUMN GRID: INTEGRATIONS MATRIX & ISSUES CENTER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT 7 COLS: STATUS INTEGRACJI & MARKETPLACE MATRIX */}
        <div className="lg:col-span-7 space-y-6">
          {/* INTEGRATIONS STATUS */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-yellow-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Stan Integracji Zewnętrznych
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab("business_integrations")}
                className="text-xs text-yellow-400 hover:text-yellow-300 font-semibold flex items-center gap-1"
              >
                <span>Konfiguracja API</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {integrations.map((item) => (
                <div
                  key={item.code}
                  className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 p-3 rounded-lg flex items-center justify-between gap-3 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        item.status === "CONNECTED"
                          ? "bg-emerald-400 shadow-sm shadow-emerald-400/50"
                          : item.status === "WARNING"
                          ? "bg-amber-400"
                          : item.status === "SYNCING"
                          ? "bg-blue-400 animate-pulse"
                          : "bg-red-400"
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-200 truncate">{item.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{item.accountIdentifier || "Połączony"}</div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        item.status === "CONNECTED"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : item.status === "WARNING"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {item.status === "CONNECTED" ? "POŁĄCZONE" : item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MARKETPLACE MATRIX OVERVIEW */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Marketplace Matrix (Próbka Katalogu)
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab("compare_marketplaces")}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
              >
                <span>Pełna matryca</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                    <th className="pb-2 font-medium">SKU / Produkt Master</th>
                    <th className="pb-2 font-medium text-center">Allegro</th>
                    <th className="pb-2 font-medium text-center">Ovoko</th>
                    <th className="pb-2 font-medium text-center">ShopGold</th>
                    <th className="pb-2 font-medium text-right">Regał WMS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {parts.slice(0, 5).map((part) => {
                    const hasAllegro = Boolean(part.allegroOfferId || part.listingData?.allegro?.offerId);
                    const isAllegroActive = part.allegroStatus === "active" || part.listingData?.allegro?.status === "active";
                    const hasOvoko = part.listingData?.publishedPlatforms?.some((p) => p.platform.includes("Ovoko"));
                    const hasShopGold = part.listingData?.publishedPlatforms?.some((p) => p.platform.includes("ShopGold"));

                    return (
                      <tr key={part.id} className="hover:bg-slate-850/50 transition">
                        <td className="py-2.5 pr-2 font-sans font-medium text-slate-200">
                          <div className="font-bold text-xs truncate max-w-[220px]">
                            {part.listingData?.kategoria || "Część samochodowa"}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {part.barcode || part.id} • {part.listingData?.producent || "OEM"}
                          </div>
                        </td>
                        <td className="py-2.5 text-center">
                          {isAllegroActive ? (
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400" title="Allegro: Aktywna" />
                          ) : hasAllegro ? (
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" title="Allegro: Draft / Walidacja" />
                          ) : (
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-700" title="Brak oferty" />
                          )}
                        </td>
                        <td className="py-2.5 text-center">
                          {hasOvoko ? (
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400" title="Ovoko: Opublikowano" />
                          ) : (
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-700" title="Brak oferty" />
                          )}
                        </td>
                        <td className="py-2.5 text-center">
                          {hasShopGold ? (
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400" title="ShopGold: Zsynchronizowano" />
                          ) : (
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-700" title="Brak oferty" />
                          )}
                        </td>
                        <td className="py-2.5 text-right text-[11px] text-yellow-400">
                          {part.currentRackLocation || "MAG 01"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT 5 COLS: ISSUE CENTER & RECENT ORDERS */}
        <div className="lg:col-span-5 space-y-6">
          {/* ISSUE CENTER */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Centrum Problemów ({issues.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Auto-Diagnostyka</span>
            </div>

            {issues.length === 0 ? (
              <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Brak aktywnych problemów w firmie. Wszystkie stany WMS i oferty poprawne.</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {issues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`p-3 rounded-lg border text-xs ${
                      issue.severity === "CRITICAL"
                        ? "bg-red-950/20 border-red-500/30 text-red-200"
                        : "bg-amber-950/20 border-amber-500/30 text-amber-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-100">{issue.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                          {issue.description}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center justify-end">
                      <button
                        onClick={() => onNavigateTab(issue.targetTab as ActiveTabType)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-yellow-400 font-bold text-[11px] rounded border border-slate-700 flex items-center gap-1.5 transition"
                      >
                        <span>{issue.quickActionLabel}</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RECENT ORDERS SNIPPET */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Ostatnie Zamówienia
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab("business_orders")}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
              >
                <span>Wszystkie ({orders.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {orders.slice(0, 3).map((order) => (
                <div
                  key={order.id}
                  className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-200 truncate">{order.customerName}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-yellow-400">{order.channel}</span>
                      <span>•</span>
                      <span>{order.items[0]?.name || "Część"}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-white">{order.totalGrossPln} PLN</div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {order.fulfillmentStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
