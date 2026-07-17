import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT || "3000";
const port = Number(rawPort);

const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  publicDir: path.resolve(import.meta.dirname, "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    // ── Target modern browsers → smaller output, no legacy polyfills ──
    target: ["es2020", "chrome87", "firefox78", "safari14"],
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // ── Fine-grained code splitting: each lazy chunk is only
        //    downloaded when that feature is actually needed ──
        manualChunks(id) {
          // Three.js + R3F: ~600KB — only loads when HeroCanvas/DecorCanvas mount
          if (id.includes("node_modules/three") || id.includes("node_modules/@react-three")) {
            return "three-vendor";
          }
          // GSAP + ScrollTrigger: only loads on scroll events
          if (id.includes("node_modules/gsap")) {
            return "gsap-vendor";
          }
          // Framer Motion: loads with first animated component
          if (id.includes("node_modules/framer-motion")) {
            return "framer-motion-vendor";
          }
          // Lenis smooth scroll: loads after hydration
          if (id.includes("node_modules/lenis")) {
            return "lenis-vendor";
          }
          // Wouter router: tiny but keeps it isolated
          if (id.includes("node_modules/wouter")) {
            return "router-vendor";
          }
          // Icons and UI utilities
          if (id.includes("node_modules/lucide-react") || id.includes("node_modules/react-icons")) {
            return "icons-vendor";
          }
          // All other node_modules → shared vendor chunk
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
        // Content-hash filenames → immutable CDN/browser caching
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
      // ── Tree-shake: these pure side-effect-free packages are safe ──
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
