# PersonalDashboard - Plan działania

Ostatnia aktualizacja: 2026-05-11

## Produkt

Centrum operacyjne dla lokalnego Obsidian vaultu (Bf-vault). Skraca ścieżkę: capture → kontekst → decyzja → zapis do vaultu. Nie SaaS, nie marketing page - codzienne narzędzie.

Docs: `docs/PersonalDashboard.md` (główne), `docs/Dashboard jako centrum operacyjne vaultu.md`, `docs/Docelowy design dashboardu - brief projektowy.md`, `docs/Potencjalne funkcje - kolejne iteracje.md`

## Stack

| Warstwa | Narzędzie |
|---|---|
| UI | Next.js 15 App Router + TypeScript strict |
| Styling | Tailwind v4 + shadcn/ui |
| Fonts | Geist (text) + Geist Mono (paths/wikilinks/tags) |
| LLM | Anthropic SDK (claude-sonnet-4-6) |
| Search MVP | fuse.js lub flexsearch (lokalny indeks tekstowy) |
| Desktop (po MVP) | Tauri |

Konfiguracja przez `.env.local` (nigdy nie trafia do gita):
- `VAULT_PATH` - ścieżka do Bf-vault
- `ANTHROPIC_API_KEY`

## Design

Prototyp wygenerowany w claude.ai/design (HTML/CSS/React). Pełny kod dostępny w bundle (tar.gz).

### Tokeny CSS (implementować 1:1 jako CSS custom properties)

```
Layout:
--sidebar-w: 224px | --rail-w: 360px (right panel) | --topbar-h: 48px
--row-h: 30px (compact), 34px (cozy) | --radius: 6px | --radius-lg: 8px

Light:
--bg: #f6f6f4 | --panel: #fff | --panel-2: #fafaf8
--border: #e6e5e1 | --border-strong: #d8d7d2
--text: #1a1a18 | --text-2: #5b5b56 | --text-3: #8a8a83 | --text-4: #b5b5ad
--accent: oklch(0.55 0.13 250)  [cobalt blue, default]
--red: oklch(0.58 0.15 25) | --amber: oklch(0.72 0.13 75) | --green: oklch(0.58 0.12 150)

Dark [data-theme="dark"]:
--bg: #0e0e0d | --panel: #161614 | --panel-2: #1c1c1a | --border: #262624

Accent variants: blue=oklch(0.55 0.13 250) | green=oklch(0.55 0.13 155) | amber=oklch(0.62 0.14 70)
```

### Grid

```
App: grid "side topbar" / "side main"  (224px | 1fr) × (48px | 1fr)
Work: grid-template-columns: minmax(0,1.55fr) minmax(0,1fr) minmax(360px,1fr)
```

### Wzorce UI (krytyczne)

- `.inbox-item.selected` - accent-soft bg + 2px accent left border (::before)
- `.wikilink` - mono 12px, accent color na accent-soft bg, 3px radius, padding 1px 5px
- `.badge` - 10.5px, warianty kolorów: todo=accent, knowledge=green, link=amber, idea=purple
- `.kbd` - mono, border-bottom 1.5px, panel bg
- `.action-btn` - border hover: accent; `.primary` - solid accent bg; `.danger` hover: red
- `.md-preview` - mono font-2, panel-2 bg; `.add` green bg, `.rm` red+strikethrough
- `.capture-btn` - full width, inverted (text bg, bg fg), hover translateY(-1px)
- `.palette-overlay` - fixed, backdrop blur(2px), 14vh padding-top, shadow-pop

### Mock data structure (z data.js)

Inbox item shape: `{ id, title, path, snippet, created, words, type, status, ai: { target, targetFile, confidence, reason, topic, related, tags } }`

Todo shape: `{ id, text, done, due, link, urgent? }` - grouped by sekcja

Project shape: `{ id, name, status, lastDecision, nextStep, todos, notes, lastSession, timeline[], questions[] }`

## Fazy

### Faza 1 - App shell [x]

Status: ukończona 2026-05-11

| Task | Status |
|---|---|
| 1.1 pnpm create next-app + deps (Tailwind, shadcn, Geist) | [x] |
| 1.2 Layout root - sidebar + topbar + main + right panel | [x] |
| 1.3 Sidebar: vault info, nawigacja 8 sekcji, active projects, capture button | [x] |
| 1.4 Topbar: search/command bar, mode selector (Search/Ask/Capture/Research), sync + AI status | [x] |
| 1.5 Dashboard 3-col z mock data | [x] |
| 1.6 Inbox panel - lista itemów, typy, statusy, zaznaczanie | [x] |
| 1.7 TODO panel - sekcje, checkboxy, wikilinki, daty | [x] |
| 1.8 Right context panel - AI suggestion, confidence bar, routing preview | [x] |
| 1.9 Command palette ⌘K - UI + keyboard nav | [x] |
| 1.10 Theming - light/dark, CSS variables | [x] |
| 1.11 Responsywność ≤1024px (collapsible sidebar, right panel jako drawer) | [x] |

