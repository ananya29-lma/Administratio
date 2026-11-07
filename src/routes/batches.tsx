import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Pencil,
  Plus,
  Repeat,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AIPredictionCard } from "@/components/app/AIPredictionCard";
import { UrgentClassesPredictionCard } from "@/components/app/UrgentClassesPredictionCard";
import { BatchRecurrenceField } from "@/components/app/BatchRecurrenceField";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ConfirmDialog,
  FormDialog,
  KV,
  Panel,
  StatusBadge,
  validateFields,
  type Field,
} from "@/components/app/kit";
import { useCollection, useStore } from "@/lib/store";
import { COURSE_OPTION_GROUPS, COURSES, STAFF, type Row } from "@/lib/mock";
import { fmtDate } from "@/lib/format";
import {
  expandRecurrenceRule,
  buildSchedule,
  predictModuleCompletion,
  recurrenceRuleToRRule,
  recurrenceSummary,
  relatedScheduledClassIds,
  scheduleConflict,
  subjectSessionCount,
  type SchedulePlan,
  type ModulePredictionConfig,
  type RecurrenceRule,
} from "@/lib/administration";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/batches")({
  head: pageHead(
    "Batch & Timing Management",
    "Create batches, assign timings and view weekly schedules.",
  ),
  component: Batches,
});

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIMETABLE_DAYS = DAYS.slice(0, 6);
const TIMETABLE_SLOTS = ["09:00 – 11:00", "11:00 – 13:00", "14:00 – 16:00", "16:00 – 18:00"];
const STATUSES = ["Upcoming", "Active", "Completed"];
const SCHEDULE_CATEGORIES = [
  { label: "AI", codePrefix: "AI" },
  { label: "Multimedia", codePrefix: "MM" },
  { label: "Accounts", codePrefix: "AC" },
  { label: "Management", codePrefix: "MG" },
];
const MODULE_PREDICTIONS: Record<string, ModulePredictionConfig> = {
  AI: {
    currentModule: "Not assigned",
    nextModule: "Not assigned",
    remainingSessions: 2,
    totalSessions: 7,
    action: "Prepare the next module's timetable and notify the faculty.",
  },
  Multimedia: {
    currentModule: "Adobe Premiere Pro",
    nextModule: "After Effects",
    remainingSessions: 3,
    totalSessions: 7,
    action: "Reserve the next module's sessions based on faculty availability.",
  },
  Accounts: {
    currentModule: "Advanced Excel for Accounting",
    nextModule: "Tally Prime",
    remainingSessions: 2,
    totalSessions: 7,
    action: "Review remaining practical sessions and schedule the next module.",
  },
  Management: {
    currentModule: "Principles of Management",
    nextModule: "Project Management",
    remainingSessions: 4,
    totalSessions: 8,
    action: "Plan the next module's timetable and confirm faculty availability.",
  },
};
function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function weekStart(offset: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7) + offset * 7);
  return date;
}

function slotTimes(slot: string) {
  const [startTime, endTime] = slot.split(" – ");
  return { startTime, endTime };
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function displayTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

function weekdayName(date: Date) {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
    date.getDay()
  ];
}

