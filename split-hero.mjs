import fs from 'fs';

const content = fs.readFileSync('src/pages/Home.tsx', 'utf8');

// Find the boundaries
const heroStart = content.indexOf('{/* ─── PREMIUM FULL-SCREEN HERO LANDING SLIDER ─── */}');
const heroEnd = content.indexOf('{/* ─── LUXURY SHOWCASE ─── */}'); // wait, this was extracted out!

// In the new Home.tsx, the hero ends right before:
const closingDiv = content.indexOf('<Suspense fallback={null}>');

const heroJSX = content.slice(heroStart, closingDiv).trim();

// The imports and state for Hero
const heroComponent = `import { useState, useEffect, lazy, Suspense } from "react";
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
    ${heroJSX}
  );
}
`;

fs.writeFileSync('src/components/home/HeroSection.tsx', heroComponent);

const newHomeContent = `import { useState, useEffect, lazy, Suspense, memo } from "react";
import SEO from "@/components/SEO";
import StructuredData from "@/components/StructuredData";
import HeroSection from "@/components/home/HeroSection";

const HomeBelowFold = memo(lazy(() => import("./HomeBelowFold")));

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

      <Suspense fallback={null}>
        <HomeBelowFold pulseHighlight={pulseHighlight} />
      </Suspense>
    </div>
  );
}
`;

fs.writeFileSync('src/pages/Home.tsx', newHomeContent);

