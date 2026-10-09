/**
 * View: Dashboard (hlavní stránka po přihlášení).
 * Zobrazuje shrnutí aktuálního měsíce, rychlý formulář a navigaci.
 */

import * as api from '../api/client.js';
import { getState } from '../state/store.js';
import { navigate } from '../router.js';
import { showToast } from '../utils/toast.js';
import { createElement, clearElement, showSkeleton, showError, showEmpty } from '../utils/dom.js';
import { getMonthName, formatNumber, formatCurrency } from '../utils/date.js';
import { CATEGORY_LABELS } from '../charts/charts.js';

export async function renderDashboard(container) {
  clearElement(container);

  const page = createElement('div', { className: 'dashboard' });

  // Hlavička
  const header = createElement('header', { className: 'dashboard__header' },
    createElement('h2', { className: 'page-title' },
      `Přehled – ${getMonthName(getState().currentMonth)}`
    ),
  );
  page.appendChild(header);

  // Statistiky – karty
  const statsGrid = createElement('div', { className: 'stats-grid', id: 'dashboard-stats' });
  page.appendChild(statsGrid);

  // Rychlý vstup
  const quickSection = createElement('section', { className: 'quick-entry' },
    createElement('h3', { className: 'section-title' }, 'Rychlý záznam'),
  );
  const quickForm = createQuickForm();
  quickSection.appendChild(quickForm);
  page.appendChild(quickSection);

  // Poslední záznamy
  const recentSection = createElement('section', { className: 'recent-entries' },
    createElement('h3', { className: 'section-title' }, 'Poslední záznamy'),
  );
  const recentList = createElement('div', { id: 'recent-list', className: 'entries-list' });
  recentSection.appendChild(recentList);

  const viewAllBtn = createElement('button', {
    className: 'btn btn--ghost btn--full',
    type: 'button',
    onClick: () => navigate('entries'),
  }, 'Zobrazit všechny záznamy →');
  recentSection.appendChild(viewAllBtn);

  page.appendChild(recentSection);

  container.appendChild(page);

  // Načti data
  await loadDashboardData(statsGrid, recentList);
}

async function loadDashboardData(statsGrid, recentList) {
  showSkeleton(statsGrid, 4);
  showSkeleton(recentList, 3);

  try {
    const month = getState().currentMonth;
    const [stats, entriesData] = await Promise.all([
      api.getStats(month),
      api.getEntries({ month, limit: 5, sortBy: 'date', sortDir: 'desc' }),
    ]);

    renderStatsCards(statsGrid, stats);
    renderRecentEntries(recentList, entriesData.entries);
  } catch (err) {
    showError(statsGrid, err.message, () => loadDashboardData(statsGrid, recentList));
  }
}

function renderStatsCards(container, stats) {
  clearElement(container);

  const cards = [
    {
      label: 'Celkem záznamů',
      value: formatNumber(stats.totalEntries),
      icon: '📝',
      color: 'var(--color-primary)',
    },
    {
      label: 'Nejdelší série',
      value: `${stats.longestStreak} dní`,
      icon: '🔥',
      color: 'var(--color-warning)',
    },
    {
      label: 'Průměr/den',
      value: formatNumber(stats.averagePerDay),
      icon: '📊',
      color: 'var(--color-success)',
    },
    {
      label: 'vs. minulý měsíc',
      value: stats.comparison
        ? `${stats.comparison.diff >= 0 ? '+' : ''}${stats.comparison.diff}`
        : '—',
      icon: stats.comparison && stats.comparison.diff >= 0 ? '📈' : '📉',
      color: stats.comparison && stats.comparison.diff >= 0
        ? 'var(--color-success)'
        : 'var(--color-danger)',
    },
  ];

  for (const card of cards) {
    const el = createElement('div', { className: 'stat-card' },
      createElement('span', { className: 'stat-card__icon', 'aria-hidden': 'true' }, card.icon),
      createElement('div', { className: 'stat-card__content' },
        createElement('span', { className: 'stat-card__value' }, card.value),
        createElement('span', { className: 'stat-card__label' }, card.label),
      ),
    );
    el.style.setProperty('--card-accent', card.color);
    container.appendChild(el);
  }
}

