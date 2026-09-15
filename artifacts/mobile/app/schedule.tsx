import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import TopBar from '@/components/TopBar';
import { useTheme } from '@/context/ThemeContext';
import {
  BASE_EVENTS, CATEGORIES, CATEGORY_META, EventCategory, ScheduleEvent,
  GRID_START_HOUR, GRID_END_HOUR, HOUR_HEIGHT, TIME_OPTIONS,
  WEEKDAY_LABELS, WEEKDAY_LABELS_FULL, MONTH_LABELS,
  CUSTOM_EVENTS_STORAGE_KEY, DELETED_EVENT_IDS_STORAGE_KEY,
  addDays, minutesToLabel, monthGridDates, startOfWeek, timeToMinutes, toISODate,
} from '@/constants/scheduleData';

const STORAGE_KEY = CUSTOM_EVENTS_STORAGE_KEY;
// IDs the user has deleted — including base/mock event IDs, which are
// regenerated on every load, so this is the only way a mock-event deletion
// can "stick" across app restarts without hardcoding exceptions.
const DELETED_STORAGE_KEY = DELETED_EVENT_IDS_STORAGE_KEY;
const DAY_COL_WIDTH = 108;
const HOUR_GUTTER = 44;
const GRID_HOURS = GRID_END_HOUR - GRID_START_HOUR;
const GRID_HEIGHT = GRID_HOURS * HOUR_HEIGHT;

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

