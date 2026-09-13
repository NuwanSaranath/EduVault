import { useCallback, useState } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState, QuestionScanner, ScreenContainer } from '@/components';
import { palette } from '@/constants/theme';
import { getQuestionsByIds } from '@/db/repositories/contentRepo';
import { askAiTutor, submitScannedQuestion } from '@/services/aiTutor';
import type { ProcessedImage } from '@/features/hardware/imagePipeline';
import type { AiTutorMessage, Question } from '@/types';

const suggestedPrompts = [
  "Explain Newton's Law",
  'What is photosynthesis?',
  'Explain demand and supply',
];

/** A user turn that carries a photo as well as (or instead of) text. */
interface ScanMessage extends AiTutorMessage {
  imageUri?: string;
}

export function AiTutorScreen() {
  const [messages, setMessages] = useState<ScanMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showSinhala, setShowSinhala] = useState<Record<string, boolean>>({});
  const [scannerOpen, setScannerOpen] = useState(false);
  const [relatedQuestions, setRelatedQuestions] = useState<Record<string, Question[]>>({});

  /**
   * Related questions are resolved from SQLite after the reply arrives.
   *
   * Previously this read the bundled question array inline during render, which
   * both bypassed the database and re-ran on every keystroke in the input box.
   */
  const loadRelated = useCallback(async (message: AiTutorMessage) => {
    if (!message.relatedQuestionIds?.length) return;
    const questions = await getQuestionsByIds(message.relatedQuestionIds);
    setRelatedQuestions((prev) => ({ ...prev, [message.id]: questions }));
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || sending) return;

    const userMessage: ScanMessage = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      const reply = await askAiTutor(text);
      setMessages((prev) => [...prev, reply]);
      void loadRelated(reply);
    } finally {
      setSending(false);
    }
  };

  /**
   * Handles a capture from the scanner.
   *
   * The photo is already downscaled by the capture pipeline. `submitScannedQuestion`
   * copies it somewhere durable and queues it, so this works with no connection —
   * the student gets an acknowledgement rather than a failure.
   */
  const handleCapture = async (image: ProcessedImage) => {
    setScannerOpen(false);
    setSending(true);

    const userMessage: ScanMessage = {
      id: `msg-${Date.now()}-scan`,
      role: 'user',
      text: input.trim() || 'Explain this question',
      imageUri: image.uri,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    try {
      const reply = await submitScannedQuestion({
        imageUri: image.uri,
        note: userMessage.text,
        bytes: image.bytes,
      });
      setMessages((prev) => [...prev, reply]);
    } finally {
      setSending(false);
    }
  };

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <View className="flex-row items-center border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <Ionicons
          name="chevron-back"
          size={24}
          color={palette.gray[600]}
          onPress={() => router.back()}
          suppressHighlighting
        />
        <View className="ml-3 h-9 w-9 items-center justify-center rounded-full bg-primary-600">
          <Ionicons name="sparkles" size={16} color="#fff" />
        </View>
        <Text className="ml-2 text-base font-bold text-gray-900 dark:text-white">AI Tutor</Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {messages.length === 0 ? (
          <View className="flex-1">
            <EmptyState
              icon="sparkles-outline"
              title="Ask me anything"
              description="Type a question, or photograph one from a past paper"
            />
            <View className="px-5 pb-2">
              {suggestedPrompts.map((prompt) => (
                <Pressable
                  key={prompt}
                  onPress={() => sendMessage(prompt)}
                  className="mb-2 rounded-2xl bg-primary-50 px-4 py-3 dark:bg-primary-900/30"
                >
                  <Text className="text-sm font-medium text-primary-700 dark:text-primary-200">
                    {prompt}
                  </Text>
                </Pressable>
              ))}

              <Pressable
                onPress={() => setScannerOpen(true)}
                className="mb-2 flex-row items-center rounded-2xl border border-primary-200 px-4 py-3 dark:border-primary-800"
              >
                <Ionicons name="camera-outline" size={18} color={palette.primary[600]} />
                <Text className="ml-2 text-sm font-medium text-primary-700 dark:text-primary-200">
                  Snap &amp; Ask — photograph a question
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => {
              if (item.role === 'user') {
                return (
                  <View className="mb-3 max-w-[85%] self-end rounded-2xl rounded-tr-sm bg-primary-600 px-4 py-3">
                    {item.imageUri ? (
                      <Image
                        source={{ uri: item.imageUri }}
                        className="mb-2 rounded-lg"
                        style={{ width: 180, height: 135 }}
                        resizeMode="cover"
                      />
                    ) : null}
                    <Text className="text-sm text-white">{item.text}</Text>
                  </View>
                );
              }

              const related = relatedQuestions[item.id] ?? [];

              return (
                <View className="mb-3 max-w-[90%] self-start rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-3 dark:bg-gray-800">
                  <Text className="text-sm leading-5 text-gray-800 dark:text-gray-200">
                    {item.text}
                  </Text>

                  {item.examples && item.examples.length > 0 ? (
                    <View className="mt-2">
                      {item.examples.map((example) => (
                        <Text
                          key={example}
                          className="mt-1 text-xs text-gray-600 dark:text-gray-400"
                        >
                          • {example}
                        </Text>
                      ))}
                    </View>
                  ) : null}

                  {item.sinhalaText ? (
                    <View className="mt-2">
                      <Pressable
                        onPress={() =>
                          setShowSinhala((s) => ({ ...s, [item.id]: !s[item.id] }))
                        }
                      >
                        <Text className="text-xs font-semibold text-primary-600 dark:text-primary-300">
                          {showSinhala[item.id]
                            ? 'Hide Sinhala explanation'
                            : 'Show Sinhala explanation'}
                        </Text>
                      </Pressable>
                      {showSinhala[item.id] ? (
                        <Text className="mt-1 text-sm leading-5 text-gray-700 dark:text-gray-300">
                          {item.sinhalaText}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {related.length > 0 ? (
                    <View className="mt-3 border-t border-gray-200 pt-2 dark:border-gray-700">
                      <Text className="mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Related question
                      </Text>
                      {related.map((q) => (
                        <Text key={q.id} className="text-xs text-gray-600 dark:text-gray-400">
                          {q.prompt}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            }}
          />
        )}

        <View className="flex-row items-center border-t border-gray-100 px-4 py-3 dark:border-gray-800">
          <Pressable
            onPress={() => setScannerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Photograph a question"
            className="mr-2 h-11 w-11 items-center justify-center rounded-full bg-gray-100 active:opacity-70 dark:bg-gray-800"
          >
            <Ionicons name="camera-outline" size={20} color={palette.primary[600]} />
          </Pressable>

          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask a question..."
            placeholderTextColor={palette.gray[400]}
            className="mr-2 flex-1 rounded-full bg-gray-100 px-4 py-3 text-sm text-gray-900 dark:bg-gray-800 dark:text-white"
            onSubmitEditing={() => sendMessage(input)}
          />

          <Pressable
            onPress={() => sendMessage(input)}
            disabled={sending}
            className={`h-11 w-11 items-center justify-center rounded-full bg-primary-600 ${
              sending ? 'opacity-60' : ''
            }`}
          >
            <Ionicons name="send" size={16} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Full-screen rather than inline: a viewfinder inside a chat bubble makes
          it impossible to frame a page, which is the one thing it must do well. */}
      <Modal visible={scannerOpen} animationType="slide" onRequestClose={() => setScannerOpen(false)}>
        <QuestionScanner
          onCapture={(image) => void handleCapture(image)}
          onCancel={() => setScannerOpen(false)}
        />
      </Modal>
    </ScreenContainer>
  );
}
