import imageCompression from "browser-image-compression";

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export type CompressPurpose = "product" | "logo";

/**
 * Compresses an image in the browser before upload.
 * Targets WebP with high visual quality and sensible max dimensions.
 */
export async function compressImageForUpload(
  file: File,
  purpose: CompressPurpose = "product",
  onProgress?: (progress: number) => void,
): Promise<File> {
  if (!ALLOWED.has(file.type)) {
    throw new Error("Only JPEG, PNG, WebP, and AVIF images are allowed.");
  }

  const options = {
    maxSizeMB: purpose === "logo" ? 0.4 : 1,
    maxWidthOrHeight: purpose === "logo" ? 1024 : 2048,
    useWebWorker: true,
    fileType: "image/webp" as const,
    initialQuality: 0.85,
    alwaysKeepResolution: false,
    onProgress,
  };

  const compressed = await imageCompression(file, options);
  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([compressed], `${baseName}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}
