import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Map hex colors to HSL values for light and dark themes
const COLOR_THEMES: Record<string, { light: Record<string, string>; dark: Record<string, string> }> = {
  "#4C6FFF": {
    // Default blue - no overrides needed
    light: {},
    dark: {},
  },
  "#E53E3E": {
    light: {
      "--primary": "0 72% 51%",
      "--primary-hover": "0 72% 58%",
      "--primary-light": "0 72% 92%",
      "--ring": "0 72% 51%",
      "--sidebar-primary": "0 72% 51%",
      "--sidebar-ring": "0 72% 51%",
    },
    dark: {
      "--primary": "0 72% 60%",
      "--primary-hover": "0 72% 67%",
      "--primary-light": "0 72% 15%",
      "--ring": "0 72% 60%",
      "--sidebar-primary": "0 72% 60%",
      "--sidebar-ring": "0 72% 60%",
    },
  },
  "#38A169": {
    light: {
      "--primary": "145 51% 43%",
      "--primary-hover": "145 51% 50%",
      "--primary-light": "145 51% 92%",
      "--ring": "145 51% 43%",
      "--sidebar-primary": "145 51% 43%",
      "--sidebar-ring": "145 51% 43%",
    },
    dark: {
      "--primary": "145 51% 52%",
      "--primary-hover": "145 51% 59%",
      "--primary-light": "145 51% 15%",
      "--ring": "145 51% 52%",
      "--sidebar-primary": "145 51% 52%",
      "--sidebar-ring": "145 51% 52%",
    },
  },
  "#D69E2E": {
    light: {
      "--primary": "38 74% 51%",
      "--primary-hover": "38 74% 58%",
      "--primary-light": "38 74% 92%",
      "--ring": "38 74% 51%",
      "--sidebar-primary": "38 74% 51%",
      "--sidebar-ring": "38 74% 51%",
    },
    dark: {
      "--primary": "38 74% 55%",
      "--primary-hover": "38 74% 62%",
      "--primary-light": "38 74% 15%",
      "--ring": "38 74% 55%",
      "--sidebar-primary": "38 74% 55%",
      "--sidebar-ring": "38 74% 55%",
    },
  },
};

export function useSystemColor() {
  useEffect(() => {
    let cancelled = false;

    const applyColor = (colorHex: string) => {
      const theme = COLOR_THEMES[colorHex];
      const root = document.documentElement;
      const isDark = root.classList.contains("dark");
      const vars = theme ? (isDark ? theme.dark : theme.light) : {};

      // Reset all custom properties first (remove previous overrides)
      const allVars = ["--primary", "--primary-hover", "--primary-light", "--ring", "--sidebar-primary", "--sidebar-ring"];
      allVars.forEach((v) => root.style.removeProperty(v));

      // Apply new overrides
      Object.entries(vars).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
    };

    const fetchAndApply = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data } = await supabase
        .from("store_settings")
        .select("primary_color")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!cancelled && data?.primary_color) {
        applyColor(data.primary_color);
      }
    };

    fetchAndApply();

    // Listen for settings updates
    const handler = () => fetchAndApply();
    window.addEventListener("store-settings-updated", handler);

    // Listen for theme changes to re-apply
    const observer = new MutationObserver(() => fetchAndApply());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      cancelled = true;
      window.removeEventListener("store-settings-updated", handler);
      observer.disconnect();
      // Clean up
      const allVars = ["--primary", "--primary-hover", "--primary-light", "--ring", "--sidebar-primary", "--sidebar-ring"];
      allVars.forEach((v) => document.documentElement.style.removeProperty(v));
    };
  }, []);
}
