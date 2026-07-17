import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { m, AnimatePresence, useReducedMotion } from "framer-motion";
import { useBooking } from "@/context/BookingContext";
import { useCTAVisibility } from "@/hooks/useCTAVisibility";

export default function FloatingCTA() {
  const [location] = useLocation();
  const hash = typeof window !== "undefined" ? window.location.hash : "";
  const isVisible = useCTAVisibility(1200);
  const { openBookingModal } = useBooking();
  const shouldReduceMotion = useReducedMotion();

  // Re-read hash on location change
  const [activeHash, setActiveHash] = useState(hash);
  useEffect(() => {
    const handleHashChange = () => {
      setActiveHash(window.location.hash);
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [location]);

  // Determine configuration based on route
  const getCTAConfig = () => {
    // If we're on Home page and visiting Themes hash, show themes action
    if (location === "/" && (activeHash === "#royal-themes" || activeHash === "#themes")) {
      return {
        label: "Match My Theme",
        action: () => {
          const el = document.getElementById("royal-themes");
          if (el) {
            el.scrollIntoView({ behavior: "smooth" });
            window.dispatchEvent(new CustomEvent("highlight-royal-themes"));
          }
        }
      };
    }

    switch (location) {
      case "/":
        return {
          label: "Begin Your Story →",
          action: () => openBookingModal()
        };
      case "/services":
        return {
          label: "Request a Custom Quote",
          action: () => openBookingModal({ eventType: "Wedding" })
        };
      case "/destinations":
        return {
          label: "Get My Destination Shortlist",
          action: () => {
            const el = document.getElementById("plan-form");
            if (el) {
              el.scrollIntoView({ behavior: "smooth" });
              const input = document.getElementById("destination-name-input");
              if (input) {
                setTimeout(() => input.focus(), 800);
              }
            }
          }
        };
      case "/wedding-stories":
      case "/gallery":
        return {
          label: "Plan a Wedding Like This",
          action: () => {
            const contextMsg = location === "/gallery"
              ? "I am interested in planning a wedding similar to the designs in your Gallery portfolio."
              : "I am interested in planning a luxury wedding inspired by your Real Wedding Stories.";
            openBookingModal({ message: contextMsg });
          }
        };
      case "/about":
      case "/contact":
      case "/testimonials":
        return {
          label: "Book a Free Consultation",
          action: () => openBookingModal()
        };
      default:
        return null;
    }
  };

  const config = getCTAConfig();

  if (!config) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <m.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: 15 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: 15 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="fixed bottom-[96px] right-6 z-40"
        >
          <button
            onClick={config.action}
            className="group relative overflow-hidden px-6 py-3.5 bg-gradient-to-r from-[#c9a96e] to-[#d4af37] text-[#2a2421] font-sans font-bold text-[10px] tracking-[0.2em] rounded-full uppercase transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2 border border-gold/30"
            style={{
              boxShadow: "0 0 24px rgba(201,169,110,0.45)"
            }}
            data-testid={`floating-cta-${location.replace(/\//g, "")}`}
          >
            {/* Shimmer sweep effect */}
            {!shouldReduceMotion && (
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent -translate-x-full animate-sweep" />
            )}
            
            <span className="relative z-10">{config.label}</span>
          </button>
        </m.div>
      )}
    </AnimatePresence>
  );
}
