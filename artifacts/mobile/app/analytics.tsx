import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TopBar from '@/components/TopBar';
import ExerciseProgressChart from '@/components/ExerciseProgressChart';
import { useTheme } from '@/context/ThemeContext';
import { ANALYTICS_DATA, MUSCLE_SPLITS, MuscleSplit } from '@/constants/analyticsData';

// Dedicated Analytics screen (Ticket 7 §6). Reachable from the Home
// dashboard's "Session Progress" preview via "View Analytics". Shows one
// progress chart per exercise, grouped into Push / Pull / Legs tabs.
export default function AnalyticsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const botPad = Platform.OS === 'web' ? Math.max(insets.bottom, 34) : insets.bottom;
  const [split, setSplit] = useState<MuscleSplit>('Push');

  const SPLIT_COLORS: Record<MuscleSplit, string> = {
    Push: theme.chartPush,
    Pull: theme.chartPull,
    Legs: theme.chartLegs,
  };

  const exercises = ANALYTICS_DATA[split];
  const color = SPLIT_COLORS[split];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TopBar title="Analytics" showBack />

      <View style={styles.segment}>
        {MUSCLE_SPLITS.map(s => (
          <TouchableOpacity
            key={s}
            onPress={() => setSplit(s)}
            activeOpacity={0.8}
            style={[styles.segmentBtn, { backgroundColor: split === s ? SPLIT_COLORS[s] : 'transparent' }]}
          >
            <Text style={[styles.segmentText, { color: split === s ? '#fff' : theme.secondaryText }]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: botPad + 24 }} showsVerticalScrollIndicator={false}>
        {exercises.map(ex => (
          <ExerciseProgressChart key={`${split}-${ex.name}`} exercise={ex} color={color} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  segment: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4 },
  segmentBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  segmentText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
});
