/**
 * View: Dashboard (hlavní stránka po přihlášení).
 * Obsahuje uvítací hero banner, 1-click sledovač návyků, statistické karty,
 * rychlý vstupní formulář a výpis posledních aktivit.
 */

import * as api from '../api/client.js';
import { getState } from '../state/store.js';
import { navigate } from '../router.js';
import { showToast } from '../utils/toast.js';
import { createElement, clearElement, showSkeleton, showError, showEmpty } from '../utils/dom.js';
import { getMonthName, formatNumber, formatCurrency, getToday, getDaysInMonth } from '../utils/date.js';
import { CATEGORY_LABELS } from '../charts/charts.js';

export async function renderDashboard(container) {
  clearElement(container);

  const page = createElement('div', { className: 'dashboard' });

  // 1. Uvítací Hero Banner
  const hero = createHeroBanner();
  page.appendChild(hero);

  // 2. Statistiky – karty
  const statsGrid = createElement('div', { className: 'stats-grid', id: 'dashboard-stats' });
  page.appendChild(statsGrid);

  // 3. Rychlé zaznamenání návyků (1-click habit logger)
  const quickHabits = createQuickHabitsSection();
  page.appendChild(quickHabits);

  // 4. Rychlý vstupní formulář
  const quickSection = createElement('section', { className: 'quick-entry' },
    createElement('div', { className: 'section-header' },
      createElement('h3', { className: 'section-title' }, '➕ Nový detailní záznam'),
      createElement('p', { className: 'section-subtitle' }, 'Zapište úkol, čas studia, výdaj nebo svou náladu'),
    ),
  );
  const quickForm = createQuickForm();
  quickSection.appendChild(quickForm);
  page.appendChild(quickSection);

  // 5. Poslední záznamy
  const recentSection = createElement('section', { className: 'recent-entries' },
    createElement('div', { className: 'section-header' },
      createElement('h3', { className: 'section-title' }, '🕒 Poslední zaznamenané aktivity'),
    ),
  );
  const recentList = createElement('div', { id: 'recent-list', className: 'entries-list' });
  recentSection.appendChild(recentList);

  const viewAllBtn = createElement('button', {
    className: 'btn btn--secondary btn--full',
    type: 'button',
    onClick: () => navigate('entries'),
  }, 'Zobrazit všechny záznamy a filtry →');
  recentSection.appendChild(viewAllBtn);

  page.appendChild(recentSection);

  container.appendChild(page);

  // Načti data
  await loadDashboardData(statsGrid, recentList);
}

function createHeroBanner() {
  const user = getState().user;
  const currentMonth = getState().currentMonth;
  const today = getToday();
  const dayOfMonth = parseInt(today.split('-')[2], 10);
  const totalDays = getDaysInMonth(currentMonth);
  const percentDone = Math.min(100, Math.round((dayOfMonth / totalDays) * 100));

  const banner = createElement('div', { className: 'hero-banner' });

  const left = createElement('div', { className: 'hero-banner__left' },
    createElement('div', { className: 'hero-badge' }, '⚡ Přehled měsíce'),
    createElement('h2', { className: 'hero-title' },
      `Ahoj, ${user ? user.username : 'studente'}! 👋`
    ),
    createElement('p', { className: 'hero-subtitle' },
      `Měsíc ${getMonthName(currentMonth)} • Dnes je ${dayOfMonth}. den. Každý splněný návyk tě posouvá blíž k cíli!`
    ),
  );

  const right = createElement('div', { className: 'hero-banner__right' },
    createElement('div', { className: 'month-progress' },
      createElement('div', { className: 'month-progress__labels' },
        createElement('span', { className: 'text-muted' }, `Průběh měsíce (${dayOfMonth} / ${totalDays} dní)`),
        createElement('strong', { className: 'text-primary' }, `${percentDone} %`),
      ),
      createElement('div', { className: 'month-progress__track' },
        createElement('div', {
          className: 'month-progress__bar',
          style: `width: ${percentDone}%;`,
        }),
      ),
    ),
  );

  banner.appendChild(left);
  banner.appendChild(right);
  return banner;
}

