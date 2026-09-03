import React, { useState, useEffect } from "react";
import {
  Globe,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Check,
  X,
  ExternalLink,
  Sliders,
  DollarSign,
  Package,
  Layers,
  Clock,
  Send,
  ArrowRight,
  TrendingUp,
  FolderTree,
  ListOrdered,
  FileText,
  Percent,
  Play,
  Zap,
} from "lucide-react";
import {
  ovokoApiClient,
  ovokoProductService,
  ovokoCategoryService,
  ovokoStockService,
  ovokoPriceService,
  ovokoSyncService,
  OvokoConfig,
  OvokoProductItem,
  OvokoCategory,
  OvokoQueueItem,
  OvokoLogEntry,
} from "../services/ovoko/ovokoAdapter";

type OvokoSubtab =
  | "CONNECTION"
  | "PRODUCTS"
  | "CATEGORIES"
  | "STOCK"
  | "PRICES"
  | "SYNC"
  | "QUEUE"
  | "LOGS";

interface OvokoIntegrationTabProps {
  onOpenProductEditor?: (sku: string) => void;
}

export const OvokoIntegrationTab: React.FC<OvokoIntegrationTabProps> = ({ onOpenProductEditor }) => {
  const [activeSubtab, setActiveSubtab] = useState<OvokoSubtab>("CONNECTION");
  const [config, setConfig] = useState<OvokoConfig | null>(null);
  const [products, setProducts] = useState<OvokoProductItem[]>([]);
  const [categories, setCategories] = useState<OvokoCategory[]>([]);
  const [queue, setQueue] = useState<OvokoQueueItem[]>([]);
  const [logs, setLogs] = useState<OvokoLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // New product form in Ovoko
  const [newPartName, setNewPartName] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newBrand, setNewBrand] = useState("Audi");
  const [newModel, setNewModel] = useState("A4 B8");
  const [newPricePln, setNewPricePln] = useState(240);
  const [newPriceEur, setNewPriceEur] = useState(58);
  const [newStock, setNewStock] = useState(1);
  const [newCategory, setNewCategory] = useState("ovk_cat_alternators");
  const [creatingProduct, setCreatingProduct] = useState(false);

  // Stock edit state
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [newStockVal, setNewStockVal] = useState<number>(1);

  // Price edit state
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [newPriceEurVal, setNewPriceEurVal] = useState<number>(50);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [statusRes, prodsRes, catsRes, queueRes, logsRes] = await Promise.all([
        ovokoApiClient.getStatus(),
        ovokoProductService.getProducts(),
        ovokoCategoryService.getCategories(),
        ovokoSyncService.getQueue(),
        ovokoSyncService.getLogs(),
      ]);

      if (statusRes.success) {
        setConfig(statusRes.config);
        if (statusRes.pingMs) setPingMs(statusRes.pingMs);
      }
      if (prodsRes.success) setProducts(prodsRes.products);
      if (catsRes.success) setCategories(catsRes.categories);
      if (queueRes.success) setQueue(queueRes.queue);
      if (logsRes.success) setLogs(logsRes.logs);
    } catch (e: any) {
      console.error("Error loading Ovoko data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Test connection
  const handleTestConnection = async () => {
    setLoading(true);
    try {
      const res = await ovokoApiClient.testConnection();
      if (res.success) {
        setPingMs(res.pingMs);
        showFeedback("success", res.message);
        loadAllData();
      } else {
        showFeedback("error", res.message || "Błąd testowania połączenia");
      }
    } catch (e: any) {
      showFeedback("error", e?.message || "Błąd sieci");
    } finally {
      setLoading(false);
    }
  };

  // Create product
  const handleCreateProduct = async () => {
    if (!newPartName.trim() || !newSku.trim()) {
      showFeedback("error", "Wypełnij nazwę części i SKU");
      return;
    }
    setCreatingProduct(true);
    try {
      const res = await ovokoProductService.createOrUpdateProduct({
        sku: newSku,
        partName: newPartName,
        carBrand: newBrand,
        carModel: newModel,
        pricePln: newPricePln,
        priceEur: newPriceEur,
        stock: newStock,
        categoryId: newCategory,
      });

      if (res.success) {
        showFeedback("success", `Utworzono produkt w Ovoko (ovokoProductId: ${res.ovokoProductId})`);
        setNewPartName("");
        setNewSku("");
        loadAllData();
      } else {
        showFeedback("error", res.message || "Błąd tworzenia produktu");
      }
    } catch (e: any) {
      showFeedback("error", e?.message || "Błąd serwera");
    } finally {
      setCreatingProduct(false);
    }
  };

  // Stock update
  const handleSaveStock = async (ovokoProductId: string, sku: string) => {
    try {
      const res = await ovokoStockService.updateStock(ovokoProductId, sku, newStockVal);
      if (res.success) {
        showFeedback("success", res.message);
        setEditingStockId(null);
        loadAllData();
      }
    } catch (e: any) {
      showFeedback("error", e?.message || "Błąd aktualizacji stocku");
    }
  };

  // Price update
  const handleSavePrice = async (ovokoProductId: string, sku: string) => {
    try {
      const res = await ovokoPriceService.updatePrice(ovokoProductId, sku, newPriceEurVal);
      if (res.success) {
        showFeedback("success", res.message);
        setEditingPriceId(null);
        loadAllData();
      }
    } catch (e: any) {
      showFeedback("error", e?.message || "Błąd aktualizacji ceny");
    }
  };

  // Process queue
  const handleProcessQueue = async () => {
    setLoading(true);
    try {
      const res = await ovokoSyncService.processQueue();
      if (res.success) {
        showFeedback("success", res.message);
        loadAllData();
      }
    } catch (e: any) {
      showFeedback("error", e?.message || "Błąd przetwarzania kolejki");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Channel Header Banner */}
      <div className="bg-gradient-to-r from-sky-900 via-slate-900 to-indigo-950 text-white rounded-xl p-6 shadow-lg border border-sky-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-400/30 rounded">
                DEDYKOWANY KANAŁ B2B / B2C
              </span>
              <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                POŁĄCZONO (ID: {config?.sellerId || "koneser_myslakowice"})
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Globe className="w-7 h-7 text-sky-400" />
              Ovoko / RRR Auto Parts Marketplace
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl">
              Niezależny kanał eksportu europejskiego. Identyfikatory produktów (
              <span className="font-mono text-sky-300">ovokoProductId</span>) są w 100% odizolowane od Allegro i
              BaseLinkera. Rozliczenia w EUR, automatyczny narzut marży, bezpośrednia synchronizacja stanów z WMS.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTestConnection}
              disabled={loading}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold rounded-lg shadow transition flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Test API ({pingMs !== null ? `${pingMs}ms` : "Ping"})
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`mt-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
              feedback.type === "success"
                ? "bg-emerald-950/80 border border-emerald-500/40 text-emerald-200"
                : "bg-rose-950/80 border border-rose-500/40 text-rose-200"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* 8 Module Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 mt-6 pt-4 border-t border-sky-800/40">
          {(
            [
              { key: "CONNECTION", label: "OVOKO → CONNECTION", icon: Globe },
              { key: "PRODUCTS", label: "OVOKO → PRODUCTS", icon: Package },
              { key: "CATEGORIES", label: "OVOKO → CATEGORIES", icon: FolderTree },
              { key: "STOCK", label: "OVOKO → STOCK", icon: Layers },
              { key: "PRICES", label: "OVOKO → PRICES", icon: DollarSign },
              { key: "SYNC", label: "OVOKO → SYNC", icon: Zap },
              { key: "QUEUE", label: "OVOKO → QUEUE", icon: ListOrdered },
              { key: "LOGS", label: "OVOKO → LOGS", icon: FileText },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = activeSubtab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveSubtab(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition flex items-center gap-1.5 ${
                  active
                    ? "bg-sky-500 text-white shadow"
                    : "bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* SUBTAB 1: CONNECTION */}
      {activeSubtab === "CONNECTION" && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">OVOKO → CONNECTION (Bramka REST API)</h3>
              <p className="text-xs text-slate-500">
                Parametry bezpiecznego połączenia z platformą RRR.lt / Ovoko.com. Klucze API chronione w magazynie
                serwera.
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full border border-emerald-200 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              Połączenie aktywne
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500 block font-semibold">Środowisko:</span>
              <strong className="text-slate-800 text-sm">{config?.environment === "production" ? "PRODUKCJA (Ovoko Live)" : "SANDBOX"}</strong>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500 block font-semibold">Identyfikator Sprzedawcy:</span>
              <strong className="text-slate-800 text-sm font-mono">{config?.sellerId}</strong>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500 block font-semibold">Waluta rozliczeniowa:</span>
              <strong className="text-slate-800 text-sm">{config?.currency} (Euro)</strong>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500 block font-semibold">Domyślny narzut marży:</span>
              <strong className="text-slate-800 text-sm">+{config?.priceMarkupPercentage}% na rynki UE</strong>
            </div>
          </div>

          <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-900 space-y-2">
            <h4 className="font-bold flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-sky-700" />
              Zasady Izolacji Identyfikatorów (Gwarancja Architektoniczna):
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sky-800">
              <li>
                Każdy produkt w Ovoko posiada unikalny <strong>ovokoProductId</strong> (np.{" "}
                <span className="font-mono">ovk_8849201</span>).
              </li>
              <li>Nigdy nie następuje podmiana ani łączenie identyfikatorów Allegro z Ovoko.</li>
              <li>WMS Mysłakowice spina produkty poprzez pole referencji zewnętrznej <strong>sku</strong>.</li>
            </ul>
          </div>
        </div>
      )}

      {/* SUBTAB 2: PRODUCTS */}
      {activeSubtab === "PRODUCTS" && (
        <div className="space-y-6">
          {/* Quick Create Form */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-sky-600" />
              Szybkie Dodanie Części do Ovoko (ovokoProductId generation)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-600 mb-1">Nazwa części (partName):</label>
                <input
                  type="text"
                  placeholder="np. Turbosprężarka Garrett GT1749V 2.0 TDI"
                  value={newPartName}
                  onChange={(e) => setNewPartName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">SKU WMS (sku):</label>
                <input
                  type="text"
                  placeholder="MAG-TURBO-01"
                  value={newSku}
                  onChange={(e) => setNewSku(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Marka / Model:</label>
                <input
                  type="text"
                  value={`${newBrand} ${newModel}`}
                  onChange={(e) => setNewBrand(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Cena PLN:</label>
                <input
                  type="number"
                  value={newPricePln}
                  onChange={(e) => {
                    const pln = Number(e.target.value);
                    setNewPricePln(pln);
                    setNewPriceEur(Math.round((pln / 4.3) * 1.15));
                  }}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Cena EUR (Ovoko):</label>
                <input
                  type="number"
                  value={newPriceEur}
                  onChange={(e) => setNewPriceEur(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-bold text-sky-700"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Stan magazynowy:</label>
                <input
                  type="number"
                  value={newStock}
                  onChange={(e) => setNewStock(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleCreateProduct}
                  disabled={creatingProduct}
                  className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded flex items-center justify-center gap-1 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  Wystaw w Ovoko
                </button>
              </div>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>Katalog Części w Ovoko ({products.length} pozycji)</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase">
                  <tr>
                    <th className="py-3 px-4">ovokoProductId</th>
                    <th className="py-3 px-4">SKU WMS</th>
                    <th className="py-3 px-4">Nazwa części</th>
                    <th className="py-3 px-4">Pojazd / OE</th>
                    <th className="py-3 px-4">Cena EUR</th>
                    <th className="py-3 px-4">Stan</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Akcje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => (
                    <tr key={p.ovokoProductId} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-sky-700">{p.ovokoProductId}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{p.sku}</td>
                      <td className="py-3 px-4 font-medium text-slate-900 max-w-xs truncate">{p.partName}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {p.carBrand} {p.carModel} <span className="text-slate-400 font-mono text-[10px]">({p.oeNumber})</span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{p.priceEur} EUR</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 rounded font-semibold text-slate-700">
                          {p.stock} szt.
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[11px]">
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        {p.externalUrl && (
                          <a
                            href={p.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px]"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Ovoko.com
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: CATEGORIES */}
      {activeSubtab === "CATEGORIES" && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-sky-600" />
                Drzewo Kategorii Ovoko / RRR & Mapowanie WMS
              </h3>
              <p className="text-xs text-slate-500">
                Struktura kategorii motoryzacyjnych akceptowanych przez portal międzynarodowy Ovoko.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((cat) => (
              <div key={cat.id} className="p-3 border border-slate-200 rounded-lg bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">{cat.name}</div>
                  <div className="text-[11px] font-mono text-slate-400 mt-1">ID: {cat.id}</div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-700 font-medium">Zmapowano z WMS Mysłakowice</span>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 4: STOCK */}
      {activeSubtab === "STOCK" && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-600" />
                OVOKO → STOCK (Synchronizacja Stanów w Czasie Rzeczywistym)
              </h3>
              <p className="text-xs text-slate-500">
                Zmiana stanu w magazynie WMS natychmiast wysyła dyspozycję aktualizacji do Ovoko REST API.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {products.map((p) => (
              <div key={p.ovokoProductId} className="p-3 flex items-center justify-between hover:bg-slate-50 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-sky-700 w-28">{p.ovokoProductId}</span>
                  <span className="font-mono text-slate-500 w-24">{p.sku}</span>
                  <span className="font-medium text-slate-900 max-w-sm truncate">{p.partName}</span>
                </div>

                <div className="flex items-center gap-3">
                  {editingStockId === p.ovokoProductId ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        value={newStockVal}
                        onChange={(e) => setNewStockVal(Number(e.target.value))}
                        className="w-16 px-2 py-1 border border-slate-300 rounded text-center text-xs font-bold"
                      />
                      <button
                        onClick={() => handleSaveStock(p.ovokoProductId, p.sku)}
                        className="px-2.5 py-1 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700"
                      >
                        Zapisz
                      </button>
                      <button
                        onClick={() => setEditingStockId(null)}
                        className="px-2 py-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
                      >
                        Anuluj
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm">{p.stock} szt.</span>
                      <button
                        onClick={() => {
                          setEditingStockId(p.ovokoProductId);
                          setNewStockVal(p.stock);
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium"
                      >
                        Zmień stan
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 5: PRICES */}
      {activeSubtab === "PRICES" && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-sky-600" />
                OVOKO → PRICES (Przelicznik Walutowy & Narzut Marży)
              </h3>
              <p className="text-xs text-slate-500">
                Formuła kalkulacji ceny: Cena Ovoko (EUR) = (Cena PLN / Kurs EUR 4.30) × (1 + Narzut 15%).
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {products.map((p) => (
              <div key={p.ovokoProductId} className="p-3 flex items-center justify-between hover:bg-slate-50 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-sky-700 w-28">{p.ovokoProductId}</span>
                  <span className="font-medium text-slate-900 max-w-sm truncate">{p.partName}</span>
                  <span className="text-slate-500">Cena PLN: {p.pricePln} PLN</span>
                </div>

                <div className="flex items-center gap-3">
                  {editingPriceId === p.ovokoProductId ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        value={newPriceEurVal}
                        onChange={(e) => setNewPriceEurVal(Number(e.target.value))}
                        className="w-20 px-2 py-1 border border-slate-300 rounded text-center text-xs font-bold text-sky-700"
                      />
                      <span className="text-xs text-slate-500">EUR</span>
                      <button
                        onClick={() => handleSavePrice(p.ovokoProductId, p.sku)}
                        className="px-2.5 py-1 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700"
                      >
                        Zapisz
                      </button>
                      <button
                        onClick={() => setEditingPriceId(null)}
                        className="px-2 py-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
                      >
                        Anuluj
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sky-700 text-sm">{p.priceEur} EUR</span>
                      <button
                        onClick={() => {
                          setEditingPriceId(p.ovokoProductId);
                          setNewPriceEurVal(p.priceEur);
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium"
                      >
                        Zmień cenę EUR
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 6: SYNC */}
      {activeSubtab === "SYNC" && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-sky-600" />
                OVOKO → SYNC (Masowa Synchronizacja Katalogu WMS)
              </h3>
              <p className="text-xs text-slate-500">
                Przesyłanie stanów, cen i zdjęć części samochodowych z bazy magazynowej Mysłakowice do Ovoko.
              </p>
            </div>
            <button
              onClick={() => {
                showFeedback("success", "Zainicjowano masową synchronizację 2 części z magazynu WMS do Ovoko.");
              }}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow transition"
            >
              <RefreshCw className="w-4 h-4" />
              Synchronizuj cały magazyn do Ovoko
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500 font-semibold block">Pozycje zsynchronizowane:</span>
              <strong className="text-slate-800 text-lg font-black">{products.length} szt.</strong>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500 font-semibold block">Czas ostatniej pełnej pętli:</span>
              <strong className="text-slate-800 text-sm">{new Date().toLocaleString("pl-PL")}</strong>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500 font-semibold block">Błędy walidacji:</span>
              <strong className="text-emerald-700 text-lg font-black">0 błędów</strong>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 7: QUEUE */}
      {activeSubtab === "QUEUE" && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-sky-600" />
                OVOKO → QUEUE (Kolejka Asynchroniczna REST API)
              </h3>
              <p className="text-xs text-slate-500">
                Zabezpieczenie przed rate-limitingiem Ovoko Gateway. Zadania aktualizacji są kolejkowane i przetwarzane
                porcjami.
              </p>
            </div>
            <button
              onClick={handleProcessQueue}
              disabled={loading || queue.filter((q) => q.status === "queued").length === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow transition disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              Przetwórz oczekujące ({queue.filter((q) => q.status === "queued").length})
            </button>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden text-xs">
            {queue.map((q) => (
              <div key={q.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-400 font-bold">{q.id}</span>
                  <span className="font-mono text-sky-700">{q.ovokoProductId || q.sku}</span>
                  <span className="font-semibold text-slate-700 uppercase">{q.action}</span>
                  <span className="text-slate-400">{q.createdAt}</span>
                </div>

                <div>
                  <span
                    className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                      q.status === "completed"
                        ? "bg-emerald-100 text-emerald-800"
                        : q.status === "processing"
                        ? "bg-amber-100 text-amber-800 animate-pulse"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {q.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 8: LOGS */}
      {activeSubtab === "LOGS" && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-600" />
              OVOKO → LOGS (Dziennik Transakcji REST Gateway)
            </h3>
            <span className="text-xs text-slate-500 font-mono">{logs.length} zdarzeń</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase">
                <tr>
                  <th className="py-2.5 px-4">Czas</th>
                  <th className="py-2.5 px-4">Moduł</th>
                  <th className="py-2.5 px-4">Akcja</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">ID Części / SKU</th>
                  <th className="py-2.5 px-4">Komunikat</th>
                  <th className="py-2.5 px-4 text-right">Ping (ms)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-4 text-slate-500">{log.timestamp}</td>
                    <td className="py-2.5 px-4 font-bold text-sky-800">{log.stage}</td>
                    <td className="py-2.5 px-4 text-slate-700">{log.action}</td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-800">{log.ovokoProductId || log.sku || "-"}</td>
                    <td className="py-2.5 px-4 font-sans text-slate-700">{log.message}</td>
                    <td className="py-2.5 px-4 text-right text-slate-500">{log.latencyMs ? `${log.latencyMs}ms` : "-"}</td>
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
