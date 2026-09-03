#!/usr/bin/env bash
# ==============================================================================
# Skrypt Wdrożenia OVOKO Fast Lister Pro & PHU U KONESERA WMS na Google Cloud Run
# ==============================================================================
set -e

# Konfiguracja projektu
PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-"twoj-projekt-gcp"}
REGION=${GCP_REGION:-"europe-west3"}
SERVICE_NAME="koneser-wms-beta"
IMAGE_TAG="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"

echo "=========================================================="
echo " Budowanie i wdrażanie WMS PHU U KONESERA na Cloud Run..."
echo " Projekt GCP: ${PROJECT_ID}"
echo " Region:     ${REGION}"
echo " Usługa:     ${SERVICE_NAME}"
echo " Obraz:      ${IMAGE_TAG}"
echo "=========================================================="

# 1. Zbudowanie obrazu w Google Cloud Build
echo "--> 1. Budowanie kontenera przez Cloud Build..."
gcloud builds submit --tag "${IMAGE_TAG}" .

# 2. Wdrożenie na Google Cloud Run
echo "--> 2. Wdrażanie usługi na Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE_TAG}" \
  --platform managed \
  --region "${REGION}" \
  --allow-unauthenticated \
  --port 3000 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars NODE_ENV=production,PORT=3000

echo ""
echo " Wdrożenie zakończone sukcesem!"
echo " Publiczny URL BETA Twojego WMS:"
gcloud run services describe "${SERVICE_NAME}" --platform managed --region "${REGION}" --format 'value(status.url)'
