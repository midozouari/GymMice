import { useCallback, useMemo } from 'react';
import {
  ApiError,
  ResponseParseError,
  TransportError,
  getGetWorkoutTemplateQueryKey,
  getListWorkoutTemplatesQueryKey,
  getSafeApiErrorMessage,
  useGetWorkoutTemplate,
  useListWorkoutTemplates,
} from '@workspace/api-client-react';
import { apiOriginConfig } from '@/config/api';
import { useAPIConnectivity } from '@/context/APIConnectivityContext';
import type { TodaysWorkout, WorkoutTemplateSummary } from '@/constants/workoutData';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

class InvalidWorkoutTemplateResponseError extends Error {}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new InvalidWorkoutTemplateResponseError();
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, maximum: number): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > maximum) {
    throw new InvalidWorkoutTemplateResponseError();
  }
  return value;
}

function uuid(value: unknown): string {
  const result = text(value, 36);
  if (!UUID.test(result)) throw new InvalidWorkoutTemplateResponseError();
  return result;
}

function integer(value: unknown, minimum: number, maximum = Number.MAX_SAFE_INTEGER): number {
  if (!Number.isInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new InvalidWorkoutTemplateResponseError();
  }
  return value as number;
}

export function validateWorkoutTemplateList(value: unknown): { items: WorkoutTemplateSummary[] } {
  const source = record(value);
  if (!Array.isArray(source.items) || source.items.length > 100) {
    throw new InvalidWorkoutTemplateResponseError();
  }
  return {
    items: source.items.map((item) => {
      const entry = record(item);
      const slug = text(entry.slug, 80);
      if (!SLUG.test(slug)) throw new InvalidWorkoutTemplateResponseError();
      return {
        id: uuid(entry.id),
        slug,
        name: text(entry.name, 120),
        durationSeconds: integer(entry.durationSeconds, 1, 86400),
        exerciseCount: integer(entry.exerciseCount, 0),
      };
    }),
  };
}

export function selectWorkoutTemplate(items: WorkoutTemplateSummary[]): WorkoutTemplateSummary | null {
  return items.find((item) => item.slug === 'push-day') ?? items[0] ?? null;
}

export function validateWorkoutTemplateDetail(
  value: unknown,
  summary: WorkoutTemplateSummary,
): TodaysWorkout {
  const source = record(value);
  const id = uuid(source.id);
  const slug = text(source.slug, 80);
  if (!SLUG.test(slug) || id !== summary.id || !Array.isArray(source.exercises) || source.exercises.length > 1000) {
    throw new InvalidWorkoutTemplateResponseError();
  }

  const exercises = source.exercises.map((item, index) => {
    const entry = record(item);
    return {
      id: uuid(entry.id),
      name: text(entry.name, 120),
      muscleGroup: text(entry.muscleGroup, 60),
      position: integer(entry.position, 0),
      index,
    };
  }).sort((a, b) => a.position - b.position || a.index - b.index);
  if (
    new Set(exercises.map((exercise) => exercise.id)).size !== exercises.length
    || new Set(exercises.map((exercise) => exercise.position)).size !== exercises.length
  ) {
    throw new InvalidWorkoutTemplateResponseError();
  }

  const groups: TodaysWorkout['exercises'] = [];
  for (const exercise of exercises) {
    let group = groups.find((candidate) => candidate.group === exercise.muscleGroup);
    if (!group) {
      group = { group: exercise.muscleGroup, moves: [] };
      groups.push(group);
    }
    group.moves.push({ id: exercise.id, name: exercise.name });
  }

  return {
    id,
    slug,
    name: text(source.name, 120),
    durationMinutes: Math.max(1, Math.round(integer(source.durationSeconds, 1, 86400) / 60)),
    exerciseCount: exercises.length,
    exerciseIds: exercises.map((exercise) => exercise.id),
    muscles: groups.map((group) => group.group),
    exercises: groups,
  };
}

export function getWorkoutTemplateErrorMessage(error: unknown): string {
  if (error instanceof InvalidWorkoutTemplateResponseError || error instanceof ResponseParseError) {
    return 'Workout template data could not be loaded safely.';
  }
  if (error instanceof TransportError) {
    return error.kind === 'timeout'
      ? 'The workout template request timed out.'
      : 'Workout templates are unavailable. Check your connection and try again.';
  }
  if (error instanceof ApiError) return getSafeApiErrorMessage(error.data);
  return 'Workout templates are unavailable. Please try again.';
}

export type WorkoutTemplateState = {
  workout: TodaysWorkout | null;
  status: 'loading' | 'refreshing' | 'ready' | 'empty' | 'error';
  errorMessage: string | null;
  refresh: () => Promise<void>;
  canRefresh: boolean;
};

export function useWorkoutTemplate(): WorkoutTemplateState {
  const connectivity = useAPIConnectivity();
  const enabled = apiOriginConfig.origin !== null
    && connectivity.status !== 'offline'
    && connectivity.status !== 'misconfigured';

  const list = useListWorkoutTemplates({
    query: {
      queryKey: getListWorkoutTemplatesQueryKey(),
      enabled,
      retry: false,
      refetchOnMount: 'always',
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      select: validateWorkoutTemplateList,
    },
  });
  const selected = selectWorkoutTemplate(list.data?.items ?? []);
  const detail = useGetWorkoutTemplate<TodaysWorkout>(selected?.id ?? '', {
    query: {
      queryKey: getGetWorkoutTemplateQueryKey(selected?.id ?? ''),
      enabled: enabled && selected !== null,
      retry: false,
      refetchOnMount: 'always',
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      select: (data) => {
        if (!selected) throw new InvalidWorkoutTemplateResponseError();
        return validateWorkoutTemplateDetail(data, selected);
      },
    },
  });

  const fetching = list.isFetching || detail.isFetching;
  const refresh = useCallback(async () => {
    if (!enabled || fetching) return;
    const requests: Promise<unknown>[] = [list.refetch({ cancelRefetch: false })];
    if (selected) requests.push(detail.refetch({ cancelRefetch: false }));
    await Promise.all(requests);
  }, [detail, enabled, fetching, list, selected]);

  return useMemo(() => {
    if (!enabled) {
      return {
        workout: null,
        status: 'error' as const,
        errorMessage: connectivity.status === 'offline'
          ? 'You are offline. Connect to the internet to load workout templates.'
          : 'Workout templates are unavailable because the API is not configured.',
        refresh,
        canRefresh: false,
      };
    }
    if (list.isError) {
      return { workout: null, status: 'error' as const, errorMessage: getWorkoutTemplateErrorMessage(list.error), refresh, canRefresh: !fetching };
    }
    if (list.isPending) {
      return { workout: null, status: 'loading' as const, errorMessage: null, refresh, canRefresh: false };
    }
    if (!selected) {
      return { workout: null, status: 'empty' as const, errorMessage: null, refresh, canRefresh: !fetching };
    }
    if (detail.isError) {
      return { workout: null, status: 'error' as const, errorMessage: getWorkoutTemplateErrorMessage(detail.error), refresh, canRefresh: !fetching };
    }
    if (detail.isPending || !detail.data) {
      return { workout: null, status: 'loading' as const, errorMessage: null, refresh, canRefresh: false };
    }
    return {
      workout: detail.data,
      status: fetching ? 'refreshing' as const : 'ready' as const,
      errorMessage: null,
      refresh,
      canRefresh: !fetching,
    };
  }, [connectivity.status, detail.data, detail.error, detail.isError, detail.isPending, enabled, fetching, list.error, list.isError, list.isPending, refresh, selected]);
}