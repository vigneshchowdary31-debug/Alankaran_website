# Wedding Stories — Firestore Schema

Collection: **`weddingStories`** — public read, admin write (see `firestore.rules`).

## Story document — `weddingStories/{storyId}`

```jsonc
{
  "id": "story_bootstrap_00",
  "bride": "Priya", "groom": "Arjun",
  "location": "Udaipur, Rajasthan",
  "month": "March", "year": "2024",
  "theme": "Royal Palace", "palette": "Burgundy, Gold & Ivory",
  "paragraph1": "…", "paragraph2": "…",          // max 600 chars each (enforced in the editor)
  "images": [                                     // exactly 4: [header, grid-large, grid-small-top, grid-small-bottom]
    { "url": "https://res.cloudinary.com/…/v1784…/…", "cloudinaryId": "alankaran_website/wedding-stories/royal_mandap",
      "width": 1408, "height": 768, "format": "webp" },
    null, null, null                              // a null slot falls back to a bundled image at that position
  ],
  "photographer": "", "venue": "", "tags": [],    // optional SEO
  "order": 0,                                      // ascending; the public page renders in this order
  "status": "published",                          // draft | published | archived
  "createdAt": 0, "updatedAt": 0, "publishedAt": 0,
  "updatedBy": "admin@alankaran.com"
}
```

## Hero document — `weddingStories/__hero`

Reserved id, filtered out of story listings.

```jsonc
{
  "image":         { "url": "…", "cloudinaryId": "…" },   // draft
  "subtitle": "Real Weddings", "titleLine1": "Celebrations", "titleLine2": "That Live Forever",
  "overlayOpacity": 1,                                    // multiplies the 3-stop gradient; 1 = current look
  "publishedImage": { … }, "publishedSubtitle": "…",      // published mirror (what the public page reads)
  "publishedTitleLine1": "…", "publishedTitleLine2": "…", "publishedOverlayOpacity": 1,
  "status": "published", "updatedAt": 0, "publishedAt": 0
}
```

## Notes

- **Publish model.** The public page renders only `status === "published"` stories and the hero's
  `published*` mirror. Draft edits stay invisible until published.
- **Soft delete = `status: "archived"`.** Reuses the status field instead of the image-slot trash
  schema (different shape). Archived stories appear in the admin Trash and restore to `draft`.
- **No manual URL construction.** Every image URL is the versioned `secure_url` returned by
  Cloudinary. Cloudinary folder: `alankaran_website/wedding-stories/`.
- **Indexes:** none required — `listStories` sorts client-side by `order`.
