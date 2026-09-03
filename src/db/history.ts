import { db } from "./index.ts";
import { partHistoryLogs } from "./schema.ts";
import { eq, desc } from "drizzle-orm";

export interface PartHistoryInput {
  partId: string;
  action:
    | "DEMONTAŻ"
    | "MAGAZYN"
    | "REGAŁ"
    | "WYSTAWIENIE"
    | "ZMIANA_CENY"
    | "REZERWACJA"
    | "SPRZEDAŻ"
    | "POBRANIE"
    | "WYSYŁKA"
    | string;
  userId?: string;
  userName?: string;
  details: string;
  metadata?: Record<string, any>;
}

export async function logPartActionInSql(entry: PartHistoryInput) {
  try {
    const res = await db
      .insert(partHistoryLogs)
      .values({
        partId: entry.partId,
        action: entry.action,
        userId: entry.userId || null,
        userName: entry.userName || "System WMS",
        details: entry.details,
        metadataJson: entry.metadata ? JSON.stringify(entry.metadata) : null,
      })
      .returning();

    return res[0];
  } catch (error) {
    console.warn(`Could not log part action to SQL for ${entry.partId}:`, error);
    return null;
  }
}

export async function getPartHistoryFromSql(partId: string) {
  try {
    const rows = await db
      .select()
      .from(partHistoryLogs)
      .where(eq(partHistoryLogs.partId, partId))
      .orderBy(desc(partHistoryLogs.createdAt));

    return rows.map((r) => ({
      ...r,
      metadata: r.metadataJson ? JSON.parse(r.metadataJson) : {},
    }));
  } catch (error) {
    console.warn(`Could not get history for ${partId} from SQL:`, error);
    return [];
  }
}
