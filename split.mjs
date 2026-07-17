import fs from 'fs';

const content = fs.readFileSync('src/pages/Home.tsx', 'utf8');

const heroStart = content.indexOf('{/* ─── PREMIUM FULL-SCREEN HERO LANDING SLIDER ─── */}');
const luxuryStart = content.indexOf('{/* ─── LUXURY SHOWCASE ─── */}');
const footerStart = content.indexOf('<Footer />');

const heroJSX = content.slice(heroStart, luxuryStart).trim();
const belowFoldJSX = content.slice(luxuryStart, footerStart).trim();

// ---------------------------------------------------------
// HomeBelowFold.tsx
// ---------------------------------------------------------
const homeBelowFoldContent = `import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

const services = [
  { name: "Wedding Planning", desc: "From vision to reality — every detail orchestrated with precision and care." },
  { name: "Luxury Wedding Decor", desc: "Bespoke environments crafted from the finest materials and floral artistry." },
  { name: "Floral Styling", desc: "Living sculptures of bloom, fragrance, and texture that define a space." },
  { name: "Mandap Design", desc: "Sacred ceremonial spaces elevated into architectural masterpieces." },
  { name: "Engagement Decor", desc: "Intimate celebrations adorned with warmth, softness, and intention." },
  { name: "Reception Styling", desc: "Grand, luminous evenings designed to be felt long after the last dance." },
  { name: "Royal Theme Weddings", desc: "The grandeur of Indian royalty, reimagined for the modern celebration." },
  { name: "Wedding Stage Design", desc: "Statement stages that command presence and frame every photograph." },
  { name: "Bridal Entry Concepts", desc: "Arrivals so breathtaking, every guest will pause in silence." },
  { name: "Custom Event Styling", desc: "Singular creative vision applied to every facet of your celebration." },
];

const themes = [
  { name: "Rajasthani Royal", sub: "Desert gold & palace grandeur" },
  { name: "Mughal Garden", sub: "Symmetry, blooms & marble luxury" },
  { name: "Contemporary Luxe", sub: "Editorial precision meets warmth" },
  { name: "Temple Floristry", sub: "Sacred devotion meets living art" },
  { name: "Nawabi Elegance", sub: "Lucknow courts & chikan refinement" },
];

const stories = [
  { couple: "Priya & Arjun", date: "March 2024", location: "Udaipur, Rajasthan", theme: "Royal Palace" },
  { couple: "Meera & Rohit", date: "January 2024", location: "Goa", theme: "Coastal Elegance" },
  { couple: "Ananya & Vikram", date: "November 2023", location: "Jaipur Palace", theme: "Mughal Garden" },
];

const testimonials = [
  { text: "Alankaran turned our dream into reality. Every detail was beyond what we imagined.", client: "Priya & Arjun", location: "Udaipur" },
  { text: "The mandap design was breathtaking. Our guests are still talking about it months later.", client: "Meera & Rohit", location: "Goa" },
  { text: "From the first consultation to the last petal, the attention to detail was extraordinary.", client: "Ananya & Vikram", location: "Jaipur" },
];

function WeddingImage({ image, aspectClass = "aspect-[4/5]", label = "" }: { image: string; aspectClass?: string; label?: string }) {
  return (
    <div className={\`group \${aspectClass} relative overflow-hidden rounded-2xl border border-gold/15 shadow-sm hover:shadow-xl hover:shadow-gold/10 transition-all duration-700 bg-muted\`}>
      <img
        src={image}
        alt={label || "Wedding Decor"}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.6s] cubic-bezier(0.16, 1, 0.3, 1) group-hover:scale-105"
        loading="lazy"
        decoding="async"
      />
      <div className="absolute inset-3 border border-gold/10 pointer-events-none rounded-xl z-10 transition-all duration-700 group-hover:border-gold/30 group-hover:inset-4" />
      <div className="absolute inset-0 flex items-end p-5 z-20 transition-all duration-700" style={{ background: "linear-gradient(to top, rgba(42,36,33,0.5) 0%, rgba(42,36,33,0.1) 40%, transparent 100%)" }}>
        {label && (
          <div className="transform translate-y-1 group-hover:translate-y-0 transition-transform duration-500">
            <span className="section-label text-white/95 tracking-[0.2em] font-sans font-semibold text-[10px] drop-shadow-sm">{label}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const images = [
  "/images/royal_mandap.webp",
  "/images/coastal_wedding.webp",
  "/images/mughal_garden.webp",
  "/images/floral_stage.webp",
  "/images/bridal_entry.webp",
  "/images/engagement_decor.webp",
  "/images/grand_reception.webp",
  "/images/floral_detail.webp",
];

export default function HomeBelowFold({ pulseHighlight }: { pulseHighlight: boolean }) {
  return (
    <>
      ${belowFoldJSX}
    </>
  );
}
`;
fs.writeFileSync('src/components/home/HomeBelowFold.tsx', homeBelowFoldContent);