function createQuickHabitsSection() {
  const section = createElement('section', { className: 'quick-habits' });

  const header = createElement('div', { className: 'section-header' },
    createElement('h3', { className: 'section-title' }, '⚡ Rychlé návyky dne (1 kliknutí)'),
    createElement('p', { className: 'section-subtitle' }, 'Klikni na návyk a okamžitě ho zaznamenej pro dnešek bez vyplňování formuláře:'),
  );
  section.appendChild(header);

  const habits = [
    { label: '💧 2,5 l vody', category: 'navyk', value: 1, note: '💧 Vypito 2,5 l čisté vody', tags: ['zdraví', 'voda'] },
    { label: '🏃 Ranní workout', category: 'navyk', value: 1, note: '🏃 Ranní workout & protažení', tags: ['sport', 'energie'] },
    { label: '💻 60 m kódování', category: 'studium', value: 60, note: '💻 Programování & praktický projekt SPŠD', tags: ['škola', 'it'] },
    { label: '📖 30 m četba', category: 'navyk', value: 1, note: '📖 30 minut četby odborné knihy', tags: ['mysl'] },
    { label: '📵 Digitální detox', category: 'navyk', value: 1, note: '📵 Žádný telefon 1 h před spaním', tags: ['spánek'] },
    { label: '🔥 Skvělá nálada (5/5)', category: 'nalada', value: 5, note: '🔥 Maximální flow a super produktivita', tags: ['nálada'] },
  ];

  const grid = createElement('div', { className: 'quick-habits-grid' });

  for (const h of habits) {
    const btn = createElement('button', {
      className: 'quick-habit-pill',
      type: 'button',
      onClick: async () => {
        btn.disabled = true;
        try {
          await api.createEntry({
            date: getToday(),
            category: h.category,
            value: h.value,
            note: h.note,
            tags: h.tags,
          });
          btn.classList.add('quick-habit-pill--done');
          showToast(`Skvělé! "${h.label}" zaznamenáno pro dnešek 🎉`, 'success');

          // Obnovit statistiky a seznam
          const statsGrid = document.getElementById('dashboard-stats');
          const recentList = document.getElementById('recent-list');
          if (statsGrid && recentList) {
            await loadDashboardData(statsGrid, recentList);
          }
        } catch (err) {
          showToast(err.message || 'Chyba při uložení návyku.', 'error');
        } finally {
          btn.disabled = false;
        }
      },
    },
      createElement('span', { className: 'quick-habit-pill__text' }, h.label),
      createElement('span', { className: 'quick-habit-pill__check' }, '+'),
    );
    grid.appendChild(btn);
  }

  section.appendChild(grid);
  return section;
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
      label: 'Celkem aktivit',
      value: formatNumber(stats.totalEntries),
      icon: '📊',
      badge: 'záznamů',
      color: 'var(--primary)',
    },
    {
      label: 'Série dnů v řadě',
      value: `${stats.longestStreak} dní`,
      icon: '🔥',
      badge: 'streak',
      color: 'var(--warning)',
    },
    {
      label: 'Denní průměr',
      value: formatNumber(stats.averagePerDay),
      icon: '⚡',
      badge: 'aktivity/den',
      color: 'var(--success)',
    },
    {
      label: 'vs. minulý měsíc',
      value: stats.comparison
        ? `${stats.comparison.diff >= 0 ? '+' : ''}${stats.comparison.diff}`
        : '0',
      icon: stats.comparison && stats.comparison.diff >= 0 ? '📈' : '📉',
      badge: stats.comparison && stats.comparison.diff >= 0 ? 'nárůst' : 'pokles',
      color: stats.comparison && stats.comparison.diff >= 0
        ? 'var(--success)'
        : 'var(--error)',
    },
  ];

  for (const card of cards) {
    const el = createElement('div', { className: 'stat-card' },
      createElement('div', { className: 'stat-card__icon', 'aria-hidden': 'true' }, card.icon),
      createElement('div', { className: 'stat-card__content' },
        createElement('div', { className: 'stat-card__top' },
          createElement('span', { className: 'stat-card__value' }, card.value),
          createElement('span', { className: 'stat-card__badge' }, card.badge),
        ),
        createElement('span', { className: 'stat-card__label' }, card.label),
      ),
    );
    container.appendChild(el);
  }
}

