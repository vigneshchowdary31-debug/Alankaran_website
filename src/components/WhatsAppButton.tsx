import { m, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { X, Calendar } from "lucide-react";
import { useBooking } from "@/context/BookingContext";

const WHATSAPP_URL = "https://api.whatsapp.com/send/?phone=918977611886&text=Hi%21+Can+you+provide+me+with+more+information+on+your+event+planning+services%3F&type=phone_number&app_absent=0";

export default function WhatsAppButton() {
  const [showTooltip, setShowTooltip] = useState(false);
  const { openBookingModal } = useBooking();

  const openWhatsApp = () => {
    window.open(WHATSAPP_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3.5">
      {/* Premium Obsidian Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <m.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative max-w-[260px] p-4.5 rounded-xl border border-gold/30 shadow-[0_10px_30px_rgba(0,0,0,0.65)] backdrop-blur-lg bg-stone-950/95 pointer-events-auto"
          >
            <button
              onClick={() => setShowTooltip(false)}
              className="absolute top-2.5 right-2.5 text-gold/60 hover:text-gold transition-colors p-1"
              aria-label="Dismiss"
            >
              <X size={11} />
            </button>
            <div className="font-sans text-[11px] leading-relaxed text-stone-300 font-light pr-2">
              <span className="font-semibold text-gold block mb-1 tracking-wider uppercase text-[9px]">Nizami Concierge</span>
              Speak with a Nizami Design expert or request your private wedding consultation.
            </div>
            {/* Elegant pointing triangle */}
            <div className="absolute -bottom-[6px] right-10 w-3 h-3 rotate-45 bg-stone-950 border-r border-b border-gold/30" />
          </m.div>
        )}
      </AnimatePresence>

      {/* Unified Royal Concierge Capsule */}
      <m.div
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.8, duration: 0.7, type: "spring", stiffness: 100 }}
        className="backdrop-blur-md bg-stone-950/85 border border-gold/35 rounded-full shadow-[0_12px_45px_rgba(0,0,0,0.7)] p-2 flex items-center gap-2 md:gap-3 pointer-events-auto"
        onMouseEnter={() => setShowTooltip(true)}
      >
        {/* Sleek WhatsApp Action (Glass Pill) */}
        <m.button
          onClick={openWhatsApp}
          className="flex items-center gap-2 px-4.5 py-2.5 bg-emerald-950/45 hover:bg-emerald-900/60 border border-emerald-500/25 text-emerald-300 font-sans font-bold text-[10px] tracking-[0.2em] rounded-full transition-all hover:scale-105 active:scale-95 uppercase"
          whileTap={{ scale: 0.96 }}
          aria-label="Chat on WhatsApp"
        >
          {/* Customized Gold-Green WhatsApp Icon */}
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-3.5 h-3.5 text-emerald-400"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
          <span className="hidden sm:inline">WhatsApp</span>
        </m.button>

        {/* Primary Booking Action (Metallic Gold Pill) */}
        <m.button
          onClick={() => openBookingModal()}
          className="flex items-center gap-2 px-5.5 py-2.5 bg-gold text-nizami-dark font-sans font-extrabold text-[10px] tracking-[0.2em] rounded-full gold-glow shadow-md hover:scale-105 active:scale-95 uppercase transition-all duration-300 border border-gold/25"
          whileTap={{ scale: 0.96 }}
        >
          <Calendar size={13} className="stroke-[2.5]" />
          <span>Book Now</span>
        </m.button>
      </m.div>
    </div>
  );
}
