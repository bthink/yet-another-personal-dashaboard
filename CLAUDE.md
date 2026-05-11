# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

PersonalDashboard — local-first operational hub for an Obsidian vault (Bf-vault, PARA structure). Core flow: capture → AI context → decision → safe write to vault. Not a SaaS, not a marketing page — a daily productivity tool.

Full plan with phase checklist: `PLAN.md`. Design decisions and product scope: `docs/`.

## Commands

```bash
pnpm dev          # Next.js dev server (localhost:3000)
pnpm build        # Production build
pnpm lint         # ESLint
pnpm test         # Vitest unit tests
pnpm test path    # Single test file
```

## Environment

`.env.local` (never commit):
```
VAULT_PATH=/absolute/path/to/Bf-vault
ANTHROPIC_API_KEY=sk-ant-...
```

## Architecture

### App shell (Next.js 15 App Router)

```
app/
  layout.tsx          # Root layout: sidebar + topbar fixed, main slot
  page.tsx            # Dashboard: 3-col work area
  inbox/page.tsx
  todo/page.tsx
  knowledge/page.tsx
  projects/page.tsx
  research/page.tsx
  settings/page.tsx
  api/
    vault/
      inbox/route.ts  # GET: list 97_Inbox/ files
      todo/route.ts   # GET: parse 00_System/TODO.md
      projects/route.ts
      write/route.ts  # POST: atomic safe write with backup
    inbox/
      classify/route.ts  # POST: Anthropic classify → type + suggested destination
lib/
  mock-data.ts        # Typed mock data matching real data shapes — replaced 1:1 in Phase 2
  vault.ts            # fs read/write helpers (server-only)
  markdown.ts         # TODO.md parser, wikilink extractor
components/
  sidebar/
  topbar/
  inbox/
  todo/
  knowledge/
  projects/
  command-palette/
```

**Server Components by default.** Add `'use client'` only for: inbox item selection, command palette, theme toggle. No `useEffect` for data — use SWR or React Query.

### Vault access (server-side only)

All reads/writes go through API routes — never from client. Every write: backup first, then atomic replace. `obsidian://open?vault=Bf-vault&file=...` for deep links.

### LLM (Anthropic SDK)

Model: `claude-sonnet-4-6`. Used for inbox classification (type + routing suggestion + confidence score). Prompt caching where applicable.

## Design system

CSS custom properties on `:root` and `[data-theme="dark"]` — **do not hardcode values in Tailwind classes**. Apply theme via `document.documentElement.dataset.theme`.

Key tokens:
```css
--sidebar-w: 224px
--topbar-h: 48px
--rail-w: 360px        /* right context panel */
--row-h: 30px          /* compact; cozy: 34px */
--radius: 6px
--radius-lg: 8px

/* Light */
--bg: #f6f6f4;  --panel: #ffffff;  --panel-2: #fafaf8;
--border: #e6e5e1;  --border-strong: #d8d7d2;
--text: #1a1a18;  --text-2: #5b5b56;  --text-3: #8a8a83;  --text-4: #b5b5ad;
--accent: oklch(0.55 0.13 250);   /* cobalt blue default */
--accent-soft: oklch(0.94 0.03 250);
--red: oklch(0.58 0.15 25);  --amber: oklch(0.72 0.13 75);  --green: oklch(0.58 0.12 150);

/* Dark [data-theme="dark"] */
--bg: #0e0e0d;  --panel: #161614;  --panel-2: #1c1c1a;  --border: #262624;

/* Accent variants [data-accent="green|amber|blue"] */
green: oklch(0.55 0.13 155);  amber: oklch(0.62 0.14 70);
```

Work area grid:
```css
grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr) minmax(360px, 1fr)
/* Inbox ~45% | TODO ~30% | AI context panel */
```

### Critical UI patterns

- **Selected inbox item**: `background: var(--accent-soft)` + `::before` pseudo 2px left border in `var(--accent)`
- **Wikilinks**: mono 12px, `color: var(--accent)`, `background: var(--accent-soft)`, 3px radius, padding `1px 5px`
- **Badges**: 10.5px — `todo`=accent, `knowledge`=green, `link`=amber, `idea`=purple, `unknown`=gray
- **`kbd` elements**: mono, `border-bottom-width: 1.5px`, panel bg
- **Action buttons**: 1px border; `.primary` = solid accent bg; `.danger` hover = red; hover state changes border + icon + text to accent
- **Markdown preview**: mono font, panel-2 bg; added lines green-highlighted, removed lines red + strikethrough
- **Capture button**: inverted (var(--text) bg, var(--bg) fg); hover `translateY(-1px)`
- **Command palette overlay**: `position: fixed`, `backdrop-filter: blur(2px)`, `padding-top: 14vh`, shadow-pop

## Data shapes

```ts
// lib/mock-data.ts — real API must return same shape

type InboxItem = {
  id: string; title: string; path: string; snippet: string;
  created: string; words: number;
  type: 'todo' | 'knowledge' | 'link' | 'idea' | 'unknown';
  status: 'new' | 'suggested' | 'needs review' | 'processed';
  ai?: {
    target: string; targetFile: string; confidence: number;
    reason: string; topic: string | null;
    related: string[]; tags: string[]; actions?: string[];
  };
}

type TodoItem = { id: string; text: string; done: boolean; due: string | null; link: string | null; urgent?: boolean; }
type TodoSections = Record<string, TodoItem[]>  // keyed by section name

type Project = {
  id: string; name: string; status: 'active' | 'paused';
  lastDecision: string; nextStep: string;
  todos: number; notes: number; lastSession: string;
  timeline: { time: string; text: string }[];
  questions: string[];
}
```

## Vault structure (Bf-vault)

```
97_Inbox/          ← inbox items to route
00_System/
  TODO.md          ← checkbox sections: Następne | Terminy i oczekujące | Praca i aplikacje | Projekty i AI | Do obejrzenia
01_Projects/       ← active projects
03_Knowledge/IT/   ← knowledge notes, topic MOCs
04_Ideas/
96_ClaudeMemory/   ← session memory per project
```

TODO.md format: `## Section name` headers, `- [ ] task text [[wikilink]] due: date` items.
