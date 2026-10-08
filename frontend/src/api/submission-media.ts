import {
  connectStorageEmulator,
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from "firebase/storage";
import { emulator, firebaseApp } from "../auth/AuthProvider";
import type { ImageRecord } from "../types/domain";

const bucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as
  string | undefined;
let storage: ReturnType<typeof getStorage> | null = null;

function submissionStorage() {
  if (!bucket)
    throw new Error(
      "Falta configurar VITE_FIREBASE_STORAGE_BUCKET para adjuntar imágenes.",
    );
  if (!storage) {
    storage = getStorage(
      firebaseApp,
      bucket.startsWith("gs://") ? bucket : `gs://${bucket}`,
    );
    if (emulator) connectStorageEmulator(storage, "127.0.0.1", 9199);
  }
  return storage;
}

export async function uploadSubmissionImage(
  file: File,
  uid: string,
  submissionId: string,
): Promise<ImageRecord> {
  const extension =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const storagePath = `user-submissions/${uid}/${submissionId}/image.${extension}`;
  const fileRef = ref(submissionStorage(), storagePath);
  await uploadBytes(fileRef, file, {
    contentType: file.type,
    cacheControl: "public,max-age=3600",
  });
  try {
    return {
      url: await getDownloadURL(fileRef),
      provider: "firebase-storage",
      originalUrl: null,
      license: null,
      attribution: "Imagen enviada por la comunidad",
      generatedByAI: false,
      alteredByAI: false,
      retrievedAt: new Date().toISOString(),
      storagePath,
    };
  } catch (error) {
    await deleteObject(fileRef).catch(() => undefined);
    throw error;
  }
}

export async function deleteSubmissionImage(storagePath: string) {
  await deleteObject(ref(submissionStorage(), storagePath));
}
