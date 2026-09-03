import React, { useState } from "react";
import {
  Bell,
  X,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Cloud,
  Clock,
  Trash2,
  ExternalLink,
  Volume2,
  VolumeX,
  ShieldAlert,
  Plus,
  ArrowRight,
  Filter,
} from "lucide-react";
import { AppNotification, ActiveTabType, WorkerTask } from "../types";
import { playNotificationChime } from "../services/notificationService";

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAllAsRead: () => void;
  onMarkAsRead: (id: string) => void;
  onDeleteNotification: (id: string) => void;
  onClearAll: () => void;
  onNavigateToTab: (tab: ActiveTabType) => void;
  onAddUrgentBossTask?: (title: string, desc: string, category: string, rack: string) => void;
  onTriggerFirestoreSync?: () => void;
  isSyncingFirestore?: boolean;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onMarkAsRead,
  onDeleteNotification,
  onClearAll,
  onNavigateToTab,
  onAddUrgentBossTask,
  onTriggerFirestoreSync,
  isSyncingFirestore = false,
}) => {
  const [filterType, setFilterType] = useState<"all" | "boss" | "sync">("all");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isCreatingBossTask, setIsCreatingBossTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskRack, setNewTaskRack] = useState("MAG 14");
  const [newTaskCategory, setNewTaskCategory] = useState("Demontaż");

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter((n) => {
    if (filterType === "boss") return n.type === "boss_urgent_task";
    if (filterType === "sync") return n.type === "firestore_sync";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const urgentCount = notifications.filter((n) => n.type === "boss_urgent_task" && !n.isRead).length;

  const handleCreateTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    if (onAddUrgentBossTask) {
      onAddUrgentBossTask(newTaskTitle, newTaskDesc, newTaskCategory, newTaskRack);
    }
    setNewTaskTitle("");
    setNewTaskDesc("");
    setIsCreatingBossTask(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-[#0b0f19] to-slate-900">
          <div className="flex items-center gap-3">
            <div className="relative p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className={`absolute -top-1 -right-1 w-5 h-5 text-[10px] font-black rounded-full flex items-center justify-center ${
                  urgentCount > 0 ? "bg-red-500 text-white animate-pulse" : "bg-amber-400 text-slate-950"
                }`}>
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Centrum Powiadomień Wewnątrz Aplikacji
                </h2>
                {urgentCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40 rounded-full animate-pulse flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5" />
                    {urgentCount} PILNE OD SZEFA
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Powiadomienia w czasie rzeczywistym o zadaniach szefa i statusie Firestore
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playNotificationChime("info");
              }}
              title={soundEnabled ? "Dźwięk powiadomień włączony" : "Dźwięk wyciszony"}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTROLS BAR: FILTERS & BULK ACTIONS */}
        <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setFilterType("all")}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                filterType === "all" ? "bg-amber-400 text-slate-950" : "text-slate-400 hover:text-white"
              }`}
            >
              <Filter className="w-3 h-3" />
              <span>Wszystkie ({notifications.length})</span>
            </button>
            <button
              onClick={() => setFilterType("boss")}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                filterType === "boss" ? "bg-red-500 text-white shadow-xs" : "text-red-400 hover:text-red-300"
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>Pilne od Szefa ({notifications.filter((n) => n.type === "boss_urgent_task").length})</span>
            </button>
            <button
              onClick={() => setFilterType("sync")}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                filterType === "sync" ? "bg-sky-500 text-white shadow-xs" : "text-sky-400 hover:text-sky-300"
              }`}
            >
              <Cloud className="w-3 h-3" />
              <span>Firestore Cloud ({notifications.filter((n) => n.type === "firestore_sync").length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onTriggerFirestoreSync && (
              <button
                onClick={onTriggerFirestoreSync}
                disabled={isSyncingFirestore}
                className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Cloud className={`w-3 h-3 ${isSyncingFirestore ? "animate-spin" : ""}`} />
                <span>{isSyncingFirestore ? "Synchronizuję..." : "Sync Teraz"}</span>
              </button>
            )}

            <button
              onClick={() => setIsCreatingBossTask(!isCreatingBossTask)}
              className="px-2.5 py-1 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold rounded-lg transition flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <Plus className="w-3 h-3" />
              <span>Zleć Pilne Zadanie</span>
            </button>

            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-slate-400 hover:text-slate-200 transition underline underline-offset-2 cursor-pointer"
              >
                Przeczytane
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={onClearAll}
                title="Wyczyść wszystkie powiadomienia"
                className="text-slate-500 hover:text-red-400 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* BOSS QUICK DISPATCH FORM (COLLAPSIBLE) */}
        {isCreatingBossTask && (
          <form onSubmit={handleCreateTaskSubmit} className="p-4 bg-red-950/20 border-b border-red-900/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-red-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                Delegowanie Pilnego Zadania Szefa (Powiadomi natychmiast załogę)
              </span>
              <button
                type="button"
                onClick={() => setIsCreatingBossTask(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Anuluj
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Tytuł zadania (np. Pilny demontaż skrzyni biegów Passat B6)..."
                required
                className="col-span-1 sm:col-span-2 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-red-400"
              />
              <input
                type="text"
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
                placeholder="Dodatkowe wytyczne (np. Klient z Allegro odbiera osobiście o 15:00)..."
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-red-400"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTaskRack}
                  onChange={(e) => setNewTaskRack(e.target.value)}
                  placeholder="Docelowy regał (np. MAG 14)"
                  className="w-1/2 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                />
                <button
                  type="submit"
                  className="w-1/2 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-black rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1"
                >
                  <Zap className="w-3 h-3" />
                  <span>Wyślij Pilnie</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* NOTIFICATIONS LIST CONTAINER */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 p-2 sm:p-3 space-y-2">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Bell className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
              <p className="text-sm font-semibold">Brak powiadomień w wybranej kategorii</p>
              <p className="text-xs text-slate-600 mt-1">
                Wszystkie zadania i statusy synchronizacji Firestore są na bieżąco monitorowane.
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const isBossUrgent = notif.type === "boss_urgent_task";
              const isFirestore = notif.type === "firestore_sync";

              return (
                <div
                  key={notif.id}
                  onClick={() => onMarkAsRead(notif.id)}
                  className={`p-3.5 rounded-xl border transition flex items-start justify-between gap-3 cursor-pointer ${
                    !notif.isRead
                      ? isBossUrgent
                        ? "bg-red-950/20 border-red-800/50 shadow-xs"
                        : isFirestore && notif.priority === "success"
                        ? "bg-emerald-950/20 border-emerald-800/50"
                        : "bg-amber-950/20 border-amber-800/40"
                      : "bg-slate-900/40 border-slate-800/60 opacity-85 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* ICON INDICATOR */}
                    <div className="mt-0.5 shrink-0">
                      {isBossUrgent ? (
                        <div className="p-2 bg-red-500/20 border border-red-500/40 rounded-xl text-red-400 animate-pulse">
                          <Zap className="w-4 h-4" />
                        </div>
                      ) : isFirestore ? (
                        <div className={`p-2 rounded-xl border ${
                          notif.priority === "success"
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                            : "bg-amber-500/20 border-amber-500/40 text-amber-400"
                        }`}>
                          <Cloud className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="p-2 bg-slate-800 rounded-xl text-slate-400">
                          <Bell className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {/* CONTENT */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`text-xs sm:text-sm font-bold ${
                          isBossUrgent ? "text-red-300" : notif.priority === "success" ? "text-emerald-300" : "text-slate-200"
                        }`}>
                          {notif.title}
                        </h4>
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                        )}
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(notif.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {notif.message}
                      </p>

                      {notif.meta?.details && (
                        <p className="text-[11px] text-slate-400 font-mono bg-black/40 px-2 py-0.5 rounded-md border border-slate-800 inline-block">
                          {notif.meta.details}
                        </p>
                      )}

                      {/* QUICK ACTION BUTTON */}
                      <div className="pt-1 flex items-center gap-2">
                        {notif.actionTab && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMarkAsRead(notif.id);
                              onNavigateToTab(notif.actionTab!);
                              onClose();
                            }}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition flex items-center gap-1 cursor-pointer ${
                              isBossUrgent
                                ? "bg-red-600 hover:bg-red-500 text-white border-red-500"
                                : "bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700"
                            }`}
                          >
                            <span>Otwórz w: {notif.actionTab.toUpperCase()}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}

                        {isFirestore && onTriggerFirestoreSync && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTriggerFirestoreSync();
                            }}
                            className="px-2 py-1 text-[10px] bg-sky-950/60 hover:bg-sky-900/80 text-sky-300 border border-sky-800 rounded-lg transition"
                          >
                            Synchronizuj ponownie
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* REMOVE BUTTON */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNotification(notif.id);
                    }}
                    className="text-slate-500 hover:text-slate-300 p-1 rounded-md transition"
                    title="Usuń powiadomienie"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[11px]">Nasłuch zdarzeń Firestore & Zadania Szefa: AKTYWNE</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition cursor-pointer"
          >
            Zamknij
          </button>
        </div>

      </div>
    </div>
  );
};
