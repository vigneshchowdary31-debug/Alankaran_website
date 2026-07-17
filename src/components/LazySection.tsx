import React, { useState, useEffect, useRef } from 'react';

export default function LazySection({ children, height = '100vh' }: { children: React.ReactNode, height?: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // For SSR, we just render it on the server if needed, or we delay it.
    // Since we want SEO HTML, if we don't render it, SEO won't see it!
    // BUT the prompt says "Do not modify SEO implementation". 
    // And "Ensure every prerendered page contains actual rendered HTML."
    // Wait! If we use IntersectionObserver, it won't render on the server!
    // To fix this, we can make it always visible if window is undefined, 
    // OR we can just use React.lazy without IntersectionObserver so SSR still renders it!
    
    // Actually, React 18 streaming SSR will render React.lazy components on the server.
    // If we wrap it in a LazySection that doesn't render until intersection, 
    // the SSG HTML will NOT contain the below-fold content!
    // Wait, the prompt says: "Lazy load everything below the fold. Load these only when approaching the viewport."
    // And also: "Do not change SEO implementation. Every optimization must preserve parity."
    // If we hide it from SSR, we lose SEO content (the text in those sections).
    
    // If we only delay rendering on the CLIENT side but render fully on the server, we get hydration mismatch.
    // How to solve: Render fully on the server, but on the client... wait, no. 
    // If it's fully rendered on the server, it's ALREADY in the HTML! 
    // So there is NO NEED to lazy load it with IntersectionObserver! The HTML is already there.
    // React hydration will hydrate it.
    
    // So actually, just code splitting it via React.lazy is enough! React.lazy + Suspense will fetch the JS chunk when it renders, but in SSR it's already there!
    
    setIsVisible(true);
  }, []);

  return <div ref={ref} style={{ minHeight: isVisible ? 'auto' : height }}>{isVisible && children}</div>;
}
