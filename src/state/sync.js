/**
 * Synchronizace mezi záložkami prohlížeče.
 * Používá BroadcastChannel pro real-time sync.
 */

const CHANNEL_NAME = 'mp_sync';
let channel = null;
const listeners = new Set();

/**
 * Inicializuje synchronizační kanál.
 */
export function initSync() {
  if (typeof BroadcastChannel === 'undefined') {
    // Fallback na storage event
    window.addEventListener('storage', (e) => {
      if (e.key && e.key.startsWith('mp_')) {
        notifyListeners({ type: 'storage-change', key: e.key });
      }
    });
    return;
  }

  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event) => {
    notifyListeners(event.data);
  };
}

/**
 * Odešle synchronizační zprávu ostatním záložkám.
 * @param {string} type - Typ zprávy (entries-changed, goals-changed, logout)
 * @param {object} [payload]
 */
export function broadcastChange(type, payload = {}) {
  const message = { type, payload, timestamp: Date.now() };
  if (channel) {
    channel.postMessage(message);
  }
}

/**
 * Zaregistruje listener pro synchronizační zprávy.
 * @param {Function} listener
 * @returns {Function} Funkce pro odregistrování
 */
export function onSyncMessage(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners(message) {
  for (const listener of listeners) {
    try {
      listener(message);
    } catch (err) {
      console.error('[sync] Chyba v listeneru:', err);
    }
  }
}
