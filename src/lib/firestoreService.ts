import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  writeBatch,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { PartItem } from "../types";
import { sanitizePartItem } from "../utils/dataSanitizer";

export const PARTS_COLLECTION = "parts";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Fetch all parts from Firestore cloud with timeout fallback
 */
export async function fetchPartsFromFirestore(): Promise<PartItem[]> {
  try {
    const fetchPromise = (async () => {
      const q = query(
        collection(db, PARTS_COLLECTION),
        orderBy("createdAt", "desc"),
        limit(500)
      );
      const snapshot = await getDocs(q);
      const parts: PartItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as PartItem;
        parts.push(sanitizePartItem({ ...data, id: docSnap.id }));
      });
      return parts;
    })();

    // 4.5s timeout for fast UI fallback to local IndexedDB/localStorage
    const timeoutPromise = new Promise<PartItem[]>((resolve) =>
      setTimeout(() => resolve([]), 4500)
    );

    const result = await Promise.race([fetchPromise, timeoutPromise]);
    return result;
  } catch (err: any) {
    if (
      err?.code === "permission-denied" ||
      err?.message?.includes("Missing or insufficient permissions")
    ) {
      handleFirestoreError(err, OperationType.LIST, PARTS_COLLECTION);
    }
    console.info("Firestore offline/fallback mode active:", err);
    return [];
  }
}

/**
 * Save or update a single part in Firestore
 */
export async function savePartToFirestore(part: PartItem): Promise<boolean> {
  const docPath = `${PARTS_COLLECTION}/${part.id}`;
  try {
    const partRef = doc(db, PARTS_COLLECTION, part.id);
    const sanitized = sanitizePartItem(part);
    // Remove undefined fields
    const cleanData = JSON.parse(JSON.stringify(sanitized));
    await setDoc(partRef, cleanData, { merge: true });
    return true;
  } catch (err: any) {
    if (
      err?.code === "permission-denied" ||
      err?.message?.includes("Missing or insufficient permissions")
    ) {
      handleFirestoreError(err, OperationType.WRITE, docPath);
    }
    console.error("Firestore save part error:", err);
    return false;
  }
}

/**
 * Delete a part from Firestore
 */
export async function deletePartFromFirestore(partId: string): Promise<boolean> {
  const docPath = `${PARTS_COLLECTION}/${partId}`;
  try {
    const partRef = doc(db, PARTS_COLLECTION, partId);
    await deleteDoc(partRef);
    return true;
  } catch (err: any) {
    if (
      err?.code === "permission-denied" ||
      err?.message?.includes("Missing or insufficient permissions")
    ) {
      handleFirestoreError(err, OperationType.DELETE, docPath);
    }
    console.error("Firestore delete part error:", err);
    return false;
  }
}

/**
 * Batch upload / synchronize multiple parts to Firestore
 */
export async function batchSyncPartsToFirestore(parts: PartItem[]): Promise<number> {
  try {
    const batch = writeBatch(db);
    let count = 0;
    // Firestore batch limit is 500
    const toSync = parts.slice(0, 450);
    for (const part of toSync) {
      const sanitized = sanitizePartItem(part);
      const cleanData = JSON.parse(JSON.stringify(sanitized));
      const partRef = doc(db, PARTS_COLLECTION, part.id);
      batch.set(partRef, cleanData, { merge: true });
      count++;
    }
    await batch.commit();
    return count;
  } catch (err: any) {
    if (
      err?.code === "permission-denied" ||
      err?.message?.includes("Missing or insufficient permissions")
    ) {
      handleFirestoreError(err, OperationType.WRITE, PARTS_COLLECTION);
    }
    console.error("Firestore batch sync error:", err);
    return 0;
  }
}