### Faza 2 - Vault access [x]

Status: ukończona 2026-05-12

| Task | Status |
|---|---|
| 2.1 VAULT_PATH z .env.local, API route health check | [x] |
| 2.2 GET /api/vault/inbox - fs listing 97_Inbox/ | [x] |
| 2.3 GET /api/vault/todo - parser 00_System/TODO.md | [x] |
| 2.4 GET /api/vault/projects - lista 01_Projects/ | [x] |
| 2.5 Podmiana mocków na realne dane | [x] |
| 2.6 obsidian:// deep links | [x] |

### Faza 3 - Inbox routing (core value) [x]

Status: ukończona 2026-05-12

| Task | Status |
|---|---|
| 3.1 GET /api/inbox/classify - Anthropic classify (type + suggested destination + confidence) | [x] |
| 3.2 Triage UI z AI suggestion + akcje (Add to TODO / Create note / Move to ideas / Watchlist / Keep / Delete) | [x] |
| 3.3 Preview diff przed zapisem (inline confirmation step) | [x] |
| 3.4 POST /api/vault/write - atomic safe write z backupem + POST undo | [x] |
| 3.5 Toast + Undo (Sonner) | [x] |

### Faza 4+ (backlog)

Patrz: `docs/Potencjalne funkcje - kolejne iteracje.md`

Główne pozycje: Search/RAG, Knowledge composer, Projects cockpit, Research queue, Übersicht widget, Tauri packaging, Google Calendar.

## Decyzje architektoniczne

- **Server Components** domyślnie. `'use client'` tylko dla inbox selection, command palette, theming, mobile nav.
- **Brak useEffect dla danych** - SWR lub React Query dla vault data polling.
- **Mock data** w `lib/mock-data.ts` - podmieniane 1:1 w Fazie 2 (typy muszą być zgodne).
- Każdy zapis do vaultu przez API route (nigdy z client side), zawsze z backupem.
- `.env.local` w `.gitignore` od dnia 0.
- Nawigacja: 8 sekcji (Dashboard, Inbox, TODO, Knowledge, Projects, Research, Calendar, Settings).
- Vault write: atomic - najpierw backup, potem zapis, rollback przy błędzie.

## Kontekst Fazy 2 (vault access)

### Struktura vaultu (Bf-vault)

```
97_Inbox/          ← pliki do klasyfikacji (InboxPanel czyta stąd)
00_System/
  TODO.md          ← parser TodoPanel (format: ## sekcja + - [ ] zadanie)
  Do obejrzenia i przeczytania.md  ← watchlist
01_Projects/       ← aktywne projekty
03_Knowledge/      ← docelowy folder routowania dla AI
04_Ideas/          ← pomysły
96_ClaudeMemory/   ← historia sesji AI
```

### API routes do zbudowania (Faza 2)

- `GET /api/vault/health` - sprawdza VAULT_PATH, zwraca `{ ok, vaultName, inboxCount }`
- `GET /api/vault/inbox` - fs.readdirSync `97_Inbox/`, zwraca `InboxItem[]` zgodnie z typami z `lib/mock-data.ts`
- `GET /api/vault/todo` - parser `00_System/TODO.md`, zwraca `TodoSection[]` zgodnie z typami
- `GET /api/vault/projects` - lista folderów z `01_Projects/`, zwraca `ProjectItem[]`

### Format TODO.md (do parsowania)

```markdown
## Today
- [ ] Zadanie 1 #tag [[Project link]]
- [x] Zadanie zrobione (due:: 2026-05-10)

## This week
- [ ] Inne zadanie
```

### Podmiana mock data na realne (Faza 2.5)

Komponenty `InboxPanel`, `TodoPanel` i `ContextPanel` aktualnie importują z `lib/mock-data.ts`.
W Fazie 2 zamieniane 1:1: komponenty dostaną dane przez props (Server Component fetch) lub SWR hook.
Typy w `lib/mock-data.ts` muszą zostać - tylko wartości zamieniane na realne.

## Otwarte pytania

- Tauri vs Electron po MVP (po Fazie 3).
- pgvector vs lokalny indeks tekstowy (ocena po wdrożeniu Fazy 2 search).
- Czy Übersicht widget operuje przez localhost API czy bezpośrednio na plikach?
- Format parsowania TODO.md - sprawdzić realny vault przed implementacją parsera.
