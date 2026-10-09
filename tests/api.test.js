import { describe, it, expect, beforeEach } from 'vitest';
import * as api from '../src/api/client.js';

describe('API Client and Mock Server', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    api.setLatency(0, 0); // V testech okamžitá odpověď
    api.initApi();
  });

  it('handles user registration, me, and logout', async () => {
    const res = await api.register('testuser', 'secret123');
    expect(res).toHaveProperty('user');
    expect(res.user).toHaveProperty('id');
    expect(res.user.username).toBe('testuser');
    expect(api.isLoggedIn()).toBe(true);

    const me = await api.getMe();
    expect(me.username).toBe('testuser');

    await api.logout();
    expect(api.isLoggedIn()).toBe(false);
  });

  it('rejects duplicate registration and invalid login', async () => {
    await api.register('student', 'heslo123');
    await api.logout();

    // Duplicitní registrace
    await expect(api.register('student', 'jineheslo')).rejects.toThrow();

    // Špatné heslo
    await expect(api.login('student', 'spatneheslo')).rejects.toThrow();

    // Správné heslo
    const logged = await api.login('student', 'heslo123');
    expect(logged.user.username).toBe('student');
  });

  it('performs complete CRUD workflow on entries', async () => {
    await api.register('tester', 'pass123');

    // 1. Create
    const created = await api.createEntry({
      date: '2026-10-10',
      category: 'studium',
      value: 90,
      note: 'Příprava na zkoušku z databází',
      tags: ['škola'],
    });
    expect(created).toHaveProperty('id');
    expect(created.value).toBe(90);

    // 2. Read list
    const list = await api.getEntries({ month: '2026-10' });
    expect(list.entries).toHaveLength(1);
    expect(list.entries[0].id).toBe(created.id);

    // 3. Read single
    const single = await api.getEntry(created.id);
    expect(single.note).toBe('Příprava na zkoušku z databází');

    // 4. Update
    const updated = await api.updateEntry(created.id, {
      date: '2026-10-10',
      category: 'studium',
      value: 120,
      note: 'Příprava na zkoušku z databází (prodlouženo)',
      tags: ['škola', 'zkouška'],
    });
    expect(updated.value).toBe(120);

    // 5. Delete
    await api.deleteEntry(created.id);
    const afterDelete = await api.getEntries({ month: '2026-10' });
    expect(afterDelete.entries).toHaveLength(0);
  });

  it('calculates monthly statistics correctly', async () => {
    await api.register('analyst', 'pass123');

    await api.createEntry({ date: '2026-10-01', category: 'navyk', value: 1 });
    await api.createEntry({ date: '2026-10-02', category: 'navyk', value: 1 });
    await api.createEntry({ date: '2026-10-03', category: 'studium', value: 60 });
    await api.createEntry({ date: '2026-10-04', category: 'vydaj', value: 250 });

    const stats = await api.getStats('2026-10');
    expect(stats.totalEntries).toBe(4);
    expect(stats.byCategory.navyk.count).toBe(2);
    expect(stats.byCategory.studium.total).toBe(60);
    expect(stats.byCategory.vydaj.total).toBe(250);
  });

  it('supports goals setting and retrieval', async () => {
    await api.register('goalgetter', 'pass123');

    const goalsToSet = [
      { category: 'studium', target: 500, month: '2026-10' },
      { category: 'navyk', target: 20, month: '2026-10' },
    ];
    await api.setGoals(goalsToSet);

    const retrieved = await api.getGoals();
    expect(retrieved).toHaveLength(2);
    expect(retrieved.find((g) => g.category === 'studium')?.target).toBe(500);
  });

  it('supports full export and import of user data', async () => {
    await api.register('exporter', 'pass123');

    await api.createEntry({ date: '2026-10-05', category: 'ukol', value: 1, note: 'Úkol 1' });
    await api.setGoals([{ category: 'ukol', target: 10, month: '2026-10' }]);

    const exported = await api.exportData();
    expect(exported).toHaveProperty('entries');
    expect(exported.entries).toHaveLength(1);

    // Vytvoříme nového uživatele a importujeme data k němu
    await api.register('importer', 'pass123');
    await api.importData(exported);

    const importedEntries = await api.getEntries({ month: '2026-10' });
    expect(importedEntries.entries).toHaveLength(1);
    expect(importedEntries.entries[0].note).toBe('Úkol 1');
  });
});
