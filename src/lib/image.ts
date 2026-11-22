import { createClient } from "@/lib/supabase/client";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_SIDE = 1600;

export type Bucket = "car-photos" | "avatars" | "inspections" | "documents";

/** Reduz a imagem para ~1600px no maior lado e converte para JPEG (SPEC §12). */
export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Envie um arquivo de imagem (JPG ou PNG).");
  }
  let blob: Blob = file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const jpeg = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.82),
      );
      if (jpeg) blob = jpeg;
    }
  } catch {
    // formato que o navegador não decodifica: segue com o original
  }
  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new Error("A imagem passa de 5 MB. Escolha uma foto menor.");
  }
  return blob;
}

/** Comprime e envia para o Storage. Devolve o caminho dentro do bucket. */
export async function uploadImage(bucket: Bucket, path: string, file: File): Promise<string> {
  const blob = await compressImage(file);
  const supabase = createClient();
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: blob.type || "image/jpeg",
    upsert: true,
  });
  if (error) throw new Error("Não foi possível enviar a imagem. Tente de novo.");
  return path;
}

export function publicUrl(bucket: "car-photos" | "avatars", path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

/** Sufixo único para nomes de arquivo. */
export function uniqueName(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.jpg`;
}
