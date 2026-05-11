---
tags: [projekt, dashboard, ai, rag]
created: 2026-04-24
status: planning
---

# Personal Dashboard

Local-first personal workspace dla Obsidian vaultu - jeden interfejs do szybkiej obslugi inboxa, TODO, projektow, knowledge search i notatek wspieranych przez LLM.

## Cel

Produktywnosc: skrocic droge od capture do decyzji i poprawnego zapisu w vaultcie.

Glowny przeplyw:

`mam mysl / link / pytanie / zadanie` -> `system znajduje kontekst` -> `uzytkownik wybiera akcje` -> `vault zostaje zaktualizowany`

Dashboard ma byc codziennym UI do pracy z vaultem. Codex/LLM jest silnikiem pod spodem, nie glownym interfejsem.

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

## Tech Stack

| Warstwa | Narzędzie |
|---|---|
| UI | React / Next.js style UI + Tailwind + shadcn/ui |
| Docelowa apka | Tauri albo Electron, do decyzji po MVP |
| Local backend | Node.js albo Tauri commands |
| Vault access | Bezposredni odczyt i zapis plikow Markdown w Obsidian vaultcie |
| Search | Lokalny indeks tekstowy na start |
| RAG / embeddingi | Pozniej pgvector lub lokalne embeddingi, jesli prosty search nie wystarczy |
| LLM layer | Vercel AI SDK albo bezposrednie API Anthropic/OpenAI |
| Ubersicht | Lekki widget statusowy + launcher |

## Plan prac (MVP-first)

### Etap 1 - Local app shell
- [ ] Lokalna aplikacja webowa albo prototyp desktop UI
- [ ] Layout dashboardu: sidebar, command bar, inbox, TODO, prawy panel preview
- [ ] Konfiguracja sciezki do vaultu

### Etap 2 - Vault access
- [ ] Czytanie `.md` z vaultu
- [ ] Lista plikow z `97_Inbox/`
- [ ] Parser `00_System/TODO.md`
- [ ] Otwieranie notatek i sciezek z poziomu UI

### Etap 3 - Inbox routing
- [ ] Klasyfikacja itemow z inboxa
- [ ] Akcje: Add to TODO, Create knowledge note, Move to ideas, Add to watchlist, Keep in inbox
- [ ] Markdown preview before save
- [ ] Bezpieczny zapis zmian do vaultu

### Etap 4 - Search + ask vault
- [ ] Lokalny search po vaultcie
- [ ] Wyniki ze sciezkami, fragmentami i wikilinkami
- [ ] Prosty tryb Ask with context

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
