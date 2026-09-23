import React from 'react';
import { Platform, Text } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClient } from '@tanstack/react-query';
import {
  APIConnectivityProvider,
  getHealthErrorMessage,
  healthRetryDelay,
  shouldRetryHealthCheck,
  useAPIConnectivity,
  validateHealthStatus,
} from '@/context/APIConnectivityContext';
import { ApiError, ResponseParseError, TransportError, useHealthCheck } from '@workspace/api-client-react';

jest.mock('@/config/api', () => ({
  apiOriginConfig: { origin: 'https://api.example.com', error: null },
}));

jest.mock('@workspace/api-client-react', () => {
  class MockTransportError extends Error {
    kind: 'timeout' | 'network' | 'cancelled';
    constructor(errorKind: 'timeout' | 'network' | 'cancelled') {
      super(errorKind);
      this.kind = errorKind;
    }
  }
  class MockApiError extends Error {
    status = 500;
  }
  class MockResponseParseError extends Error {}
  return {
    useHealthCheck: jest.fn(),
    getHealthCheckQueryKey: () => ['/api/healthz'],
    TransportError: MockTransportError,
    ApiError: MockApiError,
    ResponseParseError: MockResponseParseError,
  };
});

function Consumer() {
  const connection = useAPIConnectivity();
  return (
    <>
      <Text testID="status">{connection.status}</Text>
      <Text testID="message">{connection.message}</Text>
      <Text testID="retry" onPress={connection.retry}>retry</Text>
    </>
  );
}

const refetch = jest.fn();
const originalPlatformOS = Platform.OS;
const transportError = (kind: 'timeout' | 'network' | 'cancelled') =>
  Object.assign(Object.create(TransportError.prototype), { kind });
const apiError = (status: number, data: unknown = null) =>
  Object.assign(Object.create(ApiError.prototype), { status, data });
const parseError = () => Object.create(ResponseParseError.prototype);

function setQuery(overrides: Record<string, unknown> = {}) {
  jest.mocked(useHealthCheck).mockReturnValue({
    data: undefined,
    error: null,
    isError: false,
    isFetching: false,
    refetch,
    ...overrides,
  } as unknown as ReturnType<typeof useHealthCheck>);
}

