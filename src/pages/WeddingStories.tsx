import { Link } from "wouter";
import { m } from "framer-motion";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useSiteContent } from "@/providers/SiteContentProvider";

const stories = [
  {
    couple: "Priya & Arjun",
    date: "March 2024",
    location: "Udaipur, Rajasthan",
    theme: "Royal Palace",
    color: "Burgundy, Gold & Ivory",
    story: [
      "The moment Priya described her dream — a ceremony that felt like stepping inside a Mughal miniature painting — we knew this would be unlike anything we'd created before. The City Palace as backdrop, Lake Pichola shimmering at dusk, and a mandap of seven thousand marigolds and white tuberoses.",
      "Every element was chosen to feel simultaneously ancient and perfectly of this moment. The florals took three days to install. The lighting was calibrated to the exact quality of Udaipur's evening light. On the day itself, Priya's guests fell silent as she arrived through a tunnel of hanging jasmine and soft candlelight.",
    ],
  },
  {
    couple: "Meera & Rohit",
    date: "January 2024",
    location: "Goa",
    theme: "Coastal Elegance",
    color: "White, Coral & Sea Green",
    story: [
      "Meera and Rohit wanted their wedding to feel like the most beautiful version of a Goa sunset — warm, unhurried, and bathed in that particular quality of coastal light that cannot be manufactured.",
      "The ceremony was held on the cliffs above the sea, the reception in a colonial Portuguese house transformed by thousands of white florals, rattan lanterns, and the scent of sea air mixed with jasmine. Every photograph from this wedding looks like it belongs in a magazine.",
    ],
  },
  {
    couple: "Ananya & Vikram",
    date: "November 2023",
    location: "Jaipur Palace",
    theme: "Mughal Garden",
    color: "Sage, Ivory & Antique Gold",
    story: [
      "Ananya and Vikram were drawn to the idea of a garden — not a decorative garden, but an immersive living environment where every surface told a story. We created a Mughal-inspired paradise: geometric planting beds of white roses and herbs, water channels of rose petals, and a marble mandap of breathtaking intricacy.",
      "The reception was held in a courtyard where hundreds of brass lanterns cast warm geometric shadows across whitewashed walls. It was, as one guest said, 'like a dream you've never had before, but one you'll remember forever.'",
    ],
  },
];

export default function WeddingStories() {
  const { getSlotImage } = useSiteContent();

  const images = [
    getSlotImage("gallery", "gallery_grid_1", "/images/royal_mandap.webp", "Royal Mandap Story").url,
    getSlotImage("gallery", "gallery_grid_2", "/images/coastal_wedding.webp", "Coastal Wedding Story").url,
    getSlotImage("gallery", "gallery_grid_3", "/images/mughal_garden.webp", "Mughal Garden Story").url,
    getSlotImage("gallery", "gallery_grid_4", "/images/floral_stage.webp", "Floral Stage Story").url,
    getSlotImage("gallery", "gallery_grid_5", "/images/bridal_entry.webp", "Bridal Entry Story").url,
    getSlotImage("gallery", "gallery_grid_6", "/images/engagement_decor.webp", "Engagement Decor Story").url,
    getSlotImage("gallery", "gallery_grid_7", "/images/grand_reception.webp", "Grand Reception Story").url,
    getSlotImage("gallery", "gallery_grid_8", "/images/floral_detail.webp", "Floral Detail Story").url,
  ];

  return (
    <div className="bg-background text-foreground">
      <SEO
        title="Real Wedding Stories"
        description="Read the real wedding stories of couples who celebrated their love with Alankaran's luxury planning and styling."
      />
      {/* Hero */}
      <section className="relative h-[65vh] flex items-end pb-20 overflow-hidden">
        <div className="absolute inset-0 z-0" style={{ backgroundImage: `url(${images[0]})`, backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(0.85) saturate(1.0)" }} />
        <div className="absolute inset-0 z-10" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.25) 60%, rgba(0,0,0,0.4) 100%)" }} />
        <div className="relative max-w-screen-xl mx-auto px-6 lg:px-12 z-20">
          <m.p className="section-label mb-4 text-gold" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Real Weddings</m.p>
          <m.h1 className="text-display text-5xl lg:text-8xl text-white" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 1 }}>
            Celebrations<br />That Live <em className="not-italic text-gold-gradient">Forever</em>
          </m.h1>
        </div>
      </section>

      {/* Stories */}
      <div className="max-w-screen-xl mx-auto px-6 lg:px-12">
        {stories.map((s, i) => (
          <article key={s.couple} className="py-24 border-b border-border/40">
            {/* Header */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mb-12">
              <div>
                <p className="section-label mb-4 text-gold">{s.date} — {s.location}</p>
                <h2 className="text-display text-4xl lg:text-6xl mb-4 text-foreground">
                  <m.span
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9 }}
                  >
                    {s.couple}
                  </m.span>
                </h2>
                <div className="flex gap-4 mt-8">
                  <div>
                    <p className="section-label mb-1 text-gold/80">Theme</p>
                    <p className="font-sans text-sm font-light text-muted-foreground">{s.theme}</p>
                  </div>
                  <div className="w-px bg-gold/20" />
                  <div>
                    <p className="section-label mb-1 text-gold/80">Palette</p>
                    <p className="font-sans text-sm font-light text-muted-foreground">{s.color}</p>
                  </div>
                </div>
              </div>
              <div className="overflow-hidden group glass-card">
                <div className="aspect-[16/9] transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: `url(${images[i % images.length]})`, backgroundSize: "cover", backgroundPosition: "center" }} />
              </div>
            </div>

            {/* Story text */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              {s.story.map((para, j) => (
                <p key={j} className="text-body text-sm">
                  {para}
                </p>
              ))}
            </div>

            {/* Image grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 overflow-hidden group">
                <div className="w-full h-full aspect-[16/9] transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: `url(${images[(i + 1) % images.length]})`, backgroundSize: "cover", backgroundPosition: "center" }} />
              </div>
              <div className="space-y-3 flex flex-col">
                <div className="overflow-hidden group flex-1">
                  <div className="w-full h-full min-h-[150px] transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: `url(${images[(i + 2) % images.length]})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                </div>
                <div className="overflow-hidden group flex-1">
                  <div className="w-full h-full min-h-[150px] transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: `url(${images[i % images.length]})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                </div>
              </div>
            </div>
          </article>
        ))}

      </div>

      <Footer />
    </div>
  );
}
