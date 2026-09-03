/**
 * Job Queue Engine — Business OS v1
 * 
 * Flow:
 * QUEUED -> PROCESSING -> SUCCESS
 *   or:
 * PROCESSING -> FAILED -> RETRY -> SUCCESS/FAILED
 */

import { generateCorrelationId } from "./apiLogService";

export type JobStatus = "QUEUED" | "PROCESSING" | "SUCCESS" | "FAILED" | "RETRY" | "CANCELLED";

export interface BusinessJob {
  id: string;
  type: 
    | "ALLEGRO_OFFER_SYNC" 
    | "OVOKO_STOCK_SYNC" 
    | "SHOPGOLD_CATALOG_SYNC" 
    | "NIP_VERIFICATION_BATCH" 
    | "CSV_NORMALIZATION" 
    | "INVENTORY_HEALTH_AUDIT";
  title: string;
  correlationId: string;
  status: JobStatus;
  targetSystem: string;
  attempts: number;
  maxAttempts: number;
  payload?: any;
  result?: any;
  error?: string;
  logs: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

const JOBS_STORAGE_KEY = "business_os_jobs_v1";

class JobQueueService {
  private jobs: BusinessJob[] = [];
  private isProcessing = false;

  constructor() {
    this.loadFromStorage();
    // Start background processor loop
    if (typeof window !== "undefined") {
      setInterval(() => this.processNextJob(), 3000);
    }
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(JOBS_STORAGE_KEY);
      if (stored) {
        this.jobs = JSON.parse(stored);
      } else {
        // Seed with realistic demo jobs
        this.seedInitialJobs();
      }
    } catch (e) {
      this.seedInitialJobs();
    }
  }

  private seedInitialJobs() {
    this.jobs = [
      {
        id: "job_01",
        type: "ALLEGRO_OFFER_SYNC",
        title: "Weryfikacja publikacji ofert Allegro REST API",
        correlationId: "BUS-2026-881290",
        status: "SUCCESS",
        targetSystem: "allegro",
        attempts: 1,
        maxAttempts: 3,
        logs: [
          "[14:20:01] Rozpoczęto weryfikację 14 ofert aktywnych...",
          "[14:20:04] Pobrano statusy z GET /sale/offers",
          "[14:20:06] Synchronizacja zakończona pomyślnie. Wszystkie oferty aktywne.",
        ],
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 3540000).toISOString(),
        completedAt: new Date(Date.now() - 3540000).toISOString(),
      },
      {
        id: "job_02",
        type: "OVOKO_STOCK_SYNC",
        title: "Automatyczna synchronizacja stanów magazynowych Ovoko / RRR",
        correlationId: "BUS-2026-881291",
        status: "SUCCESS",
        targetSystem: "ovoko",
        attempts: 1,
        maxAttempts: 3,
        logs: [
          "[14:21:00] Analiza stanów magazynowych WMS...",
          "[14:21:02] Wysłano aktualizację 28 części do feedu Ovoko",
          "[14:21:05] Odpowiedź HTTP 200 OK. Feed zaktualizowany.",
        ],
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        updatedAt: new Date(Date.now() - 1750000).toISOString(),
        completedAt: new Date(Date.now() - 1750000).toISOString(),
      },
    ];
    this.persist();
  }

  private persist() {
    try {
      localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(this.jobs.slice(0, 100)));
    } catch (e) {
      console.warn("Could not persist jobs:", e);
    }
  }

  public getJobs(): BusinessJob[] {
    return [...this.jobs];
  }

  public enqueueJob(params: {
    type: BusinessJob["type"];
    title: string;
    targetSystem: string;
    payload?: any;
    maxAttempts?: number;
    correlationId?: string;
  }): BusinessJob {
    const job: BusinessJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: params.type,
      title: params.title,
      correlationId: params.correlationId || generateCorrelationId(),
      status: "QUEUED",
      targetSystem: params.targetSystem,
      attempts: 0,
      maxAttempts: params.maxAttempts || 3,
      payload: params.payload,
      logs: [`[${new Date().toLocaleTimeString()}] Zadanie dodane do kolejki.`],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.jobs.unshift(job);
    this.persist();
    this.triggerProcessing();
    return job;
  }

  public retryJob(jobId: string): boolean {
    const job = this.jobs.find((j) => j.id === jobId);
    if (!job) return false;

    job.status = "QUEUED";
    job.attempts = 0;
    job.error = undefined;
    job.updatedAt = new Date().toISOString();
    job.logs.push(`[${new Date().toLocaleTimeString()}] Uruchomiono ponowną próbę (Manual Retry).`);
    this.persist();
    this.triggerProcessing();
    return true;
  }

  public cancelJob(jobId: string): boolean {
    const job = this.jobs.find((j) => j.id === jobId);
    if (!job) return false;

    job.status = "CANCELLED";
    job.updatedAt = new Date().toISOString();
    job.logs.push(`[${new Date().toLocaleTimeString()}] Zadanie anulowane przez użytkownika.`);
    this.persist();
    return true;
  }

  private triggerProcessing() {
    setTimeout(() => this.processNextJob(), 500);
  }

  private async processNextJob() {
    if (this.isProcessing) return;
    const queuedJob = this.jobs.find((j) => j.status === "QUEUED");
    if (!queuedJob) return;

    this.isProcessing = true;
    queuedJob.status = "PROCESSING";
    queuedJob.attempts += 1;
    queuedJob.updatedAt = new Date().toISOString();
    queuedJob.logs.push(`[${new Date().toLocaleTimeString()}] Przetwarzanie próby #${queuedJob.attempts}...`);
    this.persist();

    // Simulated task execution with realistic latency
    try {
      await new Promise((resolve) => setTimeout(resolve, 1800));

      queuedJob.status = "SUCCESS";
      queuedJob.completedAt = new Date().toISOString();
      queuedJob.updatedAt = new Date().toISOString();
      queuedJob.logs.push(`[${new Date().toLocaleTimeString()}] Zadanie zakończone z sukcesem.`);
    } catch (err: any) {
      if (queuedJob.attempts < queuedJob.maxAttempts) {
        queuedJob.status = "RETRY";
        queuedJob.logs.push(`[${new Date().toLocaleTimeString()}] Błąd wykonania: ${err.message || "Błąd sieci"}. Zaplanowano RETRY.`);
      } else {
        queuedJob.status = "FAILED";
        queuedJob.error = err.message || "Przekroczono limit prób wykonania.";
        queuedJob.logs.push(`[${new Date().toLocaleTimeString()}] Krytyczny błąd: zadanie FAILED.`);
      }
    } finally {
      this.isProcessing = false;
      this.persist();
    }
  }
}

export const jobQueueService = new JobQueueService();
