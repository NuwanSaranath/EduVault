import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { Button, Card, EmptyState, FilterChip, GradientHeader, ScreenContainer } from '@/components';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useStreamSubjects } from '@/hooks/useStreamSubjects';
import { fetchAllPastPapers } from '@/services/pastPapers';
import { palette } from '@/constants/theme';
import type { PastPaper } from '@/types';

export function PastPapersScreen() {
  const { subjects: streamSubjects } = useStreamSubjects();

  // Papers come from SQLite, so the list is browsable with no connection.
  const { data: papers } = useAsyncData(() => fetchAllPastPapers(), []);
  const pastPapers = papers ?? [];

  // Only offer subjects that actually have papers cached — a chip that filters
  // to an empty list is worse than no chip.
  const subjects = useMemo(
    () => streamSubjects.filter((subject) => pastPapers.some((p) => p.subjectId === subject.id)),
    [streamSubjects, pastPapers],
  );

  const [subjectId, setSubjectId] = useState('');
  const years = useMemo(
    () => [...new Set(pastPapers.map((p) => p.year))].sort((a, b) => b - a),
    [pastPapers],
  );
  const [year, setYear] = useState<number | null>(null);
  const [activePaper, setActivePaper] = useState<PastPaper | null>(null);
  const [webViewUrl, setWebViewUrl] = useState<string | null>(null);

  // Both subjects and papers load asynchronously, so the default selection is
  // applied once they arrive rather than computed on first render.
  useEffect(() => {
    if (!subjectId && subjects.length > 0) setSubjectId(subjects[0].id);
  }, [subjectId, subjects]);

  const activeSubject = subjects.find((subject) => subject.id === subjectId);

  const filteredPapers = pastPapers.filter(
    (p) => p.subjectId === subjectId && (year === null || p.year === year),
  );

  return (
    <ScreenContainer scroll edges={['bottom']}>
      <GradientHeader>
        <Text className="text-2xl font-extrabold text-white">Past Papers</Text>
        <Text className="mt-1 text-sm text-white/80">Practice with real A/L exam papers</Text>
      </GradientHeader>

      <View className="px-5 pt-5">
        <Text className="mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">Subject</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          {subjects.map((subject) => (
            <FilterChip key={subject.id} label={subject.name} active={subjectId === subject.id} onPress={() => setSubjectId(subject.id)} />
          ))}
        </ScrollView>

        <Text className="mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">Year</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
          <FilterChip label="All" active={year === null} onPress={() => setYear(null)} />
          {years.map((y) => (
            <FilterChip key={y} label={String(y)} active={year === y} onPress={() => setYear(y)} />
          ))}
        </ScrollView>

        {filteredPapers.length === 0 ? (
          <EmptyState icon="document-text-outline" title="No past papers found" description="Try a different subject or year" />
        ) : (
          filteredPapers.map((paper) => (
            <Card key={paper.id} onPress={() => setActivePaper(paper)} className="mb-3">
              <View className="flex-row items-center">
                <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/40">
                  <Ionicons name="document-text" size={20} color={palette.primary[600]} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900 dark:text-white">{paper.title}</Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-400">
                    {paper.documents.length} documents · {paper.durationMinutes} min
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={palette.gray[400]} />
              </View>
            </Card>
          ))
        )}
      </View>

      <Modal visible={!!activePaper} animationType="slide" transparent onRequestClose={() => setActivePaper(null)}>
        <Pressable className="flex-1 bg-black/40" onPress={() => setActivePaper(null)} />
        {activePaper ? (
          <View className="rounded-t-3xl bg-card-light p-5 dark:bg-card-dark">
            <Text className="mb-1 text-lg font-bold text-gray-900 dark:text-white">{activePaper.title}</Text>
            <Text className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              {activeSubject?.name ?? ''}
            </Text>

            {activePaper.documents.map((doc) => (
              <Pressable
                key={doc.type}
                onPress={() => setWebViewUrl(doc.url)}
                className="mb-2 flex-row items-center justify-between rounded-2xl bg-gray-50 px-4 py-3.5 dark:bg-gray-800"
              >
                <Text className="text-sm font-medium text-gray-800 dark:text-gray-200">{doc.type}</Text>
                <Ionicons name="download-outline" size={18} color={palette.gray[400]} />
              </Pressable>
            ))}

            <View className="mt-3">
              <Button
                label="Start Exam Mode"
                onPress={() => {
                  const paperId = activePaper.id;
                  setActivePaper(null);
                  router.push(`/past-papers/${paperId}/exam`);
                }}
              />
            </View>
          </View>
        ) : null}
      </Modal>

      <Modal visible={!!webViewUrl} animationType="slide">
        <View className="flex-1 bg-black">
          <View className="flex-row items-center justify-between bg-surface-dark px-4 py-3 pt-14">
            <Text className="text-base font-semibold text-white">Document Preview</Text>
            <Ionicons name="close" size={24} color="#fff" onPress={() => setWebViewUrl(null)} suppressHighlighting />
          </View>
          {webViewUrl ? <WebView source={{ uri: webViewUrl }} style={{ flex: 1 }} /> : null}
        </View>
      </Modal>
    </ScreenContainer>
  );
}
