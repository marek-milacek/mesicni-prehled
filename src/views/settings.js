/**
 * View: Nastavení a správa dat.
 * Zahrnuje profil, přepínač motivu, export/import JSON, demo data, latenci a školní info.
 */

import * as api from '../api/client.js';
import { getState, setState } from '../state/store.js';
import { navigate } from '../router.js';
import { showToast } from '../utils/toast.js';
import { createElement, clearElement } from '../utils/dom.js';
import { generateDemoData } from '../utils/demo.js';
import { broadcastChange } from '../state/sync.js';

export async function renderSettings(container) {
  clearElement(container);

  const page = createElement('div', { className: 'settings-page' });

  const header = createElement('header', { className: 'page-header' },
    createElement('h2', { className: 'page-title' }, 'Nastavení a data'),
  );
  page.appendChild(header);

  const grid = createElement('div', { className: 'settings-grid' });

  // 1. Sekce: Uživatelský účet
  const user = getState().user;
  const userCard = createElement('section', { className: 'card settings-card' },
    createElement('h3', { className: 'card__title' }, '👤 Uživatelský profil'),
    createElement('div', { className: 'settings-card__content' },
      createElement('p', {},
        createElement('strong', {}, 'Uživatel: '),
        user ? user.username : 'Nepřihlášen',
      ),
      createElement('p', {},
        createElement('strong', {}, 'ID uživatele: '),
        user ? user.id : '–',
      ),
      createElement('div', { className: 'settings-card__actions' },
        createElement('button', {
          className: 'btn btn--secondary',
          type: 'button',
          id: 'settings-logout-btn',
          onClick: async () => {
            try {
              await api.logout();
              setState({ user: null });
              broadcastChange('logout');
              showToast('Byl jste úspěšně odhlášen.', 'info');
              navigate('auth');
            } catch (err) {
              showToast(err.message || 'Chyba při odhlášení.', 'error');
            }
          },
        }, '🚪 Odhlásit se'),
      ),
    ),
  );
  grid.appendChild(userCard);

  // 2. Sekce: Vzhled aplikace
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'system';
  const themeCard = createElement('section', { className: 'card settings-card' },
    createElement('h3', { className: 'card__title' }, '🎨 Vzhled aplikace'),
    createElement('div', { className: 'settings-card__content' },
      createElement('p', { className: 'text-muted' }, 'Zvolte barevný režim rozhraní:'),
      createElement('div', { className: 'theme-selector' },
        createThemeOption('light', '☀️ Světlý', currentTheme === 'light'),
        createThemeOption('dark', '🌙 Tmavý', currentTheme === 'dark'),
        createThemeOption('system', '💻 Podle systému', currentTheme === 'system' || !currentTheme),
      ),
    ),
  );
  grid.appendChild(themeCard);

  // 3. Sekce: Zálohování a obnova dat (Export / Import)
  const dataCard = createElement('section', { className: 'card settings-card' },
    createElement('h3', { className: 'card__title' }, '💾 Správa dat a zálohy'),
    createElement('div', { className: 'settings-card__content' },
      createElement('p', { className: 'text-muted' },
        'Data jsou uložena v lokálním úložišti prohlížeče. Zde je můžete exportovat do souboru JSON nebo načíst ze zálohy.',
      ),
      createElement('div', { className: 'data-actions-row' },
        createElement('button', {
          className: 'btn btn--secondary',
          id: 'export-data-btn',
          type: 'button',
          onClick: async () => {
            try {
              const exportResult = await api.exportData();
              const jsonStr = JSON.stringify(exportResult, null, 2);
              const blob = new Blob([jsonStr], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              const dateStr = new Date().toISOString().slice(0, 10);
              link.href = url;
              link.download = `mesicni-prehled-zaloha-${dateStr}.json`;
              document.body.appendChild(link);
              link.click();
              link.remove();
              URL.revokeObjectURL(url);
              showToast('Záloha byla úspěšně stažena.', 'success');
            } catch (err) {
              showToast(err.message || 'Chyba při exportu dat.', 'error');
            }
          },
        }, '📥 Exportovat JSON'),

        createElement('label', {
          className: 'btn btn--secondary file-input-label',
          id: 'import-data-label',
        },
          '📤 Importovat JSON',
          createElement('input', {
            type: 'file',
            accept: '.json',
            id: 'import-file-input',
            style: 'display: none;',
            onChange: async (e) => {
              const file = e.target.files && e.target.files[0];
              if (!file) return;

              const reader = new FileReader();
              reader.onload = async (event) => {
                try {
                  const parsed = JSON.parse(event.target.result);
                  if (!parsed.entries && !Array.isArray(parsed)) {
                    throw new Error('Neplatný formát souboru se zálohou.');
                  }
                  const importPayload = Array.isArray(parsed) ? { entries: parsed } : parsed;
                  const res = await api.importData(importPayload);
                  broadcastChange('entries-changed');
                  showToast(res.message || 'Data byla úspěšně importována!', 'success');
                } catch (err) {
                  showToast(err.message || 'Chyba při čtení souboru.', 'error');
                }
              };
              reader.readAsText(file);
              // Reset input
              e.target.value = '';
            },
          }),
        ),

        createElement('button', {
          className: 'btn btn--outline',
          id: 'generate-demo-btn',
          type: 'button',
          onClick: async () => {
            if (confirm('Chcete vygenerovat demo data pro aktuální a minulý měsíc?')) {
              try {
                const demoData = generateDemoData();
                await api.importData(demoData);
                broadcastChange('entries-changed');
                showToast('Ukázková data byla úspěšně vygenerována!', 'success');
              } catch (err) {
                showToast(err.message || 'Chyba při generování demo dat.', 'error');
              }
            }
          },
        }, '✨ Vygenerovat demo data'),
      ),
    ),
  );
  grid.appendChild(dataCard);

  // 4. Sekce: Simulovaná latence API
  const latencyCard = createElement('section', { className: 'card settings-card' },
    createElement('h3', { className: 'card__title' }, '⚡ Simulace sítě (Mock REST API)'),
    createElement('div', { className: 'settings-card__content' },
      createElement('p', { className: 'text-muted' },
        'Aplikace komunikuje s lokální mock databází přes asynchronní rozhraní simulující odezvu serveru.',
      ),
      createElement('div', { className: 'latency-controls' },
        createLatencyButton('0 ms (okamžitá)', 0, 0),
        createLatencyButton('100–300 ms (výchozí)', 100, 300),
        createLatencyButton('500–1000 ms (pomalá síť)', 500, 1000),
      ),
    ),
  );
  grid.appendChild(latencyCard);

  // 5. Sekce: O projektu a škole
  const infoCard = createElement('section', { className: 'card settings-card settings-card--wide' },
    createElement('h3', { className: 'card__title' }, 'ℹ️ O projektu a autorovi'),
    createElement('div', { className: 'settings-card__content project-info' },
      createElement('div', { className: 'project-info__item' },
        createElement('strong', {}, 'Projekt: '),
        'Měsíční přehled (Month in Review)',
      ),
      createElement('div', { className: 'project-info__item' },
        createElement('strong', {}, 'Autor: '),
        'Marek Miláček',
      ),
      createElement('div', { className: 'project-info__item' },
        createElement('strong', {}, 'Třída: '),
        '3.A',
      ),
      createElement('div', { className: 'project-info__item' },
        createElement('strong', {}, 'Škola: '),
        'Střední průmyslová škola dopravní, Praha – Motol (SPŠD Motol)',
      ),
      createElement('div', { className: 'project-info__item' },
        createElement('strong', {}, 'Období: '),
        'Říjen 2026',
      ),
      createElement('div', { className: 'project-info__item' },
        createElement('strong', {}, 'Technologie: '),
        'Vite, Vanilla JavaScript (ES moduly), Chart.js, HTML5 & CSS3',
      ),
    ),
  );
  grid.appendChild(infoCard);

  page.appendChild(grid);
  container.appendChild(page);
}

function createThemeOption(themeKey, labelText, isSelected) {
  const label = createElement('label', { className: 'theme-radio-label' });
  const radio = createElement('input', {
    type: 'radio',
    name: 'app-theme-option',
    value: themeKey,
    checked: isSelected,
  });
  radio.addEventListener('change', () => {
    applyTheme(themeKey);
  });
  label.appendChild(radio);
  label.appendChild(document.createTextNode(` ${labelText}`));
  return label;
}

function applyTheme(themeKey) {
  if (themeKey === 'system') {
    localStorage.removeItem('mp_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    localStorage.setItem('mp_theme', themeKey);
    document.documentElement.setAttribute('data-theme', themeKey);
  }
  showToast(`Motiv byl změněn: ${themeKey}`, 'info');
}

function createLatencyButton(label, min, max) {
  return createElement('button', {
    className: 'btn btn--outline btn--sm',
    type: 'button',
    onClick: () => {
      api.setLatency(min, max);
      showToast(`Latence nastavena na: ${label}`, 'info');
    },
  }, label);
}
