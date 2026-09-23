import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';
import {
  ApiError,
  ResponseParseError,
  TransportError,
  getHealthCheckQueryKey,
  useHealthCheck,
  type HealthStatus,
} from '@workspace/api-client-react';
import { apiOriginConfig } from '@/config/api';

export type APIConnectivityStatus =
  | 'checking'
  | 'connected'
  | 'offline'
  | 'unreachable'
  | 'misconfigured';

type APIConnectivityContextValue = {
  status: APIConnectivityStatus;
  message: string;
  retry: () => void;
  isRetrying: boolean;
  canRetry: boolean;
};

const APIConnectivityContext = createContext<APIConnectivityContextValue | null>(null);
const RETRYABLE_STATUS = new Set([502, 503, 504]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const API_CODE_MESSAGES: Record<string, string> = {
  INVALID_REQUEST: 'The API request was rejected.',
  INVALID_JSON: 'The API request was rejected.',
  PAYLOAD_TOO_LARGE: 'The API request was rejected.',
  UNSUPPORTED_MEDIA_TYPE: 'The API request was rejected.',
  VALIDATION_ERROR: 'The API request was rejected.',
  NOT_FOUND: 'The API request was rejected.',
  INTERNAL_ERROR: 'The API server reported an error.',
  SERVICE_UNAVAILABLE: 'The API is temporarily unavailable.',
};

class HealthResponseError extends Error {
  readonly name = 'HealthResponseError';
}

export function shouldRetryHealthCheck(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  if (error instanceof TransportError) {
    return error.kind === 'timeout' || error.kind === 'network';
  }
  if (error instanceof ApiError) {
    return RETRYABLE_STATUS.has(error.status);
  }
  return false;
}

export function healthRetryDelay(attempt: number): number {
  return Math.min(250 * 2 ** attempt, 1000);
}

export function validateHealthStatus(data: HealthStatus): HealthStatus {
  if (!data || typeof data !== 'object' || data.status !== 'ok') {
    throw new HealthResponseError('The API returned an invalid health response.');
  }
  return data;
}

function getErrorEnvelope(error: ApiError<unknown>): Record<string, unknown> | null {
  const body = error.data;
  if (!body || typeof body !== 'object') return null;
  const envelope = (body as Record<string, unknown>).error;
  return envelope && typeof envelope === 'object'
    ? envelope as Record<string, unknown>
    : null;
}

function getRequestId(envelope: Record<string, unknown> | null): string | null {
  const requestId = envelope?.requestId;
  return typeof requestId === 'string' && UUID_PATTERN.test(requestId) ? requestId : null;
}

export function getHealthErrorMessage(error: unknown): string {
  let message: string;
  if (error instanceof TransportError) {
    if (error.kind === 'timeout') message = 'The connection timed out.';
    else if (error.kind === 'cancelled') message = 'The connection check was cancelled.';
    else message = 'The API is unreachable.';
  } else if (error instanceof ResponseParseError || error instanceof HealthResponseError) {
    message = 'The API returned an invalid response.';
  } else if (error instanceof ApiError) {
    const envelope = getErrorEnvelope(error);
    const code = envelope?.code;
    const codeMessage = typeof code === 'string' && Object.hasOwn(API_CODE_MESSAGES, code)
      ? API_CODE_MESSAGES[code] : undefined;
    if (codeMessage) message = codeMessage;
    else if (RETRYABLE_STATUS.has(error.status)) message = 'The API is temporarily unavailable.';
    else if (error.status >= 500) message = 'The API server reported an error.';
    else if (error.status >= 400) message = 'The API request was rejected.';
    else message = 'The API request failed.';
    const requestId = getRequestId(envelope);
    if (requestId) message += ` Request ID: ${requestId}.`;
  } else {
    message = 'The API is unreachable.';
  }
  return message;
}

function readBrowserOnline(): boolean | null {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return null;
  return typeof navigator.onLine === 'boolean' ? navigator.onLine : null;
}

export function APIConnectivityProvider({ children }: { children: React.ReactNode }) {
  const [browserOnline, setBrowserOnline] = useState<boolean | null>(readBrowserOnline);
  const configured = apiOriginConfig.origin !== null;
  const query = useHealthCheck({
    query: {
      queryKey: getHealthCheckQueryKey(),
      enabled: configured && browserOnline !== false,
      retry: shouldRetryHealthCheck,
      retryDelay: healthRetryDelay,
      select: validateHealthStatus,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  });
  const queryRef = useRef(query);
  queryRef.current = query;
  const browserOnlineRef = useRef(browserOnline);
  browserOnlineRef.current = browserOnline;

  const triggerRefetch = useCallback(() => {
    const current = queryRef.current;
    if (
      !configured ||
      browserOnlineRef.current === false ||
      current.isFetching
    ) return;
    void current.refetch({ cancelRefetch: false });
  }, [configured]);

  const retry = useCallback(() => {
    triggerRefetch();
  }, [triggerRefetch]);

  useEffect(() => {
    if (
      Platform.OS !== 'web' ||
      typeof window === 'undefined' ||
      typeof window.addEventListener !== 'function'
    ) return;
    const updateOnline = () => {
      const next = readBrowserOnline();
      const wasOffline = browserOnlineRef.current === false;
      browserOnlineRef.current = next;
      setBrowserOnline(next);
      if (wasOffline && next !== false) triggerRefetch();
    };
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, [triggerRefetch]);

  useEffect(() => {
    let previousState = AppState.currentState;
    const subscription = AppState.addEventListener('change', (nextState) => {
      const resumed = previousState !== 'active' && nextState === 'active';
      previousState = nextState;
      if (resumed) triggerRefetch();
    });
    return () => subscription.remove();
  }, [triggerRefetch]);

  let status: APIConnectivityStatus;
  let message: string;
  if (!configured) {
    status = 'misconfigured';
    message = apiOriginConfig.error ?? 'API address is not configured.';
  } else if (browserOnline === false) {
    status = 'offline';
    message = 'You are offline.';
  } else if (query.isError) {
    status = 'unreachable';
    message = getHealthErrorMessage(query.error);
  } else if (query.data?.status === 'ok') {
    status = 'connected';
    message = 'Connected';
  } else {
    status = 'checking';
    message = 'Checking connection…';
  }

  const value = useMemo<APIConnectivityContextValue>(
    () => ({
      status,
      message,
      retry,
      isRetrying: query.isFetching,
      canRetry:
        configured &&
        browserOnline !== false &&
        !query.isFetching,
    }),
    [browserOnline, configured, message, query.error, query.isFetching, retry, status],
  );

  return (
    <APIConnectivityContext.Provider value={value}>
      {children}
    </APIConnectivityContext.Provider>
  );
}

export function useAPIConnectivity(): APIConnectivityContextValue {
  const context = useContext(APIConnectivityContext);
  if (!context) {
    throw new Error('useAPIConnectivity must be used within APIConnectivityProvider');
  }
  return context;
}