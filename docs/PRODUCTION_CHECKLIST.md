# Production Checklist

Status as of RC1. **Anything marked ❌ Not Verified has never been observed working** — it is not a
prediction of failure, it is an honest statement that no one has checked.

The distinction matters: everything below the line "verified statically" is proven by source
inspection, typechecking and automated tests against in-memory fakes. Nothing has been exercised
against live Firebase, Cloudinary or Vercel.

---

## Infrastructure

| Item | Status | Notes |
|---|---|---|
| Firebase project created | ✅ Verified | `alankaran-deb6e`, confirmed reachable |
| Firebase Auth (Email/Password) enabled | ❌ **Not Verified** | Never signed in; at least one admin user must exist |
| **Firestore rules deployed** | ❌ **NOT DEPLOYED — BLOCKER** | Confirmed by probe: an anonymous inquiry create that the repo rules explicitly allow was rejected `PERMISSION_DENIED`. The deployed rules are locked-mode defaults. |
| Firestore indexes deployed | ⚠️ N/A | `firestore.indexes.json` is intentionally empty — no composite index is required |
| Cloudinary upload preset verified | ✅ Verified | Live probe: unsigned upload to `cdk2qpvx` returned `200` with a `secure_url` |
| Vercel env vars configured | ❌ **Not Verified** | No access to project settings |
| Domain connected | ❌ **Not Verified** | |
| HTTPS working | ❌ **Not Verified** | Vercel provides this automatically |

### The blocker

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Until this runs, **every CMS read and write fails**. `firebase.json` and `.firebaserc` are committed,
so the command works as-is.

---

## CMS functionality — all Not Verified

None of these has been observed working end to end. Each is implemented, source-traced, and (where
noted) covered by automated tests against in-memory Firestore fakes.

| Item | Status | Test coverage |
|---|---|---|
| Admin login | ❌ Not Verified | — |
| `/admin` route loads on Vercel | ❌ Not Verified | Previously returned a Vercel 404; SPA rewrite fixed but unconfirmed |
| Image upload | ❌ Not Verified | Cloudinary leg verified by live probe; Firestore leg untested live |
| Draft save | ❌ Not Verified | ✅ unit tested |
| Publish | ❌ Not Verified | ✅ unit tested |
| Website reflects published content | ❌ Not Verified | ✅ resolution logic unit tested |
| Delete → Trash | ❌ Not Verified | ✅ unit tested (incl. the merge-write bug regression) |
| Restore | ❌ Not Verified | ✅ unit tested, single + bulk |
| Permanent delete | ❌ Not Verified | ✅ unit tested, up to 100 items |
| Version History | ❌ Not Verified | ✅ unit tested |
| Activity Log | ❌ Not Verified | — |
| Gallery | ❌ Not Verified | ✅ resolver unit tested |
| Global Settings | ❌ Not Verified | ✅ validation + publication state unit tested |
| Diagnostics | ❌ Not Verified | — |

---

## Code quality — verified

| Item | Status |
|---|---|
| Production build | ✅ Clean — `dist/static`, 6.3 MB |
| TypeScript | ✅ Zero errors (`tsc --noEmit`) |
| Tests | ✅ 77/77 passing across 4 files |
| Dead code | ✅ Zero unreferenced modules |
| Broken imports / routes / image refs | ✅ None |
| Secrets committed | ✅ None — verified across the repo |
| TODO / FIXME / HACK | ✅ Zero |
| `console.*` in production | ✅ All 40 calls `import.meta.env.DEV`-guarded |
| Documentation | ✅ 12 current documents; 12 stale ones archived |
| ESLint | ❌ Not configured |
| Accessibility audit | ❌ Not performed — requires a running app |
| Responsive audit | ❌ Not performed — requires a running app |

---

## Smoke test — run this after deploying

This single sequence produces more evidence than any further static analysis.

1. Deploy code to Vercel; deploy rules with the command above.
2. Visit `/admin` → confirm it loads (not a Vercel 404). **Hard-refresh** — that is what exercises the SPA rewrite.
3. Sign in.
4. Open **Diagnostics** → confirm Firestore reachable, Cloudinary configured.
5. **Page Images** → upload an image to any slot → confirm the success toast.
6. Confirm the public page still shows the **old** image (draft is not live).
7. **Publish** the section → confirm the public page now shows the new image.
8. **Remove** the image → confirm it appears in **Trash**.
9. **Restore** it → confirm it returns to the slot as a draft.
10. **Version History** → confirm a snapshot exists; restore it.
11. **Activity Log** → confirm every action above is listed.
12. **Global Settings** → change a phone number → Publish → confirm the Footer updates.

Any failure: check the browser console. Every Firestore operation logs its document path, payload,
authenticated UID and raw error code.

---

## After a successful smoke test

1. Remove the 32 unused npm packages (`DEPENDENCIES.md` has the exact command). Deliberately *after*
   verification, so a lockfile change is never in the same deploy as your first live test.
2. Build the Cloudinary cleanup job — orphaned assets accumulate from day one.
3. Add ESLint as a dedicated pass.
4. Accessibility and responsive audits.
