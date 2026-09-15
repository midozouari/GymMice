import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Line, Polyline } from 'react-native-svg';
import Logo from '@/components/Logo';
import ProgressRing from '@/components/ProgressRing';
import RestTimer from '@/components/RestTimer';
import { useTheme } from '@/context/ThemeContext';
import { useCountUp } from '@/hooks/useCountUp';
import { useScheduleEvents } from '@/hooks/useScheduleEvents';
import { CURRENT_STREAK } from '@/constants/mockData';
import { TODAYS_WORKOUT, exerciseCount } from '@/constants/workoutData';
import { CATEGORY_META, formatCountdown, getNextUpcomingEvent, getTodaysGymEvent } from '@/constants/scheduleData';

const MEALS = [
  { label: 'Breakfast', name: 'Oatmeal & fruits', kcal: 420, icon: 'food-apple' as const },
  { label: 'Lunch', name: 'Grilled chicken bowl', kcal: 680, icon: 'food' as const },
  { label: 'Dinner', name: 'Salmon & quinoa', kcal: 740, icon: 'fish' as const },
];

// Today's stats — a real backend would replace these with logged values.
// Kept here (not workoutData/analyticsData) since they're daily-cadence
// dashboard metrics rather than workout history.
const CALORIES_GOAL = 2200;
const CALORIES_CURRENT = 1840;
const WATER_GOAL_L = 2.5;
const WATER_CURRENT_L = 1.8;
const STEPS_GOAL = 10000;
const STEPS_CURRENT = 6420;

