import React, { useState } from "react";
import {
  X,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  FileCode,
  Globe,
  Tag,
  Package,
  Layers,
  CheckCircle2,
  Send,
  ExternalLink,
  Copy,
  Check,
  Search,
  RefreshCw,
  Plus,
  Trash2,
} from "lucide-react";
import { CanonicalProduct } from "../types/canonicalProduct";
import { validateCanonicalProduct, validateGtinString } from "../services/productValidator";
import { buildAllegroOfferPayload } from "../services/allegroOfferBuilder";
import { matchProductWithAllegroCatalog } from "../services/allegroMatchingService";
import { optimizeProductWithAi } from "../services/aiProductService";
import { PipelineStepsVisualizer } from "./PipelineStepsVisualizer";
import { AllegroConfig } from "../types";

interface CanonicalProductDrawerProps {
  product: CanonicalProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: CanonicalProduct) => void;
  onPublishToAllegro?: (product: CanonicalProduct) => Promise<void>;
  allegroConfig?: AllegroConfig;
}

export const CanonicalProductDrawer: React.FC<CanonicalProductDrawerProps> = ({
  product,
  isOpen,
  onClose,
  onSave,
  onPublishToAllegro,
  allegroConfig,
}) => {
  if (!isOpen || !product) return null;

  const [formData, setFormData] = useState<CanonicalProduct>({ ...product });
  const [activeTab, setActiveTab] = useState<"details" | "parameters" | "validation" | "allegro_preview">("details");
  const [isOptimizingAi, setIsOptimizingAi] = useState(false);
  const [isMatchingAllegro, setIsMatchingAllegro] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [newParamKey, setNewParamKey] = useState("");
  const [newParamVal, setNewParamVal] = useState("");

  const validation = validateCanonicalProduct(formData);
  const allegroPayload = buildAllegroOfferPayload(formData, allegroConfig);

  const handleFieldChange = (field: keyof CanonicalProduct, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "price_gross") {
        next.price_net = Math.round(Number(value) / 1.23);
      }
      return next;
    });
  };

  const handleParameterChange = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [key]: value,
      },
    }));
  };

  const handleAddCustomParameter = () => {
    if (!newParamKey.trim()) return;
    setFormData((prev) => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [newParamKey.trim()]: newParamVal.trim(),
      },
    }));
    setNewParamKey("");
    setNewParamVal("");
  };

  const handleRemoveParameter = (key: string) => {
    setFormData((prev) => {
      const nextParams = { ...prev.parameters };
      delete nextParams[key];
      return { ...prev, parameters: nextParams };
    });
  };

  // 1-Click AI Optimizer
  const handleRunAiOptimize = async () => {
    setIsOptimizingAi(true);
    try {
      const result = await optimizeProductWithAi(formData);
      if (result.success && result.data) {
        setFormData((prev) => ({
          ...prev,
          name: result.data!.optimizedTitle,
          category_name: result.data!.suggestedCategory,
          category_id: result.data!.suggestedCategoryId,
          description_raw: result.data!.optimizedDescriptionRaw,
          description_html: result.data!.optimizedDescriptionHtml,
          parameters: {
            ...prev.parameters,
            ...result.data!.suggestedParameters,
          },
          ai_cocreated: true,
        }));
      }
    } finally {
      setIsOptimizingAi(false);
    }
  };

  // 1-Click Allegro Productization Matching
  const handleRunAllegroMatching = async () => {
    setIsMatchingAllegro(true);
    try {
      const match = await matchProductWithAllegroCatalog(formData, allegroConfig?.accessToken);
      setFormData((prev) => ({
        ...prev,
        product_match: match,
        ...(match.parametersFound
          ? { parameters: { ...prev.parameters, ...match.parametersFound } }
          : {}),
      }));
    } finally {
      setIsMatchingAllegro(false);
    }
  };

  const handleSaveAndClose = () => {
    onSave({
      ...formData,
      validation,
      updated_at: new Date().toISOString(),
    });
    onClose();
  };

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(JSON.stringify(allegroPayload, null, 2));
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#0b1120] border border-slate-700/80 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        {/* HEADER */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-400 text-slate-950 rounded-lg">
              <Package className="w-5 h-5 font-bold" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Edycja Produktu Kanonicznego</span>
                <span className="text-xs font-mono px-2 py-0.5 bg-slate-800 text-yellow-400 rounded border border-slate-700">
                  {formData.sku || formData.id}
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Model ujednolicony • Allegro REST API • BaseLinker • shopGold
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunAiOptimize}
              disabled={isOptimizingAi}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-mono text-xs font-bold rounded-lg hover:from-purple-500 hover:to-indigo-500 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isOptimizingAi ? "animate-spin" : ""}`} />
              <span>{isOptimizingAi ? "Optymalizacja AI..." : "Optymalizuj AI"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PIPELINE STRIP */}
        <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80">
          <PipelineStepsVisualizer product={formData} compact />
        </div>

        {/* SUB-TABS */}
        <div className="flex items-center gap-2 px-4 pt-3 border-b border-slate-800 bg-[#090e1a] text-xs font-mono">
          <button
            onClick={() => setActiveTab("details")}
            className={`px-3 py-2 border-b-2 font-bold transition flex items-center gap-1.5 ${
              activeTab === "details"
                ? "border-yellow-400 text-yellow-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Dane Podstawowe</span>
          </button>
          <button
            onClick={() => setActiveTab("parameters")}
            className={`px-3 py-2 border-b-2 font-bold transition flex items-center gap-1.5 ${
              activeTab === "parameters"
                ? "border-yellow-400 text-yellow-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Parametry Allegro ({Object.keys(formData.parameters || {}).length})</span>
          </button>
          <button
            onClick={() => setActiveTab("validation")}
            className={`px-3 py-2 border-b-2 font-bold transition flex items-center gap-1.5 ${
              activeTab === "validation"
                ? "border-yellow-400 text-yellow-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>
              Walidacja{" "}
              {validation.isValid ? (
                <span className="text-emerald-400">✓</span>
              ) : (
                <span className="text-red-400">({validation.errors.length})</span>
              )}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("allegro_preview")}
            className={`px-3 py-2 border-b-2 font-bold transition flex items-center gap-1.5 ${
              activeTab === "allegro_preview"
                ? "border-yellow-400 text-yellow-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Podgląd Payloadu JSON</span>
          </button>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeTab === "details" && (
            <div className="space-y-4">
              {/* Title */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-mono font-bold text-slate-300">
                    Tytuł oferty Allegro (Max 75 znaków)*
                  </label>
                  <span
                    className={`text-xs font-mono ${
                      formData.name.length > 75
                        ? "text-red-400 font-bold"
                        : formData.name.length >= 50
                        ? "text-emerald-400"
                        : "text-amber-400"
                    }`}
                  >
                    {formData.name.length} / 75 znaków
                  </span>
                </div>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleFieldChange("name", e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-hidden focus:border-yellow-400 font-medium"
                />
              </div>

              {/* Codes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">
                    GTIN / EAN (Ciąg tekstowy - string)*
                  </label>
                  <input
                    type="text"
                    value={formData.gtin}
                    onChange={(e) => handleFieldChange("gtin", e.target.value)}
                    placeholder="np. 5901234567891"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                  {formData.gtin && (
                    <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                      {validateGtinString(formData.gtin).message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">
                    MPN (Numer katalogowy producenta)
                  </label>
                  <input
                    type="text"
                    value={formData.mpn}
                    onChange={(e) => handleFieldChange("mpn", e.target.value)}
                    placeholder="np. 03G903023"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">
                    SKU / Sygnatura WMS
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => handleFieldChange("sku", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
              </div>

              {/* Category & Brand & Rack */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">
                    Marka / Producent
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => handleFieldChange("brand", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">
                    Kategoria
                  </label>
                  <input
                    type="text"
                    value={formData.category_name}
                    onChange={(e) => handleFieldChange("category_name", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">
                    Lokalizacja / Regał WMS
                  </label>
                  <input
                    type="text"
                    value={formData.location_rack || ""}
                    onChange={(e) => handleFieldChange("location_rack", e.target.value)}
                    placeholder="MAG 14"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-yellow-400 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Price & Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">
                    Cena Brutto PLN*
                  </label>
                  <input
                    type="number"
                    value={formData.price_gross}
                    onChange={(e) => handleFieldChange("price_gross", parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-emerald-400 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">
                    Cena Netto PLN (Kalkulowana)
                  </label>
                  <input
                    type="number"
                    readOnly
                    value={formData.price_net}
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-400 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">
                    Stan Magazynowy (Sztuki)*
                  </label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => handleFieldChange("stock", parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                  Opis techniczny produktu
                </label>
                <textarea
                  rows={4}
                  value={formData.description_raw}
                  onChange={(e) => handleFieldChange("description_raw", e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:outline-hidden focus:border-yellow-400 font-sans"
                />
              </div>

              {/* Images */}
              <div>
                <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                  Galeria Zdjęć ({formData.images.length} / 16)
                </label>
                <div className="flex flex-wrap gap-2">
                  {formData.images.map((img, i) => (
                    <div key={i} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
                      <img src={img} alt={`Zdjęcie ${i + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute top-1 left-1 bg-black/70 text-[9px] px-1 rounded text-white font-mono">
                        #{i + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "parameters" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-300">
                  Parametry specyficzne i słownikowe Allegro dla kategorii: <b>{formData.category_name}</b>
                </span>
                <button
                  onClick={handleRunAllegroMatching}
                  disabled={isMatchingAllegro}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-teal-400 rounded-lg text-xs font-mono flex items-center gap-1.5"
                >
                  <Search className="w-3 h-3" />
                  <span>{isMatchingAllegro ? "Dopasowywanie..." : "Pobierz z Katalogu Allegro"}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(formData.parameters || {}).map(([key, val]) => (
                  <div key={key} className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <label className="text-[11px] font-mono text-slate-400 block uppercase truncate">
                        {key}
                      </label>
                      <input
                        type="text"
                        value={String(val)}
                        onChange={(e) => handleParameterChange(key, e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white mt-1"
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveParameter(key)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition"
                      title="Usuń parametr"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Custom Parameter */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  placeholder="Nazwa parametru (np. Strona zabudowy)"
                  value={newParamKey}
                  onChange={(e) => setNewParamKey(e.target.value)}
                  className="w-full sm:w-1/2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="Wartość (np. Lewa przód)"
                  value={newParamVal}
                  onChange={(e) => setNewParamVal(e.target.value)}
                  className="w-full sm:w-1/2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                />
                <button
                  onClick={handleAddCustomParameter}
                  className="w-full sm:w-auto px-4 py-1.5 bg-yellow-400 text-slate-950 font-mono font-bold text-xs rounded-lg hover:bg-yellow-300 transition flex items-center justify-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Dodaj</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === "validation" && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  validation.isValid
                    ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950/20 border-red-500/40 text-red-300"
                }`}
              >
                {validation.isValid ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
                )}
                <div>
                  <h3 className="text-sm font-bold font-mono">
                    {validation.isValid
                      ? "Produkt przeszedł walidację pomyślnie!"
                      : `Wykryto ${validation.errors.length} krytycznych błędów walidacji`}
                  </h3>
                  <p className="text-xs mt-1 text-slate-400">
                    Weryfikacja pod kątem wymogów technicznych Allegro REST API, zgodności z EAN-13/Modulo 10 oraz limitów znaków.
                  </p>
                </div>
              </div>

              {validation.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-mono font-bold text-red-400 uppercase">
                    Błędy Krytyczne (Wymagają poprawy przed publikacją):
                  </h4>
                  {validation.errors.map((err, i) => (
                    <div key={i} className="p-2.5 bg-red-950/30 border border-red-500/30 rounded-lg text-xs font-mono text-red-300 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      <span className="font-bold">[{err.field}]:</span>
                      <span>{err.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {validation.warnings.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-mono font-bold text-amber-400 uppercase">
                    Ostrzeżenia i Rekomendacje:
                  </h4>
                  {validation.warnings.map((warn, i) => (
                    <div key={i} className="p-2.5 bg-amber-950/30 border border-amber-500/30 rounded-lg text-xs font-mono text-amber-300 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span className="font-bold">[{warn.field}]:</span>
                      <span>{warn.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "allegro_preview" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">
                  Gotowy obiekt JSON do wysłania na endpoint <code>POST /sale/offers</code> w Allegro REST API:
                </span>
                <button
                  onClick={handleCopyPayload}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-yellow-400 rounded text-xs font-mono flex items-center gap-1.5 transition"
                >
                  {copiedPayload ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPayload ? "Skopiowano!" : "Kopiuj JSON"}</span>
                </button>
              </div>

              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-teal-300 overflow-x-auto max-h-[450px]">
                {JSON.stringify(allegroPayload, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="text-xs font-mono text-slate-400 hidden sm:block">
            Status: <b className="text-white">{formData.status}</b> | Zapisano: {formData.updated_at?.slice(0, 10)}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-xl font-mono text-xs font-bold transition"
            >
              Anuluj
            </button>
            <button
              onClick={handleSaveAndClose}
              className="px-5 py-2 bg-yellow-400 text-slate-950 hover:bg-yellow-300 rounded-xl font-mono text-xs font-black transition flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>Zapisz Zmiany</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
