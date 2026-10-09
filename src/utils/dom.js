/**
 * Utility pro bezpečné práce s DOM.
 * Prevence XSS – žádné innerHTML s uživatelskými texty.
 */

/**
 * Escapuje HTML entity v textu.
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Vytvoří DOM element s atributy a dětmi.
 * @param {string} tag
 * @param {object} [attrs]
 * @param {...(string|Node)} children
 * @returns {HTMLElement}
 */
export function createElement(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') {
      el.className = value;
    } else if (key === 'dataset') {
      for (const [dataKey, dataValue] of Object.entries(value)) {
        el.dataset[dataKey] = dataValue;
      }
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'htmlFor') {
      el.setAttribute('for', value);
    } else {
      el.setAttribute(key, value);
    }
  }

  for (const child of children) {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      el.appendChild(child);
    }
  }

  return el;
}

/**
 * Odstraní veškeré děti elementu.
 * @param {HTMLElement} el
 */
export function clearElement(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

/**
 * Najde element nebo vyhodí chybu.
 * @param {string} selector
 * @returns {HTMLElement}
 */
export function $(selector) {
  const el = document.querySelector(selector);
  if (!el) {
    throw new Error(`Element "${selector}" nenalezen.`);
  }
  return el;
}

/**
 * Zobrazí skeleton/loading stav v kontejneru.
 * @param {HTMLElement} container
 * @param {number} [count=3]
 */
export function showSkeleton(container, count = 3) {
  clearElement(container);
  for (let i = 0; i < count; i++) {
    container.appendChild(createElement('div', { className: 'skeleton' }));
  }
}

/**
 * Zobrazí chybový stav s tlačítkem Zkusit znovu.
 * @param {HTMLElement} container
 * @param {string} message
 * @param {Function} onRetry
 */
export function showError(container, message, onRetry) {
  clearElement(container);
  const wrapper = createElement('div', { className: 'error-state' },
    createElement('p', { className: 'error-state__message' }, message),
    createElement('button', {
      className: 'btn btn--secondary',
      onClick: onRetry,
      type: 'button',
    }, 'Zkusit znovu'),
  );
  container.appendChild(wrapper);
}

/**
 * Zobrazí prázdný stav.
 * @param {HTMLElement} container
 * @param {string} message
 * @param {string} [icon='📭']
 */
export function showEmpty(container, message, icon = '📭') {
  clearElement(container);
  container.appendChild(
    createElement('div', { className: 'empty-state' },
      createElement('span', { className: 'empty-state__icon', 'aria-hidden': 'true' }, icon),
      createElement('p', { className: 'empty-state__message' }, message),
    ),
  );
}
