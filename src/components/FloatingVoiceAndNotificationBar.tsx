import React from "react";
import { Mic, Bell, Zap, Cloud, X, ArrowRight } from "lucide-react";
import { AppNotification, ActiveTabType } from "../types";

interface FloatingVoiceAndNotificationBarProps {
  onOpenVoiceModal: () => void;
  onOpenNotificationModal: () => void;
  activeToast: AppNotification | null;
  onDismissToast: () => void;
  onNavigateToTab: (tab: ActiveTabType) => void;
  unreadCount: number;
  urgentCount: number;
}

export const FloatingVoiceAndNotificationBar: React.FC<FloatingVoiceAndNotificationBarProps> = ({
  onOpenVoiceModal,
  onOpenNotificationModal,
  activeToast,
  onDismissToast,
  onNavigateToTab,
  unreadCount,
  urgentCount,
}) => {
  return (
    <>
      {/* FLOATING ACTION BUTTONS (BOTTOM-RIGHT) */}
      <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2.5">
        {/* QUICK VOICE DICTAPHONE TRIGGER */}
        <button
          onClick={onOpenVoiceModal}
          title="Otwórz dyktafon mowy i sterowanie głosem (pl-PL)"
          className="group px-3.5 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black rounded-2xl shadow-xl flex items-center gap-2 transition-all transform hover:scale-105 cursor-pointer border border-yellow-300/60"
        >
          <div className="p-1 bg-slate-950/15 rounded-lg">
            <Mic className="w-4 h-4 text-slate-950" />
          </div>
          <span className="text-xs font-black tracking-tight hidden sm:inline">
            Dyktafon & Mowa
          </span>
        </button>

        {/* QUICK NOTIFICATION CENTER TRIGGER */}
        <button
          onClick={onOpenNotificationModal}
          title="Centrum powiadomień i pilne zadania szefa"
          className={`relative p-3 rounded-2xl shadow-xl border transition-all transform hover:scale-105 cursor-pointer ${
            urgentCount > 0
              ? "bg-red-600 hover:bg-red-500 text-white border-red-400 animate-pulse"
              : unreadCount > 0
              ? "bg-slate-900 hover:bg-slate-800 text-amber-400 border-amber-500/40"
              : "bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800"
          }`}
        >
          {urgentCount > 0 ? (
            <Zap className="w-5 h-5 text-white" />
          ) : (
            <Bell className="w-5 h-5" />
          )}

          {unreadCount > 0 && (
            <span
              className={`absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full text-[10px] font-black flex items-center justify-center shadow-md ${
                urgentCount > 0
                  ? "bg-white text-red-600 animate-bounce"
                  : "bg-amber-400 text-slate-950"
              }`}
            >
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* LIVE IN-APP TOAST ALERT (TOP-CENTER OR BOTTOM-LEFT) */}
      {activeToast && (
        <div className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-lg animate-slideDown">
          <div
            className={`p-3.5 rounded-2xl border shadow-2xl backdrop-blur-md flex items-start justify-between gap-3 text-white ${
              activeToast.type === "boss_urgent_task"
                ? "bg-red-950/90 border-red-500/80 shadow-red-950/50"
                : activeToast.priority === "success"
                ? "bg-emerald-950/90 border-emerald-500/80 shadow-emerald-950/50"
                : "bg-slate-950/90 border-amber-500/80 shadow-amber-950/50"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl mt-0.5 ${
                  activeToast.type === "boss_urgent_task"
                    ? "bg-red-500 text-white animate-bounce"
                    : activeToast.priority === "success"
                    ? "bg-emerald-500 text-white"
                    : "bg-amber-400 text-slate-950"
                }`}
              >
                {activeToast.type === "boss_urgent_task" ? (
                  <Zap className="w-4 h-4" />
                ) : (
                  <Cloud className="w-4 h-4" />
                )}
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider">
                    {activeToast.title}
                  </span>
                </div>
                <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                  {activeToast.message}
                </p>

                {activeToast.actionTab && (
                  <div className="pt-1.5">
                    <button
                      onClick={() => {
                        onNavigateToTab(activeToast.actionTab!);
                        onDismissToast();
                      }}
                      className="px-2.5 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-[11px] font-bold text-white transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>Otwórz w: {activeToast.actionTab.toUpperCase()}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={onDismissToast}
              className="text-white/60 hover:text-white p-1 rounded-md transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
