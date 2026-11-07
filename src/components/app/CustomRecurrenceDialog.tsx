import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { buildSchedule, suggestDays, type SchedulePlan } from "@/lib/administration";

const WEEKDAYS = [
  { short: "S", name: "Sunday", index: 0 },
  { short: "M", name: "Monday", index: 1 },
  { short: "T", name: "Tuesday", index: 2 },
  { short: "W", name: "Wednesday", index: 3 },
  { short: "T", name: "Thursday", index: 4 },
  { short: "F", name: "Friday", index: 5 },
  { short: "S", name: "Saturday", index: 6 },
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function localDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function displayDate(date: string, year = true) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(year ? { year: "numeric" } : {}),
  }).format(localDate(date));
}

function nextSelectedDate(date: string, days: number[]) {
  const cursor = localDate(date);
  for (let offset = 0; offset < 7; offset++) {
    if (days.includes(cursor.getDay())) return dateValue(cursor);
    cursor.setDate(cursor.getDate() + 1);
  }
  return date;
}

function typicalWeeks(value: string) {
  const amount = Number(value.match(/\d+(?:\.\d+)?/)?.[0]);
  if (!Number.isFinite(amount)) return undefined;
  return value.toLowerCase().includes("month") ? amount * 4.345 : amount / 7;
}

export type CustomRecurrenceDialogProps = {
  open: boolean;
  initialPlan?: SchedulePlan;
  startDate: string;
  totalSessions: number;
  holidays?: string[];
  unavailable?: string[];
  typicalDuration?: string;
  onDone: (plan: SchedulePlan) => void;
  onCancel: () => void;
};

