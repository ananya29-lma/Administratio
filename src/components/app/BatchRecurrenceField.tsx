import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CustomRecurrenceDialog } from "@/components/app/CustomRecurrenceDialog";
import type { Row } from "@/lib/mock";
import type { SchedulePlan } from "@/lib/administration";
import { useCollection, useStore } from "@/lib/store";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function datesForUnavailable(startDate: string, count = 1095) {
  const start = new Date(`${startDate}T12:00:00`);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  });
}

function dateLabel(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day, 12));
}

function planSummary(plan: SchedulePlan) {
  const days = plan.daysOfWeek.map((day) => DAY_NAMES[day]).join(", ");
  return `${days} · ${dateLabel(plan.startDate)} – ${dateLabel(plan.endDate)} · ${plan.sessions.length} sessions`;
}

export function BatchRecurrenceField({
  values,
  setValues,
}: {
  values: Row;
  setValues: (values: Row) => void;
}) {
  const [open, setOpen] = useState(false);
  const plan = values.schedulePlan as SchedulePlan | undefined;
  const startDate = String(values.date ?? new Date().toISOString().slice(0, 10));
  const { settings } = useStore();
  const tasks = useCollection("tasks", "id");
  const unavailable = useMemo(() => {
    const dates = datesForUnavailable(startDate);
    const facultyName = String(values.facultyName ?? "");
    const startTime = String(values.startTime ?? "");
    const endTime = String(values.endTime ?? "");
    if (!facultyName || !startTime || !endTime) return [];
    return dates.filter((date) => {
      const taskConflict = tasks.rows.some(
        (task) =>
          task.assignee === facultyName &&
          task.date === date &&
          task.workflowStatus !== "Draft" &&
          startTime < String(task.endTime) &&
          endTime > String(task.startTime),
      );
      return taskConflict;
    });
  }, [
    startDate,
    values.facultyName,
    values.startTime,
    values.endTime,
    tasks.rows,
  ]);
  const subject = settings.subjectCurriculum.find((item) => item.name === values.course);
  const summary = plan ? planSummary(plan) : "Does not repeat";

  return (
    <div className="space-y-1.5 md:col-span-full">
      <p className="text-xs font-medium" id="repeat-label">
        Schedule
      </p>
      <Button
        id="batch-custom-recurrence"
        data-enter-navigation
        type="button"
        variant="outline"
        aria-labelledby="repeat-label"
        title={summary}
        className="h-10 min-w-0 w-full justify-start overflow-hidden px-3 font-normal"
        onClick={() => setOpen(true)}
      >
        <span className="block min-w-0 flex-1 truncate text-left">{summary}</span>
      </Button>
      <CustomRecurrenceDialog
        open={open}
        initialPlan={plan}
        startDate={startDate}
        totalSessions={Number(values.totalSessions)}
        holidays={settings.holidays}
        unavailable={unavailable}
        typicalDuration={subject?.typical}
        onDone={(schedulePlan) => {
          setValues({
            ...values,
            schedulePlan,
            repeatType: "custom",
            repeatSummary: planSummary(schedulePlan),
            date: schedulePlan.startDate,
          });
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
