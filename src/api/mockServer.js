/**
 * Mock server – routování a logika simulovaného backendu.
 * Zpracovává "požadavky" a vrací odpovědi ve formátu { status, data }.
 */

import { readTable, writeTable } from './db.js';
import { ApiError } from './errors.js';

/* ── Pomocné funkce ───────────────────────────────────────────── */

/**
 * Generuje unikátní ID přes Web Crypto API.
 */
function generateId() {
  return crypto.randomUUID();
}

/**
 * Vrátí aktuální ISO timestamp.
 */
function now() {
  return new Date().toISOString();
}

/**
 * Hashuje heslo pomocí PBKDF2 se solí (Web Crypto API).
 * V reálné aplikaci by toto běželo na serveru.
 * @param {string} password
 * @param {string} [salt] - Hex sůl, pokud existuje
 * @returns {Promise<{hash: string, salt: string}>}
 */
async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const saltBuffer = salt
    ? hexToBuffer(salt)
    : crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );

  return {
    hash: bufferToHex(new Uint8Array(derivedBits)),
    salt: bufferToHex(saltBuffer),
  };
}

function bufferToHex(buffer) {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/* ── Validace ─────────────────────────────────────────────────── */

const CATEGORIES = ['navyk', 'ukol', 'studium', 'vydaj', 'nalada'];

function validateEntry(data) {
  const errors = [];

  if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    errors.push('Datum musí být ve formátu YYYY-MM-DD.');
  }
  if (!data.category || !CATEGORIES.includes(data.category)) {
    errors.push(`Kategorie musí být jedna z: ${CATEGORIES.join(', ')}.`);
  }
  if (data.value === undefined || data.value === null || data.value === '') {
    errors.push('Hodnota je povinná.');
  }
  if (typeof data.value === 'number' && (isNaN(data.value) || data.value < 0)) {
    errors.push('Hodnota musí být nezáporné číslo.');
  }
  if (data.note && typeof data.note !== 'string') {
    errors.push('Poznámka musí být text.');
  }
  if (data.note && data.note.length > 500) {
    errors.push('Poznámka může mít max. 500 znaků.');
  }
  if (data.tags && !Array.isArray(data.tags)) {
    errors.push('Štítky musí být pole.');
  }
  if (data.tags && data.tags.some((t) => typeof t !== 'string' || t.length > 30)) {
    errors.push('Každý štítek musí být text do 30 znaků.');
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join(' '));
  }
}

function validateUser(data, isLogin = false) {
  const errors = [];

  if (!data.username || typeof data.username !== 'string' || data.username.trim().length < 3) {
    errors.push('Uživatelské jméno musí mít alespoň 3 znaky.');
  }
  if (!data.password || typeof data.password !== 'string' || data.password.length < 4) {
    errors.push(isLogin ? 'Zadejte heslo.' : 'Heslo musí mít alespoň 4 znaky.');
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join(' '));
  }
}

/* ── Autentizace ──────────────────────────────────────────────── */

function getSession(sessionToken) {
  if (!sessionToken) {
    throw new ApiError(401, 'Nejste přihlášeni.');
  }
  const sessions = readTable('sessions');
  const session = sessions.find((s) => s.token === sessionToken);
  if (!session) {
    throw new ApiError(401, 'Neplatná relace. Přihlaste se znovu.');
  }
  if (new Date(session.expiresAt) < new Date()) {
    // Smazat expirovanou session
    writeTable(
      'sessions',
      sessions.filter((s) => s.token !== sessionToken),
    );
    throw new ApiError(401, 'Relace vypršela. Přihlaste se znovu.');
  }
  return session;
}

async function handleRegister(body) {
  validateUser(body);
  const users = readTable('users');
  const username = body.username.trim().toLowerCase();

  if (users.find((u) => u.username === username)) {
    throw new ApiError(409, 'Uživatel s tímto jménem již existuje.');
  }

  const { hash, salt } = await hashPassword(body.password);
  const user = {
    id: generateId(),
    username,
    passwordHash: hash,
    passwordSalt: salt,
    displayName: body.username.trim(),
    createdAt: now(),
    updatedAt: now(),
  };

  users.push(user);
  writeTable('users', users);

  // Automaticky přihlásit
  const session = createSession(user.id);
  return {
    status: 201,
    data: {
      user: { id: user.id, username: user.username, displayName: user.displayName },
      token: session.token,
    },
  };
}

async function handleLogin(body) {
  validateUser(body, true);
  const users = readTable('users');
  const username = body.username.trim().toLowerCase();
  const user = users.find((u) => u.username === username);

  if (!user) {
    throw new ApiError(401, 'Nesprávné jméno nebo heslo.');
  }

  const { hash } = await hashPassword(body.password, user.passwordSalt);
  if (hash !== user.passwordHash) {
    throw new ApiError(401, 'Nesprávné jméno nebo heslo.');
  }

  const session = createSession(user.id);
  return {
    status: 200,
    data: {
      user: { id: user.id, username: user.username, displayName: user.displayName },
      token: session.token,
    },
  };
}