// ---------------------------------------------------------
// HeroSection.tsx
// ---------------------------------------------------------
const heroSectionContent = `import { useState, useEffect, lazy, Suspense } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

const HeroCanvas = lazy(() => import("@/components/HeroCanvas"));

export default function HeroSection() {
  const [currentLandingSlide, setCurrentLandingSlide] = useState(0);
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const landingSlides = [
    {
      image: "/images/hero-mandap.webp",
      title: "ALANKARAN",
      subtitle: "Hyderabad's Premier Luxury Wedding Planners & Designers",
      tagline: "✦ BESPOKE NIZAMI ROYALTY & MODERN ROMANCE ✦"
    },
    {
      image: "/images/gallery-royal-1.webp",
      title: "ELEVATED ARTISTRY",
      subtitle: "Immersive Architectural Decor & Floral Styling",
      tagline: "✦ COMPOSING ETERNAL MEMORIES ✦"
    },
    {
      image: "/images/cinematic_floral_wedding.webp",
      title: "GRAND CELEBRATIONS",
      subtitle: "Flawless Execution Rooted in Splendor and Grace",
      tagline: "✦ ESTABLISHED 2011 — HYDERABAD ✦"
    },
    {
      image: "/images/mughal_garden.webp",
      title: "MUGHAL GARDEN LUXURY",
      subtitle: "Symmetry, Blooms & Sacred Temple Floristry",
      tagline: "✦ EVERY DETAIL CREATED WITH DELIBERATE INTENT ✦"
    },
    {
      image: "/images/hero-couple.webp",
      title: "ROYAL LUXURY",
      subtitle: "Nizami Splendor & Modern Romance",
      tagline: "✦ AN ANTHOLOGY OF LOVE STORIES ✦"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentLandingSlide((prev) => (prev + 1) % landingSlides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [currentLandingSlide, landingSlides.length]);

  const nextLandingSlide = () => {
    setCurrentLandingSlide((prev) => (prev + 1) % landingSlides.length);
  };

  const prevLandingSlide = () => {
    setCurrentLandingSlide((prev) => (prev - 1 + landingSlides.length) % landingSlides.length);
  };

  const springX = useSpring(0, { stiffness: 60, damping: 20 });
  const springY = useSpring(0, { stiffness: 60, damping: 20 });
  const heroMoveX = useTransform(springX, [-1, 1], [-18, 18]);
  const heroMoveY = useTransform(springY, [-1, 1], [-10, 10]);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setMouseX(x);
      setMouseY(y);
      springX.set(x);
      springY.set(y);
    };
    window.addEventListener("mousemove", onMouse);
    return () => window.removeEventListener("mousemove", onMouse);
  }, [springX, springY]);

  return (
    <>
      ${heroJSX}
    </>
  );
}
`;
fs.writeFileSync('src/components/home/HeroSection.tsx', heroSectionContent);


// ---------------------------------------------------------
// Home.tsx
// ---------------------------------------------------------
const homeContent = `import { useState, useEffect, lazy, Suspense, memo } from "react";
import SEO from "@/components/SEO";
import StructuredData from "@/components/StructuredData";
import Footer from "@/components/Footer";
import HeroSection from "@/components/home/HeroSection";

// We use an IntersectionObserver wrapper (LazySection) later, but for now we just lazy load it
const HomeBelowFold = memo(lazy(() => import("@/components/home/HomeBelowFold")));

export default function Home() {
  const [pulseHighlight, setPulseHighlight] = useState(false);

  useEffect(() => {
    const handleHighlight = () => {
      setPulseHighlight(true);
      const timer = setTimeout(() => setPulseHighlight(false), 3000);
      return () => clearTimeout(timer);
    };
    window.addEventListener("highlight-royal-themes", handleHighlight);
    return () => window.removeEventListener("highlight-royal-themes", handleHighlight);
  }, []);

  return (
    <div className="bg-background text-foreground overflow-x-hidden">
      <SEO
        title="Hyderabad Luxury Wedding Planner & Nizami Floral Design"
        description="Alankaran is Hyderabad's premier luxury wedding planning and management company, creating immersive royal celebrations inspired by Nizami heritage, romance, and modern editorial beauty."
        url="https://alankaran.com/"
      />
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": ["LocalBusiness", "Organization"],
          "name": "Alankaran Luxury Weddings",
          "url": "https://alankaran.com",
          "logo": "https://alankaran.com/favicon.svg",
          "image": "https://alankaran.com/og-image.jpg",
          "description": "Hyderabad's premier luxury wedding planning and management company.",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Hyderabad",
            "addressCountry": "IN"
          }
        }}
      />

      <HeroSection />

      <Suspense fallback={<div className="h-screen w-full" />}>
        <HomeBelowFold pulseHighlight={pulseHighlight} />
      </Suspense>

      <Footer />
    </div>
  );
}
`;
fs.writeFileSync('src/pages/Home.tsx', homeContent);