// Simple fade + slide-up entrance wrapper, staggered per section by `delay`,
// so the dashboard never appears all-at-once (Ticket 7 §4).
function RevealSection({ delay, children }: { delay: number; children: React.ReactNode }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 500, delay, useNativeDriver: true }).start();
  }, [anim, delay]);
  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
    }}>
      {children}
    </Animated.View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const botPad = Platform.OS === 'web' ? Math.max(insets.bottom, 84) : insets.bottom;

  const [showWorkout, setShowWorkout] = useState(false);
  const { allEvents } = useScheduleEvents();

  // Bumped only when the Home tab gains focus (not on every scroll/re-render),
  // so the stat rings + count-up numbers replay their entrance animation each
  // time you return to this tab, but don't restart mid-scroll or on unrelated
  // state updates (e.g. the "now" tick below).
  const [focusKey, setFocusKey] = useState(0);
  useFocusEffect(
    React.useCallback(() => {
      setFocusKey(k => k + 1);
    }, [])
  );

  // Re-evaluate "now" periodically so the Next Event countdown stays fresh
  // while the dashboard is open, without a full re-render loop.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const nextEvent = useMemo(() => getNextUpcomingEvent(allEvents, now), [allEvents, now]);
  const todaysGymEvent = useMemo(() => getTodaysGymEvent(allEvents, now), [allEvents, now]);

  const QUICK_LINKS = [
    { icon: 'calendar' as const, label: 'Schedule', onPress: () => router.push('/schedule') },
    { icon: 'sun' as const, label: 'Nutrition', onPress: () => router.push('/nutrition') },
    { icon: 'activity' as const, label: 'Pump Match', onPress: () => router.push('/pumpmatch') },
    { icon: 'shopping-bag' as const, label: 'Shop', onPress: () => router.push('/shop') },
  ];

  const CURVES = [
    { label: 'Push', color: theme.chartPush, pts: '0,80 50,60 100,50 150,35 200,28 250,18 300,12' },
    { label: 'Pull', color: theme.chartPull, pts: '0,85 50,70 100,65 150,55 200,45 250,35 300,28' },
    { label: 'Legs', color: theme.chartLegs, pts: '0,90 50,80 100,72 150,60 200,55 250,42 300,35' },
  ];

  const caloriesValue = useCountUp(CALORIES_CURRENT, 1000, [focusKey]);
  const waterValue = useCountUp(WATER_CURRENT_L, 1000, [focusKey]);
  const stepsValue = useCountUp(STEPS_CURRENT, 1200, [focusKey]);

  const caloriesRemaining = Math.max(CALORIES_GOAL - CALORIES_CURRENT, 0);
  const waterRemaining = Math.max(WATER_GOAL_L - WATER_CURRENT_L, 0);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={{ gap: 2 }}>
          <Logo size="sm" />
          <Text style={[styles.greeting, { color: theme.secondaryText }]}>Good morning, Mido 👋</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={[styles.iconBtn, { borderColor: theme.border }]}>
            <Feather name="bell" size={20} color={theme.icon} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/profile')} style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>M</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: botPad + 90 }}>
        {/* Streak banner */}
        <RevealSection delay={0}>
          <View style={[styles.streak, { backgroundColor: theme.accent }]}>
            <Feather name="zap" size={20} color="#fff" />
            <View>
              <Text style={styles.streakTitle}>{CURRENT_STREAK}-day streak! Keep it up</Text>
              <Text style={styles.streakSub}>You're on fire — don't break the chain</Text>
            </View>
          </View>
        </RevealSection>

        {/* Today's Workout — primary focus, directly below the streak banner */}
        <RevealSection delay={60}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.mutedText }]}>TODAY'S WORKOUT</Text>
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <TouchableOpacity onPress={() => setShowWorkout(w => !w)} style={styles.workoutHeader} activeOpacity={0.7}>
                <View style={[styles.workoutIconBg, { backgroundColor: theme.chartNegativeBg }]}>
                  <MaterialCommunityIcons name="dumbbell" size={28} color={theme.chartLegs} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.workoutName, { color: theme.primaryText }]}>{TODAYS_WORKOUT.name}</Text>
                  <View style={styles.muscleTags}>
                    {TODAYS_WORKOUT.muscles.map(m => (
                      <View key={m} style={[styles.muscleTag, { backgroundColor: theme.chartNegativeBg }]}>
                        <Text style={[styles.muscleTagText, { color: theme.chartLegs }]}>{m}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <Feather name={showWorkout ? 'chevron-up' : 'chevron-down'} size={20} color={theme.secondaryText} />
              </TouchableOpacity>

              <View style={[styles.workoutMetaRow, { borderTopColor: theme.border }]}>
                <View style={styles.workoutMetaItem}>
                  <Feather name="list" size={13} color={theme.iconMuted} />
                  <Text style={[styles.workoutMetaText, { color: theme.secondaryText }]}>{exerciseCount(TODAYS_WORKOUT)} exercises</Text>
                </View>
                <View style={styles.workoutMetaItem}>
                  <Feather name="clock" size={13} color={theme.iconMuted} />
                  <Text style={[styles.workoutMetaText, { color: theme.secondaryText }]}>~{TODAYS_WORKOUT.durationMinutes} min</Text>
                </View>
                {todaysGymEvent && (
                  <View style={styles.workoutMetaItem}>
                    <Feather name="calendar" size={13} color={theme.iconMuted} />
                    <Text style={[styles.workoutMetaText, { color: theme.secondaryText }]}>{todaysGymEvent.startTime}</Text>
                  </View>
                )}
              </View>

              {showWorkout && (
                <View style={[styles.workoutBody, { borderTopColor: theme.border }]}>
                  {TODAYS_WORKOUT.exercises.map(group => (
                    <View key={group.group} style={{ marginTop: 12 }}>
                      <Text style={[styles.groupLabel, { color: theme.primary }]}>{group.group}</Text>
                      {group.moves.map(m => (
                        <View key={m} style={[styles.moveRow, { borderBottomColor: theme.border }]}>
                          <View style={[styles.moveDot, { backgroundColor: theme.accent }]} />
                          <Text style={[styles.moveText, { color: theme.primaryText }]}>{m}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </RevealSection>

        {/* Next Event — immediately below Today's Workout */}
        <RevealSection delay={120}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.mutedText }]}>NEXT EVENT</Text>
            <TouchableOpacity
              onPress={() => router.push('/schedule')}
              activeOpacity={0.85}
              style={[styles.card, { backgroundColor: theme.surface }]}
            >
              {nextEvent ? (
                (() => {
                  const meta = CATEGORY_META[nextEvent.category];
                  const eventDate = new Date(`${nextEvent.date}T${nextEvent.startTime}:00`);
                  return (
                    <View style={styles.nextEventRow}>
                      <View style={[styles.nextEventIconBg, { backgroundColor: meta.tint }]}>
                        <Feather name={meta.icon} size={22} color={meta.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.nextEventTitle, { color: theme.primaryText }]}>{nextEvent.title}</Text>
                        <Text style={[styles.nextEventMeta, { color: theme.secondaryText }]}>
                          {meta.label} · {eventDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · {nextEvent.startTime}
                        </Text>
                      </View>
                      <View style={[styles.countdownPill, { backgroundColor: meta.color }]}>
                        <Text style={styles.countdownText}>{formatCountdown(eventDate, now)}</Text>
                      </View>
                    </View>
                  );
                })()
              ) : (
                <View style={styles.emptyEvent}>
                  <Feather name="calendar" size={18} color={theme.iconMuted} />
                  <Text style={[styles.emptyEventText, { color: theme.mutedText }]}>No upcoming events.</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </RevealSection>

        {/* Quick links */}
        <RevealSection delay={160}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.mutedText }]}>QUICK ACCESS</Text>
            <View style={styles.quickGrid}>
              {QUICK_LINKS.map(q => (
                <TouchableOpacity key={q.label} onPress={q.onPress} style={[styles.quickCard, { backgroundColor: theme.surface, borderColor: theme.border }]} activeOpacity={0.75}>
                  <Feather name={q.icon} size={24} color={theme.primary} />
                  <Text style={[styles.quickLabel, { color: theme.primaryText }]}>{q.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </RevealSection>

        {/* Today's Stats — animated circular progress rings */}
        <RevealSection delay={200}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.mutedText }]}>TODAY'S STATS</Text>
            <View style={styles.ringGrid}>
              <View style={[styles.ringCard, { backgroundColor: theme.surface }]}>
                <ProgressRing size={84} strokeWidth={8} progress={CALORIES_CURRENT / CALORIES_GOAL} color={theme.accent} trackColor={theme.chartTrack} resetKey={focusKey}>
                  <Text style={[styles.ringValue, { color: theme.accent }]}>{Math.round(caloriesValue)}</Text>
                  <Text style={[styles.ringUnit, { color: theme.mutedText }]}>kcal</Text>
                </ProgressRing>
                <Text style={[styles.ringLabel, { color: theme.primaryText }]}>Calories</Text>
                <Text style={[styles.ringSub, { color: theme.mutedText }]}>{caloriesRemaining} left · goal {CALORIES_GOAL}</Text>
              </View>
              <View style={[styles.ringCard, { backgroundColor: theme.surface }]}>
                <ProgressRing size={84} strokeWidth={8} progress={WATER_CURRENT_L / WATER_GOAL_L} color={theme.chartWater} trackColor={theme.chartTrack} resetKey={focusKey}>
                  <Text style={[styles.ringValue, { color: theme.chartWater }]}>{waterValue.toFixed(1)}L</Text>
                </ProgressRing>
                <Text style={[styles.ringLabel, { color: theme.primaryText }]}>Water</Text>
                <Text style={[styles.ringSub, { color: theme.mutedText }]}>{waterRemaining.toFixed(1)}L left · goal {WATER_GOAL_L}L</Text>
              </View>
            </View>
            <View style={[styles.ringGrid, { marginTop: 10 }]}>
              <View style={[styles.ringCard, { backgroundColor: theme.surface }]}>
                <ProgressRing size={84} strokeWidth={8} progress={STEPS_CURRENT / STEPS_GOAL} color={theme.primary} trackColor={theme.chartTrack} resetKey={focusKey}>
                  <Text style={[styles.ringValue, { color: theme.primary, fontSize: 15 }]}>{Math.round(stepsValue).toLocaleString()}</Text>
                </ProgressRing>
                <Text style={[styles.ringLabel, { color: theme.primaryText }]}>Steps</Text>
                <Text style={[styles.ringSub, { color: theme.mutedText }]}>of {STEPS_GOAL.toLocaleString()}</Text>
              </View>
              <View style={[styles.ringCard, styles.workoutStatCard, { backgroundColor: theme.surface }]}>
                <View style={[styles.workoutStatIconBg, { backgroundColor: theme.chartNegativeBg }]}>
                  <MaterialCommunityIcons name="dumbbell" size={26} color={theme.chartLegs} />
                </View>
                <Text style={[styles.ringLabel, { color: theme.primaryText }]}>Workout</Text>
                <Text style={[styles.ringSub, { color: theme.mutedText }]}>{TODAYS_WORKOUT.name}</Text>
              </View>
            </View>
          </View>
        </RevealSection>

        {/* Session progress */}
        <RevealSection delay={240}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.mutedText }]}>SESSION PROGRESS</Text>
            <TouchableOpacity onPress={() => router.push('/analytics')} activeOpacity={0.85} style={[styles.card, { backgroundColor: theme.surface }]}>
              <Svg width="100%" height={110} viewBox="0 0 300 110" preserveAspectRatio="none">
                <Line x1="0" y1="100" x2="300" y2="100" stroke={theme.chartGrid} strokeWidth="1" />
                {CURVES.map(c => (
                  <Polyline key={c.label} points={c.pts} fill="none" stroke={c.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                ))}
              </Svg>
              <View style={styles.legend}>
                {CURVES.map(c => (
                  <View key={c.label} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: c.color }]} />
                    <Text style={[styles.legendText, { color: theme.secondaryText }]}>{c.label}</Text>
                  </View>
                ))}
              </View>
              <View style={[styles.viewAnalyticsRow, { borderTopColor: theme.border }]}>
                <Text style={[styles.viewAnalyticsText, { color: theme.primary }]}>View Analytics</Text>
                <Feather name="arrow-right" size={14} color={theme.primary} />
              </View>
            </TouchableOpacity>
          </View>
        </RevealSection>

        {/* Today's meals */}
        <RevealSection delay={280}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.mutedText }]}>TODAY'S MEALS</Text>
            <View style={{ gap: 10 }}>
              {MEALS.map(m => (
                <TouchableOpacity key={m.label} onPress={() => router.push('/nutrition')} style={[styles.mealCard, { backgroundColor: theme.surface }]} activeOpacity={0.75}>
                  <View style={[styles.mealIconBg, { backgroundColor: theme.background }]}>
                    <MaterialCommunityIcons name={m.icon} size={28} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.mealLabel, { color: theme.secondaryText }]}>{m.label}</Text>
                    <Text style={[styles.mealName, { color: theme.primaryText }]}>{m.name}</Text>
                  </View>
                  <Text style={[styles.mealKcal, { color: theme.accent }]}>{m.kcal} kcal</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </RevealSection>

        {/* Rest timer */}
        <RevealSection delay={320}>
          <View style={[styles.section, { marginBottom: 8 }]}>
            <Text style={[styles.sectionTitle, { color: theme.mutedText }]}>REST TIMER</Text>
            <RestTimer />
          </View>
        </RevealSection>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  greeting: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 14 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, paddingHorizontal: 20 },
  streakTitle: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 14 },
  streakSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: 'Inter_400Regular' },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1, marginBottom: 12 },
  quickGrid: { flexDirection: 'row', gap: 10 },
  quickCard: { flex: 1, borderRadius: 14, borderWidth: 1.5, paddingVertical: 14, alignItems: 'center', gap: 6 },
  quickLabel: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  card: { borderRadius: 14, padding: 16 },
  legend: { flexDirection: 'row', gap: 16, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  viewAnalyticsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  viewAnalyticsText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  workoutHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  workoutIconBg: { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  workoutName: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  muscleTags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 6 },
  muscleTag: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  muscleTagText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  workoutMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
  workoutMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  workoutMetaText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  workoutBody: { borderTopWidth: 1, marginTop: 12, paddingTop: 4 },
  groupLabel: { fontSize: 14, fontFamily: 'Inter_700Bold', marginBottom: 6 },
  moveRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: 1 },
  moveDot: { width: 6, height: 6, borderRadius: 3 },
  moveText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  nextEventRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nextEventIconBg: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  nextEventTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  nextEventMeta: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  countdownPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  countdownText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#fff' },
  emptyEvent: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 6 },
  emptyEventText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  ringGrid: { flexDirection: 'row', gap: 10 },
  ringCard: { flex: 1, borderRadius: 14, paddingVertical: 16, alignItems: 'center', gap: 4 },
  ringValue: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  ringUnit: { fontSize: 10, fontFamily: 'Inter_600SemiBold', marginTop: -2 },
  ringLabel: { fontSize: 12, fontFamily: 'Inter_700Bold', marginTop: 6 },
  ringSub: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  workoutStatCard: { justifyContent: 'center' },
  workoutStatIconBg: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  mealCard: { borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  mealIconBg: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  mealLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  mealName: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  mealKcal: { fontSize: 14, fontFamily: 'Inter_700Bold' },
});
