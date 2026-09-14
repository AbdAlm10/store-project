import { AppError } from "@/domain/errors";
import { assertCanManageStore, assertStoreActive } from "@/domain/rules/store-rules";
import type { StorageProvider, UploadedObject } from "@/application/ports/providers";
import type {
  StoreMemberRepository,
  StoreRepository,
} from "@/application/ports/repositories";
import type { Store } from "@/domain/types/entities";
import type { AuthService } from "./auth-service";
import type { EntitlementService } from "./entitlement-service";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const MAX_BYTES = 5 * 1024 * 1024;
const STORAGE_BUCKET = "store-media";

export class MediaService {
  constructor(
    private readonly auth: AuthService,
    private readonly stores: StoreRepository,
    private readonly members: StoreMemberRepository,
    private readonly storage: StorageProvider,
    private readonly entitlements: EntitlementService,
  ) {}

  async uploadProductImage(
    storeId: string,
    file: {
      name: string;
      type: string;
      size: number;
      data: ArrayBuffer | Buffer | Blob;
    },
  ): Promise<UploadedObject> {
    await this.authorizeUpload(storeId);
    this.validateFile(file);
    return this.storage.upload({
      storeId,
      folder: "products",
      fileName: file.name,
      contentType: file.type,
      data: file.data,
    });
  }

  async uploadStoreAsset(
    storeId: string,
    kind: "logo" | "cover" | "category",
    file: {
      name: string;
      type: string;
      size: number;
      data: ArrayBuffer | Buffer | Blob;
    },
    options?: { previousUrl?: string | null },
  ): Promise<UploadedObject> {
    const store = await this.authorizeUpload(storeId);
    this.validateFile(file);
    const uploaded = await this.storage.upload({
      storeId,
      folder: kind === "category" ? "categories" : "stores",
      fileName: `${kind}-${file.name}`,
      contentType: file.type,
      data: file.data,
    });

    const previousUrl = options?.previousUrl?.trim() || null;
    if (previousUrl && previousUrl !== uploaded.url) {
      const persisted =
        kind === "logo"
          ? store.logoUrl
          : kind === "cover"
            ? store.coverUrl
            : null;
      // Keep the currently saved asset until the store form is saved.
      // Intermediate uploads (re-upload before save) are removed immediately.
      if (previousUrl !== persisted) {
        await this.deleteOwnedPublicUrl(storeId, previousUrl);
      }
    }

    return uploaded;
  }

  /**
   * Best-effort delete of a public URL that belongs to this store's bucket folder.
   * External / pasted URLs are ignored. Failures are swallowed.
   */
  async deleteOwnedPublicUrl(storeId: string, publicUrl: string): Promise<void> {
    const path = storagePathFromPublicUrl(publicUrl);
    if (!path) return;
    if (!path.startsWith(`stores/${storeId}/`)) return;
    try {
      await this.authorizeUpload(storeId);
      await this.storage.delete(path);
    } catch {
      // Ignore — file may already be gone; callers still succeed.
    }
  }

  /**
   * Clear from the upload UI: remove orphan uploads, but leave the persisted
   * store logo/cover file until updateStore saves the cleared URL.
   */
  async deleteClearedAssetUrl(storeId: string, publicUrl: string): Promise<void> {
    const store = await this.authorizeUpload(storeId);
    if (publicUrl === store.logoUrl || publicUrl === store.coverUrl) {
      return;
    }
    await this.deleteOwnedPublicUrl(storeId, publicUrl);
  }

  async deleteObject(storeId: string, path: string): Promise<void> {
    await this.authorizeUpload(storeId);
    if (!path.startsWith(`stores/${storeId}/`)) {
      throw new AppError("FORBIDDEN", "Invalid storage path.");
    }
    await this.storage.delete(path);
  }

  private async authorizeUpload(storeId: string): Promise<Store> {
    const { session } = await this.auth.requireProfile();
    const store = await this.stores.findById(storeId);
    if (!store) throw new AppError("NOT_FOUND", "Store not found.");
    const membership = await this.members.findMembership(storeId, session.user.id);
    assertCanManageStore(membership, "staff");
    assertStoreActive(store);
    await this.entitlements.getSubscription(storeId);
    return store;
  }

  private validateFile(file: { type: string; size: number }): void {
    if (!ALLOWED_TYPES.has(file.type)) {
      throw new AppError(
        "VALIDATION",
        "Only JPEG, PNG, WebP, and AVIF images are allowed.",
      );
    }
    if (file.size > MAX_BYTES) {
      throw new AppError("VALIDATION", "Images must be 5MB or smaller.");
    }
  }
}

/** Extract storage object path from a Supabase public URL, or null if not ours. */
export function storagePathFromPublicUrl(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
    const index = url.pathname.indexOf(marker);
    if (index === -1) return null;
    const path = decodeURIComponent(url.pathname.slice(index + marker.length));
    return path.length > 0 ? path : null;
  } catch {
    return null;
  }
}
