import React, { useState, useEffect } from "react";
import {
  Building2,
  Search,
  Plus,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  FileText,
  Clock,
  Trash2,
  Edit2,
  X,
} from "lucide-react";
import { MasterContractor, ContractorType } from "../../types/businessCore";
import { businessCoreService } from "../../services/businessCoreService";
import { regonConnector, validateNipChecksum } from "../../services/publicDataConnectors";
import { auditLogService } from "../../services/auditLogService";

export const BusinessOsContractorsView: React.FC = () => {
  const [contractors, setContractors] = useState<MasterContractor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [nipInput, setNipInput] = useState("");
  const [isVerifyingNip, setIsVerifyingNip] = useState(false);
  const [nipVerificationResult, setNipVerificationResult] = useState<{
    success: boolean;
    message: string;
    record?: any;
  } | null>(null);

  // Modal add/edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContractor, setEditingContractor] = useState<Partial<MasterContractor>>({
    type: "SUPPLIER",
    country: "PL",
    status: "ACTIVE",
  });

  useEffect(() => {
    loadContractors();
  }, []);

  const loadContractors = () => {
    setContractors(businessCoreService.getContractors());
  };

  const handleVerifyNip = async () => {
    if (!nipInput) return;
    setIsVerifyingNip(true);
    setNipVerificationResult(null);

    const val = validateNipChecksum(nipInput);
    if (!val.isValid) {
      setIsVerifyingNip(false);
      setNipVerificationResult({
        success: false,
        message: val.message,
      });
      return;
    }

    try {
      const record = await regonConnector.fetchByNip(val.cleanNip);
      if (record) {
        const normalized = regonConnector.normalize(record);
        setNipVerificationResult({
          success: true,
          message: `Zweryfikowano pomyślnie w bazie ${record.source} BIR 1.1 (${record.retrievedAt.substring(0, 16).replace("T", " ")})`,
          record: normalized,
        });
      } else {
        setNipVerificationResult({
          success: false,
          message: "Nie znaleziono podmiotu w rejestrze REGON.",
        });
      }
    } catch (err: any) {
      setNipVerificationResult({
        success: false,
        message: err.message || "Błąd weryfikacji NIP w rejestrze publicznym.",
      });
    } finally {
      setIsVerifyingNip(false);
    }
  };

  const handleApplyVerifiedRecord = () => {
    if (!nipVerificationResult?.record) return;
    const rec = nipVerificationResult.record as MasterContractor;
    businessCoreService.addContractor(rec);
    auditLogService.record({
      action: "WERYFIKACJA_I_DODANIE_KONTRAHENTA",
      entityType: "CONTRACTOR",
      entityId: rec.id,
      changesSummary: `Dodano podmiot ${rec.name} (NIP: ${rec.nip}) ze źródła ${rec.source}`,
    });
    loadContractors();
    setNipInput("");
    setNipVerificationResult(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Czy na pewno usunąć kontrahenta: ${name}?`)) {
      businessCoreService.deleteContractor(id);
      auditLogService.record({
        action: "USUNIĘCIE_KONTRAHENTA",
        entityType: "CONTRACTOR",
        entityId: id,
        changesSummary: `Usunięto kontrahenta ${name}`,
      });
      loadContractors();
    }
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContractor.name || !editingContractor.nip) {
      alert("Nazwa i NIP są wymagane!");
      return;
    }

    const contractorToSave: MasterContractor = {
      id: editingContractor.id || `contr_${Date.now()}`,
      nip: editingContractor.nip.replace(/[\s-]/g, ""),
      regon: editingContractor.regon,
      krs: editingContractor.krs,
      name: editingContractor.name,
      shortName: editingContractor.shortName || editingContractor.name.split(" ")[0],
      type: editingContractor.type || "SUPPLIER",
      email: editingContractor.email,
      phone: editingContractor.phone,
      street: editingContractor.street,
      city: editingContractor.city,
      postalCode: editingContractor.postalCode,
      country: editingContractor.country || "PL",
      bankAccount: editingContractor.bankAccount,
      source: editingContractor.source || "MANUAL",
      verifiedAt: editingContractor.verifiedAt || new Date().toISOString(),
      status: editingContractor.status || "ACTIVE",
      totalOrdersCount: editingContractor.totalOrdersCount || 0,
      totalSpendPln: editingContractor.totalSpendPln || 0,
      createdAt: editingContractor.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingContractor.id) {
      businessCoreService.updateContractor(editingContractor.id, contractorToSave);
      auditLogService.record({
        action: "EDYCJA_KONTRAHENTA",
        entityType: "CONTRACTOR",
        entityId: contractorToSave.id,
        changesSummary: `Zaktualizowano dane kontrahenta ${contractorToSave.name}`,
      });
    } else {
      businessCoreService.addContractor(contractorToSave);
      auditLogService.record({
        action: "DODANIE_KONTRAHENTA",
        entityType: "CONTRACTOR",
        entityId: contractorToSave.id,
        changesSummary: `Dodano ręcznie kontrahenta ${contractorToSave.name} (NIP: ${contractorToSave.nip})`,
      });
    }

    setIsModalOpen(false);
    loadContractors();
  };

  const filtered = contractors.filter((c) => {
    const matchesType = typeFilter === "ALL" || c.type === typeFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(q) ||
      c.nip.includes(q) ||
      (c.city && c.city.toLowerCase().includes(q)) ||
      (c.shortName && c.shortName.toLowerCase().includes(q));
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-5 h-5 text-yellow-400" />
            <h1 className="text-xl font-black text-white tracking-tight">
              Kontrahenci & Weryfikacja Rejestrów (REGON / CEIDG)
            </h1>
          </div>
          <p className="text-xs text-slate-300">
            Centralna kartoteka dostawców części, stacji kasacji, odbiorców hurtowych i firm partnerskich.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setEditingContractor({
                type: "SUPPLIER",
                country: "PL",
                status: "ACTIVE",
              });
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs rounded-lg shadow-sm flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Nowy kontrahent</span>
          </button>
        </div>
      </div>

      {/* QUICK NIP VERIFIER BAR */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
            Szybka Weryfikacja NIP w Bazie Publicznej (REGON / CEIDG)
          </h3>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={nipInput}
              onChange={(e) => setNipInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyNip()}
              placeholder="Wpisz 10-cyfrowy NIP firmy (np. 6112803248 lub 8981012345)..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-yellow-400 rounded-lg px-3.5 py-2 text-xs text-white font-mono placeholder:text-slate-500 transition"
            />
          </div>

          <button
            onClick={handleVerifyNip}
            disabled={isVerifyingNip || !nipInput.trim()}
            className="w-full sm:w-auto px-5 py-2 bg-slate-800 hover:bg-slate-750 text-yellow-400 font-bold text-xs rounded-lg border border-slate-700 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {isVerifyingNip ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            <span>[ SPRAWDŹ NIP ]</span>
          </button>
        </div>

        {/* VERIFICATION RESULT CARD */}
        {nipVerificationResult && (
          <div
            className={`mt-4 p-4 rounded-lg border text-xs ${
              nipVerificationResult.success
                ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                : "bg-red-950/20 border-red-500/30 text-red-300"
            }`}
          >
            <div className="flex items-start gap-2.5">
              {nipVerificationResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-bold text-slate-100">{nipVerificationResult.message}</div>

                {nipVerificationResult.record && (
                  <div className="mt-3 p-3 bg-slate-950/80 rounded border border-slate-800 text-slate-300 space-y-1.5 font-mono text-[11px]">
                    <div>
                      <span className="text-slate-400">Nazwa:</span>{" "}
                      <span className="font-bold text-white">{nipVerificationResult.record.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Adres:</span> {nipVerificationResult.record.street},{" "}
                      {nipVerificationResult.record.postalCode} {nipVerificationResult.record.city}
                    </div>
                    <div>
                      <span className="text-slate-400">Źródło:</span>{" "}
                      <span className="text-yellow-400">{nipVerificationResult.record.source}</span> (Rejestr BIR 1.1)
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={handleApplyVerifiedRecord}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded shadow-sm text-xs transition"
                      >
                        + Zapisz w kartotece kontrahentów
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj po nazwie firmy, NIP, mieście..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-yellow-400 rounded-lg pl-9 pr-3.5 py-1.5 text-xs text-white placeholder:text-slate-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-1.5 font-medium"
          >
            <option value="ALL">Wszystkie typy</option>
            <option value="SUPPLIER">Dostawcy części</option>
            <option value="CUSTOMER">Klienci hurtowi</option>
            <option value="PARTNER">Stacje demontażu / Złom</option>
            <option value="INSTITUTION">Urzędy / Instytucje</option>
          </select>
        </div>
      </div>

      {/* CONTRACTORS TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px] bg-slate-950/60">
                <th className="p-3.5 font-medium">Podmiot / Firma</th>
                <th className="p-3.5 font-medium">NIP & REGON</th>
                <th className="p-3.5 font-medium">Typ</th>
                <th className="p-3.5 font-medium">Adres / Kontakt</th>
                <th className="p-3.5 font-medium">Źródło</th>
                <th className="p-3.5 font-medium text-right">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-850/40 transition">
                  <td className="p-3.5 font-medium text-slate-100">
                    <div className="font-bold text-white text-xs">{c.name}</div>
                    {c.shortName && c.shortName !== c.name && (
                      <div className="text-[11px] text-yellow-400/90 font-mono mt-0.5">{c.shortName}</div>
                    )}
                  </td>
                  <td className="p-3.5 font-mono text-slate-300">
                    <div>NIP: {c.nip}</div>
                    {c.regon && <div className="text-[10px] text-slate-400">REGON: {c.regon}</div>}
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        c.type === "SUPPLIER"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          : c.type === "PARTNER"
                          ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      }`}
                    >
                      {c.type}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-300">
                    <div className="flex items-center gap-1 text-[11px]">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>
                        {c.city ? `${c.city}, ${c.street || ""}` : "Brak adresu"}
                      </span>
                    </div>
                    {c.phone && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5 font-mono">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{c.phone}</span>
                      </div>
                    )}
                  </td>
                  <td className="p-3.5 font-mono text-[11px]">
                    <span className="text-yellow-400 font-bold">{c.source}</span>
                    <div className="text-[9px] text-slate-400">
                      {c.verifiedAt ? c.verifiedAt.substring(0, 10) : "Niezweryfikowany"}
                    </div>
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingContractor(c);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
                        title="Edytuj dane"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        className="p-1.5 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800 transition"
                        title="Usuń"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT / CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase font-mono">
                {editingContractor.id ? "Edycja Kontrahenta" : "Nowy Kontrahent w Kartotece"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Pełna nazwa firmy / podmiotu *</label>
                <input
                  type="text"
                  required
                  value={editingContractor.name || ""}
                  onChange={(e) => setEditingContractor({ ...editingContractor, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">NIP (10 cyfr) *</label>
                  <input
                    type="text"
                    required
                    value={editingContractor.nip || ""}
                    onChange={(e) => setEditingContractor({ ...editingContractor, nip: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Typ kontrahenta</label>
                  <select
                    value={editingContractor.type || "SUPPLIER"}
                    onChange={(e) =>
                      setEditingContractor({ ...editingContractor, type: e.target.value as ContractorType })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  >
                    <option value="SUPPLIER">Dostawca części</option>
                    <option value="CUSTOMER">Klient</option>
                    <option value="PARTNER">Stacja demontażu / Złom</option>
                    <option value="INSTITUTION">Instytucja / Urząd</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Ulica i numer</label>
                  <input
                    type="text"
                    value={editingContractor.street || ""}
                    onChange={(e) => setEditingContractor({ ...editingContractor, street: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Miasto</label>
                  <input
                    type="text"
                    value={editingContractor.city || ""}
                    onChange={(e) => setEditingContractor({ ...editingContractor, city: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Telefon</label>
                  <input
                    type="text"
                    value={editingContractor.phone || ""}
                    onChange={(e) => setEditingContractor({ ...editingContractor, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">E-mail</label>
                  <input
                    type="email"
                    value={editingContractor.email || ""}
                    onChange={(e) => setEditingContractor({ ...editingContractor, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-medium hover:bg-slate-700 transition"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-yellow-400 text-slate-950 font-black rounded-lg hover:bg-yellow-300 transition"
                >
                  Zapisz
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
