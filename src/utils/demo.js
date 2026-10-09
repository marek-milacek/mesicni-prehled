/**
 * Generátor ukázkových (demo) dat.
 * Vytvoří realistické záznamy pro aktuální a minulý měsíc.
 */

import { getCurrentMonth, shiftMonth, getDaysInMonth } from './date.js';

const CATEGORY_CONFIG = {
  navyk: {
    values: [1], // splněno
    notes: [
      '💧 Vypito 2,5 l čisté vody',
      '🏃 Ranní workout & protažení',
      '📖 30 minut četby odborné knihy',
      '📵 Žádný telefon 1 h před spaním',
      '🧘 Ranní plánování & soustředění',
      '🥗 Výživný oběd a vitamíny',
      '🚶‍♂️ 10 000 kroků na čerstvém vzduchu',
    ],
  },
  ukol: {
    values: [1],
    notes: [
      '🚀 Dokončit praktický projekt SPŠD',
      '📑 Odevzdat laboratorní protokol',
      '🎫 Koupit studentskou Lítačku MHD',
      '📦 Připravit podklady na maturitní téma',
      '🧹 Efektivní organizace pracovního stolu',
      '✉️ Vyřídit důležité studijní e-maily',
    ],
  },
  studium: {
    values: [30, 45, 60, 90, 120, 150],
    notes: [
      '💻 Frontend vývoj & JavaScript ES moduly',
      '📐 Aplikovaná matematika & diferenciály',
      '⚡ Dopravní systémy & telematika SPŠD',
      '🇬🇧 Odborná angličtina (B2 level)',
      '🌐 Vývoj webových aplikací ve Vite',
      '📊 Databáze a REST API architektura',
    ],
  },
  vydaj: {
    values: [65, 89, 120, 45, 220, 190, 399, 150, 450],
    notes: [
      '🍜 Studentský oběd v menze',
      '☕ Prémiová káva při studiu',
      '🚇 Studentský kupón MHD Praha',
      '📚 Kniha o moderním JavaScriptu',
      '🎬 Vstupenka do kina IMAX s partou',
      '🏋️‍♂️ Vstupné do posilovny & fitness',
      '🎧 Předplatné Spotify na poslech při kódování',
    ],
  },
  nalada: {
    values: [4, 5, 4, 3, 5, 4, 5, 4, 3, 5],
    notes: [
      '🔥 Maximální flow a super produktivita',
      '💪 Skvělý pocit ze zvládnutých úkolů',
      '⚡ Vysoká energie po sportu a cvičení',
      '☕ Klidný, soustředěný a pohodový den',
      '🚀 Motivovaný posouvat svůj projekt dál',
    ],
  },
};

const TAGS_POOL = ['důležité', 'opakující', 'škola', 'volný čas', 'zdraví', 'finance', 'rodina', 'sport', 'kultura'];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickTags() {
  const count = Math.floor(Math.random() * 3);
  const tags = [];
  for (let i = 0; i < count; i++) {
    const tag = pick(TAGS_POOL);
    if (!tags.includes(tag)) {
      tags.push(tag);
    }
  }
  return tags;
}

/**
 * Generuje demo záznamy pro zadaný měsíc.
 * @param {string} month - YYYY-MM
 * @returns {Array<object>}
 */
function generateEntriesForMonth(month) {
  const daysInMonth = getDaysInMonth(month);
  const entries = [];
  const categories = Object.keys(CATEGORY_CONFIG);

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${month}-${String(day).padStart(2, '0')}`;
    // Každý den 1-4 záznamy
    const numEntries = 1 + Math.floor(Math.random() * 3);

    const usedCategories = new Set();
    for (let i = 0; i < numEntries; i++) {
      let category;
      do {
        category = pick(categories);
      } while (usedCategories.has(category) && usedCategories.size < categories.length);
      usedCategories.add(category);

      const config = CATEGORY_CONFIG[category];
      entries.push({
        date,
        category,
        value: pick(config.values),
        note: pick(config.notes),
        tags: pickTags(),
      });
    }
  }

  return entries;
}

/**
 * Generuje kompletní demo data: záznamy + cíle pro aktuální a minulý měsíc.
 * @returns {{ entries: Array, goals: Array }}
 */
export function generateDemoData() {
  const currentMonth = getCurrentMonth();
  const prevMonth = shiftMonth(currentMonth, -1);

  // Pro aktuální měsíc generuj jen do dneška
  const today = new Date();
  let currentEntries = generateEntriesForMonth(currentMonth);
  const todayDay = today.getDate();
  currentEntries = currentEntries.filter((e) => {
    const day = parseInt(e.date.split('-')[2]);
    return day <= todayDay;
  });

  const prevEntries = generateEntriesForMonth(prevMonth);

  const goals = [
    { category: 'navyk', target: 25, month: currentMonth },
    { category: 'studium', target: 1800, month: currentMonth },
    { category: 'vydaj', target: 3000, month: currentMonth },
    { category: 'nalada', target: 100, month: currentMonth },
  ];

  return {
    entries: [...currentEntries, ...prevEntries],
    goals,
  };
}
