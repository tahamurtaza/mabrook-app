"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { completeTour } from "@/app/actions/auth";

/**
 * The first-run guide: a small pop-up that walks a new account through the
 * app, pointing at the real button for each feature.
 *
 * Each step names a `data-tour` target rather than an element, because the same
 * feature is a different element at different widths — a header link on a
 * laptop, a tab-bar button on a phone. Whichever copy is actually on screen
 * gets pointed at.
 */
const STEPS = [
  {
    target: "upcoming",
    title: "See what's coming up",
    body: "Every birthday and anniversary, soonest first, with its English and Hijri date side by side. Tap a row to see everything about it.",
  },
  {
    target: "calendar",
    title: "Two calendars, one view",
    body: "Browse by Gregorian or Hijri month, or the whole year. Tap any day to see both dates and what's on.",
  },
  {
    target: "groups",
    title: "Start or join a group",
    body: "Occasions live in groups: a family, a circle of friends, a school year. Start one here and invite people with a link.",
  },
  {
    target: "add",
    title: "Add an occasion",
    body: "Enter the date in whichever calendar you know it in, and the other is worked out for you. Share it with as many of your groups as you like.",
  },
  {
    target: "people",
    title: "Everyone in one place",
    body: "Find anyone in your groups, and see when each of their occasions next comes round.",
  },
  {
    target: "today",
    title: "Today, in both calendars",
    body: "Today's date stays up here on every page. Amber is always Gregorian and teal is always Hijri, so any date in the app reads at a glance.",
  },
] as const;

const REPLAY_EVENT = "mabrook:tour";
const GAP = 12;
const EDGE = 12;
const WIDTH = 320;

/** The copy of a target that's visible now; hidden copies have no layout box. */
function findTarget(name: string): DOMRect | null {
  for (const element of document.querySelectorAll(`[data-tour="${name}"]`)) {
    if (element.getClientRects().length > 0) return element.getBoundingClientRect();
  }
  return null;
}

export function Tour({ pending }: { pending: boolean }) {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const primary = useRef<HTMLButtonElement>(null);

  // Someone adding their dates or joining by invite is mid-way through
  // something; let them finish first.
  const busy =
    pathname.startsWith("/invite") ||
    pathname.startsWith("/welcome") ||
    pathname.endsWith("/claim");
  const active = replaying || (pending && !dismissed && !busy);
  const current = STEPS[step];

  useEffect(() => {
    function replay() {
      setStep(0);
      setReplaying(true);
    }
    window.addEventListener(REPLAY_EVENT, replay);
    return () => window.removeEventListener(REPLAY_EVENT, replay);
  }, []);

  function finish() {
    setDismissed(true);
    setReplaying(false);
    setStep(0);
    setRect(null);
    // Worst case a failed save shows the guide once more; it isn't worth an error.
    if (pending) completeTour().catch(() => {});
  }

  // Follow the target through scrolling and resizing.
  useEffect(() => {
    if (!active) return;

    const measure = () => setRect(findTarget(current.target));
    const frame = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, current.target]);

  useEffect(() => {
    if (!active) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") finish();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // Keep the keyboard with the pop-up as it moves from step to step.
  const shown = active && rect !== null;
  useEffect(() => {
    if (shown) primary.current?.focus({ preventScroll: true });
  }, [shown, step]);

  if (!shown) return null;

  const viewport = document.documentElement;
  const width = Math.min(WIDTH, viewport.clientWidth - EDGE * 2);
  const centre = rect.left + rect.width / 2;
  const left = Math.min(
    Math.max(EDGE, centre - width / 2),
    viewport.clientWidth - width - EDGE,
  );
  // Open towards the middle of the screen, so a tab-bar target points upwards.
  const below = rect.top + rect.height / 2 < viewport.clientHeight / 2;
  const last = step === STEPS.length - 1;
  // Header links fill the bar, so keep the ring inside the screen.
  const ringTop = Math.max(2, rect.top - 4);
  const ringBottom = rect.bottom + 4;

  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none fixed z-[45] rounded-lg ring-2 ring-action shadow-[0_0_0_9999px_rgb(0_0_0/0.32)] transition-all duration-200"
        style={{ top: ringTop, left: rect.left - 6, width: rect.width + 12, height: ringBottom - ringTop }}
      />

      <div
        role="dialog"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        className="fixed z-50 rounded-xl border border-line bg-surface p-4 shadow-float"
        style={{
          left,
          width,
          ...(below
            ? { top: rect.bottom + GAP }
            : { bottom: viewport.clientHeight - rect.top + GAP }),
        }}
      >
        <span
          aria-hidden="true"
          className={`absolute size-3 rotate-45 border-line bg-surface ${
            below ? "-top-[7px] border-t border-l" : "-bottom-[7px] border-r border-b"
          }`}
          style={{ left: Math.min(Math.max(14, centre - left - 6), width - 26) }}
        />

        <p className="eyebrow text-faint">
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 id="tour-title" className="font-display mt-1 text-lg leading-snug font-medium text-ink">
          {current.title}
        </h2>
        <p id="tour-body" className="mt-1 text-sm leading-relaxed text-muted">
          {current.body}
        </p>

        <div className="mt-3.5 flex items-center gap-2">
          <span aria-hidden="true" className="flex gap-1">
            {STEPS.map((candidate, index) => (
              <span
                key={candidate.target}
                className={`size-1.5 rounded-full ${index === step ? "bg-ink" : "bg-line-strong"}`}
              />
            ))}
          </span>

          <span className="ml-auto flex items-center gap-1">
            {!last && (
              <button
                type="button"
                onClick={finish}
                className="rounded-md px-2 py-1.5 text-sm text-faint transition-colors hover:text-ink"
              >
                Skip
              </button>
            )}
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="rounded-md px-2 py-1.5 text-sm text-muted transition-colors hover:text-ink"
              >
                Back
              </button>
            )}
            <button
              ref={primary}
              type="button"
              onClick={() => (last ? finish() : setStep(step + 1))}
              className="rounded-lg bg-action px-3 py-1.5 text-sm font-medium text-action-text transition-colors hover:bg-action-hover"
            >
              {last ? "Done" : "Next"}
            </button>
          </span>
        </div>
      </div>
    </>
  );
}

/** Lets anyone see the guide again, from the footer. */
export function TourButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(REPLAY_EVENT))}
      className="underline underline-offset-2 transition-colors hover:text-ink"
    >
      Take the tour
    </button>
  );
}
