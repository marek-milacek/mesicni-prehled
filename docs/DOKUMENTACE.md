# 📄 Technická dokumentace praktického projektu

---

### **Střední průmyslová škola dopravní, Praha – Motol**
**Obor:** Informační technologie / Dopravní a programovací systémy  
**Předmět:** Praktické programování a webové aplikace  

## **Název projektu: Měsíční přehled (Month in Review)**

**Autor:** Marek Miláček  
**Třída:** 3.A  
**Školní rok / datum vypracování:** Říjen 2026  
**Vedoucí práce / hodnotitel:** Učitel odborného výcviku / programování  

---

## 1. Účel a cíl projektu

Cílem tohoto projektu je vytvořit ucelenou a moderní webovou aplikaci typu Single Page Application (SPA), která uživateli umožňuje systematicky zaznamenávat a sledovat své denní návyky, úkoly, studium, výdaje a náladu během každého kalendářního měsíce. Na konci měsíce aplikace tato data automaticky agreguje a vytváří přehledné statistické a grafické vyhodnocení.

### Hlavní požadavky zadání:
- **Čistě statická architektura bez skutečného serveru:** Aplikace musí fungovat na GitHub Pages.
- **Simulovaný REST backend:** Veškerá práce s daty je přísně zapouzdřena do vrstvy `src/api/`, která simuluje chování reálného REST API (asynchronní volání s latencí, chybové stavy, validace). Žádné view nesmí přistupovat k `localStorage` přímo.
- **Bezpečnost a perzistence:** Ukládání dat do `localStorage` s verzovaným schématem a bezpečnými migracemi, hashování hesel pomocí algoritmu PBKDF2 se solí.
- **Kvalitní kód a technologie:** Vite + Vanilla JavaScript (ES moduly, bez externích JS frameworků), grafy přes Chart.js, vlastní CSS bez frameworků (CSS proměnné, flexbox/grid, tmavý/světlý režim), plná responzivita od 360 px, unit testy (Vitest) a linting (ESLint).

---

## 2. Návrh architektury

Aplikace je navržena podle osvědčeného architektonického vzoru vrstvené architektury (Layered Architecture):

```
┌─────────────────────────────────────────────────────────────┐
│                       Uživatelské rozhraní                  │
│   (HTML5, CSS3, DOM komponenty v src/views/, router.js)     │
└──────────────────────────────┬──────────────────────────────┘
                               │ Volá asynchronní funkce
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Klientská API vrstva                     │
│                     (src/api/client.js)                     │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               │ (Režim API: "mock")           │ (Režim API: "remote")
               ▼                               ▼
┌──────────────────────────────┐ ┌───────────────────────────┐
│       Simulovaný server      │ │   Reálný REST server      │
│   (src/api/mockServer.js)    │ │   (Express / FastAPI)     │
└──────────────┬───────────────┘ └───────────────────────────┘
               │
               ▼
┌──────────────────────────────┐
│       Databázová vrstva      │
│       (src/api/db.js)        │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│     window.localStorage      │
└──────────────────────────────┘
```

### Modulární struktura:
1. **`src/api/` (Data & Backend simulace):**
   - `client.js`: Veřejné rozhraní, které volají view komponenty. Poskytuje čisté Promises. Umožňuje přepínání režimu mezi `mock` a `remote` (skutečný server) a řízení umělé latence.
   - `mockServer.js`: Simuluje routování HTTP požadavků (GET, POST, PUT, DELETE), autorizaci pomocí tokenů, hashování hesel a výpočty statistik.
   - `db.js`: Jediný modul v aplikaci, který manipuluje s `localStorage`. Zajišťuje verzování databáze, migrace, ochranu před přetečením kvóty a ošetření chyb.
   - `errors.js`: Třída `ApiError` s HTTP stavovými kódy.
2. **`src/state/` (Stavová vrstva):**
   - `store.js`: Centrální reaktivní úložiště stavu aplikace (aktuálně přihlášený uživatel, vybraný měsíc, načítání) s podporou odběru změn (pub/sub).
   - `sync.js`: Využívá moderní `BroadcastChannel` API pro obousměrnou synchronizaci změn dat mezi více otevřenými záložkami v reálném čase.
