# 🎓 Příprava na obhajobu praktického projektu

**Škola:** Střední průmyslová škola dopravní, Praha – Motol  
**Projekt:** Měsíční přehled (Month in Review)  
**Autor:** Marek Miláček (3.A)  
**Datum:** Říjen 2026  

Tento dokument shrnuje nejčastější technické a architektonické otázky, které může zkušební komise u obhajoby položit, a přesné odpovědi založené na skutečné implementaci v kódu.

---

### 1. Jak je vyřešeno ukládání dat a proč aplikace nepotřebuje skutečný server?
**Odpověď:**  
Aplikace je navržena jako čistě statická Single Page Application (SPA), což umožňuje její bezplatné a jednoduché nasazení například na GitHub Pages. Místo skutečného serveru je vytvořen simulovaný REST backend v modulu `src/api/mockServer.js`, který ukládá data do `localStorage` prohlížeče prostřednictvím dedikované vrstvy `src/api/db.js`. Všechna data jsou uložena v JSON formátu pod verzovaným schématem (`mp_users`, `mp_entries`, `mp_goals`, `mp_sessions`).

---

### 2. Jak je v kódu zajištěno, že uživatelské rozhraní nesahá přímo do `localStorage`?
**Odpověď:**  
Je důsledně dodržena vrstvená architektura. Žádný soubor ve složce `src/views/` neobsahuje volání `localStorage.getItem` ani `localStorage.setItem`. Uživatelské rozhraní komunikuje výhradně s modulem `src/api/client.js` pomocí asynchronních funkcí vracejících `Promise` (např. `api.createEntry()`, `api.getStats()`). Vrstva klienta navíc uměle vkládá náhodnou latenci (100–400 ms), aby simulovala reálný síťový provoz.

---

### 3. Jak je vyřešena bezpečnost a ukládání hesel uživatelů v prohlížeči?
**Odpověď:**  
Hesla nejsou ukládána v otevřeném textu. V souboru `src/api/mockServer.js` používáme standardní kryptografické rozhraní prohlížeče **Web Crypto API** (`crypto.subtle`). Pro každého uživatele je vygenerována náhodná 16bajtová sůl a heslo je zahashováno pomocí standardu **PBKDF2** s **100 000 iteracemi** algoritmu **SHA-256**. Tím je simulováno bezpečné chování backendových databází.

---

### 4. Jak funguje real-time synchronizace, když má uživatel otevřených více záložek?
**Odpověď:**  
V modulu `src/state/sync.js` využíváme moderní prohlížečové API `BroadcastChannel` pod názvem kanálu `mp_sync`. Když uživatel v jedné záložce provede změnu (přidá záznam, importuje data nebo se odhlásí), odešle se synchronizační zpráva. Všechny ostatní otevřené záložky danou zprávu zachytí a automaticky aktualizují svůj stav v `store.js` a překreslí aktuální pohled, aniž by bylo nutné obnovovat stránku (F5).

---

### 5. Proč jste projekt postavil na Vanilla JS a Vite místo frameworku (React/Vue/Angular)?
**Odpověď:**  
Volba Vanilla JavaScriptu (ES moduly) byla záměrná:
1. Ukazuje hlubokou znalost fundamentů JavaScriptu, práce s DOMem, asynchronního programování (`async/await`, Promises) a moderních webových standardů.
2. Výsledný produkční balíček má minimální velikost (cca 240 kB včetně Chart.js) a bleskový start bez režie virtuálního DOMu.
3. Kód je modulární, rozdělený na logické celky a snadno přenositelný.

---

### 6. Jak je zajištěna ochrana proti XSS (Cross-Site Scripting)?
**Odpověď:**  
V modulu `src/utils/dom.js` je implementována pomocná funkce `createElement()`. Veškeré uživatelské vstupy a texty se do DOMu vkládají jako textové uzly (`textContent` nebo `createTextNode`), které prohlížeč automaticky escapuje. Nikde v aplikaci se nepoužívá neošetřený `innerHTML` s uživatelskými daty.

---

### 7. Jak by probíhala migrace z mock backendu na skutečný produkční server?
**Odpověď:**  
V modulu `src/api/client.js` je připravena proměnná `API_MODE`. Pokud ji přepneme z hodnoty `'mock'` na `'remote'`, klient přestane volat lokální `mockServer.js` a začne odesílat skutečné HTTP požadavky přes nativní `fetch()` na zadanou URL adresu serveru (např. Node.js Express nebo Python FastAPI) s hlavičkou `Authorization: Bearer <token>`. V samotném UI nemusíme změnit ani řádek kódu.

---

### 8. Jak je řešen tmavý a světlý režim (Dark mode)?
**Odpověď:**  
V souboru `src/style.css` jsou definovány sémantické CSS proměnné pro světlý motiv `:root` a pro tmavý motiv `[data-theme='dark']`. Aplikace při startu nejprve zkontroluje systémové nastavení uživatele pomocí media query `window.matchMedia('(prefers-color-scheme: dark)')`. Pokud si uživatel zvolí motiv ručně tlačítkem v hlavičce, volba se uloží do `localStorage` pod klíčem `mp_theme`.

---

### 9. Jak je ošetřeno testování a kvalita kódu?
**Odpověď:**  
Projekt obsahuje sadu automatizovaných unit testů spouštěných nástrojem **Vitest** v adresáři `tests/`:
- `tests/utils.test.js`: testuje formátování data a čísel podle `cs-CZ` a klientskou validaci formulářů.
- `tests/store.test.js`: testuje reaktivní store a pub/sub mechanismus.
- `tests/api.test.js`: testuje kompletní cyklus mock backendu (registrace, přihlášení, CRUD záznamů, výpočet statistik a export/import).
Kód je navíc kontrolován linterem **ESLint** a formátován přes **Prettier**. Vše běží automaticky i v CI/CD pipeline na GitHub Actions.

---

### 10. Co se stane při tisku stránky se shrnutím měsíce?
**Odpověď:**  
Ve stylesheetu je tiskový styl `@media print`, který skryje navigační lištu, tlačítka, toasty a modální okna. Zůstanou pouze statistické karty a grafy s upraveným kontrastem a ohraničením vhodným pro černobílý tisk nebo export do formátu PDF.
