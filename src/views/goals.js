/**
 * View: Cíle – nastavení a sledování měsíčních cílů.
 */

import * as api from '../api/client.js';
import { getState } from '../state/store.js';
import { showToast } from '../utils/toast.js';
import { createElement, clearElement, showSkeleton, showError, showEmpty } from '../utils/dom.js';
import { getMonthName, formatNumber } from '../utils/date.js';
import { CATEGORY_LABELS } from '../charts/charts.js';
import { validateGoalForm } from '../utils/validation.js';

export async function renderGoals(container) {
  clearElement(container);

  const page = createElement('div', { className: 'goals-page' });

  const header = createElement('header', { className: 'page-header' },
    createElement('h2', { className: 'page-title' },
      `Cíle – ${getMonthName(getState().currentMonth)}`,
    ),
  );
  page.appendChild(header);

  // Formulář pro přidání cíle
  const addSection = createElement('section', { className: 'add-goal-section' },
    createElement('h3', { className: 'section-title' }, 'Nový cíl'),
  );
  const addForm = createGoalForm();
  addSection.appendChild(addForm);
  page.appendChild(addSection);

  // Seznam cílů
  const goalsContent = createElement('div', { id: 'goals-list', className: 'goals-list' });
  page.appendChild(goalsContent);

  container.appendChild(page);

  await loadGoals(goalsContent);
}

function createGoalForm() {
  const form = createElement('form', { className: 'goal-form', id: 'add-goal-form' });

  const catSelect = createElement('select', {
    id: 'goal-category',
    className: 'form-input',
    required: '',
  });
  catSelect.appendChild(createElement('option', { value: '' }, 'Kategorie…'));
  for (const [key, label] of Object.entries(CATEGORY_LABELS)) {
    catSelect.appendChild(createElement('option', { value: key }, label));
  }

  const targetInput = createElement('input', {
    type: 'number',
    id: 'goal-target',
    className: 'form-input',
    placeholder: 'Cílová hodnota',
    min: '1',
    required: '',
  });

  const submitBtn = createElement('button', {
    type: 'submit',
    className: 'btn btn--primary',
    id: 'goal-submit',
  }, 'Nastavit cíl');

  form.appendChild(catSelect);
  form.appendChild(targetInput);
  form.appendChild(submitBtn);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
      category: catSelect.value,
      target: Number(targetInput.value),
    };

    const { valid, errors } = validateGoalForm(data);
    if (!valid) {
      showToast(errors.join(' '), 'warning');
      return;
    }

    submitBtn.disabled = true;
    try {
      const month = getState().currentMonth;

      // Načíst existující cíle a přidat/aktualizovat
      const existingGoals = await api.getGoals();
      const monthGoals = existingGoals.filter((g) => g.month === month);
      const otherMonthGoals = existingGoals.filter((g) => g.month !== month);

      // Aktualizuj nebo přidej
      const updated = monthGoals.filter((g) => g.category !== data.category);
      updated.push({ ...data, month });

      await api.setGoals([...otherMonthGoals.map((g) => ({
        category: g.category,
        target: g.target,
        month: g.month,
      })), ...updated]);

      showToast('Cíl nastaven!', 'success');
      catSelect.value = '';
      targetInput.value = '';

      const goalsContent = document.getElementById('goals-list');
      if (goalsContent) {
        await loadGoals(goalsContent);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });

  return form;
}

async function loadGoals(goalsContent) {
  showSkeleton(goalsContent, 3);

  try {
    const month = getState().currentMonth;
    const [goalsData, stats] = await Promise.all([
      api.getGoals(),
      api.getStats(month),
    ]);

    const monthGoals = goalsData.filter((g) => g.month === month);

    clearElement(goalsContent);

    if (monthGoals.length === 0) {
      showEmpty(goalsContent, 'Zatím nemáte nastavené žádné cíle pro tento měsíc.', '🎯');
      return;
    }

    for (const goal of monthGoals) {
      const catData = stats.byCategory[goal.category];
      const current = catData ? catData.total : 0;
      const pct = Math.min(100, Math.round((current / goal.target) * 100));

      const card = createElement('div', { className: `goal-card goal-card--${goal.category}` },
        createElement('div', { className: 'goal-card__header' },
          createElement('span', { className: 'goal-card__category' },
            CATEGORY_LABELS[goal.category] || goal.category,
          ),
          createElement('button', {
            className: 'btn btn--icon btn--danger',
            title: 'Odebrat cíl',
            'aria-label': 'Odebrat cíl',
            type: 'button',
            onClick: () => removeGoal(goal, goalsContent),
          }, '🗑️'),
        ),
        createElement('div', { className: 'goal-card__progress' },
          createElement('span', { className: 'goal-card__value' },
            `${formatNumber(current)} / ${formatNumber(goal.target)}`,
          ),
          createElement('span', { className: 'goal-card__pct' }, `${pct} %`),
        ),
        createProgressBar(pct),
      );
      goalsContent.appendChild(card);
    }
  } catch (err) {
    showError(goalsContent, err.message, () => loadGoals(goalsContent));
  }
}

async function removeGoal(goalToRemove, goalsContent) {
  const confirmed = window.confirm(`Opravdu odebrat cíl pro ${CATEGORY_LABELS[goalToRemove.category]}?`);
  if (!confirmed) return;

  try {
    const allGoals = await api.getGoals();
    const remaining = allGoals.filter(
      (g) => !(g.category === goalToRemove.category && g.month === goalToRemove.month),
    );
    await api.setGoals(remaining.map((g) => ({
      category: g.category,
      target: g.target,
      month: g.month,
    })));
    showToast('Cíl odebrán.', 'success');
    await loadGoals(goalsContent);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function createProgressBar(pct) {
  const bar = createElement('div', { className: 'progress-bar' },
    createElement('div', { className: 'progress-bar__fill' }),
  );
  requestAnimationFrame(() => {
    const fill = bar.querySelector('.progress-bar__fill');
    fill.style.width = `${pct}%`;
    if (pct >= 100) fill.classList.add('progress-bar__fill--complete');
  });
  return bar;
}
