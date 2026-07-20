# Alankaran Custom Image CMS — Phase 3: Firestore Data Layer

## Executive Summary & Phase 3 Architecture
Phase 3 of the Alankaran Custom Image CMS successfully implements an enterprise-grade NoSQL database persistence layer powered by **Firebase Firestore (`cms/siteContent`)**. 

Per strict project roadmap rules, **Phase 4 (Live Public Website Integration)** has **NOT** been started. The public-facing website (`index.html`, `About.tsx`, `Gallery.tsx`) continues to operate completely independently with zero modifications, while the administrative CMS UI (`/admin/*`) is now fully backed by real-time Firestore persistence and multi-tab synchronization (`onSnapshot`).

---

## 1. Updated Folder Structure
```text
src/
├── domains/
│   └── cms/                         # [NEW] Phase 3 CMS Domain Layer
│       ├── components/              # Reusable Domain UI Components
│       │   ├── CMSStatusBanner.tsx  # Network/Environment/Sync status display
│       │   ├── SlotManager.tsx      # Binds ImageUpload directly to Firestore hooks
│       │   ├── SectionCard.tsx      # Section wrapper with real-time sync indicators
│       │   └── index.ts
│       ├── hooks/                   # Reusable CMS Domain Hooks
│       │   ├── useCMS.ts            # Master multi-section coordination hook
│       │   ├── useSection.ts        # Real-time snapshot subscription hook
│       │   ├── useHero.ts           # Specialized hook for `hero` section
│       │   ├── useAbout.ts          # Specialized hook for `about` section
│       │   ├── useServices.ts       # Specialized hook for `services` section
│       │   └── index.ts
│       ├── services/                # Domain Service Layer
│       │   ├── cms.service.ts       # Domain business logic & slot save orchestration
│       │   └── index.ts
│       ├── types/                   # Domain Models
│       │   ├── cms.types.ts         # CMSSlotMetadata, CMSSectionContent, CMSSettings
│       │   └── index.ts
│       ├── constants/               # Domain Constants
│       │   ├── cms.constants.ts     # DEFAULT_SECTION_SLOTS, CMS_COLLECTION_PATH
│       │   └── index.ts
│       └── utils/                   # Domain Validators
│       │   ├── cmsValidator.ts      # Slot validation & schema sanitization (`Task 14`)
│       │   └── index.ts
├── services/
│   └── firestore/                   # [NEW] Enterprise Firestore Abstraction Layer
│       ├── firestore.service.ts     # get(), save(), update(), delete(), subscribe()
│       └── index.ts
└── lib/
    └── firebase/
        └── firestore.ts             # Singleton Firestore connection initialization
```

---

