import { healthCheck, setBaseUrl } from '@workspace/api-client-react';
import { configureApiOrigin, validateApiOrigin } from '@/config/api';

describe('API origin configuration', () => {
  afterEach(() => {
    setBaseUrl(null);
    jest.restoreAllMocks();
  });

  it.each([
    [undefined, false, false],
    ['', false, false],
    ['https://user:pass@example.com', false, false],
    ['https://example.com@', false, false],
    ['https://@example.com', false, false],
    ['https://example.com/api', false, false],
    ['https://example.com?', false, false],
    ['https://example.com#', false, false],
    ['https://example.com?debug=1', false, false],
    ['https://example.com#fragment', false, false],
    ['https://example.com/a/..', false, false],
    ['https://example.com\\api', false, false],
    ['ftp://example.com', false, false],
    ['http://example.com', true, false],
    ['http://localhost:3000', false, false],
    ['http://localhost:3000', true, true],
    ['http://10.20.30.40:3000', true, true],
    ['http://172.20.1.5:3000/', true, true],
    ['http://192.168.1.25:3000', true, true],
    ['http://172.32.1.5:3000', true, false],
    ['http://8.8.8.8:3000', true, false],
    ['https://api.example.com:8443/', false, true],
  ])('validates %s (development: %s)', (value, isDevelopment, expectedValid) => {
    expect(validateApiOrigin(value, isDevelopment).origin !== null).toBe(expectedValid);
  });

  it('normalizes a trailing root slash and configures the generated client', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('stop after capturing the URL'));

    expect(configureApiOrigin('https://api.example.com:8443/')).toEqual({
      origin: 'https://api.example.com:8443',
      error: null,
    });

    await expect(healthCheck()).rejects.toBeDefined();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com:8443/api/healthz',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('clears the generated client base URL for invalid configuration', () => {
    expect(configureApiOrigin('https://api.example.com/api').origin).toBeNull();
  });
});