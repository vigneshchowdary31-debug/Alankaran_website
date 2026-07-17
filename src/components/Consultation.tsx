import { useState } from "react";
import { m } from "framer-motion";
import { Calendar, CheckSquare } from "lucide-react";

const sources = ["A Friend", "Instagram", "Facebook", "Blog or Magazine"];

const inputBase =
  "w-full bg-transparent border-b border-gold/30 font-sans font-light text-sm placeholder-transparent focus:outline-none focus:border-gold transition-colors duration-300 py-3 text-white";

export default function Consultation() {
  const [form, setForm] = useState({
    name: "",
    company: "",
    designation: "",
    phone: "",
    email: "",
    date: "",
    event: "",
    guests: "",
    sources: [] as string[],
  });
  const [submitted, setSubmitted] = useState(false);

  function toggle(src: string) {
    setForm((f) => ({
      ...f,
      sources: f.sources.includes(src)
        ? f.sources.filter((s) => s !== src)
        : [...f.sources, src],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <section
      id="consultation"
      className="relative overflow-hidden bg-nizami-dark"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[700px]">
        {/* Left: luxury image panel */}
        <div
          className="relative hidden lg:block bg-luxury-gradient border-r border-border/20"
        >
          {/* Decorative elements */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center px-12">
              <div
                className="font-serif text-7xl mb-6 leading-none text-gold animate-pulse"
              >
                ✦
              </div>
              <p
                className="font-serif text-3xl lg:text-4xl leading-tight mb-6 text-nizami-maroon"
              >
                Your celebration begins with a single conversation.
              </p>
              <div
                className="h-px w-16 mx-auto mb-6 bg-gold"
              />
              <p
                className="font-sans font-light text-sm leading-relaxed text-muted-foreground"
              >
                Share your vision and we will begin crafting something extraordinary — with the same care and devotion we bring to every celebration.
              </p>
            </div>
          </div>
        </div>

        {/* Right: form panel */}
        <div
          className="relative flex flex-col justify-center px-6 md:px-12 xl:px-16 py-20 bg-nizami-dark"
        >
          {/* Heading */}
          <div className="mb-12">
            <m.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-sans text-xs uppercase tracking-widest mb-4 text-gold"
            >
              Begin Your Story
            </m.p>
            <m.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="font-serif text-3xl lg:text-4xl text-white"
            >
              Request a Consultation
            </m.h2>
          </div>

          {submitted ? (
            <m.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
              data-testid="consultation-success"
            >
              <div
                className="font-serif text-5xl mb-6 text-gold"
              >
                ✦
              </div>
              <h3
                className="font-serif text-3xl mb-4 text-white"
              >
                Thank You
              </h3>
              <p
                className="font-sans font-light text-sm leading-relaxed max-w-sm mx-auto text-muted-foreground"
              >
                We have received your enquiry and will be in touch within 24
                hours to begin crafting your celebration.
              </p>
            </m.div>
          ) : (
            <m.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-8 max-w-lg"
              data-testid="form-consultation"
            >
              <p
                className="font-sans text-xs uppercase tracking-widest text-muted-foreground"
              >
                * indicates required fields
              </p>

              {/* Name */}
              <div className="relative pt-5">
                <label
                  htmlFor="c-name"
                  className="absolute top-0 left-0 font-sans text-xs uppercase tracking-widest text-gold"
                >
                  Your Name *
                </label>
                <input
                  type="text"
                  id="c-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputBase}
                  placeholder="Your Name"
                  data-testid="input-c-name"
                />
              </div>

              {/* Company + Designation */}
              <div className="grid grid-cols-2 gap-6">
                <div className="relative pt-5">
                  <label
                    htmlFor="c-company"
                    className="absolute top-0 left-0 font-sans text-xs uppercase tracking-widest text-gold"
                  >
                    Company
                  </label>
                  <input
                    type="text"
                    id="c-company"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    className={inputBase}
                    placeholder="Company"
                    data-testid="input-c-company"
                  />
                </div>
                <div className="relative pt-5">
                  <label
                    htmlFor="c-designation"
                    className="absolute top-0 left-0 font-sans text-xs uppercase tracking-widest text-gold"
                  >
                    Designation
                  </label>
                  <input
                    type="text"
                    id="c-designation"
                    value={form.designation}
                    onChange={(e) => setForm({ ...form, designation: e.target.value })}
                    className={inputBase}
                    placeholder="Designation"
                    data-testid="input-c-designation"
                  />
                </div>
              </div>

              {/* Phone + Email */}
              <div className="grid grid-cols-2 gap-6">
                <div className="relative pt-5">
                  <label
                    htmlFor="c-phone"
                    className="absolute top-0 left-0 font-sans text-xs uppercase tracking-widest text-gold"
                  >
                    Phone *
                  </label>
                  <input
                    type="tel"
                    id="c-phone"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className={inputBase}
                    placeholder="Phone"
                    data-testid="input-c-phone"
                  />
                </div>
                <div className="relative pt-5">
                  <label
                    htmlFor="c-email"
                    className="absolute top-0 left-0 font-sans text-xs uppercase tracking-widest text-gold"
                  >
                    Email *
                  </label>
                  <input
                    type="email"
                    id="c-email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={inputBase}
                    placeholder="Email"
                    data-testid="input-c-email"
                  />
                </div>
              </div>

              {/* How did you hear */}
              <div>
                <p
                  className="font-sans text-xs uppercase tracking-widest mb-4 text-gold"
                >
                  Where did you hear about us?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {sources.map((src) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => toggle(src)}
                      className="flex items-center gap-3 text-left transition-colors duration-200"
                      data-testid={`checkbox-source-${src.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <span
                        className={`flex-shrink-0 w-4 h-4 border flex items-center justify-center transition-colors duration-200 ${form.sources.includes(src)
                            ? "border-gold bg-gold/10"
                            : "border-gold/30 bg-transparent"
                          }`}
                      >
                        {form.sources.includes(src) && (
                          <CheckSquare
                            size={10}
                            className="text-gold"
                          />
                        )}
                      </span>
                      <span
                        className={`font-sans font-light text-sm transition-colors ${form.sources.includes(src)
                            ? "text-white"
                            : "text-muted-foreground"
                          }`}
                      >
                        {src}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div className="relative pt-5">
                <label
                  htmlFor="c-date"
                  className="absolute top-0 left-0 font-sans text-xs uppercase tracking-widest text-gold"
                >
                  Event Date *
                </label>
                <div className="flex items-center gap-3 border-b border-gold/30 pb-3">
                  <Calendar size={14} className="text-gold" />
                  <input
                    type="date"
                    id="c-date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="bg-transparent font-sans font-light text-sm focus:outline-none flex-1 text-white"
                    style={{ colorScheme: "dark" }}
                    data-testid="input-c-date"
                  />
                </div>
              </div>

              {/* Guest Count */}
              <div className="relative pt-5">
                <label
                  htmlFor="c-guests"
                  className="absolute top-0 left-0 font-sans text-xs uppercase tracking-widest text-gold"
                >
                  Approximate Guest Count
                </label>
                <input
                  type="text"
                  id="c-guests"
                  value={form.guests}
                  onChange={(e) => setForm({ ...form, guests: e.target.value })}
                  className={inputBase}
                  placeholder="e.g. 300–500 guests"
                  data-testid="input-c-guests"
                />
              </div>

              {/* About your event */}
              <div className="relative pt-5">
                <label
                  htmlFor="c-event"
                  className="absolute top-0 left-0 font-sans text-xs uppercase tracking-widest text-gold"
                >
                  Tell us about your event *
                </label>
                <textarea
                  id="c-event"
                  required
                  rows={4}
                  value={form.event}
                  onChange={(e) => setForm({ ...form, event: e.target.value })}
                  className="w-full bg-transparent border border-gold/30 font-sans font-light text-sm focus:outline-none focus:border-gold transition-colors duration-300 p-4 resize-none mt-1 text-white"
                  placeholder="The number and kind of functions you're planning, venues, style, anything you'd like us to know..."
                  data-testid="textarea-c-event"
                />
              </div>

              {/* Submit */}
              <m.button
                type="submit"
                className="w-full py-4 font-sans text-xs uppercase tracking-widest transition-all bg-gold text-primary-foreground hover:bg-gold-hover hover:gold-glow font-bold rounded-full border border-gold/20 shadow-md"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                data-testid="btn-consultation-submit"
              >
                Request Consultation
              </m.button>
            </m.form>
          )}
        </div>
      </div>
    </section>
  );
}
