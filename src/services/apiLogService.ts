/**
 * Central API Logging Service — Business OS v1
 * 
 * Rules:
 * 1. Strict secret masking (Client Secret, Bearer Tokens, Refresh Tokens, Passwords).
 * 2. Correlation ID tagging across requests and lifecycle stages.
 * 3. Thread-safe log collection and in-memory/local buffer.
 */

import { ApiLogEntry } from "../types/businessCore";

const API_LOGS_STORAGE_KEY = "business_os_api_logs_v1";
const MAX_LOGS_COUNT = 250;

function generateCorrelationId(): string {
  const dateStr = new Date().getFullYear().toString();
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  return `BUS-${dateStr}-${randomSuffix}`;
}

function maskSensitiveData(input: string | object | undefined): string | undefined {
  if (!input) return undefined;
  let str = typeof input === "string" ? input : JSON.stringify(input);

  // Mask Bearer tokens
  str = str.replace(/Bearer\s+[A-Za-z0-9-_.]+/gi, "Bearer [MASKED_TOKEN]");
  // Mask client_secret
  str = str.replace(/("?client_?secret"?\s*:\s*)"[^"]+"/gi, '$1"[MASKED_SECRET]"');
  // Mask refresh_token
  str = str.replace(/("?refresh_?token"?\s*:\s*)"[^"]+"/gi, '$1"[MASKED_REFRESH_TOKEN]"');
  // Mask api_key / token
  str = str.replace(/("?apiKey"?\s*:\s*)"[^"]+"/gi, '$1"[MASKED_API_KEY]"');
  str = str.replace(/("?password"?\s*:\s*)"[^"]+"/gi, '$1"[MASKED_PASSWORD]"');

  if (str.length > 1500) {
    return str.substring(0, 1500) + "... [truncated]";
  }
  return str;
}

class ApiLogService {
  private logs: ApiLogEntry[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(API_LOGS_STORAGE_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Could not load API logs from storage:", e);
    }
  }

  private persist() {
    try {
      localStorage.setItem(API_LOGS_STORAGE_KEY, JSON.stringify(this.logs.slice(0, MAX_LOGS_COUNT)));
    } catch (e) {
      console.warn("Could not persist API logs:", e);
    }
  }

  public recordLog(params: {
    integration: string;
    endpoint: string;
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    httpStatus: number;
    durationMs: number;
    correlationId?: string;
    errorSummary?: string;
    requestPayload?: any;
    responsePayload?: any;
    triggeredBy?: string;
  }): ApiLogEntry {
    const correlationId = params.correlationId || generateCorrelationId();
    const status: "SUCCESS" | "WARNING" | "ERROR" =
      params.httpStatus >= 200 && params.httpStatus < 300
        ? "SUCCESS"
        : params.httpStatus >= 300 && params.httpStatus < 400
        ? "WARNING"
        : "ERROR";

    const entry: ApiLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      correlationId,
      integration: params.integration,
      endpoint: params.endpoint,
      method: params.method,
      httpStatus: params.httpStatus,
      durationMs: Math.round(params.durationMs),
      status,
      errorSummary: params.errorSummary,
      requestPayloadSnippet: maskSensitiveData(params.requestPayload),
      responsePayloadSnippet: maskSensitiveData(params.responsePayload),
      triggeredBy: params.triggeredBy || "SYSTEM_WORKER",
      timestamp: new Date().toISOString(),
    };

    this.logs.unshift(entry);
    if (this.logs.length > MAX_LOGS_COUNT) {
      this.logs = this.logs.slice(0, MAX_LOGS_COUNT);
    }
    this.persist();

    // Broadcast event for live UI listeners
    window.dispatchEvent(new CustomEvent("business_os_new_api_log", { detail: entry }));

    return entry;
  }

  public getLogs(filters?: {
    integration?: string;
    status?: "SUCCESS" | "WARNING" | "ERROR";
    correlationId?: string;
    search?: string;
  }): ApiLogEntry[] {
    let result = this.logs;
    if (filters?.integration) {
      result = result.filter((l) => l.integration.toLowerCase() === filters.integration?.toLowerCase());
    }
    if (filters?.status) {
      result = result.filter((l) => l.status === filters.status);
    }
    if (filters?.correlationId) {
      result = result.filter((l) => l.correlationId.includes(filters.correlationId!));
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (l) =>
          l.endpoint.toLowerCase().includes(q) ||
          l.correlationId.toLowerCase().includes(q) ||
          l.integration.toLowerCase().includes(q) ||
          (l.errorSummary && l.errorSummary.toLowerCase().includes(q))
      );
    }
    return result;
  }

  public clearLogs() {
    this.logs = [];
    this.persist();
  }
}

export const apiLogService = new ApiLogService();
export { generateCorrelationId };
