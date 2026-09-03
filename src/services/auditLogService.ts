/**
 * Audit Log Service — Business OS v1
 * 
 * Records system changes:
 * Product edits, WMS movements, contractor updates, order status changes.
 */

import { AuditLogEntry } from "../types/businessCore";

const AUDIT_STORAGE_KEY = "business_os_audit_logs_v1";
const MAX_AUDIT_COUNT = 300;

class AuditLogService {
  private logs: AuditLogEntry[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(AUDIT_STORAGE_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      } else {
        this.seedInitialLogs();
      }
    } catch (e) {
      this.seedInitialLogs();
    }
  }

  private seedInitialLogs() {
    this.logs = [
      {
        id: "audit_1",
        userId: "staff_1",
        userName: "Grzegorz Kuźma",
        action: "PRZYJĘCIE_I_DEMONTAŻ",
        entityType: "PRODUCT",
        entityId: "part_1",
        changesSummary: "Wprowadzono do WMS: Alternator Valeo 140A (Audi A4 B8) na regał MAGDA 1",
        timestamp: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: "audit_2",
        userId: "staff_4",
        userName: "Anna E-commerce",
        action: "PUBLIKACJA_ALLEGRO",
        entityType: "PRODUCT",
        entityId: "part_1",
        changesSummary: "Utworzono i opublikowano ofertę Allegro REST API: #1749281923 (Cena: 280.00 PLN)",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "audit_3",
        userId: "staff_3",
        userName: "Piotr Magazynier",
        action: "KOREKTA_STANU",
        entityType: "INVENTORY",
        entityId: "part_3",
        changesSummary: "Przeniesiono część Lampę tylną LED z Plac A na Regał MAG 14 (Stan: 1 szt.)",
        timestamp: new Date(Date.now() - 1800000).toISOString(),
      },
    ];
    this.persist();
  }

  private persist() {
    try {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(this.logs.slice(0, MAX_AUDIT_COUNT)));
    } catch (e) {
      console.warn("Could not persist audit logs:", e);
    }
  }

  public record(params: {
    userId?: string;
    userName?: string;
    action: string;
    entityType: AuditLogEntry["entityType"];
    entityId: string;
    changesSummary: string;
  }): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: params.userId || "SYSTEM",
      userName: params.userName || "System Business OS",
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      changesSummary: params.changesSummary,
      timestamp: new Date().toISOString(),
    };

    this.logs.unshift(entry);
    if (this.logs.length > MAX_AUDIT_COUNT) {
      this.logs = this.logs.slice(0, MAX_AUDIT_COUNT);
    }
    this.persist();
    return entry;
  }

  public getLogs(filters?: { entityType?: string; search?: string }): AuditLogEntry[] {
    let result = this.logs;
    if (filters?.entityType) {
      result = result.filter((l) => l.entityType === filters.entityType);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (l) =>
          l.action.toLowerCase().includes(q) ||
          l.userName.toLowerCase().includes(q) ||
          l.changesSummary.toLowerCase().includes(q) ||
          l.entityId.toLowerCase().includes(q)
      );
    }
    return result;
  }
}

export const auditLogService = new AuditLogService();