function renderRecentEntries(container, entries) {
  clearElement(container);

  if (entries.length === 0) {
    showEmpty(container, 'Zatím žádné záznamy. Přidejte první!', '✨');
    return;
  }

  for (const entry of entries) {
    const el = createElement('div', { className: 'entry-item', dataset: { id: entry.id } },
      createElement('div', {
        className: `entry-item__category entry-item__category--${entry.category}`,
        'aria-hidden': 'true',
      }, getCategoryIcon(entry.category)),
      createElement('div', { className: 'entry-item__content' },
        createElement('span', { className: 'entry-item__note' },
          entry.note || CATEGORY_LABELS[entry.category] || entry.category,
        ),
        createElement('span', { className: 'entry-item__meta' },
          `${entry.date} · ${formatEntryValue(entry)}`,
        ),
      ),
    );
    container.appendChild(el);
  }
}

function createQuickForm() {
  const form = createElement('form', { className: 'quick-form', id: 'quick-entry-form' });

  const dateInput = createElement('input', {
    type: 'date',
    id: 'quick-date',
    className: 'form-input',
    required: '',
  });
  // Nastaví dnešní datum
  const today = new Date();
  dateInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const categorySelect = createElement('select', {
    id: 'quick-category',
    className: 'form-input',
    required: '',
  });
  categorySelect.appendChild(createElement('option', { value: '' }, 'Kategorie…'));
  for (const [key, label] of Object.entries(CATEGORY_LABELS)) {
    categorySelect.appendChild(createElement('option', { value: key }, label));
  }

  const valueInput = createElement('input', {
    type: 'number',
    id: 'quick-value',
    className: 'form-input',
    placeholder: 'Hodnota',
    min: '0',
    step: '1',
    required: '',
  });

  const noteInput = createElement('input', {
    type: 'text',
    id: 'quick-note',
    className: 'form-input',
    placeholder: 'Poznámka (volitelné)',
    maxlength: '500',
  });

  const submitBtn = createElement('button', {
    type: 'submit',
    className: 'btn btn--primary',
    id: 'quick-submit',
  }, 'Přidat');

  form.appendChild(dateInput);
  form.appendChild(categorySelect);
  form.appendChild(valueInput);
  form.appendChild(noteInput);
  form.appendChild(submitBtn);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
      date: dateInput.value,
      category: categorySelect.value,
      value: Number(valueInput.value),
      note: noteInput.value,
      tags: [],
    };

    if (!data.date || !data.category || isNaN(data.value)) {
      showToast('Vyplňte datum, kategorii a hodnotu.', 'warning');
      return;
    }

    submitBtn.disabled = true;
    try {
      await api.createEntry(data);
      showToast('Záznam přidán!', 'success');
      valueInput.value = '';
      noteInput.value = '';

      // Refresh dashboard
      const statsGrid = document.getElementById('dashboard-stats');
      const recentList = document.getElementById('recent-list');
      if (statsGrid && recentList) {
        await loadDashboardData(statsGrid, recentList);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });

  return form;
}

function getCategoryIcon(category) {
  const icons = { navyk: '🎯', ukol: '✅', studium: '📚', vydaj: '💰', nalada: '😊' };
  return icons[category] || '📌';
}

function formatEntryValue(entry) {
  switch (entry.category) {
    case 'studium':
      return `${entry.value} min`;
    case 'vydaj':
      return formatCurrency(entry.value);
    case 'nalada':
      return `${entry.value}/5`;
    default:
      return String(entry.value);
  }
}

export { getCategoryIcon, formatEntryValue };
