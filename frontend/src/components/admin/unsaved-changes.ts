"use client";
import { useEffect } from "react";

/** Protect browser exits and ordinary in-app navigation without changing save requests. */
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const navigate = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download") || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      const destination = new URL(link.href, window.location.href);
      if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;
      if (!window.confirm("Discard unsaved changes and leave this editor?")) { event.preventDefault(); event.stopPropagation(); }
    };
    const leave = (event: Event) => { if (!window.confirm("Discard unsaved changes and log out?")) event.preventDefault(); };
    document.addEventListener("admin:before-logout", leave);
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => { document.removeEventListener("admin:before-logout", leave); window.removeEventListener("beforeunload", unload); document.removeEventListener("click", navigate, true); };
  }, [dirty]);
}
