"use client";

import { Moon, Sun, SunMoon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

const THEMES = ["light", "dark", "system"] as const;
type Theme = (typeof THEMES)[number];

function getNextTheme(current: string | undefined): Theme {
  const idx = THEMES.indexOf((current as Theme) ?? "system");
  return THEMES[(idx + 1) % THEMES.length] ?? "light";
}

function ThemeIcon({
  theme,
}: {
  theme: string | undefined;
}): React.JSX.Element {
  if (theme === "dark") return <Moon className="h-4 w-4" />;
  if (theme === "light") return <Sun className="h-4 w-4" />;
  return <SunMoon className="h-4 w-4" />;
}

export function ThemeToggle(): React.JSX.Element {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="fixed bottom-5 right-5 z-50 h-10 w-10 rounded-full" />
    );
  }

  const label =
    theme === "dark"
      ? "Dark mode"
      : theme === "light"
        ? "Light mode"
        : "System theme";

  return (
    <Button
      aria-label={`Current theme: ${label}. Click to switch.`}
      title={`Theme: ${label}`}
      onClick={() => setTheme(getNextTheme(theme))}
      variant="secondary"
      size="icon"
      className="fixed bottom-5 right-5 z-50 rounded-full border-white/60 bg-white/80 text-slate-700 shadow-lg shadow-slate-400/30 backdrop-blur-md transition-all duration-200 hover:scale-110 hover:shadow-xl hover:shadow-slate-400/40 active:scale-95 dark:border-white/10 dark:bg-slate-800/85 dark:text-slate-300 dark:shadow-black/30 dark:hover:bg-slate-700/90 dark:hover:shadow-black/40"
    >
      <ThemeIcon theme={theme} />
    </Button>
  );
}
