/**
 * Where to send someone after signing in.
 *
 * Only same-site paths are honoured. `//evil.example`, `https://evil.example`
 * and `\\evil.example` are all rejected, so an invite-shaped link can't bounce
 * someone off-site with a Mabrook URL in the address bar.
 */
export function safeNext(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || value.length === 0) return fallback;

  // Must be a root-relative path, and not a protocol-relative or UNC-style one.
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;

  return value;
}
