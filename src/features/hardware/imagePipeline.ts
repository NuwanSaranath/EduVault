import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Directory, File, Paths } from 'expo-file-system';

/**
 * Constrained-design policy #4: downscale before anything else sees the photo.
 *
 * A modern phone camera produces 3–6 MB per frame. Queueing that raw would mean
 * a Snap & Ask taken offline sits in the outbox as a multi-megabyte blob, then
 * tries to upload over whatever connection appears first. Shrinking at capture
 * time bounds the cost at its only cheap moment — before it is persisted, before
 * it is queued, before it is billed as mobile data.
 *
 * 1080px wide at 60% JPEG quality is the smallest size at which printed exam
 * text stays legible, which is the actual requirement here — not image fidelity.
 *
 * Note on APIs: SDK 54 replaced `manipulateAsync` with the chainable
 * `ImageManipulator.manipulate()` context, and `FileSystem.*Async` with the
 * `File`/`Directory` classes. Both legacy forms are deprecated, and the file
 * system one throws if called from the main export.
 */
export const MAX_CAPTURE_WIDTH = 1080;
export const CAPTURE_QUALITY = 0.6;

/** Directory name under Paths.document where queued captures live. */
const CAPTURE_DIR = 'captures';

export interface ProcessedImage {
  uri: string;
  width: number;
  height: number;
  bytes: number;
  /** Bytes saved versus the original, surfaced in the Settings data panel. */
  savedBytes: number;
}

/** `size` throws on a missing file, so probe `exists` first. */
function sizeOf(uri: string): number {
  try {
    const file = new File(uri);
    return file.exists ? (file.size ?? 0) : 0;
  } catch {
    return 0;
  }
}

/**
 * Resizes and recompresses a captured photo.
 *
 * Only downscales — resizing to a width larger than the source would upsample,
 * inflating the file for no added legibility. Passing `height: null` lets the
 * native side preserve the aspect ratio rather than us computing it.
 */
export async function processCapture(
  uri: string,
  originalWidth: number,
): Promise<ProcessedImage> {
  const originalBytes = sizeOf(uri);

  const context = ImageManipulator.manipulate(uri);
  if (originalWidth > MAX_CAPTURE_WIDTH) {
    context.resize({ width: MAX_CAPTURE_WIDTH, height: null });
  }

  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: CAPTURE_QUALITY,
  });

  const bytes = sizeOf(result.uri);

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    bytes,
    savedBytes: Math.max(0, originalBytes - bytes),
  };
}

/**
 * Moves a processed capture into the app's document directory.
 *
 * Both the camera and `saveAsync` write to the cache directory, which Android
 * may clear at any time. A queued capture has to survive until it syncs, so
 * anything the outbox references must be copied somewhere durable first.
 */
export async function persistCapture(uri: string, id: string): Promise<string> {
  const dir = new Directory(Paths.document, CAPTURE_DIR);
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }

  const target = new File(dir, `${id}.jpg`);
  new File(uri).copy(target);
  return target.uri;
}

/** Deletes a capture once its outbox row has been pushed. */
export async function discardCapture(uri: string): Promise<void> {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // A missing file is the desired end state anyway.
  }
}

/** Total bytes held by not-yet-synced captures, for the Settings data panel. */
export function pendingCaptureBytes(): number {
  try {
    const dir = new Directory(Paths.document, CAPTURE_DIR);
    if (!dir.exists) return 0;
    return dir
      .list()
      .reduce((sum, entry) => sum + (entry instanceof File ? (entry.size ?? 0) : 0), 0);
  } catch {
    return 0;
  }
}
