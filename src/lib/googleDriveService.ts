// Google Drive Service for PHU U Konesera WMS
// Interacts with Google Drive API v3 using user OAuth access token
import { PartItem, PartListingData } from "../types";
import { generateAuctionPdfBlob, sanitizeTextForPdf } from "../utils/auctionPdfGenerator";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  parents?: string[];
  owners?: Array<{
    displayName: string;
    emailAddress: string;
    photoLink?: string;
  }>;
}

export interface DriveAboutInfo {
  user: {
    displayName: string;
    emailAddress: string;
    photoLink?: string;
  };
  storageQuota?: {
    limit?: string;
    usage?: string;
    usageInDrive?: string;
    usageInDriveTrash?: string;
  };
}

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";

/**
 * Fetch information about the authenticated user and Drive quota
 */
export async function getDriveAbout(accessToken: string): Promise<DriveAboutInfo> {
  const response = await fetch(
    `${DRIVE_API_BASE}/about?fields=user(displayName,emailAddress,photoLink),storageQuota`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Błąd pobierania danych Dysku (${response.status})`);
  }

  return response.json();
}

/**
 * List files and folders in Google Drive
 */
export async function listDriveFiles(
  accessToken: string,
  options: {
    folderId?: string;
    searchQuery?: string;
    pageSize?: number;
    mimeTypeFilter?: string;
  } = {}
): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
  const { folderId, searchQuery, pageSize = 50, mimeTypeFilter } = options;

  const queryParts: string[] = ["trashed = false"];

  if (searchQuery && searchQuery.trim()) {
    const escaped = searchQuery.replace(/'/g, "\\'");
    queryParts.push(`name contains '${escaped}'`);
  } else if (folderId) {
    queryParts.push(`'${folderId}' in parents`);
  }

  if (mimeTypeFilter) {
    if (mimeTypeFilter === "folder") {
      queryParts.push(`mimeType = 'application/vnd.google-apps.folder'`);
    } else if (mimeTypeFilter === "image") {
      queryParts.push(`mimeType contains 'image/'`);
    } else if (mimeTypeFilter === "json") {
      queryParts.push(`mimeType = 'application/json'`);
    } else if (mimeTypeFilter === "csv") {
      queryParts.push(`(mimeType = 'text/csv' or name contains '.csv')`);
    }
  }

  const q = queryParts.join(" and ");

  const params = new URLSearchParams({
    q,
    pageSize: String(pageSize),
    fields: "nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,thumbnailLink,iconLink,parents,owners)",
    orderBy: "folder,modifiedTime desc",
  });

  const response = await fetch(`${DRIVE_API_BASE}/files?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Błąd odczytu plików z Google Drive (${response.status})`);
  }

  return response.json();
}

/**
 * Create a folder in Google Drive
 */
export async function createDriveFolder(
  accessToken: string,
  folderName: string,
  parentId?: string
): Promise<DriveFile> {
  const metadata: any = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
  };

  if (parentId) {
    metadata.parents = [parentId];
  }

  const response = await fetch(`${DRIVE_API_BASE}/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Nie udało się utworzyć folderu (${response.status})`);
  }

  return response.json();
}

/**
 * Upload a file to Google Drive using multipart upload
 */
export async function uploadFileToDrive(
  accessToken: string,
  params: {
    name: string;
    mimeType: string;
    content: Blob | string;
    parentId?: string;
  }
): Promise<DriveFile> {
  const { name, mimeType, content, parentId } = params;

  const metadata: any = {
    name,
    mimeType,
  };

  if (parentId) {
    metadata.parents = [parentId];
  }

  const boundary = `-------boundary_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const blobContent =
    typeof content === "string" ? new Blob([content], { type: mimeType }) : content;

  // Build multipart body
  const metadataPart =
    delimiter +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n`;

  const combinedBlob = new Blob([metadataPart, blobContent, closeDelimiter], {
    type: `multipart/related; boundary=${boundary}`,
  });

  const response = await fetch(
    `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,modifiedTime,webViewLink`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: combinedBlob,
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Błąd wgrywania pliku do Dysku Google (${response.status})`);
  }

  return response.json();
}

