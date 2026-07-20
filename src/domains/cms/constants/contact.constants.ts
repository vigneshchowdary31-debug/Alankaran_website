import type { CMSContactInfo } from "../types";

/**
 * Phase A Task 8 — Contact Data Centralization.
 *
 * These values were previously hardcoded across `Contact.tsx`, `Footer.tsx`, and `WhatsAppButton.tsx`
 * (the phone `+91 89776 11886` alone appeared in five places, and the three numbers had already
 * drifted out of sync between the Contact page and the Footer).
 *
 * This is now the seed/fallback only. The live values come from `cmsSiteContent/contact` via
 * `useContactInfo()`; this constant is what renders before that document exists or while offline.
 */
export const DEFAULT_CONTACT_INFO: CMSContactInfo = {
  phones: ["+91 89776 11886", "+91 91772 10150", "+91 88854 41188"],
  emails: ["chaitanya@alankaran.com", "chandrika@alankaran.com"],
  addressLine:
    "Plot no: 78, TNGO's Colony Phase 2, Financial District, Gachibowli, Hyderabad, Telangana 500046",
  addressShort: "Financial District, Gachibowli, Hyderabad 500046",
  mapQuery:
    "Alankaran+Events-+Best+Event+Management+%26+Wedding+Management+Company+in+Hyderabad",
  whatsappNumber: "918977611886",
  whatsappMessage:
    "Hi! Can you provide me with more information on your event planning services?",
  instagramUrl: "https://www.instagram.com/alankaranevents",
  facebookUrl: "https://www.facebook.com/alankaranevents",
  businessHours: "Monday–Saturday, 10:00 AM – 7:00 PM IST",
  studios: ["Hyderabad — Headquarters", "Delhi — Design Studio", "Jaipur — Creative Studio"],
};

/** Builds the WhatsApp deep link from contact info — previously duplicated byte-for-byte in 4 files. */
export function buildWhatsAppUrl(info: CMSContactInfo): string {
  const text = encodeURIComponent(info.whatsappMessage);
  return `https://api.whatsapp.com/send/?phone=${info.whatsappNumber}&text=${text}&type=phone_number&app_absent=0`;
}

/** Builds the Google Maps embed URL used by the Contact page map. */
export function buildMapEmbedUrl(info: CMSContactInfo): string {
  return `https://maps.google.com/maps?q=${info.mapQuery}&output=embed&z=14`;
}

/** Builds the Google Maps link used by the Footer address. */
export function buildMapLinkUrl(info: CMSContactInfo): string {
  return `https://maps.google.com/?q=${encodeURIComponent(info.addressLine)}`;
}

/** `+91 89776 11886` -> `+918977611886` for `tel:` links. */
export function toTelHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
