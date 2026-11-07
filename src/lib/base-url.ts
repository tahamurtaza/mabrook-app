import { headers } from "next/headers";

/**
 * The origin this request came in on, e.g. `https://mabrook.up.railway.app`.
 *
 * Taken from the request rather than a configured base URL so invite links are
 * right on localhost, on a Railway preview and on a custom domain with nothing
 * to set. Railway terminates TLS at the edge, so the scheme comes from
 * `x-forwarded-proto` — `req.protocol` would always say http.
 */
export async function getBaseUrl(): Promise<string> {
  const headerList = await headers();

  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) return "";

  const proto =
    headerList.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");

  return `${proto}://${host}`;
}
