/**
 * Aplikační stav (store) – reaktivní správa stavu.
 * View moduly registrují listenery a jsou notifikovány při změnách.
 */

import { getCurrentMonth } from '../utils/date.js';

const state = {
  user: null,
  currentMonth: getCurrentMonth(),
  isLoading: false,
  currentView: 'auth',
};

const listeners = new Map();

/**
 * Vrátí aktuální stav.
 * @returns {object}
 */
export function getState() {
  return { ...state };
}

/**
 * Nastaví stav (merge).
 * @param {object} updates
 */
export function setState(updates) {
  const changedKeys = [];
  for (const [key, value] of Object.entries(updates)) {
    if (state[key] !== value) {
      state[key] = value;
      changedKeys.push(key);
    }
  }

  // Notifikuj listenery pro změněné klíče
  for (const key of changedKeys) {
    if (listeners.has(key)) {
      for (const listener of listeners.get(key)) {
        try {
          listener(state[key], state);
        } catch (err) {
          console.error(`[store] Chyba v listeneru pro "${key}":`, err);
        }
      }
    }
  }

  // Notifikuj globální listenery
  if (changedKeys.length > 0 && listeners.has('*')) {
    for (const listener of listeners.get('*')) {
      try {
        listener(state);
      } catch (err) {
        console.error('[store] Chyba v globálním listeneru:', err);
      }
    }
  }
}

/**
 * Zaregistruje listener pro specifický klíč stavu.
 * @param {string} key - Klíč stavu nebo '*' pro globální
 * @param {Function} listener
 * @returns {Function} Funkce pro odregistrování
 */
export function subscribe(key, listener) {
  if (!listeners.has(key)) {
    listeners.set(key, new Set());
  }
  listeners.get(key).add(listener);
  return () => listeners.get(key).delete(listener);
}
