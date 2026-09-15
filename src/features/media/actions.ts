"use server";

import { getServices } from "@/infrastructure/container";
import { toUserMessage } from "@/domain/errors";

export type UploadImageKind = "product" | "logo" | "cover" | "category";

export async function uploadImageAction(
  storeId: string,
  kind: UploadImageKind,
  formData: FormData,
): Promise<{ ok: true; url: string; path: string } | { ok: false; error: string }> {
  try {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "No image file provided." };
    }

    const previousUrl = String(formData.get("previousUrl") ?? "").trim() || null;

    const payload = {
      name: file.name || "image.webp",
      type: file.type || "image/webp",
      size: file.size,
      data: Buffer.from(await file.arrayBuffer()),
    };

    const services = getServices();
    const uploaded =
      kind === "product"
        ? await services.media.uploadProductImage(storeId, payload)
        : await services.media.uploadStoreAsset(
            storeId,
            kind === "category" ? "category" : kind === "cover" ? "cover" : "logo",
            payload,
            { previousUrl },
          );

    return { ok: true, url: uploaded.url, path: uploaded.path };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}

/** Delete a store-owned media object by its public URL (logo/cover cleanup). */
export async function deleteOwnedImageAction(
  storeId: string,
  publicUrl: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await getServices().media.deleteClearedAssetUrl(storeId, publicUrl);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}
