# Dependency Audit

Verified by grepping actual `import` statements across `src/`. Nothing here is assumed from
`package.json` alone.

**6 production dependencies, 66 dev dependencies.** Note that Vite bundles from `devDependencies`
too — the split in this project does not reflect what ships. What matters is what is imported.

---

## Actually used at runtime

| Package | Why it exists | Required? |
|---|---|---|
| `firebase` | Firestore + Auth. The entire CMS backend. | **Yes** |
| `react` / `react-dom` | Framework | **Yes** |
| `wouter` (24 files) | Routing — public and admin | **Yes** |
| `framer-motion` (17 files) | Page transitions and scroll animation throughout the marketing site | **Yes** |
| `lucide-react` (43 files) | Icon set across the admin panel and site | **Yes** |
| `react-icons` | Brand glyphs only (`SiFacebook`, `SiInstagram`, `SiWhatsapp` in Footer) | Yes — could be replaced with 3 inline SVGs |
| `react-helmet-async` | `<head>` management for SEO + SSR pre-render | **Yes** |
| `three` + `@react-three/fiber` + `@react-three/drei` | `HeroCanvas` / `DecorCanvas` 3D backgrounds | **Yes** (heaviest dependency — see below) |
| `clsx` + `tailwind-merge` | `cn()` class helper | **Yes** |
| `class-variance-authority` (3 files) | Variant styling in Button/Alert/Toast | **Yes** |
| `@radix-ui/react-dialog` | Modals | **Yes** |
| `@radix-ui/react-toast` | Toast notifications | **Yes** |
| `@radix-ui/react-tooltip` | Tooltips | **Yes** |
| `@radix-ui/react-slot` | `asChild` composition in Button | **Yes** |
| `@radix-ui/react-progress` | Upload progress bar | **Yes** |
| `@radix-ui/react-switch` | Admin toggles | **Yes** |
| `vitest` | Test runner | **Yes** (dev) |
| `vite`, `typescript`, `tailwindcss`, `autoprefixer`, `postcss` | Build toolchain | **Yes** (dev) |

---

## Not imported anywhere — removable

These were installed with the original shadcn/ui scaffold. The components that consumed them were
deleted during the production cleanup; the packages were left behind.

**21 unused Radix packages:** `react-accordion`, `react-alert-dialog`, `react-aspect-ratio`,
`react-avatar`, `react-checkbox`, `react-collapsible`, `react-context-menu`, `react-dropdown-menu`,
`react-hover-card`, `react-label`, `react-menubar`, `react-navigation-menu`, `react-popover`,
`react-radio-group`, `react-scroll-area`, `react-select`, `react-separator`, `react-slider`,
`react-tabs`, `react-toggle`, `react-toggle-group`

**11 other unused packages:** `gsap`, `zod`, `react-hook-form`, `date-fns`, `recharts`,
`embla-carousel-react`, `cmdk`, `vaul`, `sonner`, `input-otp`, `react-day-picker`,
`react-resizable-panels`

> `gsap` is a **production** dependency but is never imported. The `gsap-reveal` class names in
> `About.tsx` are plain CSS selectors with no GSAP driving them — confirmed absent from `index.css`
> too, so they are currently inert markers.

### Removal command

Not run in this pass — RC1 is documentation-only and this touches `package.json` and the lockfile.

```bash
npm uninstall gsap zod react-hook-form date-fns recharts embla-carousel-react \
  cmdk vaul sonner input-otp react-day-picker react-resizable-panels \
  @radix-ui/react-accordion @radix-ui/react-alert-dialog @radix-ui/react-aspect-ratio \
  @radix-ui/react-avatar @radix-ui/react-checkbox @radix-ui/react-collapsible \
  @radix-ui/react-context-menu @radix-ui/react-dropdown-menu @radix-ui/react-hover-card \
  @radix-ui/react-label @radix-ui/react-menubar @radix-ui/react-navigation-menu \
  @radix-ui/react-popover @radix-ui/react-radio-group @radix-ui/react-scroll-area \
  @radix-ui/react-select @radix-ui/react-separator @radix-ui/react-slider \
  @radix-ui/react-tabs @radix-ui/react-toggle @radix-ui/react-toggle-group
```

**Do this after a successful deployment and smoke test, not before.** It cannot change runtime
behaviour (nothing imports them), but it does rewrite the lockfile, and you do not want a lockfile
change in the same deploy as your first live verification.

---

## Bundle impact

Total JS is **~2.26 MB uncompressed** across all chunks.

Unused packages contribute **~0 KB** to the bundle — Vite tree-shakes anything not imported. Removing
them shrinks `node_modules`, install time, and audit surface, not the shipped bundle.

The real weight is `three` + `@react-three/fiber` + `@react-three/drei`, which together dominate the
JS payload and are used only for decorative 3D canvases. **If bundle size becomes a concern, that is
the only meaningful lever** — lazy-loading `HeroCanvas` behind an intersection observer, or dropping
the effect, would cut far more than every unused package combined.

Images were the dominant payload and have already been addressed: `public/images` went from 40 MB to
3.5 MB, and `dist/static` from ~43 MB to 6.3 MB.
