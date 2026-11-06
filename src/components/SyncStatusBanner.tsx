import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSyncStore } from '@/store/syncStore';
import { palette } from '@/constants/theme';
import { formatTimeAgo } from '@/utils/format';

export interface SyncStatusBannerProps {
  // hide during exam / quiz
  paused?: boolean;
}

// offline / sync banner. hidden when online with nothing to sync.
// tap it to sync now, handy if the phone hasn't noticed it's back online
export function SyncStatusBanner({ paused = false }: SyncStatusBannerProps) {
  const { phase, pendingCount, deadLetterCount, isOnline, planReason, lastSyncedAt, bind, syncNow } =
    useSyncStore();

  useEffect(() => {
    bind();
  }, [bind]);

  // update every minute so the time ago text changes
  const [, setTick] = useState(0);
  useEffect(() => {
    if (isOnline) return;
    const timer = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(timer);
  }, [isOnline]);

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
        accessibilityLabel={
          isOnline ? label : `${label}. Last sync ${formatTimeAgo(lastSyncedAt)}`
        }
        accessibilityHint={planReason}
        className="active:opacity-80"
        style={{ backgroundColor: tone.bg }}
      >
        <View className="flex-row items-center gap-2 px-4 py-2">
          <Ionicons name={tone.icon} size={16} color="#FFFFFF" />
          <Text className="flex-1 text-xs font-medium text-white" numberOfLines={1}>
            {label}
          </Text>
          {!isOnline ? (
            <Text className="text-xs text-white/80" numberOfLines={1}>
              Last sync: {formatTimeAgo(lastSyncedAt)}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}
