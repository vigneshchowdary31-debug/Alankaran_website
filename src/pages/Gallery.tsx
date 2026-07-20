import { useState, useMemo } from "react";
import { m, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useSiteContent } from "@/providers/SiteContentProvider";
import { BUNDLED_GALLERY_FALLBACKS, DEFAULT_GALLERY_CATEGORY } from "@/domains/cms/constants";

interface GalleryTile {
  id: string;
  cat: string;
  image: string;
  label: string;
}

export default function Gallery() {
  const { getGalleryImages } = useSiteContent();

  // Phase A Task 1: the grid renders the CMS gallery collection ordered by `order` — exactly the data
  // the Gallery Manager writes. Fixed `gallery_grid_N` slot names are gone. The bundled set renders
  // only while the CMS gallery is empty.
  const cmsImages = getGalleryImages();

  const galleryItems: GalleryTile[] = useMemo(() => {
    if (cmsImages.length > 0) {
      return cmsImages.map((img) => ({
        id: img.slotName,
        cat: img.category || DEFAULT_GALLERY_CATEGORY,
        image: img.url,
        label: img.caption || img.altText,
      }));
    }
    return BUNDLED_GALLERY_FALLBACKS.map((item, idx) => ({
      id: `fallback_${idx}`,
      cat: item.category,
      image: item.url,
      label: item.label,
    }));
  }, [cmsImages]);

  // Filters follow the content, so an admin-assigned category always has a matching filter.
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(galleryItems.map((g) => g.cat)))],
    [galleryItems]
  );

  // The hero leads with the first published gallery image, so it follows the CMS ordering too.
  const heroImage = galleryItems[0]?.image || "/images/floral_stage.webp";

  const [activeCategory, setActiveCategory] = useState("All");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filtered = activeCategory === "All"
    ? galleryItems
    : galleryItems.filter((g) => g.cat === activeCategory);

  const openLightbox = (idx: number) => setLightboxIndex(idx);
  const closeLightbox = () => setLightboxIndex(null);
  const prevImage = () => setLightboxIndex((i) => (i !== null ? (i - 1 + filtered.length) % filtered.length : null));
  const nextImage = () => setLightboxIndex((i) => (i !== null ? (i + 1) % filtered.length : null));

  return (
    <div className="bg-background text-foreground">
      <SEO
        title="Portfolio & Gallery"
        description="A visual anthology of Alankaran's luxury wedding design, featuring mandaps, floral styling, reception decor, and bridal entries."
      />
      {/* Hero */}
      <section className="relative h-[55vh] flex items-end pb-20 overflow-hidden">
        <div className="absolute inset-0 z-0" style={{ backgroundImage: `url(${heroImage})`, backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(0.85) saturate(1.0)" }} />
        <div className="absolute inset-0 z-10" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.25) 60%, rgba(0,0,0,0.4) 100%)" }} />
        <div className="relative max-w-screen-xl mx-auto px-6 lg:px-12 z-20">
          <m.p className="section-label mb-4 text-gold" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Portfolio</m.p>
          <m.h1 className="text-display text-5xl lg:text-8xl text-white" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 1 }}>
            A Visual <em className="not-italic text-gold-gradient">Anthology</em>
          </m.h1>
        </div>
      </section>

      <div className="max-w-screen-xl mx-auto px-6 lg:px-12 py-12">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-12">
          {categories.map((cat) => (
            <m.button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 border section-label transition-colors hover:border-gold/60 ${activeCategory === cat ? "border-gold bg-gold text-background" : "border-gold/20 text-muted-foreground hover:text-gold"}`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              data-testid={`filter-${cat.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {cat}
            </m.button>
          ))}
        </div>

        {/* Masonry Grid */}
        <AnimatePresence mode="wait">
          <m.div
            key={activeCategory}
            className="columns-2 md:columns-3 lg:columns-4 gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {filtered.map((item, idx) => (
              <m.div
                key={item.id}
                className="break-inside-avoid mb-3 cursor-pointer overflow-hidden group"
                style={{ backgroundImage: `url(${item.image})`, backgroundSize: "cover", backgroundPosition: "center", aspectRatio: idx % 3 === 0 ? "3/4" : idx % 3 === 1 ? "1/1" : "4/5" }}
                onClick={() => openLightbox(idx)}
                whileHover={{ scale: 1.02 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.5 }}
                data-testid={`gallery-item-${item.id}`}
              >
                <div className="w-full h-full relative border border-transparent group-hover:border-gold/50 transition-colors duration-500">
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-4 bg-gradient-to-t from-black via-black/50 to-transparent"
                  >
                    <p className="text-body text-[11px] text-gold">{item.label}</p>
                  </div>
                </div>
              </m.div>
            ))}
          </m.div>
        </AnimatePresence>

      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <m.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(5, 5, 5, 0.98)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeLightbox}
          >
            <div className="relative max-w-4xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <m.div
                className="aspect-[4/3] w-full"
                style={{ backgroundImage: `url(${filtered[lightboxIndex]?.image})`, backgroundSize: "cover", backgroundPosition: "center" }}
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
              />
              <p className="text-body text-xs text-white/70 mt-3 text-center">
                {filtered[lightboxIndex]?.label}
              </p>
              <button aria-label="Close lightbox" className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={closeLightbox} data-testid="btn-lightbox-close">
                <X className="w-8 h-8" />
              </button>
              <button aria-label="Previous image" className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white" onClick={prevImage} data-testid="btn-lightbox-prev">
                <ChevronLeft className="w-12 h-12" />
              </button>
              <button aria-label="Next image" className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white" onClick={nextImage} data-testid="btn-lightbox-next">
                <ChevronRight className="w-12 h-12" />
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
