/**
 * Generátor ukázkových (demo) dat.
 * Vytvoří realistické záznamy pro aktuální a minulý měsíc.
 */

import { getCurrentMonth, shiftMonth, getDaysInMonth } from './date.js';

const CATEGORY_CONFIG = {
  navyk: {
    values: [1], // splněno/nesplněno
    notes: ['Ranní cvičení', 'Čtení 30 min', 'Meditace', 'Pití vody 2l', 'Žádný telefon před spaním', 'Procházka'],
  },
  ukol: {
    values: [1],
    notes: ['Úklid pokoje', 'Nákup', 'Opravit kolo', 'Zavolat babičce', 'Vyřídit reklamaci', 'Zalít květiny'],
  },
  studium: {
    values: [30, 45, 60, 90, 120, 15, 20],
    notes: ['Matematika', 'Fyzika', 'Programování', 'Angličtina', 'Čeština', 'Dějepis', 'Příprava na test'],
  },
  vydaj: {
    values: [50, 89, 120, 35, 250, 45, 199, 65, 490, 150],
    notes: ['Oběd', 'Svačina', 'Jízdenka MHD', 'Káva', 'Kniha', 'Kino', 'Oblečení', 'Dárek', 'Sport', 'Předplatné'],
  },
  nalada: {
    values: [1, 2, 3, 4, 5, 3, 4, 4, 5, 3, 2, 4],
    notes: ['Skvělý den', 'Průměrný den', 'Unavený', 'Super nálada', 'Stresový den', 'Pohoda', 'Produktivní', 'Líný den'],
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