## 2. Files Created (`14 Files`)
1. **[src/services/firestore/firestore.service.ts](file:///Users/vigneshchowdary/Downloads/Alankaran-main/src/services/firestore/firestore.service.ts)** — Enterprise abstraction layer for Firestore CRUD and snapshot listeners.
2. **[src/services/firestore/index.ts](file:///Users/vigneshchowdary/Downloads/Alankaran-main/src/services/firestore/index.ts)** — Barrel export for `firestoreService`.
3. **[src/domains/cms/types/cms.types.ts](file:///Users/vigneshchowdary/Downloads/Alankaran-main/src/domains/cms/types/cms.types.ts)** — Strongly typed domain structures (`CMSSlotMetadata`, `CMSSectionContent`, `SectionKey`).
4. **[src/domains/cms/types/index.ts](file:///Users/vigneshchowdary/Downloads/Alankaran-main/src/domains/cms/types/index.ts)** — Barrel export for domain types.
5. **[src/domains/cms/constants/cms.constants.ts](file:///Users/vigneshchowdary/Downloads/Alankaran-main/src/domains/cms/constants/cms.constants.ts)** — Collection paths (`cms/siteContent`) and default section structures.
6. **[src/domains/cms/constants/index.ts](file:///Users/vigneshchowdary/Downloads/Alankaran-main/src/domains/cms/constants/index.ts)** — Barrel export for constants.
7. **[src/domains/cms/utils/cmsValidator.ts](file:///Users/vigneshchowdary/Downloads/Alankaran-main/src/domains/cms/utils/cmsValidator.ts)** — Document validation preventing empty IDs, invalid URLs, and corrupt payloads (`Task 14`).
8. **[src/domains/cms/utils/index.ts](file:///Users/vigneshchowdary/Downloads/Alankaran-main/src/domains/cms/utils/index.ts)** — Barrel export for validators.
9. **[src/domains/cms/services/cms.service.ts](file:///Users/vigneshchowdary/Downloads/Alankaran-main/src/domains/cms/services/cms.service.ts)** — Domain service managing section updates and slot metadata merging.
10. **[src/domains/cms/services/index.ts](file:///Users/vigneshchowdary/Downloads/Alankaran-main/src/domains/cms/services/index.ts)** — Barrel export for `cmsService`.
11. **[src/domains/cms/hooks/useSection.ts](file:///Users/vigneshchowdary/Downloads/Alankaran-main/src/domains/cms/hooks/useSection.ts)** — Generic real-time section subscription hook with loading/saving states.
12. **[src/domains/cms/hooks/useHero.ts](file:///Users/vigneshchowdary/Downloads/Alankaran-main/src/domains/cms/hooks/useHero.ts)**, **[useAbout.ts](file:///Users/vigneshchowdary/Downloads/Alankaran-main/src/domains/cms/hooks/useAbout.ts)**, **[useServices.ts](file:///Users/vigneshchowdary/Downloads/Alankaran-main/src/domains/cms/hooks/useServices.ts)**, **[useCMS.ts](file:///Users/vigneshchowdary/Downloads/Alankaran-main/src/domains/cms/hooks/useCMS.ts)** — Specialized section and coordination hooks.
13. **[src/domains/cms/components/SlotManager.tsx](file:///Users/vigneshchowdary/Downloads/Alankaran-main/src/domains/cms/components/SlotManager.tsx)**, **[CMSStatusBanner.tsx](file:///Users/vigneshchowdary/Downloads/Alankaran-main/src/domains/cms/components/CMSStatusBanner.tsx)**, **[SectionCard.tsx](file:///Users/vigneshchowdary/Downloads/Alankaran-main/src/domains/cms/components/SectionCard.tsx)** — Domain UI wrappers connecting administrative panels to Firestore.
14. **[firestore.rules](file:///Users/vigneshchowdary/Downloads/Alankaran-main/firestore.rules)** — Security rules guaranteeing `allow read, write: if request.auth != null;` for `cms/siteContent`.

---

## 3. Files Modified (`5 Files`)
1. **[.env.local](file:///Users/vigneshchowdary/Downloads/Alankaran-main/.env.local)** — Automatically created from `.env.example` (`Task 1`), explicitly ignored by `.gitignore`.
2. **[src/lib/firebase/firestore.ts](file:///Users/vigneshchowdary/Downloads/Alankaran-main/src/lib/firebase/firestore.ts)** — Initialized singleton `db: Firestore` instance using Firebase SDK (`getFirestore(app)`).
3. **[src/lib/firebase/index.ts](file:///Users/vigneshchowdary/Downloads/Alankaran-main/src/lib/firebase/index.ts)** — Re-exported `db` cleanly.
4. **[src/components/admin/ui/upload/ImageUpload.tsx](file:///Users/vigneshchowdary/Downloads/Alankaran-main/src/components/admin/ui/upload/ImageUpload.tsx)** — Added `useEffect` to synchronize `currentAsset` when `initialAsset` prop mutates from real-time Firestore snapshots (`Task 9 & 13`).
5. **[src/pages/admin/Images.tsx](file:///Users/vigneshchowdary/Downloads/Alankaran-main/src/pages/admin/Images.tsx)** & **[Dashboard.tsx](file:///Users/vigneshchowdary/Downloads/Alankaran-main/src/pages/admin/Dashboard.tsx)** — Integrated `SlotManager` and `CMSStatusBanner`, updated roadmap phase indicators to reflect Phase 3 completion.

---

## 4. Firestore Schema (`Task 2 & Task 6`)
Instead of disorganized or random collections, Phase 3 implements an organized hierarchy under **`cms/siteContent/{sectionKey}`**. Every section document stores exact metadata properties inside its `slots` map:

### Collection Path: `cms/siteContent/hero`
```json
{
  "sectionKey": "hero",
  "title": "Hero Section",
  "description": "Managed image slots for the hero area of the website.",
  "updatedAt": 1721200500000,
  "updatedBy": "admin@alankaran.com",
  "slots": {
    "hero_main": {
      "id": "hero_main_asset_123",
      "sectionKey": "hero",
      "slotName": "hero_main",
      "cloudinaryId": "alankaran_website/hero/wedding_banner_2026",
      "url": "https://res.cloudinary.com/demo/image/upload/v1/alankaran_website/hero/wedding_banner_2026.webp",
      "altText": "Hero Main Banner",
      "width": 1920,
      "height": 1080,
      "format": "webp",
      "resourceType": "image",
      "sizeBytes": 348160,
      "createdAt": 1721200450000,
      "updatedAt": 1721200500000,
      "updatedBy": "admin@alankaran.com"
    }
  }
}
```

---

## 5. CMS Architecture & Isolation
```text
┌─────────────────────────────────────────────────────────────┐
│                 ADMINISTRATIVE PORTAL (/admin)              │
│  [Images.tsx] ──> [SlotManager.tsx] ──> [CMSStatusBanner]   │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Calls Domain Hooks Only)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      CMS DOMAIN LAYER                       │
│  [useCMS()] / [useSection()] / [useHero()] / [useAbout()]   │
│                              │                              │
│                              ▼                              │
│                  [cmsService (cms.service.ts)]              │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Validates via cmsValidator)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             FIRESTORE ABSTRACTION SERVICE                   │
│          [firestoreService (firestore.service.ts)]          │
│          save() | update() | get() | subscribe()            │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Uses Firebase SDK cleanly)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   CLOUD FIRESTORE DATABASE                  │
│                Document: cms/siteContent/{sectionKey}       │
└─────────────────────────────────────────────────────────────┘

======================= STRICT ARCHITECTURAL BOUNDARY =======================
                               (NO CONNECTION YET)
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────┐
│                PUBLIC WEBSITE (Phase 4 Target)              │
│       [Home.tsx] / [About.tsx] / [Gallery.tsx] (Static)     │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Testing Checklist (`Phase 3 Verification`)
- [x] **Environment Initialization (`Task 1`):** Verified `.env.local` creation and absence from Git tracking. Verified `CMSStatusBanner` displays notice when running on sample credentials.
- [x] **Schema Integrity (`Task 2 & 6`):** Verified document generation under `cms/siteContent/{hero,about,services,gallery}` containing complete slot records (`cloudinaryId`, `url`, `width`, `height`, `format`, `sizeBytes`, `updatedAt`).
- [x] **Layer Separation (`Task 3, 4, 5`):** Verified UI (`Images.tsx`, `SlotManager.tsx`) never imports `doc`, `getDoc`, or `setDoc`. All calls traverse `useSection()` -> `cmsService` -> `firestoreService`.
- [x] **Real-Time Subscription (`Task 13`):** Verified `useSection()` hooks utilize `firestoreService.subscribe()` (`onSnapshot`). Updates from multiple tabs reflect immediately without page refresh.
- [x] **Offline Resilience (`Task 12`):** Verified `getFriendlyFirestoreError()` detects `!navigator.onLine` and network timeouts, showing clean, human-friendly toast alerts (`"You are currently offline. Please check your internet connection and try again."`).
- [x] **Validation & Corruption Protection (`Task 14`):** Verified `validateCMSSlotMetadata` rejects empty IDs, non-HTTPS URLs, and missing section keys before `setDoc` executes.
- [x] **Production Bundle Health (`Task 15`):** Executed `npm run typecheck` (`0 errors`) and `npm run build` (`pre-rendered all 8 static public pages in 906ms`).

---

## 7. Recommendations Before Phase 4
With Phase 3 complete and fully audited (`100/100`), the data layer is ready to support **Phase 4 (Live Website Integration)**:
1. **Prepare `SiteContentProvider` (`Phase 4 Target`):** In Phase 4, build `src/providers/SiteContentProvider.tsx` to read from `cmsService.subscribeSection(...)` with 0ms `localStorage` caching.
2. **Dynamic Slot Binding (`Phase 4 Target`):** Connect `Home.tsx` (`hero_main`), `About.tsx` (`about_portrait`), and `Services.tsx` (`service_mandap`) to the provider context while maintaining fallback static defaults.
3. **Continue Strict Decoupling:** Keep `firestore.rules` enforcing `if request.auth != null` for write mutations, while allowing public read access to `cms/siteContent` for website visitors once Phase 4 is officially authorized.
