/**
 * Databázová vrstva – jediné místo, kde se přistupuje k localStorage.
 * Organizuje data do "tabulek" s verzovaným schématem a podporou migrací.
 */

const DB_PREFIX = 'mp_';
const SCHEMA_VERSION = 1;

/**
 * Definice tabulek a jejich výchozích hodnot.
 */
const TABLES = {
  users: [],
  entries: [],
  goals: [],
  sessions: [],
};

/**
 * Získá klíč pro localStorage včetně prefixu.
 * @param {string} table
 * @returns {string}
 */
function getKey(table) {
  return `${DB_PREFIX}${table}`;
}

/**
 * Přečte celou "tabulku" z localStorage.
 * Pokud data neexistují nebo jsou poškozená, vrátí výchozí hodnotu.
 * @param {string} table - Název tabulky
 * @returns {Array} Pole záznamů
 */
export function readTable(table) {
  try {
    const raw = localStorage.getItem(getKey(table));
    if (raw === null) {
      return structuredClone(TABLES[table] ?? []);
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn(`[db] Tabulka "${table}" obsahuje neplatná data, resetuji.`);
      return structuredClone(TABLES[table] ?? []);
    }
    return parsed;
  } catch (err) {
    console.error(`[db] Chyba při čtení tabulky "${table}":`, err);
    return structuredClone(TABLES[table] ?? []);
  }
}

/**
 * Zapíše celou "tabulku" do localStorage.
 * Ošetřuje QuotaExceededError.
 * @param {string} table - Název tabulky
 * @param {Array} data - Pole záznamů k uložení
 * @throws {Error} Pokud je localStorage plný
 */
export function writeTable(table, data) {
  try {
    localStorage.setItem(getKey(table), JSON.stringify(data));
  } catch (err) {
    if (err.name === 'QuotaExceededError' || err.code === 22) {
      throw new Error(
        'Úložiště prohlížeče je plné. Smažte nepotřebná data nebo exportujte zálohu.',
      );
    }
    throw err;
  }
}

/**
 * Smaže celou "tabulku" z localStorage.
 * @param {string} table
 */
export function clearTable(table) {
  localStorage.removeItem(getKey(table));
}

/**
 * Spustí migrace schématu, pokud je potřeba.
 * V současné verzi (1) pouze inicializuje schéma.
 */
export function runMigrations() {
  const versionKey = `${DB_PREFIX}schema_version`;
  let currentVersion = 0;
  try {
    const v = localStorage.getItem(versionKey);
    if (v !== null) {
      currentVersion = parseInt(v, 10);
    }
  } catch {
    currentVersion = 0;
  }

  if (currentVersion < SCHEMA_VERSION) {
    // Migrace v1: inicializace tabulek, které ještě neexistují
    for (const table of Object.keys(TABLES)) {
      if (localStorage.getItem(getKey(table)) === null) {
        writeTable(table, TABLES[table]);
      }
    }

    localStorage.setItem(versionKey, String(SCHEMA_VERSION));
  }
}

/**
 * Exportuje veškerá data ze všech tabulek.
 * @returns {object} Objekt s daty všech tabulek
 */
export function exportAll() {
  const result = {};
  for (const table of Object.keys(TABLES)) {
    result[table] = readTable(table);
  }
  result._schemaVersion = SCHEMA_VERSION;
  return result;
}

/**
 * Importuje data do všech tabulek (přepíše stávající).
 * @param {object} data - Objekt s daty tabulek
 */
export function importAll(data) {
  for (const table of Object.keys(TABLES)) {
    if (Array.isArray(data[table])) {
      writeTable(table, data[table]);
    }
  }
}

/**
 * Vrátí aktuální verzi schématu.
 * @returns {number}
 */
export function getSchemaVersion() {
  return SCHEMA_VERSION;
}
