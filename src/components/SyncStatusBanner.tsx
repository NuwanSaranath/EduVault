import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSyncStore } from '@/store/syncStore';
import { palette } from '@/constants/theme';

export interface SyncStatusBannerProps {
  /** Hide while a full-screen flow (exam, quiz session) is running. */
  paused?: boolean;
}

/**
 * The visible proof that offline sync exists.
 *
 * Collapses to nothing when the device is online with an empty outbox, so it
 * costs no screen space in the happy path. Tapping it forces a drain, which
 * doubles as the manual escape hatch when a student knows they are back online
 * before the OS has noticed.
 */
export function SyncStatusBanner({ paused = false }: SyncStatusBannerProps) {
  const { phase, pendingCount, deadLetterCount, isOnline, planReason, bind, syncNow } =
    useSyncStore();

  useEffect(() => {
    bind();
  }, [bind]);

  const hasQueue = pendingCount > 0;
  const hasFailures = deadLetterCount > 0;
  const visible = !paused && (!isOnline || hasQueue || hasFailures || phase === 'syncing');

  if (!visible) return null;

  const tone = !isOnline
    ? { bg: palette.gray[700], icon: 'cloud-offline-outline' as const }
    : hasFailures
      ? { bg: palette.danger, icon: 'alert-circle-outline' as const }
      : phase === 'syncing'
        ? { bg: palette.primary[600], icon: 'sync-outline' as const }
        : { bg: palette.warning, icon: 'cloud-upload-outline' as const };

  const label = !isOnline
    ? hasQueue
      ? `Offline — ${pendingCount} change${pendingCount === 1 ? '' : 's'} will sync`
      : 'Offline — your work is saved on this device'
    : hasFailures
      ? `${deadLetterCount} change${deadLetterCount === 1 ? '' : 's'} failed to sync — tap to retry`
      : phase === 'syncing'
        ? `Syncing${hasQueue ? ` ${pendingCount} change${pendingCount === 1 ? '' : 's'}` : ''}…`
        : `${pendingCount} change${pendingCount === 1 ? '' : 's'} waiting — tap to sync`;

  return (
    <Animated.View entering={FadeInUp.duration(220)} exiting={FadeOutUp.duration(160)}>
      <Pressable
        onPress={() => void syncNow()}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={planReason}
        className="active:opacity-80"
        style={{ backgroundColor: tone.bg }}
      >
        <View className="flex-row items-center gap-2 px-4 py-2">
          <Ionicons name={tone.icon} size={16} color="#FFFFFF" />
          <Text className="flex-1 text-xs font-medium text-white" numberOfLines={1}>
            {label}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
