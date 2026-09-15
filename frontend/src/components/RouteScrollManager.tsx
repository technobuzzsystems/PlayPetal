"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function RouteScrollManager() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isPopStateRef = useRef(false);
  const isInitialMountRef = useRef(true);

  // Configure history scroll restoration and listen for browser Back/Forward (popstate)
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const handlePopState = () => {
      isPopStateRef.current = true;
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Handle scroll position on initial load / refresh and route changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Initial mount (page load or F5 refresh)
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;

      // If URL has an anchor hash, let hash navigation take priority
      if (window.location.hash) {
        const targetId = window.location.hash.replace("#", "");
        const element = document.getElementById(targetId) || document.querySelector(window.location.hash);
        if (element) {
          setTimeout(() => {
            element.scrollIntoView({ behavior: "smooth" });
          }, 100);
          return;
        }
      }

      // Otherwise force page load / refresh to open at top (0, 0)
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
      return;
    }

    // 2. Browser Back / Forward navigation (popstate)
    if (isPopStateRef.current) {
      isPopStateRef.current = false;
      return;
    }

    // 3. Anchor / Hash Navigation
    if (window.location.hash) {
      const targetId = window.location.hash.replace("#", "");
      const element = document.getElementById(targetId) || document.querySelector(window.location.hash);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }

    // 4. Normal new route navigation -> scroll to top (0, 0)
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, searchParams]);

  return null;
}
