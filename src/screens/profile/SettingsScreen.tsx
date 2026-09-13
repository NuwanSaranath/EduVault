import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { Card, GradientHeader, ScreenContainer, SectionHeader, SelectField } from '@/components';
import { palette } from '@/constants/theme';
import { requestNotificationPermission } from '@/features/planner/reminders';
import { clearUnpinnedCache, getCacheUsage, type CacheUsage } from '@/db/cachePolicy';
import { unsyncedCounts } from '@/db/repositories/attemptRepo';
import { pendingCaptureBytes } from '@/features/hardware/imagePipeline';
import { seedBackend } from '@/services/admin/seedBackend';
import { isFirebaseConfigured } from '@/services/firebase';
import { useThemeStore } from '@/store/themeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useSyncStore } from '@/store/syncStore';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatStamp(iso: string | null): string {
  if (!iso) return 'never';
  const date = new Date(iso);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export function SettingsScreen() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const {
    notificationsEnabled,
    setNotificationsEnabled,
    language,
    setLanguage,
    dataSaverEnabled,
    setDataSaverEnabled,
  } = useSettingsStore();

  const sync = useSyncStore();

  const [downloadedFiles, setDownloadedFiles] = useState<string[]>([]);
  const [cache, setCache] = useState<CacheUsage | null>(null);
  const [unsynced, setUnsynced] = useState({ attempts: 0, results: 0 });
  const [captureBytes, setCaptureBytes] = useState(0);
  const [seeding, setSeeding] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const refreshStorage = useCallback(async () => {
    const [usage, counts] = await Promise.all([getCacheUsage(), unsyncedCounts()]);
    setCache(usage);
    setUnsynced(counts);
    setCaptureBytes(pendingCaptureBytes());
  }, []);

  useEffect(() => {
    void refreshStorage();

    (async () => {
      const dir = FileSystem.documentDirectory;
      if (!dir) return;
      const files = await FileSystem.readDirectoryAsync(dir);
      setDownloadedFiles(files.filter((f) => f.endsWith('.pdf')));
    })();
  }, [refreshStorage]);

  const onToggleNotifications = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Permission needed',
          'Enable notifications in system settings to receive study reminders.',
        );
        return;
      }
    }
    setNotificationsEnabled(value);
  };

  const clearDownloads = async () => {
    const dir = FileSystem.documentDirectory;
    if (!dir) return;
    await Promise.all(
      downloadedFiles.map((f) => FileSystem.deleteAsync(`${dir}${f}`, { idempotent: true })),
    );
    setDownloadedFiles([]);
  };

  const onSyncNow = async () => {
    setSyncing(true);
    try {
      await sync.syncNow();
      await refreshStorage();
    } finally {
      setSyncing(false);
    }
  };

  /**
   * Clears evictable lesson content.
   *
   * Explicitly framed as "unpinned" in the UI because bookmarked lessons survive
   * — a student who saved a lesson for a journey should not lose it to a
   * housekeeping button.
   */
  const onClearCache = () => {
    Alert.alert(
      'Clear cached lessons?',
      'Bookmarked lessons and all your own results are kept. Cleared lessons re-download the next time you are online.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const removed = await clearUnpinnedCache();
              await refreshStorage();
              Alert.alert('Cache cleared', `${removed} lesson(s) removed.`);
            })();
          },
        },
      ],
    );
  };

  const onSeedBackend = () => {
    Alert.alert(
      'Publish content to Firestore?',
      'Uploads the bundled syllabus to your Firebase project. Safe to repeat — documents are keyed by id, so this overwrites rather than duplicates.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upload',
          onPress: () => {
            void (async () => {
              setSeeding(true);
              try {
                const report = await seedBackend();
                Alert.alert(
                  'Content published',
                  `${report.subjects} subjects, ${report.chapters} chapters, ${report.lessons} lessons, ${report.questions} questions, ${report.pastPapers} papers in ${report.batches} batch(es).`,
                );
              } catch (error) {
                Alert.alert(
                  'Upload failed',
                  error instanceof Error ? error.message : String(error),
                );
              } finally {
                setSeeding(false);
              }
            })();
          },
        },
      ],
    );
  };

  const cachePercent =
    cache && cache.limitBytes > 0 ? Math.min(100, (cache.usedBytes / cache.limitBytes) * 100) : 0;

  return (
    <ScreenContainer scroll edges={['bottom']}>
      <GradientHeader>
        <Ionicons
          name="chevron-back"
          size={24}
          color="#fff"
          onPress={() => router.back()}
          suppressHighlighting
        />
        <Text className="mt-2 text-2xl font-extrabold text-white">Settings</Text>
      </GradientHeader>

      <View className="px-5 pt-5">
        {/* ── Offline & sync ──────────────────────────────────────────────── */}
        <SectionHeader title="Offline & Sync" />
        <Card className="mb-3">
          <View className="mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons
                name={sync.isOnline ? 'cloud-done-outline' : 'cloud-offline-outline'}
                size={20}
                color={sync.isOnline ? palette.success : palette.gray[500]}
              />
              <Text className="ml-3 text-sm font-medium text-gray-800 dark:text-gray-200">
                {sync.isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {sync.connectionType}
            </Text>
          </View>

          <Text className="mb-2 text-xs text-gray-500 dark:text-gray-400">{sync.planReason}</Text>

          <Row label="Waiting to sync" value={`${sync.pendingCount} change(s)`} />
          <Row
            label="Unsynced results"
            value={`${unsynced.attempts} quiz · ${unsynced.results} paper`}
          />
          <Row label="Queued photos" value={formatBytes(captureBytes)} />
          <Row label="Last synced" value={formatStamp(sync.lastSyncedAt)} />
          {sync.deadLetterCount > 0 ? (
            <Row
              label="Failed"
              value={`${sync.deadLetterCount} change(s)`}
              tone={palette.danger}
            />
          ) : null}
          {sync.lastError ? (
            <Text className="mt-2 text-xs" style={{ color: palette.danger }} numberOfLines={2}>
              {sync.lastError}
            </Text>
          ) : null}

          <View className="mt-4 flex-row gap-3">
            <Pressable
              onPress={() => void onSyncNow()}
              disabled={syncing}
              className="flex-1 flex-row items-center justify-center rounded-xl py-3 active:opacity-80"
              style={{ backgroundColor: palette.primary[600], opacity: syncing ? 0.6 : 1 }}
            >
              {syncing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="sync-outline" size={16} color="#fff" />
                  <Text className="ml-2 text-sm font-semibold text-white">Sync now</Text>
                </>
              )}
            </Pressable>

            {sync.deadLetterCount > 0 ? (
              <Pressable
                onPress={() => void sync.retryFailed()}
                className="flex-1 items-center justify-center rounded-xl border py-3 active:opacity-80"
                style={{ borderColor: palette.danger }}
              >
                <Text className="text-sm font-semibold" style={{ color: palette.danger }}>
                  Retry failed
                </Text>
              </Pressable>
            ) : null}
          </View>
        </Card>

        <Card className="mb-6">
          <View className="flex-row items-center justify-between">
            <View className="mr-3 flex-1 flex-row items-center">
              <Ionicons name="cellular-outline" size={20} color={palette.primary[600]} />
              <View className="ml-3 flex-1">
                <Text className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Data Saver
                </Text>
                <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  On mobile data, sync results only and hold photos back for Wi-Fi
                </Text>
              </View>
            </View>
            <Switch
              value={dataSaverEnabled}
              onValueChange={setDataSaverEnabled}
              trackColor={{ true: palette.primary[500], false: palette.gray[300] }}
            />
          </View>
        </Card>

        {/* ── Storage ─────────────────────────────────────────────────────── */}
        <SectionHeader
          title="Storage"
          actionLabel={cache && cache.lessonCount > 0 ? 'Clear' : undefined}
          onAction={onClearCache}
        />
        <Card className="mb-6">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Cached lessons
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {cache ? `${formatBytes(cache.usedBytes)} / ${formatBytes(cache.limitBytes)}` : '—'}
            </Text>
          </View>

          <View className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <View
              className="h-full rounded-full"
              style={{
                width: `${cachePercent}%`,
                backgroundColor:
                  cachePercent > 85 ? palette.warning : palette.primary[500],
              }}
            />
          </View>

          <Text className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            {cache
              ? `${cache.lessonCount} lesson(s) cached · ${cache.pinnedCount} bookmarked and protected from clearing.`
              : 'Reading storage…'}
          </Text>
        </Card>

        {/* ── Preferences ─────────────────────────────────────────────────── */}
        <SectionHeader title="Preferences" />
        <Card className="mb-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="moon-outline" size={20} color={palette.primary[600]} />
              <Text className="ml-3 text-sm font-medium text-gray-800 dark:text-gray-200">
                Dark Mode
              </Text>
            </View>
            <Switch
              value={mode === 'dark'}
              onValueChange={(value) => setMode(value ? 'dark' : 'light')}
              trackColor={{ true: palette.primary[500], false: palette.gray[300] }}
            />
          </View>
        </Card>

        <Card className="mb-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="notifications-outline" size={20} color={palette.primary[600]} />
              <Text className="ml-3 text-sm font-medium text-gray-800 dark:text-gray-200">
                Notifications
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={onToggleNotifications}
              trackColor={{ true: palette.primary[500], false: palette.gray[300] }}
            />
          </View>
        </Card>

        <Card className="mb-6">
          <SelectField
            label="Language"
            icon="language-outline"
            value={language}
            options={['English', 'Sinhala']}
            onChange={(value) => setLanguage(value as 'English' | 'Sinhala')}
          />
        </Card>

        {/* ── Download manager ────────────────────────────────────────────── */}
        <SectionHeader
          title="Download Manager"
          actionLabel={downloadedFiles.length > 0 ? 'Clear All' : undefined}
          onAction={clearDownloads}
        />
        {downloadedFiles.length === 0 ? (
          <Text className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            No offline files downloaded yet.
          </Text>
        ) : (
          <View className="mb-6">
            {downloadedFiles.map((file) => (
              <Card key={file} className="mb-2">
                <View className="flex-row items-center">
                  <Ionicons name="document-text-outline" size={18} color={palette.primary[600]} />
                  <Text className="ml-3 flex-1 text-sm text-gray-800 dark:text-gray-200">
                    {file}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* ── Developer ───────────────────────────────────────────────────────
            Publishing content is an authoring action, not a student one. It is
            gated behind __DEV__ so it cannot ship in a release build. */}
        {__DEV__ ? (
          <>
            <SectionHeader title="Developer" />
            <Card className="mb-8">
              <Text className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                {isFirebaseConfigured()
                  ? 'Backend configured. Publish the bundled syllabus so other devices can pull it.'
                  : 'No backend configured. Add EXPO_PUBLIC_FB_* to .env — the app still works fully offline without it.'}
              </Text>
              <Pressable
                onPress={onSeedBackend}
                disabled={!isFirebaseConfigured() || seeding}
                className="flex-row items-center justify-center rounded-xl py-3 active:opacity-80"
                style={{
                  backgroundColor: palette.gray[700],
                  opacity: !isFirebaseConfigured() || seeding ? 0.5 : 1,
                }}
              >
                {seeding ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                    <Text className="ml-2 text-sm font-semibold text-white">
                      Publish content to Firestore
                    </Text>
                  </>
                )}
              </Pressable>
            </Card>
          </>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

/** Label/value line used throughout the sync panel. */
function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className="text-xs text-gray-500 dark:text-gray-400">{label}</Text>
      <Text
        className="text-xs font-semibold text-gray-800 dark:text-gray-200"
        style={tone ? { color: tone } : undefined}
      >
        {value}
      </Text>
    </View>
  );
}
