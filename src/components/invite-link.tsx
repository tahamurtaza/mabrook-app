"use client";

import { useState } from "react";

/** Shows the full invite URL with a copy button. */
export function InviteLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be blocked; the input below is still selectable.
    }
  }

  return (
    <div className="flex overflow-hidden rounded-lg border border-line bg-surface">
      <input
        readOnly
        value={url}
        onFocus={(event) => event.currentTarget.select()}
        className="min-w-0 flex-1 bg-transparent px-2.5 py-1.5 font-mono text-xs text-muted outline-none"
        aria-label="Invite link"
      />
      <button
        type="button"
        onClick={copy}
        className={`shrink-0 border-l border-line px-3 py-1.5 text-xs font-medium transition-colors hover:bg-sunken ${
          copied ? "text-hijri" : "text-ink"
        }`}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
