import { Link } from "wouter";
import { m } from "framer-motion";
import { SiFacebook, SiInstagram, SiWhatsapp } from "react-icons/si";
import { useState } from "react";
import { useBooking } from "@/context/BookingContext";
import Logo from "@/components/Logo";
import { useContactInfo } from "@/providers/SiteContentProvider";
import { buildWhatsAppUrl, buildMapLinkUrl, toTelHref } from "@/domains/cms/constants";

const services = [
  "Wedding Planning",
  "Luxury Wedding Decor",
  "Floral Styling",
  "Mandap Design",
  "Engagement Decor",
  "Reception Styling",
  "Royal Theme Weddings",
  "Bridal Entry Concepts",
];

const quickLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Luxury Services", href: "/services" },

  { label: "Wedding Stories", href: "/wedding-stories" },
  { label: "Gallery", href: "/gallery" },
  { label: "Testimonials", href: "/testimonials" },
  { label: "Contact", href: "/contact" },
];

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const { openBookingModal } = useBooking();
  // Phase A Task 8: contact details resolve from the CMS, not from literals in this file.
  const contact = useContactInfo();
  const whatsappUrl = buildWhatsAppUrl(contact);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) { setSubscribed(true); setEmail(""); }
  };

  return (
    <footer className="bg-nizami-dark text-stone-200 border-t border-gold/20">
      {/* Top section */}
      <div className="max-w-screen-xl mx-auto px-6 lg:px-12 pt-20 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="mb-4">
              <Logo size={46} showText={true} textColor="#FCFBF9" />
            </div>
            <p className="font-sans text-sm leading-relaxed text-stone-400 font-light mt-4">
              Crafting royal Indian wedding experiences in Hyderabad and global destinations with timeless elegance, editorial precision, and Nizami heritage artistry. Curated with Nizami Elegance.
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-4 mt-6">
              {[
                { Icon: SiInstagram, label: "Instagram", href: contact.instagramUrl },
                { Icon: SiFacebook, label: "Facebook", href: contact.facebookUrl },
                { Icon: SiWhatsapp, label: "WhatsApp", href: whatsappUrl },
              ].map(({ Icon, label, href }) => (
                <m.a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 border border-gold/20 text-stone-400 transition-colors cursor-pointer hover:border-gold hover:text-gold hover:gold-glow rounded-full bg-stone-900"
                  aria-label={label}
                  data-testid={`social-${label.toLowerCase()}`}
                >
                  <Icon size={15} />
                </m.a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:pl-6 lg:pl-12">
            <p className="section-label mb-6 text-gold">Quick Links</p>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>
                    <m.span
                      className="font-sans text-sm cursor-pointer transition-colors text-stone-400 font-light hover:text-gold"
                      whileHover={{ x: 4 }}
                      data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {link.label}
                    </m.span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <p className="section-label mb-6 text-gold">Our Services</p>
            <ul className="space-y-3">
              {services.map((s) => (
                <li key={s}>
                  <span className="font-sans text-sm text-stone-400 font-light">{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact + Newsletter */}
          <div>
            <p className="section-label mb-6 text-gold">Hyderabad Studio</p>
            <div className="space-y-3 mb-8">
              {contact.emails.map((email) => (
                <a key={email} href={`mailto:${email}`} className="block font-sans text-sm text-stone-400 hover:text-gold transition-colors font-light">
                  {email}
                </a>
              ))}
              {contact.phones.map((phone) => (
                <a key={phone} href={toTelHref(phone)} className="block font-sans text-sm text-stone-400 hover:text-gold transition-colors font-light">
                  {phone}
                </a>
              ))}
              <a href={buildMapLinkUrl(contact)} target="_blank" rel="noopener noreferrer" className="block font-sans text-sm text-stone-400 hover:text-gold transition-colors font-light leading-relaxed">
                {contact.addressShort}
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-sans text-[10px] tracking-widest font-semibold uppercase px-4 py-2.5 mt-2 bg-stone-900 border border-gold/30 hover:border-gold hover:text-gold transition-all rounded-full w-full justify-center text-stone-300"
                data-testid="link-whatsapp"
              >
                💬 Chat on WhatsApp
              </a>
            </div>

            <p className="section-label mb-3 text-gold">Newsletter</p>
            {subscribed ? (
              <p className="font-sans text-sm text-gold">Thank you for subscribing.</p>
            ) : (
              <form onSubmit={handleSubscribe} className="flex rounded-full overflow-hidden border border-gold/20 focus-within:border-gold/50 transition-all bg-stone-900" data-testid="form-newsletter">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email"
                  className="flex-1 px-4 py-2.5 text-xs font-sans bg-transparent focus:outline-none text-white transition-all placeholder:text-stone-500"
                  data-testid="input-newsletter-email"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 section-label transition-all bg-gold text-background font-bold tracking-widest uppercase hover:bg-[#9B7744] text-[10px]"
                  data-testid="btn-newsletter-subscribe"
                >
                  Join
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Gold divider */}
      <div className="max-w-screen-xl mx-auto px-6 lg:px-12">
        <div className="h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
      </div>

      {/* Bottom bar */}
      <div className="max-w-screen-xl mx-auto px-6 lg:px-12 py-6 flex flex-col md:flex-row justify-between items-center gap-2">
        <p className="font-sans text-xs text-stone-500 font-light">
          &copy; {new Date().getFullYear()} Alankaran — Hyderabad’s Luxury Wedding Atelier. All rights reserved.
        </p>
        <p className="font-sans text-xs italic text-gold/60 font-light">
          Where heritage meets modern luxury. Inspired by Hyderabad’s Royal Legacy.
        </p>
      </div>
    </footer>
  );
}
