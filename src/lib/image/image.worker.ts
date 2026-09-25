/// <reference lib="webworker" />
import { ImageProcessError, processImage } from "./core";

self.onmessage = async (event: MessageEvent<{ id: number; file: Blob }>) => {
  const { id, file } = event.data;
  try {
    const result = await processImage(file);
    self.postMessage({ id, ok: true, result });
  } catch (error) {
    const code = error instanceof ImageProcessError ? error.code : "IMAGE_PROCESS_FAILED";
    self.postMessage({ id, ok: false, code });
  }
};
