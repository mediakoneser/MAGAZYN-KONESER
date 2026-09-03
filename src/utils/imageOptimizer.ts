/**
 * Image compressor & optimizer to avoid localStorage quota limits
 * and speed up Gemini Vision multimodal analysis.
 */

export async function compressImageFile(
  file: File | Blob | string,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve) => {
    // If it's already a string
    if (typeof file === "string") {
      processDataUrlOrHttp(file);
      return;
    }

    if (!file || file.size === 0) {
      resolve("");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) {
        resolve("");
        return;
      }
      processDataUrlOrHttp(src);
    };

    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);

    function processDataUrlOrHttp(src: string) {
      if (!src || src.trim().length === 0) {
        resolve("");
        return;
      }

      const img = new Image();
      if (src.startsWith("http://") || src.startsWith("https://")) {
        img.crossOrigin = "anonymous";
      }

      img.onload = () => {
        const origWidth = img.naturalWidth || img.width;
        const origHeight = img.naturalHeight || img.height;

        if (!origWidth || !origHeight) {
          resolve(src);
          return;
        }

        // Exact proportional scale calculation without distortion
        const scale = Math.min(maxWidth / origWidth, maxHeight / origHeight, 1);
        const width = Math.max(1, Math.round(origWidth * scale));
        const height = Math.max(1, Math.round(origHeight * scale));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve(src);
          return;
        }

        // Fill solid white background so transparent screenshots/PNGs don't artifact or produce black background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        // High quality smooth scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Compress as image/jpeg
        try {
          const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(compressedDataUrl || src);
        } catch {
          // If canvas was tainted or toDataURL failed, fallback to original
          resolve(src);
        }
      };

      img.onerror = () => {
        // If image failed to load with crossOrigin, return src directly
        resolve(src);
      };

      img.src = src;
    }
  });
}

/**
 * Robust extractor for all types of images pasted into the browser clipboard:
 * 1. Screenshots / pasted File objects (Snipping Tool, PrintScreen)
 * 2. Clipboard items with image/png or image/jpeg
 * 3. Copied image links / text URLs (e.g. from Allegro, Otomoto, Google)
 * 4. Copied HTML content containing <img> tags
 */
export async function extractImagesFromClipboardEvent(e: ClipboardEvent): Promise<string[]> {
  const extractedFilesOrUrls: (File | Blob | string)[] = [];

  if (!e.clipboardData) return [];

  // 1. Check direct files (common in Chrome, Edge, desktop screenshot tools)
  if (e.clipboardData.files && e.clipboardData.files.length > 0) {
    for (let i = 0; i < e.clipboardData.files.length; i++) {
      const file = e.clipboardData.files[i];
      if (file.type.startsWith("image/") || file.size > 0) {
        extractedFilesOrUrls.push(file);
      }
    }
  }

  // 2. Check items for image blobs (Blob/File)
  if (e.clipboardData.items && e.clipboardData.items.length > 0) {
    for (let i = 0; i < e.clipboardData.items.length; i++) {
      const item = e.clipboardData.items[i];
      if (item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (file && !extractedFilesOrUrls.some((f) => f instanceof File && f.name === file.name && f.size === file.size)) {
          extractedFilesOrUrls.push(file);
        }
      }
    }
  }

  // 3. Check HTML content (e.g. copied from website, browser gallery, or email)
  try {
    const html = e.clipboardData.getData("text/html");
    if (html) {
      const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/gi);
      if (imgMatch) {
        for (const tag of imgMatch) {
          const srcMatch = tag.match(/src=["']([^"']+)["']/i);
          if (srcMatch && srcMatch[1]) {
            const url = srcMatch[1];
            if (url.startsWith("http") || url.startsWith("data:image/")) {
              if (!extractedFilesOrUrls.includes(url)) {
                extractedFilesOrUrls.push(url);
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn("Clipboard HTML parsing error:", err);
  }

  // 4. Check plain text (if user copied a direct image link or data URL)
  try {
    const text = e.clipboardData.getData("text/plain")?.trim();
    if (text) {
      const isImageUrl =
        text.startsWith("data:image/") ||
        /^(https?:\/\/[^\s]+?\.(jpg|jpeg|png|webp|avif|gif)(\?[^\s]*)?)$/i.test(text) ||
        (text.startsWith("http") && (text.includes("allegroimg") || text.includes("otomoto") || text.includes("unsplash") || text.includes("imgur")));

      if (isImageUrl && !extractedFilesOrUrls.includes(text)) {
        extractedFilesOrUrls.push(text);
      }
    }
  } catch (err) {
    console.warn("Clipboard text parsing error:", err);
  }

  if (extractedFilesOrUrls.length === 0) {
    return [];
  }

  // Compress all extracted images to clean base64 data URLs
  const results: string[] = [];
  for (const item of extractedFilesOrUrls) {
    try {
      const compressed = await compressImageFile(item, 1200, 1200, 0.85);
      if (compressed && compressed.length > 20) {
        results.push(compressed);
      }
    } catch (err) {
      console.warn("Failed to process clipboard image item:", err);
    }
  }

  return results;
}

