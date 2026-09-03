import React, { useState } from "react";
import {
  Cloud,
  Server,
  Terminal,
  FileCode,
  Copy,
  Check,
  Download,
  ExternalLink,
  ShieldCheck,
  Cpu,
  Layers,
  Sparkles,
  Rocket,
  Globe,
  AlertCircle,
  X,
} from "lucide-react";

interface CloudRunDeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudRunDeploymentModal: React.FC<CloudRunDeploymentModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeSnippet, setActiveSnippet] = useState<"docker" | "cloudrun" | "commands" | "script">("commands");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const dockerfileContent = `# Stage 1: Build Frontend and Bundled Production Server
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
RUN npm ci

# Copy full application source code
COPY . .

# Run production build: Vite frontend build to /dist + esbuild server.ts to dist/server.cjs
RUN npm run build

# Stage 2: Minimal Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy compiled backend bundle and static frontend assets from builder
COPY --from=builder /app/dist ./dist

# Expose standard Cloud Run port 3000
EXPOSE 3000

# Container liveness healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start bundled CommonJS server
CMD ["node", "dist/server.cjs"]`;

  const cloudrunYamlContent = `apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: koneser-wms-beta
  labels:
    cloud.google.com/location: europe-west3
  annotations:
    run.googleapis.com/ingress: all
    run.googleapis.com/description: "OVOKO Fast Lister Pro & PHU U KONESERA WMS Production Beta on Google Cloud Run"
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "0"
        autoscaling.knative.dev/maxScale: "10"
        run.googleapis.com/startup-cpu-boost: "true"
        run.googleapis.com/cpu-throttling: "true"
    spec:
      containerConcurrency: 80
      timeoutSeconds: 300
      containers:
        - image: gcr.io/PROJECT_ID/koneser-wms-beta:latest
          ports:
            - name: http1
              containerPort: 3000
          resources:
            limits:
              cpu: "1"
              memory: "512Mi"
          env:
            - name: NODE_ENV
              value: "production"
            - name: PORT
              value: "3000"
            - name: APP_URL
              value: "https://koneser-wms-beta.ai.studio"
            - name: ALLEGRO_CLIENT_ID
              value: ""
            - name: ALLEGRO_CLIENT_SECRET
              value: ""
            - name: BASELINKER_TOKEN
              value: ""
            - name: SHOPGOLD_API_URL
              value: "https://sklep.kasacja24.com/api/v1"
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10`;

  const cliCommands = `# 1. Zbudowanie kontenera w Google Cloud Build
gcloud builds submit --tag gcr.io/TWOJ_PROJEKT_GCP/koneser-wms-beta:latest .

# 2. Wdrożenie na Google Cloud Run (Starter / Standard Tier)
gcloud run deploy koneser-wms-beta \\
  --image gcr.io/TWOJ_PROJEKT_GCP/koneser-wms-beta:latest \\
  --platform managed \\
  --region europe-west3 \\
  --allow-unauthenticated \\
  --port 3000 \\
  --memory 512Mi \\
  --cpu 1 \\
  --min-instances 0 \\
  --max-instances 10 \\
  --set-env-vars NODE_ENV=production,PORT=3000`;

  const downloadFile = (content: string, filename: string, type = "text/plain") => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0b1120] border border-cyan-500/40 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* HEADER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 border-b border-cyan-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl text-slate-950 shadow-md">
              <Cloud className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white font-mono tracking-tight">
                  Centrum Wdrożenia & Google Cloud Run BETA
                </h2>
                <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold rounded border border-cyan-500/40">
                  Ready for Deploy
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                OVOKO Fast Lister Pro & PHU U KONESERA WMS • Serwery Produkcyjne Google Cloud
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs font-mono">
          {/* CHECKLISTA STATUSU GOTOWOŚCI SYSTEMU */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-slate-900/90 border border-emerald-500/40 rounded-xl">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Backend Express</span>
              </div>
              <p className="text-[11px] text-slate-300">Port 3000, REST API, CORS & Bundled CJS</p>
            </div>

            <div className="p-3 bg-slate-900/90 border border-emerald-500/40 rounded-xl">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-1">
                <Layers className="w-4 h-4" />
                <span>Frontend Vite</span>
              </div>
              <p className="text-[11px] text-slate-300">Tailwind, React 19, PWA & Desktop WMS</p>
            </div>

            <div className="p-3 bg-slate-900/90 border border-emerald-500/40 rounded-xl">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-1">
                <Cpu className="w-4 h-4" />
                <span>AI Gemini Vision</span>
              </div>
              <p className="text-[11px] text-slate-300">Auto-wycena rynkowa i OCR części</p>
            </div>

            <div className="p-3 bg-slate-900/90 border border-emerald-500/40 rounded-xl">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-1">
                <Globe className="w-4 h-4" />
                <span>Allegro 29-CSV</span>
              </div>
              <p className="text-[11px] text-slate-300">Gotowy szablon importu masowego</p>
            </div>
          </div>

          {/* DWA SPOSOBY WDROŻENIA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* SPOSÓB 1: 1-KLIK W AI STUDIO */}
            <div className="p-4 bg-gradient-to-br from-slate-900 to-cyan-950/30 border border-cyan-500/40 rounded-xl space-y-2.5">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                <Rocket className="w-4 h-4 text-cyan-400" />
                <span>Sposób 1: 1-Klik z poziomu AI Studio (Zalecany)</span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                <li>Kliknij w menu <strong>Settings</strong> w prawym górnym rogu ekranu Google AI Studio.</li>
                <li>Wybierz opcję <strong>Deploy to Cloud Run</strong> lub <strong>Share</strong>.</li>
                <li>System Google automatycznie użyje przygotowanego <code className="bg-slate-950 px-1 py-0.5 rounded text-cyan-300">Dockerfile</code> i zbuduje usługę w regionie <em>europe-west3 (Frankfurt)</em>.</li>
                <li>Otrzymasz publiczny, bezpieczny adres HTTPS (np. <code className="bg-slate-950 px-1 py-0.5 rounded text-emerald-300">https://ais-pre-...run.app</code>).</li>
              </ol>
            </div>

            {/* SPOSÓB 2: GOOGLE CLOUD SDK / CLI */}
            <div className="p-4 bg-gradient-to-br from-slate-900 to-blue-950/30 border border-blue-500/40 rounded-xl space-y-2.5">
              <div className="flex items-center gap-2 text-blue-300 font-bold text-sm">
                <Terminal className="w-4 h-4 text-blue-400" />
                <span>Sposób 2: Google Cloud CLI / Cloud Shell</span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                <li>Otwórz Google Cloud Shell lub lokalny terminal z <code className="bg-slate-950 px-1 py-0.5 rounded text-blue-300">gcloud</code>.</li>
                <li>Uruchom komendę <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-300">bash deploy.sh</code> lub poniższe polecenia gcloud.</li>
                <li>Cloud Run uruchomi instancję kontenera z automatycznym skalowaniem (0-10 instancji, minimalne koszty w czasie braku ruchu).</li>
                <li>Skonfiguruj własną domenę firmową (np. <code className="bg-slate-950 px-1 py-0.5 rounded text-emerald-300">wms.ukonesera.pl</code>) w Cloud Run Domain Mappings.</li>
              </ol>
            </div>
          </div>

          {/* PRZEŁĄCZNIK SNIPPETÓW KODU */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveSnippet("commands")}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                    activeSnippet === "commands"
                      ? "bg-cyan-500 text-slate-950"
                      : "bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Komendy gcloud CLI</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSnippet("docker")}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                    activeSnippet === "docker"
                      ? "bg-cyan-500 text-slate-950"
                      : "bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Dockerfile</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSnippet("cloudrun")}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                    activeSnippet === "cloudrun"
                      ? "bg-cyan-500 text-slate-950"
                      : "bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>cloudrun.yaml</span>
                </button>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const content =
                      activeSnippet === "commands"
                        ? cliCommands
                        : activeSnippet === "docker"
                        ? dockerfileContent
                        : cloudrunYamlContent;
                    copyToClipboard(content, activeSnippet);
                  }}
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedKey === activeSnippet ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Skopiowano!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Kopiuj kod</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (activeSnippet === "docker") {
                      downloadFile(dockerfileContent, "Dockerfile");
                    } else if (activeSnippet === "cloudrun") {
                      downloadFile(cloudrunYamlContent, "cloudrun.yaml", "text/yaml");
                    } else {
                      downloadFile(cliCommands, "deploy-commands.sh");
                    }
                  }}
                  className="px-2.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Pobierz plik</span>
                </button>
              </div>
            </div>

            {/* KOD DO PODGLĄDU */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 overflow-x-auto text-[11px] text-cyan-200/90 leading-relaxed font-mono select-all">
              <pre>
                {activeSnippet === "commands" && cliCommands}
                {activeSnippet === "docker" && dockerfileContent}
                {activeSnippet === "cloudrun" && cloudrunYamlContent}
              </pre>
            </div>
          </div>

          {/* AKTUALNE ADRESY URL ŚRODOWISKA */}
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1.5">
            <span className="text-slate-400 font-bold text-[11px] block">
              Dostępne Adresy URL Systemu WMS:
            </span>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-300">
                <span>Podgląd Deweloperski (Cloud Run Preview):</span>
                <a
                  href="https://ais-dev-pwqwg5ifo2gpcumdt7jmb7-401945512229.europe-west3.run.app"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <span>ais-dev-pwqwg5ifo2gpcumdt7jmb7-401945512229.europe-west3.run.app</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-300">
                <span>Wersja BETA / Produkcyjna (Cloud Run Shared):</span>
                <a
                  href="https://ais-pre-pwqwg5ifo2gpcumdt7jmb7-401945512229.europe-west3.run.app"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 font-bold hover:underline flex items-center gap-1"
                >
                  <span>ais-pre-pwqwg5ifo2gpcumdt7jmb7-401945512229.europe-west3.run.app</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 font-mono">
            Pliki <code className="text-cyan-400">/Dockerfile</code> i <code className="text-cyan-400">/cloudrun.yaml</code> są już zapisane w projekcie.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer font-mono"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
