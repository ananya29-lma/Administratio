import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog, FormDialog, KV, PageHeader, Panel, StatusBadge, validateFields, type Field } from "@/components/app/kit";
import { useCollection, useStore } from "@/lib/store";
import { COURSE_OPTION_GROUPS, COURSES, STAFF, type Row } from "@/lib/mock";
import { fmtDate } from "@/lib/format";
import { scheduleConflict } from "@/lib/administration";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/batches")({
  head: pageHead("Batch & Timing Management", "Create batches, assign timings and view weekly schedules."),
  component: Batches,
});

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIMETABLE_DAYS = DAYS.slice(0, 6);
const TIMETABLE_SLOTS = ["09:00 – 11:00", "11:00 – 13:00", "13:00 – 14:00", "14:00 – 16:00", "16:00 – 18:00"];
const STATUSES = ["Upcoming", "Active", "Completed"];
const SCHEDULE_CATEGORIES = [
  { label: "AI", codePrefix: "AI", style: "border-sky-500 bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-100" },
  { label: "Multimedia", codePrefix: "MM", style: "border-violet-500 bg-violet-50 text-violet-900 dark:bg-violet-950/40 dark:text-violet-100" },
  { label: "Accounts", codePrefix: "AC", style: "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100" },
  { label: "Management", codePrefix: "MG", style: "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100" },
];
const FACULTY_CARD_STYLES = [
  "border-sky-300 bg-sky-50 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/40 dark:hover:bg-sky-950/60",
  "border-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60",
  "border-amber-300 bg-amber-50 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:hover:bg-amber-950/60",
  "border-violet-300 bg-violet-50 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/40 dark:hover:bg-violet-950/60",
];

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

function displayTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const suffix = hour < 12 ? "AM" : "PM";
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function weekdayName(date: Date) {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()];
}

