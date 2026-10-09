/**
 * Utility pro formátování dat a čísel podle cs-CZ.
 */

const dateFormatter = new Intl.DateTimeFormat('cs-CZ', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const shortDateFormatter = new Intl.DateTimeFormat('cs-CZ', {
  day: 'numeric',
  month: 'numeric',
});

const numberFormatter = new Intl.NumberFormat('cs-CZ');

const currencyFormatter = new Intl.NumberFormat('cs-CZ', {
  style: 'currency',
  currency: 'CZK',
  maximumFractionDigits: 0,
});

/**
 * Formátuje datum do českého formátu.
 * @param {string} isoDate - Datum ve formátu YYYY-MM-DD
 * @returns {string}
 */
export function formatDate(isoDate) {
  return dateFormatter.format(new Date(isoDate + 'T00:00:00'));
}

/**
 * Formátuje datum do krátkého formátu (den. měsíc.)
 * @param {string} isoDate
 * @returns {string}
 */
export function formatDateShort(isoDate) {
  return shortDateFormatter.format(new Date(isoDate + 'T00:00:00'));
}

/**
 * Formátuje číslo podle cs-CZ.
 * @param {number} num
 * @returns {string}
 */
export function formatNumber(num) {
  return numberFormatter.format(num);
}

/**
 * Formátuje částku v CZK.
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  return currencyFormatter.format(amount);
}

/**
 * Vrátí název měsíce v češtině.
 * @param {string} monthStr - Formát YYYY-MM
 * @returns {string}
 */
export function getMonthName(monthStr) {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return new Intl.DateTimeFormat('cs-CZ', { month: 'long', year: 'numeric' }).format(date);
}

/**
 * Vrátí aktuální měsíc ve formátu YYYY-MM.
 * @returns {string}
 */
export function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Vrátí dnešní datum ve formátu YYYY-MM-DD.
 * @returns {string}
 */
export function getToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Posune měsíc o offset.
 * @param {string} monthStr - YYYY-MM
 * @param {number} offset - +1 nebo -1
 * @returns {string}
 */
export function shiftMonth(monthStr, offset) {
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Vrátí počet dní v měsíci.
 * @param {string} monthStr - YYYY-MM
 * @returns {number}
 */
export function getDaysInMonth(monthStr) {
  const [year, month] = monthStr.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

/**
 * Vrátí den v týdnu prvního dne měsíce (0 = pondělí, 6 = neděle).
 * @param {string} monthStr - YYYY-MM
 * @returns {number}
 */
export function getFirstDayOfMonth(monthStr) {
  const [year, month] = monthStr.split('-').map(Number);
  const day = new Date(year, month - 1, 1).getDay();
  // Převod z neděle=0 na pondělí=0
  return day === 0 ? 6 : day - 1;
}
