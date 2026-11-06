import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Directory, File, Paths } from 'expo-file-system';

// Shrink photos straight after taking them.
// Phone photos are 3-6 MB. If that sits in the outbox it'd be uploaded over
// whatever connection comes first, maybe mobile data. So we resize before
// saving or queueing it.
// 1080px wide at 60% jpeg is about the smallest where exam text is still readable.
// Note: sdk 54 changed the apis, manipulateAsync -> ImageManipulator.manipulate()
// and FileSystem.*Async -> File/Directory classes. old ones are deprecated.
export const MAX_CAPTURE_WIDTH = 1080;
export const CAPTURE_QUALITY = 0.6;

// folder in Paths.document for queued photos
const CAPTURE_DIR = 'captures';

export interface ProcessedImage {
  uri: string;
  width: number;
  height: number;
  bytes: number;
  // how much smaller it got, shown in settings
  savedBytes: number;
}

// size throws if the file is missing so check exists first
function sizeOf(uri: string): number {
  try {
    const file = new File(uri);
    return file.exists ? (file.size ?? 0) : 0;
  } catch {
    return 0;
  }
}

// resize + recompress. only makes it smaller, never bigger. height null
// keeps the aspect ratio
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

// copy to the documents folder. the camera saves to cache which android
// can clear any time, and a queued photo has to last until it syncs
export async function persistCapture(uri: string, id: string): Promise<string> {
  const dir = new Directory(Paths.document, CAPTURE_DIR);
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }

  const target = new File(dir, `${id}.jpg`);
  new File(uri).copy(target);
  return target.uri;
}

// delete the photo after it's been pushed
export async function discardCapture(uri: string): Promise<void> {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // already gone, that's fine
  }
}

// size of photos not synced yet, for settings
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