export default function ScheduleScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 44) : insets.top;
  const botPad = Platform.OS === 'web' ? Math.max(insets.bottom, 34) : insets.bottom;

  const [view, setView] = useState<'week' | 'month'>('week');
  const [customEvents, setCustomEvents] = useState<ScheduleEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  // The rolling week always starts on this date and runs 7 consecutive
  // calendar days forward — it is NOT the Monday of the current week. It only
  // changes when the user presses "Today" (or on mount), never by scrolling.
  const [weekStart, setWeekStart] = useState<Date>(() => new Date());
  const [monthAnchor, setMonthAnchor] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [slotPrefill, setSlotPrefill] = useState<{ date: Date; startTime: string; endTime: string } | null>(null);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [detailsEvent, setDetailsEvent] = useState<ScheduleEvent | null>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const headerScrollRef = useRef<ScrollView>(null);
  const bodyScrollRef = useRef<ScrollView>(null);
  const vScrollRef = useRef<ScrollView>(null);
  const today = new Date();

  // Auto-scroll the timeline vertically to a sensible position (near the
  // current time) whenever the week view becomes visible, instead of forcing
  // the user to start scrolling from midnight every time. This is purely
  // vertical — today's column is always the leftmost day by construction
  // (see weekDates below), so no horizontal auto-scroll is needed at all.
  useEffect(() => {
    if (view !== 'week') return;
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const vTarget = Math.max(((mins - GRID_START_HOUR * 60) / 60) * HOUR_HEIGHT - 160, 0);
    const t = setTimeout(() => vScrollRef.current?.scrollTo({ y: vTarget, animated: false }), 50);
    return () => clearTimeout(t);
  }, [view]);

  // Load / persist locally-created events, plus the set of deleted event IDs.
  // This is a lightweight MVP store — swapping this for a real backend or a
  // Google/Apple sync later only requires changing this load/save pair, not
  // the rest of the screen.
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(DELETED_STORAGE_KEY),
    ]).then(([rawEvents, rawDeleted]) => {
      if (rawEvents) {
        try { setCustomEvents(JSON.parse(rawEvents)); } catch { /* ignore malformed cache */ }
      }
      if (rawDeleted) {
        try { setDeletedIds(JSON.parse(rawDeleted)); } catch { /* ignore malformed cache */ }
      }
      setLoaded(true);
    });
  }, []);
  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(customEvents));
  }, [customEvents, loaded]);
  useEffect(() => {
    if (loaded) AsyncStorage.setItem(DELETED_STORAGE_KEY, JSON.stringify(deletedIds));
  }, [deletedIds, loaded]);

  // Base (mock) events are regenerated fresh on every load, so "deleting" one
  // just means it's excluded here going forward — the deletion itself is what
  // persists, not the event list.
  const allEvents = useMemo(
    () => [...BASE_EVENTS, ...customEvents].filter(e => !deletedIds.includes(e.id)),
    [customEvents, deletedIds],
  );
  const eventsByDate = useMemo(() => {
    const map: Record<string, ScheduleEvent[]> = {};
    for (const e of allEvents) {
      (map[e.date] ||= []).push(e);
    }
    for (const key of Object.keys(map)) map[key].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    return map;
  }, [allEvents]);

  // Rolling 7-day range: today + the next 6 consecutive calendar days, in
  // chronological order. This is generated fresh from weekStart every render
  // — never a fixed Monday–Sunday array — so today is always column 0 and no
  // horizontal scrolling is ever needed to reach it. Works across week/month/
  // year boundaries for free since it's just addDays on a real Date.
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekdayLabel = (d: Date) => WEEKDAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1];

  const switchView = (v: 'week' | 'month') => {
    if (v === view) return;
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setView(v), 120);
  };

  const goToday = () => {
    const now = new Date();
    setWeekStart(now);
    setMonthAnchor(now);
    setSelectedDate(now);
    const mins = now.getHours() * 60 + now.getMinutes();
    const vTarget = Math.max(((mins - GRID_START_HOUR * 60) / 60) * HOUR_HEIGHT - 160, 0);
    // Today is always column 0 in the rolling range, so just reset the
    // horizontal scroll to the start — no index math needed.
    requestAnimationFrame(() => {
      bodyScrollRef.current?.scrollTo({ x: 0, animated: true });
      headerScrollRef.current?.scrollTo({ x: 0, animated: true });
      vScrollRef.current?.scrollTo({ y: vTarget, animated: true });
    });
  };

  // Tapping an empty timeline slot opens the Add Event modal pre-filled with
  // that day + a rounded start time (nearest half hour) and a +1h default end.
  const handleSlotPress = (day: Date, hourIndex: number, locationY: number) => {
    const hour = GRID_START_HOUR + hourIndex;
    const minute = locationY < HOUR_HEIGHT / 2 ? 0 : 30;
    const startMinutes = clamp(hour * 60 + minute, 0, 23 * 60 + 30);
    const endMinutes = Math.min(startMinutes + 60, 23 * 60 + 59);
    setSlotPrefill({ date: day, startTime: minutesToLabel(startMinutes), endTime: minutesToLabel(endMinutes) });
    setShowAdd(true);
  };

  const onBodyScroll = (e: any) => {
    headerScrollRef.current?.scrollTo({ x: e.nativeEvent.contentOffset.x, animated: false });
  };

  // Current-time indicator position within the grid (null if outside range)
  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  const nowTop = nowMinutes >= GRID_START_HOUR * 60 && nowMinutes <= GRID_END_HOUR * 60
    ? ((nowMinutes - GRID_START_HOUR * 60) / 60) * HOUR_HEIGHT
    : null;

  const addEvent = (e: Omit<ScheduleEvent, 'id' | 'source'>) => {
    setCustomEvents(prev => [...prev, { ...e, id: `local-${Date.now()}`, source: 'local' }]);
  };

  // Marks an event ID as deleted (persisted) and drops it from customEvents if
  // present. Works uniformly for both user-created and base/mock events.
  const deleteEvent = (id: string) => {
    setDeletedIds(prev => (prev.includes(id) ? prev : [...prev, id]));
    setCustomEvents(prev => prev.filter(e => e.id !== id));
  };

  // React Native's Alert.alert has no dialog implementation on web (react-native-web
  // renders nothing), so branch to the browser's native confirm() there.
  const confirmDeleteEvent = (event: ScheduleEvent) => {
    const doDelete = () => { deleteEvent(event.id); setDetailsEvent(null); };
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Delete this event? This action cannot be undone.')) {
        doDelete();
      }
      return;
    }
    Alert.alert(
      'Delete this event?',
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ],
      { cancelable: true },
    );
  };

  const monthDates = useMemo(() => monthGridDates(monthAnchor), [monthAnchor]);
  const selectedDayEvents = eventsByDate[toISODate(selectedDate)] || [];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TopBar title="Schedule" showBack right={
        <TouchableOpacity onPress={() => { setSlotPrefill(null); setShowAdd(true); }} style={[styles.addBtn, { backgroundColor: theme.accent }]} activeOpacity={0.8}>
          <Feather name="plus" size={16} color="#fff" />
        </TouchableOpacity>
      } />

      {/* View switch + Today button */}
      <View style={[styles.controlsRow, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={[styles.segment, { backgroundColor: theme.inputBackground }]}>
          {(['week', 'month'] as const).map(v => (
            <TouchableOpacity key={v} onPress={() => switchView(v)} activeOpacity={0.8}
              style={[styles.segmentBtn, { backgroundColor: view === v ? theme.accent : 'transparent' }]}>
              <Text style={[styles.segmentText, { color: view === v ? '#fff' : theme.secondaryText }]}>{v === 'week' ? 'Week' : 'Month'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={goToday} activeOpacity={0.7} style={[styles.todayBtn, { borderColor: theme.border }]}>
          <Feather name="calendar" size={13} color={theme.primary} />
          <Text style={[styles.todayBtnText, { color: theme.primary }]}>Today</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {view === 'week' ? (
          <View style={{ flex: 1 }}>
            {/* Day header row — horizontally synced with the grid below, stays fixed while the grid scrolls vertically */}
            <View style={[styles.weekHeaderRow, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
              <View style={{ width: HOUR_GUTTER }} />
              <ScrollView ref={headerScrollRef} horizontal showsHorizontalScrollIndicator={false} scrollEnabled={false}>
                {weekDates.map((d, i) => {
                  const isToday = toISODate(d) === toISODate(today);
                  const isSelected = toISODate(d) === toISODate(selectedDate);
                  return (
                    <TouchableOpacity key={i} onPress={() => setSelectedDate(d)} activeOpacity={0.7}
                      style={[styles.dayHeaderCell, { width: DAY_COL_WIDTH },
                        isToday && { backgroundColor: theme.accent + '18' },
                        isSelected && !isToday && { borderBottomWidth: 2, borderBottomColor: theme.primary }]}>
                      <Text style={[styles.dayHeaderLabel, { color: isToday ? theme.accent : theme.secondaryText }]}>{weekdayLabel(d)}</Text>
                      <Text style={[styles.dayHeaderNum, { color: isToday ? theme.accent : theme.primaryText }]}>{d.getDate()}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Timeline grid */}
            <ScrollView ref={vScrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: botPad + 24 }}>
              <View style={{ flexDirection: 'row' }}>
                <View style={{ width: HOUR_GUTTER, height: GRID_HEIGHT }}>
                  {Array.from({ length: GRID_HOURS }, (_, i) => GRID_START_HOUR + i).map(h => (
                    <Text key={h} style={[styles.hourLabel, { top: i_top(h), color: theme.mutedText }]}>{`${String(h).padStart(2, '0')}:00`}</Text>
                  ))}
                </View>
                <ScrollView ref={bodyScrollRef} horizontal showsHorizontalScrollIndicator={false} onScroll={onBodyScroll} scrollEventThrottle={16}>
                  {weekDates.map((d, i) => {
                    const iso = toISODate(d);
                    const isToday = iso === toISODate(today);
                    const dayEvents = eventsByDate[iso] || [];
                    return (
                      <View key={i} style={[styles.dayCol, { width: DAY_COL_WIDTH, height: GRID_HEIGHT, borderLeftColor: theme.chartGrid, backgroundColor: isToday ? theme.accent + '08' : 'transparent' }]}>
                        {Array.from({ length: GRID_HOURS }, (_, hi) => (
                          <TouchableOpacity
                            key={hi}
                            activeOpacity={0.6}
                            style={[styles.hourCell, { height: HOUR_HEIGHT, borderTopColor: theme.chartGrid }]}
                            onPress={(evt) => handleSlotPress(d, hi, evt.nativeEvent.locationY)}
                          />
                        ))}
                        {dayEvents.map(e => {
                          const meta = CATEGORY_META[e.category];
                          const startMin = clamp(timeToMinutes(e.startTime), GRID_START_HOUR * 60, GRID_END_HOUR * 60);
                          const endMin = clamp(timeToMinutes(e.endTime), GRID_START_HOUR * 60, GRID_END_HOUR * 60);
                          const top = ((startMin - GRID_START_HOUR * 60) / 60) * HOUR_HEIGHT;
                          const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 26);
                          return (
                            <TouchableOpacity key={e.id} activeOpacity={0.85}
                              onPress={() => setDetailsEvent(e)}
                              style={[styles.eventBlock, { top, height, backgroundColor: meta.tint, borderLeftColor: meta.color }]}>
                              <Text style={[styles.eventBlockTitle, { color: meta.color }]} numberOfLines={height > 40 ? 2 : 1}>{e.title}</Text>
                              {height > 36 && (
                                <Text style={[styles.eventBlockTime, { color: theme.secondaryText }]} numberOfLines={1}>{e.startTime}–{e.endTime}</Text>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                        {isToday && nowTop !== null && (
                          <View style={[styles.nowLine, { top: nowTop }]}>
                            <View style={styles.nowDot} />
                          </View>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            </ScrollView>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: botPad + 24 }}>
            {/* Month navigation */}
            <View style={styles.monthNavRow}>
              <TouchableOpacity onPress={() => setMonthAnchor(addDays(monthAnchor, -30))} style={[styles.monthNavBtn, { borderColor: theme.border, backgroundColor: theme.surface }]} activeOpacity={0.7}>
                <Feather name="chevron-left" size={18} color={theme.primaryText} />
              </TouchableOpacity>
              <Text style={[styles.monthNavTitle, { color: theme.primaryText }]}>{MONTH_LABELS[monthAnchor.getMonth()]} {monthAnchor.getFullYear()}</Text>
              <TouchableOpacity onPress={() => setMonthAnchor(addDays(monthAnchor, 30))} style={[styles.monthNavBtn, { borderColor: theme.border, backgroundColor: theme.surface }]} activeOpacity={0.7}>
                <Feather name="chevron-right" size={18} color={theme.primaryText} />
              </TouchableOpacity>
            </View>

            <View style={styles.monthWeekLabels}>
              {WEEKDAY_LABELS.map(l => <Text key={l} style={[styles.monthWeekLabelText, { color: theme.secondaryText }]}>{l}</Text>)}
            </View>

            <View style={styles.monthGrid}>
              {monthDates.map((d, i) => {
                const iso = toISODate(d);
                const inMonth = d.getMonth() === monthAnchor.getMonth();
                const isToday = iso === toISODate(today);
                const isSelected = iso === toISODate(selectedDate);
                const hasEvents = (eventsByDate[iso] || []).length > 0;
                return (
                  <TouchableOpacity key={i} onPress={() => setSelectedDate(d)} activeOpacity={0.7}
                    style={[styles.monthCell,
                      isSelected && { backgroundColor: theme.accent },
                      isToday && !isSelected && { borderWidth: 1.5, borderColor: theme.accent }]}>
                    <Text style={[styles.monthCellText,
                      { color: isSelected ? '#fff' : !inMonth ? theme.mutedText : isToday ? theme.accent : theme.primaryText }]}>
                      {d.getDate()}
                    </Text>
                    {hasEvents && (
                      <View style={[styles.monthDot, { backgroundColor: isSelected ? '#fff' : theme.primary }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Selected day's events */}
            <View style={styles.selectedDayHeader}>
              <Text style={[styles.selectedDayTitle, { color: theme.primaryText }]}>
                {selectedDate.toDateString() === today.toDateString() ? 'Today' : `${WEEKDAY_LABELS[selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1]}, ${MONTH_LABELS[selectedDate.getMonth()]} ${selectedDate.getDate()}`}
              </Text>
            </View>
            <View style={{ gap: 10 }}>
              {selectedDayEvents.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.mutedText }]}>No events scheduled.</Text>
              ) : selectedDayEvents.map(e => (
                <EventRow key={e.id} event={e} onPress={() => setDetailsEvent(e)} />
              ))}
            </View>
          </ScrollView>
        )}
      </Animated.View>

      <AddEventModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={addEvent}
        initialDate={slotPrefill?.date ?? selectedDate}
        initialStartTime={slotPrefill?.startTime}
        initialEndTime={slotPrefill?.endTime}
      />

      <EventDetailsModal
        event={detailsEvent}
        onClose={() => setDetailsEvent(null)}
        onDelete={confirmDeleteEvent}
      />
    </View>
  );
}

// Positions hour labels so each sits centered on its gridline (top border of the
// corresponding hour cell), and the final label sits at the very bottom edge.
function i_top(h: number) {
  return (h - GRID_START_HOUR) * HOUR_HEIGHT - 7;
}

function EventRow({ event, onPress }: { event: ScheduleEvent; onPress?: () => void }) {
  const meta = CATEGORY_META[event.category];
  const theme = useTheme();
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}
      style={[styles.eventRow, { backgroundColor: meta.tint, borderLeftColor: meta.color }]}>
      <View style={[styles.eventRowIcon, { backgroundColor: meta.color }]}>
        <Feather name={meta.icon} size={15} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.eventRowTitle, { color: theme.primaryText }]}>{event.title}</Text>
        <Text style={[styles.eventRowTime, { color: meta.color }]}>{event.startTime} – {event.endTime}</Text>
        {event.notes ? <Text style={[styles.eventRowNotes, { color: theme.secondaryText }]} numberOfLines={2}>{event.notes}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

// ── Event Details Modal ──────────────────────────────────────────────────────
function EventDetailsModal({ event, onClose, onDelete }: {
  event: ScheduleEvent | null;
  onClose: () => void;
  onDelete: (event: ScheduleEvent) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  if (!event) return null;
  const meta = CATEGORY_META[event.category];
  const dateObj = new Date(`${event.date}T00:00:00`);
  const dow = dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1;
  const dateLabel = `${WEEKDAY_LABELS_FULL[dow]}, ${MONTH_LABELS[dateObj.getMonth()]} ${dateObj.getDate()}`;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <TouchableOpacity style={[styles.modalOverlay, { backgroundColor: theme.overlay }]} onPress={onClose} activeOpacity={1} />
        <View style={[styles.addSheet, { backgroundColor: theme.surface, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.addHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.addTitle, { color: theme.primaryText }]}>Event Details</Text>
            <TouchableOpacity onPress={onClose}><Feather name="x" size={20} color={theme.secondaryText} /></TouchableOpacity>
          </View>
          <View style={styles.addBody}>
            <View style={[styles.detailsCategoryBadge, { backgroundColor: meta.tint }]}>
              <Feather name={meta.icon} size={14} color={meta.color} />
              <Text style={[styles.detailsCategoryText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            <Text style={[styles.detailsTitle, { color: theme.primaryText }]}>{event.title}</Text>
            <View style={styles.detailsRow}>
              <Feather name="calendar" size={14} color={theme.secondaryText} />
              <Text style={[styles.detailsRowText, { color: theme.primaryText }]}>{dateLabel}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Feather name="clock" size={14} color={theme.secondaryText} />
              <Text style={[styles.detailsRowText, { color: theme.primaryText }]}>{event.startTime} – {event.endTime}</Text>
            </View>
            {event.notes ? (
              <View style={[styles.detailsNotesBox, { backgroundColor: theme.inputBackground }]}>
                <Text style={[styles.detailsNotesLabel, { color: theme.mutedText }]}>Notes</Text>
                <Text style={[styles.detailsNotesText, { color: theme.primaryText }]}>{event.notes}</Text>
              </View>
            ) : null}

            <TouchableOpacity onPress={() => onDelete(event)} activeOpacity={0.85} style={[styles.deleteBtn, { backgroundColor: theme.danger }]}>
              <Feather name="trash-2" size={16} color="#fff" />
              <Text style={styles.deleteBtnText}>Delete Event</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Add Event Modal ──────────────────────────────────────────────────────────
function AddEventModal({ visible, onClose, onSave, initialDate, initialStartTime, initialEndTime }: {
  visible: boolean;
  onClose: () => void;
  onSave: (e: Omit<ScheduleEvent, 'id' | 'source'>) => void;
  initialDate: Date;
  initialStartTime?: string;
  initialEndTime?: string;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState(initialStartTime || '09:00');
  const [endTime, setEndTime] = useState(initialEndTime || '10:00');
  const [category, setCategory] = useState<EventCategory>('gym');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  // Slot-tap prefill (date/start/end) is re-applied every time the modal opens;
  // the "+" button path passes undefined start/end so it falls back to defaults.
  useEffect(() => {
    if (visible) {
      setTitle(''); setDate(initialDate);
      setStartTime(initialStartTime || '09:00'); setEndTime(initialEndTime || '10:00');
      setCategory('gym'); setNotes(''); setError('');
    }
  }, [visible, initialDate, initialStartTime, initialEndTime]);

  // Clear any stale validation message once the user changes a relevant field,
  // so fixing the issue doesn't leave the old error text lingering on screen.
  useEffect(() => { setError(''); }, [title, startTime, endTime]);

  // Start from the Monday of the current week (not "today") so date chips still
  // cover earlier days of the week that a timeline slot-tap may have pre-filled.
  const dateOptions = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(startOfWeek(new Date()), i)), []);

  const save = () => {
    if (!title.trim()) { setError('Please enter a title.'); return; }
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) { setError('End time must be after start time.'); return; }
    onSave({ title: title.trim(), category, date: toISODate(date), startTime, endTime, notes: notes.trim() || undefined });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={[styles.modalOverlay, { backgroundColor: theme.overlay }]} onPress={onClose} activeOpacity={1} />
        <View style={[styles.addSheet, { backgroundColor: theme.surface, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.addHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.addTitle, { color: theme.primaryText }]}>Add Event</Text>
            <TouchableOpacity onPress={onClose}><Feather name="x" size={20} color={theme.secondaryText} /></TouchableOpacity>
          </View>
          <ScrollView ref={scrollRef} contentContainerStyle={styles.addBody} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>Title</Text>
            <TextInput
              value={title} onChangeText={setTitle}
              placeholder="e.g. Push Workout"
              placeholderTextColor={theme.mutedText}
              style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.primaryText }]}
              returnKeyType="next"
            />

            <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
              {dateOptions.map((d, i) => {
                const active = toISODate(d) === toISODate(date);
                return (
                  <TouchableOpacity key={i} onPress={() => setDate(d)} activeOpacity={0.8}
                    style={[styles.dateChip, { borderColor: active ? theme.accent : theme.border, backgroundColor: active ? theme.accent : theme.surface }]}>
                    <Text style={[styles.dateChipDay, { color: active ? '#fff' : theme.secondaryText }]}>{WEEKDAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1]}</Text>
                    <Text style={[styles.dateChipNum, { color: active ? '#fff' : theme.primaryText }]}>{d.getDate()}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.timeRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>Start time</Text>
                <TimePicker value={startTime} onChange={setStartTime} accent={theme.accent} theme={theme} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>End time</Text>
                <TimePicker value={endTime} onChange={setEndTime} accent={theme.accent} theme={theme} />
              </View>
            </View>

            <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map(c => {
                const meta = CATEGORY_META[c];
                const active = category === c;
                return (
                  <TouchableOpacity key={c} onPress={() => setCategory(c)} activeOpacity={0.8}
                    style={[styles.categoryChip, { borderColor: active ? meta.color : theme.border, backgroundColor: active ? meta.tint : theme.surface }]}>
                    <Feather name={meta.icon} size={14} color={meta.color} />
                    <Text style={[styles.categoryChipText, { color: active ? meta.color : theme.secondaryText }]}>{meta.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>Notes (optional)</Text>
            <TextInput
              value={notes} onChangeText={setNotes}
              placeholder="Add any details..."
              placeholderTextColor={theme.mutedText}
              style={[styles.input, styles.notesInput, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.primaryText }]}
              multiline
              returnKeyType="done"
              blurOnSubmit
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)}
            />

            {error ? <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text> : null}

            <TouchableOpacity onPress={save} activeOpacity={0.85} style={[styles.saveBtn, { backgroundColor: theme.accent }]}>
              <Text style={styles.saveBtnText}>Save Event</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function TimePicker({ value, onChange, accent, theme }: { value: string; onChange: (t: string) => void; accent: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
      {TIME_OPTIONS.map(t => {
        const active = t === value;
        return (
          <TouchableOpacity key={t} onPress={() => onChange(t)} activeOpacity={0.8}
            style={[styles.timeChip, { borderColor: active ? accent : theme.border, backgroundColor: active ? accent : theme.surface }]}>
            <Text style={[styles.timeChipText, { color: active ? '#fff' : theme.secondaryText }]}>{t}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  addBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  segment: { flexDirection: 'row', borderRadius: 10, padding: 3, gap: 2 },
  segmentBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8 },
  segmentText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  todayBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5 },
  todayBtnText: { fontSize: 12, fontFamily: 'Inter_700Bold' },

  // Week timeline
  weekHeaderRow: { flexDirection: 'row', borderBottomWidth: 1 },
  dayHeaderCell: { alignItems: 'center', paddingVertical: 10, gap: 2 },
  dayHeaderLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  dayHeaderNum: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  hourLabel: { position: 'absolute', left: 0, right: 6, textAlign: 'right', fontSize: 10.5, fontFamily: 'Inter_400Regular' },
  dayCol: { position: 'relative', borderLeftWidth: 1 },
  hourCell: { borderTopWidth: 1 },
  eventBlock: { position: 'absolute', left: 3, right: 3, borderRadius: 8, borderLeftWidth: 3, paddingHorizontal: 6, paddingVertical: 4, overflow: 'hidden' },
  eventBlockTitle: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  eventBlockTime: { fontSize: 9.5, fontFamily: 'Inter_400Regular', marginTop: 1 },
  nowLine: { position: 'absolute', left: 0, right: 0, height: 1.5, backgroundColor: '#E11D2E', flexDirection: 'row', alignItems: 'center' },
  nowDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#E11D2E', marginLeft: -3.5 },

  // Month view
  monthNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  monthNavBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  monthNavTitle: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  monthWeekLabels: { flexDirection: 'row', marginBottom: 6 },
  monthWeekLabelText: { flex: 1, textAlign: 'center', fontSize: 11, fontFamily: 'Inter_700Bold' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  monthCell: { width: '14.2857%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10, gap: 3 },
  monthCellText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  monthDot: { width: 5, height: 5, borderRadius: 3 },
  selectedDayHeader: { marginTop: 20, marginBottom: 10 },
  selectedDayTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', paddingVertical: 24 },

  eventRow: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 14, borderLeftWidth: 4, alignItems: 'flex-start' },
  eventRowIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  eventRowTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  eventRowTime: { fontSize: 12, fontFamily: 'Inter_700Bold', marginTop: 2 },
  eventRowNotes: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4 },

  // Add Event modal
  modalOverlay: { flex: 1 },
  addSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '88%' },
  addHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  addTitle: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  addBody: { padding: 20, gap: 8 },
  fieldLabel: { fontSize: 12.5, fontFamily: 'Inter_600SemiBold', marginBottom: 6, marginTop: 10 },
  input: { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Inter_400Regular' },
  notesInput: { height: 80, textAlignVertical: 'top', paddingTop: 12 },
  dateChip: { width: 52, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', gap: 2 },
  dateChipDay: { fontSize: 10.5, fontFamily: 'Inter_600SemiBold' },
  dateChipNum: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  timeRow: { flexDirection: 'row', gap: 14 },
  timeChip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5 },
  timeChipText: { fontSize: 12.5, fontFamily: 'Inter_700Bold' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5 },
  categoryChipText: { fontSize: 12.5, fontFamily: 'Inter_700Bold' },
  errorText: { fontSize: 12.5, fontFamily: 'Inter_600SemiBold', marginTop: 8 },
  saveBtn: { marginTop: 20, paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 15 },

  // Event Details modal
  detailsCategoryBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginBottom: 10 },
  detailsCategoryText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  detailsTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', marginBottom: 14 },
  detailsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  detailsRowText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  detailsNotesBox: { borderRadius: 12, padding: 12, marginTop: 6 },
  detailsNotesLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  detailsNotesText: { fontSize: 13.5, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, paddingVertical: 15, borderRadius: 14 },
  deleteBtnText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 15 },
});
