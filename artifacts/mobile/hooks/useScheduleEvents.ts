import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BASE_EVENTS, CUSTOM_EVENTS_STORAGE_KEY, DELETED_EVENT_IDS_STORAGE_KEY, ScheduleEvent,
} from '@/constants/scheduleData';

// Read-only view of the same merged event set app/schedule.tsx manages
// (base/mock events + locally-created events, minus deleted ids). Screens
// that only need to *read* the schedule (e.g. the Home dashboard's "Today's
// Workout" and "Next Event" cards) should use this instead of duplicating
// the load logic — mutation (add/delete) still lives in app/schedule.tsx.
export function useScheduleEvents() {
  const [customEvents, setCustomEvents] = useState<ScheduleEvent[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      AsyncStorage.getItem(CUSTOM_EVENTS_STORAGE_KEY),
      AsyncStorage.getItem(DELETED_EVENT_IDS_STORAGE_KEY),
    ]).then(([rawEvents, rawDeleted]) => {
      if (cancelled) return;
      if (rawEvents) {
        try { setCustomEvents(JSON.parse(rawEvents)); } catch { /* ignore malformed cache */ }
      }
      if (rawDeleted) {
        try { setDeletedIds(JSON.parse(rawDeleted)); } catch { /* ignore malformed cache */ }
      }
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  const allEvents = useMemo(
    () => [...BASE_EVENTS, ...customEvents].filter(e => !deletedIds.includes(e.id)),
    [customEvents, deletedIds],
  );

  return { allEvents, loaded };
}
