import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { processCapture, type ProcessedImage } from '@/features/hardware/imagePipeline';
import { palette } from '@/constants/theme';

export interface QuestionScannerProps {
  /**
   * Fired once a frame has been captured, downscaled and recompressed. The uri
   * points at a cache-directory JPEG — the caller is responsible for persisting
   * it if the image needs to outlive the session.
   */
  onCapture: (image: ProcessedImage) => void;
  /** Fired when the student backs out without capturing. */
  onCancel: () => void;
  /** Guidance line rendered over the viewfinder. */
  hint?: string;
}

/**
 * Native camera integration: photograph a printed question to ask about it.
 *
 * The viewfinder is framed as a document scanner rather than a general camera —
 * the overlay guides are sized for a portrait A4 column, which is what an A/L
 * paper actually looks like. That framing is why the capture can be aggressively
 * downscaled: legible text is the only requirement.
 *
 * Permission handling is explicit rather than requested on mount, because a
 * permission dialog the student did not ask for reads as an intrusion in a study
 * app. The prompt only appears once they tap into the scanner.
 */
export function QuestionScanner({ onCapture, onCancel, hint }: QuestionScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capture = useCallback(async () => {
    if (busy) return; // a double-tap must not queue two captures
    setBusy(true);
    setError(null);

    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 1 });
      if (!photo) {
        setError('The camera did not return an image. Try again.');
        return;
      }
      // Full quality out of the sensor, then one deliberate downscale — letting
      // the camera compress first would mean compressing twice and losing text.
      const processed = await processCapture(photo.uri, photo.width);
      onCapture(processed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process the photo.');
    } finally {
      setBusy(false);
    }
  }, [busy, onCapture]);

  // Permission state is still loading.
  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-black px-8">
        <Ionicons name="camera-outline" size={48} color={palette.gray[400]} />
        <Text className="text-center text-base font-semibold text-white">
          Camera access needed
        </Text>
        <Text className="text-center text-sm text-gray-400">
          EduVault uses the camera only to photograph a question you want explained. Photos stay
          on your device until you are online.
        </Text>

        {permission.canAskAgain ? (
          <Pressable
            onPress={requestPermission}
            className="rounded-xl px-6 py-3 active:opacity-80"
            style={{ backgroundColor: palette.primary[600] }}
          >
            <Text className="font-semibold text-white">Allow camera</Text>
          </Pressable>
        ) : (
          <Text className="text-center text-xs text-gray-500">
            Camera access was denied. Enable it in your device settings to use Snap &amp; Ask.
          </Text>
        )}

        <Pressable onPress={onCancel} className="px-6 py-2 active:opacity-70">
          <Text className="text-sm text-gray-400">Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView ref={cameraRef} facing="back" style={{ flex: 1 }}>
        {/* Document guides: a portrait frame matching an exam paper column. */}
        <View className="flex-1 items-center justify-center">
          <View
            className="rounded-lg border-2 border-dashed"
            style={{ width: '82%', height: '58%', borderColor: 'rgba(255,255,255,0.55)' }}
          />
          <Text className="mt-4 px-8 text-center text-xs text-white/80">
            {hint ?? 'Fit the question inside the frame. Keep the page flat and well lit.'}
          </Text>
        </View>
      </CameraView>

      {error ? (
        <View className="px-6 py-2" style={{ backgroundColor: palette.danger }}>
          <Text className="text-center text-xs text-white">{error}</Text>
        </View>
      ) : null}

      <View className="flex-row items-center justify-between px-8 py-6">
        <Pressable
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel scanning"
          className="p-3 active:opacity-70"
        >
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </Pressable>

        <Pressable
          onPress={() => void capture()}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Capture question"
          accessibilityState={{ disabled: busy }}
          className="h-20 w-20 items-center justify-center rounded-full active:opacity-80"
          style={{ backgroundColor: busy ? palette.gray[600] : '#FFFFFF' }}
        >
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View
              className="h-16 w-16 rounded-full"
              style={{ backgroundColor: palette.primary[600] }}
            />
          )}
        </Pressable>

        {/* Spacer keeps the shutter optically centred. */}
        <View className="w-12" />
      </View>
    </View>
  );
}
