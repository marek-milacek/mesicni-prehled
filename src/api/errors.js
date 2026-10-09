/**
 * Vlastní třída chyb pro API vrstvu.
 * Simuluje HTTP chybové odpovědi se stavovým kódem a českou zprávou.
 */
export class ApiError extends Error {
  /**
   * @param {number} status - HTTP stavový kód (400, 401, 404, 409, 500)
   * @param {string} message - Srozumitelná česká zpráva pro uživatele
   */
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
