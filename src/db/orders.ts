import { db } from "./index.ts";
import { orders } from "./schema.ts";
import { eq, desc } from "drizzle-orm";

export interface OrderItem {
  partId: string;
  name: string;
  oem?: string;
  rackLocation?: string;
  priceGross: number;
  isPicked?: boolean;
}

export interface OrderInput {
  id: string;
  orderNumber: string;
  source: "allegro" | "shopgold" | "baselinker" | "phone" | "direct_sale";
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  deliveryAddress?: string;
  items: OrderItem[];
  totalGross: number;
  paymentStatus?: "paid" | "cod" | "pending";
  pickingStatus?: "pending" | "in_picking" | "picked" | "packed" | "shipped";
  assignedPickerId?: string;
  assignedPickerName?: string;
  shippingCarrier?: string;
  trackingNumber?: string;
}

export async function getAllOrdersFromSql() {
  try {
    const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
    return rows.map((r) => ({
      ...r,
      items: r.itemsJson ? JSON.parse(r.itemsJson) : [],
    }));
  } catch (error) {
    console.warn("Could not load orders from Cloud SQL:", error);
    return [];
  }
}

export async function getOrderByIdFromSql(orderId: string) {
  try {
    const res = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!res[0]) return null;
    return {
      ...res[0],
      items: res[0].itemsJson ? JSON.parse(res[0].itemsJson) : [],
    };
  } catch (error) {
    console.warn(`Could not load order ${orderId}:`, error);
    return null;
  }
}

export async function upsertOrderInSql(orderData: OrderInput) {
  try {
    const values = {
      id: orderData.id,
      orderNumber: orderData.orderNumber,
      source: orderData.source,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone || null,
      customerEmail: orderData.customerEmail || null,
      deliveryAddress: orderData.deliveryAddress || null,
      itemsJson: JSON.stringify(orderData.items || []),
      totalGross: orderData.totalGross || 0,
      paymentStatus: orderData.paymentStatus || "pending",
      pickingStatus: orderData.pickingStatus || "pending",
      assignedPickerId: orderData.assignedPickerId || null,
      assignedPickerName: orderData.assignedPickerName || null,
      shippingCarrier: orderData.shippingCarrier || null,
      trackingNumber: orderData.trackingNumber || null,
      pickedAt: orderData.pickingStatus === "picked" ? new Date() : null,
      shippedAt: orderData.pickingStatus === "shipped" ? new Date() : null,
    };

    const res = await db
      .insert(orders)
      .values(values)
      .onConflictDoUpdate({
        target: orders.id,
        set: values,
      })
      .returning();

    return {
      ...res[0],
      items: res[0].itemsJson ? JSON.parse(res[0].itemsJson) : [],
    };
  } catch (error) {
    console.error("Failed to upsert order in Cloud SQL:", error);
    throw error;
  }
}

export async function updateOrderPickingStatus(
  orderId: string,
  status: "pending" | "in_picking" | "picked" | "packed" | "shipped",
  pickerName?: string
) {
  try {
    const updateData: any = {
      pickingStatus: status,
    };
    if (pickerName) {
      updateData.assignedPickerName = pickerName;
    }
    if (status === "picked") {
      updateData.pickedAt = new Date();
    }
    if (status === "shipped") {
      updateData.shippedAt = new Date();
    }

    const res = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, orderId))
      .returning();

    return res[0] || null;
  } catch (error) {
    console.error(`updateOrderPickingStatus error for ${orderId}:`, error);
    throw error;
  }
}