describe('APIConnectivityProvider', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatformOS });
    refetch.mockReset();
    setQuery();
  });

  it('reports checking, connected, malformed and unreachable states', () => {
    const view = render(<APIConnectivityProvider><Consumer /></APIConnectivityProvider>);
    expect(screen.getByTestId('status')).toHaveTextContent('checking');

    setQuery({ data: { status: 'ok' } });
    view.rerender(<APIConnectivityProvider><Consumer /></APIConnectivityProvider>);
    expect(screen.getByTestId('status')).toHaveTextContent('connected');

    setQuery({ isError: true, error: parseError() });
    view.rerender(<APIConnectivityProvider><Consumer /></APIConnectivityProvider>);
    expect(screen.getByTestId('status')).toHaveTextContent('unreachable');
    expect(screen.getByTestId('message')).toHaveTextContent('The API returned an invalid response.');

    expect(() => validateHealthStatus({ status: 'bad' } as never)).toThrow(
      'The API returned an invalid health response.',
    );
  });

  it('manually retries once and ignores presses while a request is active', () => {
    setQuery({ isError: true, error: apiError(400) });
    const view = render(<APIConnectivityProvider><Consumer /></APIConnectivityProvider>);
    fireEvent.press(screen.getByTestId('retry'));
    expect(refetch).toHaveBeenCalledWith({ cancelRefetch: false });

    setQuery({ isError: true, isFetching: true, error: transportError('network') });
    view.rerender(<APIConnectivityProvider><Consumer /></APIConnectivityProvider>);
    fireEvent.press(screen.getByTestId('retry'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('reports browser offline state without making a health request eligible', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    Object.defineProperty(globalThis.navigator, 'onLine', { configurable: true, value: false });

    render(<APIConnectivityProvider><Consumer /></APIConnectivityProvider>);

    expect(screen.getByTestId('status')).toHaveTextContent('offline');
    expect(jest.mocked(useHealthCheck).mock.calls.at(-1)?.[0]?.query?.enabled).toBe(false);
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatformOS });
  });

  it('refetches once when the browser reconnects even with fresh cached data', () => {
    const listeners: Record<string, () => void> = {};
    const addEventListener = jest.fn((name: string, listener: () => void) => {
      listeners[name] = listener;
    });
    const removeEventListener = jest.fn();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    Object.defineProperty(globalThis.navigator, 'onLine', { configurable: true, value: true });
    Object.defineProperty(globalThis.window, 'addEventListener', {
      configurable: true,
      value: addEventListener,
    });
    Object.defineProperty(globalThis.window, 'removeEventListener', {
      configurable: true,
      value: removeEventListener,
    });
    setQuery({ data: { status: 'ok' } });
    const view = render(<APIConnectivityProvider><Consumer /></APIConnectivityProvider>);

    Object.defineProperty(globalThis.navigator, 'onLine', { configurable: true, value: false });
    act(() => listeners.offline());
    expect(screen.getByTestId('status')).toHaveTextContent('offline');

    Object.defineProperty(globalThis.navigator, 'onLine', { configurable: true, value: true });
    act(() => {
      listeners.online();
      listeners.online();
    });
    expect(refetch).toHaveBeenCalledTimes(1);

    view.unmount();
    expect(removeEventListener).toHaveBeenCalledTimes(2);
    Object.defineProperty(globalThis.window, 'addEventListener', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(globalThis.window, 'removeEventListener', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatformOS });
  });

  it('only retries transient health failures at most twice', () => {
    expect(shouldRetryHealthCheck(0, transportError('timeout'))).toBe(true);
    expect(shouldRetryHealthCheck(1, transportError('network'))).toBe(true);
    expect(shouldRetryHealthCheck(2, transportError('network'))).toBe(false);
    expect(shouldRetryHealthCheck(0, transportError('cancelled'))).toBe(false);

    expect(shouldRetryHealthCheck(0, apiError(503))).toBe(true);
    expect(shouldRetryHealthCheck(0, apiError(400))).toBe(false);
    expect(shouldRetryHealthCheck(0, parseError())).toBe(false);
    expect(healthRetryDelay(0)).toBe(250);
    expect(healthRetryDelay(1)).toBe(500);
  });

  it('enforces the retry cap through QueryClient execution', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retryDelay: 0 } },
    });
    const queryFn = jest.fn(async () => {
      throw transportError('network');
    });

    await expect(client.fetchQuery({
      queryKey: ['health-retry-cap'],
      queryFn,
      retry: shouldRetryHealthCheck,
      retryDelay: 0,
    })).rejects.toBeDefined();

    expect(queryFn).toHaveBeenCalledTimes(3);
    client.clear();
  });

  it('uses only safe static error messages and validated request IDs', () => {
    expect(getHealthErrorMessage(transportError('timeout'))).toBe('The connection timed out.');
    expect(getHealthErrorMessage(parseError())).toBe('The API returned an invalid response.');
    expect(getHealthErrorMessage(apiError(400, {
      error: { code: 'NOT_FOUND', message: 'unsafe server text', requestId: 'not-a-uuid' },
    }))).toBe('The API request was rejected.');
    expect(getHealthErrorMessage(apiError(503, {
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'unsafe server text',
        requestId: '123e4567-e89b-42d3-a456-426614174000',
      },
    }))).toBe(
      'The API is temporarily unavailable. Request ID: 123e4567-e89b-42d3-a456-426614174000.',
    );
  });

  it('refetches once on native resume and cleans up its listener', () => {
    const listeners: Array<(state: string) => void> = [];
    const remove = jest.fn();
    const spy = jest.spyOn(require('react-native').AppState, 'addEventListener')
      .mockImplementation((...args: unknown[]) => {
        const listener = args[1] as (state: string) => void;
        listeners.push(listener);
        return { remove };
      });
    const view = render(<APIConnectivityProvider><Consumer /></APIConnectivityProvider>);
    act(() => {
      listeners[0]('background');
      listeners[0]('active');
      listeners[0]('active');
    });
    expect(refetch).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(remove).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});