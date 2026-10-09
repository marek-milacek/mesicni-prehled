// Setup file pro Vitest prostředí
import { webcrypto } from 'node:crypto';

// Zajištění crypto a crypto.subtle v jsdom prostředí
if (typeof window !== 'undefined') {
  if (!window.crypto || !window.crypto.subtle) {
    Object.defineProperty(window, 'crypto', {
      value: webcrypto,
      configurable: true,
      writable: true,
    });
  }
}

if (!globalThis.crypto || !globalThis.crypto.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
    writable: true,
  });
}

class MemoryStorage {
  constructor() {
    this._data = new Map();
  }
  getItem(key) {
    return this._data.has(key) ? this._data.get(key) : null;
  }
  setItem(key, value) {
    this._data.set(key, String(value));
  }
  removeItem(key) {
    this._data.delete(key);
  }
  clear() {
    this._data.clear();
  }
  get length() {
    return this._data.size;
  }
  key(index) {
    return Array.from(this._data.keys())[index] || null;
  }
}

const localStore = new MemoryStorage();
const sessionStore = new MemoryStorage();

// Definujeme na globalThis i window
Object.defineProperty(globalThis, 'localStorage', {
  value: localStore,
  configurable: true,
  writable: true,
});

Object.defineProperty(globalThis, 'sessionStorage', {
  value: sessionStore,
  configurable: true,
  writable: true,
});

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStore,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStore,
    configurable: true,
    writable: true,
  });
}
