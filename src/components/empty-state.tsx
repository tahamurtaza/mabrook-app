import Link from "next/link";
import { Mark } from "./icons";

/**
 * What a page shows when it has nothing in it.
 *
 * Every empty state says what would be here, why, and offers the one action
 * that fills it — a dead end with just "no results" leaves people stuck.
 */
export function EmptyState({
  emoji,
  title,
  body,
  action,
}: {
  emoji?: string;
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      {emoji ? (
        <p className="text-4xl" aria-hidden="true">
          {emoji}
        </p>
      ) : (
        <Mark className="size-10" />
      )}
      <h2 className="font-display mt-5 text-2xl font-medium text-ink">{title}</h2>
      <p className="mt-2 text-[0.95rem] text-muted">{body}</p>
      {action && (
        <Link
          href={action.href}
          className="mt-6 inline-block rounded-lg bg-action px-4 py-2.5 text-sm font-medium text-action-text transition-colors hover:bg-action-hover"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
