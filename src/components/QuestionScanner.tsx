import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { processCapture, type ProcessedImage } from '@/features/hardware/imagePipeline';
import { palette } from '@/constants/theme';

export interface QuestionScannerProps {
  // called after the photo is taken and resized. the uri is in the cache
  // folder so save it somewhere if you need to keep it
  onCapture: (image: ProcessedImage) => void;
  // closed without taking a photo
  onCancel: () => void;
  // text shown over the camera
  hint?: string;
}

// Camera for taking a photo of a question.
// Looks like a document scanner, the frame is shaped like an exam paper column.
// Only readable text matters, that's why we can shrink the photo a lot.
// Permission is only asked when they open the scanner, not on load.
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
      // take it at full quality and shrink once, compressing twice makes the
      // text blurry
      const processed = await processCapture(photo.uri, photo.width);
      onCapture(processed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process the photo.');
    } finally {
      setBusy(false);
    }
  }, [busy, onCapture]);

  // still loading permission
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
        {/* frame shaped like an exam paper column */}
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

        {/* spacer so the shutter button stays in the middle */}
        <View className="w-12" />
      </View>
    </View>
  );
}
