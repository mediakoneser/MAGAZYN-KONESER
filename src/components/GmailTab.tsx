import React, { useState, useEffect } from "react";
import {
  Mail,
  Send,
  Trash2,
  RefreshCw,
  Search,
  Inbox,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  FileText,
  Package,
  Plus,
  Loader2,
  LogIn,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import {
  GmailMessageSummary,
  GmailMessageDetail,
  listGmailMessages,
  getGmailMessageDetail,
  sendGmailMessage,
  trashGmailMessage,
} from "../lib/gmailService";
import { PartItem } from "../types";

interface GmailTabProps {
  parts?: PartItem[];
  onNotify?: (title: string, message: string, priority?: "info" | "success" | "warning" | "critical") => void;
}

export const GmailTab: React.FC<GmailTabProps> = ({ parts = [], onNotify }) => {
  const { user, accessToken, signInWithGoogle, signOut, loading: authLoading } = useAuth();

  const [messages, setMessages] = useState<GmailMessageSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [messageDetail, setMessageDetail] = useState<GmailMessageDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Compose Modal State
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);
  const [toEmail, setToEmail] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [selectedPartForEmail, setSelectedPartForEmail] = useState<string>("");

  // Confirmation Modals (MANDATORY per Workspace Integration skill)
  const [confirmSendOpen, setConfirmSendOpen] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState<boolean>(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchMessages = async (token: string, q = "") => {
    setLoading(true);
    setError(null);
    try {
      const res = await listGmailMessages(token, {
        maxResults: 20,
        query: q || undefined,
      });
      setMessages(res.messages);
    } catch (e: any) {
      console.error("Error listing Gmail messages:", e);
      setError(e.message || "Błąd pobierania wiadomości z Gmail");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchMessages(accessToken, searchQuery);
    }
  }, [accessToken]);

  const handleSelectMessage = async (id: string) => {
    setSelectedMessageId(id);
    setMessageDetail(null);
    if (!accessToken) return;

    setLoadingDetail(true);
    try {
      const detail = await getGmailMessageDetail(accessToken, id);
      setMessageDetail(detail);
    } catch (e: any) {
      setError(e.message || "Błąd odczytu treści wiadomości");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleApplyTemplate = (type: "quote" | "shipping" | "compatibility") => {
    const selectedPart = parts.find((p) => p.id === selectedPartForEmail) || parts[0];
    const partName = selectedPart?.listingData?.kategoria || "Część samochodowa";
    const oem = selectedPart?.listingData?.numery_czesci || "Oryginał OEM";
    const price = selectedPart?.listingData?.cena?.brutto || 150;
    const location = selectedPart?.currentRackLocation || "MAG 14";

    if (type === "quote") {
      setSubject(`Wycena i dostępność części: ${partName} (${oem}) - PHU U Konesera`);
      setBody(
        `Dzień dobry,\n\nw odpowiedzi na zapytanie potwierdzamy dostępność części w naszym magazynie WMS:\n\n` +
          `• Część: ${partName}\n` +
          `• Numery OEM: ${oem}\n` +
          `• Stan magazynowy: Dostępna od ręki (Lokalizacja: ${location})\n` +
          `• Cena brutto: ${price} PLN (faktura VAT 23% / paragon)\n` +
          `• Gwarancja rozruchowa: 30 dni\n\n` +
          `Możliwa wysyłka kurierska za pobraniem (doręczenie 24h) lub odbiór osobisty na stacji demontażu:\n` +
          `PHU U Konesera, ul. Daszyńskiego 16G, 58-533 Mysłakowice (tel. 533 533 443).\n\n` +
          `Pozdrawiamy,\nZespół PHU U Konesera WMS`
      );
    } else if (type === "shipping") {
      setSubject(`Potwierdzenie wysyłki części: ${partName} - PHU U Konesera`);
      setBody(
        `Dzień dobry,\n\nInformujemy, że zamówiona część "${partName}" (OEM: ${oem}) została spakowana i przekazana kurierowi DPD/InPost.\n\n` +
          `Numer przesyłki: DP${Date.now().toString().slice(-8)}PL\n` +
          `Przewidywany czas doręczenia: jutro do godziny 14:00.\n\n` +
          `Dziękujemy za zakupy w stacji demontażu PHU U Konesera!\n` +
          `W razie pytań prosimy o kontakt pod numerem 533 533 443.`
      );
    } else if (type === "compatibility") {
      setSubject(`Weryfikacja kompatybilności części OEM: ${oem}`);
      setBody(
        `Dzień dobry,\n\nNasi specjaliści zweryfikowali numer części "${oem}" w katalogu TecDoc.\n` +
          `Część jest w 100% zgodna z Państwa modelem pojazdu.\n\n` +
          `W razie chęci finalizacji zakupu prosimy o kontakt zwrotny lub złożenie zamówienia.\n\n` +
          `Pozdrawiamy,\nPHU U Konesera Mysłakowice`
      );
    }
  };

  // Perform email send after user confirmation
  const handleConfirmSend = async () => {
    if (!accessToken) return;
    setIsSending(true);
    try {
      await sendGmailMessage(accessToken, {
        to: toEmail,
        subject,
        body,
      });

      setConfirmSendOpen(false);
      setIsComposeOpen(false);
      setToEmail("");
      setSubject("");
      setBody("");

      if (onNotify) {
        onNotify("Gmail", `Wiadomość została wysłana do ${toEmail}!`, "success");
      }
      fetchMessages(accessToken, searchQuery);
    } catch (e: any) {
      alert(`Błąd podczas wysyłania: ${e.message}`);
    } finally {
      setIsSending(false);
    }
  };

  // Perform email trash after user confirmation
  const handleConfirmTrash = async () => {
    if (!accessToken || !messageToDelete) return;
    setIsDeleting(true);
    try {
      await trashGmailMessage(accessToken, messageToDelete);
      setConfirmDeleteOpen(false);
      setMessageToDelete(null);
      if (selectedMessageId === messageToDelete) {
        setSelectedMessageId(null);
        setMessageDetail(null);
      }
      if (onNotify) {
        onNotify("Gmail", "Wiadomość została przeniesiona do kosza Gmail.", "info");
      }
      fetchMessages(accessToken, searchQuery);
    } catch (e: any) {
      alert(`Błąd usuwania: ${e.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* NAGŁÓWEK GŁÓWNY Z INTEGRACJĄ GMAIL */}
      <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shadow-xs">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Centrum Korespondencji Gmail (Google Workspace)
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30">
                Gmail API v1
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Obsługa zapytań klientów o części, automatyczne oferty WMS i potwierdzenia wysyłek ze stacji demontażu
            </p>
          </div>
        </div>

        {/* KONTROLKI AUTORYZACJI GOOGLE */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2 bg-[#030712] px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono">
              <User className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-slate-200 font-bold truncate max-w-[160px]">{user.email}</span>
              <button
                type="button"
                onClick={() => signOut()}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition"
                title="Wyloguj z konta Google"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => signInWithGoogle()}
              disabled={authLoading}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs"
            >
              {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              <span>Zaloguj przez Google (Gmail)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsComposeOpen(true)}
            disabled={!accessToken}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>Napisz wiadomość</span>
          </button>
        </div>
      </div>

      {/* BRAK AUTORYZACJI OSTRZEŻENIE */}
      {!accessToken && (
        <div className="bg-[#0b0f19] border border-amber-400/30 rounded-xl p-5 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-400/10 text-amber-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-sm font-bold text-white mb-1">Wymagana autoryzacja konta Gmail</h3>
            <p className="text-xs text-slate-400 font-mono">
              Zaloguj się na swoje konto Google, aby przeglądać korespondencję z klientami stacji demontażu oraz wysyłać wyceny części prosto z magazynu WMS.
            </p>
          </div>
          <button
            type="button"
            onClick={() => signInWithGoogle()}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs rounded-xl transition inline-flex items-center gap-2 cursor-pointer shadow-md"
          >
            <LogIn className="w-4 h-4" />
            <span>Połącz z Gmail</span>
          </button>
        </div>
      )}

      {/* GŁÓWNA STRUKTURA POCZTY */}
      {accessToken && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* LEWA KOLUMNA: LISTA WIADOMOŚCI */}
          <div className="lg:col-span-5 bg-[#0b0f19] border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col h-[680px]">
            {/* WYSZUKIWARKA & ODŚWIEŻANIE */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchMessages(accessToken, searchQuery)}
                  placeholder="Szukaj w Gmail (np. alternator, klient, faktura)..."
                  className="w-full bg-[#030712] border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 font-mono placeholder:text-slate-500 focus:outline-hidden focus:border-red-400"
                />
              </div>
              <button
                type="button"
                onClick={() => fetchMessages(accessToken, searchQuery)}
                disabled={loading}
                className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition cursor-pointer"
                title="Odśwież skrzynkę"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-amber-400" : ""}`} />
              </button>
            </div>

            {/* STATUS / BŁĄD */}
            {error && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs font-mono flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{error}</span>
              </div>
            )}

            {/* LISTA WIADOMOŚCI */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {loading && messages.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-slate-400 text-xs font-mono gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                  <span>Wczytywanie skrzynki Gmail...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-slate-500 text-xs font-mono space-y-1">
                  <Inbox className="w-6 h-6 text-slate-600 mb-1" />
                  <span>Brak wiadomości w skrzynce.</span>
                </div>
              ) : (
                messages.map((msg) => {
                  const isSelected = msg.id === selectedMessageId;
                  return (
                    <div
                      key={msg.id}
                      onClick={() => handleSelectMessage(msg.id)}
                      className={`p-3 rounded-xl border transition cursor-pointer font-mono ${
                        isSelected
                          ? "bg-red-500/10 border-red-500/50 shadow-xs"
                          : "bg-[#030712] border-slate-800/80 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-bold text-white truncate">{msg.from || "Nadawca"}</span>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {new Date(msg.date).toLocaleDateString("pl-PL", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </span>
                      </div>
                      <h4
                        className={`text-xs truncate ${
                          msg.unread ? "font-bold text-amber-300" : "text-slate-300"
                        }`}
                      >
                        {msg.subject || "(Brak tematu)"}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate mt-1">{msg.snippet}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* PRAWA KOLUMNA: PODGLĄD WIADOMOŚCI */}
          <div className="lg:col-span-7 bg-[#0b0f19] border border-slate-800 rounded-xl p-5 flex flex-col h-[680px]">
            {loadingDetail ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs font-mono gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                <span>Pobieranie pełnej treści wiadomości z Gmail...</span>
              </div>
            ) : messageDetail ? (
              <div className="flex flex-col h-full space-y-4">
                {/* PASEK AKCJI DLA OTWARTEJ WIADOMOŚCI */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">{messageDetail.subject}</h3>
                    <div className="text-xs font-mono text-slate-400 space-y-0.5">
                      <div>Od: <strong className="text-slate-200">{messageDetail.from}</strong></div>
                      <div>Data: {new Date(messageDetail.date).toLocaleString("pl-PL")}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setToEmail(messageDetail.from.replace(/^.*<([^>]+)>.*$/, "$1"));
                        setSubject(`Re: ${messageDetail.subject.replace(/^Re:\s*/i, "")}`);
                        setIsComposeOpen(true);
                      }}
                      className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg font-mono transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Odpowiedz</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMessageToDelete(messageDetail.id);
                        setConfirmDeleteOpen(true);
                      }}
                      className="p-1.5 bg-slate-900 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 rounded-lg border border-slate-800 transition cursor-pointer"
                      title="Przenieś do kosza"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* TREŚĆ WIADOMOŚCI */}
                <div className="flex-1 overflow-y-auto bg-[#030712] p-4 rounded-xl border border-slate-800 text-xs text-slate-200 font-mono leading-relaxed whitespace-pre-wrap">
                  {messageDetail.bodyText || messageDetail.snippet}
                </div>

                {/* SZYBKIE SZABLONY ODPOWIEDZI */}
                <div className="border-t border-slate-800 pt-3 flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span className="text-slate-400 text-[11px]">Szybka odpowiedź:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setToEmail(messageDetail.from.replace(/^.*<([^>]+)>.*$/, "$1"));
                      handleApplyTemplate("quote");
                      setIsComposeOpen(true);
                    }}
                    className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
                  >
                    💰 Wyślij wycenę części
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setToEmail(messageDetail.from.replace(/^.*<([^>]+)>.*$/, "$1"));
                      handleApplyTemplate("compatibility");
                      setIsComposeOpen(true);
                    }}
                    className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
                  >
                    🚗 Potwierdź dopasowanie OEM
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs font-mono space-y-2">
                <Mail className="w-8 h-8 text-slate-600 mb-1" />
                <span>Wybierz wiadomość z listy po lewej stronie, aby odczytać jej treść.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL KOMPONOWANIA WIADOMOŚCI */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-[#0b0f19] border border-slate-700 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden font-sans">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#070b14]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-400" /> Nowa wiadomość Gmail
              </h3>
              <button
                type="button"
                onClick={() => setIsComposeOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              {/* WYBÓR CZĘŚCI DO SZABLONU */}
              {parts.length > 0 && (
                <div className="bg-[#030712] p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                    <span className="font-bold flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-amber-400" /> Dołącz dane części z magazynu WMS
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedPartForEmail}
                      onChange={(e) => setSelectedPartForEmail(e.target.value)}
                      className="flex-1 bg-[#0b0f19] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-hidden focus:border-amber-400"
                    >
                      <option value="">-- Wybierz część z magazynu --</option>
                      {parts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.listingData?.kategoria} (OEM: {p.listingData?.numery_czesci || p.id}) -{" "}
                          {p.listingData?.cena?.brutto} PLN
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => handleApplyTemplate("quote")}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 rounded-lg text-xs font-mono font-bold cursor-pointer"
                    >
                      Szablon Wyceny
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyTemplate("shipping")}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-teal-400 border border-slate-800 rounded-lg text-xs font-mono font-bold cursor-pointer"
                    >
                      Szablon Wysyłki
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Odbiorca (E-mail):</label>
                <input
                  type="email"
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  placeholder="klient@example.com"
                  className="w-full bg-[#030712] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Temat:</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Temat wiadomości..."
                  className="w-full bg-[#030712] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Treść wiadomości:</label>
                <textarea
                  rows={9}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Treść wiadomości..."
                  className="w-full bg-[#030712] border border-slate-800 rounded-xl p-3.5 text-xs text-white font-mono leading-relaxed focus:outline-hidden focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-[#070b14]">
              <button
                type="button"
                onClick={() => setIsComposeOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono transition cursor-pointer"
              >
                Anuluj
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!toEmail.trim() || !subject.trim()) {
                    alert("Wprowadź adres odbiorcy i temat wiadomości.");
                    return;
                  }
                  // Open mandatory confirmation dialog
                  setConfirmSendOpen(true);
                }}
                className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs font-mono rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Send className="w-4 h-4" />
                <span>Wyślij e-mail</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANDATORY CONFIRMATION MODAL BEFORE SENDING EMAIL */}
      {confirmSendOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4">
          <div className="bg-[#0b0f19] border border-amber-400/40 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl font-sans">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Potwierdź wysłanie wiadomości</h4>
                <p className="text-xs text-slate-400 font-mono">Czy na pewno chcesz wysłać ten e-mail przez Gmail?</p>
              </div>
            </div>

            <div className="bg-[#030712] p-3 rounded-xl border border-slate-800 text-xs font-mono space-y-1">
              <div className="text-slate-400">Do: <strong className="text-white">{toEmail}</strong></div>
              <div className="text-slate-400">Temat: <strong className="text-amber-300">{subject}</strong></div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isSending}
                onClick={() => setConfirmSendOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono transition cursor-pointer"
              >
                Wróć do edycji
              </button>
              <button
                type="button"
                disabled={isSending}
                onClick={handleConfirmSend}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs font-mono transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Zatwierdź i wyślij</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANDATORY CONFIRMATION MODAL BEFORE TRASHING EMAIL */}
      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4">
          <div className="bg-[#0b0f19] border border-rose-500/40 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl font-sans">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Przenieść wiadomość do kosza?</h4>
                <p className="text-xs text-slate-400 font-mono">
                  Wiadomość zostanie przeniesiona do folderu Kosz w Twoim koncie Gmail.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setConfirmDeleteOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono transition cursor-pointer"
              >
                Anuluj
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmTrash}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs font-mono transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Tak, usuń do kosza</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
