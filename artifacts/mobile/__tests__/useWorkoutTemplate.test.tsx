import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  selectWorkoutTemplate,
  useWorkoutTemplate,
  validateWorkoutTemplateDetail,
  validateWorkoutTemplateList,
} from '@/hooks/useWorkoutTemplate';
import { apiOriginConfig } from '@/config/api';
import { useAPIConnectivity } from '@/context/APIConnectivityContext';
import {
  setBaseUrl,
  useGetWorkoutTemplate,
  useListWorkoutTemplates,
} from '@workspace/api-client-react';

jest.mock('@/config/api', () => ({
  apiOriginConfig: { origin: 'https://api.example.com', error: null },
}));
jest.mock('@/context/APIConnectivityContext', () => ({ useAPIConnectivity: jest.fn() }));
jest.mock('@workspace/api-client-react', () => {
  const actual = jest.requireActual('@workspace/api-client-react');
  return {
    ...actual,
    useListWorkoutTemplates: jest.fn(actual.useListWorkoutTemplates),
    useGetWorkoutTemplate: jest.fn(actual.useGetWorkoutTemplate),
  };
});

const actualApiClient = jest.requireActual<typeof import('@workspace/api-client-react')>(
  '@workspace/api-client-react',
);
const PUSH_ID = '123e4567-e89b-42d3-a456-426614174000';
const PULL_ID = '223e4567-e89b-42d3-a456-426614174000';
const EXERCISE_ONE = '323e4567-e89b-42d3-a456-426614174000';
const EXERCISE_TWO = '423e4567-e89b-42d3-a456-426614174000';
const listRefetch = jest.fn(async () => ({}));
const detailRefetch = jest.fn(async () => ({}));
const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function actualHookImplementations() {
  jest.mocked(useListWorkoutTemplates).mockImplementation(
    actualApiClient.useListWorkoutTemplates as typeof useListWorkoutTemplates,
  );
  jest.mocked(useGetWorkoutTemplate).mockImplementation(
    actualApiClient.useGetWorkoutTemplate as typeof useGetWorkoutTemplate,
  );
  setBaseUrl('https://api.example.com');
}

function queryWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return { client, Wrapper };
}

function requestUrl(input: unknown): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return (input as { url: string }).url;
}

function listResult(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    error: null,
    isError: false,
    isPending: false,
    isFetching: false,
    refetch: listRefetch,
    ...overrides,
  } as unknown as ReturnType<typeof useListWorkoutTemplates>;
}

function detailResult(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    error: null,
    isError: false,
    isPending: false,
    isFetching: false,
    refetch: detailRefetch,
    ...overrides,
  } as unknown as ReturnType<typeof useGetWorkoutTemplate>;
}

