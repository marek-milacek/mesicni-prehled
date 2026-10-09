/**
 * API klient – veřejné rozhraní pro UI.
 * Podporuje dva režimy: "mock" (simulovaný backend) a "remote" (fetch).
 * UI volá výhradně funkce tohoto modulu.
 */

import { handleRequest } from './mockServer.js';
import { ApiError } from './errors.js';
import { runMigrations } from './db.js';

/* ── Konfigurace ──────────────────────────────────────────────── */

/** Režim API: "mock" = simulovaný backend, "remote" = skutečný server */
const API_MODE = 'mock';

/** Simulovaná latence v ms (min, max). V testech se nastaví na 0. */
let LATENCY_MIN = 100;
let LATENCY_MAX = 400;

/** URL pro remote režim (zatím nepoužitý) */
const REMOTE_BASE_URL = '/api';

/** Klíč pro uložení session tokenu */
const SESSION_KEY = 'mp_session_token';

/* ── Inicializace ─────────────────────────────────────────────── */

/** Spustí migrace databáze. Volá se při startu aplikace. */
export function initApi() {
  runMigrations();
}

/**
 * Nastaví latenci (pro testování).
 * @param {number} min
 * @param {number} max
 */
export function setLatency(min, max) {
  LATENCY_MIN = min;
  LATENCY_MAX = max;
}

/* ── Interní funkce ───────────────────────────────────────────── */

function getToken() {
  return sessionStorage.getItem(SESSION_KEY);
}

function setToken(token) {
  if (token) {
    sessionStorage.setItem(SESSION_KEY, token);
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

/** Simulovaná latence. */
function delay() {
  if (LATENCY_MIN === 0 && LATENCY_MAX === 0) return Promise.resolve();
  const ms = Math.floor(Math.random() * (LATENCY_MAX - LATENCY_MIN + 1)) + LATENCY_MIN;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Odešle požadavek na mock server nebo na remote API.
 * @param {string} method
 * @param {string} path
 * @param {object} [options]
 * @returns {Promise<{status: number, data: any}>}
 */
async function request(method, path, options = {}) {
  await delay();

  if (API_MODE === 'mock') {
    return handleRequest(method, path, {
      body: options.body,
      params: options.params,
      sessionToken: getToken(),
    });
  }

  // Remote režim – kostra pro budoucí použití
  if (API_MODE === 'remote') {
    const url = new URL(`${REMOTE_BASE_URL}${path}`, window.location.origin);
    if (options.params) {
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value);
        }
      }
    }

    const fetchOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const token = getToken();
    if (token) {
      fetchOptions.headers['Authorization'] = `Bearer ${token}`;
    }

    if (options.body && (method === 'POST' || method === 'PUT')) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(response.status, data.message || 'Neznámá chyba.');
    }

    return { status: response.status, data };
  }

  throw new Error(`Neplatný API_MODE: ${API_MODE}`);
}

/* ── Veřejné API ──────────────────────────────────────────────── */

// --- Autentizace ---

export async function register(username, password) {
  const result = await request('POST', '/auth/register', {
    body: { username, password },
  });
  setToken(result.data.token);
  return result.data;
}

export async function login(username, password) {
  const result = await request('POST', '/auth/login', {
    body: { username, password },
  });
  setToken(result.data.token);
  return result.data;
}

export async function logout() {
  await request('POST', '/auth/logout');
  setToken(null);
}

export async function getMe() {
  return (await request('GET', '/auth/me')).data;
}

export function isLoggedIn() {
  return !!getToken();
}

// --- Záznamy ---

export async function getEntries(params = {}) {
  return (await request('GET', '/entries', { params })).data;
}

export async function getEntry(id) {
  return (await request('GET', `/entries/${id}`)).data;
}

export async function createEntry(data) {
  return (await request('POST', '/entries', { body: data })).data;
}

export async function updateEntry(id, data) {
  return (await request('PUT', `/entries/${id}`, { body: data })).data;
}

export async function deleteEntry(id) {
  return (await request('DELETE', `/entries/${id}`)).data;
}

// --- Statistiky ---

export async function getStats(month) {
  return (await request('GET', `/stats/${month}`)).data;
}

// --- Cíle ---

export async function getGoals() {
  return (await request('GET', '/goals')).data;
}

export async function setGoals(goals) {
  return (await request('PUT', '/goals', { body: { goals } })).data;
}

// --- Export / Import ---

export async function exportData() {
  return (await request('GET', '/export')).data;
}

export async function importData(data) {
  return (await request('POST', '/import', { body: data })).data;
}

export { ApiError };
