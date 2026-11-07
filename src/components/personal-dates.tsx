import { deletePersonalDate } from "@/app/actions/personal-dates";
import type { PersonalDate } from "@/generated/prisma";
import { EVENT_TYPE_EMOJI, personalDateLabel } from "@/lib/occasions/labels";
import { ConfirmSubmit } from "./confirm-submit";
import { DualDate } from "./occasions";

/** One of someone's own dates, as a label and both calendars. */
export function PersonalDateSummary({ date }: { date: PersonalDate }) {
  return (
    <span className="flex min-w-0 items-start gap-2.5">
      <span aria-hidden="true" className="text-[0.95rem]">
        {EVENT_TYPE_EMOJI[date.type]}
      </span>
      <span className="min-w-0">
        <span className="block font-medium text-ink">{personalDateLabel(date)}</span>
        <span className="mt-0.5 block text-xs">
          <DualDate
            gregorian={{
              year: date.gregorianYear,
              month: date.gregorianMonth,
              day: date.gregorianDay,
            }}
            hijri={{ year: date.hijriYear, month: date.hijriMonth, day: date.hijriDay }}
            anchor={date.observedCalendar}
          />
        </span>
      </span>
    </span>
  );
}

export function DeleteDateButton({ date }: { date: PersonalDate }) {
  return (
    <form action={deletePersonalDate} className="shrink-0">
      <input type="hidden" name="id" value={date.id} />
      <ConfirmSubmit
        message={`Delete “${personalDateLabel(date)}”? It will also come off any group you've shared it with.`}
        className="rounded-md px-2 py-1 text-xs text-faint transition-colors hover:bg-danger-soft hover:text-danger"
      >
        Delete
      </ConfirmSubmit>
    </form>
  );
}
