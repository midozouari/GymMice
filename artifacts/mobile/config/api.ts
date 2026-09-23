import { setBaseUrl } from '@workspace/api-client-react';

export type ApiOriginConfig =
  | { origin: string; error: null }
  | { origin: null; error: string };

const ORIGIN_PATTERN = /^(https?):\/\/(\[[0-9a-f:.]+\]|[^/?#\\@:]+)(?::([0-9]{1,5}))?\/?$/i;

function isLocalDevelopmentHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host === '::1') return true;

  const octets = host.split('.').map(Number);
  if (
    octets.length !== 4 ||
    octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) return false;

  return (
    octets[0] === 127 ||
    octets[0] === 10 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168) ||
    (octets[0] === 169 && octets[1] === 254)
  );
}

export function validateApiOrigin(
  value: string | undefined,
  isDevelopment = typeof __DEV__ !== 'undefined' && __DEV__,
): ApiOriginConfig {
  if (!value) {
    return { origin: null, error: 'API address is not configured.' };
  }

  if (value !== value.trim()) {
    return { origin: null, error: 'API address is invalid.' };
  }

  if (!ORIGIN_PATTERN.test(value)) {
    return { origin: null, error: 'API address is invalid.' };
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { origin: null, error: 'API address is invalid.' };
  }

  const localHttp =
    isDevelopment &&
    url.protocol === 'http:' &&
    isLocalDevelopmentHost(url.hostname);
  const validScheme = url.protocol === 'https:' || localHttp;
  const isOriginOnly =
    url.pathname === '/' &&
    url.search === '' &&
    url.hash === '' &&
    url.username === '' &&
    url.password === '';

  if (!validScheme || !url.hostname || !isOriginOnly) {
    return { origin: null, error: 'API address is invalid.' };
  }

  return { origin: url.origin, error: null };
}

export function configureApiOrigin(value = process.env.EXPO_PUBLIC_API_ORIGIN): ApiOriginConfig {
  const config = validateApiOrigin(value);
  setBaseUrl(config.origin);
  return config;
}

export const apiOriginConfig = configureApiOrigin();