function renderRecentEntries(container, entries) {
  clearElement(container);

  if (!entries || entries.length === 0) {
    showEmpty(container, 'Zatím žádné záznamy pro tento měsíc. Přidejte svůj první návyk nebo úkol výše!');
    return;
  }

  for (const entry of entries) {
    const item = createElement('div', { className: 'entry-card' },
      createElement('div', { className: 'entry-card__main' },
        createElement('span', {
          className: `entry-card__icon tag--${entry.category}`,
          'aria-hidden': 'true',
        }, getCategoryIcon(entry.category)),
        createElement('div', { className: 'entry-card__details' },
          createElement('strong', { className: 'entry-card__title' },
            entry.note || CATEGORY_LABELS[entry.category] || entry.category,
          ),
          createElement('div', { className: 'entry-card__meta' },
            createElement('span', {}, entry.date),
            createElement('span', { className: `tag tag--${entry.category}` },
              CATEGORY_LABELS[entry.category] || entry.category,
            ),
          ),
        ),
      ),
      createElement('div', { className: 'entry-card__right' },
        createElement('span', { className: 'entry-card__value' },
          formatEntryValue(entry),
        ),
      ),
    );
    container.appendChild(item);
  }
}

function createQuickForm() {
  const form = createElement('form', { className: 'quick-entry-form', id: 'quick-entry-form' });

  // Datum (výchozí dnešek)
  const dateInput = createElement('input', {
    type: 'date',
    className: 'form-input',
    id: 'quick-date',
    value: getToday(),
    required: '',
  });

  // Kategorie
  const categorySelect = createElement('select', {
    className: 'form-select',
    id: 'quick-category',
    required: '',
  });
  categorySelect.appendChild(createElement('option', { value: '' }, 'Vyberte kategorii…'));
  for (const [key, label] of Object.entries(CATEGORY_LABELS)) {
    categorySelect.appendChild(createElement('option', { value: key }, label));
  }

  // Hodnota
  const valueInput = createElement('input', {
    type: 'number',
    className: 'form-input',
    id: 'quick-value',
    placeholder: 'Hodnota (např. 1, 60, 150)',
    step: 'any',
    min: '0',
    required: '',
  });

  // Dynamický placeholder
  categorySelect.addEventListener('change', () => {
    switch (categorySelect.value) {
      case 'navyk':
      case 'ukol':
        valueInput.value = '1';
        valueInput.placeholder = '1 (splněno)';
        break;
      case 'studium':
        valueInput.placeholder = 'Minuty (např. 45)';
        break;
      case 'vydaj':
        valueInput.placeholder = 'Částka v Kč (např. 120)';
        break;
      case 'nalada':
        valueInput.placeholder = 'Nálada (1–5)';
        valueInput.max = '5';
        break;
      default:
        valueInput.placeholder = 'Hodnota';
    }
  });

  // Poznámka
  const noteInput = createElement('input', {
    type: 'text',
    className: 'form-input',
    id: 'quick-note',
    placeholder: 'Poznámka (např. Ranní workout, Kódování projektu, Oběd...)',
    maxlength: '500',
  });

  // Submit
  const submitBtn = createElement('button', {
    type: 'submit',
    className: 'btn btn--primary',
    id: 'quick-submit',
  }, '🚀 Uložit záznam');

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
      showToast('Vyplňte prosím datum, kategorii a hodnotu.', 'warning');
      return;
    }

    submitBtn.disabled = true;
    try {
      await api.createEntry(data);
      showToast('Záznam byl úspěšně přidán! ✨', 'success');
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
  const icons = { navyk: '🎯', ukol: '✅', studium: '📚', vydaj: '💰', nalada: '⚡' };
  return icons[category] || '📌';
}

function formatEntryValue(entry) {
  switch (entry.category) {
    case 'studium':
      return `${entry.value} min`;
    case 'vydaj':
      return formatCurrency(entry.value);
    case 'nalada':
      return `${entry.value}/5 ⭐`;
    case 'navyk':
    case 'ukol':
      return 'Splněno ✓';
    default:
      return String(entry.value);
  }
}

export { getCategoryIcon, formatEntryValue };
