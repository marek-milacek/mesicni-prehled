/**
 * View: Záznamy – seznam, filtrování, vyhledávání, CRUD.
 */

import * as api from '../api/client.js';
import { getState } from '../state/store.js';
import { showToast } from '../utils/toast.js';
import { createElement, clearElement, showSkeleton, showError, showEmpty } from '../utils/dom.js';
import { formatDate } from '../utils/date.js';
import { CATEGORY_LABELS } from '../charts/charts.js';
import { getCategoryIcon, formatEntryValue } from './dashboard.js';
import { broadcastChange } from '../state/sync.js';
import { validateEntryForm } from '../utils/validation.js';

let currentPage = 1;
let currentFilters = {};

export async function renderEntries(container) {
  clearElement(container);
  currentPage = 1;
  currentFilters = { month: getState().currentMonth };

  const page = createElement('div', { className: 'entries-page' });

  // Hlavička
  const header = createElement('header', { className: 'page-header' },
    createElement('h2', { className: 'page-title' }, 'Záznamy'),
    createElement('button', {
      className: 'btn btn--primary',
      id: 'add-entry-btn',
      type: 'button',
      onClick: () => showEntryModal(),
    }, '+ Nový záznam'),
  );
  page.appendChild(header);

  // Filtry
  const filters = createFilters();
  page.appendChild(filters);

  // Seznam záznamů
  const list = createElement('div', { id: 'entries-list', className: 'entries-list entries-list--full' });
  page.appendChild(list);

  // Stránkování
  const pagination = createElement('div', { id: 'entries-pagination', className: 'pagination' });
  page.appendChild(pagination);

  container.appendChild(page);

  await loadEntries(list, pagination);
}

function createFilters() {
  const bar = createElement('div', { className: 'filter-bar' });

  const monthInput = createElement('input', {
    type: 'month',
    id: 'filter-month',
    className: 'form-input',
    value: getState().currentMonth,
  });
  monthInput.addEventListener('change', () => {
    currentFilters.month = monthInput.value;
    currentPage = 1;
    reloadEntries();
  });

  const categorySelect = createElement('select', {
    id: 'filter-category',
    className: 'form-input',
  });
  categorySelect.appendChild(createElement('option', { value: '' }, 'Všechny kategorie'));
  for (const [key, label] of Object.entries(CATEGORY_LABELS)) {
    categorySelect.appendChild(createElement('option', { value: key }, label));
  }
  categorySelect.addEventListener('change', () => {
    currentFilters.category = categorySelect.value || undefined;
    currentPage = 1;
    reloadEntries();
  });

  const searchInput = createElement('input', {
    type: 'search',
    id: 'filter-search',
    className: 'form-input',
    placeholder: 'Hledat v poznámkách…',
  });
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentFilters.q = searchInput.value || undefined;
      currentPage = 1;
      reloadEntries();
    }, 300);
  });

  bar.appendChild(monthInput);
  bar.appendChild(categorySelect);
  bar.appendChild(searchInput);

  return bar;
}

async function reloadEntries() {
  const list = document.getElementById('entries-list');
  const pagination = document.getElementById('entries-pagination');
  if (list && pagination) {
    await loadEntries(list, pagination);
  }
}

async function loadEntries(list, pagination) {
  showSkeleton(list, 5);
  clearElement(pagination);

  try {
    const result = await api.getEntries({
      ...currentFilters,
      page: currentPage,
      limit: 20,
    });

    renderEntriesList(list, result.entries);
    renderPagination(pagination, result.pagination);
  } catch (err) {
    showError(list, err.message, () => loadEntries(list, pagination));
  }
}

function renderEntriesList(container, entries) {
  clearElement(container);

  if (entries.length === 0) {
    showEmpty(container, 'Žádné záznamy pro dané filtry.', '📭');
    return;
  }

  for (const entry of entries) {
    const el = createElement('div', { className: 'entry-item entry-item--clickable', dataset: { id: entry.id } },
      createElement('div', {
        className: `entry-item__category entry-item__category--${entry.category}`,
        'aria-hidden': 'true',
      }, getCategoryIcon(entry.category)),
      createElement('div', { className: 'entry-item__content' },
        createElement('span', { className: 'entry-item__note' },
          entry.note || CATEGORY_LABELS[entry.category],
        ),
        createElement('span', { className: 'entry-item__meta' },
          `${formatDate(entry.date)} · ${CATEGORY_LABELS[entry.category]} · ${formatEntryValue(entry)}`,
        ),
        ...(entry.tags && entry.tags.length > 0
          ? [createElement('div', { className: 'entry-item__tags' },
              ...entry.tags.map((t) => createElement('span', { className: 'tag' }, t)),
            )]
          : []),
      ),
      createElement('div', { className: 'entry-item__actions' },
        createElement('button', {
          className: 'btn btn--icon',
          title: 'Upravit',
          'aria-label': 'Upravit záznam',
          type: 'button',
          onClick: (e) => { e.stopPropagation(); showEntryModal(entry); },
        }, '✏️'),
        createElement('button', {
          className: 'btn btn--icon btn--danger',
          title: 'Smazat',
          'aria-label': 'Smazat záznam',
          type: 'button',
          onClick: (e) => { e.stopPropagation(); confirmDelete(entry.id); },
        }, '🗑️'),
      ),
    );
    container.appendChild(el);
  }
}

