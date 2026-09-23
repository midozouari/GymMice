import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import type { WorkoutTemplateState } from '@/hooks/useWorkoutTemplate';

type Props = WorkoutTemplateState & {
  scheduledStartTime?: string;
};

export default function WorkoutTemplateCard({
  workout,
  status,
  errorMessage,
  refresh,
  canRefresh,
  scheduledStartTime,
}: Props) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const busy = status === 'loading' || status === 'refreshing';

  if (!workout) {
    return (
      <View style={[styles.card, styles.stateCard, { backgroundColor: theme.surface }]}>
        {status === 'loading' ? (
          <>
            <ActivityIndicator color={theme.primary} accessibilityLabel="Loading workout template" />
            <Text style={[styles.stateText, { color: theme.secondaryText }]}>Loading public template…</Text>
          </>
        ) : (
          <>
            <Text style={[styles.stateText, { color: theme.secondaryText }]}>
              {status === 'empty' ? 'No public workout templates are available.' : errorMessage}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={status === 'empty' ? 'Refresh workout templates' : 'Retry loading workout template'}
              disabled={!canRefresh}
              onPress={() => void refresh()}
              style={[styles.action, { borderColor: theme.border, opacity: canRefresh ? 1 : 0.5 }]}
            >
              <Feather name="refresh-cw" size={14} color={theme.primary} />
              <Text style={[styles.actionText, { color: theme.primary }]}>
                {status === 'empty' ? 'Refresh' : 'Retry'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} ${workout.name} exercises`}
        onPress={() => setExpanded((value) => !value)}
        style={styles.workoutHeader}
        activeOpacity={0.7}
      >
        <View style={[styles.workoutIconBg, { backgroundColor: theme.chartNegativeBg }]}>
          <MaterialCommunityIcons name="dumbbell" size={28} color={theme.chartLegs} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.workoutName, { color: theme.primaryText }]}>{workout.name}</Text>
          <Text style={[styles.templateLabel, { color: theme.mutedText }]}>Public template</Text>
          <View style={styles.muscleTags}>
            {workout.muscles.map((muscle) => (
              <View key={muscle} style={[styles.muscleTag, { backgroundColor: theme.chartNegativeBg }]}>
                <Text style={[styles.muscleTagText, { color: theme.chartLegs }]}>{muscle}</Text>
              </View>
            ))}
          </View>
        </View>
        <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={theme.secondaryText} />
      </TouchableOpacity>

      <View style={[styles.workoutMetaRow, { borderTopColor: theme.border }]}>
        <View style={styles.workoutMetaItem}>
          <Feather name="list" size={13} color={theme.iconMuted} />
          <Text style={[styles.workoutMetaText, { color: theme.secondaryText }]}>{workout.exerciseCount} exercises</Text>
        </View>
        <View style={styles.workoutMetaItem}>
          <Feather name="clock" size={13} color={theme.iconMuted} />
          <Text style={[styles.workoutMetaText, { color: theme.secondaryText }]}>~{workout.durationMinutes} min</Text>
        </View>
        {scheduledStartTime ? (
          <View style={styles.workoutMetaItem}>
            <Feather name="calendar" size={13} color={theme.iconMuted} />
            <Text style={[styles.workoutMetaText, { color: theme.secondaryText }]}>{scheduledStartTime}</Text>
          </View>
        ) : null}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Refresh workout template"
          disabled={!canRefresh || busy}
          onPress={() => void refresh()}
          style={{ opacity: canRefresh && !busy ? 1 : 0.5 }}
        >
          {busy ? <ActivityIndicator size="small" color={theme.primary} /> : <Feather name="refresh-cw" size={14} color={theme.primary} />}
        </TouchableOpacity>
      </View>

      {expanded ? (
        <View style={[styles.workoutBody, { borderTopColor: theme.border }]}>
          {workout.exercises.map((group) => (
            <View key={group.group} style={{ marginTop: 12 }}>
              <Text style={[styles.groupLabel, { color: theme.primary }]}>{group.group}</Text>
              {group.moves.map((move) => (
                <View key={move.id} style={[styles.moveRow, { borderBottomColor: theme.border }]}>
                  <View style={[styles.moveDot, { backgroundColor: theme.accent }]} />
                  <Text style={[styles.moveText, { color: theme.primaryText }]}>{move.name}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 16 },
  stateCard: { minHeight: 112, alignItems: 'center', justifyContent: 'center', gap: 10 },
  stateText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  actionText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  workoutHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  workoutIconBg: { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  workoutName: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  templateLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold', marginTop: 2 },
  muscleTags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 6 },
  muscleTag: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  muscleTagText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  workoutMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
  workoutMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  workoutMetaText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  workoutBody: { borderTopWidth: 1, marginTop: 12, paddingTop: 4 },
  groupLabel: { fontSize: 14, fontFamily: 'Inter_700Bold', marginBottom: 6 },
  moveRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: 1 },
  moveDot: { width: 6, height: 6, borderRadius: 3 },
  moveText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
});