import { AppNotification, NotificationPriority, WorkerTask } from "../types";

const NOTIFICATIONS_STORAGE_KEY = "koneser_in_app_notifications_v1";

// Default initial notifications showing urgent boss tasks and Firestore sync status
export const initialNotifications: AppNotification[] = [
  {
    id: "notif_boss_1",
    type: "boss_urgent_task",
    title: "⚡ PILNE ZADANIE OD SZEFA (Grzegorz Kuźma)",
    message: "Natychmiastowy demontaż pasa przedniego, chłodnic i reflektorów ze Skoda Fabia I. Klient z Allegro czeka na wysyłkę kurierem do 14:00!",
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    isRead: false,
    priority: "critical",
    actionTab: "pracownik",
    taskId: "task_1",
  },
  {
    id: "notif_sync_1",
    type: "firestore_sync",
    title: "☁️ Firebase Firestore: Gotowość bazy danych",
    message: "Połączono z bazą chmurową Firestore (projekt ai-studio-ovokofastlisterp). Wszystkie wpisy magazynowe są zabezpieczone w Cloud Storage.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    isRead: false,
    priority: "success",
    actionTab: "szef",
    meta: {
      count: 24,
      syncType: "status",
      details: "Baza online, autoryzacja Google poprawna.",
    },
  },
  {
    id: "notif_boss_2",
    type: "boss_urgent_task",
    title: "⚠️ Zadanie Szefa: Weryfikacja cewek i sterownika ECU",
    message: "Sprawdź numery OEM sterownika 09353459 z Astry G i wykonaj zdjęcia pinów przed wystawieniem na Allegro.",
    timestamp: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    isRead: true,
    priority: "warning",
    actionTab: "pracownik",
    taskId: "task_2",
  },
];

export function getStoredNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading stored notifications:", e);
  }
  return initialNotifications;
}

export function saveStoredNotifications(notifs: AppNotification[]): void {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifs.slice(0, 100)));
  } catch (e) {
    console.error("Error saving notifications:", e);
  }
}

// Simple Web Audio API sound generator (no external files needed)
export function playNotificationChime(priority: NotificationPriority = "info") {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Check state (some browsers suspend audio until user interaction)
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (priority === "critical") {
      // Two-tone urgent boss alert
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.setValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (priority === "success") {
      // Pleasant upward chime
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else {
      // Soft notification ping
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now); // D5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch (e) {
    // Audio context may fail if blocked by browser autoplay policy
  }
}

// Global CustomEvent notification dispatcher so any tab/service can push notifications
export const NOTIFICATION_EVENT = "koneser:app_notification";

export function dispatchAppNotification(notification: Omit<AppNotification, "id" | "timestamp" | "isRead">) {
  const fullNotification: AppNotification = {
    ...notification,
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date().toISOString(),
    isRead: false,
  };

  try {
    const existing = getStoredNotifications();
    const updated = [fullNotification, ...existing];
    saveStoredNotifications(updated);

    // Emit browser window event
    const event = new CustomEvent(NOTIFICATION_EVENT, { detail: fullNotification });
    window.dispatchEvent(event);

    // Play chime for urgent or sync items
    playNotificationChime(fullNotification.priority);
  } catch (e) {
    console.error("Failed to dispatch notification:", e);
  }

  return fullNotification;
}

// Helper to notify about new boss task
export function notifyBossUrgentTask(task: WorkerTask, bossName: string = "Grzegorz Kuźma") {
  return dispatchAppNotification({
    type: "boss_urgent_task",
    title: `⚡ PILNE ZADANIE: ${task.title}`,
    message: `Szef (${bossName}) zlecił pilne zadanie w kategorii "${task.category}". ${task.description}`,
    priority: "critical",
    actionTab: "pracownik",
    taskId: task.id,
    meta: {
      details: `Pojazd: ${task.vehicleTag || "Brak"} | Regał docelowy: ${task.targetRack || "MAG 14"}`,
    },
  });
}

// Helper to notify about Firestore synchronization
export function notifyFirestoreSyncStatus(params: {
  success: boolean;
  count?: number;
  error?: string;
  action?: "push" | "pull" | "batch" | "connection";
}) {
  if (params.success) {
    return dispatchAppNotification({
      type: "firestore_sync",
      title: "☁️ Synchronizacja Firestore: Sukces",
      message: params.count !== undefined
        ? `Pomyślnie zsynchronizowano ${params.count} pozycji z chmurą Firebase Firestore.`
        : "Połączenie z bazą Firestore nawiązane i zaktualizowane.",
      priority: "success",
      actionTab: "szef",
      meta: {
        count: params.count,
        syncType: params.action || "batch",
      },
    });
  } else {
    return dispatchAppNotification({
      type: "firestore_sync",
      title: "⚠️ Firestore: Błąd synchronizacji",
      message: params.error
        ? `Nie udało się zsynchronizować danych z chmurą Firestore: ${params.error}`
        : "Wystąpił problem z połączeniem z Firestore. Aplikacja działa w trybie lokalnym offline.",
      priority: "warning",
      actionTab: "szef",
      meta: {
        error: params.error,
        syncType: params.action || "batch",
      },
    });
  }
}
