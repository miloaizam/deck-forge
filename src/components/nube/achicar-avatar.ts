import {
  LADO_AVATAR,
  MAX_BYTES_AVATAR,
  MAX_BYTES_ORIGINAL,
  recorteCuadrado,
} from "@/lib/avatar";

/** Por que no se pudo preparar la foto, dicho para quien la eligio. */
export class FotoNoValida extends Error {}

function aBlob(
  canvas: HTMLCanvasElement,
  tipo: string,
  calidad: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, tipo, calidad));
}

/**
 * La foto elegida, recortada al cuadrado del centro y achicada a
 * LADO_AVATAR px, lista para subir: WebP, o JPEG en el navegador que no sabe
 * codificar WebP (Safari viejo devuelve PNG, que el bucket no acepta). Todo
 * pasa en el navegador: a la nube solo va el resultado, de ~5-10 KB.
 */
export async function achicarAvatar(archivo: File): Promise<Blob> {
  if (!archivo.type.startsWith("image/")) {
    throw new FotoNoValida("El archivo no es una imagen.");
  }
  if (archivo.size > MAX_BYTES_ORIGINAL) {
    throw new FotoNoValida("La imagen pesa más de 10 MB. Elige una más liviana.");
  }
  let imagen: ImageBitmap;
  try {
    imagen = await createImageBitmap(archivo);
  } catch {
    throw new FotoNoValida("No se pudo leer la imagen. Prueba con otra.");
  }
  const canvas = document.createElement("canvas");
  canvas.width = LADO_AVATAR;
  canvas.height = LADO_AVATAR;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new FotoNoValida("El navegador no pudo preparar la imagen.");
  const { x, y, lado } = recorteCuadrado(imagen.width, imagen.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(imagen, x, y, lado, lado, 0, 0, LADO_AVATAR, LADO_AVATAR);
  imagen.close();

  for (const calidad of [0.8, 0.6]) {
    const webp = await aBlob(canvas, "image/webp", calidad);
    const blob =
      webp?.type === "image/webp" ? webp : await aBlob(canvas, "image/jpeg", calidad);
    if (blob && blob.size <= MAX_BYTES_AVATAR) return blob;
  }
  throw new FotoNoValida("No se pudo achicar la imagen. Prueba con otra.");
}
