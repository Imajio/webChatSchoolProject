import { useCallback } from 'react';

const API_BASE = (() => {
  if (typeof window !== 'undefined' && window.__APP_CONFIG__?.apiBase) {
    return window.__APP_CONFIG__.apiBase;
  }
  if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_BASE) {
    return process.env.REACT_APP_API_BASE;
  }
  return '';
})();

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);
const CSRF_COOKIE_NAME = 'csrftoken';

function getCookie(name) {
  if (typeof document === 'undefined') {
    return null;
  }
  const prefix = `${name}=`;
  const cookie = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  if (!cookie) {
    return null;
  }
  return decodeURIComponent(cookie.slice(prefix.length));
}

function getCsrfToken() {
  return getCookie(CSRF_COOKIE_NAME);
}

export function useApi() {
  const request = useCallback(async (path, options = {}) => {
    const { headers = {}, body, ...rest } = options;
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const computedHeaders = { Accept: 'application/json', ...headers };
    // Only set Content-Type when sending a body (and not FormData)
    if (body && !isFormData && !computedHeaders['Content-Type']) {
      computedHeaders['Content-Type'] = 'application/json';
    }
    const config = {
      credentials: 'include',
      headers: computedHeaders,
      ...rest,
    };

    if (body && !isFormData && config.headers['Content-Type'] === 'application/json' && typeof body !== 'string') {
      config.body = JSON.stringify(body);
    } else if (body) {
      if (isFormData && config.headers['Content-Type']) {
        delete config.headers['Content-Type'];
      }
      config.body = body;
    }

    const method = (config.method || (body ? 'POST' : 'GET')).toUpperCase();
    config.method = method;

    if (!SAFE_METHODS.has(method)) {
      const csrfToken = getCsrfToken();
      if (csrfToken && !config.headers['X-CSRFToken']) {
        config.headers['X-CSRFToken'] = csrfToken;
      }
    }

    const response = await fetch(`${API_BASE}${path}`, config);
    if (response.status === 204) {
      return null;
    }

    let data = null;
    const text = await response.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (error) {
        data = text;
      }
    }

    if (!response.ok) {
      const detail = data && data.detail ? data.detail : response.statusText;
      throw new Error(detail || 'Request failed');
    }

    return data;
  }, []);

  return { request };
}