3. **`src/views/` (Prezentační vrstva):**
   - Neobsahují přímé dotazy na úložiště ani špinavé manipulace – vytvářejí čistý DOM strom pomocí bezpečných pomocných utilit.
   - Pohledy: `auth.js`, `dashboard.js`, `entries.js`, `calendar.js`, `summary.js`, `goals.js`, `settings.js`.
4. **`src/charts/` (Grafy):**
   - `charts.js`: Izolované wrappery kolem Chart.js s automatickým čištěním instancí (destroy), adaptací na tmavý režim a jednotnou českou lokalizací.
5. **`src/utils/` (Nástroje & Helpery):**
   - `date.js`: Manipulace a formátování datumů a čísel podle `cs-CZ`.
   - `dom.js`: Bezpečné vytváření DOM elementů (`createElement`) chránící před XSS (žádný neošetřený `innerHTML`).
   - `toast.js`: Notifikační systém s ARIA atributy.
   - `validation.js`: Validace klientských formulářů.
   - `demo.js`: Generátor ukázkových záznamů a cílů.

---

## 3. Popis datového modelu

Data jsou v úložišti organizována do tabulek s prefixem `mp_`:

### 3.1. Uživatelé (`mp_users`)
```typescript
interface User {
  id: string;          // UUID v4
  username: string;    // Unikátní uživatelské jméno (min. 3 znaky)
  passwordHash: string;// PBKDF2 hash (SHA-256, 100 000 iterací)
  salt: string;        // Náhodná 16bajtová kryptografická sůl v hex formátu
  createdAt: string;   // ISO timestamp
}
```

### 3.2. Relace (`mp_sessions`)
```typescript
interface Session {
  token: string;       // Unikátní náhodný session token
  userId: string;      // ID přihlášeného uživatele
  createdAt: string;   // ISO timestamp
}
```

### 3.3. Záznamy (`mp_entries`)
```typescript
interface Entry {
  id: string;          // UUID v4
  userId: string;      // Vazba na uživatele
  date: string;        // Formát "YYYY-MM-DD"
  category: 'navyk' | 'ukol' | 'studium' | 'vydaj' | 'nalada';
  value: number;       // Číselná hodnota (studium v min, výdaj v Kč, nálada 1-5, atd.)
  note: string;        // Textová poznámka (max. 500 znaků)
  tags: string[];      // Seznam štítků
  createdAt: string;   // ISO timestamp
  updatedAt: string;   // ISO timestamp
}
```

### 3.4. Cíle (`mp_goals`)
```typescript
interface Goal {
  id: string;          // UUID v4
  userId: string;      // Vazba na uživatele
  category: string;    // Sledovaná kategorie
  target: number;      // Cílová hodnota
  month: string;       // Formát "YYYY-MM"
  createdAt: string;   // ISO timestamp
  updatedAt: string;   // ISO timestamp
}
```

---

## 4. Popis API vrstvy

### 4.1. Tabulka simulovaných REST endpointů

| Metoda | Endpoint | Vyžaduje Auth | Popis |
|---|---|---|---|
| `POST` | `/auth/register` | Ne | Registrace nového uživatele (username, password) |
| `POST` | `/auth/login` | Ne | Přihlášení uživatele, vrácení session tokenu |
| `POST` | `/auth/logout` | Ano | Zneplatnění session tokenu |
| `GET` | `/auth/me` | Ano | Získání informací o aktuálně přihlášeném uživateli |
| `GET` | `/entries` | Ano | Získání záznamů (filtrace dle month, category, search, stránkování) |
| `GET` | `/entries/:id` | Ano | Detail konkrétního záznamu |
| `POST` | `/entries` | Ano | Vytvoření nového záznamu |
| `PUT` | `/entries/:id` | Ano | Editace existujícího záznamu |
| `DELETE` | `/entries/:id` | Ano | Smazání záznamu |
| `GET` | `/stats/:month` | Ano | Agregované statistiky a souhrny pro daný měsíc |
| `GET` | `/goals` | Ano | Načtení cílů pro přihlášeného uživatele |
| `PUT` | `/goals` | Ano | Uložení/aktualizace cílů |
| `GET` | `/export` | Ano | Export všech dat uživatele (záznamy + cíle) |
| `POST` | `/import` | Ano | Import dat ze zálohy |

