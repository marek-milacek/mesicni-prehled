/**
 * View: Shrnutí měsíce – statistiky, grafy, srovnání.
 */

import * as api from '../api/client.js';
import { getState, setState } from '../state/store.js';
import { createElement, clearElement, showSkeleton, showError, showEmpty } from '../utils/dom.js';
import { getMonthName, shiftMonth, formatNumber, formatCurrency } from '../utils/date.js';
import { CATEGORY_LABELS } from '../charts/charts.js';
import { renderLineChart, renderBarChart, renderDoughnutChart } from '../charts/charts.js';
import { showToast } from '../utils/toast.js';

export async function renderSummary(container) {
  clearElement(container);

  const page = createElement('div', { className: 'summary-page' });

  // Navigace měsíce
  const nav = createElement('div', { className: 'calendar-nav' },
    createElement('button', {
      className: 'btn btn--icon',
      'aria-label': 'Předchozí měsíc',
      type: 'button',
      onClick: () => changeSummaryMonth(-1, container),
    }, '◀'),
    createElement('h2', { className: 'page-title', id: 'summary-title' },
      `Shrnutí – ${getMonthName(getState().currentMonth)}`,
    ),
    createElement('button', {
      className: 'btn btn--icon',
      'aria-label': 'Následující měsíc',
      type: 'button',
      onClick: () => changeSummaryMonth(1, container),
    }, '▶'),
  );
  page.appendChild(nav);

  // Hlavní obsah
  const content = createElement('div', { id: 'summary-content', className: 'summary-content' });
  page.appendChild(content);

  // Tlačítka pro tisk/CSV
  const actions = createElement('div', { className: 'summary-actions' },
    createElement('button', {
      className: 'btn btn--secondary',
      type: 'button',
      onClick: () => exportCSV(),
    }, '📄 Export CSV'),
    createElement('button', {
      className: 'btn btn--secondary',
      type: 'button',
      onClick: () => window.print(),
    }, '🖨️ Vytisknout / PDF'),
  );
  page.appendChild(actions);

  container.appendChild(page);

  await loadSummary(content);
}

function changeSummaryMonth(offset, container) {
  const newMonth = shiftMonth(getState().currentMonth, offset);
  setState({ currentMonth: newMonth });
  renderSummary(container);
}

