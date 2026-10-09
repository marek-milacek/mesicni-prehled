/**
 * Validace formulářů na straně klienta.
 * Doplňková k serverové validaci v mockServer.js.
 */

/**
 * Validuje data záznamu.
 * @param {object} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateEntryForm(data) {
  const errors = [];

  if (!data.date) {
    errors.push('Vyplňte datum.');
  }
  if (!data.category) {
    errors.push('Vyberte kategorii.');
  }
  if (data.value === '' || data.value === undefined || data.value === null) {
    errors.push('Vyplňte hodnotu.');
  } else if (isNaN(Number(data.value)) || Number(data.value) < 0) {
    errors.push('Hodnota musí být nezáporné číslo.');
  }
  if (data.note && data.note.length > 500) {
    errors.push('Poznámka může mít max. 500 znaků.');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validuje přihlašovací/registrační formulář.
 * @param {object} data
 * @param {boolean} isRegister
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateAuthForm(data, isRegister = false) {
  const errors = [];

  if (!data.username || data.username.trim().length < 3) {
    errors.push('Uživatelské jméno musí mít alespoň 3 znaky.');
  }
  if (!data.password || data.password.length < 4) {
    errors.push(isRegister ? 'Heslo musí mít alespoň 4 znaky.' : 'Vyplňte heslo.');
  }
  if (isRegister && data.password !== data.passwordConfirm) {
    errors.push('Hesla se neshodují.');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validuje cíl.
 * @param {object} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateGoalForm(data) {
  const errors = [];

  if (!data.category) {
    errors.push('Vyberte kategorii.');
  }
  if (!data.target || isNaN(Number(data.target)) || Number(data.target) <= 0) {
    errors.push('Cíl musí být kladné číslo.');
  }

  return { valid: errors.length === 0, errors };
}