function Batches() {
  const b = useCollection("batches", "id");
  const scheduledClasses = useCollection("scheduledClasses", "id");
  const { data } = useStore();
  const [form, setForm] = useState<Row | null>(null);
  const [timing, setTiming] = useState<Row | null>(null);
  const [details, setDetails] = useState<Row | null>(null);
  const [weekOffsets, setWeekOffsets] = useState<Record<string, number>>({});
  const [classForm, setClassForm] = useState<Row | null>(null);
  const [classDetails, setClassDetails] = useState<Row | null>(null);
  const [deletingClass, setDeletingClass] = useState<Row | null>(null);
  const [scheduleCategory, setScheduleCategory] = useState(SCHEDULE_CATEGORIES[0].label);
  const weekOffset = weekOffsets[scheduleCategory] ?? 0;
  const changeWeek = (amount: number) => {
    setWeekOffsets((offsets) => ({
      ...offsets,
      [scheduleCategory]: (offsets[scheduleCategory] ?? 0) + amount,
    }));
  };
  const enrolled = (name: string) => data.admissions.filter((a) => a.batch === name && a.status !== "Rejected");
  const startOfWeek = weekStart(weekOffset);
  const weekDates = TIMETABLE_DAYS.map((day, index) => {
    const date = new Date(startOfWeek);
    date.setDate(date.getDate() + index);
    return { day, date: isoDate(date), weekday: weekdayName(date) };
  });
  const weekLabel = `${fmtDate(weekDates[0].date)} – ${fmtDate(weekDates[5].date)}`;

  const fields: Field[] = [
    { name: "name", label: "Batch Name", required: true },
    { name: "course", label: "Course Name", type: "select", optionGroups: COURSE_OPTION_GROUPS, required: true },
    { name: "startDate", label: "Batch Start Date", type: "date", required: true },
    { name: "endDate", label: "Batch End Date", type: "date", required: true, validate: (v, all) => (v && all.startDate && v < all.startDate ? "End date must be after start date" : undefined) },
    { name: "instructor", label: "Instructor", required: true },
    { name: "room", label: "Room or Lab", required: true },
    { name: "capacity", label: "Maximum Capacity", type: "number", required: true, validate: (v) => (v <= 0 ? "Capacity must be greater than 0" : undefined) },
    { name: "status", label: "Batch Status", type: "select", options: STATUSES, required: true },
  ];
  const timingFields: Field[] = [
    { name: "startTime", label: "Start Time", type: "time", required: true },
    { name: "endTime", label: "End Time", type: "time", required: true, validate: (v, all) => (v && all.startTime && v <= all.startTime ? "End time must be after start time" : undefined) },
  ];
  const classFields: Field[] = [
    {
      name: "course",
      label: "Subject",
      type: "select",
      optionGroups: COURSE_OPTION_GROUPS,
      modalPicker: true,
      modalTitle: "Select Course",
      modalDescription: "Choose the course for this class.",
      searchPlaceholder: "Search course names",
      showOptionValue: false,
      placeholder: "Select a course…",
      emptyMessage: "No courses available.",
      required: true,
      onChange: () => ({ studentNames: [], admissionNumbers: [] }),
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
      optionsFor: () => data.students.map((student) => student.regNo),
      optionLabelsFor: (values) => Object.fromEntries(
        data.students.map((student) => [student.regNo, student.name]),
      ),
      optionEnabledFor: (studentRegNo, values) => {
        const selectedCourse = String(values.course ?? "").trim().toLocaleLowerCase();
        return !!selectedCourse && data.students.some((student) =>
          student.regNo === studentRegNo && String(student.course ?? "").trim().toLocaleLowerCase() === selectedCourse,
        );
      },
      onChange: (admissionNumbers, values) => {
        const selectedNumbers = admissionNumbers as string[];
        const studentNames = data.students.filter((student) => selectedNumbers.includes(student.regNo)).map((student) => student.name);
        return { studentNames };
      },
    },
    {
      name: "facultyName",
      label: "Faculty Name",
      type: "select",
      options: STAFF,
      modalPicker: true,
      modalTitle: "Select Faculty",
      modalDescription: "Choose a faculty member for this class.",
      searchPlaceholder: "Search faculty names",
      showOptionValue: false,
      placeholder: "Select faculty…",
      emptyMessage: "No faculty available.",
      required: true,
    },
  ];
  const DayPicker = (v: Row, set: (v: Row) => void) => (
    <div className="space-y-1.5">
      <p className="text-xs font-medium">Days of the Week</p>
      <div className="flex flex-wrap gap-1.5">
        {DAYS.map((d) => { const on = v.days?.includes(d); return <Button key={d} type="button" size="sm" variant={on ? "default" : "outline"} onClick={() => set({ ...v, days: on ? v.days.filter((x: string) => x !== d) : [...(v.days ?? []), d] })}>{d}</Button>; })}
      </div>
    </div>
  );

  const save = (v: Row) => {
    if (!v.days?.length) { toast.error("Select at least one day of the week"); return; }
    if (v.id) { b.update(v.id, v); toast.success(`${v.name} updated`); return; }
    const code = COURSES.find((c) => c.name === v.course)?.code ?? "GEN";
    const id = `B-${code}-${Math.floor(Math.random() * 900 + 100)}`;
    b.add({ ...v, id, startTime: v.startTime || "09:00", endTime: v.endTime || "11:00" });
    toast.success(`Batch ${id} created`);
  };

  const openClassForm = (date: string, day: string, slot: string) => {
    const times = slotTimes(slot);
    setClassForm({
      id: scheduledClasses.nextId("CLS"),
      date,
      day,
      timeSlot: slot,
      ...times,
      batchType: "Full Week",
      classType: "Theory",
    });
  };
  const classStudentNames = (scheduledClass: Row) =>
    Array.isArray(scheduledClass.studentNames) ? scheduledClass.studentNames.join(", ") : scheduledClass.studentName;
  const saveScheduledClass = (value: Row, status: string) => {
    const validationErrors = validateFields(classFields, value);
    if (Object.keys(validationErrors).length) {
      toast.error(Object.values(validationErrors)[0]);
      return false;
    }
    const times = slotTimes(value.timeSlot);
    const record = { ...value, ...times, status };
    delete record.studentName;
    delete record.admissionNumber;
    const conflict = scheduleConflict(scheduledClasses.rows, record);
    if (conflict) {
      toast.error(conflict);
      return false;
    }
    const existing = scheduledClasses.rows.some((scheduledClass) => scheduledClass.id === value.id);
    if (existing) {
      scheduledClasses.update(value.id, record);
      toast.success(status === "Scheduled" ? "Class updated" : `Class saved as ${status.toLowerCase()}`);
    } else {
      scheduledClasses.add(record);
      toast.success(status === "Scheduled" ? "Class added to timetable" : `Class saved as ${status.toLowerCase()}`);
    }
    const courseCode = COURSES.find((course) => course.name === record.course)?.code;
    const category = SCHEDULE_CATEGORIES.find((item) => courseCode?.startsWith(item.codePrefix));
    if (category) setScheduleCategory(category.label);
    setClassForm(null);
    return true;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Batch & Timing Management" description="Course batches, schedules, rooms and capacity." />
      <Panel title="Weekly Schedule">
            <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Course categories">
              {SCHEDULE_CATEGORIES.map((category) => {
                const active = scheduleCategory === category.label;
                return (
                  <button
                    key={category.label}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setScheduleCategory(category.label)}
                    className={`rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${active ? category.style : "border-border bg-background text-muted-foreground hover:bg-muted"}`}
                  >
                    {category.label}
                  </button>
                );
              })}
            </div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{weekLabel}</p>
                <p className="text-xs text-muted-foreground">Monday–Saturday until 6:00 PM</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => changeWeek(-1)}><ArrowLeft className="mr-1.5 h-4 w-4" />Previous week</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => changeWeek(1)}>Next week<ArrowRight className="ml-1.5 h-4 w-4" /></Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[1050px]">
                <div className="grid grid-cols-[88px_repeat(6,minmax(150px,1fr))] gap-2">
                  <div className="sticky left-0 z-10 rounded-md bg-background p-2 text-center text-xs font-semibold text-muted-foreground">Time</div>
                  {weekDates.map(({ day, date }) => (
                    <div key={day} className="rounded-md bg-muted/60 p-2 text-center">
                      <p className="text-xs font-semibold uppercase tracking-wide">{day}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(date)}</p>
                    </div>
                  ))}
                  {TIMETABLE_SLOTS.map((slot) => {
                    const { startTime: start } = slotTimes(slot);
                    return (
                      <div key={slot} className="contents">
                        <div className="sticky left-0 z-10 flex min-h-20 items-start justify-center rounded-md bg-background py-3 text-xs font-medium text-muted-foreground">{displayTime(slotTimes(slot).startTime)} – {displayTime(slotTimes(slot).endTime)}</div>
                        {weekDates.map(({ day, date, weekday }) => {
                          if (start === "13:00") {
                            return <div key={day} className="flex min-h-20 items-center justify-center rounded-lg border border-dashed bg-amber-50 px-2 text-center text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">Lunch break · 1:00–2:00 PM</div>;
                          }
                          const classes = scheduledClasses.rows
                            .filter((scheduledClass) => {
                              const courseCode = COURSES.find((course) => course.name === scheduledClass.course)?.code;
                              const category = SCHEDULE_CATEGORIES.find((item) => item.label === scheduleCategory);
                              return scheduledClass.date === date
                                && scheduledClass.startTime === start
                                && courseCode?.startsWith(category?.codePrefix ?? "");
                            })
                            .sort((first, second) => String(first.studentName).localeCompare(String(second.studentName)));
                          return (
                            <div key={day} className="min-h-20 rounded-lg">
                              {classes.length ? (
                                <div className="space-y-1">
                                  {classes.map((scheduledClass) => (
                                    <button key={scheduledClass.id} type="button" onClick={() => setClassDetails(scheduledClass)} className={`w-full rounded-lg border p-2 text-left text-xs transition-colors ${FACULTY_CARD_STYLES[Math.max(0, STAFF.indexOf(scheduledClass.facultyName)) % FACULTY_CARD_STYLES.length]}`}>
                                      <span className="block font-semibold text-foreground">{scheduledClass.course}</span>
                                      <span className="block text-muted-foreground">{classStudentNames(scheduledClass)}</span>
                                      <span className="block font-medium">{scheduledClass.facultyName}</span>
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <Button type="button" variant="outline" className="h-full min-h-20 w-full border-dashed text-muted-foreground" aria-label={`Add class ${weekday} ${start}`} onClick={() => openClassForm(date, weekday, slot)}>
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
      </Panel>

      <FormDialog
        open={!!classForm}
        onOpenChange={(open) => !open && setClassForm(null)}
        title={scheduledClasses.rows.some((scheduledClass) => scheduledClass.id === classForm?.id) ? "Edit Scheduled Class" : "Add Class"}
        wide
        enterMovesNext
        fields={classFields}
        initial={classForm ?? {}}
        onSubmit={(value) => saveScheduledClass(value, "Scheduled")}
        submitLabel="Add Class"
      />

      <Dialog open={!!classDetails} onOpenChange={(open) => !open && setClassDetails(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{classDetails?.course} · Scheduled Class</DialogTitle></DialogHeader>
          {classDetails && <>
            <KV items={[
              ["Student Name", classStudentNames(classDetails)],
              ["Course", classDetails.course],
              ["Batch Type", classDetails.batchType],
              ["Date", fmtDate(classDetails.date)],
              ["Faculty Name", classDetails.facultyName],
              ["Status", <StatusBadge key="schedule-status" status={classDetails.status} />],
            ]} />
            <div className="flex justify-end gap-2 border-t pt-3">
              <Button variant="destructive" onClick={() => { setDeletingClass(classDetails); setClassDetails(null); }}><Trash2 className="mr-1.5 h-4 w-4" />Delete Class</Button>
              <Button onClick={() => {
                const studentNames = Array.isArray(classDetails.studentNames) ? classDetails.studentNames : [classDetails.studentName];
                const admissionNumbers = Array.isArray(classDetails.admissionNumbers) ? classDetails.admissionNumbers : [classDetails.admissionNumber];
                setClassForm({ ...classDetails, studentNames, admissionNumbers, timeSlot: `${classDetails.startTime} – ${classDetails.endTime}` });
                setClassDetails(null);
              }}><Pencil className="mr-1.5 h-4 w-4" />Edit Class</Button>
            </div>
          </>}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!deletingClass}
        onOpenChange={(open) => !open && setDeletingClass(null)}
        destructive
        title="Delete scheduled class?"
        description={`${deletingClass?.course} · ${deletingClass?.day} · ${deletingClass?.startTime}`}
        confirmLabel="Delete Class"
        onConfirm={() => {
          if (!deletingClass) return;
          scheduledClasses.remove(deletingClass.id);
          toast.success("Scheduled class deleted");
          setDeletingClass(null);
        }}
      />

      <FormDialog open={!!form} onOpenChange={(o) => !o && setForm(null)} title={form?.id ? `Edit ${form.name}` : "Create Batch"} wide enterMovesNext fields={[...fields, ...(form?.id ? [] : timingFields)]} initial={form ?? {}} onSubmit={save}>
        {DayPicker}
      </FormDialog>
      <FormDialog open={!!timing} onOpenChange={(o) => !o && setTiming(null)} title={`Manage Timing · ${timing?.name ?? ""}`} fields={timingFields} initial={timing ?? {}} onSubmit={save} submitLabel="Update Timing">
        {DayPicker}
      </FormDialog>

      <Dialog open={!!details} onOpenChange={(o) => !o && setDetails(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{details?.name} <span className="font-mono text-xs text-muted-foreground">{details?.id}</span></DialogTitle></DialogHeader>
          {details && <>
            <KV items={[["Course", details.course], ["Status", <StatusBadge key="s" status={details.status} />], ["Start Date", fmtDate(details.startDate)], ["End Date", fmtDate(details.endDate)], ["Days", details.days.join(", ")], ["Timing", `${details.startTime} – ${details.endTime}`], ["Instructor", details.instructor], ["Room / Lab", details.room], ["Capacity", `${enrolled(details.name).length} of ${details.capacity} seats filled`]]} />
            <p className="mt-4 text-xs font-semibold uppercase text-muted-foreground">Students in this batch</p>
            <ul className="mt-2 divide-y rounded-md border text-sm">
              {enrolled(details.name).map((a) => <li key={a.appNo} className="flex items-center justify-between px-3 py-2"><span><span className="font-medium">{a.name}</span> <span className="font-mono text-xs text-muted-foreground">{a.regNo}</span></span><StatusBadge status={a.status} /></li>)}
              {!enrolled(details.name).length && <li className="px-3 py-4 text-center text-muted-foreground">No students assigned yet</li>}
            </ul>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setTiming(details); setDetails(null); }}><Clock className="mr-1.5 h-4 w-4" />Manage Timing</Button>
              <Button onClick={() => { setForm(details); setDetails(null); }}><Pencil className="mr-1.5 h-4 w-4" />Edit Batch</Button>
            </div>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
