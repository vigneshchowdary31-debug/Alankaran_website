import fs from 'fs';

const content = fs.readFileSync('src/pages/Home.tsx', 'utf8');

// Find the split point
const splitPoint = content.indexOf('{/* ─── LUXURY SHOWCASE ─── */}');

const importsAndVars = content.slice(0, content.indexOf('export default function Home() {'));
const homeComponent = content.slice(content.indexOf('export default function Home() {'), splitPoint);
const belowFoldJSX = content.slice(splitPoint, content.lastIndexOf('</div>'));
const closingTags = content.slice(content.lastIndexOf('</div>'));

// We need to keep some imports in Home, and some in HomeBelowFold
const homeBelowFoldContent = `
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import Footer from "@/components/Footer";

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

fs.writeFileSync('src/pages/HomeBelowFold.tsx', homeBelowFoldContent);

// Remove the extracted parts from Home.tsx
const newHomeImports = importsAndVars
  .replace(/const services = \[[\s\S]*?\];/g, '')
  .replace(/const themes = \[[\s\S]*?\];/g, '')
  .replace(/const stories = \[[\s\S]*?\];/g, '')
  .replace(/const testimonials = \[[\s\S]*?\];/g, '')
  .replace(/function WeddingImage[\s\S]*?return \([\s\S]*?\);\n}/g, '')
  .replace(/const images = \[[\s\S]*?\];/g, '')
  .replace(/const LAZY = "lazy" as const;/g, '')
  .replace(/const EAGER = "eager" as const;/g, '')
  .replace(/const videos = \[[\s\S]*?\];/g, '')
  .replace(/const DecorCanvas = lazy\(\(\) => import\("@\/components\/DecorCanvas"\)\);/g, '');

const newHomeContent = `
${newHomeImports}

const HomeBelowFold = lazy(() => import("./HomeBelowFold"));

${homeComponent}
      <Suspense fallback={null}>
        <HomeBelowFold pulseHighlight={pulseHighlight} />
      </Suspense>
    </div>
  );
}
`;

fs.writeFileSync('src/pages/Home.tsx', newHomeContent);
