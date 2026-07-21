# CMS UI/UX Redesign

Presentation-only refinement. **No functionality changed** — Firestore, Cloudinary, auth, business
logic, data models, routing, APIs and tests are untouched. All 101 tests still pass.

## Design language

- **Client words, not developer words.** "Website Connected" instead of "Firestore Data Layer
  Active"; "Diagnostics" instead of "Enterprise Diagnostics & Observability". No Phase/Task numbers,
  no `cmsSiteContent`, no "subsystem/telemetry" in client-facing surfaces.
- **One heading, one subtitle, one helper sentence.** Long paragraphs replaced with a single line.
- **Status pills, unified.** Connected / Offline / Published / Draft use one rounded-pill style.

## What changed

### Dashboard — full rebuild
Was a development roadmap (6 "Phase" cards + session/version panels). Now a real dashboard:
- **Stat cards** — Published Images, Gallery Photos, Wedding Stories, Last Published — with live
  numbers pulled from existing services (`slotCoverageService`, `weddingStoriesService`,
  `auditLogService`). Skeleton placeholders while loading.
- **Recent Activity** — the six latest actions, colour-coded, with relative timestamps ("2 min ago").
- **Quick Actions** — Page Images, Gallery, Wedding Stories, Global Settings, View Website.
- Roadmap/Phase cards removed entirely.

### Sidebar
Renamed and reordered to client language: Dashboard · Website · Gallery · Wedding Stories · Global
Settings · Activity Log · Diagnostics. Developer badges ("CDN Active", "Future") removed.

### Status banner
"Phase 3 Firestore Data Layer Active / CLOUD CONNECTED / cmsSiteContent" → **"Website Connected"**
with a plain-language helper and a single Connected/Offline pill. Offline and setup notices rewritten
for non-technical readers.

### Page headers (5 pages)
Images, Gallery, Activity, Settings, Diagnostics — jargon badges removed, titles shortened
("Website Images", "Gallery", "Diagnostics"), multi-clause descriptions cut to one sentence.

## Component hierarchy (unchanged structurally)

```
AdminLayout (sidebar + content)
  └── page (Dashboard / Images / Gallery / Wedding Stories / Settings / Activity / Diagnostics)
        └── PageHeader + domain component
```

## Already met by existing code

- **Wedding Stories accordion** — the editor already opens one story at a time (`expandedId`).
- **Buttons** — the design system already standardises primary (gold) / outline / danger (rose).
- **Luxury palette** — preserved; only text hierarchy and pill styling adjusted.

## Deferred (not done in this pass)

Honest scope note. The following from the brief were **not** implemented and remain follow-up work,
each a substantial change on its own:

- Diagnostics restructure into System Health / Storage / Website / Security cards (one dev string,
  "Collection: cmsSiteContent", still shows in a detail row).
- Activity Log row-height redesign, colour-coded filters, virtualization.
- Gallery grid hover-edit / sticky bulk actions polish.
- Global Settings two-column form layout.
- Custom illustrated empty states; skeleton loaders on every page.
- Responsive sidebar-as-drawer; sticky save bars on mobile.
- Formal accessibility (AA contrast / ARIA) and performance (memoization) audit.

These need a running browser to tune and verify, and were kept out to avoid unverifiable churn.

---

# Phase 2 — Design System

Presentation-only, building on Phase 1. **No** service, schema, rules, routing, auth, or test files
changed — verified by `git status`. 101 tests still pass.

## Reusable components (`src/components/admin/ui/DesignSystem.tsx`)

The core deliverable: shared primitives so pages compose from one system instead of bespoke markup.

| Component | Purpose |
|---|---|
| `PageContainer` | Standard page wrapper (`space-y-8`, fade-in) |
| `StatusBadge` | The single status pill — tones: published / draft / archived / connected / offline / neutral |
| `StatsCard` | Icon + big number + label, with skeleton loading state |
| `SectionCard` | Flat card: title + description + content + footer actions (no cards-inside-cards) |
| `FormSection` | Labelled two-column field group |
| `InfoPanel` | Inline info / warning / success note |
| `ActionToolbar` | Optionally-sticky action/search bar |

`PageHeader` and `EmptyState` already existed and are kept.

## Applied this pass

- **Dashboard** — inline stat cards → `StatsCard`; the connected/offline pill → `StatusBadge`.
- **Global Settings** — the flat 7-field single column is now two grouped, two-column sections
  (**Contact**, **Social**), each field using `StatusBadge`. Cuts the form's height by roughly a
  third. (Branding/logo remains its own card above.)
- **StatusBadge** now the shared pill in Dashboard and Global Settings.

## Deferred (unchanged from Phase 1 list, still open)

Diagnostics 4-card split · Gallery hover/sticky polish · Activity Log row redesign · Wedding Stories
collapsed-card thumbnails · responsive sidebar-drawer · formal AA-contrast/ARIA audit. These need a
running browser to tune and were left out to avoid unverifiable churn. The new primitives make each
of them a smaller, safer job than before.
