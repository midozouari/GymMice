import {
  ApiError,
  customFetch,
  getSafeApiErrorMessage,
  ResponseParseError,
  TransportError,
} from '@workspace/api-client-react';

type MockResponseOptions = {
  ok?: boolean;
  status?: number;
  statusText?: string;
  text?: () => Promise<string>;
};

function response({
  ok = true,
  status = 200,
  statusText = 'OK',
  text = async () => '{"status":"ok"}',
}: MockResponseOptions = {}): Response {
  return {
    ok,
    status,
    statusText,
    headers: new Headers({ 'content-type': 'application/json' }),
    body: undefined,
    url: 'https://secret.example/api/health',
    text,
  } as unknown as Response;
}

describe('shared API transport', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.useRealTimers();
  });

  it('times out a request after the default ten seconds without retrying', async () => {
    const fetchMock = jest.fn(() => new Promise<Response>(() => undefined));
    globalThis.fetch = fetchMock as typeof fetch;

    const result = customFetch('/api/health', { responseType: 'json' });
    jest.advanceTimersByTime(10_000);

    await expect(result).rejects.toMatchObject({
      name: 'TransportError',
      kind: 'timeout',
      message: 'The request timed out.',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the timeout active while the response body is being parsed', async () => {
    globalThis.fetch = jest.fn(async () =>
      response({ text: () => new Promise<string>(() => undefined) }),
    ) as typeof fetch;

    const result = customFetch('/api/health', { responseType: 'json' });
    await Promise.resolve();
    jest.advanceTimersByTime(10_000);

    await expect(result).rejects.toMatchObject({
      kind: 'timeout',
    });
  });

  it('cleans up its timer and caller abort listener after parsing', async () => {
    const caller = new AbortController();
    const removeListener = jest.spyOn(caller.signal, 'removeEventListener');
    globalThis.fetch = jest.fn(async () => response()) as typeof fetch;

    await expect(
      customFetch('/api/health', {
        responseType: 'json',
        signal: caller.signal,
      }),
    ).resolves.toEqual({ status: 'ok' });

    expect(jest.getTimerCount()).toBe(0);
    expect(removeListener).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  it('preserves a caller signal that was already aborted', async () => {
    const caller = new AbortController();
    caller.abort();
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as typeof fetch;

    await expect(
      customFetch('/api/private', { signal: caller.signal }),
    ).rejects.toEqual(expect.objectContaining({
      name: 'TransportError',
      kind: 'cancelled',
      message: 'The request was cancelled.',
    }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('respects the signal carried by a Request when options omit a signal', async () => {
    const caller = new AbortController();
    const request = new Request('https://example.test/api/health', {
      signal: caller.signal,
    });
    globalThis.fetch = jest.fn(
      () => new Promise<Response>(() => undefined),
    ) as typeof fetch;

    const result = customFetch(request);
    caller.abort();

    await expect(result).rejects.toMatchObject({ kind: 'cancelled' });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('cancels an in-flight request when the caller aborts', async () => {
    const caller = new AbortController();
    globalThis.fetch = jest.fn(
      () => new Promise<Response>(() => undefined),
    ) as typeof fetch;

    const result = customFetch('/api/health', { signal: caller.signal });
    caller.abort();

    await expect(result).rejects.toBeInstanceOf(TransportError);
    await expect(result).rejects.toMatchObject({ kind: 'cancelled' });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('classifies fetch rejection as a safe network failure and does not retry', async () => {
    const secret = 'https://secret.example/api?token=do-not-show';
    const fetchMock = jest.fn(async () => {
      throw new Error(`Failed to fetch ${secret}\ninternal stack`);
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const result = customFetch(secret);

    await expect(result).rejects.toEqual(expect.objectContaining({
      name: 'TransportError',
      kind: 'network',
      message: 'The network request failed.',
    }));
    await expect(result).rejects.not.toThrow(secret);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry a failed mutation', async () => {
    const fetchMock = jest.fn(async () => {
      throw new Error('mutation network failure');
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await expect(customFetch('/api/items', {
      method: 'POST',
      body: '{"name":"item"}',
    })).rejects.toMatchObject({ kind: 'network' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses only allowlisted client text for nested B04 errors', async () => {
    const maliciousMessage = 'MALICIOUS_SENTINEL https://secret.example/raw';
    const envelope = {
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: maliciousMessage,
        requestId: 'request-id',
      },
    };
    globalThis.fetch = jest.fn(async () =>
      response({
        ok: false,
        status: 503,
        statusText: 'body and URL must not appear',
        text: async () => JSON.stringify(envelope),
      }),
    ) as typeof fetch;

    const result = customFetch('/api/health', { responseType: 'json' });

    await expect(result).rejects.toBeInstanceOf(ApiError);
    await expect(result).rejects.toMatchObject({
      status: 503,
      data: envelope,
      message:
        'Request failed with status 503. The service is temporarily unavailable. Please try again.',
    });
    await expect(result).rejects.not.toThrow(maliciousMessage);
    expect(getSafeApiErrorMessage(envelope)).not.toContain(maliciousMessage);
    expect(getSafeApiErrorMessage({
      error: { code: 'UNKNOWN', message: maliciousMessage },
    })).toBe('The request could not be completed.');
    expect(getSafeApiErrorMessage({
      error: { code: '__proto__', message: maliciousMessage },
    })).toBe('The request could not be completed.');
    expect(getSafeApiErrorMessage({
      error: { code: 'constructor', message: maliciousMessage },
    })).toBe('The request could not be completed.');
    expect(getSafeApiErrorMessage({ message: maliciousMessage }))
      .toBe('The request could not be completed.');
  });

  it('treats malformed JSON error responses as parse failures', async () => {
    const rawBody = '{"error":{"code":"SERVICE_UNAVAILABLE"';
    globalThis.fetch = jest.fn(async () =>
      response({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: async () => rawBody,
      }),
    ) as typeof fetch;

    const result = customFetch('/api/health', { responseType: 'json' });

    await expect(result).rejects.toBeInstanceOf(ResponseParseError);
    await expect(result).rejects.toMatchObject({
      status: 503,
      message: 'Response with status 503 could not be parsed as JSON.',
      rawBody,
    });
    await expect(result).rejects.not.toBeInstanceOf(ApiError);
  });

  it('reports malformed JSON without including its URL, body, or parser detail', async () => {
    const rawBody = '{"secret":"do-not-show"';
    globalThis.fetch = jest.fn(async () =>
      response({ text: async () => rawBody }),
    ) as typeof fetch;

    const result = customFetch('https://secret.example/api/health', {
      responseType: 'json',
    });

    await expect(result).rejects.toBeInstanceOf(ResponseParseError);
    await expect(result).rejects.toMatchObject({
      message: 'Response with status 200 could not be parsed as JSON.',
      rawBody,
    });
    await expect(result).rejects.not.toThrow('secret.example');
    await expect(result).rejects.not.toThrow('do-not-show');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('cleans up timeout and listener after a failed response', async () => {
    const caller = new AbortController();
    const removeListener = jest.spyOn(caller.signal, 'removeEventListener');
    globalThis.fetch = jest.fn(async () =>
      response({
        ok: false,
        status: 500,
        text: async () => '{"error":{"code":"INTERNAL_ERROR"}}',
      }),
    ) as typeof fetch;

    await expect(customFetch('/api/health', {
      signal: caller.signal,
    })).rejects.toBeInstanceOf(ApiError);

    expect(jest.getTimerCount()).toBe(0);
    expect(removeListener).toHaveBeenCalledWith('abort', expect.any(Function));
  });
});