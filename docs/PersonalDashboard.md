---
tags: [projekt, dashboard, ai, rag]
created: 2026-04-24
updated: 2026-05-16
status: in-progress (Fazy 1-9 ukończone)
---

# Personal Dashboard

Local-first personal workspace dla Obsidian vaultu (Bf-vault) - jeden interfejs do szybkiej obslugi inboxa, TODO, projektow, knowledge search i notatek wspieranych przez LLM.

**Repo:** https://github.com/bthink/yet-another-personal-dashaboard
**Stack aktualny:** Next.js 16 App Router, TypeScript strict, Tailwind v4, shadcn/ui (New York), Geist + Geist Mono, pnpm
**Dev:** `pnpm dev` na localhost:3000, redirect `/` → `/dashboard`

## Cel

Produktywnosc: skrocic droge od capture do decyzji i poprawnego zapisu w vaultcie.

Glowny przeplyw:

`mam mysl / link / pytanie / zadanie` -> `system znajduje kontekst` -> `uzytkownik wybiera akcje` -> `vault zostaje zaktualizowany`

Dashboard ma byc codziennym UI do pracy z vaultem. LLM jest silnikiem pod spodem, nie glownym interfejsem.

## Założenia

- Local-first: aplikacja operuje przede wszystkim na lokalnym Obsidian vaultcie i plikach Markdown.
- Inbox jako centrum decyzji: szybkie routowanie plikow z `97_Inbox/`.
- TODO na wierzchu: odczyt i edycja `00_System/TODO.md`.
- Search po vaultcie: najpierw szybki lokalny indeks tekstowy, pozniej RAG.
- Knowledge composer: tworzenie notatek wiedzy z linkow, transkryptow i materialow z inboxa.
- Project cockpit: aktywne projekty, ostatnie decyzje, nastepne kroki i powiazane TODO.
- Preview before write: kazda zmiana w vaultcie powinna byc pokazana przed zapisem.
- Ubersicht jako lekki widzet statusowy i launcher, nie glowny interfejs.
- Rozszerzalnosc - dodawana stopniowo, nie z gory.

## Poza scopem (na razie)

- Hostowana aplikacja SaaS jako glowny model produktu.
- Clerk/auth i Vercel hosting jako wymagania MVP.
- Supabase/pgvector jako wymog pierwszej wersji.
- Pelny Google Calendar.
- Token usage tracker.
- Bezposrednie multi-provider promptowanie jako osobny panel.
- Integracja z notebooklm-py (wrapper na undocumented Google API - niestabilny, wrócimy gdy MVP gotowy)

## Tech Stack (aktualny)

| Warstwa | Narzędzie |
|---|---|
| UI | Next.js 16 App Router + TypeScript strict |
| Styling | Tailwind v4 + shadcn/ui (New York style) |
| Fonts | Geist (text) + Geist Mono (wikilinks/paths/tags) |
| LLM | Anthropic SDK bezpośrednio (claude-sonnet-4-6) |
| Search MVP | fuse.js lub flexsearch (lokalny indeks tekstowy) |
| Desktop (po MVP) | Tauri (decyzja po Fazie 3) |
| Vault access | Node.js fs API przez Next.js API routes (serwer → pliki lokalne) |

Config przez `.env.local`:
- `VAULT_PATH` - absolutna ścieżka do Bf-vault (np. `/Users/bartoszfink/Library/Mobile Documents/iCloud~md~obsidian/Documents/Bf-vault`)
- `ANTHROPIC_API_KEY`

## Struktura vaultu (Bf-vault, PARA)

```
Bf-vault/
├── 00_System/
│   ├── TODO.md          ← główny plik zadań (parsowany w Fazie 2)
│   └── Do obejrzenia i przeczytania.md  ← watchlist
├── 01_Projects/         ← aktywne projekty
├── 02_Areas/            ← obszary odpowiedzialności
├── 03_Knowledge/        ← notatki wiedzy (docelowy folder dla AI routing)
│   └── IT/              ← subfolder dla tech notatek
├── 04_Ideas/            ← pomysły
├── 96_ClaudeMemory/     ← historia sesji z AI
├── 97_Inbox/            ← inbox do klasyfikacji (Faza 2 czyta stąd)
└── 98_Archive/          ← archiwum
```

