import { useState, useEffect } from "react";
import { useLocation } from "wouter";

let hasInteractedGlobally = false;

export function useCTAVisibility(delay = 1200) {
  const [location] = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(hasInteractedGlobally);

  useEffect(() => {
    if (hasInteractedGlobally) {
      setHasInteracted(true);
      return;
    }

    let timer: ReturnType<typeof setTimeout>;
    const activate = () => {
      hasInteractedGlobally = true;
      setHasInteracted(true);
      window.removeEventListener("scroll", activate);
      window.removeEventListener("touchstart", activate);
      clearTimeout(timer);
    };

    window.addEventListener("scroll", activate, { once: true, passive: true });
    window.addEventListener("touchstart", activate, { once: true, passive: true });
    timer = setTimeout(activate, 4000);

    return () => {
      window.removeEventListener("scroll", activate);
      window.removeEventListener("touchstart", activate);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    setIsVisible(false);

    if (!hasInteracted) return;

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [location, hasInteracted, delay]);

  return isVisible;
}