function handleLogout(sessionToken) {
  const sessions = readTable('sessions');
  writeTable(
    'sessions',
    sessions.filter((s) => s.token !== sessionToken),
  );
  return { status: 200, data: { message: 'Odhlášení proběhlo úspěšně.' } };
}

function handleMe(sessionToken) {
  const session = getSession(sessionToken);
  const users = readTable('users');
  const user = users.find((u) => u.id === session.userId);
  if (!user) {
    throw new ApiError(404, 'Uživatel nenalezen.');
  }
  return {
    status: 200,
    data: { id: user.id, username: user.username, displayName: user.displayName },
  };
}

function createSession(userId) {
  const sessions = readTable('sessions');
  const session = {
    token: generateId(),
    userId,
    createdAt: now(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dní
  };
  sessions.push(session);
  writeTable('sessions', sessions);
  return session;
}

/* ── CRUD záznamů ─────────────────────────────────────────────── */

function handleGetEntries(sessionToken, params = {}) {
  const session = getSession(sessionToken);
  let entries = readTable('entries').filter((e) => e.userId === session.userId);

  // Filtrování podle měsíce (formát YYYY-MM)
  if (params.month) {
    entries = entries.filter((e) => e.date.startsWith(params.month));
  }

  // Filtrování podle kategorie
  if (params.category) {
    entries = entries.filter((e) => e.category === params.category);
  }

  // Vyhledávání v poznámkách a štítcích
  if (params.q) {
    const q = params.q.toLowerCase();
    entries = entries.filter(
      (e) =>
        (e.note && e.note.toLowerCase().includes(q)) ||
        (e.tags && e.tags.some((t) => t.toLowerCase().includes(q))),
    );
  }

  // Řazení
  const sortBy = params.sortBy || 'date';
  const sortDir = params.sortDir === 'asc' ? 1 : -1;
  entries.sort((a, b) => {
    if (a[sortBy] < b[sortBy]) return -sortDir;
    if (a[sortBy] > b[sortBy]) return sortDir;
    return 0;
  });

  // Celkový počet pro stránkování
  const total = entries.length;

  // Stránkování
  const page = Math.max(1, parseInt(params.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit) || 20));
  const start = (page - 1) * limit;
  const paged = entries.slice(start, start + limit);

  return {
    status: 200,
    data: {
      entries: paged,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  };
}

function handleGetEntry(sessionToken, id) {
  const session = getSession(sessionToken);
  const entries = readTable('entries');
  const entry = entries.find((e) => e.id === id && e.userId === session.userId);

  if (!entry) {
    throw new ApiError(404, 'Záznam nenalezen.');
  }

  return { status: 200, data: entry };
}

function handleCreateEntry(sessionToken, body) {
  const session = getSession(sessionToken);
  validateEntry(body);

  const entry = {
    id: generateId(),
    userId: session.userId,
    date: body.date,
    category: body.category,
    value: Number(body.value),
    note: (body.note || '').trim(),
    tags: (body.tags || []).map((t) => t.trim()).filter(Boolean),
    createdAt: now(),
    updatedAt: now(),
  };

  const entries = readTable('entries');
  entries.push(entry);
  writeTable('entries', entries);

  return { status: 201, data: entry };
}

function handleUpdateEntry(sessionToken, id, body) {
  const session = getSession(sessionToken);
  validateEntry(body);

  const entries = readTable('entries');
  const index = entries.findIndex((e) => e.id === id && e.userId === session.userId);

  if (index === -1) {
    throw new ApiError(404, 'Záznam nenalezen.');
  }

  entries[index] = {
    ...entries[index],
    date: body.date,
    category: body.category,
    value: Number(body.value),
    note: (body.note || '').trim(),
    tags: (body.tags || []).map((t) => t.trim()).filter(Boolean),
    updatedAt: now(),
  };

  writeTable('entries', entries);
  return { status: 200, data: entries[index] };
}

function handleDeleteEntry(sessionToken, id) {
  const session = getSession(sessionToken);
  const entries = readTable('entries');
  const index = entries.findIndex((e) => e.id === id && e.userId === session.userId);

  if (index === -1) {
    throw new ApiError(404, 'Záznam nenalezen.');
  }

  entries.splice(index, 1);
  writeTable('entries', entries);

  return { status: 200, data: { message: 'Záznam byl smazán.' } };
}

/* ── Statistiky měsíce ────────────────────────────────────────── */

function handleGetStats(sessionToken, month) {
  const session = getSession(sessionToken);
  const entries = readTable('entries').filter(
    (e) => e.userId === session.userId && e.date.startsWith(month),
  );

  if (entries.length === 0) {
    return {
      status: 200,
      data: {
        month,
        totalEntries: 0,
        byCategory: {},
        byDay: {},
        byWeek: {},
        bestDay: null,
        worstDay: null,
        longestStreak: 0,
        averagePerDay: 0,
        comparison: null,
      },
    };
  }

  // Součty podle kategorií
  const byCategory = {};
  for (const e of entries) {
    if (!byCategory[e.category]) {
      byCategory[e.category] = { count: 0, total: 0 };
    }
    byCategory[e.category].count++;
    byCategory[e.category].total += e.value;
  }

  // Součty podle dnů
  const byDay = {};
  for (const e of entries) {
    if (!byDay[e.date]) {
      byDay[e.date] = { count: 0, total: 0 };
    }
    byDay[e.date].count++;
    byDay[e.date].total += e.value;
  }

  // Nejlepší a nejhorší den (podle počtu záznamů)
  const days = Object.entries(byDay);
  days.sort((a, b) => b[1].count - a[1].count);
  const bestDay = days[0] ? { date: days[0][0], ...days[0][1] } : null;
  const worstDay = days[days.length - 1]
    ? { date: days[days.length - 1][0], ...days[days.length - 1][1] }
    : null;

  // Součty podle týdnů
  const byWeek = {};
  for (const e of entries) {
    const d = new Date(e.date);
    const weekNum = getWeekNumber(d);
    if (!byWeek[weekNum]) {
      byWeek[weekNum] = { count: 0, total: 0 };
    }
    byWeek[weekNum].count++;
    byWeek[weekNum].total += e.value;
  }

  // Nejdelší série (streak) – po sobě jdoucí dny s alespoň jedním záznamem
  const sortedDates = [...new Set(entries.map((e) => e.date))].sort();
  let longestStreak = 1;
  let currentStreak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);
    if (diffDays === 1) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  // Srovnání s předchozím měsícem
  const [year, monthNum] = month.split('-').map(Number);
  const prevMonth =
    monthNum === 1
      ? `${year - 1}-12`
      : `${year}-${String(monthNum - 1).padStart(2, '0')}`;
  const prevEntries = readTable('entries').filter(
    (e) => e.userId === session.userId && e.date.startsWith(prevMonth),
  );

  const comparison = prevEntries.length > 0
    ? {
        prevMonth,
        prevTotal: prevEntries.length,
        currentTotal: entries.length,
        diff: entries.length - prevEntries.length,
        percentChange:
          prevEntries.length > 0
            ? Math.round(((entries.length - prevEntries.length) / prevEntries.length) * 100)
            : null,
      }
    : null;

  return {
    status: 200,
    data: {
      month,
      totalEntries: entries.length,
      byCategory,
      byDay,
      byWeek,
      bestDay,
      worstDay,
      longestStreak,
      averagePerDay: Math.round((entries.length / Object.keys(byDay).length) * 10) / 10,
      comparison,
    },
  };
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

/* ── Cíle ─────────────────────────────────────────────────────── */

function handleGetGoals(sessionToken) {
  const session = getSession(sessionToken);
  const goals = readTable('goals').filter((g) => g.userId === session.userId);
  return { status: 200, data: goals };
}

function handleSetGoals(sessionToken, body) {
  const session = getSession(sessionToken);

  if (!Array.isArray(body.goals)) {
    throw new ApiError(400, 'Cíle musí být pole.');
  }

  for (const goal of body.goals) {
    if (!goal.category || !CATEGORIES.includes(goal.category)) {
      throw new ApiError(400, `Neplatná kategorie: ${goal.category}.`);
    }
    if (typeof goal.target !== 'number' || goal.target <= 0) {
      throw new ApiError(400, 'Cíl musí být kladné číslo.');
    }
    if (!goal.month || !/^\d{4}-\d{2}$/.test(goal.month)) {
      throw new ApiError(400, 'Měsíc musí být ve formátu YYYY-MM.');
    }
  }

  // Aktualizuj nebo přidej cíle
  const allGoals = readTable('goals');
  const otherGoals = allGoals.filter((g) => g.userId !== session.userId);

  const userGoals = body.goals.map((g) => {
    const existing = allGoals.find(
      (eg) =>
        eg.userId === session.userId &&
        eg.category === g.category &&
        eg.month === g.month,
    );
    return {
      id: existing?.id || generateId(),
      userId: session.userId,
      category: g.category,
      target: g.target,
      month: g.month,
      createdAt: existing?.createdAt || now(),
      updatedAt: now(),
    };
  });

  // Zachovej cíle pro jiné měsíce
  const existingOtherMonths = allGoals.filter(
    (g) =>
      g.userId === session.userId &&
      !body.goals.some((bg) => bg.category === g.category && bg.month === g.month),
  );

  writeTable('goals', [...otherGoals, ...existingOtherMonths, ...userGoals]);

  return { status: 200, data: userGoals };
}

/* ── Export / Import ──────────────────────────────────────────── */

function handleExport(sessionToken) {
  const session = getSession(sessionToken);
  const entries = readTable('entries').filter((e) => e.userId === session.userId);
  const goals = readTable('goals').filter((g) => g.userId === session.userId);

  return {
    status: 200,
    data: {
      exportedAt: now(),
      entries,
      goals,
    },
  };
}

function handleImport(sessionToken, body) {
  const session = getSession(sessionToken);

  if (!body || !Array.isArray(body.entries)) {
    throw new ApiError(400, 'Import musí obsahovat pole záznamů (entries).');
  }

  // Validace importovaných záznamů
  for (const entry of body.entries) {
    validateEntry(entry);
  }

  const allEntries = readTable('entries');
  const otherEntries = allEntries.filter((e) => e.userId !== session.userId);
  const imported = body.entries.map((e) => ({
    id: e.id || generateId(),
    userId: session.userId,
    date: e.date,
    category: e.category,
    value: Number(e.value),
    note: (e.note || '').trim(),
    tags: (e.tags || []).map((t) => t.trim()).filter(Boolean),
    createdAt: e.createdAt || now(),
    updatedAt: now(),
  }));

  writeTable('entries', [...otherEntries, ...imported]);

  // Import cílů, pokud jsou
  if (Array.isArray(body.goals)) {
    const allGoals = readTable('goals');
    const otherGoals = allGoals.filter((g) => g.userId !== session.userId);
    const importedGoals = body.goals.map((g) => ({
      id: g.id || generateId(),
      userId: session.userId,
      category: g.category,
      target: g.target,
      month: g.month,
      createdAt: g.createdAt || now(),
      updatedAt: now(),
    }));
    writeTable('goals', [...otherGoals, ...importedGoals]);
  }

  return {
    status: 200,
    data: { message: `Importováno ${imported.length} záznamů.`, count: imported.length },
  };
}

/* ── Hlavní router ────────────────────────────────────────────── */

/**
 * Zpracuje simulovaný API požadavek.
 * @param {string} method - HTTP metoda (GET, POST, PUT, DELETE)
 * @param {string} path - Cesta endpointu
 * @param {object} [options] - { body, params, sessionToken }
 * @returns {Promise<{status: number, data: any}>}
 */
export async function handleRequest(method, path, options = {}) {
  const { body, params, sessionToken } = options;

  try {
    // Auth endpointy
    if (method === 'POST' && path === '/auth/register') {
      return await handleRegister(body);
    }
    if (method === 'POST' && path === '/auth/login') {
      return await handleLogin(body);
    }
    if (method === 'POST' && path === '/auth/logout') {
      return handleLogout(sessionToken);
    }
    if (method === 'GET' && path === '/auth/me') {
      return handleMe(sessionToken);
    }

    // Entries endpointy
    if (method === 'GET' && path === '/entries') {
      return handleGetEntries(sessionToken, params);
    }
    if (method === 'GET' && path.startsWith('/entries/')) {
      const id = path.replace('/entries/', '');
      return handleGetEntry(sessionToken, id);
    }
    if (method === 'POST' && path === '/entries') {
      return handleCreateEntry(sessionToken, body);
    }
    if (method === 'PUT' && path.startsWith('/entries/')) {
      const id = path.replace('/entries/', '');
      return handleUpdateEntry(sessionToken, id, body);
    }
    if (method === 'DELETE' && path.startsWith('/entries/')) {
      const id = path.replace('/entries/', '');
      return handleDeleteEntry(sessionToken, id);
    }

    // Stats
    if (method === 'GET' && path.startsWith('/stats/')) {
      const month = path.replace('/stats/', '');
      return handleGetStats(sessionToken, month);
    }

    // Goals
    if (method === 'GET' && path === '/goals') {
      return handleGetGoals(sessionToken);
    }
    if (method === 'PUT' && path === '/goals') {
      return handleSetGoals(sessionToken, body);
    }

    // Export / Import
    if (method === 'GET' && path === '/export') {
      return handleExport(sessionToken);
    }
    if (method === 'POST' && path === '/import') {
      return handleImport(sessionToken, body);
    }

    throw new ApiError(404, `Endpoint ${method} ${path} neexistuje.`);
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    // Neočekávaná chyba – obalíme do 500
    console.error('[mockServer] Neočekávaná chyba:', err);
    throw new ApiError(500, 'Nastala neočekávaná chyba serveru.');
  }
}

export { CATEGORIES };
