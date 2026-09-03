import { useState, useEffect, useCallback, useRef } from "react";
import {
  collection,
  query,
  limit,
  onSnapshot,
  doc,
  getDocFromServer,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { PARTS_COLLECTION, batchSyncPartsToFirestore } from "../lib/firestoreService";
import { notifyFirestoreSyncStatus } from "../services/notificationService";
import { PartItem, NetworkSyncInfo, FirestoreSyncStatus } from "../types";
import firebaseConfigJson from "../../firebase-applet-config.json";

const DATABASE_ID = (firebaseConfigJson as any).firestoreDatabaseId || "(default)";

export function useNetworkAndFirestoreSync(initialPartsCount: number = 0) {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  const [syncStatus, setSyncStatus] = useState<FirestoreSyncStatus>(() =>
    typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "synced"
  );

  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(() => new Date());
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [pendingWritesCount, setPendingWritesCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMeasuringPing, setIsMeasuringPing] = useState<boolean>(false);
  const [totalSyncedCount, setTotalSyncedCount] = useState<number>(initialPartsCount);

  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Ping / Latency measure function
  const measureFirestoreLatency = useCallback(async (): Promise<number | null> => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setLatencyMs(null);
      setSyncStatus("offline");
      return null;
    }

    setIsMeasuringPing(true);
    const startTime = performance.now();
    try {
      // Fast probe to Firestore server
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout pingu")), 5000)
      );
      const pingPromise = getDocFromServer(doc(db, "test", "connection"));

      await Promise.race([pingPromise, timeoutPromise]);
      const duration = Math.round(performance.now() - startTime);
      setLatencyMs(duration);
      setErrorMessage(null);
      setSyncStatus("synced");
      return duration;
    } catch (err: any) {
      const isClientOffline =
        err?.message?.includes("client is offline") ||
        err?.code === "unavailable" ||
        (typeof navigator !== "undefined" && !navigator.onLine);

      if (isClientOffline) {
        setSyncStatus("offline");
        setLatencyMs(null);
      } else {
        // If the document doesn't exist, it still reached the server and succeeded!
        if (err?.code !== "permission-denied") {
          const duration = Math.round(performance.now() - startTime);
          setLatencyMs(duration);
          setSyncStatus("synced");
          setErrorMessage(null);
          return duration;
        }
        setSyncStatus("error");
        setErrorMessage(err?.message || "Błąd połączenia z Firestore");
      }
      return null;
    } finally {
      setIsMeasuringPing(false);
    }
  }, []);

  // Window online/offline event listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus("syncing");
      setErrorMessage(null);
      measureFirestoreLatency().then(() => {
        setLastSyncTime(new Date());
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus("offline");
      setLatencyMs(null);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [measureFirestoreLatency]);

  // Real-time Firestore metadata and snapshot listener
  useEffect(() => {
    if (!isOnline) {
      setSyncStatus("offline");
      return;
    }

    try {
      const q = query(collection(db, PARTS_COLLECTION), limit(1));

      const unsubscribe = onSnapshot(
        q,
        { includeMetadataChanges: true },
        (snapshot) => {
          if (snapshot.metadata.hasPendingWrites) {
            setPendingWritesCount(1);
            setSyncStatus("syncing");
          } else {
            setPendingWritesCount(0);
            setSyncStatus("synced");
            setLastSyncTime(new Date());
            setErrorMessage(null);
          }
        },
        (error) => {
          console.warn("Firestore snapshot listener notification:", error);
          if (error.code === "unavailable" || !navigator.onLine) {
            setSyncStatus("offline");
          } else {
            setSyncStatus("error");
            setErrorMessage(error.message);
          }
        }
      );

      unsubscribeRef.current = unsubscribe;
      return () => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
        }
      };
    } catch (e: any) {
      console.warn("Failed to attach snapshot listener:", e);
    }
  }, [isOnline]);

  // Initial ping measurement and interval (every 45s)
  useEffect(() => {
    measureFirestoreLatency();
    const interval = setInterval(() => {
      if (typeof navigator !== "undefined" && navigator.onLine) {
        measureFirestoreLatency();
      }
    }, 45000);

    return () => clearInterval(interval);
  }, [measureFirestoreLatency]);

  // Trigger manual batch sync
  const triggerManualSync = useCallback(
    async (parts: PartItem[]): Promise<boolean> => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        notifyFirestoreSyncStatus({
          success: false,
          error: "Brak połączenia z siecią (Offline). Zmiany zapisane lokalnie w IndexedDB.",
          action: "batch",
        });
        setSyncStatus("offline");
        return false;
      }

      setSyncStatus("syncing");
      const startTime = performance.now();

      try {
        const count = await batchSyncPartsToFirestore(parts);
        const duration = Math.round(performance.now() - startTime);
        setLatencyMs(duration);
        setLastSyncTime(new Date());
        setSyncStatus("synced");
        setTotalSyncedCount(count);
        setPendingWritesCount(0);
        setErrorMessage(null);

        notifyFirestoreSyncStatus({
          success: true,
          count,
          action: "batch",
        });
        return true;
      } catch (err: any) {
        setSyncStatus("error");
        setErrorMessage(err?.message || "Błąd synchronizacji z chmurą");
        notifyFirestoreSyncStatus({
          success: false,
          error: err?.message || "Błąd synchronizacji",
          action: "batch",
        });
        return false;
      }
    },
    []
  );

  const syncInfo: NetworkSyncInfo = {
    isOnline,
    syncStatus,
    lastSyncTime,
    latencyMs,
    pendingWritesCount,
    errorMessage,
    databaseId: DATABASE_ID,
    collectionName: PARTS_COLLECTION,
    totalSyncedCount,
  };

  return {
    syncInfo,
    isOnline,
    syncStatus,
    lastSyncTime,
    latencyMs,
    pendingWritesCount,
    errorMessage,
    isMeasuringPing,
    measureFirestoreLatency,
    triggerManualSync,
    setTotalSyncedCount,
  };
}