/**
 * Delete a file or folder from Google Drive
 * NOTE: User confirmation MUST be obtained before calling this function!
 */
export async function deleteDriveFile(
  accessToken: string,
  fileId: string
): Promise<void> {
  const response = await fetch(`${DRIVE_API_BASE}/files/${fileId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 204) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Błąd usuwania pliku (${response.status})`);
  }
}

/**
 * Helper: Find or create standard root folder "PHU U Konesera - Magazyn WMS"
 */
export async function ensureWmsFolder(accessToken: string): Promise<string> {
  const folderName = "PHU U Konesera - Magazyn WMS";
  try {
    const list = await listDriveFiles(accessToken, {
      searchQuery: folderName,
      mimeTypeFilter: "folder",
    });

    const existing = list.files.find((f) => f.name === folderName);
    if (existing) {
      return existing.id;
    }

    const created = await createDriveFolder(accessToken, folderName);
    return created.id;
  } catch (err) {
    console.warn("Could not ensure WMS folder, defaulting to root Drive:", err);
    return "root";
  }
}

/**
 * Backup full parts inventory JSON to Google Drive
 */
export async function backupCatalogToDrive(
  accessToken: string,
  parts: any[],
  folderId?: string
): Promise<DriveFile> {
  const targetFolderId = folderId || (await ensureWmsFolder(accessToken));
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `Kopia_Zapasowa_WMS_UKonesera_${timestamp}.json`;

  const payload = JSON.stringify(
    {
      app: "PHU U Konesera - Wystawka AI",
      exportedAt: new Date().toISOString(),
      totalItems: parts.length,
      parts,
    },
    null,
    2
  );

  return uploadFileToDrive(accessToken, {
    name: filename,
    mimeType: "application/json",
    content: payload,
    parentId: targetFolderId,
  });
}

/**
 * Save CSV export to Google Drive
 */
export async function exportCsvToDrive(
  accessToken: string,
  csvContent: string,
  fileName: string,
  folderId?: string
): Promise<DriveFile> {
  const targetFolderId = folderId || (await ensureWmsFolder(accessToken));
  return uploadFileToDrive(accessToken, {
    name: fileName,
    mimeType: "text/csv",
    content: csvContent,
    parentId: targetFolderId,
  });
}

/**
 * Format bytes into human readable format
 */
