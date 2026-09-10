import type {
  StorageProvider,
  UploadedObject,
  UploadObjectInput,
} from "@/application/ports/providers";
import { AppError } from "@/domain/errors";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

const BUCKET = "store-media";

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "image.webp";
}

async function toBlob(
  data: ArrayBuffer | Buffer | Blob,
  contentType: string,
): Promise<Blob> {
  if (data instanceof Blob) return data;
  const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
  return new Blob([new Uint8Array(bytes)], { type: contentType });
}

export class SupabaseStorageProvider implements StorageProvider {
  getPublicUrl(path: string): string {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
    return `${url}/storage/v1/object/public/${BUCKET}/${path}`;
  }

  async upload(input: UploadObjectInput): Promise<UploadedObject> {
    const supabase = await createSupabaseServerClient();
    const safeName = sanitizeFileName(input.fileName);
    const path = `stores/${input.storeId}/${input.folder}/${Date.now()}-${safeName}`;
    const body = await toBlob(input.data, input.contentType);

    const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
      contentType: input.contentType,
      upsert: false,
      cacheControl: "31536000",
    });

    if (error) {
      throw new AppError("VALIDATION", error.message);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(path);

    return {
      path,
      url: publicUrl,
      contentType: input.contentType,
      size: body.size,
    };
  }

  async delete(path: string): Promise<void> {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) {
      throw new AppError("VALIDATION", error.message);
    }
  }
}
