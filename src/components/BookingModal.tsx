import { useState, useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
import { X, Calendar, CheckSquare, Users, Mail, Phone, User, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { inquiryService } from "@/domains/cms/services";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  options?: {
    eventType?: string;
    message?: string;
  };
}

const eventTypes = ["Wedding", "Engagement", "Corporate", "Social Event", "Other"];

const inputBase =
  "w-full bg-transparent border-b border-gold/40 font-sans font-light text-sm placeholder-transparent focus:outline-none focus:border-gold transition-colors duration-300 py-3 text-foreground";

export default function BookingModal({ isOpen, onClose, options }: BookingModalProps) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    eventType: "",
    date: "",
    guests: "",
    message: "",
  });

  useEffect(() => {
    if (isOpen) {
      setForm({
        name: "",
        email: "",
        phone: "",
        eventType: options?.eventType || "",
        date: "",
        guests: "",
        message: options?.message || "",
      });
    }
  }, [isOpen, options]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Phase A Task 7: persist the lead to `cmsInquiries` instead of simulating a request.
    try {
      await inquiryService.submit({
        name: form.name,
        phone: form.phone,
        email: form.email,
        eventType: form.eventType,
        message: form.message,
        eventDate: form.date,
        guestCount: form.guests,
        sourcePage: "booking",
      });
    } catch (err: any) {
      toast({
        title: "Booking Request Failed",
        description:
          err?.message || "We couldn't send your request. Please try again or reach us on WhatsApp.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    toast({
      title: "Booking Request Sent",
      description: "We'll get back to you within 24 hours to confirm your event details.",
    });

    setIsSubmitting(false);
    setForm({
      name: "",
      email: "",
      phone: "",
      eventType: "",
      date: "",
      guests: "",
      message: "",
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="theme-classic w-[92vw] sm:w-full max-w-2xl bg-background text-foreground border border-border/40 p-0 overflow-hidden shadow-xl rounded-2xl">
        <div className="relative grid grid-cols-1 md:grid-cols-5 min-h-0 md:min-h-[600px]">
          {/* Left Side - Decorative */}
          <div className="hidden md:flex md:col-span-2 relative flex-col justify-center px-8 text-center border-r border-border/20 bg-nizami-maroon">
            <div className="z-10">
              <div className="font-serif text-5xl mb-6 text-gold">✦</div>
              <h2 className="font-serif text-2xl text-card-bg mb-4">Book Your Event</h2>
              <div className="h-px w-12 bg-gold mx-auto mb-6" />
              <p className="font-sans font-light text-xs text-card-bg/80 leading-relaxed">
                Step into a world where your vision becomes a masterpiece. Let us craft an experience that transcends the ordinary.
              </p>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="md:col-span-3 p-6 md:p-10 bg-card-bg overflow-y-auto max-h-[85vh] md:max-h-[90vh]">
            <DialogHeader className="mb-8">
              <DialogTitle className="font-serif text-2xl text-foreground text-left">Event Details</DialogTitle>
              <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-gold mt-2">Begin Your Journey</p>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div className="relative pt-5">
                <label className="absolute top-0 left-0 font-sans text-[10px] uppercase tracking-widest text-gold/70">
                  Full Name *
                </label>
                <div className="flex items-center gap-3">
                  <User size={14} className="text-gold/50" />
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={inputBase}
                    placeholder="Full Name"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="relative pt-5">
                  <label className="absolute top-0 left-0 font-sans text-[10px] uppercase tracking-widest text-gold/70">
                    Email Address *
                  </label>
                  <div className="flex items-center gap-3">
                    <Mail size={14} className="text-gold/50" />
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className={inputBase}
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
                <div className="relative pt-5">
                  <label className="absolute top-0 left-0 font-sans text-[10px] uppercase tracking-widest text-gold/70">
                    Phone Number *
                  </label>
                  <div className="flex items-center gap-3">
                    <Phone size={14} className="text-gold/50" />
                    <input
                      type="tel"
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className={inputBase}
                      placeholder="+91 00000 00000"
                    />
                  </div>
                </div>
              </div>

              {/* Event Type */}
              <div className="relative pt-5">
                <p className="font-sans text-[10px] uppercase tracking-widest text-gold/70 mb-3">Event Type *</p>
                <div className="flex flex-wrap gap-2">
                  {eventTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm({ ...form, eventType: type })}
                      className={`px-3 py-1.5 text-[10px] font-sans uppercase tracking-wider border rounded-full transition-all ${form.eventType === type
                          ? "bg-gold text-primary-foreground border-gold font-semibold"
                          : "bg-transparent text-muted-foreground border-border hover:border-gold/60 hover:text-gold"
                        }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Guests */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="relative pt-5">
                  <label className="absolute top-0 left-0 font-sans text-[10px] uppercase tracking-widest text-gold/70">
                    Event Date *
                  </label>
                  <div className="flex items-center gap-3 border-b border-gold/30 pb-3 mt-1">
                    <Calendar size={14} className="text-gold/50" />
                    <input
                      type="date"
                      required
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="bg-transparent font-sans font-light text-sm focus:outline-none flex-1 text-foreground"
                      style={{ colorScheme: "light" }}
                    />
                  </div>
                </div>
                <div className="relative pt-5">
                  <label className="absolute top-0 left-0 font-sans text-[10px] uppercase tracking-widest text-gold/70">
                    Estimated Guests
                  </label>
                  <div className="flex items-center gap-3">
                    <Users size={14} className="text-gold/50" />
                    <input
                      type="text"
                      value={form.guests}
                      onChange={(e) => setForm({ ...form, guests: e.target.value })}
                      className={inputBase}
                      placeholder="e.g. 200-300"
                    />
                  </div>
                </div>
              </div>

              {/* Message */}
              <div className="relative pt-5">
                <label className="absolute top-0 left-0 font-sans text-[10px] uppercase tracking-widest text-gold/70">
                  Tell us about your event
                </label>
                <div className="flex gap-3 pt-2">
                  <MessageSquare size={14} className="text-gold/50 mt-3" />
                  <textarea
                    rows={3}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full bg-transparent border-b border-gold/40 font-sans font-light text-sm focus:outline-none focus:border-gold transition-colors duration-300 py-3 text-foreground resize-none"
                    placeholder="Any specific requirements or vision..."
                  />
                </div>
              </div>

              {/* Submit */}
              <m.button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 mt-4 font-sans text-[10px] uppercase tracking-[0.2em] bg-gold text-primary-foreground hover:bg-gold-hover transition-all font-bold rounded-full disabled:opacity-50 disabled:cursor-not-allowed border border-gold/20 shadow-md"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                {isSubmitting ? "Processing..." : "Confirm Booking Inquiry"}
              </m.button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
