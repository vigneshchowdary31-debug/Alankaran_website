import { cloudinaryStorage } from "./cloudinary.storage";
import type { IStorageProvider } from "./storage.interface";

export * from "./storage.interface";
export { CloudinaryStorage, cloudinaryStorage } from "./cloudinary.storage";

/**
 * Master Storage Provider instance.
 * UI components must consume `storageProvider` directly from `@/storage`.
 * When changing storage vendors in the future (e.g. Firebase Storage, AWS S3),
 * simply swap `cloudinaryStorage` below with the new implementation.
 */
export const storageProvider: IStorageProvider = cloudinaryStorage;
export default storageProvider;