export function CustomRecurrenceDialog({
  open,
  initialPlan,
  startDate,
  totalSessions,
  holidays = [],
  unavailable = [],
  typicalDuration,
  onDone,
  onCancel,
}: CustomRecurrenceDialogProps) {
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [scheduleStart, setScheduleStart] = useState(startDate);
  const [startAnchor, setStartAnchor] = useState(startDate);
  const [startWasEdited, setStartWasEdited] = useState(false);

  useEffect(() => {
    if (!open) return;
    const initialDays = initialPlan?.daysOfWeek?.length
      ? [...initialPlan.daysOfWeek]
      : [localDate(startDate).getDay()];
    const start = initialPlan?.startDate ?? startDate;
    setDaysOfWeek(initialDays);
    setScheduleStart(start);
    setStartAnchor(start);
    setStartWasEdited(!!initialPlan);
  }, [open, initialPlan, startDate]);

  const numericSessions = Number(totalSessions);
  const schedule = useMemo(() => {
    if (!Number.isInteger(numericSessions) || numericSessions < 1 || daysOfWeek.length === 0)
      return undefined;
    return buildSchedule({
      startDate: scheduleStart,
      daysOfWeek,
      totalSessions: numericSessions,
      holidays,
      unavailable,
    });
  }, [numericSessions, daysOfWeek, scheduleStart, holidays, unavailable]);

  const toggleDay = (day: number) => {
    const next = daysOfWeek.includes(day)
      ? daysOfWeek.filter((item) => item !== day)
      : [...daysOfWeek, day].sort((first, second) => first - second);
    setDaysOfWeek(next);
    if (next.length && !startWasEdited) setScheduleStart(nextSelectedDate(startAnchor, next));
  };

  const save = () => {
    if (!daysOfWeek.length || !schedule?.sessions.length || !schedule.endDate) return;
    onDone({
      ...schedule,
      startDate: scheduleStart,
      daysOfWeek,
      totalSessions: numericSessions,
      endMode: "afterSessions",
      selectedEndDate: schedule.endDate,
      holidayDates: holidays,
      unavailableDates: unavailable,
    });
  };

  const suggestedDays = suggestDays({ totalSessions: numericSessions, durationInWeeks: 4 });
  const typicalDurationWeeks = typicalDuration ? typicalWeeks(typicalDuration) : undefined;
  const durationIsLong =
    !!schedule && typicalDurationWeeks !== undefined && schedule.weeks > typicalDurationWeeks * 1.5;
  const weekdaySummary = daysOfWeek.map((day) => DAY_NAMES[day]).join(", ");

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent
        aria-modal="true"
        className="max-h-[90vh] overflow-y-auto overscroll-contain w-[calc(100vw-1rem)] max-w-[400px] rounded-[28px] border border-[#E2E8F0] bg-white p-6 text-[#172033] shadow-[0_12px_40px_rgba(15,23,42,0.12)] sm:rounded-[28px] max-[479px]:bottom-0 max-[479px]:left-0 max-[479px]:top-auto max-[479px]:w-full max-[479px]:max-w-none max-[479px]:translate-x-0 max-[479px]:translate-y-0 max-[479px]:rounded-b-none"
      >
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-2xl font-normal tracking-normal text-[#172033]">
            Schedule
          </DialogTitle>
          <DialogDescription className="sr-only">
            Choose the repeating class days, start date, and schedule end.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="space-y-3" aria-labelledby="repeat-on-label">
            <h3 id="repeat-on-label" className="text-sm font-medium text-[#64748B]">
              Repeat on
            </h3>
            <div className="flex justify-between gap-1" role="group" aria-label="Days of the week">
              {WEEKDAYS.map(({ short, name, index }) => {
                const selected = daysOfWeek.includes(index);
                return (
                  <button
                    key={name}
                    type="button"
                    aria-label={name}
                    aria-pressed={selected}
                    onClick={() => toggleDay(index)}
                    className={`h-9 w-9 shrink-0 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2A9D8F] ${selected ? "bg-[#164E63] text-white" : "bg-[#E8F8F2] text-[#164E63] hover:bg-[#D8F2E9]"}`}
                  >
                    {short}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-2" aria-labelledby="start-date-label">
            <label
              id="start-date-label"
              htmlFor="schedule-start-date"
              className="text-sm font-medium text-[#64748B]"
            >
              Start date
            </label>
            <input
              id="schedule-start-date"
              type="date"
              value={scheduleStart}
              onChange={(event) => {
                setStartWasEdited(true);
                setScheduleStart(event.target.value);
                setStartAnchor(event.target.value);
              }}
              className="h-10 w-full rounded-lg border-0 bg-[#F1F5F7] px-3 text-sm text-[#172033] outline-none focus-visible:ring-2 focus-visible:ring-[#2A9D8F]"
            />
          </section>

          <section className="space-y-2" aria-labelledby="schedule-ends-label">
            <h3 id="schedule-ends-label" className="text-sm font-medium text-[#64748B]">
              Ends
            </h3>
            <div className="rounded-xl bg-white/65 p-3 text-sm">
              <p className="font-medium">After {numericSessions || 0} sessions</p>
              <p className="mt-1 flex items-center justify-between gap-2 text-xs text-[#64748B]">
                <span>{schedule?.endDate ? `Ends ${displayDate(schedule.endDate)}` : "Auto"}</span>
                <span className="rounded-full bg-[#E8F8F2] px-2 py-0.5 text-[#164E63]">Auto</span>
              </p>
            </div>
          </section>

          {!daysOfWeek.length && (
            <p className="text-xs text-red-700" role="alert">
              Choose at least one day
            </p>
          )}
          {Number.isInteger(numericSessions) && numericSessions < 1 && (
            <p className="text-xs text-red-700" role="alert">
              Enter a positive whole number of sessions.
            </p>
          )}
          {schedule?.sessions.length ? (
            <div
              className="space-y-1 rounded-xl border border-[#E2E8F0] bg-white p-3 text-xs text-[#172033]"
              aria-live="polite"
            >
              <p className="font-medium">
                {schedule.sessions.length} sessions · {weekdaySummary} · {schedule.weeks}{" "}
                {schedule.weeks === 1 ? "week" : "weeks"} · ends {displayDate(schedule.endDate)}
              </p>
              <p>
                Last week has {schedule.lastWeekSessions} of {daysOfWeek.length} sessions.
              </p>
              {durationIsLong && typicalDuration && (
                <p className="text-amber-800">
                  Typical: {typicalDuration}. This plan takes {schedule.weeks}{" "}
                  {schedule.weeks === 1 ? "week" : "weeks"}.
                </p>
              )}
            </div>
          ) : null}
          {suggestedDays.minimumSessionsPerWeek > 0 && (
            <p className="text-xs text-[#64748B]">
              {suggestedDays.minimumSessionsPerWeek > 7
                ? `This target requires ${suggestedDays.minimumSessionsPerWeek} sessions per week, more than one session per day allows.`
                : `To finish in 1 month, schedule at least ${suggestedDays.minimumSessionsPerWeek} days a week.`}
            </p>
          )}
        </div>

        <DialogFooter className="flex-row items-center justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="h-10 rounded-full px-4 text-sm font-medium text-[#164E63] hover:bg-[#E8F8F2]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={save}
            disabled={!daysOfWeek.length || !schedule?.sessions.length}
            className="h-10 rounded-full bg-[#164E63] px-6 text-sm font-medium text-white hover:bg-[#236B78]"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