## Status etapów

### Etap 1 - App shell [x] UKOŃCZONY (2026-05-11)
- [x] Next.js 16 + Tailwind v4 + shadcn + Geist
- [x] Layout: sidebar 240px + topbar 48px + 3-col main + right panel 280px
- [x] Sidebar: vault info, nav 8 sekcji, active projects, capture button
- [x] Topbar: search bar, mode selector, sync/AI status, theme toggle
- [x] InboxPanel: lista z typami, statusami, filtrami, selekcją (mock data)
- [x] TodoPanel: sekcje, checkboxy, wikilinki, daty (mock data)
- [x] ContextPanel: AI suggestion, confidence bar, action buttons (mock data)
- [x] Command palette ⌘K z keyboard nav
- [x] Light/dark theming (localStorage)
- [x] Responsywność ≤1024px (sidebar Sheet, right panel Drawer)

### Etap 2 - Vault access [x] UKOŃCZONY (2026-05-12)
- [x] Czytanie `.md` z vaultu
- [x] Lista plikow z `97_Inbox/`
- [x] Parser `00_System/TODO.md`
- [x] Otwieranie notatek i sciezek z poziomu UI

### Etap 3 - Inbox routing [x] UKOŃCZONY (2026-05-12)
- [x] Klasyfikacja itemow z inboxa
- [x] Akcje: Add to TODO, Create knowledge note, Move to ideas, Add to watchlist, Keep in inbox
- [x] Markdown preview before save
- [x] Bezpieczny zapis zmian do vaultu

### Etapy 4-9 [x] UKOŃCZONE (2026-05-16)
- [x] Routing fix - wszystkie strony pod /dashboard
- [x] Live data w sidebar/topbar (vault health, projekty, inbox count)
- [x] Command palette nawigacja + real inbox data
- [x] Search: fuse.js indeks, /api/vault/search, topbar dropdown
- [x] Projects cockpit: lista, detail, AI resume
- [x] Knowledge browser: 356 notatek, folder filter, search
- [x] Vault hygiene: orphan notes, deadlinks, notatki bez indeksu
- [x] Duplicate detector w ContextPanel (przed create-note)
- [x] Stale task detector w TodoPanel (14d+ overdue)
- [x] Settings: vault status, theme/accent/density, model selector
- [x] Research pipeline + Automations + 3D graph (Faza 4 poprzednia)

### Etap 5 - Project cockpit
- [ ] Widok aktywnych projektow z `01_Projects/`
- [ ] Powiazane TODO, notatki i session memory
- [ ] Akcja Resume project

### Etap 6 - Desktop packaging
- [ ] Decyzja: Tauri vs Electron
- [ ] Globalny shortcut do capture
- [ ] Otwieranie dashboardu jako apki
- [ ] Integracja z Obsidian URI lub otwieraniem plikow

### Etap 7 - Ubersicht widget
- [ ] Widget statusowy: inbox count, top TODO, aktywny projekt, sync
- [ ] Szybki capture albo launcher do aplikacji

### Etap 8 - RAG / Calendar / token usage
- [ ] Embeddingi i pelny RAG, jesli lokalny search nie wystarczy
- [ ] Google Calendar OAuth
- [ ] Anthropic + OpenAI usage tracking
- [ ] Panel promptowania Claude/GPT, jesli nadal potrzebny

### Etap 9 - Link synthesis / research
- [ ] Scraping URL -> chunking -> summarize przez LLM
- [ ] Research po temacie: multi-step LLM agent

### Etap 10 - Polish + rozszerzenia
- [ ] Dopiero tu myślimy o pluginach, notebooklm-py itp.

## Notatki źródłowe

- [[Personal dashboard init]] (97_Inbox - oryginalne założenia)
- [[Dashboard jako centrum operacyjne vaultu]]
- [[Docelowy design dashboardu - brief projektowy]]
- [[Potencjalne funkcje - kolejne iteracje]]
