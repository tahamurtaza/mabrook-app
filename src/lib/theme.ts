import { cookies } from "next/headers";

/**
 * The colour theme, kept in a cookie rather than on the account: a phone and a
 * laptop can reasonably want different ones, and it has to be known while the
 * page is rendered, so a dark page never flashes light first.
 */
export const THEMES = ["light", "dark", "auto"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_COOKIE = "mabrook_theme";

export async function getTheme(): Promise<Theme> {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  return THEMES.find((theme) => theme === value) ?? "auto";
}