### 4.2. Formát chybových odpovědí
Při chybě vyvolá mock backend `ApiError`:
```json
{
  "status": 400,
  "message": "Datum musí být ve formátu YYYY-MM-DD."
}
```
Standardní návratové kódy:
- `200 OK` / `201 Created`
- `400 Bad Request` (neplatná data či selhání validace)
- `401 Unauthorized` (neplatný nebo chybějící token)
- `404 Not Found` (záznam nenalezen)
- `409 Conflict` (uživatelské jméno již existuje)
- `500 Internal Server Error`

### 4.3. Nahrazení skutečným backendem
V modulu `src/api/client.js` je kód strukturován tak, že stačí přepnout konstantu:
```javascript
const API_MODE = 'remote'; // Místo 'mock'
```
Při hodnotě `'remote'` začne klientská vrstva okamžitě odesílat skutečné HTTP požadavky pomocí nativního `fetch()` na server (např. `/api/entries`) s hlavičkou `Authorization: Bearer <token>`. Veškeré views a uživatelské rozhraní zůstanou **100% netknuté**.

---

## 5. Klíčové části kódu a použité postupy

### 5.1. Bezpečné ukládání a hashování hesel
Hesla nejsou ukládána v otevřeném tvaru. Využívá se standardní **Web Crypto API** prohlížeče (`crypto.subtle`):
- Každý uživatel dostane unikátní kryptografickou náhodnou sůl (16 bajtů).
- Heslo je zahashováno pomocí algoritmu **PBKDF2** s **100 000 iteracemi** a hashovací funkcí **SHA-256**.
- Při přihlášení se se solí z databáze provede stejný výpočet a porovnají se výsledné hashe.

### 5.2. Ochrana před XSS (Cross-Site Scripting)
Všechny DOM komponenty jsou generovány pomocí utilitní funkce `createElement(tag, attrs, ...children)` v `src/utils/dom.js`. Texty jsou vkládány zásadně jako `textContent` nebo `createTextNode`, nikdy přes nezabezpečený `innerHTML` s uživatelským vstupem.

### 5.3. Synchronizace mezi záložkami (BroadcastChannel)
Pokud má uživatel otevřenou aplikaci ve více záložkách a v jedné přidá záznam nebo se odhlásí, `src/state/sync.js` odešle zprávu přes kanál `mp_sync`. Ostatní záložky okamžitě zareagují a aktualizují své zobrazení bez nutnosti manuálního refreshe stránky.

---

## 6. Problémy a jejich řešení

1. **Diakritika v uživatelském profilu Windows a npm cache:**
   - *Problém:* Uživatelské jméno systému Windows obsahovalo háčky a čárky (`MiláčekMarek`), což způsobovalo pád `npm install` s chybou `EPERM mkdir C:\Users\MilekMarek`.
   - *Řešení:* Nastavení globální mezipaměti npm na neutrální cestu bez diakritiky: `npm config set cache C:\npm-cache`.
2. **Experimentální `localStorage` v Node 22+ při běhu testů (Vitest):**
   - *Problém:* V nejnovějších verzích Node.js existuje experimentální globální proměnná `localStorage`, která byla v testovacím prostředí `undefined`.
   - *Řešení:* Vytvoření testovacího setup modulu `tests/setup.js`, který do `globalThis` a `window` korektně injektuje plnohodnotný paměťový adaptér `MemoryStorage`.
3. **Předcházení memory leakům u Chart.js:**
   - *Problém:* Při přepínání měsíců a překreslování grafů v SPA docházelo k chybě „Canvas is already in use“.
   - *Řešení:* Vytvoření registru instancí `chartInstances` v `src/charts/charts.js`, který před každým vytvořením grafu spolehlivě zavolá metodu `.destroy()` na předchozí instanci.

---

## 7. Možná budoucí rozšíření

- **Připojení reálné cloudové databáze:** Napojení na PostgreSQL nebo MongoDB přes Node.js/FastAPI backend.
- **PWA (Progressive Web App):** Doplnění Service Workera a Web App Manifestu pro možnost instalace na mobilní telefon a offline fungování.
- **Další typy grafů:** Radarový graf pro porovnání životních oblastí nebo heatmapa ročních aktivit ve stylu GitHubu.

---

*V Praze dne 9. října 2026*  
*Marek Miláček, 3.A, SPŠD Motol*
