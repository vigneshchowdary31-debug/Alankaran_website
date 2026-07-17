import { useRef } from "react";
import { m, useInView, useReducedMotion } from "framer-motion";
import { useBooking } from "@/context/BookingContext";

interface InlineSectionCTAProps {
  message?: string;
  ctaText?: string;
  action?: () => void;
  bookingOptions?: {
    eventType?: string;
    message?: string;
  };
}

export default function InlineSectionCTA({
  message = "Loved what you saw? Let's create yours.",
  ctaText = "Plan Your Celebration",
  action,
  bookingOptions
}: InlineSectionCTAProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.35 });
  const shouldReduceMotion = useReducedMotion();
  const { openBookingModal } = useBooking();

  const handleAction = action || (() => openBookingModal(bookingOptions));

  return (
    <div ref={ref} className="w-full py-10 overflow-hidden">
      <m.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 35 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: shouldReduceMotion ? 0 : 35 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full bg-[#f5e6d0]/45 border border-gold/25 backdrop-blur-[4px] rounded-xl py-8 px-6 md:px-10 flex flex-col md:flex-row items-center justify-between gap-6"
        style={{ boxShadow: "0 8px 32px rgba(201,169,110,0.06)" }}
      >
        <p className="font-serif text-foreground text-lg md:text-xl text-center md:text-left">
          {message}
        </p>
        <button
          onClick={handleAction}
          className="shrink-0 px-8 py-3 border border-gold text-gold hover:bg-gold hover:text-nizami-dark font-sans text-[10px] tracking-[0.2em] uppercase font-bold rounded-full transition-all duration-300 shadow-sm"
        >
          {ctaText}
        </button>
      </m.div>
    </div>
  );
}
