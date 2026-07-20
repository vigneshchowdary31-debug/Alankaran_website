# Environment Variables

Every variable is `VITE_`-prefixed, which means **Vite inlines it into the client bundle at build
time**. All of them are readable by anyone who views the deployed site.

Only publishable values belong here. A Cloudinary API secret or a Firebase service-account key must
**never** be added — there is no such thing as a private `VITE_` variable.

Vite reads env files **only at startup**. Changing `.env.local` requires restarting the dev server.

---

## Firebase — all required

| Variable | Default | Failure mode if missing |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | placeholder dummy key | Sign-in fails with `auth/api-key-not-valid`. The admin panel shows a config error; the public site still renders from bundled fallbacks. |
| `VITE_FIREBASE_AUTH_DOMAIN` | `alankaran-cms.firebaseapp.com` | Auth redirects fail |
| `VITE_FIREBASE_PROJECT_ID` | `alankaran-cms` | **Silently reads the wrong project.** All CMS data appears missing. See warning below. |
| `VITE_FIREBASE_STORAGE_BUCKET` | `alankaran-cms.appspot.com` | Unused today (Cloudinary handles images) |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `123456789` | No impact — messaging is not used |
| `VITE_FIREBASE_APP_ID` | `1:123456789:web:abcdef123456` | Analytics/registration edge cases |

> ⚠️ **Fallback hazard.** `src/config/firebase.ts` falls back to project `alankaran-cms` when
> `VITE_FIREBASE_PROJECT_ID` is unset, but the real project is different. A build with missing env
> vars therefore points at a **non-existent project** and fails with confusing "no data" symptoms
> rather than a loud error. Recommended hardening (not applied in RC1, as it changes runtime
> behaviour): throw on startup instead of falling back.

---

## Cloudinary

| Variable | Required | Default | Failure mode |
|---|---|---|---|
| `VITE_CLOUDINARY_CLOUD_NAME` | **Yes** | `alankaran` | Uploads 404 |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | **Yes** | `alankaran_cms_preset` | Uploads rejected — preset not found, or not unsigned |
| `VITE_CLOUDINARY_FOLDER` | No | `alankaran_website` | Uploads land in the account root |
| `VITE_CLOUDINARY_API_BASE_URL` | No | `https://api.cloudinary.com/v1_1` | Only change for a proxy |

The preset **must be Unsigned**. A signed preset rejects browser uploads, because the browser cannot
sign the request and the API secret must not be shipped.

When cloud name or preset are still placeholders, `cloudinaryConfig.isConfigured` is `false` and the
admin Images page shows an amber "credentials required" banner instead of failing silently.

---

## Diagnostics

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `VITE_FIRESTORE_TRACE` | No | `false` | Set `"true"` to enable Firestore write tracing (document path, payload, authenticated UID, raw error code) in a **production** build. Always on in development. |

Leave this off in normal production — it logs payloads to the browser console.

---

## Per-environment

**Development** — copy `.env.example` to `.env.local` and fill in real values. `.env*` files are
git-ignored except `.env.example`. Tracing is automatic.

**Production (Vercel)** — add every variable under Project Settings → Environment Variables, scoped
to Production (and Preview if you use preview deploys). **Redeploy after changing any variable** —
they are inlined at build time, so an env change alone does nothing until a rebuild.

---

## Verifying configuration

The admin **Diagnostics** page (`/admin/debug`) reports Firestore reachability, Cloudinary
configuration, and auth state. It is the fastest way to confirm the environment is wired correctly.

`envValidator.ts` also surfaces missing configuration through the `CMSStatusBanner` in the admin
panel.

---

## Security checklist before handover

- [ ] No `.env` / `.env.local` committed — verified clean as of RC1
- [ ] Firebase Web API key restricted by HTTP referrer in the Google Cloud console
- [ ] Cloudinary preset scoped to the `alankaran_website` folder
- [ ] Keys rotated if this repository has been shared
