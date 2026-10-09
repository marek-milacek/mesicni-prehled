# 📊 Měsíční přehled (Month in Review)

Školní praktický ročníkový projekt studenta **SPŠD Motol**.

- **Škola:** Střední průmyslová škola dopravní, Praha – Motol (Plzeňská 298/217a, 150 00 Praha 5)
- **Autor:** Marek Miláček
- **Třída:** 3.A
- **Školní rok / datum:** Říjen 2026
- **Předmět:** Programování a vývoj aplikací

---

## 🌟 O projektu

**Měsíční přehled** je moderní, čistě statická Single Page Application (SPA), která slouží ke sledování osobních aktivit, návyků, úkolů, studia, výdajů a nálady během celého měsíce. Na konci měsíce poskytuje ucelené statistické vyhodnocení s interaktivními grafy, porovnáním s předchozím měsícem a možností exportu (CSV, tisk do PDF).

Aplikace funguje **zcela bez reálného backendového serveru** – veškerá data jsou bezpečně ukládána do `localStorage` prohlížeče prostřednictvím modulární vrstvy simulovaného REST backendu s realistickou latencí.

---

## 🚀 Klíčové funkce

1. **Simulovaný REST backend (`src/api/`):**
   - Architektura oddělená od DOM a UI.
   - Simulace síťového zpoždění (100–400 ms) pomocí asynchronních Promises.
   - Bezpečné ukládání do `localStorage` s verzovaným schématem databáze a migracemi.
   - Hashování hesel přes **PBKDF2 se solí** (pomocí Web Crypto API).
   - Režim pro více uživatelů (oddělená data dle `userId`).
2. **Přehledný Dashboard:**
   - Souhrnné statistické karty (záznamy, návyky, studium, výdaje, průměrná nálada).
   - Formulář pro rychlý záznam.
   - Výpis posledních aktivit.
3. **Správa záznamů (CRUD):**
   - Podpora 5 kategorií: Návyky, Úkoly, Studium (minuty), Výdaje (Kč), Nálada (1–5).
   - Filtrování podle měsíce, kategorie, fulltextové vyhledávání v poznámkách, stránkování.
   - Možnost editace a mazání s potvrzením.
4. **Měsíční kalendář:**
   - Vizuální zobrazení celého měsíce s barevnými indikátory pro jednotlivé kategorie.
   - Detail po kliknutí na konkrétní den.
5. **Shrnutí a interaktivní grafy (Chart.js):**
   - Vývoj hodnot v čase (čárový graf).
   - Rozložení podle kategorií (prstencový doughnut graf).
   - Plnění cílů (sloupcový bar graf).
   - Srovnání s předchozím měsícem s procentuálním vyčíslením změny.
   - Export do formátu CSV (s podporou češtiny v Excelu přes UTF-8 BOM).
   - Optimalizovaný tisk / export do PDF (`@media print`).
6. **Měsíční cíle:**
   - Nastavení požadovaných hodnot pro jednotlivé kategorie a sledování procentuálního progresu.
7. **Správa dat, zálohy a nastavení:**
   - Kompletní **export a import do JSON**.
   - Generátor realistických demo dat pro aktuální i minulý měsíc.
   - Možnost regulace simulované síťové latence (0 ms, 100–300 ms, 500–1000 ms).
8. **Real-time synchronizace mezi záložkami:**
   - Synchronizace změn dat přes moderní `BroadcastChannel` API s fallbackem.
9. **Responzivní design & Dark mode:**
   - Čisté CSS bez cizích knihoven s využitím CSS proměnných, flexboxu a gridu.
   - Optimalizováno od šířky 360 px (mobilní zobrazení s vysouvacím menu) až po velké monitory.
   - Světlý i tmavý režim (respektuje systémový `prefers-color-scheme` s možností manuálního přepnutí).

---

## 🛠️ Použité technologie

- **Vite:** Moderní build nástroj a lokální dev server pro rychlý vývoj.
- **Vanilla JavaScript (ES moduly):** Čistý kód bez těžkopádných frameworků (React, Vue apod.).
- **Chart.js:** Grafická knihovna pro vizualizaci dat.
- **CSS3:** Vlastní design systém postavený na CSS proměnných, Flexboxu a CSS Gridu.
- **Vitest:** Nástroj pro unit testy čisté logiky a simulovaného serveru.
- **ESLint & Prettier:** Zajištění kvality a formátování kódu.
- **GitHub Actions:** Automatizovaný CI/CD proces pro sestavení a nasazení na GitHub Pages.