describe('useWorkoutTemplate', () => {
  beforeEach(() => {
    globalThis.fetch = originalFetch;
    (apiOriginConfig as { origin: string | null }).origin = 'https://api.example.com';
    listRefetch.mockClear();
    detailRefetch.mockClear();
    jest.mocked(useAPIConnectivity).mockReturnValue({
      status: 'connected',
      message: 'Connected',
      retry: jest.fn(),
      isRetrying: false,
      canRetry: true,
    });
    jest.mocked(useListWorkoutTemplates).mockReturnValue(listResult({ isPending: true }));
    jest.mocked(useGetWorkoutTemplate).mockReturnValue(detailResult({ isPending: true }));
  });

  it('does not enable requests or retry when API configuration is invalid', async () => {
    (apiOriginConfig as { origin: string | null }).origin = null;
    const { result } = renderHook(() => useWorkoutTemplate());

    expect(jest.mocked(useListWorkoutTemplates).mock.calls[0][0]?.query?.enabled).toBe(false);
    expect(jest.mocked(useGetWorkoutTemplate).mock.calls[0][1]?.query?.enabled).toBe(false);
    expect(result.current.status).toBe('error');
    expect(result.current.canRefresh).toBe(false);
    await act(async () => result.current.refresh());
    expect(listRefetch).not.toHaveBeenCalled();
  });

  it('selects push-day deterministically and preserves ordered IDs and muscle groups', () => {
    const parsed = validateWorkoutTemplateList({
      items: [
        { id: PULL_ID, slug: 'pull-day', name: 'Pull Day', durationSeconds: 1800, exerciseCount: 1 },
        { id: PUSH_ID, slug: 'push-day', name: 'Push Day', durationSeconds: 3301, exerciseCount: 2 },
      ],
    });
    const selected = selectWorkoutTemplate(parsed.items);
    expect(selected?.id).toBe(PUSH_ID);

    const detail = validateWorkoutTemplateDetail({
      id: PUSH_ID,
      slug: 'push-day',
      name: 'Push Day Updated',
      durationSeconds: 3301,
      exercises: [
        { id: EXERCISE_TWO, name: 'Fly', muscleGroup: 'Chest', position: 2 },
        { id: EXERCISE_ONE, name: 'Press', muscleGroup: 'Chest', position: 0 },
      ],
    }, selected!);
    expect(detail.exerciseIds).toEqual([EXERCISE_ONE, EXERCISE_TWO]);
    expect(detail.exercises[0].moves.map((move) => move.name)).toEqual(['Press', 'Fly']);
    expect(detail.durationMinutes).toBe(55);
    expect(detail.name).toBe('Push Day Updated');
  });

  it('returns empty and rejects malformed successful responses safely', () => {
    expect(selectWorkoutTemplate(validateWorkoutTemplateList({ items: [] }).items)).toBeNull();
    expect(() => validateWorkoutTemplateList({
      items: [{ id: 'not-a-uuid', slug: 'push-day', name: 'unsafe', durationSeconds: 1, exerciseCount: 0 }],
    })).toThrow();
    const summary = { id: PUSH_ID, slug: 'push-day', name: 'Push Day', durationSeconds: 60, exerciseCount: 2 };
    expect(() => validateWorkoutTemplateDetail({
      id: PUSH_ID,
      slug: 'push-day',
      name: 'Push Day',
      durationSeconds: 60,
      exercises: [
        { id: EXERCISE_ONE, name: 'Press', muscleGroup: 'Chest', position: 0 },
        { id: EXERCISE_ONE, name: 'Fly', muscleGroup: 'Chest', position: 1 },
      ],
    }, summary)).toThrow();
    expect(() => validateWorkoutTemplateDetail({
      id: PUSH_ID,
      slug: 'push-day',
      name: 'Push Day',
      durationSeconds: 60,
      exercises: [
        { id: EXERCISE_ONE, name: 'Press', muscleGroup: 'Chest', position: 0 },
        { id: EXERCISE_TWO, name: 'Fly', muscleGroup: 'Chest', position: 0 },
      ],
    }, summary)).toThrow();
  });

  it('refreshes both the list and the selected detail, including the same id', async () => {
    const summary = { id: PUSH_ID, slug: 'push-day', name: 'Push Day', durationSeconds: 3300, exerciseCount: 0 };
    jest.mocked(useListWorkoutTemplates).mockReturnValue(listResult({ data: { items: [summary] } }));
    jest.mocked(useGetWorkoutTemplate).mockReturnValue(detailResult({
      data: {
        id: PUSH_ID,
        slug: 'push-day',
        name: 'Push Day',
        durationMinutes: 55,
        exerciseCount: 0,
        exerciseIds: [],
        muscles: [],
        exercises: [],
      },
    }));
    const { result } = renderHook(() => useWorkoutTemplate());

    await act(async () => result.current.refresh());
    expect(listRefetch).toHaveBeenCalledWith({ cancelRefetch: false });
    expect(detailRefetch).toHaveBeenCalledWith({ cancelRefetch: false });
    expect(jest.mocked(useGetWorkoutTemplate).mock.calls.at(-1)?.[0]).toBe(PUSH_ID);
  });

  it('accepts changed detail data when the selected id stays the same', () => {
    const summary = { id: PUSH_ID, slug: 'push-day', name: 'Push Day', durationSeconds: 3300, exerciseCount: 0 };
    jest.mocked(useListWorkoutTemplates).mockReturnValue(listResult({ data: { items: [summary] } }));
    renderHook(() => useWorkoutTemplate());
    const select = jest.mocked(useGetWorkoutTemplate).mock.calls.at(-1)?.[1]?.query?.select as
      | ((value: unknown) => { name: string; id: string })
      | undefined;

    expect(select?.({
      id: PUSH_ID,
      slug: 'push-day',
      name: 'Renamed Push Day',
      durationSeconds: 3600,
      exercises: [],
    })).toMatchObject({ id: PUSH_ID, name: 'Renamed Push Day' });
  });

  it('does not gate catalog loading when the health check is unreachable', () => {
    jest.mocked(useAPIConnectivity).mockReturnValue({
      status: 'unreachable',
      message: 'unreachable',
      retry: jest.fn(),
      isRetrying: false,
      canRetry: true,
    });
    renderHook(() => useWorkoutTemplate());
    expect(jest.mocked(useListWorkoutTemplates).mock.calls[0][0]?.query?.enabled).toBe(true);
    expect(jest.mocked(useListWorkoutTemplates).mock.calls[0][0]?.query?.retry).toBe(false);
  });

  it('uses the actual generated hooks to request the list once, then its selected detail', async () => {
    actualHookImplementations();
    const fetchMock = jest.fn(async (input: unknown) => {
      const url = requestUrl(input);
      if (url.endsWith('/api/workout-templates')) {
        return jsonResponse({ items: [
          { id: PUSH_ID, slug: 'push-day', name: 'Push Day', durationSeconds: 3300, exerciseCount: 99 },
        ] });
      }
      if (url.endsWith(`/api/workout-templates/${PUSH_ID}`)) {
        return jsonResponse({
          id: PUSH_ID,
          slug: 'push-day',
          name: 'Push Day',
          durationSeconds: 3300,
          exercises: [{ id: EXERCISE_ONE, name: 'Press', muscleGroup: 'Chest', position: 0 }],
        });
      }
      throw new Error('Unexpected request');
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { client, Wrapper } = queryWrapper();
    const { result, unmount } = renderHook(() => useWorkoutTemplate(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.workout).toMatchObject({ name: 'Push Day', exerciseCount: 1 });
    expect(fetchMock.mock.calls.filter(([input]) =>
      requestUrl(input) === 'https://api.example.com/api/workout-templates')).toHaveLength(1);
    expect(fetchMock.mock.calls.map(([input]) => requestUrl(input))).toEqual([
      'https://api.example.com/api/workout-templates',
      `https://api.example.com/api/workout-templates/${PUSH_ID}`,
    ]);
    unmount();
    client.clear();
  });

  it('refreshes actual list and same-UUID detail requests and displays changed data', async () => {
    actualHookImplementations();
    let listCalls = 0;
    let detailCalls = 0;
    const fetchMock = jest.fn(async (input: unknown) => {
      const url = requestUrl(input);
      if (url.endsWith('/api/workout-templates')) {
        listCalls += 1;
        return jsonResponse({ items: [
          { id: PUSH_ID, slug: 'push-day', name: 'Push Day', durationSeconds: 3300, exerciseCount: 1 },
        ] });
      }
      detailCalls += 1;
      return jsonResponse({
        id: PUSH_ID,
        slug: 'push-day',
        name: detailCalls === 1 ? 'Push Day' : 'Updated Push Day',
        durationSeconds: detailCalls === 1 ? 3300 : 3600,
        exercises: [{ id: EXERCISE_ONE, name: 'Press', muscleGroup: 'Chest', position: 0 }],
      });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { client, Wrapper } = queryWrapper();
    const { result, unmount } = renderHook(() => useWorkoutTemplate(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => result.current.refresh());
    await waitFor(() => expect(result.current.workout?.name).toBe('Updated Push Day'));
    expect(result.current.workout?.durationMinutes).toBe(60);
    expect(listCalls).toBe(2);
    expect(detailCalls).toBe(2);
    unmount();
    client.clear();
  });

  it('loads a newly selected detail when a refreshed list changes selection', async () => {
    actualHookImplementations();
    let listCalls = 0;
    const fetchMock = jest.fn(async (input: unknown) => {
      const url = requestUrl(input);
      if (url.endsWith('/api/workout-templates')) {
        listCalls += 1;
        const item = listCalls === 1
          ? { id: PUSH_ID, slug: 'push-day', name: 'Push Day', durationSeconds: 3300, exerciseCount: 0 }
          : { id: PULL_ID, slug: 'pull-day', name: 'Pull Day', durationSeconds: 2700, exerciseCount: 0 };
        return jsonResponse({ items: [item] });
      }
      const pull = url.endsWith(PULL_ID);
      return jsonResponse({
        id: pull ? PULL_ID : PUSH_ID,
        slug: pull ? 'pull-day' : 'push-day',
        name: pull ? 'Pull Day' : 'Push Day',
        durationSeconds: pull ? 2700 : 3300,
        exercises: [],
      });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { client, Wrapper } = queryWrapper();
    const { result, unmount } = renderHook(() => useWorkoutTemplate(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.workout?.id).toBe(PUSH_ID));

    await act(async () => result.current.refresh());
    await waitFor(() => expect(result.current.workout?.id).toBe(PULL_ID));
    expect(fetchMock.mock.calls.some(([input]) => requestUrl(input).endsWith(`/api/workout-templates/${PULL_ID}`))).toBe(true);
    unmount();
    client.clear();
  });

  it('shows empty after an actual refreshed list becomes empty', async () => {
    actualHookImplementations();
    let listCalls = 0;
    const fetchMock = jest.fn(async (input: unknown) => {
      const url = requestUrl(input);
      if (url.endsWith('/api/workout-templates')) {
        listCalls += 1;
        return jsonResponse({
          items: listCalls === 1
            ? [{ id: PUSH_ID, slug: 'push-day', name: 'Push Day', durationSeconds: 3300, exerciseCount: 0 }]
            : [],
        });
      }
      return jsonResponse({
        id: PUSH_ID,
        slug: 'push-day',
        name: 'Push Day',
        durationSeconds: 3300,
        exercises: [],
      });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { client, Wrapper } = queryWrapper();
    const { result, unmount } = renderHook(() => useWorkoutTemplate(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => result.current.refresh());
    await waitFor(() => expect(result.current.status).toBe('empty'));
    expect(result.current.workout).toBeNull();
    unmount();
    client.clear();
  });

  it('makes no actual generated-hook network request when configuration is invalid', async () => {
    actualHookImplementations();
    (apiOriginConfig as { origin: string | null }).origin = null;
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { client, Wrapper } = queryWrapper();
    const { result, unmount } = renderHook(() => useWorkoutTemplate(), { wrapper: Wrapper });

    expect(result.current.status).toBe('error');
    await act(async () => result.current.refresh());
    expect(fetchMock).not.toHaveBeenCalled();
    unmount();
    client.clear();
  });
});