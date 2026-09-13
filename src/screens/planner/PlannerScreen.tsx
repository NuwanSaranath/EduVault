import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, EmptyState, GradientHeader, Input, ScreenContainer, SelectField } from '@/components';
import { weekDays } from '@/constants/data/planner';
import { useStreamSubjects } from '@/hooks/useStreamSubjects';
import { palette } from '@/constants/theme';
import { usePlannerStore } from '@/store/plannerStore';
import type { PlannerEvent } from '@/types';

export function PlannerScreen() {
  const today = weekDays[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const [selectedDay, setSelectedDay] = useState<PlannerEvent['day']>(today);
  const [modalVisible, setModalVisible] = useState(false);
  const { subjects } = useStreamSubjects();
  const [form, setForm] = useState({ subjectId: '', time: '18:00', activity: '' });

  // Subjects load from SQLite, so the form's default subject is filled in once
  // they arrive rather than assumed present on first render.
  useEffect(() => {
    if (!form.subjectId && subjects.length > 0) {
      setForm((f) => ({ ...f, subjectId: subjects[0].id }));
    }
  }, [form.subjectId, subjects]);

  const events = usePlannerStore((s) => s.events);
  const addEvent = usePlannerStore((s) => s.addEvent);
  const toggleReminder = usePlannerStore((s) => s.toggleReminder);

  const dayEvents = events
    .filter((e) => e.day === selectedDay)
    .sort((a, b) => a.time.localeCompare(b.time));

  const submitEvent = () => {
    if (!form.activity.trim()) return;
    addEvent({
      id: `pe-${Date.now()}`,
      day: selectedDay,
      time: form.time,
      subjectId: form.subjectId,
      activity: form.activity,
      reminderEnabled: false,
    });
    setForm({ subjectId: subjects[0]?.id ?? '', time: '18:00', activity: '' });
    setModalVisible(false);
  };

  return (
    <ScreenContainer edges={['bottom']}>
      <GradientHeader>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-extrabold text-white">Study Planner</Text>
            <Text className="mt-1 text-sm text-white/80">Plan your week, stay consistent</Text>
          </View>
          <Ionicons name="add-circle" size={30} color="#fff" onPress={() => setModalVisible(true)} suppressHighlighting />
        </View>
      </GradientHeader>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-5 pt-4" contentContainerStyle={{ paddingRight: 20 }}>
        {weekDays.map((day) => (
          <Pressable
            key={day}
            onPress={() => setSelectedDay(day)}
            className={`mr-2 rounded-full px-4 py-2 ${
              selectedDay === day ? 'bg-primary-600' : 'bg-gray-100 dark:bg-gray-800'
            }`}
          >
            <Text className={`text-sm font-semibold ${selectedDay === day ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
              {day}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
        {dayEvents.length === 0 ? (
          <EmptyState icon="calendar-outline" title="No sessions planned" description="Tap + to add a study session" />
        ) : (
          dayEvents.map((event) => {
            const subject = subjects.find((s) => s.id === event.subjectId);
            return (
              <Card key={event.id} className="mb-3">
                <View className="flex-row items-center">
                  <View className="mr-3 items-center">
                    <Text className="text-sm font-bold text-primary-600 dark:text-primary-300">{event.time}</Text>
                  </View>
                  <View
                    className="mr-3 h-10 w-10 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: `${subject?.color ?? palette.primary[500]}1A` }}
                  >
                    <Ionicons name={(subject?.icon as never) ?? 'book-outline'} size={18} color={subject?.color ?? palette.primary[600]} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-gray-900 dark:text-white">{event.activity}</Text>
                    <Text className="text-xs text-gray-500 dark:text-gray-400">{subject?.name}</Text>
                  </View>
                  <Switch
                    value={event.reminderEnabled}
                    onValueChange={() => toggleReminder(event.id)}
                    trackColor={{ true: palette.primary[500], false: palette.gray[300] }}
                  />
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <Pressable className="flex-1 bg-black/40" onPress={() => setModalVisible(false)} />
        <View className="rounded-t-3xl bg-card-light p-5 dark:bg-card-dark">
          <Text className="mb-4 text-center text-lg font-bold text-gray-900 dark:text-white">
            Add Session · {selectedDay}
          </Text>
          <Input label="Activity" placeholder="e.g. Theory — Mechanics" value={form.activity} onChangeText={(v) => setForm((f) => ({ ...f, activity: v }))} />
          <SelectField
            label="Subject"
            value={subjects.find((s) => s.id === form.subjectId)?.name ?? ''}
            options={subjects.map((s) => s.name)}
            onChange={(name) => {
              const subject = subjects.find((s) => s.name === name);
              if (subject) setForm((f) => ({ ...f, subjectId: subject.id }));
            }}
          />
          <SelectField
            label="Time"
            value={form.time}
            options={['16:00', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00']}
            onChange={(time) => setForm((f) => ({ ...f, time }))}
          />
          <Button label="Add to Schedule" onPress={submitEvent} />
        </View>
      </Modal>
    </ScreenContainer>
  );
}