---

## 💻 Spuštění projektu lokálně

### Předpoklady
- Nainstalovaný [Node.js](https://nodejs.org/) (verze 18 nebo novější).

### Postup instalace a spuštění

1. **Naklonování repozitáře / přechod do složky:**
   ```bash
   cd aplikace_programovani
   ```

2. **Instalace závislostí:**
   ```bash
   npm install
   ```

3. **Spuštění vývojového serveru (Localhost):**
   ```bash
   npm run dev
   ```
   Aplikace poběží na adrese např. `http://localhost:5173/mesicni-prehled/`.

4. **Spuštění unit testů:**
   ```bash
   npm test
   ```

5. **Spuštění lintování kódu:**
   ```bash
   npm run lint
   ```

6. **Sestavení produkčního buildu:**
   ```bash
   npm run build
   ```
   Výsledné optimalizované statické soubory se vygenerují do složky `dist/`.

---

## 🌐 Nasazení na GitHub Pages

Projekt je připraven pro automatické nasazení přes **GitHub Actions**:

1. Vytvořte repozitář na GitHubu a nahrajte do něj kód:
   ```bash
   git init
   git add .
   git commit -m "feat: initial release"
   git branch -M main
   git remote add origin <URL-VÁŠHO-REPOZITÁŘE>
   git push -u origin main
   ```
2. V nastavení repozitáře na GitHubu (**Settings -> Pages**):
   - U položky **Build and deployment -> Source** vyberte **GitHub Actions**.
3. Při každém pushnutí do větve `main` workflow v `.github/workflows/deploy.yml` automaticky spustí testy, lint, sestaví aplikaci a nasadí ji na adresu:
   `https://<vase-uzivatelske-jmeno>.github.io/<nazev-repozitare>/`

---

## 📁 Struktura projektu

```
.
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD nasazení na GitHub Pages
├── docs/
│   ├── DOKUMENTACE.md          # Podrobná technická dokumentace projektu
│   └── OBHAJOBA.md             # Příprava na otázky k obhajobě
├── src/
│   ├── api/                    # Simulovaná REST API vrstva
│   │   ├── client.js           # Veřejné asynchronní rozhraní pro UI
│   │   ├── db.js               # Jediný přístup k localStorage, migrace
│   │   ├── errors.js           # Třída ApiError
│   │   └── mockServer.js       # Logika a routování mock backendu, hashování hesel
│   ├── charts/
│   │   └── charts.js           # Wrappery pro Chart.js s lifecycle managementem
│   ├── state/
│   │   ├── store.js            # Reaktivní store se subscription systémem
│   │   └── sync.js             # BroadcastChannel pro synchronizaci záložek
│   ├── utils/
│   │   ├── date.js             # Formátování a manipulace s daty (cs-CZ)
│   │   ├── demo.js             # Generátor realistických demo dat
│   │   ├── dom.js              # Bezpečné DOM utility bez innerHTML
│   │   ├── toast.js            # Toast notifikace (ARIA přístupné)
│   │   └── validation.js       # Klientská validace formulářů
│   ├── views/                  # Jednotlivé obrazovky aplikace
│   │   ├── auth.js             # Přihlášení a registrace
│   │   ├── calendar.js         # Měsíční kalendář
│   │   ├── dashboard.js        # Hlavní přehled a rychlý záznam
│   │   ├── entries.js          # Správa záznamů (CRUD, filtry, stránkování)
│   │   ├── goals.js            # Měsíční cíle a jejich plnění
│   │   ├── settings.js         # Profil, záloha JSON, motiv, latence
│   │   └── summary.js          # Vyhodnocení, grafy, CSV export, tisk
│   ├── main.js                 # Inicializace aplikace, routování, layout shell
│   ├── router.js               # Hash SPA router s cleanup fázemi
│   └── style.css               # Kompletní CSS design systém (světlý i tmavý režim)
├── tests/
│   ├── api.test.js             # Unit testy pro mock backend a klient
│   ├── setup.js                # Prostředí testů pro Vitest
│   ├── store.test.js           # Testy reaktivního storu
│   └── utils.test.js           # Testy formátovacích a validačních utilit
├── index.html                  # Vstupní HTML šablona (sémantická struktura)
├── vite.config.js              # Konfigurace Vite a Vitest
├── package.json
└── README.md
```

---

*Vypracoval Marek Miláček (3.A), Střední průmyslová škola dopravní, Praha – Motol.*
