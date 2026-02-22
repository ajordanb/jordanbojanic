import { getAPIURL } from '@/api/apiUrl';
import type { TokenDecodedData } from '@/contexts/auth/model';

const apiUrl = getAPIURL();

async function _formPostRequest(
  url: string,
  body: Record<string, any>,
): Promise<unknown> {
  const formData = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) {
    formData.append(key, value.toString());
  }

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const response = await fetch(apiUrl + url, {
    method: 'POST',
    headers,
    body: formData,
  });
  let data;
  try {
    data = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return null;
  }
  if (!response.ok) {
    const errorMessage =
      data.detail || data.message || data.error?.message || 'Network response was not ok';
    throw new Error(errorMessage);
  }

  return data;
}

async function _jsonPostRequest(
  url: string,
  body: Record<string, any>,
): Promise<unknown> {
  const response = await fetch(apiUrl + url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    let errorMessage = 'Network response was not ok';
    try {
      const data = await response.json();
      errorMessage = data.detail || data.message || data.error?.message || errorMessage;
    } catch {
      // Response body is not JSON, use default message
    }
    throw new Error(errorMessage);
  }
  return await response.json();
}

function decodeToken(token: string): TokenDecodedData {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(window.atob(base64));
}

async function _postRequest(
  url: string,
  body: Record<string, any>,
  token?: string | null,
  params?: Record<string, any>,
): Promise<Response> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const req_url = params ? apiUrl + url + '?' + new URLSearchParams(params) : apiUrl + url;
  return fetch(req_url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

async function _getRequest(
  url: string,
  token?: string | null,
  params?: Record<string, any>,
): Promise<Response> {
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const req_url = params ? apiUrl + url + '?' + new URLSearchParams(params) : apiUrl + url;
  return fetch(req_url, {
    method: 'GET',
    headers,
  });
}

async function _putRequest(
  url: string,
  body: Record<string, any>,
  token?: string | null,
  params?: Record<string, any>,
): Promise<Response> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const req_url = params ? apiUrl + url + '?' + new URLSearchParams(params) : apiUrl + url;
  return fetch(req_url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
}

async function _deleteRequest(
  url: string,
  token?: string | null,
  params?: Record<string, any>,
): Promise<Response> {
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const req_url = params ? apiUrl + url + '?' + new URLSearchParams(params) : apiUrl + url;
  return fetch(req_url, {
    method: 'DELETE',
    headers,
  });
}

export {
  _formPostRequest,
  _jsonPostRequest,
  decodeToken,
  _postRequest,
  _getRequest,
  _putRequest,
  _deleteRequest,
};
