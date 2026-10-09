/**
 * View: Kalendář – měsíční pohled na záznamy.
 */

import * as api from '../api/client.js';
import { getState, setState } from '../state/store.js';
import { createElement, clearElement, showError } from '../utils/dom.js';
import { getMonthName, shiftMonth, getDaysInMonth, getFirstDayOfMonth, formatDate } from '../utils/date.js';
import { CATEGORY_LABELS } from '../charts/charts.js';
import { getCategoryIcon, formatEntryValue } from './dashboard.js';

export async function renderCalendar(container) {
  clearElement(container);

  const page = createElement('div', { className: 'calendar-page' });

  // Navigace měsíce
  const nav = createElement('div', { className: 'calendar-nav' },
    createElement('button', {
      className: 'btn btn--icon',
      id: 'cal-prev',
      'aria-label': 'Předchozí měsíc',
      type: 'button',
      onClick: () => changeMonth(-1),
    }, '◀'),
    createElement('h2', { className: 'page-title', id: 'cal-title' },
      getMonthName(getState().currentMonth),
    ),
    createElement('button', {
      className: 'btn btn--icon',
      id: 'cal-next',
      'aria-label': 'Následující měsíc',
      type: 'button',
      onClick: () => changeMonth(1),
    }, '▶'),
  );
  page.appendChild(nav);

  // Hlavičky dnů
  const grid = createElement('div', { className: 'calendar-grid', id: 'calendar-grid' });
  const dayNames = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
  for (const name of dayNames) {
    grid.appendChild(createElement('div', { className: 'calendar-grid__header' }, name));
  }
  page.appendChild(grid);

  // Detail dne
  const detail = createElement('div', { className: 'day-detail', id: 'day-detail' });
  page.appendChild(detail);

  container.appendChild(page);

  await loadCalendar(grid);
}

function changeMonth(offset) {
  const newMonth = shiftMonth(getState().currentMonth, offset);
  setState({ currentMonth: newMonth });

  const title = document.getElementById('cal-title');
  if (title) title.textContent = getMonthName(newMonth);

  const grid = document.getElementById('calendar-grid');
  if (grid) {
    // Zachovej hlavičky
    const headers = grid.querySelectorAll('.calendar-grid__header');
    clearElement(grid);
    for (const h of headers) {
      grid.appendChild(h);
    }
    loadCalendar(grid);
  }
}

async function loadCalendar(grid) {
  const month = getState().currentMonth;

  // Odstraň dny, zachovej hlavičky
  const cells = grid.querySelectorAll('.calendar-grid__cell');
  for (const c of cells) c.remove();

  try {
    const result = await api.getEntries({ month, limit: 500 });
    const entriesByDay = {};
    for (const entry of result.entries) {
      if (!entriesByDay[entry.date]) {
        entriesByDay[entry.date] = [];
      }
      entriesByDay[entry.date].push(entry);
    }

    const daysInMonth = getDaysInMonth(month);
    const firstDay = getFirstDayOfMonth(month);
    const today = new Date().toISOString().split('T')[0];

    // Prázdné buňky před prvním dnem
    for (let i = 0; i < firstDay; i++) {
      grid.appendChild(createElement('div', { className: 'calendar-grid__cell calendar-grid__cell--empty' }));
    }

    // Dny měsíce
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${month}-${String(day).padStart(2, '0')}`;
      const dayEntries = entriesByDay[dateStr] || [];
      const hasEntries = dayEntries.length > 0;
      const isToday = dateStr === today;

      const cell = createElement('button', {
        className: `calendar-grid__cell${hasEntries ? ' calendar-grid__cell--has-entries' : ''}${isToday ? ' calendar-grid__cell--today' : ''}`,
        type: 'button',
        'aria-label': `${day}. ${getMonthName(month)}${hasEntries ? `, ${dayEntries.length} záznamů` : ''}`,
        onClick: () => showDayDetail(dateStr, dayEntries),
      },
        createElement('span', { className: 'calendar-grid__day-num' }, String(day)),
        ...(hasEntries
          ? [createElement('span', { className: 'calendar-grid__dot-count' }, String(dayEntries.length))]
          : []),
      );

      grid.appendChild(cell);
    }
  } catch (err) {
    showError(grid, err.message, () => loadCalendar(grid));
  }
}

function showDayDetail(dateStr, entries) {
  const detail = document.getElementById('day-detail');
  if (!detail) return;

  clearElement(detail);

  detail.appendChild(
    createElement('h3', { className: 'day-detail__title' }, formatDate(dateStr)),
  );

  if (entries.length === 0) {
    detail.appendChild(
      createElement('p', { className: 'day-detail__empty' }, 'V tento den nejsou žádné záznamy.'),
    );
    return;
  }

  for (const entry of entries) {
    const el = createElement('div', { className: 'entry-item' },
      createElement('div', {
        className: `entry-item__category entry-item__category--${entry.category}`,
        'aria-hidden': 'true',
      }, getCategoryIcon(entry.category)),
      createElement('div', { className: 'entry-item__content' },
        createElement('span', { className: 'entry-item__note' },
          entry.note || CATEGORY_LABELS[entry.category],
        ),
        createElement('span', { className: 'entry-item__meta' },
          `${CATEGORY_LABELS[entry.category]} · ${formatEntryValue(entry)}`,
        ),
      ),
    );
    detail.appendChild(el);
  }
}