export function formatBytes(bytes?: string | number): string {
  if (!bytes) return "—";
  const num = typeof bytes === "string" ? parseInt(bytes, 10) : bytes;
  if (isNaN(num) || num === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(num) / Math.log(k));
  return parseFloat((num / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/**
 * Ensures a nested folder hierarchy exists on Google Drive, e.g. ["Parts", "Inventory", "2026-09-03"].
 * Starts from root (or optional starting parentId).
 * Traverses/creates each folder segment sequentially.
 */
export async function ensureNestedFolderStructure(
  accessToken: string,
  pathSegments: string[],
  rootFolderId: string = "root"
): Promise<{ folderId: string; folderPath: string }> {
  let currentParentId = rootFolderId;
  const createdSegments: string[] = [];

  for (const segment of pathSegments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    createdSegments.push(trimmed);

    // Check if this segment folder already exists under currentParentId
    const query = `'${currentParentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '${trimmed.replace(/'/g, "\\'")}' and trashed = false`;
    const params = new URLSearchParams({
      q: query,
      fields: "files(id, name)",
      pageSize: "10",
    });

    const res = await fetch(`${DRIVE_API_BASE}/files?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    let foundId: string | null = null;
    if (res.ok) {
      const data = await res.json();
      if (data.files && data.files.length > 0) {
        foundId = data.files[0].id;
      }
    }

    if (foundId) {
      currentParentId = foundId;
    } else {
      // Create folder
      const newFolder = await createDriveFolder(accessToken, trimmed, currentParentId);
      currentParentId = newFolder.id;
    }
  }

  const folderPath = "/" + createdSegments.join("/");
  return { folderId: currentParentId, folderPath };
}

/**
 * Ensures the date-based parts folder structure: /Parts/Inventory/YYYY-MM-DD
 */
export async function ensurePartsInventoryDateFolder(
  accessToken: string,
  dateStr?: string
): Promise<{ folderId: string; folderPath: string }> {
  const dateSegment = dateStr || new Date().toISOString().slice(0, 10);
  return ensureNestedFolderStructure(accessToken, ["Parts", "Inventory", dateSegment]);
}

/**
 * Auto-Sync Setting LocalStorage Helper
 */
const DRIVE_AUTO_SYNC_KEY = "ukonesera_drive_auto_pdf_sync";

export function isDriveAutoSyncEnabled(): boolean {
  try {
    const val = localStorage.getItem(DRIVE_AUTO_SYNC_KEY);
    // Enabled by default
    return val === null ? true : val === "true";
  } catch {
    return true;
  }
}

export function setDriveAutoSyncEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(DRIVE_AUTO_SYNC_KEY, String(enabled));
  } catch {}
}

/**
 * Automatically uploads an auction template PDF to /Parts/Inventory/YYYY-MM-DD on Google Drive.
 */
export async function uploadAuctionPdfToDrive(
  accessToken: string,
  part: PartItem | { id: string; currentRackLocation?: string; listingData: PartListingData },
  customDate?: string
): Promise<{ file: DriveFile; folderPath: string; folderId: string }> {
  const dateStr = customDate || new Date().toISOString().slice(0, 10);

  // 1. Ensure folder hierarchy /Parts/Inventory/YYYY-MM-DD exists
  const { folderId, folderPath } = await ensurePartsInventoryDateFolder(accessToken, dateStr);

  // 2. Generate PDF blob
  const pdfBlob = await generateAuctionPdfBlob(part);

  // 3. Build sanitized file name
  const d = part.listingData;
  const oemClean = sanitizeTextForPdf(d.numery_czesci || part.currentRackLocation || part.id).replace(/[^a-zA-Z0-9_-]/g, "_");
  const markaClean = sanitizeTextForPdf(d.samochod?.marka || d.marka || "Auto").replace(/[^a-zA-Z0-9_-]/g, "_");
  const katClean = sanitizeTextForPdf(d.kategoria || "Czesc").replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `Szablon_Aukcji_${oemClean}_${markaClean}_${katClean}.pdf`;

  // 4. Upload to Google Drive date folder
  const uploadedFile = await uploadFileToDrive(accessToken, {
    name: fileName,
    mimeType: "application/pdf",
    content: pdfBlob,
    parentId: folderId,
  });

  return {
    file: uploadedFile,
    folderPath,
    folderId,
  };
}

/**
 * Batch upload auction PDFs for parts that do not have drivePdfUrl yet
 */
export async function syncMissingAuctionPdfsToDrive(
  accessToken: string,
  parts: PartItem[],
  onProgress?: (current: number, total: number, fileName: string) => void
): Promise<{ successCount: number; errors: string[] }> {
  const { folderId, folderPath } = await ensurePartsInventoryDateFolder(accessToken);
  const errors: string[] = [];
  let successCount = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const d = part.listingData;
    const oemClean = sanitizeTextForPdf(d.numery_czesci || part.currentRackLocation || part.id).replace(/[^a-zA-Z0-9_-]/g, "_");
    const markaClean = sanitizeTextForPdf(d.samochod?.marka || d.marka || "Auto").replace(/[^a-zA-Z0-9_-]/g, "_");
    const katClean = sanitizeTextForPdf(d.kategoria || "Czesc").replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `Szablon_Aukcji_${oemClean}_${markaClean}_${katClean}.pdf`;

    if (onProgress) {
      onProgress(i + 1, parts.length, fileName);
    }

    try {
      const pdfBlob = await generateAuctionPdfBlob(part);
      await uploadFileToDrive(accessToken, {
        name: fileName,
        mimeType: "application/pdf",
        content: pdfBlob,
        parentId: folderId,
      });
      successCount++;
    } catch (err: any) {
      errors.push(`Błąd przy części ${part.id} (${fileName}): ${err.message}`);
    }
  }

  return { successCount, errors };
}

