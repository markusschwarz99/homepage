// Handyfotos sind oft größer als das Server-Limit (5 MB). Vor dem Upload
// deshalb auf max. 2400 px Kantenlänge verkleinern und neu komprimieren.
const MAX_EDGE = 2400
const MAX_BYTES_UNTOUCHED = 4 * 1024 * 1024

export async function prepareImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  if (scale === 1 && file.size <= MAX_BYTES_UNTOUCHED) {
    bitmap.close()
    return file
  }

  const keepPng = file.type === 'image/png' && file.size <= MAX_BYTES_UNTOUCHED
  const type = keepPng ? 'image/png' : 'image/jpeg'
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return file
  }
  if (!keepPng) {
    // JPEG kennt keine Transparenz -> weißer statt schwarzer Hintergrund
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, 0.85))
  if (!blob) return file
  const name = file.name.replace(/\.\w+$/, '') + (keepPng ? '.png' : '.jpg')
  return new File([blob], name, { type })
}
