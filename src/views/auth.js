/**
 * View: Přihlášení a registrace.
 */

import * as api from '../api/client.js';
import { setState } from '../state/store.js';
import { navigate } from '../router.js';
import { showToast } from '../utils/toast.js';
import { validateAuthForm } from '../utils/validation.js';
import { createElement, clearElement } from '../utils/dom.js';

export async function renderAuth(container) {
  clearElement(container);

  const wrapper = createElement('div', { className: 'auth-page' });

  const card = createElement('div', { className: 'auth-card' });

  const logo = createElement('div', { className: 'auth-card__logo' },
    createElement('span', { className: 'auth-card__icon', 'aria-hidden': 'true' }, '📊'),
    createElement('h1', { className: 'auth-card__title' }, 'Měsíční přehled'),
    createElement('p', { className: 'auth-card__subtitle' }, 'Sledujte své návyky, úkoly a výdaje'),
  );
  card.appendChild(logo);

  // Tabs
  const tabBar = createElement('div', { className: 'auth-tabs', role: 'tablist' });
  const loginTab = createElement('button', {
    className: 'auth-tabs__tab auth-tabs__tab--active',
    role: 'tab',
    'aria-selected': 'true',
    id: 'tab-login',
    type: 'button',
  }, 'Přihlášení');
  const registerTab = createElement('button', {
    className: 'auth-tabs__tab',
    role: 'tab',
    'aria-selected': 'false',
    id: 'tab-register',
    type: 'button',
  }, 'Registrace');
  tabBar.appendChild(loginTab);
  tabBar.appendChild(registerTab);
  card.appendChild(tabBar);

  // Formuláře
  const formContainer = createElement('div', { className: 'auth-form-container' });
  card.appendChild(formContainer);

  let isRegister = false;

  function renderForm() {
    clearElement(formContainer);

    const form = createElement('form', {
      className: 'auth-form',
      id: isRegister ? 'register-form' : 'login-form',
      novalidate: '',
    });

    const usernameGroup = createElement('div', { className: 'form-group' },
      createElement('label', { htmlFor: 'auth-username', className: 'form-label' }, 'Uživatelské jméno'),
      createElement('input', {
        type: 'text',
        id: 'auth-username',
        className: 'form-input',
        placeholder: 'Zadejte jméno',
        autocomplete: 'username',
        required: '',
      }),
    );
    form.appendChild(usernameGroup);

    const passwordGroup = createElement('div', { className: 'form-group' },
      createElement('label', { htmlFor: 'auth-password', className: 'form-label' }, 'Heslo'),
      createElement('input', {
        type: 'password',
        id: 'auth-password',
        className: 'form-input',
        placeholder: 'Zadejte heslo',
        autocomplete: isRegister ? 'new-password' : 'current-password',
        required: '',
      }),
    );
    form.appendChild(passwordGroup);

    if (isRegister) {
      const confirmGroup = createElement('div', { className: 'form-group' },
        createElement('label', { htmlFor: 'auth-password-confirm', className: 'form-label' }, 'Heslo znovu'),
        createElement('input', {
          type: 'password',
          id: 'auth-password-confirm',
          className: 'form-input',
          placeholder: 'Zopakujte heslo',
          autocomplete: 'new-password',
          required: '',
        }),
      );
      form.appendChild(confirmGroup);
    }

    const errorBox = createElement('div', { className: 'form-errors', id: 'auth-errors', role: 'alert' });
    form.appendChild(errorBox);

    const submitBtn = createElement('button', {
      type: 'submit',
      className: 'btn btn--primary btn--full',
      id: 'auth-submit',
    }, isRegister ? 'Zaregistrovat se' : 'Přihlásit se');
    form.appendChild(submitBtn);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = form.querySelector('#auth-username').value;
      const password = form.querySelector('#auth-password').value;
      const passwordConfirm = isRegister
        ? form.querySelector('#auth-password-confirm')?.value
        : password;

      const { valid, errors } = validateAuthForm(
        { username, password, passwordConfirm },
        isRegister,
      );

      if (!valid) {
        errorBox.textContent = errors.join(' ');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Čekejte…';
      errorBox.textContent = '';

      try {
        const result = isRegister
          ? await api.register(username, password)
          : await api.login(username, password);

        setState({ user: result.user, currentView: 'dashboard' });
        showToast(
          isRegister ? 'Registrace úspěšná!' : `Vítejte, ${result.user.displayName}!`,
          'success',
        );
        navigate('dashboard');
      } catch (err) {
        errorBox.textContent = err.message;
        submitBtn.disabled = false;
        submitBtn.textContent = isRegister ? 'Zaregistrovat se' : 'Přihlásit se';
      }
    });

    formContainer.appendChild(form);
  }

  loginTab.addEventListener('click', () => {
    isRegister = false;
    loginTab.classList.add('auth-tabs__tab--active');
    loginTab.setAttribute('aria-selected', 'true');
    registerTab.classList.remove('auth-tabs__tab--active');
    registerTab.setAttribute('aria-selected', 'false');
    renderForm();
  });

  registerTab.addEventListener('click', () => {
    isRegister = true;
    registerTab.classList.add('auth-tabs__tab--active');
    registerTab.setAttribute('aria-selected', 'true');
    loginTab.classList.remove('auth-tabs__tab--active');
    loginTab.setAttribute('aria-selected', 'false');
    renderForm();
  });

  renderForm();

  wrapper.appendChild(card);
  container.appendChild(wrapper);
}
