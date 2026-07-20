# CMS User Guide

For the person who manages the Alankaran website. No technical knowledge needed.

---

## The one thing to understand first

Changes you make are **not live immediately**.

Every change is saved as a **draft** — a private working copy only you can see. The public website
keeps showing the old content until you press **Publish**.

```
You upload an image  →  Saved as DRAFT  →  You press Publish  →  Now live
```

This is deliberate. It means you can change several things, check them, and put them live together —
and nothing half-finished is ever visible to visitors.

---

## Signing in

1. Go to `yourwebsite.com/admin`
2. Enter your email and password
3. You land on the Dashboard

If you're signed out, or your session expires, you'll be sent back here automatically. Nothing is
lost — just sign in again.

---

## Where everything lives

| I want to… | Go to |
|---|---|
| Change a picture on a specific page | **Page Images** |
| Add or reorder gallery photos | **Gallery** |
| Change phone, email, address, social links, logo | **Global Settings** |
| See who changed what | **Activity Log** |
| Check if everything is working | **Diagnostics** |

---

## Replacing an image

1. Open **Page Images**
2. Find the card you want. Each card tells you exactly where it appears on the site — for example
   *"Services grid card 4 · Mandap Design"*
3. Drag an image onto the card, or click to browse
4. Wait for the upload bar to finish
5. Press **Publish** for that section

> **Image tips.** Each card suggests a size — following it avoids stretched or cropped results. Use
> JPG, PNG, WebP or AVIF, under 10 MB. Landscape images suit banners; portrait suits collage tiles.

---

## The Gallery

The Gallery works differently — it's an unlimited collection rather than fixed slots.

- **Bulk Upload** — add many photos at once
- **Drag to reorder** — the order here is the order on the website
- **Categories** — set which filter a photo appears under
- **Publish** — as always, changes go live only after publishing

> ⚠️ **Important.** Gallery photos appear on **three** pages: the Gallery page, Wedding Stories, and
> the Home page. Reordering the gallery changes all three. The very first gallery image is also used
> as the large banner at the top of the Gallery and Wedding Stories pages — so if you reorder and the
> banner changes, that's why.

---

## Global Settings

One place for details that appear across the whole site: phone numbers, email addresses, WhatsApp
number, address, Google Maps location, Instagram, Facebook, and the website logo.

Change a value here and it updates **everywhere** — footer, contact page, WhatsApp button, all of it.
You never need to hunt for the same phone number in several places.

Each field shows a small badge:

- **published** — matches what visitors currently see
- **draft** — you've changed it but haven't published yet

Press **Save Draft** to keep your work, then **Publish to Website** when ready.

If a field turns red, the value isn't valid — the message under it explains what's wrong. For
example, the WhatsApp number must be digits only including the country code (`918977611886`, not
`+91 89776 11886`), because that's what the WhatsApp link needs.

---

## Deleting and restoring

Deleting is **safe and reversible**. Removing an image moves it to **Trash**, where it keeps its
details and where it came from.

In Trash you can:
- **Restore** — puts it back exactly where it was, as a draft
- **Purge** — permanently removes it (this cannot be undone)

Select several items with the checkboxes to restore or delete them together. Hold **Shift** while
clicking to select a range.

> **Note.** Restoring puts an image back as a *draft*. Publish the section to return it to the live
> site.

---

## Version History

Every time you publish, the CMS saves a snapshot. If a change turns out to be wrong, open **Version
History**, find an earlier version, and press **Restore**.

Restoring loads that version as a **draft** so you can check it first. It doesn't go live until you
publish again.

---

## Activity Log

A record of every change: who, what, and when. Useful when more than one person manages the site, or
when you're trying to work out when something changed.

---

## Diagnostics

A health dashboard. The two numbers to know:

- **Images 25 / 25** — how many picture slots have an image
- **Global Settings 7 / 7** — how many settings are published

Everything green means the CMS is connected and working.

---

## Common mistakes

**"I changed an image but the website looks the same."**
You saved a draft but didn't publish. Open the section and press Publish.

**"I deleted an image and it's still on the site."**
Deleting removes it from your draft. Publish the section to push the removal live.

**"I reordered the gallery and the Home page changed."**
Expected — the gallery feeds three pages. See the Gallery section above.

**"My WhatsApp link doesn't work."**
The number must be digits only with the country code and no `+` or spaces.

**"It says I don't have permission."**
Your session may have expired — sign out and back in. If it continues, contact your developer; the
database permissions may need attention.

**"I uploaded the wrong image."**
Just upload the right one over it. The card always shows what's currently there.

---

## Best practices

- **Publish in batches.** Make related changes together, check them, publish once.
- **Follow the suggested image sizes.** They're on every card.
- **Use descriptive gallery captions.** They become the image's alt text, which helps search engines
  and visitors using screen readers.
- **Don't purge from Trash immediately.** Leave items there a while in case you change your mind.
- **Check the Activity Log** if something looks unexpected — it will tell you what changed.

---

## Getting help

If something doesn't work, note what you were doing and what the message said, then contact your
developer. The **Diagnostics** page has useful details for them.
