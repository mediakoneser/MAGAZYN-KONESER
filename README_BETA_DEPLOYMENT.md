# OVOKO Fast Lister Pro & PHU U KONESERA WMS — Wdrożenie Produkcyjne (BETA) na Google Cloud Run

System WMS, ewidencji magazynowej części samochodowych i stacji demontażu pojazdów dla **PHU U KONESERA Grzegorz Kuźma (Mysłakowice)** przygotowany do oficjalnego wdrożenia w chmurze **Google Cloud Platform (Cloud Run)**.

---

## 1. Architektura Systemu

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS (High-Density UI, PWA, kamery magazynowe, dyktafon mowy pl-PL, skaner kodów kreskowych, generator Allegro 29-CSV).
- **Backend:** Node.js 20 + Express (`server.ts`) skompilowany do `dist/server.cjs` (port 3000, 0.0.0.0, CORS, proxy Gemini Vision AI, REST API integracji Allegro, BaseLinker, ShopGold, OVOKO).
- **Konteneryzacja:** `Dockerfile` (Multi-stage Node 20 Alpine: build Vite + bundle Node.js esbuild).
- **Orkiestracja:** Google Cloud Run (Managed, autoscaling 0–10 instancji, minimalne koszty, HTTP/2, SSL HTTPS).

---

## 2. Dwa Sposoby Wdrożenia na Oficjalne Serwery Google

### Sposób A: Przez panel Google AI Studio (1-Klik)
1. W prawym górnym rogu ekranu Google AI Studio wejdź w menu **Settings** / **Share**.
2. Wybierz opcję **Deploy to Cloud Run**.
3. Wybierz swój projekt Google Cloud i region (rekomendowany: `europe-west3` Frankfurt).
4. System automatycznie wykorzysta przygotowany plik `Dockerfile`, zbuduje obraz i opublikuje publiczny adres HTTPS.

### Sposób B: Za pomocą Google Cloud SDK / Cloud Shell
1. Zaloguj się do Google Cloud Shell lub otwórz terminal z zainstalowanym `gcloud`:
   ```bash
   gcloud auth login
   gcloud config set project TWOJ_PROJEKT_GCP
   ```
2. Uruchom przygotowany skrypt wdrożeniowy:
   ```bash
   bash deploy.sh
   ```
   LUB wykonaj komendy krok po kroku:
   ```bash
   # Krok 1: Budowanie obrazu w Google Cloud Build
   gcloud builds submit --tag gcr.io/TWOJ_PROJEKT_GCP/koneser-wms-beta:latest .

   # Krok 2: Uruchomienie na Cloud Run
   gcloud run deploy koneser-wms-beta \
     --image gcr.io/TWOJ_PROJEKT_GCP/koneser-wms-beta:latest \
     --platform managed \
     --region europe-west3 \
     --allow-unauthenticated \
     --port 3000 \
     --memory 512Mi \
     --cpu 1 \
     --min-instances 0 \
     --max-instances 10 \
     --set-env-vars NODE_ENV=production,PORT=3000
   ```

---

## 3. Zmienne Środowiskowe (.env)

Skonfiguruj zmienne w Cloud Run (Variables & Secrets):
- `GEMINI_API_KEY`: Klucz Google Gemini API (dla rozpoznawania części ze zdjęć, wyceny rynkowej i infolinii).
- `APP_URL`: Oficjalny adres URL aplikacji w wersji BETA.
- `ALLEGRO_CLIENT_ID` / `ALLEGRO_CLIENT_SECRET`: Klucze aplikacji Allegro REST API.
- `BASELINKER_TOKEN`: Token API integracji BaseLinkera.
- `SHOPGOLD_API_URL` / `SHOPGOLD_API_KEY`: Adres i klucz sklepu `sklep.kasacja24.com`.

---

## 4. Testy i Walidacja Wersji BETA dla Operatorów Stacji
Po wdrożeniu sprawdź poprawność modułów:
1. **Healthcheck:** `GET /api/health` oraz `GET /health` (zwracają kod 200 i status ok).
2. **Skaner AI:** Zrób zdjęcie tabliczki znamionowej lub części — sprawdź czy silnik AI odczyta numer OE i zaproponuje ceny z Allegro.
3. **Kolejka Allegro CSV:** Zeskanuj część, kliknij *Dodaj do Kolejki CSV*, a następnie *Pobierz plik Allegro .CSV* i sprawdź czy zawiera 29 kolumn.
4. **Magazyn WMS & Regały:** Sprawdź czy kody kreskowe `PART-XXXXXX` oraz lokalizacje `MAG 14`, `R-04-B2` synchronizują się poprawnie.
