import { AppError } from "@/domain/errors";
import { assertCanManageStore, assertStoreActive } from "@/domain/rules/store-rules";
import type { StorageProvider, UploadedObject } from "@/application/ports/providers";
import type {
  StoreMemberRepository,
  StoreRepository,
} from "@/application/ports/repositories";
import type { AuthService } from "./auth-service";
import type { EntitlementService } from "./entitlement-service";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const MAX_BYTES = 5 * 1024 * 1024;

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
    kind: "logo" | "cover",
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
      folder: "stores",
      fileName: `${kind}-${file.name}`,
      contentType: file.type,
      data: file.data,
    });
  }

  async deleteObject(storeId: string, path: string): Promise<void> {
    await this.authorizeUpload(storeId);
    if (!path.startsWith(`stores/${storeId}/`) && !path.includes(`/${storeId}/`)) {
      throw new AppError("FORBIDDEN", "Invalid storage path.");
    }
    await this.storage.delete(path);
  }

  private async authorizeUpload(storeId: string): Promise<void> {
    const { session } = await this.auth.requireProfile();
    const store = await this.stores.findById(storeId);
    if (!store) throw new AppError("NOT_FOUND", "Store not found.");
    const membership = await this.members.findMembership(storeId, session.user.id);
    assertCanManageStore(membership, "staff");
    assertStoreActive(store);
    // Touch entitlements so inactive subscriptions fail consistently.
    await this.entitlements.getSubscription(storeId);
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
