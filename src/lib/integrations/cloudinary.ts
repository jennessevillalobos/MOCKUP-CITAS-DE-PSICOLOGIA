// ─── Cloudinary (Almacenamiento de imágenes y archivos) ───────────────────────
//
// Sube archivos directamente desde el navegador usando un Upload Preset unsigned.
// Configuración en .env:
//   VITE_CLOUDINARY_CLOUD_NAME   — Cloud name del proyecto en Cloudinary
//   VITE_CLOUDINARY_UPLOAD_PRESET — Upload Preset sin firma (Unsigned)

export const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
export const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

/** Indica si la subida a Cloudinary está habilitada. */
export const CLOUDINARY_CONFIGURED = Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET);

/**
 * Sube un archivo (imagen, PDF, etc.) a Cloudinary mediante un Upload Preset unsigned.
 * @returns URL segura del archivo subido, o `null` si falla o no está configurado.
 */
export async function uploadToCloudinary(file: File): Promise<string | null> {
  if (!CLOUDINARY_CONFIGURED || !CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) return null;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData },
    );
    if (!res.ok) return null;
    const data = await res.json() as { secure_url?: string };
    return data.secure_url ?? null;
  } catch {
    return null;
  }
}

