# Chicago Crash Mapper — Refactor & Redesign Design

**Date**: 2026-02-19
**Status**: Approved
**Approach**: B — Refactor first, then design (3 cycles)

---

## Overview

The Chicago Crash Mapper is a SvelteKit 5 frontend for exploring Chicago traffic crash data backed by a local API server. The codebase has accumulated technical debt through adhoc development. This design outlines three refactor + redesign cycles to clean the code, introduce a design system, and polish the result.

**Stack**: SvelteKit 5 · Tailwind CSS 4 · Shadcn-svelte · TypeScript · Leaflet

---

## Cycle 1 — Code Archaeology (Refactor Only)

### Goals

Remove dead code, fix type safety, eliminate magic numbers, and make the codebase ready for design work.

### Tasks

1. **Remove unused files**
   - Delete `src/lib/components/PeopleList.svelte` (not imported anywhere)

2. **Remove unused dependencies**
   - Remove `luxon` from `package.json` (imported but never used)
   - Replace `numeral` with native `toLocaleString()` in `transformHelpers.ts` — eliminates a heavy dependency

3. **Extract magic numbers** to `src/lib/constants.ts`:
   - `SEARCH_DEBOUNCE_MS = 700`
   - `AUTOCOMPLETE_DEBOUNCE_MS = 300`
   - `BLUR_DELAY_MS = 200`
   - `DEFAULT_MAX_DISTANCE_FT = 2500`
   - `DEFAULT_MAX_DAYS = 540`

4. **Fix dead code**
   - `crashes/[crash_record_id]/+page.svelte` line 98: `showCrashType` derived is always `false` (compares `crash.category !== crash.category`). Remove or fix.

5. **Remove commented-out code**
   - `transformHelpers.ts` line 2: Luxon import comment
   - `MapContainer.svelte` line 91: commented marker tracking logic
   - `transformHelpers.ts` lines 82-85: commented numeral formatting

6. **Fix `any` types**
   - `mapping.ts`: type `L` properly (use `typeof import('leaflet')`)
   - `MapContainer.svelte`: type `activeMarker` with Leaflet's `CircleMarker` type

7. **Fix a11y violations**
   - Replace `<div>` click handlers with `<button>` elements in `LocationSearch.svelte` and `CrashList.svelte`
   - Remove `svelte-ignore a11y_click_events_have_key_events` suppressions

8. **Remove console.log/warn/error** from production code paths in:
   - `AppState.svelte.ts`
   - `crash.ts`
   - Route pages (neighborhoods, wards, intersections)

### Success Criteria

- `svelte-check` passes with no errors
- No `any` type annotations in mapping code
- No `console.log/warn/error` in source
- Bundle size reduced (luxon + numeral removed)

---

## Cycle 2 — Design System + Page Redesign

### Aesthetic: Civic Bold

A purposeful, authoritative look that serves people navigating real crash data. Inspired by the Chicago flag: confident blue + warm orange accent, clean white backgrounds, strong typographic hierarchy.

### Color Palette

```
Primary:    blue-700     (#1d4ed8)  — civic authority, Chicago flag blue
Accent:     orange-500   (#f97316)  — Chicago flag orange, CTAs and highlights
Fatal:      red-600      (#dc2626)  — unchanged, universally understood
Serious:    purple-600   (#9333ea)  — unchanged
Minor:      amber-500    (#f59e0b)
Background: white / gray-50
Surface:    gray-50 cards on white, white cards on gray
Text:       gray-900 headings / gray-600 secondary / gray-400 metadata
Border:     gray-100 (light) / gray-200 (medium)
```

### Typography

- **Font**: Inter (Google Fonts) with `system-ui` fallback
- `text-2xl font-bold` — page titles
- `text-lg font-semibold` — section headers
- `text-sm` — body/metadata
- `text-3xl font-bold tabular-nums` — large stat numbers

### Layout

- **Max width**: `max-w-6xl` (widened from current `max-w-5xl`)
- **Header**: sticky, `h-14`, thin `border-b border-gray-200`, wordmark left + nav right
- **Dashboard**: `grid-cols-[1fr_2fr]` on desktop (list 33% / map 67%), stacked on mobile
- **Cards**: `rounded-xl shadow-sm border border-gray-100 bg-white`

### Component Library: Shadcn-svelte

Install via CLI. Import primitives: `Badge`, `Card`, `Button`, `Separator`, `Table`, `Tooltip`, `Skeleton`.

### Pages to Redesign

1. **Shell (Header/Nav/Footer)**: sticky header, wordmark, icon, clean nav
2. **Dashboard**: split-pane with better filter UI, crash card improvements
3. **Location detail**: stat chips at top, crashes below, better map integration
4. **Crash detail**: readable card, clear injury callouts, better people/vehicle display
5. **List pages** (Neighborhoods, Wards, Intersections): sortable table with sticky header, stat chips

### Success Criteria

- Shadcn-svelte installed and primitives in use
- All pages redesigned with Civic Bold system
- Mobile layout verified on 375px viewport
- Map and stat colors consistent with new palette

---

## Cycle 3 — Polish & Mobile

### Goals

Refine interactions, ensure accessibility compliance, and eliminate visual rough edges.

### Tasks

1. **Skeleton loading states** — replace blank/flash with animated skeletons on all async data loads
2. **Mobile touch targets** — audit and enforce minimum 44×44px on all interactive elements
3. **Pagination UX** — improve pagination component, preserve page on back-navigation
4. **WCAG AA audit** — verify all text/background combinations meet 4.5:1 contrast ratio
5. **CSS consolidation** — remove redundant utility classes, consolidate custom CSS
6. **Inter font optimization** — subset font to used character sets
7. **E2E test pass** — run Playwright tests to confirm no regressions

### Success Criteria

- No WCAG AA contrast failures (use browser devtools audit)
- All touch targets ≥ 44px
- Skeleton states on all loading paths
- E2E tests pass

---

## Implementation Order

```
Cycle 1: Refactor
  └─ Remove unused files/deps
  └─ Extract constants
  └─ Fix dead code & types
  └─ Fix a11y
  └─ Remove console.*

Cycle 2: Design
  └─ Install shadcn-svelte
  └─ Set up Inter font
  └─ Redesign shell
  └─ Redesign Dashboard
  └─ Redesign Location/Crash pages
  └─ Redesign list pages

Cycle 3: Polish
  └─ Skeleton states
  └─ Mobile audit
  └─ WCAG audit
  └─ E2E tests
```

---

## Risks & Mitigations

| Risk                                     | Mitigation                                                         |
| ---------------------------------------- | ------------------------------------------------------------------ |
| Shadcn-svelte conflicts with Tailwind 4  | Test install in isolation before committing                        |
| Map library types (Leaflet) complex      | Use `typeof import('leaflet')` pattern, ignore specific edge cases |
| Redesign breaks existing map integration | Keep Leaflet wrapper isolated; only style wrapper container        |
| Mobile layout regression                 | Test on 375px at each cycle end                                    |
