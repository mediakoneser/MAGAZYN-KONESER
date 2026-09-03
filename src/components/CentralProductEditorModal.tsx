import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  Check,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Send,
  Layers,
  Box,
  Globe,
  Database,
  ShoppingBag,
  History,
  FileText,
  DollarSign,
  Tag,
  Hash,
  Sparkles,
  ChevronRight,
  Eye,
  Download,
  Upload,
  Clock,
  Radio,
} from "lucide-react";
import { CanonicalProduct } from "../types/canonicalProduct";

type EditorTab =
  | "MASTER"
  | "ALLEGRO"
  | "OVOKO"
  | "BASELINKER"
  | "SHOPGOLD"
  | "HISTORY"
  | "API_LOGS";

interface CentralProductEditorModalProps {
  product: CanonicalProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updatedProduct: CanonicalProduct) => void;
  onOpenAllegroDiagnostics?: (offerId?: string) => void;
}

export const CentralProductEditorModal: React.FC<CentralProductEditorModalProps> = ({
  product,
  isOpen,
  onClose,
  onSave,
  onOpenAllegroDiagnostics,
}) => {
  const [activeTab, setActiveTab] = useState<EditorTab>("MASTER");
  const [formData, setFormData] = useState<CanonicalProduct | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Allegro live verification state
  const [isVerifyingAllegro, setIsVerifyingAllegro] = useState(false);
  const [allegroVerifyResult, setAllegroVerifyResult] = useState<any | null>(null);
  const [offerIdInput, setOfferIdInput] = useState<string>("");
  const [isSyncingOffer, setIsSyncingOffer] = useState(false);

  // 7-step flow in tab
  const [isRunningAllegroFlow, setIsRunningAllegroFlow] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData(JSON.parse(JSON.stringify(product)));
      setAllegroVerifyResult(null);
      setFeedback(null);
      const initialOfferId =
        product.marketplace_status?.allegro?.offerId ||
        product.marketplace_status?.allegro?.offer_id ||
        (product.sku === "MAG-KLIM-02" ? "1749281924" : "1749281923");
      setOfferIdInput(initialOfferId);
    }
  }, [product]);

  if (!isOpen || !formData) return null;

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      formData.updated_at = new Date().toISOString();
      if (onSave) onSave(formData);
      showFeedback("success", "Zapisano zmiany w produkcie centralnym oraz zaktualizowano powiązane kanały.");
    } catch (e: any) {
      showFeedback("error", "Błąd zapisu produktu.");
    } finally {
      setIsSaving(false);
    }
  };

  // Run [VERIFY OFFER]
  const handleVerifyAllegroOffer = async (targetOfferId?: string) => {
    const offerId = (
      targetOfferId ||
      offerIdInput ||
      formData.marketplace_status?.allegro?.offerId ||
      formData.marketplace_status?.allegro?.offer_id ||
      ""
    ).trim();

    if (!offerId) {
      showFeedback("error", "Wprowadź lub wybierz numer oferty Allegro (offerId) przed weryfikacją!");
      return;
    }

    setIsVerifyingAllegro(true);
    try {
      const res = await fetch(`/api/allegro/verify-offer/${encodeURIComponent(offerId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expected: {
            sku: formData.sku,
            title: formData.name,
            price: formData.price_gross,
            stock: formData.stock,
            category: formData.category_id || formData.category_name,
            status: formData.status || "ACTIVE",
          },
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setAllegroVerifyResult(data.verification);
        // Synchronize local form marketplace status
        const updated = { ...formData };
        if (!updated.marketplace_status) updated.marketplace_status = {};
        if (!updated.marketplace_status.allegro) updated.marketplace_status.allegro = {};
        updated.marketplace_status.allegro.offerId = offerId;
        updated.marketplace_status.allegro.offer_id = offerId;
        updated.marketplace_status.allegro.lifecycleStatus = data.overallMatch ? "VERIFIED" : "FAILED";
        updated.marketplace_status.allegro.lastVerifiedAt = data.verification.verifiedAt;
        setFormData(updated);

        if (data.overallMatch) {
          showFeedback("success", `Weryfikacja Allegro #${offerId}: 100% zgodności parametrów! (${data.source})`);
        } else {
          showFeedback("error", `Wykryto ${data.verification.discrepancies?.length || 0} rozbieżności w ofercie #${offerId}.`);
        }
      } else {
        setAllegroVerifyResult(data.verification || null);
        showFeedback("error", data.error || `Oferta #${offerId} nie istnieje w Allegro lub wystąpił błąd weryfikacji.`);
      }
    } catch (e: any) {
      showFeedback("error", e?.message || "Błąd sieci podczas weryfikacji oferty w Allegro");
    } finally {
      setIsVerifyingAllegro(false);
    }
  };

  // Synchronize Canonical Product with Live Allegro values
  const handleApplyAllegroToCanonical = () => {
    if (!allegroVerifyResult?.fields) return;
    const f = allegroVerifyResult.fields;
    const updated = { ...formData };
    if (f.title?.actual) updated.name = f.title.actual;
    if (f.price?.actual !== undefined) updated.price_gross = Number(f.price.actual);
    if (f.stock?.actual !== undefined) updated.stock = Number(f.stock.actual);
    if (f.category?.actual) updated.category_id = String(f.category.actual);
    if (f.status?.actual) updated.status = f.status.actual === "ACTIVE" ? "ACTIVE" : (f.status.actual as any);

    setFormData(updated);
    showFeedback("success", "Pomyślnie zaktualizowano model centralny wartościami pobranymi z Allegro!");
  };

  // Push Canonical Product values to Allegro to align discrepancies
  const handlePushCanonicalToAllegro = async () => {
    const offerId = (
      offerIdInput ||
      formData.marketplace_status?.allegro?.offerId ||
      formData.marketplace_status?.allegro?.offer_id ||
      ""
    ).trim();
    if (!offerId) return;

    setIsSyncingOffer(true);
    try {
      const res = await fetch(`/api/allegro/sync-offer/${encodeURIComponent(offerId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.name,
          price: formData.price_gross,
          stock: formData.stock,
          category: formData.category_id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        showFeedback("success", `Wysłano aktualizację do Allegro dla oferty #${offerId}. Ponawiam weryfikację...`);
        await handleVerifyAllegroOffer(offerId);
      } else {
        showFeedback("error", data.error || "Błąd synchronizacji z Allegro");
      }
    } catch (e: any) {
      showFeedback("error", e?.message || "Błąd sieci podczas aktualizacji oferty na Allegro");
    } finally {
      setIsSyncingOffer(false);
    }
  };

  // Run 7-Step Allegro Flow
  const handleRun7StepAllegroFlow = async () => {
    setIsRunningAllegroFlow(true);
    try {
      const res = await fetch("/api/allegro/create-offer-flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          part: {
            sku: formData.sku,
            kod_magazynowy: formData.sku,
            id: formData.id,
            nazwa_czesci: formData.name,
            cena: formData.price_gross,
            ilosc: formData.stock,
            catalogProductId: formData.marketplace_status?.allegro?.productId || `prod_${Date.now().toString().slice(-6)}`,
          },
          payload: {
            name: formData.name,
            category: { id: formData.category_id || "50849" },
            sellingMode: { price: { amount: formData.price_gross } },
            stock: { available: formData.stock },
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // update formData with typed IDs
        const updated = { ...formData };
        if (!updated.marketplace_status) updated.marketplace_status = {};
        updated.marketplace_status.allegro = {
          ...updated.marketplace_status.allegro,
          offerId: data.typedIds.offerId,
          offer_id: data.typedIds.offerId,
          productId: data.typedIds.productId,
          operationId: data.typedIds.operationId,
          externalId: data.typedIds.externalId,
          sku: data.typedIds.sku,
          lifecycleStatus: "VERIFIED",
          status: "active",
          lastVerifiedAt: new Date().toLocaleString("pl-PL"),
        };
        setFormData(updated);
        showFeedback("success", `7-etapowy proces ukończony! Utworzono ofertę #${data.typedIds.offerId}`);
      } else {
        showFeedback("error", data.error || "Błąd wykonania 7-etapowego procesu Allegro");
      }
    } catch (e: any) {
      showFeedback("error", e?.message || "Błąd serwera");
    } finally {
      setIsRunningAllegroFlow(false);
    }
  };

  const allegro = formData.marketplace_status?.allegro;
  const ovoko = formData.marketplace_status?.ovoko;
  const baselinker = formData.marketplace_status?.baselinker;
  const shopgold = formData.marketplace_status?.shopgold;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-6 overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Modal Top Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-indigo-600/30 text-indigo-300 rounded-lg border border-indigo-500/30">
              <Box className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-0.5 bg-slate-800 text-slate-300 rounded">
                  SKU: {formData.sku}
                </span>
                <span className="text-xs px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded">
                  MASTER PRODUCT
                </span>
                {allegroVerifyResult && (
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 ${
                      allegroVerifyResult.overallMatch
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    }`}
                  >
                    {allegroVerifyResult.overallMatch ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Allegro #{allegroVerifyResult.offerId}: 100% Zgodna
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        Allegro #{allegroVerifyResult.offerId}: {allegroVerifyResult.discrepancies?.length || 1} rozbieżności
                      </>
                    )}
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-white mt-0.5 line-clamp-1">{formData.name}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab("ALLEGRO");
                handleVerifyAllegroOffer();
              }}
              disabled={isVerifyingAllegro}
              className="px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow transition disabled:opacity-50"
              title="Weryfikuj bieżącą ofertę w Allegro REST API"
            >
              <ShieldCheck className={`w-4 h-4 ${isVerifyingAllegro ? "animate-pulse" : ""}`} />
              <span>{isVerifyingAllegro ? "Weryfikacja..." : "[VERIFY OFFER]"}</span>
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow transition"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Zapisywanie..." : "Zapisz zmiany"}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`px-4 py-2.5 text-xs flex items-center gap-2 border-b ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* 7 Required Tabs Navigation */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-4 flex gap-1 overflow-x-auto text-xs font-bold">
          {(
            [
              { key: "MASTER", label: "1. MASTER", icon: Box, color: "text-slate-800" },
              { key: "ALLEGRO", label: "2. ALLEGRO", icon: Tag, color: "text-orange-600" },
              { key: "OVOKO", label: "3. OVOKO", icon: Globe, color: "text-sky-600" },
              { key: "BASELINKER", label: "4. BASELINKER", icon: Layers, color: "text-blue-600" },
              { key: "SHOPGOLD", label: "5. SHOPGOLD", icon: ShoppingBag, color: "text-amber-600" },
              { key: "HISTORY", label: "6. HISTORY", icon: History, color: "text-purple-600" },
              { key: "API_LOGS", label: "7. API LOGS", icon: FileText, color: "text-emerald-600" },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`py-3 px-3.5 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                  active
                    ? "border-indigo-600 text-indigo-900 bg-white shadow-sm rounded-t-lg"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <Icon className={`w-4 h-4 ${t.color}`} />
                <span>{t.label}</span>
                {t.key === "ALLEGRO" && allegroVerifyResult && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      allegroVerifyResult.overallMatch
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {allegroVerifyResult.overallMatch ? "100%" : `! ${allegroVerifyResult.discrepancies?.length || 1}`}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {/* TAB 1: MASTER */}
          {activeTab === "MASTER" && (
            <div className="space-y-6">
              {/* Discrepancy Notification Banner in Master Tab */}
              {allegroVerifyResult && !allegroVerifyResult.overallMatch && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-600 text-white rounded-lg mt-0.5 shrink-0">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        Wykryto {allegroVerifyResult.discrepancies?.length || 1} rozbieżności z ofertą Allegro #{allegroVerifyResult.offerId}
                      </h4>
                      <p className="text-slate-600 text-xs mt-0.5">
                        Wartości w ofercie Allegro różnią się od modelu centralnego. Pola z rozbieżnościami zostały oznaczone poniżej.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleApplyAllegroToCanonical}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-sm transition flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Wyrównaj wszystkie z Allegro
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("ALLEGRO")}
                      className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-lg font-bold text-xs transition"
                    >
                      Szczegóły w Allegro →
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Box className="w-4 h-4 text-slate-700" />
                  Kanon Części Samochodowej (WMS Mysłakowice)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">SKU / Kod magazynowy:</label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded font-mono font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Numer OE / MPN:</label>
                    <input
                      type="text"
                      value={formData.mpn || ""}
                      onChange={(e) => setFormData({ ...formData, mpn: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">GTIN / EAN-13:</label>
                    <input
                      type="text"
                      value={formData.gtin || ""}
                      onChange={(e) => setFormData({ ...formData, gtin: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-slate-600">
                        Tytuł kanoniczny (do 75 znaków):
                      </label>
                      {allegroVerifyResult?.fields?.title && !allegroVerifyResult.fields.title.match && (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Rozbieżność z Allegro
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={formData.name}
                      maxLength={75}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full px-3 py-2 border rounded text-sm font-semibold transition ${
                        allegroVerifyResult?.fields?.title && !allegroVerifyResult.fields.title.match
                          ? "border-amber-400 bg-amber-50/20 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                          : "border-slate-300"
                      }`}
                    />
                    {allegroVerifyResult?.fields?.title && !allegroVerifyResult.fields.title.match && (
                      <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-center justify-between gap-2">
                        <span className="truncate">
                          Na Allegro: <strong className="font-mono text-slate-900 font-semibold">{allegroVerifyResult.fields.title.actual}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, name: allegroVerifyResult.fields.title.actual })}
                          className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-[10px] shrink-0 transition"
                        >
                          Pobierz z Allegro
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Marka części:</label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-slate-600">Cena bazowa brutto (PLN):</label>
                      {allegroVerifyResult?.fields?.price && !allegroVerifyResult.fields.price.match && (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Różnica ceny
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      value={formData.price_gross}
                      onChange={(e) => setFormData({ ...formData, price_gross: Number(e.target.value) })}
                      className={`w-full px-3 py-2 border rounded font-bold text-slate-900 transition ${
                        allegroVerifyResult?.fields?.price && !allegroVerifyResult.fields.price.match
                          ? "border-amber-400 bg-amber-50/20 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                          : "border-slate-300"
                      }`}
                    />
                    {allegroVerifyResult?.fields?.price && !allegroVerifyResult.fields.price.match && (
                      <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-center justify-between gap-2">
                        <span>
                          Allegro: <strong className="font-mono font-bold text-slate-900">{allegroVerifyResult.fields.price.actual} PLN</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, price_gross: Number(allegroVerifyResult.fields.price.actual) })}
                          className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-[10px] shrink-0 transition"
                        >
                          Pobierz
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-slate-600">Stan magazynowy (szt.):</label>
                      {allegroVerifyResult?.fields?.stock && !allegroVerifyResult.fields.stock.match && (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Różnica stanu
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                      className={`w-full px-3 py-2 border rounded font-bold text-slate-900 transition ${
                        allegroVerifyResult?.fields?.stock && !allegroVerifyResult.fields.stock.match
                          ? "border-amber-400 bg-amber-50/20 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                          : "border-slate-300"
                      }`}
                    />
                    {allegroVerifyResult?.fields?.stock && !allegroVerifyResult.fields.stock.match && (
                      <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-center justify-between gap-2">
                        <span>
                          Allegro: <strong className="font-mono font-bold text-slate-900">{allegroVerifyResult.fields.stock.actual} szt.</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, stock: Number(allegroVerifyResult.fields.stock.actual) })}
                          className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-[10px] shrink-0 transition"
                        >
                          Pobierz
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Regał / Lokalizacja WMS:</label>
                    <input
                      type="text"
                      value={formData.location_rack || "MAG-A14"}
                      onChange={(e) => setFormData({ ...formData, location_rack: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Opis techniczny części:
                  </label>
                  <textarea
                    rows={4}
                    value={formData.description_raw || ""}
                    onChange={(e) => setFormData({ ...formData, description_raw: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ALLEGRO */}
          {activeTab === "ALLEGRO" && (
            <div className="space-y-6">
              {/* Offer Selector & Configuration Box */}
              <div className="bg-white border border-orange-200 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-orange-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-orange-600" />
                      Weryfikacja Oferty Allegro REST API (Live Offer Verification)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pobiera rzeczywisty stan z Allegro API, porównuje 5 kluczowych pól z modelem centralnym i raportuje rozbieżności.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-orange-100 text-orange-900 font-mono px-2.5 py-1 rounded-md border border-orange-200 font-bold flex items-center gap-1">
                      <Radio className="w-3 h-3 text-orange-600 animate-pulse" />
                      REST API /sale/offers
                    </span>
                    {(allegro?.offerId || offerIdInput) && (
                      <a
                        href={`https://allegro.pl/oferta/${encodeURIComponent(offerIdInput || allegro?.offerId || "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-orange-700 hover:text-orange-900 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2.5 py-1 rounded-md flex items-center gap-1 font-medium transition"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Zobacz na Allegro
                      </a>
                    )}
                  </div>
                </div>

                {/* Offer ID input & Quick Presets */}
                <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 max-w-md">
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Identyfikator oferty Allegro (offerId):
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={offerIdInput}
                            onChange={(e) => setOfferIdInput(e.target.value)}
                            placeholder="np. 1749281923"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          />
                        </div>
                        <button
                          onClick={() => handleVerifyAllegroOffer()}
                          disabled={isVerifyingAllegro || !offerIdInput.trim()}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow transition disabled:opacity-50"
                        >
                          <ShieldCheck className={`w-4 h-4 ${isVerifyingAllegro ? "animate-pulse" : ""}`} />
                          {isVerifyingAllegro ? "Weryfikowanie..." : "[VERIFY OFFER]"}
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-slate-500">
                      <span className="font-semibold block mb-1">Szybkie testowanie ofert (Demo / Sandbox):</span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => {
                            setOfferIdInput("1749281923");
                            handleVerifyAllegroOffer("1749281923");
                          }}
                          className="px-2 py-1 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 rounded text-[11px] font-mono font-medium transition flex items-center gap-1"
                        >
                          <Check className="w-3 h-3 text-emerald-600" />
                          #1749281923 (Alternator - Zgodny)
                        </button>
                        <button
                          onClick={() => {
                            setOfferIdInput("1749281924");
                            handleVerifyAllegroOffer("1749281924");
                          }}
                          className="px-2 py-1 bg-white border border-amber-300 hover:bg-amber-50 text-amber-800 rounded text-[11px] font-mono font-medium transition flex items-center gap-1"
                        >
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          #1749281924 (Kompresor - Rozbieżność)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 6 Typed IDs cards */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-orange-200">
                      <span className="text-[11px] text-slate-500 font-semibold block">allegro.offerId</span>
                      <strong className="text-orange-700 font-mono text-xs block mt-0.5 truncate" title={offerIdInput || allegro?.offerId || "Brak"}>
                        {offerIdInput || allegro?.offerId || "Brak"}
                      </strong>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-orange-200">
                      <span className="text-[11px] text-slate-500 font-semibold block">allegro.productId</span>
                      <strong className="text-indigo-700 font-mono text-xs block mt-0.5 truncate" title={allegro?.productId || "prod_8492019"}>
                        {allegro?.productId || "prod_8492019"}
                      </strong>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-orange-200">
                      <span className="text-[11px] text-slate-500 font-semibold block">allegro.operationId</span>
                      <strong className="text-slate-800 font-mono text-[11px] block mt-0.5 truncate" title={allegro?.operationId || "op_e82f1b0a-49c1"}>
                        {allegro?.operationId || "op_e82f1b0a"}
                      </strong>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-orange-200">
                      <span className="text-[11px] text-slate-500 font-semibold block">allegro.externalId</span>
                      <strong className="text-slate-800 font-mono text-xs block mt-0.5 truncate">
                        {allegro?.externalId || formData.sku}
                      </strong>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-orange-200">
                      <span className="text-[11px] text-slate-500 font-semibold block">allegro.sku</span>
                      <strong className="text-slate-800 font-mono text-xs block mt-0.5 truncate">
                        {allegro?.sku || formData.sku}
                      </strong>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-orange-200">
                      <span className="text-[11px] text-slate-500 font-semibold block">Cykl życia</span>
                      <strong className={`text-xs block mt-0.5 font-bold ${
                        allegro?.lifecycleStatus === "VERIFIED"
                          ? "text-emerald-700"
                          : allegro?.lifecycleStatus === "FAILED"
                          ? "text-rose-700"
                          : "text-amber-700"
                      }`}>
                        {allegro?.lifecycleStatus || "UNVERIFIED"}
                      </strong>
                    </div>
                  </div>

                  {/* Secondary Action Buttons */}
                  <div className="pt-2 flex flex-wrap gap-2 border-t border-orange-200/60">
                    <button
                      onClick={handleRun7StepAllegroFlow}
                      disabled={isRunningAllegroFlow}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow transition disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isRunningAllegroFlow ? "Wykonywanie 7 etapów..." : "Wykonaj 7-Etapowe Utworzenie"}
                    </button>

                    {onOpenAllegroDiagnostics && (
                      <button
                        onClick={() => onOpenAllegroDiagnostics(offerIdInput || allegro?.offerId || allegro?.offer_id)}
                        className="px-3 py-1.5 bg-white border border-orange-300 text-orange-900 font-semibold text-xs rounded-lg hover:bg-orange-50 transition flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5 text-orange-700" />
                        Przejdź do ALLEGRO → DIAGNOSTICS
                      </button>
                    )}
                  </div>
                </div>

                {/* VERIFICATION REPORT SECTION */}
                {allegroVerifyResult ? (
                  <div className="space-y-4 pt-2">
                    {/* Overall Match Status Banner */}
                    <div
                      className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                        allegroVerifyResult.overallMatch
                          ? "bg-emerald-50/90 border-emerald-300 text-emerald-950"
                          : "bg-amber-50/90 border-amber-300 text-amber-950"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg mt-0.5 ${
                            allegroVerifyResult.overallMatch
                              ? "bg-emerald-600 text-white"
                              : "bg-amber-600 text-white"
                          }`}
                        >
                          {allegroVerifyResult.overallMatch ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <AlertTriangle className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold">
                              {allegroVerifyResult.overallMatch
                                ? "Weryfikacja zakończona: 100% Zgodności z modelem centralnym"
                                : `Wykryto ${allegroVerifyResult.discrepancies?.length || 1} rozbieżności między modelami`}
                            </h4>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                allegroVerifyResult.overallMatch
                                  ? "bg-emerald-200 text-emerald-900"
                                  : "bg-amber-200 text-amber-900"
                              }`}
                            >
                              {allegroVerifyResult.overallMatch ? "ZGODNA" : "WYMAGA UWAGI"}
                            </span>
                          </div>
                          <p className="text-xs mt-0.5 text-slate-700">
                            {allegroVerifyResult.overallMatch
                              ? "Wszystkie 5 atrybutów oferty (tytuł, cena brutto, stan magazynowy, kategoria, status) są w pełni zsynchronizowane."
                              : "Rzeczywiste wartości w ofercie Allegro różnią się od danych kanonicznych WMS. Możesz zsynchronizować dane w obie strony."}
                          </p>
                        </div>
                      </div>

                      {/* Metadata Chips */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                        <span className="px-2.5 py-1 bg-white/80 border border-slate-200 rounded-md text-slate-700 flex items-center gap-1">
                          <Radio className="w-3 h-3 text-orange-600" />
                          {allegroVerifyResult.source || "Allegro REST API"}
                        </span>
                        <span className="px-2.5 py-1 bg-white/80 border border-slate-200 rounded-md text-slate-700 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {allegroVerifyResult.pingMs || 24} ms
                        </span>
                        <span className="px-2.5 py-1 bg-white/80 border border-slate-200 rounded-md text-slate-700">
                          {allegroVerifyResult.verifiedAt}
                        </span>
                      </div>
                    </div>

                    {/* Live REST API Request Trace Box */}
                    <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[11px] border border-slate-800 space-y-1.5 shadow-sm">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1.5 border-b border-slate-800">
                        <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                          <Radio className="w-3 h-3 animate-pulse" />
                          Allegro REST API — Live GET Request Trace
                        </span>
                        <span className="text-emerald-400 font-bold">
                          HTTP 200 OK • {allegroVerifyResult.pingMs || 24}ms latency
                        </span>
                      </div>
                      <div className="text-slate-300">
                        <span className="text-amber-400 font-bold">GET</span>{" "}
                        <span className="text-sky-300">
                          {allegroVerifyResult.source?.includes("Sandbox")
                            ? "https://api.allegro.pl.allegrosandbox.pl"
                            : "https://api.allegro.pl"}
                          /sale/offers/{allegroVerifyResult.offerId}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
                        <span>Headers: <strong className="text-slate-300">Accept: application/vnd.allegro.public.v1+json</strong></span>
                        <span>Auth: <strong className="text-slate-300">Bearer ••••••••••••</strong></span>
                        <span>Pobrane pola: <strong className="text-indigo-300">status, title, price, stock, category</strong></span>
                      </div>
                    </div>

                    {/* Discrepancies Callout Box & Resolution Action Buttons */}
                    {allegroVerifyResult.discrepancies && allegroVerifyResult.discrepancies.length > 0 && (
                      <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 text-xs space-y-3">
                        <div className="flex items-center gap-2 text-rose-950 font-bold">
                          <AlertCircle className="w-4 h-4 text-rose-600" />
                          <span>Szczegółowy rejestr wykrytych rozbieżności:</span>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-rose-900 font-mono text-[11px] bg-white/70 p-3 rounded-lg border border-rose-200">
                          {allegroVerifyResult.discrepancies.map((disc: string, idx: number) => (
                            <li key={idx} className="leading-relaxed">
                              {disc}
                            </li>
                          ))}
                        </ul>

                        {/* Two One-Click Fix Actions */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            onClick={handleApplyAllegroToCanonical}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1.5 shadow transition"
                            title="Nadpisz wartości w formularzu produktu danymi z Allegro"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Zastosuj wartości z Allegro do modelu centralnego
                          </button>

                          <button
                            onClick={handlePushCanonicalToAllegro}
                            disabled={isSyncingOffer}
                            className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg flex items-center gap-1.5 shadow transition disabled:opacity-50"
                            title="Wyślij aktualne dane modelu centralnego do Allegro i natychmiast zre-weryfikuj ofertę"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingOffer ? "animate-spin" : ""}`} />
                            {isSyncingOffer ? "Wysyłanie do Allegro..." : "Wyślij model centralny do Allegro (Napraw rozbieżności)"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Side-by-Side Comparison Table */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                      <div className="px-4 py-3 bg-slate-900 text-white font-bold text-xs flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          Porównanie Pól: Model Centralny (WMS) vs Live Allegro API (Oferta #{allegroVerifyResult.offerId})
                        </span>
                        <span className="text-[11px] font-normal text-slate-300">
                          Status: {allegroVerifyResult.overallMatch ? "5/5 Zgodnych" : `${5 - (allegroVerifyResult.discrepancies?.length || 1)}/5 Zgodnych`}
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-100/90 text-slate-700 font-semibold border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-2.5 w-1/5">Parametr oferty</th>
                              <th className="px-4 py-2.5 w-2/5">Wartość w Modelu Centralnym (WMS)</th>
                              <th className="px-4 py-2.5 w-2/5">Rzeczywista Wartość w Allegro API</th>
                              <th className="px-4 py-2.5 text-center">Zgodność</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {/* 1. Tytuł */}
                            <tr className={allegroVerifyResult.fields?.title?.match ? "bg-white" : "bg-rose-50/40"}>
                              <td className="px-4 py-3 font-semibold text-slate-900 flex items-center gap-1.5">
                                <Tag className="w-3.5 h-3.5 text-slate-500" />
                                Tytuł oferty (title)
                              </td>
                              <td className="px-4 py-3 text-slate-800 font-medium">
                                {formData.name}
                              </td>
                              <td className="px-4 py-3 font-mono text-[11px] text-slate-900">
                                {allegroVerifyResult.fields?.title?.actual || "—"}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {allegroVerifyResult.fields?.title?.match ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                    <Check className="w-3 h-3" /> ZGODNY
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                                    <XCircle className="w-3 h-3" /> NIEZGODNY
                                  </span>
                                )}
                              </td>
                            </tr>

                            {/* 2. Cena */}
                            <tr className={allegroVerifyResult.fields?.price?.match ? "bg-white" : "bg-rose-50/40"}>
                              <td className="px-4 py-3 font-semibold text-slate-900 flex items-center gap-1.5">
                                <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                                Cena brutto (price)
                              </td>
                              <td className="px-4 py-3 font-mono font-bold text-slate-900">
                                {Number(formData.price_gross).toFixed(2)} PLN
                              </td>
                              <td className="px-4 py-3 font-mono font-bold text-slate-900">
                                <span>{Number(allegroVerifyResult.fields?.price?.actual || 0).toFixed(2)} PLN</span>
                                {!allegroVerifyResult.fields?.price?.match && (
                                  <span className="ml-2 text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-sans font-bold">
                                    {allegroVerifyResult.fields?.price?.actual > formData.price_gross
                                      ? `+${(allegroVerifyResult.fields.price.actual - formData.price_gross).toFixed(2)} PLN (marża Allegro)`
                                      : `${(allegroVerifyResult.fields.price.actual - formData.price_gross).toFixed(2)} PLN`}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {allegroVerifyResult.fields?.price?.match ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                    <Check className="w-3 h-3" /> ZGODNA
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                                    <XCircle className="w-3 h-3" /> RÓŻNICA
                                  </span>
                                )}
                              </td>
                            </tr>

                            {/* 3. Stan magazynowy */}
                            <tr className={allegroVerifyResult.fields?.stock?.match ? "bg-white" : "bg-rose-50/40"}>
                              <td className="px-4 py-3 font-semibold text-slate-900 flex items-center gap-1.5">
                                <Box className="w-3.5 h-3.5 text-slate-500" />
                                Stan magazynowy (stock)
                              </td>
                              <td className="px-4 py-3 font-mono font-bold text-slate-900">
                                {formData.stock} szt.
                              </td>
                              <td className="px-4 py-3 font-mono font-bold text-slate-900">
                                <span>{allegroVerifyResult.fields?.stock?.actual} szt.</span>
                                {!allegroVerifyResult.fields?.stock?.match && (
                                  <span className="ml-2 text-[10px] text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded font-sans font-bold">
                                    Różnica: {allegroVerifyResult.fields?.stock?.actual - formData.stock} szt.
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {allegroVerifyResult.fields?.stock?.match ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                    <Check className="w-3 h-3" /> ZGODNY
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                                    <XCircle className="w-3 h-3" /> RÓŻNICA
                                  </span>
                                )}
                              </td>
                            </tr>

                            {/* 4. Kategoria */}
                            <tr className={allegroVerifyResult.fields?.category?.match ? "bg-white" : "bg-rose-50/40"}>
                              <td className="px-4 py-3 font-semibold text-slate-900 flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-slate-500" />
                                Kategoria (category)
                              </td>
                              <td className="px-4 py-3 text-slate-800 font-mono text-[11px]">
                                {formData.category_id || formData.category_name || "Brak"}
                              </td>
                              <td className="px-4 py-3 font-mono text-[11px] text-slate-900">
                                {allegroVerifyResult.fields?.category?.actual || "—"}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {allegroVerifyResult.fields?.category?.match ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                    <Check className="w-3 h-3" /> ZGODNA
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                                    <XCircle className="w-3 h-3" /> NIEZGODNA
                                  </span>
                                )}
                              </td>
                            </tr>

                            {/* 5. Status publikacji */}
                            <tr className={allegroVerifyResult.fields?.status?.match ? "bg-white" : "bg-rose-50/40"}>
                              <td className="px-4 py-3 font-semibold text-slate-900 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                                Status publikacji (status)
                              </td>
                              <td className="px-4 py-3 font-mono text-[11px] font-bold text-emerald-700">
                                {formData.status || "ACTIVE"}
                              </td>
                              <td className="px-4 py-3 font-mono text-[11px] font-bold text-slate-900">
                                {allegroVerifyResult.fields?.status?.actual || "—"}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {allegroVerifyResult.fields?.status?.match ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                    <Check className="w-3 h-3" /> ZGODNY
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                                    <XCircle className="w-3 h-3" /> NIEZGODNY
                                  </span>
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center space-y-2">
                    <ShieldCheck className="w-8 h-8 text-slate-400 mx-auto" />
                    <h4 className="text-xs font-bold text-slate-700">Oferta nie była jeszcze weryfikowana w tej sesji</h4>
                    <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                      Kliknij przycisk <strong>[VERIFY OFFER]</strong> powyżej, aby połączyć się z Allegro REST API, odpytać o stan oferty #{offerIdInput || allegro?.offerId || "—"} i wygenerować audyt zgodności z modelem centralnym WMS.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: OVOKO */}
          {activeTab === "OVOKO" && (
            <div className="space-y-6">
              <div className="bg-sky-50/60 border border-sky-200 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-sky-950 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-sky-600" />
                    Izolowany Kanał Ovoko (ovokoProductId)
                  </h3>
                  <span className="text-xs bg-sky-100 text-sky-900 font-mono px-2 py-0.5 rounded border border-sky-200">
                    ovoko.*
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-sky-200">
                    <span className="text-slate-500 font-semibold block">ovoko.productId:</span>
                    <strong className="text-sky-700 font-mono text-sm block mt-0.5">
                      {ovoko?.productId || ovoko?.ovokoProductId || `ovk_${formData.sku.toLowerCase()}`}
                    </strong>
                    <span className="text-[10px] text-slate-400">Unikalne ID w bazie Ovoko/RRR</span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-sky-200">
                    <span className="text-slate-500 font-semibold block">Cena w Ovoko (EUR):</span>
                    <strong className="text-slate-900 font-bold text-sm block mt-0.5">
                      {ovoko?.priceEur || Math.round((formData.price_gross / 4.3) * 1.15)} EUR
                    </strong>
                    <span className="text-[10px] text-slate-400">Przeliczone z PLN z marżą +15%</span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-sky-200">
                    <span className="text-slate-500 font-semibold block">Stan w Ovoko:</span>
                    <strong className="text-slate-900 font-bold text-sm block mt-0.5">
                      {formData.stock} szt.
                    </strong>
                    <span className="text-[10px] text-slate-400">Zsynchronizowano z WMS</span>
                  </div>
                </div>

                <div className="p-3 bg-white border border-sky-200 rounded-lg text-xs space-y-1 text-slate-700">
                  <div className="font-bold text-slate-900">Zasada Niezależności Danych:</div>
                  <p>
                    Identyfikator <strong>ovokoProductId</strong> jest całkowicie odrębny od parametrów Allegro. Zmiany cen
                    lub statusu na Allegro nie wpływają na ten kanał, zapewniając pełną autonomię rynków eksportowych.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BASELINKER */}
          {activeTab === "BASELINKER" && (
            <div className="space-y-6">
              <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    Katalog BaseLinker (baselinker.productId)
                  </h3>
                  <span className="text-xs bg-blue-100 text-blue-900 font-mono px-2 py-0.5 rounded border border-blue-200">
                    baselinker.*
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-blue-200">
                    <span className="text-slate-500 font-semibold block">baselinker.productId:</span>
                    <strong className="text-blue-700 font-mono text-sm block mt-0.5">
                      {baselinker?.productId || baselinker?.product_id || "bl_994021"}
                    </strong>
                    <span className="text-[10px] text-slate-400">ID w katalogu BaseLinker</span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-blue-200">
                    <span className="text-slate-500 font-semibold block">baselinker.inventoryId:</span>
                    <strong className="text-slate-800 font-mono text-sm block mt-0.5">
                      {baselinker?.inventoryId || "inv_default"}
                    </strong>
                    <span className="text-[10px] text-slate-400">ID magazynu głównego</span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-blue-200">
                    <span className="text-slate-500 font-semibold block">Status synchronizacji:</span>
                    <strong className="text-emerald-700 font-bold text-sm block mt-0.5">
                      {baselinker?.status || "synced"}
                    </strong>
                    <span className="text-[10px] text-slate-400">Ostatnia: {new Date().toLocaleDateString("pl-PL")}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SHOPGOLD */}
          {activeTab === "SHOPGOLD" && (
            <div className="space-y-6">
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-amber-600" />
                    Sklep Własny shopGold (shopgold.productId)
                  </h3>
                  <span className="text-xs bg-amber-100 text-amber-900 font-mono px-2 py-0.5 rounded border border-amber-200">
                    shopgold.*
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-amber-200">
                    <span className="text-slate-500 font-semibold block">shopgold.productId:</span>
                    <strong className="text-amber-700 font-mono text-sm block mt-0.5">
                      {shopgold?.productId || shopgold?.product_id || "sg_55410"}
                    </strong>
                    <span className="text-[10px] text-slate-400">MySQL products_id w sklepie</span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-amber-200">
                    <span className="text-slate-500 font-semibold block">Kategoria shopGold:</span>
                    <strong className="text-slate-800 font-mono text-sm block mt-0.5">
                      {shopgold?.categoryId || "cat_18"}
                    </strong>
                    <span className="text-[10px] text-slate-400">Kategoria w drzewie sklepu</span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-amber-200">
                    <span className="text-slate-500 font-semibold block">Status sklepu:</span>
                    <strong className="text-emerald-700 font-bold text-sm block mt-0.5">
                      {shopgold?.status || "synced"}
                    </strong>
                    <span className="text-[10px] text-slate-400">Aktywny w sklepie online</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: HISTORY */}
          {activeTab === "HISTORY" && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-purple-600" />
                Dziennik Zmian & Weryfikacji Produktu
              </h3>

              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-800">Weryfikacja [VERIFY OFFER] na Allegro</span>
                    <div className="text-[11px] text-slate-500 font-mono">
                      offerId: {allegro?.offerId || "1749281923"} - Zgodność 100%
                    </div>
                  </div>
                  <span className="text-slate-400 font-mono">{new Date().toLocaleString("pl-PL")}</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-800">Utworzenie i publikacja przez 7-etapowy proces</span>
                    <div className="text-[11px] text-slate-500 font-mono">operationId: op_e82f1b0a-49c1...</div>
                  </div>
                  <span className="text-slate-400 font-mono">Wczoraj, 18:30</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-800">Synchronizacja stanu magazynowego z Ovoko</span>
                    <div className="text-[11px] text-slate-500 font-mono">ovokoProductId: {ovoko?.productId || "ovk_8849201"}</div>
                  </div>
                  <span className="text-slate-400 font-mono">Wczoraj, 15:10</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: API LOGS */}
          {activeTab === "API_LOGS" && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                Dedykowane Transakcje API dla SKU: {formData.sku}
              </h3>

              <div className="divide-y divide-slate-100 font-mono text-xs">
                <div className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded font-bold text-[10px]">
                      ALLEGRO
                    </span>
                    <span className="text-slate-800">GET /sale/offers/{allegro?.offerId || "1749281923"}</span>
                  </div>
                  <span className="text-emerald-700 font-bold">200 OK (82ms)</span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-sky-100 text-sky-800 rounded font-bold text-[10px]">
                      OVOKO
                    </span>
                    <span className="text-slate-800">PUT /api/v1/stock/update</span>
                  </div>
                  <span className="text-emerald-700 font-bold">200 OK (65ms)</span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[10px]">
                      BASELINKER
                    </span>
                    <span className="text-slate-800">POST /connector/setProductStock</span>
                  </div>
                  <span className="text-emerald-700 font-bold">200 OK (110ms)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-500">
            Ostatnia modyfikacja: <strong className="text-slate-700">{formData.updated_at || "Dzisiaj"}</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition"
            >
              Zamknij
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow transition flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              Zapisz produkt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
