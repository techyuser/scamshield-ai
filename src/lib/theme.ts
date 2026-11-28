"use client";

import { ScamShieldBridge } from "@/plugins/scamshield-bridge";

export type AppThemeMode = "dark" | "light" | "system";

export interface ThemeTransitionOrigin {
  x?: number;
  y?: number;
}

export interface ThemeTransitionOptions {
  animate?: boolean;
  origin?: ThemeTransitionOrigin;
  /** Runs synchronously inside the View Transition DOM swap (e.g. React flushSync). */
  onBeforeCommit?: () => void;
  /** Runs after the crossfade completes so storage/bridge writes never contend with animation frames. */
  onAfterTransition?: () => void;
}

export function resolveIsLightTheme(mode: AppThemeMode): boolean {
  if (mode === "light") return true;
  if (mode === "dark") return false;
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: light)").matches;
  }
  return false;
}

function setThemeDomClasses(isLight: boolean): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("theme-light", isLight);
  root.classList.toggle("dark", !isLight);
}

export function applyAppTheme(
  mode: AppThemeMode,
  options?: ThemeTransitionOptions
): boolean {
  const isLight = resolveIsLightTheme(mode);
  const animate = options?.animate ?? false;

  const syncNativeBars = () => {
    void ScamShieldBridge.setAppTheme({ theme: mode }).catch(() => {});
  };

  if (typeof document !== "undefined") {
    const root = document.documentElement;
    const currentlyLight = root.classList.contains("theme-light");
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    const docWithVT = document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> };
    };

    if (animate && !reducedMotion && currentlyLight !== isLight && typeof docWithVT.startViewTransition === "function") {
      // Unhurried 420ms GPU-composited opacity crossfade on ::view-transition-new(root):
      // avoids jarring 220ms flash and defers storage/config writes until finished.
      const transition = docWithVT.startViewTransition(() => {
        options?.onBeforeCommit?.();
        setThemeDomClasses(isLight);
      });

      transition.ready
        .then(() => {
          document.documentElement.animate(
            { opacity: [0, 1] },
            {
              duration: 420,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              pseudoElement: "::view-transition-new(root)",
            }
          );
          syncNativeBars();
        })
        .catch(() => {
          syncNativeBars();
        });

      if (options?.onAfterTransition) {
        transition.finished.then(options.onAfterTransition, options.onAfterTransition);
      }
      return isLight;
    }

    if (animate && !reducedMotion && currentlyLight !== isLight) {
      root.classList.add("theme-transitioning");
      options?.onBeforeCommit?.();
      setThemeDomClasses(isLight);
      setTimeout(() => {
        root.classList.remove("theme-transitioning");
        options?.onAfterTransition?.();
      }, 400);
      setTimeout(syncNativeBars, 120);
      return isLight;
    }

    options?.onBeforeCommit?.();
    setThemeDomClasses(isLight);
    options?.onAfterTransition?.();
  }

  syncNativeBars();
  return isLight;
}
