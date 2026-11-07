"use client";

import { useState } from "react";
import { setTheme } from "@/app/actions/settings";
import type { Theme } from "@/lib/theme";

const OPTIONS: { value: Theme; title: string; hint: string; swatch: string }[] = [
  { value: "light", title: "Light", hint: "Warm paper", swatch: "#f7f4ee" },
  { value: "dark", title: "Dark", hint: "Easier at night", swatch: "#14120f" },
  {
    value: "auto",
    title: "Auto",
    hint: "Follows your device",
    swatch: "linear-gradient(135deg, #f7f4ee 50%, #14120f 50%)",
  },
];

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

/** Switches straight away, then remembers the choice for the next visit. */
export function ThemeChoice({ current }: { current: Theme }) {
  const [theme, setChoice] = useState(current);

  function choose(next: Theme) {
    setChoice(next);
    applyTheme(next);
    setTheme(next);
  }

  return (
    <fieldset>
      <legend className="sr-only">Theme</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-3 transition-colors ${
              theme === option.value ? "border-ink bg-surface" : "border-line hover:border-line-strong"
            }`}
          >
            <input
              type="radio"
              name="theme"
              value={option.value}
              checked={theme === option.value}
              onChange={() => choose(option.value)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className="size-7 shrink-0 rounded-full border border-line-strong"
              style={{ background: option.swatch }}
            />
            <span>
              <span className="block text-sm font-medium text-ink">{option.title}</span>
              <span className="block text-xs text-muted">{option.hint}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
