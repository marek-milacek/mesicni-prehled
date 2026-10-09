/**
 * Toast notifikace pro informování uživatele o výsledcích akcí.
 */

let toastContainer = null;

function ensureContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container';
    toastContainer.setAttribute('aria-live', 'polite');
    toastContainer.setAttribute('role', 'status');
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

/**
 * Zobrazí toast notifikaci.
 * @param {string} message - Zpráva
 * @param {'success'|'error'|'info'|'warning'} [type='info'] - Typ
 * @param {number} [duration=3000] - Délka zobrazení v ms
 */
export function showToast(message, type = 'info', duration = 3000) {
  const container = ensureContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'alert');

  const icons = {
    success: '✓',
    error: '✗',
    info: 'ℹ',
    warning: '⚠',
  };

  const icon = document.createElement('span');
  icon.className = 'toast__icon';
  icon.textContent = icons[type] || icons.info;
  icon.setAttribute('aria-hidden', 'true');

  const text = document.createElement('span');
  text.className = 'toast__text';
  text.textContent = message;

  const close = document.createElement('button');
  close.className = 'toast__close';
  close.textContent = '×';
  close.setAttribute('aria-label', 'Zavřít');
  close.type = 'button';

  toast.appendChild(icon);
  toast.appendChild(text);
  toast.appendChild(close);

  container.appendChild(toast);

  // Animace dovnitř
  requestAnimationFrame(() => {
    toast.classList.add('toast--visible');
  });

  const remove = () => {
    toast.classList.remove('toast--visible');
    toast.addEventListener('transitionend', () => {
      toast.remove();
    });
  };

  close.addEventListener('click', remove);
  setTimeout(remove, duration);
}
