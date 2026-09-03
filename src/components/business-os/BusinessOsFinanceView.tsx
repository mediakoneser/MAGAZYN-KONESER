import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  DollarSign,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldAlert,
} from "lucide-react";
import { PartItem } from "../../types";
import { FinanceOverview, BusinessDocument } from "../../types/businessCore";
import { businessCoreService } from "../../services/businessCoreService";

interface BusinessOsFinanceViewProps {
  parts: PartItem[];
}

export const BusinessOsFinanceView: React.FC<BusinessOsFinanceViewProps> = ({ parts }) => {
  const [finance, setFinance] = useState<FinanceOverview | null>(null);
  const [documents, setDocuments] = useState<BusinessDocument[]>([]);

  useEffect(() => {
    setFinance(businessCoreService.getFinanceOverview(parts));
    setDocuments(businessCoreService.getDocuments());
  }, [parts]);

  const totalStockValueGross = parts.reduce(
    (acc, p) => acc + (p.listingData?.cena?.brutto || 0) * (p.listingData?.stan_magazynowy ?? 1),
    0
  );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-black text-white tracking-tight">
              Finanse, Rentowność & Dokumenty Sprzedaży
            </h1>
          </div>
          <p className="text-xs text-slate-300">
            Kalkulacja marż handlowych, szacunkowa wartość magazynu, rozliczenia faktur VAT i kart BDO.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-3 py-1.5 bg-slate-950 rounded-lg border border-slate-800 text-slate-300">
            Średnia marża: <strong className="text-emerald-400">~62.5%</strong>
          </span>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 mb-1">Przychód dzisiaj</div>
          <div className="text-2xl font-black text-white font-mono">
            {finance?.todayRevenuePln.toLocaleString("pl-PL")} <span className="text-xs text-slate-400">PLN</span>
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            <span>Zysk brutto szacowany: {finance?.todayProfitGrossPln} PLN</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 mb-1">Obrót miesięczny (30 dni)</div>
          <div className="text-2xl font-black text-white font-mono">
            {finance?.monthRevenuePln.toLocaleString("pl-PL")} <span className="text-xs text-slate-400">PLN</span>
          </div>
          <div className="text-[11px] text-blue-400 mt-1">
            Średni koszyk (AOV): {finance?.averageOrderValuePln} PLN
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 mb-1">Wartość części w magazynie</div>
          <div className="text-2xl font-black text-white font-mono">
            {Math.round(totalStockValueGross).toLocaleString("pl-PL")} <span className="text-xs text-slate-400">PLN</span>
          </div>
          <div className="text-[11px] text-yellow-400 mt-1">
            {parts.length} pozycji katalogowych
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 mb-1">Oczekujące płatności</div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            {finance?.pendingPaymentsSumPln || 0} <span className="text-xs text-slate-400">PLN</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {finance?.unpaidInvoicesCount || 0} nieopłaconych dokumentów
          </div>
        </div>
      </div>

      {/* DOCUMENTS TABLE (INVOICES & BDO TRANSFERS) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-yellow-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
              Rejestr Dokumentów Handlowych i Kart BDO
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Łącznie: {documents.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px] bg-slate-950/60">
                <th className="p-3.5 font-medium">Numer Dokumentu</th>
                <th className="p-3.5 font-medium">Typ</th>
                <th className="p-3.5 font-medium">Kontrahent / Odbiorca</th>
                <th className="p-3.5 font-medium">Data Wystawienia</th>
                <th className="p-3.5 font-medium text-right">Kwota Brutto</th>
                <th className="p-3.5 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-850/40 transition">
                  <td className="p-3.5 font-mono font-bold text-white text-xs">
                    {doc.documentNumber}
                    <div className="text-[10px] text-slate-400 font-normal font-sans">{doc.title}</div>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        doc.type === "INVOICE"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      }`}
                    >
                      {doc.type === "INVOICE" ? "FAKTURA VAT" : "KARTA BDO"}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-200 font-medium">{doc.contractorName}</td>
                  <td className="p-3.5 font-mono text-slate-400 text-[11px]">{doc.issueDate}</td>
                  <td className="p-3.5 font-mono font-bold text-white text-right">
                    {doc.amountGrossPln?.toFixed(2)} PLN
                  </td>
                  <td className="p-3.5 text-center">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        doc.status === "PAID"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {doc.status === "PAID" ? "OPŁACONA" : "WYSTAWIONA"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
