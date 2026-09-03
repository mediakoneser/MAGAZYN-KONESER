import { db } from "./index.ts";
import { employeeCommissions } from "./schema.ts";
import { eq, desc, and } from "drizzle-orm";

export interface CommissionInput {
  workerId: string;
  workerName: string;
  role: "mechanic" | "warehouseman" | "salesman" | string;
  month: string; // np. "2026-09"
  partsDismantledCount?: number;
  partsSoldCount?: number;
  totalSalesVolume?: number;
  totalNetProfitGenerated?: number;
  commissionRatePercent?: number;
  bonusAmount?: number;
}

export async function getCommissionsForMonthFromSql(month: string) {
  try {
    return await db
      .select()
      .from(employeeCommissions)
      .where(eq(employeeCommissions.month, month))
      .orderBy(desc(employeeCommissions.totalSalesVolume));
  } catch (error) {
    console.warn(`Could not load commissions for ${month} from SQL:`, error);
    return [];
  }
}

export async function upsertWorkerCommissionInSql(data: CommissionInput) {
  try {
    const rate = data.commissionRatePercent || 5;
    const profit = data.totalNetProfitGenerated || 0;
    const earned = (profit * rate) / 100;

    const values = {
      workerId: data.workerId,
      workerName: data.workerName,
      role: data.role,
      month: data.month,
      partsDismantledCount: data.partsDismantledCount || 0,
      partsSoldCount: data.partsSoldCount || 0,
      totalSalesVolume: data.totalSalesVolume || 0,
      totalNetProfitGenerated: profit,
      commissionRatePercent: rate,
      commissionEarned: earned,
      bonusAmount: data.bonusAmount || 0,
      updatedAt: new Date(),
    };

    // Check if record exists for worker and month
    const existing = await db
      .select()
      .from(employeeCommissions)
      .where(
        and(
          eq(employeeCommissions.workerId, data.workerId),
          eq(employeeCommissions.month, data.month)
        )
      )
      .limit(1);

    if (existing[0]) {
      const res = await db
        .update(employeeCommissions)
        .set(values)
        .where(eq(employeeCommissions.id, existing[0].id))
        .returning();
      return res[0];
    } else {
      const res = await db.insert(employeeCommissions).values(values).returning();
      return res[0];
    }
  } catch (error) {
    console.error("upsertWorkerCommissionInSql failed:", error);
    throw error;
  }
}
