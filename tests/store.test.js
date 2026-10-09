import { describe, it, expect } from 'vitest';
import { getState, setState, subscribe } from '../src/state/store.js';

describe('Reactive store', () => {
  it('returns current state', () => {
    const state = getState();
    expect(state).toHaveProperty('currentMonth');
    expect(state).toHaveProperty('user');
  });

  it('updates state and notifies key-specific listener', () => {
    let notifiedVal = null;
    const unsubscribe = subscribe('currentMonth', (newVal) => {
      notifiedVal = newVal;
    });

    setState({ currentMonth: '2026-11' });
    expect(getState().currentMonth).toBe('2026-11');
    expect(notifiedVal).toBe('2026-11');

    unsubscribe();
    setState({ currentMonth: '2026-12' });
    // After unsubscribe, notifiedVal should not change
    expect(notifiedVal).toBe('2026-11');
  });

  it('notifies global wildcard listener', () => {
    let called = false;
    const unsubscribe = subscribe('*', (newState) => {
      called = true;
    });

    setState({ isLoading: true });
    expect(called).toBe(true);
    unsubscribe();
  });
});