function renderPagination(container, pag) {
  clearElement(container);

  if (pag.totalPages <= 1) return;

  const prevBtn = createElement('button', {
    className: 'btn btn--secondary',
    disabled: pag.page <= 1 ? '' : undefined,
    type: 'button',
    onClick: () => { currentPage--; reloadEntries(); },
  }, '← Předchozí');

  const info = createElement('span', { className: 'pagination__info' },
    `Strana ${pag.page} z ${pag.totalPages} (${pag.total} záznamů)`,
  );

  const nextBtn = createElement('button', {
    className: 'btn btn--secondary',
    disabled: pag.page >= pag.totalPages ? '' : undefined,
    type: 'button',
    onClick: () => { currentPage++; reloadEntries(); },
  }, 'Další →');

  container.appendChild(prevBtn);
  container.appendChild(info);
  container.appendChild(nextBtn);
}

/* ── Modální okno pro přidání/úpravu záznamu ─────────────────── */

function showEntryModal(entry = null) {
  const isEdit = !!entry;

  // Overlay
  const overlay = createElement('div', { className: 'modal-overlay', id: 'entry-modal-overlay' });
  const modal = createElement('div', {
    className: 'modal',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': isEdit ? 'Upravit záznam' : 'Nový záznam',
  });

  const modalHeader = createElement('div', { className: 'modal__header' },
    createElement('h3', { className: 'modal__title' }, isEdit ? 'Upravit záznam' : 'Nový záznam'),
    createElement('button', {
      className: 'modal__close',
      'aria-label': 'Zavřít',
      type: 'button',
      onClick: () => overlay.remove(),
    }, '×'),
  );
  modal.appendChild(modalHeader);

  const form = createElement('form', { className: 'modal__form', id: 'entry-form' });

  // Datum
  form.appendChild(createFormGroup('Datum', createElement('input', {
    type: 'date',
    id: 'entry-date',
    className: 'form-input',
    value: entry?.date || new Date().toISOString().split('T')[0],
    required: '',
  })));

  // Kategorie
  const catSelect = createElement('select', {
    id: 'entry-category',
    className: 'form-input',
    required: '',
  });
  catSelect.appendChild(createElement('option', { value: '' }, 'Vyberte…'));
  for (const [key, label] of Object.entries(CATEGORY_LABELS)) {
    const opt = createElement('option', { value: key }, label);
    if (entry?.category === key) opt.selected = true;
    catSelect.appendChild(opt);
  }
  form.appendChild(createFormGroup('Kategorie', catSelect));

  // Hodnota
  form.appendChild(createFormGroup('Hodnota', createElement('input', {
    type: 'number',
    id: 'entry-value',
    className: 'form-input',
    value: entry?.value ?? '',
    min: '0',
    step: '1',
    required: '',
  })));

  // Poznámka
  form.appendChild(createFormGroup('Poznámka', createElement('textarea', {
    id: 'entry-note',
    className: 'form-input form-textarea',
    placeholder: 'Volitelná poznámka…',
    maxlength: '500',
    rows: '3',
  }, entry?.note || '')));

  // Štítky
  form.appendChild(createFormGroup('Štítky (oddělte čárkou)', createElement('input', {
    type: 'text',
    id: 'entry-tags',
    className: 'form-input',
    value: entry?.tags?.join(', ') || '',
    placeholder: 'např. škola, sport',
  })));

  const errorBox = createElement('div', { className: 'form-errors', id: 'entry-errors', role: 'alert' });
  form.appendChild(errorBox);

  const actions = createElement('div', { className: 'modal__actions' },
    createElement('button', {
      type: 'button',
      className: 'btn btn--secondary',
      onClick: () => overlay.remove(),
    }, 'Zrušit'),
    createElement('button', {
      type: 'submit',
      className: 'btn btn--primary',
      id: 'entry-submit',
    }, isEdit ? 'Uložit' : 'Přidat'),
  );
  form.appendChild(actions);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
      date: form.querySelector('#entry-date').value,
      category: form.querySelector('#entry-category').value,
      value: Number(form.querySelector('#entry-value').value),
      note: form.querySelector('#entry-note').value,
      tags: form.querySelector('#entry-tags').value
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };

    const { valid, errors } = validateEntryForm(data);
    if (!valid) {
      errorBox.textContent = errors.join(' ');
      return;
    }

    const submitBtn = form.querySelector('#entry-submit');
    submitBtn.disabled = true;

    try {
      if (isEdit) {
        await api.updateEntry(entry.id, data);
        showToast('Záznam upraven.', 'success');
      } else {
        await api.createEntry(data);
        showToast('Záznam přidán!', 'success');
      }
      broadcastChange('entries-changed');
      overlay.remove();
      reloadEntries();
    } catch (err) {
      errorBox.textContent = err.message;
      submitBtn.disabled = false;
    }
  });

  modal.appendChild(form);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Focus prvního pole
  requestAnimationFrame(() => {
    modal.querySelector('#entry-date')?.focus();
  });

  // Zavřít klávesou Esc
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') overlay.remove();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

function createFormGroup(label, input) {
  return createElement('div', { className: 'form-group' },
    createElement('label', { className: 'form-label', htmlFor: input.id }, label),
    input,
  );
}

async function confirmDelete(id) {
  const confirmed = window.confirm('Opravdu chcete smazat tento záznam? Tato akce je nevratná.');
  if (!confirmed) return;

  try {
    await api.deleteEntry(id);
    showToast('Záznam smazán.', 'success');
    broadcastChange('entries-changed');
    reloadEntries();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
