// ─── Stub: Cloudinary (Almacenamiento de imágenes/archivos) ───────────────────
//
// Actualmente el proyecto usa URLs de unsplash/pexels. Para habilitar que los
// profesionales suban sus propias fotos o que los admin suban portadas de cursos:
//
// 1. En Cloudinary:
//    - Crear cuenta y obtener el "Cloud Name".
//    - Crear un "Upload Preset" sin firma (Unsigned) para permitir
//      subidas directas desde el navegador del cliente.
//
// 2. Uso en componentes de carga de archivos (ej: FileUploader):
//
//    async function uploadToCloudinary(file: File) {
//      const formData = new FormData();
//      formData.append('file', file);
//      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
//
//      const res = await fetch(
//        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
//        { method: 'POST', body: formData }
//      );
//
//      const data = await res.json();
//      return data.secure_url; // Esta URL se guarda en Supabase (ej: usuarios.foto)
//    }

export const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
export const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

/** Indica si la subida a Cloudinary está habilitada. */
export const CLOUDINARY_CONFIGURED = Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET);
