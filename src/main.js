/**
 * Hlavní vstupní bod aplikace "Měsíční přehled" (Month in Review).
 * Školní praktický projekt – SPŠD Motol, Marek Miláček, 3.A.
 */

import './style.css';
import * as api from './api/client.js';
import { getState, setState, subscribe } from './state/store.js';
import { initSync, onSyncMessage } from './state/sync.js';
import { initRouter, addRoute, navigate, getCurrentRoute } from './router.js';
import { getMonthName, shiftMonth } from './utils/date.js';
import { showToast } from './utils/toast.js';

import { renderAuth } from './views/auth.js';
import { renderDashboard } from './views/dashboard.js';
import { renderEntries } from './views/entries.js';
import { renderCalendar } from './views/calendar.js';
import { renderSummary } from './views/summary.js';
import { renderGoals } from './views/goals.js';
import { renderSettings } from './views/settings.js';

/* ── Správa barevného motivu (Light / Dark) ──────────────────────── */

function initTheme() {
  const saved = localStorage.getItem('mp_theme');
  if (saved === 'dark' || saved === 'light') {
    document.documentElement.setAttribute('data-theme', saved);
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  }

  // Sledování změn v preferencích OS
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('mp_theme')) {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      updateThemeToggleBtn();
    }
  });
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('mp_theme', next);
  updateThemeToggleBtn();
  showToast(`Aktivován ${next === 'dark' ? 'tmavý' : 'světlý'} režim`, 'info', 1500);
}

function updateThemeToggleBtn() {
  const btn = document.getElementById('theme-toggle-btn');
  if (!btn) return;
  const current = document.documentElement.getAttribute('data-theme');
  btn.textContent = current === 'dark' ? '☀️' : '🌙';
  btn.setAttribute('aria-label', current === 'dark' ? 'Přepnout na světlý režim' : 'Přepnout na tmavý režim');
}

/* ── Aktualizace navigace a stavu shellu ─────────────────────────── */

function updateAppShell() {
  const { user, currentMonth } = getState();
  const header = document.getElementById('app-header');
  const userMenu = document.getElementById('user-menu');
  const usernameSpan = document.getElementById('nav-username');
  const monthDisplay = document.getElementById('header-month-display');
  const currentRoute = getCurrentRoute();

  if (user) {
    if (header) header.classList.remove('app-header--hidden');
    if (userMenu) userMenu.classList.remove('hidden');
    if (usernameSpan) usernameSpan.textContent = user.username;
  } else {
    if (header) header.classList.add('app-header--hidden');
    if (userMenu) userMenu.classList.add('hidden');
  }

  if (monthDisplay) {
    monthDisplay.textContent = getMonthName(currentMonth);
  }

  // Zvýraznění aktivní navigace
  const navLinks = document.querySelectorAll('.nav__link');
  navLinks.forEach((link) => {
    const route = link.getAttribute('data-route');
    if (route === currentRoute) {
      link.classList.add('nav__link--active');
    } else {
      link.classList.remove('nav__link--active');
    }
  });

  updateThemeToggleBtn();
}

/* ── Registrace routes a route guard ────────────────────────────── */

function setupRoutes(container) {
  // Obal pro kontrolu přihlášení
  function protectedView(viewFn) {
    return async (c) => {
      if (!api.isLoggedIn()) {
        navigate('auth');
        return;
      }
      return viewFn(c);
    };
  }

  addRoute('auth', async (c) => {
    if (api.isLoggedIn()) {
      navigate('dashboard');
      return;
    }
    return renderAuth(c);
  });

  addRoute('dashboard', protectedView(renderDashboard));
  addRoute('entries', protectedView(renderEntries));
  addRoute('calendar', protectedView(renderCalendar));
  addRoute('summary', protectedView(renderSummary));
  addRoute('goals', protectedView(renderGoals));
  addRoute('settings', protectedView(renderSettings));

  initRouter(container);
}

/* ── Inicializace aplikace ──────────────────────────────────────── */

async function init() {
  initTheme();
  api.initApi();
  initSync();

  const container = document.getElementById('app-content');

  // Mobilní menu toggle
  const menuToggle = document.getElementById('mobile-menu-toggle');
  const mainNav = document.getElementById('main-nav');
  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => {
      const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', String(!isExpanded));
      mainNav.classList.toggle('nav--open');
    });

    // Zavřít menu při kliknutí na odkaz
    mainNav.addEventListener('click', (e) => {
      if (e.target.closest('.nav__link')) {
        mainNav.classList.remove('nav--open');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Tlačítko pro přepnutí motivu
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme);
  }

  // Odhlášení
  const logoutBtn = document.getElementById('nav-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await api.logout();
        setState({ user: null });
        showToast('Byl jste odhlášen.', 'info');
        navigate('auth');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Posun měsíce v záhlaví
  const prevMonthBtn = document.getElementById('header-prev-month');
  const nextMonthBtn = document.getElementById('header-next-month');
  if (prevMonthBtn) {
    prevMonthBtn.addEventListener('click', () => {
      const newMonth = shiftMonth(getState().currentMonth, -1);
      setState({ currentMonth: newMonth });
      // Re-trigger current route to update data
      const current = getCurrentRoute();
      navigate(current);
    });
  }
  if (nextMonthBtn) {
    nextMonthBtn.addEventListener('click', () => {
      const newMonth = shiftMonth(getState().currentMonth, 1);
      setState({ currentMonth: newMonth });
      const current = getCurrentRoute();
      navigate(current);
    });
  }

  // Sledování stavu pro překreslení shellu
  subscribe('user', () => updateAppShell());
  subscribe('currentMonth', () => updateAppShell());
  window.addEventListener('hashchange', () => updateAppShell());

  // Cross-tab sync listener
  onSyncMessage((msg) => {
    if (msg.type === 'logout') {
      setState({ user: null });
      navigate('auth');
      showToast('Byl jste odhlášen v jiné záložce.', 'info');
    } else if (msg.type === 'entries-changed' || msg.type === 'goals-changed') {
      const current = getCurrentRoute();
      if (current !== 'auth') {
        navigate(current);
      }
    }
  });

  // Ověření existující relace
  if (api.isLoggedIn()) {
    try {
      const user = await api.getMe();
      setState({ user });
    } catch {
      setState({ user: null });
    }
  }

  setupRoutes(container);
  updateAppShell();
}

// Spustit po načtení DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
