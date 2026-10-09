/**
 * Wrappery pro Chart.js grafy.
 * Automaticky ničí předchozí instanci při re-renderu.
 */

import {
  Chart,
  LineController,
  BarController,
  DoughnutController,
  LineElement,
  BarElement,
  PointElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// Registrace komponent
Chart.register(
  LineController,
  BarController,
  DoughnutController,
  LineElement,
  BarElement,
  PointElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
);

/** Mapa canvasId → Chart instance pro cleanup */
const chartInstances = new Map();

/** Barvy pro kategorie */
export const CATEGORY_COLORS = {
  navyk: { bg: 'rgba(99, 205, 171, 0.7)', border: '#63cdab' },
  ukol: { bg: 'rgba(108, 137, 247, 0.7)', border: '#6c89f7' },
  studium: { bg: 'rgba(255, 183, 77, 0.7)', border: '#ffb74d' },
  vydaj: { bg: 'rgba(240, 98, 146, 0.7)', border: '#f06292' },
  nalada: { bg: 'rgba(186, 143, 247, 0.7)', border: '#ba8ff7' },
};

/** České názvy kategorií */
export const CATEGORY_LABELS = {
  navyk: 'Návyky',
  ukol: 'Úkoly',
  studium: 'Studium',
  vydaj: 'Výdaje',
  nalada: 'Nálada',
};

function destroyChart(canvasId) {
  if (chartInstances.has(canvasId)) {
    chartInstances.get(canvasId).destroy();
    chartInstances.delete(canvasId);
  }
}

function getThemeColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    text: isDark ? '#e0e0e0' : '#333',
    grid: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    bg: isDark ? '#1e1e2e' : '#fff',
  };
}

/**
 * Čárový graf – vývoj hodnot během měsíce.
 * @param {string} canvasId
 * @param {object} byDay - { 'YYYY-MM-DD': { count, total } }
 * @param {string} monthStr - YYYY-MM
 */
export function renderLineChart(canvasId, byDay, monthStr) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const theme = getThemeColors();
  const [year, month] = monthStr.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  const labels = [];
  const data = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${monthStr}-${String(d).padStart(2, '0')}`;
    labels.push(`${d}.`);
    data.push(byDay[dateStr]?.count || 0);
  }

  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Počet záznamů',
          data,
          borderColor: '#6c89f7',
          backgroundColor: 'rgba(108, 137, 247, 0.15)',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: theme.text } },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: {
        x: {
          ticks: { color: theme.text, maxRotation: 0, autoSkip: true, maxTicksLimit: 15 },
          grid: { color: theme.grid },
        },
        y: {
          beginAtZero: true,
          ticks: { color: theme.text, stepSize: 1 },
          grid: { color: theme.grid },
        },
      },
    },
  });

  chartInstances.set(canvasId, chart);
}

/**
 * Sloupcový graf – součty po týdnech.
 * @param {string} canvasId
 * @param {object} byWeek - { weekNum: { count, total } }
 */
export function renderBarChart(canvasId, byWeek) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const theme = getThemeColors();
  const weeks = Object.keys(byWeek).sort((a, b) => Number(a) - Number(b));

  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: weeks.map((w) => `Týden ${w}`),
      datasets: [
        {
          label: 'Počet záznamů',
          data: weeks.map((w) => byWeek[w].count),
          backgroundColor: 'rgba(108, 137, 247, 0.7)',
          borderColor: '#6c89f7',
          borderWidth: 2,
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: theme.text } },
      },
      scales: {
        x: { ticks: { color: theme.text }, grid: { color: theme.grid } },
        y: {
          beginAtZero: true,
          ticks: { color: theme.text, stepSize: 1 },
          grid: { color: theme.grid },
        },
      },
    },
  });

  chartInstances.set(canvasId, chart);
}

/**
 * Doughnut graf – rozdělení podle kategorií.
 * @param {string} canvasId
 * @param {object} byCategory - { category: { count, total } }
 */
export function renderDoughnutChart(canvasId, byCategory) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const theme = getThemeColors();
  const categories = Object.keys(byCategory);

  const chart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: categories.map((c) => CATEGORY_LABELS[c] || c),
      datasets: [
        {
          data: categories.map((c) => byCategory[c].count),
          backgroundColor: categories.map((c) => CATEGORY_COLORS[c]?.bg || 'rgba(150,150,150,0.5)'),
          borderColor: categories.map((c) => CATEGORY_COLORS[c]?.border || '#999'),
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: theme.text, padding: 16, usePointStyle: true },
        },
      },
    },
  });

  chartInstances.set(canvasId, chart);
}