async function loadSummary(content) {
  showSkeleton(content, 4);

  try {
    const month = getState().currentMonth;
    const [stats, goalsData] = await Promise.all([
      api.getStats(month),
      api.getGoals(),
    ]);

    clearElement(content);

    if (stats.totalEntries === 0) {
      showEmpty(content, 'Pro tento měsíc nejsou žádné záznamy.', '📊');
      return;
    }

    // Souhrnné karty
    const summaryCards = createElement('div', { className: 'summary-cards' });

    summaryCards.appendChild(createSummaryCard('📝', 'Celkem záznamů', formatNumber(stats.totalEntries)));
    summaryCards.appendChild(createSummaryCard('📊', 'Průměr za den', formatNumber(stats.averagePerDay)));
    summaryCards.appendChild(createSummaryCard('🔥', 'Nejdelší série', `${stats.longestStreak} dní`));

    if (stats.bestDay) {
      summaryCards.appendChild(createSummaryCard('⭐', 'Nejlepší den',
        `${stats.bestDay.date.split('-')[2]}. (${stats.bestDay.count} záznamů)`));
    }

    content.appendChild(summaryCards);

    // Srovnání s minulým měsícem
    if (stats.comparison) {
      const comp = stats.comparison;
      const compEl = createElement('div', { className: 'comparison-card' },
        createElement('h3', { className: 'section-title' }, 'Srovnání s minulým měsícem'),
        createElement('div', { className: 'comparison-card__body' },
          createElement('span', {
            className: `comparison-card__diff ${comp.diff >= 0 ? 'comparison-card__diff--positive' : 'comparison-card__diff--negative'}`,
          }, `${comp.diff >= 0 ? '+' : ''}${comp.diff} záznamů (${comp.percentChange >= 0 ? '+' : ''}${comp.percentChange} %)`),
          createElement('span', { className: 'comparison-card__detail' },
            `Tento měsíc: ${comp.currentTotal} | Minulý: ${comp.prevTotal}`),
        ),
      );
      content.appendChild(compEl);
    }

    // Kategorie
    const catSection = createElement('section', { className: 'summary-section' },
      createElement('h3', { className: 'section-title' }, 'Podle kategorií'),
    );
    const catGrid = createElement('div', { className: 'category-grid' });
    for (const [cat, data] of Object.entries(stats.byCategory)) {
      catGrid.appendChild(createElement('div', { className: `category-card category-card--${cat}` },
        createElement('span', { className: 'category-card__label' }, CATEGORY_LABELS[cat] || cat),
        createElement('span', { className: 'category-card__count' }, `${data.count}×`),
        createElement('span', { className: 'category-card__total' },
          cat === 'vydaj' ? formatCurrency(data.total) : `Σ ${formatNumber(data.total)}`),
      ));
    }
    catSection.appendChild(catGrid);
    content.appendChild(catSection);

    // Cíle a progress
    const monthGoals = goalsData.filter((g) => g.month === month);
    if (monthGoals.length > 0) {
      const goalsSection = createElement('section', { className: 'summary-section' },
        createElement('h3', { className: 'section-title' }, 'Plnění cílů'),
      );
      for (const goal of monthGoals) {
        const catData = stats.byCategory[goal.category];
        const current = catData ? catData.total : 0;
        const pct = Math.min(100, Math.round((current / goal.target) * 100));

        goalsSection.appendChild(createElement('div', { className: 'goal-progress' },
          createElement('div', { className: 'goal-progress__header' },
            createElement('span', {}, `${CATEGORY_LABELS[goal.category] || goal.category}`),
            createElement('span', {}, `${formatNumber(current)} / ${formatNumber(goal.target)} (${pct} %)`),
          ),
          createProgressBar(pct),
        ));
      }
      content.appendChild(goalsSection);
    }

    // Grafy
    const chartsSection = createElement('section', { className: 'summary-section summary-section--charts' },
      createElement('h3', { className: 'section-title' }, 'Grafy'),
    );

    const chartsGrid = createElement('div', { className: 'charts-grid' });

    // Čárový graf
    const lineCard = createElement('div', { className: 'chart-card' },
      createElement('h4', { className: 'chart-card__title' }, 'Vývoj během měsíce'),
      createElement('div', { className: 'chart-card__body' },
        createElement('canvas', { id: 'chart-line' }),
      ),
    );
    chartsGrid.appendChild(lineCard);

    // Sloupcový graf
    const barCard = createElement('div', { className: 'chart-card' },
      createElement('h4', { className: 'chart-card__title' }, 'Po týdnech'),
      createElement('div', { className: 'chart-card__body' },
        createElement('canvas', { id: 'chart-bar' }),
      ),
    );
    chartsGrid.appendChild(barCard);

    // Doughnut graf
    const doughnutCard = createElement('div', { className: 'chart-card' },
      createElement('h4', { className: 'chart-card__title' }, 'Rozdělení kategorií'),
      createElement('div', { className: 'chart-card__body' },
        createElement('canvas', { id: 'chart-doughnut' }),
      ),
    );
    chartsGrid.appendChild(doughnutCard);

    chartsSection.appendChild(chartsGrid);
    content.appendChild(chartsSection);

    // Renderuj grafy po vložení do DOM
    requestAnimationFrame(() => {
      renderLineChart('chart-line', stats.byDay, month);
      renderBarChart('chart-bar', stats.byWeek);
      renderDoughnutChart('chart-doughnut', stats.byCategory);
    });
  } catch (err) {
    showError(content, err.message, () => loadSummary(content));
  }
}

function createSummaryCard(icon, label, value) {
  return createElement('div', { className: 'summary-card' },
    createElement('span', { className: 'summary-card__icon', 'aria-hidden': 'true' }, icon),
    createElement('span', { className: 'summary-card__value' }, value),
    createElement('span', { className: 'summary-card__label' }, label),
  );
}

function createProgressBar(pct) {
  const bar = createElement('div', { className: 'progress-bar' },
    createElement('div', { className: 'progress-bar__fill' }),
  );
  requestAnimationFrame(() => {
    const fill = bar.querySelector('.progress-bar__fill');
    fill.style.width = `${pct}%`;
    if (pct >= 100) fill.classList.add('progress-bar__fill--complete');
  });
  return bar;
}

async function exportCSV() {
  try {
    const month = getState().currentMonth;
    const result = await api.getEntries({ month, limit: 1000 });

    const headers = ['Datum', 'Kategorie', 'Hodnota', 'Poznámka', 'Štítky'];
    const rows = result.entries.map((e) => [
      e.date,
      CATEGORY_LABELS[e.category] || e.category,
      e.value,
      `"${(e.note || '').replace(/"/g, '""')}"`,
      `"${(e.tags || []).join(', ')}"`,
    ]);

    const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `mesicni-prehled-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('CSV exportováno!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}
