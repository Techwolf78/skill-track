/**
 * snapshotWorker.ts
 * Off-main-thread image capture using OffscreenCanvas.
 *
 * Messages IN  (main → worker):
 *   { type: "CAPTURE", bitmap: ImageBitmap, width: number, height: number, quality: number }
 *
 * Messages OUT (worker → main):
 *   { type: "DONE", buffer: ArrayBuffer, mimeType: "image/jpeg" }
 *   { type: "ERROR", message: string }
 */

self.onmessage = async (e: MessageEvent) => {
  const { type, bitmap, width, height, quality } = e.data;
  if (type !== "CAPTURE") return;

  try {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close(); // free GPU memory immediately

    const blob = await canvas.convertToBlob({ type: "image/jpeg", quality });
    const buffer = await blob.arrayBuffer();

    // Transfer the buffer zero-copy back to the main thread
    self.postMessage({ type: "DONE", buffer, mimeType: "image/jpeg" }, [buffer]);
  } catch (err) {
    self.postMessage({ type: "ERROR", message: String(err) });
  }
};
