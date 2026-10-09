/**
 * Jednoduchý hash router pro SPA navigaci.
 */

const routes = new Map();
let currentCleanup = null;

/**
 * Zaregistruje route.
 * @param {string} path - Hash cesta (např. 'dashboard')
 * @param {Function} handler - Funkce(container), vrací cleanup funkci nebo void
 */
export function addRoute(path, handler) {
  routes.set(path, handler);
}

/**
 * Naviguje na zadanou cestu.
 * @param {string} path
 */
export function navigate(path) {
  window.location.hash = `#/${path}`;
}

/**
 * Vrátí aktuální cestu.
 * @returns {string}
 */
export function getCurrentRoute() {
  const hash = window.location.hash.slice(2) || 'auth';
  return hash;
}

/**
 * Inicializuje router.
 * @param {HTMLElement} container - Element pro renderování obsahu
 */
export function initRouter(container) {
  async function handleRoute() {
    // Cleanup předchozího view
    if (currentCleanup && typeof currentCleanup === 'function') {
      currentCleanup();
    }
    currentCleanup = null;

    const path = getCurrentRoute();
    const handler = routes.get(path);

    if (handler) {
      currentCleanup = await handler(container);
    } else {
      // Fallback na dashboard nebo auth
      const fallback = routes.get('dashboard') || routes.get('auth');
      if (fallback) {
        currentCleanup = await fallback(container);
      }
    }
  }

  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
