"use client";

import { useEffect, useState } from "react";

/**
 * Shows the full invite URL with a copy button.
 *
 * The origin is read on the client rather than from a configured base URL, so
 * the link is right on localhost, on a Railway preview and on a custom domain
 * without anything to set.
 */
export function InviteLink({ token }: { token: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  const url = origin ? `${origin}/invite/${token}` : `/invite/${token}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the input below is selectable as a fallback.
    }
  }

  return (
    <div className="flex gap-2">
      <input
        readOnly
        value={url}
        onFocus={(event) => event.currentTarget.select()}
        className="min-w-0 flex-1 rounded-lg border border-line bg-sunken px-2.5 py-1.5 font-mono text-xs text-muted outline-none"
        aria-label="Invite link"
      />
      <button
        type="button"
        onClick={copy}
        className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-sunken"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