function Batches() {
  const b = useCollection("batches", "id");
  const scheduledClasses = useCollection("scheduledClasses", "id");
  const tasks = useCollection("tasks", "id");
  const { data, settings } = useStore();
  const [form, setForm] = useState<Row | null>(null);
  const [timing, setTiming] = useState<Row | null>(null);
  const [details, setDetails] = useState<Row | null>(null);
  const [weekOffsets, setWeekOffsets] = useState<Record<string, number>>({});
  const [classForm, setClassForm] = useState<Row | null>(null);
  const [taskForm, setTaskForm] = useState<Row | null>(null);
  const [classDetails, setClassDetails] = useState<Row | null>(null);
  const [deletingClass, setDeletingClass] = useState<Row | null>(null);
  const [calendarSlotsByFaculty, setCalendarSlotsByFaculty] = useState<Record<string, string[]>>(
    {},
  );
  const [editingSlotTiming, setEditingSlotTiming] = useState<{
    slot: string;
    startTime: string;
    endTime: string;
    facultyName: string;
  } | null>(null);
  const [pendingRecurringSave, setPendingRecurringSave] = useState<{
    value: Row;
    status: string;
  } | null>(null);
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [scheduleCategory, setScheduleCategory] = useState(SCHEDULE_CATEGORIES[0].label);
  const weekOffset = weekOffsets[scheduleCategory] ?? 0;
  const changeWeek = (amount: number) => {
    setWeekOffsets((offsets) => ({
      ...offsets,
      [scheduleCategory]: (offsets[scheduleCategory] ?? 0) + amount,
    }));
  };
  const enrolled = (name: string) =>
    data.admissions.filter((a) => a.batch === name && a.status !== "Rejected");
  const startOfWeek = weekStart(weekOffset);
  const weekDates = TIMETABLE_DAYS.map((day, index) => {
    const date = new Date(startOfWeek);
    date.setDate(date.getDate() + index);
    return {
      day,
      date: isoDate(date),
      weekday: weekdayName(date),
    };
  });
  const weekLabel = `${fmtDate(weekDates[0].date)} – ${fmtDate(weekDates[5].date)}`;
  const saveSlotTiming = () => {
    if (!editingSlotTiming) return;
    const { slot, startTime, endTime, facultyName } = editingSlotTiming;
    const facultySlots = calendarSlotsByFaculty[facultyName] ?? TIMETABLE_SLOTS;
    if (!startTime || !endTime) {
      toast.error("Enter both a start time and an end time");
      return;
    }
    if (startTime >= endTime) {
      toast.error("End time must be after start time");
      return;
    }
    const slotIndex = facultySlots.indexOf(slot);
    if (slotIndex < 0) return;
    const proposedSlots = [...facultySlots];
    proposedSlots[slotIndex] = `${startTime} – ${endTime}`;
    const timingChanged =
      startTime !== slotTimes(slot).startTime || endTime !== slotTimes(slot).endTime;
    if (timingChanged && slotIndex + 1 < proposedSlots.length) {
      const nextSlot = slotTimes(facultySlots[slotIndex + 1]);
      const nextDuration = timeToMinutes(nextSlot.endTime) - timeToMinutes(nextSlot.startTime);
      const nextEnd = timeToMinutes(endTime) + nextDuration;
      if (nextEnd >= 24 * 60) {
        toast.error("The next time slot would extend past midnight");
        return;
      }
      proposedSlots[slotIndex + 1] = `${endTime} – ${minutesToTime(nextEnd)}`;
    }
    const changedSlots = proposedSlots.filter((updated, index) => updated !== facultySlots[index]);
    const sortedSlots = proposedSlots.sort((first, second) =>
      slotTimes(first).startTime.localeCompare(slotTimes(second).startTime),
    );
    const hasOverlap = sortedSlots.some(
      (current, index) =>
        index > 0 && slotTimes(current).startTime < slotTimes(sortedSlots[index - 1]).endTime,
    );
    if (hasOverlap) {
      toast.error("This time change overlaps another calendar slot");
      return;
    }
    if (timingChanged && scheduleCategory === "AI") {
      const visibleDates = new Set(weekDates.map(({ date }) => date));
      const conflict = changedSlots.some((changedSlot) => {
        const changed = slotTimes(changedSlot);
        return (
          scheduledClasses.rows.some(
            (session) =>
              session.facultyName !== facultyName &&
              visibleDates.has(String(session.date)) &&
              changed.startTime < String(session.endTime) &&
              changed.endTime > String(session.startTime),
          ) ||
          tasks.rows.some(
            (task) =>
              task.workflowStatus !== "Draft" &&
              task.assignee !== facultyName &&
              visibleDates.has(String(task.date)) &&
              changed.startTime < String(task.endTime) &&
              changed.endTime > String(task.startTime),
          )
        );
      });
      if (conflict) {
        toast.error("This time change overlaps a scheduled class or task on the other AI calendar");
        return;
      }
    }
    setCalendarSlotsByFaculty((slots) => ({ ...slots, [facultyName]: sortedSlots }));
    setEditingSlotTiming(null);
  };
  const departmentFaculty =
    STAFF.find((faculty) => faculty.endsWith(`(${scheduleCategory})`)) ?? "—";
  const categoryConfig = SCHEDULE_CATEGORIES.find((item) => item.label === scheduleCategory);
  const categoryBatches = b.rows.filter((batch) => {
    const code = COURSES.find((course) => course.name === batch.course)?.code;
    return code?.startsWith(categoryConfig?.codePrefix ?? "") && batch.status !== "Completed";
  });
  const predictionBatch =
    categoryBatches.find((batch) => batch.status === "Active") ??
    categoryBatches.find((batch) => batch.status === "Upcoming");
  const predictionSourceBatch =
    predictionBatch ??
    (scheduleCategory === "Multimedia"
      ? {
          name: "Multimedia schedule",
          course:
            COURSES.find((course) => course.code.startsWith(categoryConfig?.codePrefix ?? "MM"))
              ?.name ?? "Multimedia",
          days: ["Mon", "Wed", "Fri"],
          startTime: "09:00",
          endTime: "11:00",
        }
      : undefined);
  const basePrediction = predictModuleCompletion(
    MODULE_PREDICTIONS[scheduleCategory],
    predictionSourceBatch,
    scheduledClasses.rows,
    isoDate(new Date(Math.max(Date.now(), startOfWeek.getTime()))),
    departmentFaculty,
  );
  const currentDate = isoDate(new Date());
  const generatedSeries = scheduledClasses.rows
    .filter((session) => {
      const classSchedule = session.classSchedule as { classId?: string } | undefined;
      const code = COURSES.find((course) => course.name === session.course)?.code;
      return (
        session.scheduleGenerated === true &&
        !!classSchedule?.classId &&
        (session.scheduleCategory === scheduleCategory ||
          code?.startsWith(categoryConfig?.codePrefix ?? ""))
      );
    })
    .sort((first, second) =>
      String(second.scheduleStartDate ?? "").localeCompare(String(first.scheduleStartDate ?? "")),
    );
  const predictionSchedule = generatedSeries[0]?.classSchedule as
    | {
        classId: string;
        totalSessions: number;
        daysOfWeek: number[];
        holidayDates?: string[];
        unavailableDates?: string[];
        endDate: string;
      }
    | undefined;
  const predictionRows = predictionSchedule
    ? generatedSeries.filter(
        (session) =>
          (session.classSchedule as { classId?: string } | undefined)?.classId ===
          predictionSchedule.classId,
      )
    : [];
  const predictionTotal = Number(predictionSchedule?.totalSessions ?? 0);
  const predictionCompleted = predictionRows.filter(
    (session) => session.status === "Completed",
  ).length;
  const predictionRemaining = Math.max(0, predictionTotal - predictionCompleted);
  const forecast =
    predictionSchedule && predictionRemaining
      ? buildSchedule({
          startDate: currentDate,
          daysOfWeek: predictionSchedule.daysOfWeek,
          totalSessions: predictionRemaining,
          holidays: predictionSchedule.holidayDates ?? settings.holidays,
          unavailable: predictionSchedule.unavailableDates ?? [],
        })
      : undefined;
  const generatedPrediction =
    predictionSchedule && generatedSeries[0]
      ? {
          currentModule: String(generatedSeries[0].course ?? "Scheduled module"),
          nextModule: MODULE_PREDICTIONS[scheduleCategory].nextModule,
          remainingSessions: predictionRemaining,
          completedSessions: predictionCompleted,
          totalSessions: predictionTotal,
          completionDate: forecast?.endDate ?? predictionSchedule.endDate ?? currentDate,
          nextDates: forecast?.sessions.slice(0, 2) ?? [],
          startTime: String(generatedSeries[0].startTime ?? "09:00"),
          endTime: String(generatedSeries[0].endTime ?? "11:00"),
          days: forecast?.weeks ?? 1,
          action: MODULE_PREDICTIONS[scheduleCategory].action,
          status:
            forecast?.endDate && forecast.endDate > predictionSchedule.endDate
              ? "Delayed"
              : predictionTotal > 0 && predictionCompleted / predictionTotal >= 0.85
                ? "Almost Complete"
                : "On Track",
        }
      : undefined;
  const prediction = generatedPrediction ?? basePrediction;
  const nextStart = prediction ? new Date(`${prediction.completionDate}T12:00:00`) : undefined;
  if (nextStart) nextStart.setDate(nextStart.getDate() + 1);
  const nextStartDate = nextStart ? isoDate(nextStart) : "";
  const suggestedDays =
    prediction?.nextDates
      .map((date) => weekdayName(new Date(`${date}T12:00:00`)).slice(0, 3))
      .join(" – ") ?? "";
  const batchPattern = Array.isArray(predictionSourceBatch?.days)
    ? predictionSourceBatch.days.length === 3 &&
      ["Mon", "Wed", "Fri"].every((day) => predictionSourceBatch.days.includes(day))
      ? "MWF"
      : predictionSourceBatch.days.length === 3 &&
          ["Tue", "Thu", "Sat"].every((day) => predictionSourceBatch.days.includes(day))
        ? "TTS"
        : predictionSourceBatch.days.map((day) => String(day).slice(0, 3)).join(" · ")
    : "";
  const recommendationDates = prediction?.nextDates ?? [];
  const recommendationDate =
    prediction && predictionBatch
      ? recommendationDates.find((date) => {
          const candidate = {
            id: "AI-PREDICTION-CANDIDATE",
            date,
            startTime: prediction.startTime,
            endTime: prediction.endTime,
            facultyName: departmentFaculty,
            batch: predictionBatch.name,
            admissionNumbers: [],
            room: predictionBatch.room,
          };
          const taskConflict = tasks.rows.some(
            (task) =>
              task.workflowStatus !== "Draft" &&
              task.assignee === departmentFaculty &&
              task.date === date &&
              task.startTime < prediction.endTime &&
              task.endTime > prediction.startTime,
          );
          const batchConflict = scheduledClasses.rows.some(
            (session) =>
              session.batch === predictionBatch.name &&
              session.date === date &&
              session.startTime < prediction.endTime &&
              session.endTime > prediction.startTime,
          );
          return (
            !taskConflict && !batchConflict && !scheduleConflict(scheduledClasses.rows, candidate)
          );
        })
      : undefined;
  const recommendationConflict =
    recommendationDates.length > 0 && !recommendationDate
      ? "Suggested times conflict with existing faculty, batch, room, or task bookings."
      : undefined;
  const canConfirmRecommendation =
    !!prediction && !!predictionBatch && !!recommendationDate && !recommendationConflict;
  const confirmRecommendation = () => {
    if (!canConfirmRecommendation || !prediction || !predictionBatch || !recommendationDate) return;
    scheduledClasses.add({
      id: scheduledClasses.nextId("CLS"),
      date: recommendationDate,
      day: weekdayName(new Date(`${recommendationDate}T12:00:00`)).slice(0, 3),
      startTime: prediction.startTime,
      endTime: prediction.endTime,
      timeSlot: `${prediction.startTime} – ${prediction.endTime}`,
      course: predictionBatch.course,
      module: prediction.nextModule,
      batch: predictionBatch.name,
      batchType: "Full Week",
      classType: "Theory",
      facultyName: departmentFaculty,
      room: predictionBatch.room,
      status: "Scheduled",
      studentNames: [],
      admissionNumbers: [],
    });
    toast.success(`${prediction.nextModule} scheduled for ${fmtDate(recommendationDate)}`);
    setShowRecommendation(false);
  };

  const recalculatePlan = (plan: SchedulePlan | undefined, totalSessions: number) => {
    if (!plan || !Number.isInteger(totalSessions) || totalSessions < 1) return undefined;
    const result = buildSchedule({
      startDate: plan.startDate,
      daysOfWeek: plan.daysOfWeek,
      totalSessions,
      holidays: settings.holidays,
      unavailable: plan.unavailableDates,
    });
    if (!result.sessions.length) return undefined;
    return {
      ...plan,
      ...result,
      totalSessions,
      holidayDates: settings.holidays,
      endMode: "afterSessions",
      selectedEndDate: result.endDate,
    };
  };
  const schedulePlanSummary = (plan: SchedulePlan) =>
    `${plan.daysOfWeek.map((day) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day]).join(", ")} · ${fmtDate(plan.startDate)} – ${fmtDate(plan.endDate)} · ${plan.sessions.length} sessions`;

  const fields: Field[] = [
    { name: "name", label: "Batch Name", required: true },
    {
      name: "course",
      label: "Course Name",
      type: "select",
      optionGroups: COURSE_OPTION_GROUPS,
      required: true,
    },
    { name: "startDate", label: "Batch Start Date", type: "date", required: true },
    {
      name: "endDate",
      label: "Batch End Date",
      type: "date",
      required: true,
      validate: (v, all) =>
        typeof v === "string" && typeof all.startDate === "string" && v < all.startDate
          ? "End date must be after start date"
          : undefined,
    },
    { name: "instructor", label: "Instructor", required: true },
    { name: "room", label: "Room or Lab", required: true },
    {
      name: "capacity",
      label: "Maximum Capacity",
      type: "number",
      required: true,
      validate: (v) => (Number(v) <= 0 ? "Capacity must be greater than 0" : undefined),
    },
    { name: "status", label: "Batch Status", type: "select", options: STATUSES, required: true },
  ];
  const timingFields: Field[] = [
    { name: "startTime", label: "Start Time", type: "time", required: true },
    {
      name: "endTime",
      label: "End Time",
      type: "time",
      required: true,
      validate: (v, all) =>
        typeof v === "string" && typeof all.startTime === "string" && v <= all.startTime
          ? "End time must be after start time"
          : undefined,
    },
  ];
  const getScheduledStudentNumbersForCourse = (course: string, currentClassId?: string) => {
    const normalizedCourse = String(course ?? "").trim().toLocaleLowerCase();
    if (!normalizedCourse) return new Set<string>();
    return new Set(
      scheduledClasses.rows.flatMap((scheduledClass) => {
        if (String(scheduledClass.id ?? "") === String(currentClassId ?? "")) return [];
        if (String(scheduledClass.course ?? "").trim().toLocaleLowerCase() !== normalizedCourse) return [];
        const numbers = Array.isArray(scheduledClass.admissionNumbers)
          ? scheduledClass.admissionNumbers
          : scheduledClass.admissionNumber
            ? [scheduledClass.admissionNumber]
            : [];
        return numbers.map((number) => String(number));
      }),
    );
  };

  const classFields: Field[] = [
    {
      name: "course",
      label: "Subject",
      type: "select",
      options: settings.subjectCurriculum.map((subject) => subject.name),
      modalPicker: true,
      modalTitle: "Select a Subject",
      modalDescription: "Choose the subject for this class.",
      searchPlaceholder: "Search subject names",
      showOptionValue: false,
      placeholder: "Select a Subject",
      emptyMessage: "No subjects available.",
      required: true,
      onBeforeChange: (subject, values) =>
        !values.schedulePlan ||
        subject === values.course ||
        window.confirm(
          "Recalculate schedule? Your existing schedule will be updated for the newly selected subject's total sessions.",
        ),
      onChange: (subject, values) => {
        const total = subjectSessionCount(subject, settings.subjectCurriculum) ?? "";
        const nextPlan = recalculatePlan(
          values.schedulePlan as SchedulePlan | undefined,
          Number(total),
        );
        return {
          studentNames: [],
          admissionNumbers: [],
          totalSessions: total,
          schedulePlan: nextPlan,
          repeatSummary: nextPlan ? schedulePlanSummary(nextPlan) : "Does not repeat",
        };
      },
    },
    {
      name: "admissionNumbers",
      label: "Student Name",
      type: "multiSelect",
      modalPicker: true,
      modalRequiresCourse: true,
      modalTitle: "Select Students",
      modalDescription: "Choose students enrolled in the selected course.",
      searchPlaceholder: "Search by name or admission number",
      showOptionValue: true,
      placeholder: "Select a student…",
      noSelectionMessage: "Select a course first.",
      emptyMessage: "No students available for this course.",
      required: true,
      optionsFor: (values) => {
        const selectedCourse = String(values.course ?? "")
          .trim()
          .toLocaleLowerCase();
        if (!selectedCourse) return [];
        return data.students
          .filter(
            (student) =>
              String(student.course ?? "")
                .trim()
                .toLocaleLowerCase() === selectedCourse,
          )
          .map((student) => student.regNo);
      },
      optionLabelsFor: (values) =>
        Object.fromEntries(data.students.map((student) => [student.regNo, student.name])),
      optionEnabledFor: (studentRegNo, values) => {
        const selectedCourse = String(values.course ?? "")
          .trim()
          .toLocaleLowerCase();
        const isEnrolled = !!selectedCourse && data.students.some(
          (student) =>
            student.regNo === studentRegNo &&
            String(student.course ?? "")
              .trim()
              .toLocaleLowerCase() === selectedCourse,
        );
        const alreadyScheduled = getScheduledStudentNumbersForCourse(
          selectedCourse,
          String(values.id ?? ""),
        );
        return isEnrolled && !alreadyScheduled.has(studentRegNo);
      },
      onChange: (admissionNumbers, values) => {
        const selectedNumbers = admissionNumbers as string[];
        const studentNames = data.students
          .filter((student) => selectedNumbers.includes(student.regNo))
          .map((student) => student.name);
        return { studentNames };
      },
    },
    ...timingFields,
    {
      name: "totalSessions",
      label: "Total Sessions",
      type: "number",
      required: true,
      min: 1,
      hint: (values) =>
        settings.subjectCurriculum.find((subject) => subject.name === values.course)?.typical
          ? `Typical duration: ${settings.subjectCurriculum.find((subject) => subject.name === values.course)?.typical}`
          : undefined,
      onChange: (sessionCount, values) => {
        const total = Number(sessionCount);
        const nextPlan = recalculatePlan(values.schedulePlan as SchedulePlan | undefined, total);
        return {
          ...(values.schedulePlan ? { schedulePlan: nextPlan } : {}),
          ...(nextPlan ? { repeatSummary: schedulePlanSummary(nextPlan) } : {}),
        };
      },
      validate: (value) =>
        Number.isInteger(Number(value)) && Number(value) > 0
          ? undefined
          : "Enter a positive whole number of sessions",
    },
    {
      name: "schedule",
      label: "Schedule",
      render: (values, setValues) => <BatchRecurrenceField values={values} setValues={setValues} />,
    },
  ];
  const taskFields: Field[] = [
    { name: "title", label: "Task", required: true, full: true },
    { name: "deadline", label: "Deadline", type: "date", required: true },
    { name: "endTime", label: "End Time", type: "time", required: true },
    { name: "description", label: "Description", type: "textarea", full: true },
  ];
  const DayPicker = (v: Row, set: (v: Row) => void) => (
    <div className="space-y-1.5">
      <p className="text-xs font-medium">Days of the Week</p>
      <div className="flex flex-wrap gap-1.5">
        {DAYS.map((d) => {
          const on = v.days?.includes(d);
          return (
            <Button
              key={d}
              type="button"
              size="sm"
              variant={on ? "default" : "outline"}
              onClick={() =>
                set({
                  ...v,
                  days: on ? v.days.filter((x: string) => x !== d) : [...(v.days ?? []), d],
                })
              }
            >
              {d}
            </Button>
          );
        })}
      </div>
    </div>
  );

  const save = (v: Row) => {
    if (!v.days?.length) {
      toast.error("Select at least one day of the week");
      return;
    }
    if (v.id) {
      b.update(v.id, v);
      toast.success(`${v.name} updated`);
      return;
    }
    const code = COURSES.find((c) => c.name === v.course)?.code ?? "GEN";
    const id = `B-${code}-${Math.floor(Math.random() * 900 + 100)}`;
    b.add({ ...v, id, startTime: v.startTime || "09:00", endTime: v.endTime || "11:00" });
    toast.success(`Batch ${id} created`);
  };

  const openClassForm = (
    date: string,
    day: string,
    slot: string,
    facultyName = departmentFaculty,
  ) => {
    const times = slotTimes(slot);
    setClassForm({
      id: scheduledClasses.nextId("CLS"),
      date,
      day,
      timeSlot: slot,
      ...times,
      facultyName,
      totalSessions: 1,
      repeatType: "none",
      repeatSummary: "Does not repeat",
      batchType: "Full Week",
      classType: "Theory",
    });
  };
  const openTaskForm = () => {
    if (!classForm) return;
    setTaskForm({
      id: tasks.nextId("TSK"),
      assignee: String(classForm.facultyName ?? departmentFaculty),
      date: classForm.date,
      startTime: classForm.startTime,
      endTime: classForm.endTime,
      deadline: classForm.date,
      priority: "Medium",
      status: "Pending",
      workflowStatus: "Assigned",
    });
  };
  const saveTask = (value: Row) => {
    const validationErrors = validateFields(taskFields, value);
    if (Object.keys(validationErrors).length) {
      toast.error(Object.values(validationErrors)[0]);
      return false;
    }
    const overlaps = (record: Row) =>
      record.date === value.date &&
      typeof record.startTime === "string" &&
      typeof record.endTime === "string" &&
      value.startTime < record.endTime &&
      record.startTime < value.endTime;
    const category = SCHEDULE_CATEGORIES.find((item) => item.label === scheduleCategory);
    const assignedFaculty = String(value.assignee ?? departmentFaculty);
    const classConflict = scheduledClasses.rows.some((scheduledClass) => {
      const courseCode = COURSES.find((course) => course.name === scheduledClass.course)?.code;
      return (
        overlaps(scheduledClass) &&
        (scheduledClass.facultyName === assignedFaculty ||
          courseCode?.startsWith(category?.codePrefix ?? ""))
      );
    });
    const taskConflict = tasks.rows.some(
      (task) =>
        task.id !== value.id &&
        task.workflowStatus !== "Draft" &&
        task.assignee === assignedFaculty &&
        overlaps(task),
    );
    if (classConflict || taskConflict) {
      toast.error(
        classConflict
          ? "This faculty member has a class during that time"
          : "This faculty member already has a task during that time",
      );
      return false;
    }
    tasks.add({ ...value, assignee: assignedFaculty, workflowStatus: "Assigned" });
    toast.success("Task added to the calendar");
    setTaskForm(null);
    setClassForm(null);
    return true;
  };
  const classStudentNames = (scheduledClass: Row) =>
    Array.isArray(scheduledClass.studentNames)
      ? scheduledClass.studentNames.join(", ")
      : scheduledClass.studentName;
  const scheduledSessionsOnDate = (date: string) =>
    scheduledClasses.rows.flatMap((session) => {
      const rule = session.recurrenceRule as RecurrenceRule | undefined;
      if (!rule) return session.date === date ? [{ ...session, seriesId: String(session.id) }] : [];
      const excludedDates = Array.isArray(session.excludedDates)
        ? session.excludedDates.map(String)
        : [];
      return expandRecurrenceRule(rule, date, date)
        .filter((occurrenceDate) => !excludedDates.includes(occurrenceDate))
        .map((occurrenceDate) => ({
          ...session,
          date: occurrenceDate,
          startTime: rule.startTime || session.startTime,
          endTime: rule.endTime || session.endTime,
          id: `${session.id}@${occurrenceDate}`,
          seriesId: String(session.id),
        }));
    });
  const renderCalendar = (facultyName: string) => {
    const facultySlots = calendarSlotsByFaculty[facultyName] ?? TIMETABLE_SLOTS;
    const expandedSessions = scheduledClasses.rows.flatMap((session) => {
      const rule = session.recurrenceRule as RecurrenceRule | undefined;
      if (!rule) return [{ ...session, occurrenceId: String(session.id), isRecurring: false }];
      const excludedDates = Array.isArray(session.excludedDates)
        ? session.excludedDates.map(String)
        : [];
      return expandRecurrenceRule(rule, weekDates[0].date, weekDates[weekDates.length - 1].date)
        .filter((date) => !excludedDates.includes(date))
        .map((date) => ({
          ...session,
          date,
          startTime: rule.startTime || session.startTime,
          endTime: rule.endTime || session.endTime,
          occurrenceId: `${session.id}@${date}`,
          isRecurring: true,
          recurrenceSummary: session.repeatSummary || recurrenceSummary(rule),
        }));
    });
    return (
      <div className="overflow-x-auto">
        <div className="min-w-[1124px]">
          <div className="grid grid-cols-[48px_88px_repeat(6,minmax(150px,1fr))] gap-2">
            <div className="sticky left-0 z-20 rounded-md bg-background p-1 text-center text-xs font-semibold text-muted-foreground">
              Faculty
            </div>
            <div className="sticky left-14 z-10 rounded-md bg-background p-1 text-center text-xs font-semibold text-muted-foreground">
              Time Slot
            </div>
            {weekDates.map(({ day, date }) => (
              <div key={date} className="rounded-md bg-muted/60 p-2 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide">{day}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(date)}</p>
              </div>
            ))}
            <div
              className="sticky left-0 z-20 row-span-4 flex items-center justify-center self-stretch rounded-md bg-background px-1 text-center text-xs font-medium text-muted-foreground [writing-mode:vertical-rl] rotate-180"
              title={facultyName}
              aria-label={`Faculty: ${facultyName}`}
            >
              {facultyName}
            </div>
            {facultySlots.map((slot) => {
              const { startTime: start, endTime } = slotTimes(slot);
              return (
                <div key={slot} className="contents">
                  <button
                    type="button"
                    className="sticky left-14 z-10 flex min-h-16 flex-col items-center justify-center gap-0 rounded-md bg-background px-0 py-1 text-center text-[11px] font-medium leading-tight text-muted-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Edit time slot ${displayTime(start)} to ${displayTime(endTime)}`}
                    title="Click to change this time slot"
                    onClick={() =>
                      setEditingSlotTiming({ slot, startTime: start, endTime, facultyName })
                    }
                  >
                    <span>{displayTime(start)}</span>
                    <span>{displayTime(endTime)}</span>
                  </button>
                  {weekDates.map(({ day, date, weekday }) => {
                    const classes = expandedSessions
                      .filter((scheduledClass) => {
                        const courseCode = COURSES.find(
                          (course) => course.name === scheduledClass.course,
                        )?.code;
                        const category = SCHEDULE_CATEGORIES.find(
                          (item) => item.label === scheduleCategory,
                        );
                        return (
                          scheduledClass.date === date &&
                          scheduledClass.startTime < endTime &&
                          scheduledClass.endTime > start &&
                          scheduledClass.facultyName === facultyName &&
                          (scheduledClass.scheduleCategory === scheduleCategory ||
                            courseCode?.startsWith(category?.codePrefix ?? ""))
                        );
                      })
                      .sort((first, second) =>
                        String(first.studentName).localeCompare(String(second.studentName)),
                      );
                    const scheduledTasks = tasks.rows.filter(
                      (task) =>
                        task.workflowStatus !== "Draft" &&
                        task.assignee === facultyName &&
                        task.date === date &&
                        task.startTime < endTime &&
                        task.endTime > start,
                    );
                    return (
                      <div key={date} className="min-h-20 rounded-lg">
                        {classes.length || scheduledTasks.length ? (
                          <div className="space-y-1">
                            {scheduledTasks.map((task) => (
                              <div
                                key={task.id}
                                className="w-full rounded-lg border border-[#F5C26B] bg-[#FFF4D6] p-2 text-left text-xs text-[#7C4A03]"
                              >
                                <span className="block font-semibold">Task: {task.title}</span>
                                {task.deadline && (
                                  <span className="block">Deadline: {fmtDate(task.deadline)}</span>
                                )}
                              </div>
                            ))}
                            {classes.map((scheduledClass) =>
                              (() => {
                                const collisionRows = expandedSessions
                                  .filter((session) => session.date === date)
                                  .map((session) => ({ ...session, id: session.occurrenceId }));
                                const hasClassConflict = !!scheduleConflict(collisionRows, {
                                  ...scheduledClass,
                                  id: scheduledClass.occurrenceId,
                                });
                                const hasTaskConflict = tasks.rows.some(
                                  (task) =>
                                    task.workflowStatus !== "Draft" &&
                                    task.assignee === facultyName &&
                                    task.date === date &&
                                    task.startTime < scheduledClass.endTime &&
                                    task.endTime > scheduledClass.startTime,
                                );
                                const hasWarning = hasClassConflict || hasTaskConflict;
                                const courseCode = COURSES.find(
                                  (course) => course.name === scheduledClass.course,
                                )?.code;
                                const categoryLabel =
                                  scheduledClass.scheduleCategory ??
                                  SCHEDULE_CATEGORIES.find((item) =>
                                    courseCode?.startsWith(item.codePrefix),
                                  )?.label;
                                const approved =
                                  scheduledClass.academicApprovalStatus === "Approved";
                                const classTone = approved
                                  ? "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted/60"
                                  : categoryLabel === "Multimedia"
                                    ? "border-[#A7E8D0] bg-[#E8F8F2] text-[#164E63] hover:bg-[#D8F2E9]"
                                    : categoryLabel === "Accounts"
                                      ? "border-[#8ECFC2] bg-[#E8F8F2] text-[#164E63] hover:bg-[#D8F2E9]"
                                      : categoryLabel === "Management"
                                        ? "border-[#CBD5E1] bg-[#F1F5F7] text-[#475569] hover:bg-[#E2E8F0]"
                                        : "border-[#8ECFC2] bg-[#E8F8F2] text-[#164E63] hover:bg-[#D8F2E9]";
                                const recurrenceRule = scheduledClass.recurrenceRule as
                                  RecurrenceRule | undefined;
                                const scheduleEndDate =
                                  recurrenceRule?.ends.type === "onDate"
                                    ? recurrenceRule.ends.date
                                    : String(
                                        scheduledClass.scheduleEndDate ??
                                          (recurrenceRule?.ends.type === "never"
                                            ? "No end date"
                                            : scheduledClass.date),
                                      );
                                return (
                                  <button
                                    key={scheduledClass.occurrenceId}
                                    type="button"
                                    onClick={() => setClassDetails(scheduledClass)}
                                    title={[
                                      scheduledClass.academicApprovalStatus === "Approved"
                                        ? "Approved by Academic team"
                                        : "Pending Academic team approval",
                                      scheduledClass.isRecurring
                                        ? String(scheduledClass.recurrenceSummary)
                                        : "",
                                    ]
                                      .filter(Boolean)
                                      .join(" · ")}
                                    className={`w-full rounded-lg border p-2 text-left text-xs transition-colors ${hasWarning ? "border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100" : classTone}`}
                                  >
                                    <span
                                      className={`flex items-center gap-1 font-semibold ${approved ? "text-foreground" : ""}`}
                                    >
                                      {scheduledClass.isRecurring && (
                                        <Repeat
                                          className="h-3 w-3 shrink-0"
                                          aria-label="Recurring event"
                                        />
                                      )}
                                      {hasWarning && (
                                        <TriangleAlert
                                          className="h-3 w-3 shrink-0 text-amber-600"
                                          aria-label="Schedule conflict"
                                        />
                                      )}
                                      {String(scheduledClass.course ?? "—")}
                                    </span>
                                    <span
                                      className={`block font-normal ${approved ? "text-muted-foreground" : "opacity-80"}`}
                                    >
                                      {scheduledClass.facultyName}
                                    </span>
                                    <span
                                      className={`block font-normal ${approved ? "text-muted-foreground" : "opacity-80"}`}
                                    >
                                      Ends:{" "}
                                      {scheduleEndDate === "No end date"
                                        ? scheduleEndDate
                                        : fmtDate(scheduleEndDate)}
                                    </span>
                                  </button>
                                );
                              })(),
                            )}
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-full min-h-20 w-full border-dashed text-muted-foreground"
                            aria-label={`Add class ${facultyName} ${weekday} ${start}`}
                            onClick={() => openClassForm(date, weekday, slot, facultyName)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };
  const saveScheduledClass = (
    value: Row,
    status: string,
    scope?: "single" | "following" | "all",
  ) => {
    const validationErrors = validateFields(classFields, value);
    if (Object.keys(validationErrors).length) {
      toast.error(Object.values(validationErrors)[0]);
      return false;
    }
    const existingRecord = scheduledClasses.rows.find(
      (scheduledClass) => scheduledClass.id === value.id,
    );
    const existingRule = existingRecord?.recurrenceRule as RecurrenceRule | undefined;
    if (existingRule && !scope) {
      setPendingRecurringSave({ value, status });
      return false;
    }
    const record: Row = {
      ...value,
      facultyName: String(value.facultyName ?? departmentFaculty),
      academicApprovalStatus:
        existingRecord?.academicApprovalStatus === "Approved" ? "Approved" : "Pending",
      status,
    };
    delete record.totalDuration;
    delete record.occurrenceId;
    delete record.isRecurring;
    const savedPlan = value.schedulePlan as SchedulePlan | undefined;
    if (savedPlan) {
      const totalSessions = Number(value.totalSessions);
      if (!Number.isInteger(totalSessions) || totalSessions < 1) {
        toast.error("Enter a positive whole number of sessions");
        return false;
      }
      const classId = String(existingRecord?.classId ?? existingRecord?.id ?? record.id);
      const today = isoDate(new Date());
      const matchingRows = scheduledClasses.rows.filter(
        (session) =>
          session.classId === classId || (existingRecord && session.id === existingRecord.id),
      );
      const preservedRows = matchingRows.filter(
        (session) => session.status === "Completed" || String(session.date) <= today,
      );
      if (
        preservedRows.filter((session) => session.status === "Completed").length > totalSessions
      ) {
        toast.error("Total Sessions cannot be fewer than completed sessions.");
        return false;
      }
      const remainingSessions = Math.max(0, totalSessions - preservedRows.length);
      const futureStart = new Date(`${today}T12:00:00`);
      futureStart.setDate(futureStart.getDate() + 1);
      const futureStartDate = isoDate(futureStart);
      const generationStart =
        matchingRows.length > 0 && savedPlan.startDate < futureStartDate
          ? futureStartDate
          : savedPlan.startDate;
      const generated = remainingSessions
        ? buildSchedule({
            startDate: generationStart,
            daysOfWeek: savedPlan.daysOfWeek,
            totalSessions: remainingSessions,
            holidays: settings.holidays,
            unavailable: savedPlan.unavailableDates,
          })
        : { sessions: [], endDate: "", weeks: 0, skippedDates: [], lastWeekSessions: 0 };
      if (remainingSessions > 0 && generated.sessions.length === 0) {
        toast.error("No available class dates remain in the selected schedule range.");
        return false;
      }
      const preservedDates = new Set(preservedRows.map((session) => String(session.date)));
      const newDates = generated.sessions.filter((date) => !preservedDates.has(date));
      const scheduleDates = [...new Set([...preservedDates, ...newDates])].sort();
      const endDate = scheduleDates.at(-1) ?? savedPlan.startDate;
      const classSchedule = {
        classId,
        academicApprovalStatus: record.academicApprovalStatus,
        subjectId: String(record.course ?? ""),
        studentId: Array.isArray(record.admissionNumbers)
          ? String(record.admissionNumbers[0] ?? "")
          : String(record.admissionNumber ?? ""),
        totalSessions,
        startDate: savedPlan.startDate,
        endDate,
        daysOfWeek: savedPlan.daysOfWeek,
        holidayDates: settings.holidays,
        unavailableDates: savedPlan.unavailableDates,
        sessions: scheduleDates.map((date) => ({
          date,
          status: matchingRows.find((session) => session.date === date)?.status ?? "Scheduled",
        })),
      };
      const finalPlan: SchedulePlan = {
        ...savedPlan,
        ...generated,
        sessions: scheduleDates,
        endDate,
        totalSessions,
        holidayDates: settings.holidays,
        endMode: "afterSessions",
        selectedEndDate: endDate,
      };
      const ownIds = new Set(matchingRows.map((session) => String(session.id)));
      const batchId = String(record.batchId ?? record.batch ?? classId);
      const facultyId = String(record.facultyId ?? record.facultyName ?? departmentFaculty);
      const courseId = String(record.courseId ?? record.course ?? "");
      const moduleId = String(record.moduleId ?? record.module ?? "");
      const additions = newDates.map((date) => {
        const dateObject = new Date(`${date}T12:00:00`);
        return {
          ...record,
          id: `${classId}-S${date.replaceAll("-", "")}`,
          scheduleId: classId,
          batchId,
          facultyId,
          courseId,
          moduleId: moduleId || courseId,
          classId,
          scheduleCategory,
          subjectId: courseId,
          studentId: classSchedule.studentId,
          date,
          weekday: weekdayName(dateObject),
          recurrenceStartDate: savedPlan.startDate,
          recurrenceEndDate: endDate,
          recurrenceConfiguration: {
            daysOfWeek: [...savedPlan.daysOfWeek],
            startDate: savedPlan.startDate,
            endDate,
            totalSessions,
          },
          day: weekdayName(dateObject).slice(0, 3),
          totalSessions,
          scheduleStartDate: savedPlan.startDate,
          scheduleEndDate: endDate,
          daysOfWeek: savedPlan.daysOfWeek,
          schedulePlan: finalPlan,
          classSchedule,
          scheduleGenerated: true,
          repeatType: "custom",
          repeatSummary: schedulePlanSummary(finalPlan),
          status,
        };
      });
      for (const candidate of additions) {
        const conflict = scheduleConflict(
          scheduledSessionsOnDate(String(candidate.date)).filter(
            (session) => !ownIds.has(String(session.seriesId ?? session.id)),
          ),
          candidate,
        );
        if (conflict) {
          toast.error(`${fmtDate(String(candidate.date))}: ${conflict}`);
          return false;
        }
      }
      const preservedIds = new Set(preservedRows.map((session) => String(session.id)));
      matchingRows
        .filter((session) => !preservedIds.has(String(session.id)))
        .forEach((session) => scheduledClasses.remove(String(session.id)));
      preservedRows.forEach((session) =>
        scheduledClasses.update(String(session.id), {
          classSchedule,
          schedulePlan: finalPlan,
          totalSessions,
          scheduleStartDate: savedPlan.startDate,
          scheduleEndDate: endDate,
          daysOfWeek: savedPlan.daysOfWeek,
        }),
      );
      additions.forEach((session) => scheduledClasses.add(session));
      const courseCode = COURSES.find((course) => course.name === record.course)?.code;
      const category = SCHEDULE_CATEGORIES.find((item) => courseCode?.startsWith(item.codePrefix));
      if (category) setScheduleCategory(category.label);
      toast.success(
        matchingRows.length
          ? `Schedule updated · ${additions.length} future sessions generated`
          : `${additions.length} sessions scheduled`,
      );
      setClassForm(null);
      return true;
    }
    const recurrenceRule = value.recurrenceRule as RecurrenceRule | undefined;
    if (recurrenceRule) {
      const savedRule: RecurrenceRule = {
        ...recurrenceRule,
        startDate: String(recurrenceRule.startDate || value.date),
        startTime: String(value.startTime),
        endTime: String(value.endTime),
      };
      record.recurrenceRule = savedRule;
      record.rrule = recurrenceRuleToRRule(savedRule);
      record.repeatSummary = recurrenceSummary(savedRule);
      record.scheduleId = String(existingRecord?.classId ?? existingRecord?.id ?? record.id);
      record.batchId = String(record.batchId ?? record.batch ?? record.scheduleId);
      record.facultyId = String(record.facultyId ?? record.facultyName ?? departmentFaculty);
      record.courseId = String(record.courseId ?? record.course ?? "");
      record.moduleId = String(record.moduleId ?? record.module ?? record.courseId);
      record.weekday = weekdayName(new Date(`${savedRule.startDate}T12:00:00`));
      record.recurrenceStartDate = savedRule.startDate;
      record.recurrenceEndDate = savedRule.ends.type === "onDate" ? String(savedRule.ends.date) : "";
      record.date = savedRule.startDate;
    } else {
      delete record.recurrenceRule;
      delete record.rrule;
      record.repeatSummary = String(value.repeatSummary ?? "Does not repeat");
    }
    delete record.studentName;
    delete record.admissionNumber;
    const conflictDates =
      existingRule && scope && (scope === "single" || scope === "following")
        ? [String(value.date)]
        : recurrenceRule
          ? expandRecurrenceRule(
              recurrenceRule,
              recurrenceRule.startDate,
              recurrenceRule.ends.type === "onDate"
                ? recurrenceRule.ends.date
                : `${Number(recurrenceRule.startDate.slice(0, 4)) + 5}${recurrenceRule.startDate.slice(4)}`,
            )
          : [String(record.date)];
    for (const conflictDate of conflictDates) {
      const conflictRows = scheduledSessionsOnDate(conflictDate).filter(
        (session) => !existingRecord || session.seriesId !== String(existingRecord.id),
      );
      const conflict = scheduleConflict(conflictRows, {
        ...record,
        date: conflictDate,
        id: `${record.id}@${conflictDate}`,
      });
      if (conflict) {
        toast.error(`${fmtDate(conflictDate)}: ${conflict}`);
        return false;
      }
    }
    if (existingRule && existingRecord && scope) {
      const instanceDate = String(value.date);
      if (scope === "single") {
        const excludedDates = Array.isArray(existingRecord.excludedDates)
          ? existingRecord.excludedDates.map(String)
          : [];
        scheduledClasses.update(existingRecord.id, {
          excludedDates: [...new Set([...excludedDates, instanceDate])],
        });
        const singleRecord = {
          ...record,
          id: scheduledClasses.nextId("CLS"),
          date: instanceDate,
          repeatType: "none",
          repeatSummary: "Does not repeat",
        };
        delete singleRecord.recurrenceRule;
        delete singleRecord.rrule;
        delete singleRecord.excludedDates;
        scheduledClasses.add(singleRecord);
        toast.success("This session was updated");
      } else if (scope === "following" && instanceDate > existingRule.startDate) {
        const cutoff = new Date(`${instanceDate}T12:00:00`);
        cutoff.setDate(cutoff.getDate() - 1);
        const cutoffDate = isoDate(cutoff);
        const previousRule: RecurrenceRule = {
          ...existingRule,
          ends: { type: "onDate", date: cutoffDate, count: 13 },
        };
        scheduledClasses.update(existingRecord.id, {
          recurrenceRule: previousRule,
          rrule: recurrenceRuleToRRule(previousRule),
          repeatSummary: recurrenceSummary(previousRule),
          excludedDates: (Array.isArray(existingRecord.excludedDates)
            ? existingRecord.excludedDates
            : []
          ).filter((date) => String(date) < instanceDate),
        });
        const followingRecord = {
          ...record,
          id: scheduledClasses.nextId("CLS"),
          date: instanceDate,
        };
        if (recurrenceRule) {
          const followingRule: RecurrenceRule = {
            ...(record.recurrenceRule as RecurrenceRule),
            startDate: instanceDate,
          };
          followingRecord.recurrenceRule = followingRule;
          followingRecord.rrule = recurrenceRuleToRRule(followingRule);
          followingRecord.repeatSummary = recurrenceSummary(followingRule);
        } else {
          delete followingRecord.recurrenceRule;
          delete followingRecord.rrule;
        }
        delete followingRecord.excludedDates;
        scheduledClasses.add(followingRecord);
        toast.success("This and following sessions were updated");
      } else {
        scheduledClasses.update(existingRecord.id, { ...record, id: existingRecord.id });
        toast.success("All sessions were updated");
      }
    } else if (existingRecord) {
      scheduledClasses.update(value.id, { ...record, id: existingRecord.id });
      toast.success(
        status === "Scheduled" ? "Class updated" : `Class saved as ${status.toLowerCase()}`,
      );
    } else {
      scheduledClasses.add(record);
      toast.success(
        status === "Scheduled"
          ? "Class added to timetable"
          : `Class saved as ${status.toLowerCase()}`,
      );
    }
    const courseCode = COURSES.find((course) => course.name === record.course)?.code;
    const category = SCHEDULE_CATEGORIES.find((item) => courseCode?.startsWith(item.codePrefix));
    if (category) setScheduleCategory(category.label);
    setClassForm(null);
    return true;
  };
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[28px] font-bold tracking-tight text-foreground">
          Batch &amp; Timing Management
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Course batches, schedules, rooms and capacity.
        </p>
      </div>
      <UrgentClassesPredictionCard className="es-ai-card-wide" />
      <Panel className="overflow-hidden">
        <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Course categories">
          {SCHEDULE_CATEGORIES.map((category) => {
            const active = scheduleCategory === category.label;
            const categoryColors: Record<
              string,
              {
                active: { borderColor: string; backgroundColor: string; color: string };
                inactive: { borderColor: string; backgroundColor: string; color: string };
              }
            > = {
              AI: {
                active: { borderColor: "#236b78", backgroundColor: "#236b78", color: "#fff" },
                inactive: { borderColor: "#a7e8d0", backgroundColor: "#e8f8f2", color: "#164e63" },
              },
              Multimedia: {
                active: { borderColor: "#2a9d8f", backgroundColor: "#2a9d8f", color: "#fff" },
                inactive: { borderColor: "#a9dcd5", backgroundColor: "#e5f5f4", color: "#1e655f" },
              },
              Accounts: {
                active: { borderColor: "#368b79", backgroundColor: "#368b79", color: "#fff" },
                inactive: { borderColor: "#b8dfc7", backgroundColor: "#edf7f0", color: "#356b55" },
              },
              Management: {
                active: { borderColor: "#527f9f", backgroundColor: "#527f9f", color: "#fff" },
                inactive: { borderColor: "#b9d5df", backgroundColor: "#ebf4f7", color: "#3d6078" },
              },
            };
            const colors = categoryColors[category.label];
            return (
              <button
                key={category.label}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setScheduleCategory(category.label)}
                style={active ? colors.active : colors.inactive}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${active ? "font-bold" : "font-medium"}`}
              >
                {category.label}
              </button>
            );
          })}
        </div>
        {prediction ? (
          <div className="mb-4">
            <AIPredictionCard
              department={scheduleCategory}
              currentModule={prediction.currentModule}
              completedSessions={prediction.completedSessions}
              totalSessions={prediction.totalSessions}
              nextModule={prediction.nextModule}
              nextStartDate={nextStartDate}
              suggestedDays={suggestedDays || "Check availability"}
              suggestedTime={`${prediction.startTime} – ${prediction.endTime}`}
              batchPattern={batchPattern}
              status={prediction.status}
            />
          </div>
        ) : (
          <div className="mb-4 rounded-[14px] border border-[#A7E8D0] bg-[#E8F8F2] p-4 text-sm text-[#64748B]">
            Insufficient data to generate a reliable prediction for {scheduleCategory}. An active
            course batch with planned weekly sessions is required.
          </div>
        )}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{weekLabel}</p>
            <p className="text-xs text-muted-foreground">Monday–Saturday until 6:00 PM</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => changeWeek(-1)}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Previous week
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => changeWeek(1)}>
              Next week
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>
        {renderCalendar(departmentFaculty)}
      </Panel>

      {scheduleCategory === "AI" && (
        <Panel title="Shruthi (AI) Calendar" className="overflow-hidden">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{weekLabel}</p>
              <p className="text-xs text-muted-foreground">Monday–Saturday until 6:00 PM</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => changeWeek(-1)}>
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Previous week
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => changeWeek(1)}>
                Next week
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>
          {renderCalendar("Shruthi (AI)")}
        </Panel>
      )}

      <Dialog
        open={!!editingSlotTiming}
        onOpenChange={(open) => !open && setEditingSlotTiming(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Time Slot · {editingSlotTiming?.facultyName}</DialogTitle>
            <DialogDescription>
              This change applies only to this faculty calendar.
            </DialogDescription>
          </DialogHeader>
          {editingSlotTiming && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-sm font-medium">
                  Start Time
                  <Input
                    type="time"
                    value={editingSlotTiming.startTime}
                    onChange={(event) =>
                      setEditingSlotTiming((current) =>
                        current ? { ...current, startTime: event.target.value } : current,
                      )
                    }
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  End Time
                  <Input
                    type="time"
                    value={editingSlotTiming.endTime}
                    onChange={(event) =>
                      setEditingSlotTiming((current) =>
                        current ? { ...current, endTime: event.target.value } : current,
                      )
                    }
                  />
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingSlotTiming(null)}>
                  Cancel
                </Button>
                <Button type="button" onClick={saveSlotTiming}>
                  Save Time Slot
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showRecommendation} onOpenChange={setShowRecommendation}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule Recommendation · {scheduleCategory}</DialogTitle>
          </DialogHeader>
          {prediction && (
            <div className="space-y-3 text-sm">
              <p>
                <span className="text-muted-foreground">Current module:</span>{" "}
                {prediction.currentModule}
              </p>
              <p>
                <span className="text-muted-foreground">Estimated completion:</span>{" "}
                {fmtDate(prediction.completionDate)} · {prediction.remainingSessions} session
                {prediction.remainingSessions === 1 ? "" : "s"} remaining
              </p>
              <p>
                <span className="text-muted-foreground">Recommended next module:</span>{" "}
                {prediction.nextModule}
              </p>
              <p>
                <span className="text-muted-foreground">Suggested session:</span>{" "}
                {recommendationDate
                  ? `${fmtDate(recommendationDate)}, ${displayTime(prediction.startTime)}–${displayTime(prediction.endTime)}`
                  : "No conflict-free date found in the next two scheduled sessions."}
              </p>
              <p>
                <span className="text-muted-foreground">Faculty:</span> {departmentFaculty} ·{" "}
                {recommendationConflict ??
                  (recommendationDate
                    ? "No faculty, batch, or room conflict found."
                    : "Availability could not be confirmed.")}
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRecommendation(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={!canConfirmRecommendation}
                  onClick={confirmRecommendation}
                >
                  Confirm Schedule
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <FormDialog
        open={!!classForm}
        onOpenChange={(open) => !open && setClassForm(null)}
        hideCancel
        title={
          scheduledClasses.rows.some((scheduledClass) => scheduledClass.id === classForm?.id)
            ? "Edit Scheduled Class"
            : "Add Class"
        }
        wide
        enterMovesNext
        fields={classFields}
        initial={classForm ?? {}}
        onSubmit={(value) => saveScheduledClass(value, "Scheduled")}
        submitDisabled={(values) =>
          !values.course ||
          !Array.isArray(values.admissionNumbers) ||
          values.admissionNumbers.length === 0 ||
          values.totalSessions === "" ||
          values.totalSessions === undefined ||
          values.totalSessions === null
        }
        submitLabel="Add Class"
      >
        {() => (
          <Button type="button" data-enter-navigation variant="outline" onClick={openTaskForm}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Task
          </Button>
        )}
      </FormDialog>

      <Dialog
        open={!!pendingRecurringSave}
        onOpenChange={(open) => !open && setPendingRecurringSave(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update recurring sessions</DialogTitle>
            <DialogDescription>Choose which sessions should use these changes.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {(
              [
                ["single", "This session"],
                ["following", "This and following sessions"],
                ["all", "All sessions"],
              ] as const
            ).map(([scope, label]) => (
              <Button
                key={scope}
                type="button"
                variant="outline"
                className="justify-start"
                onClick={() => {
                  if (!pendingRecurringSave) return;
                  const saved = saveScheduledClass(
                    pendingRecurringSave.value,
                    pendingRecurringSave.status,
                    scope,
                  );
                  if (saved) setPendingRecurringSave(null);
                }}
              >
                {label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <FormDialog
        open={!!taskForm}
        onOpenChange={(open) => !open && setTaskForm(null)}
        hideCancel
        title="Add Task"
        description={`Task will be assigned to ${taskForm?.assignee ?? departmentFaculty} for the selected date.`}
        fields={taskFields}
        initial={taskForm ?? {}}
        onSubmit={saveTask}
        submitLabel="Add Task"
        wide
        enterMovesNext
      />

      <Dialog open={!!classDetails} onOpenChange={(open) => !open && setClassDetails(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{classDetails?.course} · Scheduled Class</DialogTitle>
          </DialogHeader>
          {classDetails && (
            <>
              <KV
                items={[
                  ["Student Name", classStudentNames(classDetails)],
                  ["Subject", classDetails.course],
                  ["Faculty Name", classDetails.facultyName],
                  ["Total Sessions", classDetails.totalSessions ?? 1],
                  [
                    "Repeat",
                    classDetails.recurrenceRule
                      ? recurrenceSummary(classDetails.recurrenceRule as RecurrenceRule)
                      : String(classDetails.repeatSummary ?? "Does not repeat"),
                  ],
                ]}
              />
              <div className="flex justify-end gap-2 border-t pt-3">
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDeletingClass(classDetails);
                    setClassDetails(null);
                  }}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Delete Class
                </Button>
                <Button
                  onClick={() => {
                    const studentNames = Array.isArray(classDetails.studentNames)
                      ? classDetails.studentNames
                      : [classDetails.studentName];
                    const admissionNumbers = Array.isArray(classDetails.admissionNumbers)
                      ? classDetails.admissionNumbers
                      : [classDetails.admissionNumber];
                    setClassForm({
                      ...classDetails,
                      studentNames,
                      admissionNumbers,
                      timeSlot: `${classDetails.startTime} – ${classDetails.endTime}`,
                      totalSessions: classDetails.totalSessions ?? 1,
                      repeatType:
                        classDetails.repeatType ??
                        (classDetails.recurrenceRule ? "custom" : "none"),
                      repeatSummary:
                        classDetails.repeatSummary ??
                        (classDetails.recurrenceRule
                          ? recurrenceSummary(classDetails.recurrenceRule as RecurrenceRule)
                          : "Does not repeat"),
                    });
                    setClassDetails(null);
                  }}
                >
                  <Pencil className="mr-1.5 h-4 w-4" />
                  Edit Class
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!deletingClass}
        onOpenChange={(open) => !open && setDeletingClass(null)}
        destructive
        title="Delete scheduled class?"
        description={`Delete ${deletingClass?.course} class? This cannot be undone.`}
        confirmLabel="Delete Class"
        onConfirm={() => {
          if (!deletingClass) return;
          const recurrenceRule = deletingClass.recurrenceRule as RecurrenceRule | undefined;
          if (deletingClass.isRecurring && recurrenceRule && deletingClass.date) {
            const targetId = String(deletingClass.id);
            const existing = scheduledClasses.rows.find((session) => String(session.id) === targetId);
            if (existing) {
              const excludedDates = Array.isArray(existing.excludedDates)
                ? existing.excludedDates.map(String)
                : [];
              scheduledClasses.update(targetId, {
                excludedDates: [...new Set([...excludedDates, String(deletingClass.date)])],
              });
            }
          } else {
            const ids = new Set(relatedScheduledClassIds(scheduledClasses.rows, deletingClass));
            ids.forEach((id) => scheduledClasses.remove(id));
          }
          toast.success("Scheduled class deleted");
          setClassDetails(null);
          setDeletingClass(null);
        }}
      />

      <FormDialog
        open={!!form}
        onOpenChange={(o) => !o && setForm(null)}
        hideCancel
        title={form?.id ? `Edit ${form.name}` : "Create Batch"}
        wide
        enterMovesNext
        fields={[...fields, ...(form?.id ? [] : timingFields)]}
        initial={form ?? {}}
        onSubmit={save}
      >
        {DayPicker}
      </FormDialog>
      <FormDialog
        open={!!timing}
        onOpenChange={(o) => !o && setTiming(null)}
        hideCancel
        title={`Manage Timing · ${timing?.name ?? ""}`}
        fields={timingFields}
        initial={timing ?? {}}
        onSubmit={save}
        submitLabel="Update Timing"
      >
        {DayPicker}
      </FormDialog>

      <Dialog open={!!details} onOpenChange={(o) => !o && setDetails(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {details?.name}{" "}
              <span className="font-mono text-xs text-muted-foreground">{details?.id}</span>
            </DialogTitle>
          </DialogHeader>
          {details && (
            <>
              <KV
                items={[
                  ["Subject", details.course],
                  ["Status", <StatusBadge key="s" status={details.status} />],
                  ["Start Date", fmtDate(details.startDate)],
                  ["End Date", fmtDate(details.endDate)],
                  ["Days", details.days.join(", ")],
                  ["Timing", `${details.startTime} – ${details.endTime}`],
                  ["Instructor", details.instructor],
                  ["Room / Lab", details.room],
                ]}
              />
              <p className="mt-4 text-xs font-semibold uppercase text-muted-foreground">
                Students in this batch
              </p>
              <ul className="mt-2 divide-y rounded-md border text-sm">
                {enrolled(details.name).map((a) => (
                  <li key={a.appNo} className="flex items-center justify-between px-3 py-2">
                    <span>
                      <span className="font-medium">{a.name}</span>{" "}
                      <span className="font-mono text-xs text-muted-foreground">{a.regNo}</span>
                    </span>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
                {!enrolled(details.name).length && (
                  <li className="px-3 py-4 text-center text-muted-foreground">
                    No students assigned yet
                  </li>
                )}
              </ul>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setTiming(details);
                    setDetails(null);
                  }}
                >
                  <Clock className="mr-1.5 h-4 w-4" />
                  Manage Timing
                </Button>
                <Button
                  onClick={() => {
                    setForm(details);
                    setDetails(null);
                  }}
                >
                  <Pencil className="mr-1.5 h-4 w-4" />
                  Edit Batch
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
