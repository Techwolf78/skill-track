/**
 * snapshotWorker.ts
 * Runs in a Web Worker — handles OffscreenCanvas drawing and JPEG encoding
 * completely off the main thread.
 *
 * Messages IN  (main → worker):
 *   { type: "CAPTURE", bitmap: ImageBitmap, width: number, height: number, quality: number }
 *
 * Messages OUT (worker → main):
 *   { type: "DONE", dataUrl: string }
 *   { type: "ERROR", message: string }
 */

self.onmessage = (e: MessageEvent) => {
  const { type, bitmap, width, height, quality } = e.data;
  if (type !== "CAPTURE") return;

  try {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close(); // free GPU memory immediately

    canvas.convertToBlob({ type: "image/jpeg", quality }).then((blob) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        self.postMessage({ type: "DONE", dataUrl: reader.result as string });
      };
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    self.postMessage({ type: "ERROR", message: String(err) });
  }
};
