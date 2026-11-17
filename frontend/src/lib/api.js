// Cliente HTTP da API REST. Todas as telas usam esta função.

export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(status, code, message, details = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  // Converte details [{field, message}] em { campo: mensagem } para os formulários
  fieldErrors() {
    return Object.fromEntries(this.details.map((d) => [d.field, d.message]));
  }
}

let authToken = null;
let unauthorizedHandler = null;

export function setAuthToken(token) {
  authToken = token;
}

export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

export async function api(path, { method = 'GET', body, auth = false, signal } = {}) {
  const headers = {};
  if (body !== undefined && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (auth && authToken) headers.Authorization = `Bearer ${authToken}`;

  let response;
  try {
    response = await fetch(API_URL + path, {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK', 'Não foi possível conectar ao servidor. Verifique sua internet.');
  }

  if (response.status === 204) return null;

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = data?.error || {};
    if (response.status === 401 && auth && unauthorizedHandler) unauthorizedHandler();
    throw new ApiError(response.status, error.code || 'HTTP_ERROR', error.message || 'Erro inesperado', error.details || []);
  }
  return data;
}

// Upload com barra de progresso (fetch não informa progresso de envio, por isso XHR)
export function uploadImage(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append('image', file);

    xhr.open('POST', `${API_URL}/api/uploads`);
    if (authToken) xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      const data = JSON.parse(xhr.responseText || 'null');
      if (xhr.status >= 200 && xhr.status < 300) return resolve(data);
      if (xhr.status === 401) unauthorizedHandler?.();
      reject(new ApiError(xhr.status, data?.error?.code, data?.error?.message || 'Falha no envio da imagem'));
    };
    xhr.onerror = () => reject(new ApiError(0, 'NETWORK', 'Falha de conexão ao enviar a imagem'));
    xhr.send(form);
  });
}

// Imagens com caminho relativo (/seed-images, /uploads) são servidas pela API
export function assetUrl(url) {
  if (!url) return null;
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  return API_URL + url;
}
