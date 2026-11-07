import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Clock, LogIn, LogOut, Plus, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, DocSheet, FormDialog, KV, PageHeader, PrintDialog, StatCard, StatusBadge, type Field } from "@/components/app/kit";
import { useCollection, useStore } from "@/lib/store";
import { useStudentPicker } from "@/lib/use-students";
import { COURSE_OPTION_GROUPS, COURSES, STAFF, TODAY, feeStatus, type Row } from "@/lib/mock";
import { BATCH_CATEGORIES, batchCategory } from "@/lib/administration";
import { fmtDate } from "@/lib/format";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/starting-slip")({
  head: pageHead("Student Slips", "Manage student course, track, late permission and outgoing slips."),
  component: StudentSlips,
});

const nowTime = () => new Date().toTimeString().slice(0, 5);
const dateFilter = (rows: Row[]) => ({ key: "date", label: "Dates", options: [...new Set(rows.map((r) => r.date))].sort().reverse().map(fmtDate), match: (r: Row, v: string) => fmtDate(r.date) === v });
type ChangeSlipKind = "courseChange" | "courseRestart" | "trackChange";
type ChangeSlipConfig = {
  title: string;
  prefix: string;
  collection: "courseChanges" | "courseRestarts" | "trackChanges";
  dateKey: string;
  fields: Field[];
  details: { key: string; label: string; date?: boolean }[];
  columns: { key: string; label: string }[];
};
function StudentSlips() {
  const slips = useCollection("slips");
  const late = useCollection("late", "id");
  const out = useCollection("outgoing", "id");
  const courseChanges = useCollection("courseChanges");
  const courseRestarts = useCollection("courseRestarts");
  const trackChanges = useCollection("trackChanges");
  const completions = useCollection("courseCompletions");
  const { data, settings } = useStore();
  const picker = useStudentPicker(true);
  const [tab, setTab] = useState("course");
  const [courseForm, setCourseForm] = useState<Row | null>(null);
  const [preview, setPreview] = useState<Row | null>(null);
  const [courseView, setCourseView] = useState<Row | null>(null);
  const [lateForm, setLateForm] = useState<Row | null>(null);
  const [lateView, setLateView] = useState<Row | null>(null);
  const [outForm, setOutForm] = useState<Row | null>(null);
  const [printLate, setPrintLate] = useState<Row | null>(null);
  const [printOut, setPrintOut] = useState<Row | null>(null);
  const [completionForm, setCompletionForm] = useState<Row | null>(null);
  const [completionView, setCompletionView] = useState<Row | null>(null);
  const [completionPrint, setCompletionPrint] = useState<Row | null>(null);
  const [view, setView] = useState<Row | null>(null);
  const [changeForm, setChangeForm] = useState<{ kind: ChangeSlipKind; row: Row | null } | null>(null);
  const [changeView, setChangeView] = useState<{ kind: ChangeSlipKind; row: Row } | null>(null);
  const [changePrint, setChangePrint] = useState<{ kind: ChangeSlipKind; row: Row } | null>(null);
  const changeCollections = { courseChange: courseChanges, courseRestart: courseRestarts, trackChange: trackChanges };
  const changeConfigs: Record<ChangeSlipKind, ChangeSlipConfig> = {
    courseChange: {
      title: "Course Changing Slip", prefix: "CCS", collection: "courseChanges", dateKey: "date",
      fields: [
        { name: "name", label: "Student Name", required: true },
        { name: "regNo", label: "Registration No.", required: true },
        { name: "currentCourse", label: "Current Course", type: "select", optionGroups: COURSE_OPTION_GROUPS, required: true },
        { name: "newCourse", label: "New Course", type: "select", optionGroups: COURSE_OPTION_GROUPS, required: true },
        { name: "date", label: "Date", type: "date", required: true },
        { name: "reason", label: "Reason for Course Change", type: "textarea", required: true },
        { name: "signedBy", label: "Authorised Signatory", type: "select", options: STAFF, required: true },
      ],
      details: [
        { key: "name", label: "Student Name" }, { key: "regNo", label: "Registration No." },
        { key: "currentCourse", label: "Current Course" }, { key: "newCourse", label: "New Course" },
        { key: "date", label: "Date", date: true }, { key: "reason", label: "Reason for Course Change" },
        { key: "signedBy", label: "Authorised Signatory" },
      ],
      columns: [{ key: "currentCourse", label: "Current Course" }, { key: "newCourse", label: "New Course" }],
    },
    courseRestart: {
      title: "Course Re-starting Slip", prefix: "CRS", collection: "courseRestarts", dateKey: "restartDate",
      fields: [
        { name: "name", label: "Student Name", required: true },
        { name: "regNo", label: "Registration No.", required: true },
        { name: "course", label: "Course", type: "select", optionGroups: COURSE_OPTION_GROUPS, required: true },
        { name: "timing", label: "Time", placeholder: "e.g. 09:00 – 11:00", required: true },
        { name: "track", label: "Track", type: "select", options: ["MWF", "TTS", "MTWTFS"], required: true },
        { name: "restartDate", label: "Re-starting Date", type: "date", required: true },
        { name: "reason", label: "Reason for Re-starting", type: "textarea", required: true },
        { name: "signedBy", label: "Authorised Signatory", type: "select", options: STAFF, required: true },
      ],
      details: [
        { key: "name", label: "Student Name" }, { key: "regNo", label: "Registration No." },
        { key: "course", label: "Course" }, { key: "timing", label: "Time" }, { key: "track", label: "Track" },
        { key: "restartDate", label: "Re-starting Date", date: true }, { key: "reason", label: "Reason for Re-starting" },
        { key: "signedBy", label: "Authorised Signatory" },
      ],
      columns: [{ key: "course", label: "Course" }, { key: "timing", label: "Time" }, { key: "track", label: "Track" }],
    },
    trackChange: {
      title: "Track Changing Slip", prefix: "TCS", collection: "trackChanges", dateKey: "date",
      fields: [
        { name: "name", label: "Student Name", required: true },
        { name: "regNo", label: "Registration No.", required: true },
        { name: "course", label: "Course", type: "select", optionGroups: COURSE_OPTION_GROUPS, required: true },
        { name: "currentTrack", label: "Current Track", type: "select", options: ["MWF", "TTS", "MTWTFS"], required: true },
        { name: "newTrack", label: "New Track", type: "select", options: ["MWF", "TTS", "MTWTFS"], required: true },
        { name: "date", label: "Date", type: "date", required: true },
        { name: "reason", label: "Reason for Track Change", type: "textarea", required: true },
        { name: "signedBy", label: "Authorised Signatory", type: "select", options: STAFF, required: true },
      ],
      details: [
        { key: "name", label: "Student Name" }, { key: "regNo", label: "Registration No." },
        { key: "course", label: "Course" }, { key: "currentTrack", label: "Current Track" },
        { key: "newTrack", label: "New Track" }, { key: "date", label: "Date", date: true },
        { key: "reason", label: "Reason for Track Change" }, { key: "signedBy", label: "Authorised Signatory" },
      ],
      columns: [{ key: "course", label: "Course" }, { key: "currentTrack", label: "Current Track" }, { key: "newTrack", label: "New Track" }],
    },
  };
  const courseSlipRows = slips.rows.map((row) => {
    return { ...row, batchLabel: batchCategory(row.batch, data.batches) };
  });

  const courseFields: Field[] = [
    { name: "name", label: "Student Name", required: true },
    { name: "regNo", label: "Registration No.", required: true },
    { name: "course", label: "Course", type: "select", optionGroups: COURSE_OPTION_GROUPS, required: true },
    { name: "timing", label: "Time", placeholder: "e.g. 09:00 – 11:00", required: true },
    { name: "batch", label: "Track", type: "select", options: ["MWF", "TTS", "MTWTFS"], required: true },
    { name: "startDate", label: "Date", type: "date", required: true },
    { name: "signedBy", label: "Authorised Signatory", type: "select", options: STAFF, required: true },
    { name: "instructor", label: "Assigned Faculty", type: "select", options: [...new Set(data.batches.map((b) => b.instructor))], required: true },
    { name: "instructions", label: "Administrative Instructions", type: "textarea" },
  ];
  const lateFields: Field[] = [
    { name: "name", label: "Student Name", required: true },
    { name: "regNo", label: "Registration No.", required: true },
    { name: "course", label: "Course", type: "select", optionGroups: COURSE_OPTION_GROUPS, required: true },
    { name: "date", label: "Date", type: "date", required: true },
    { name: "arrival", label: "Arrival Time", type: "time", required: true },
    { name: "reason", label: "Reason for Late", type: "textarea", required: true },
    { name: "signedBy", label: "Authorised Signatory", type: "select", options: STAFF, required: true },
  ];
  const outFields: Field[] = [
    { name: "name", label: "Student Name", required: true },
    { name: "regNo", label: "Registration No.", required: true },
    { name: "course", label: "Course", type: "select", optionGroups: COURSE_OPTION_GROUPS, required: true },
    { name: "outTime", label: "Out Time", type: "time", required: true },
    { name: "reason", label: "Reason for Going Out", type: "textarea", required: true },
    { name: "date", label: "Date", type: "date", required: true },
    { name: "signedBy", label: "Authorised Signatory", type: "select", options: STAFF, required: true },
  ];
  const completionFields: Field[] = [
    { name: "student", label: "Student Name", type: "select", options: picker.options, required: true, full: true },
    { name: "course", label: "Course", type: "select", optionGroups: COURSE_OPTION_GROUPS, required: true },
    { name: "completionDate", label: "Completion Date", type: "date", required: true },
    { name: "signedBy", label: "Authorised Signatory", type: "select", options: STAFF, required: true },
    { name: "remarks", label: "Remarks", type: "textarea" },
  ];

  const createCourseSlip = (v: Row) => {
    const student = data.admissions.find((admission) => admission.regNo === v.regNo)
      ?? data.students.find((record) => record.regNo === v.regNo);
    const row = {
      id: v.id ?? slips.nextId("CSS"),
      name: v.name,
      regNo: v.regNo,
      appNo: student?.appNo,
      course: v.course,
      duration: COURSES.find((course) => course.name === v.course)?.duration,
      startDate: v.startDate,
      batch: v.batch,
      timing: v.timing,
      instructor: v.instructor,
      signedBy: v.signedBy,
      feeStatus: student?.fee ? feeStatus(student) : "Unpaid",
      balance: student?.fee ? student.fee - student.discount - student.paid : 0,
      issued: TODAY,
      instructions: v.instructions,
    };
    if (v.id) {
      slips.update(v.id, row);
      toast.success(`Slip ${row.id} updated`);
    } else {
      slips.add(row);
      toast.success(`Slip ${row.id} generated`);
      setPreview(row);
    }
  };
  const withStudent = (v: Row): Row => {
    const s = picker.resolve(v.student);
    const b = data.batches.find((x) => x.name === s.batch);
    return { ...v, name: s.name, regNo: s.regNo, course: s.course, batch: s.batch, timing: b ? `${b.startTime} – ${b.endTime}` : "—" };
  };
  const saveLate = (v: Row) => {
    const r = { ...v, id: v.id ?? late.nextId(settings.prefixes.late, 4) };
    if (v.id) {
      late.update(v.id, r);
      toast.success(`Late permission slip ${r.id} updated`);
    } else {
      late.add(r);
      toast.success(`Late permission slip ${r.id} generated`);
      setPrintLate(r);
    }
  };
  const saveOut = (v: Row) => {
    if (v.id) {
      out.update(v.id, v);
      toast.success("Outgoing slip updated");
      return;
    }
    const r: Row = {
      ...v,
      id: out.nextId(settings.prefixes.outgoing, 4),
      actualReturn: "",
      status: "Out",
    };
    out.add(r);
    toast.success("Outgoing slip issued");
  };
  const saveChangeSlip = (kind: ChangeSlipKind, values: Row) => {
    const collection = changeCollections[kind];
    const config = changeConfigs[kind];
    const row = { ...values, id: values.id ?? collection.nextId(config.prefix, 4) };
    if (values.id) {
      collection.update(values.id, row);
      toast.success(`${config.title} ${row.id} updated`);
    } else {
      collection.add(row);
      toast.success(`${config.title} ${row.id} generated`);
      setChangePrint({ kind, row });
    }
  };
  const saveCompletionSlip = (values: Row) => {
    const student = picker.resolve(values.student);
    if (!student.regNo) {
      toast.error("Select a student");
      return;
    }
    const row = {
      ...values,
      id: values.id ?? completions.nextId("CPS", 4),
      name: student.name,
      regNo: student.regNo,
      appNo: student.appNo,
    };
    if (values.id) {
      completions.update(values.id, row);
      toast.success(`Course completion slip ${row.id} updated`);
    } else {
      completions.add(row);
      toast.success(`Course completion slip ${row.id} generated`);
      setCompletionPrint(row);
    }
  };
  const markReturned = (r: Row) => { out.update(r.id, { status: "Returned", actualReturn: nowTime() }); toast.success(`${r.name} marked returned`); };

  return (
    <div className="space-y-6">
      <PageHeader title="Student Slips" description="Manage student course, track, late permission and outgoing slips." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Late Permissions Today" value={late.rows.filter((r) => r.date === TODAY).length} icon={Clock} tone="warning" />
        <StatCard label="Total Late Receipts" value={late.rows.length} icon={LogIn} />
        <StatCard label="Students Currently Out" value={out.rows.filter((r) => r.status === "Out").length} icon={LogOut} tone="danger" />
        <StatCard label="Outgoing Slips Issued" value={out.rows.length} icon={LogOut} tone="success" />
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="course">Course Starting Slip</TabsTrigger>
          <TabsTrigger value="late">Late Permission Slip</TabsTrigger>
          <TabsTrigger value="outgoing">Outgoing Slips</TabsTrigger>
          <TabsTrigger value="courseChange">Course Changing Slip</TabsTrigger>
          <TabsTrigger value="courseRestart">Course Re-starting Slip</TabsTrigger>
          <TabsTrigger value="trackChange">Track Changing Slip</TabsTrigger>
          <TabsTrigger value="courseCompletion">Course Completion Slip</TabsTrigger>
        </TabsList>
        <TabsContent value="course" className="space-y-4 pt-3">
          <div className="flex justify-end"><Button onClick={() => setCourseForm({ startDate: TODAY, instructions: "Report 15 minutes before batch time. Carry your ID card and this slip on the first day." })}><Plus className="mr-1.5 h-4 w-4" />Create Slip</Button></div>
          <DataTable rows={courseSlipRows} searchKeys={["id", "name", "regNo"]} filters={[{ key: "batchLabel", label: "Tracks", options: [...new Set(courseSlipRows.map((row) => row.batchLabel))] }, { key: "feeStatus", label: "Fee Status", options: ["Paid", "Partially Paid", "Unpaid", "Overdue"]}]}
            onRowDoubleClick={setCourseView}
            columns={[
              { key: "id", label: "Slip No", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
              { key: "name", label: "Student", render: (r) => <span className="font-medium">{r.name}</span> },
              { key: "course", label: "Course" },
              { key: "batch", label: "Track", render: (r) => r.batchLabel },
              { key: "timing", label: "Time" },
              { key: "startDate", label: "Date", render: (r) => fmtDate(r.startDate) },
              { key: "instructor", label: "Faculty" },
              { key: "signedBy", label: "Authorised Signatory" },
              { key: "feeStatus", label: "Fees", render: (r) => <StatusBadge status={r.feeStatus} /> },
            ]} />
        </TabsContent>
        <TabsContent value="late" className="pt-3">
          <DataTable rows={late.rows} searchKeys={["id", "name", "regNo"]}
            filters={[
              dateFilter(late.rows),
              {
                key: "batch",
                label: "Batches",
                options: BATCH_CATEGORIES,
                match: (row, value) => batchCategory(row.batch, data.batches) === value,
              },
            ]}
            onRowDoubleClick={setLateView}
            toolbar={<Button size="sm" onClick={() => setLateForm({ date: TODAY })}><Plus className="mr-1.5 h-4 w-4" />Create Late Permission Slip</Button>}
            columns={[
              { key: "id", label: "Slip No", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
              { key: "name", label: "Student Name" }, { key: "regNo", label: "Registration No." },
              { key: "course", label: "Course" }, { key: "arrival", label: "Arrival Time" },
              { key: "reason", label: "Reason for Late" }, { key: "date", label: "Date", render: (r) => fmtDate(r.date) },
              { key: "signedBy", label: "Authorised Signatory" },
            ]} />
        </TabsContent>
        <TabsContent value="outgoing" className="pt-3">
          <DataTable rows={out.rows} searchKeys={["id", "name", "regNo"]}
            filters={[dateFilter(out.rows), { key: "status", label: "Statuses", options: ["Out", "Returned"] }]}
            onRowDoubleClick={setView}
            toolbar={<Button size="sm" onClick={() => setOutForm({ date: TODAY, outTime: nowTime() })}><Plus className="mr-1.5 h-4 w-4" />Issue Slip</Button>}
            columns={[
              { key: "id", label: "Slip No", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
              { key: "name", label: "Student Name" }, { key: "regNo", label: "Registration No." },
              { key: "course", label: "Course" }, { key: "outTime", label: "Out Time" },
              { key: "reason", label: "Reason for Going Out" }, { key: "date", label: "Date", render: (r) => fmtDate(r.date) },
              { key: "signedBy", label: "Authorised Signatory" }, { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
            ]} />
        </TabsContent>
        {(Object.keys(changeConfigs) as ChangeSlipKind[]).map((kind) => {
          const config = changeConfigs[kind];
          const rows = changeCollections[kind].rows;
          return (
            <TabsContent key={kind} value={kind} className="pt-3">
              <DataTable rows={rows} searchKeys={["id", "name", "regNo"]}
                onRowDoubleClick={(row) => setChangeView({ kind, row })}
                toolbar={<Button size="sm" onClick={() => setChangeForm({ kind, row: null })}><Plus className="mr-1.5 h-4 w-4" />Create {config.title}</Button>}
                columns={[
                  { key: "id", label: "Slip No", render: (row) => <span className="font-mono text-xs">{row.id}</span> },
                  { key: "name", label: "Student Name" },
                  { key: "regNo", label: "Registration No." },
                  ...config.columns.map((column) => ({ key: column.key, label: column.label })),
                  { key: config.dateKey, label: "Date", render: (row) => fmtDate(row[config.dateKey]) },
                  { key: "signedBy", label: "Authorised Signatory" },
                ]} />
            </TabsContent>
          );
        })}
        <TabsContent value="courseCompletion" className="pt-3">
          <DataTable
            rows={completions.rows}
            searchKeys={["id", "name", "regNo", "course"]}
            onRowDoubleClick={setCompletionView}
            toolbar={<Button size="sm" onClick={() => setCompletionForm({ completionDate: TODAY })}><Plus className="mr-1.5 h-4 w-4" />Create Course Completion Slip</Button>}
            columns={[
              { key: "id", label: "Slip No", render: (row) => <span className="font-mono text-xs">{row.id}</span> },
              { key: "name", label: "Student Name" },
              { key: "regNo", label: "Admission Number" },
              { key: "course", label: "Course" },
              { key: "completionDate", label: "Completion Date", render: (row) => fmtDate(row.completionDate) },
              { key: "signedBy", label: "Authorised Signatory" },
            ]}
          />
        </TabsContent>
      </Tabs>

      <FormDialog open={!!courseForm} onOpenChange={(open) => !open && setCourseForm(null)} title={courseForm?.id ? "Edit Course Starting Slip" : "Create Course Starting Slip"} wide enterMovesNext fields={courseFields} initial={courseForm ?? {}} onSubmit={createCourseSlip} submitLabel={courseForm?.id ? "Save Changes" : "Generate Slip"} />
      <FormDialog open={!!lateForm} onOpenChange={(open) => !open && setLateForm(null)} title={lateForm?.id ? "Edit Late Permission Slip" : "Create Late Permission Slip"} wide enterMovesNext fields={lateFields} initial={lateForm ?? {}} onSubmit={saveLate} submitLabel={lateForm?.id ? "Save Changes" : "Generate Slip"} />
      <FormDialog open={!!outForm} onOpenChange={(open) => !open && setOutForm(null)} title={outForm?.id ? "Edit Outgoing Slip" : "Student Outgoing Slip"} wide enterMovesNext fields={outFields} initial={outForm ?? {}} onSubmit={saveOut} submitLabel={outForm?.id ? "Save Changes" : "Issue Slip"} />
      <FormDialog
        open={!!completionForm}
        onOpenChange={(open) => !open && setCompletionForm(null)}
        title={completionForm?.id ? "Edit Course Completion Slip" : "Create Course Completion Slip"}
        wide
        enterMovesNext
        fields={completionFields}
        initial={completionForm ?? {}}
        onSubmit={saveCompletionSlip}
        submitLabel={completionForm?.id ? "Save Changes" : "Generate Slip"}
      />
      <FormDialog
        open={!!changeForm}
        onOpenChange={(open) => !open && setChangeForm(null)}
        title={changeForm ? `${changeForm.row?.id ? "Edit" : "Create"} ${changeConfigs[changeForm.kind].title}` : ""}
        wide
        enterMovesNext
        fields={changeForm ? changeConfigs[changeForm.kind].fields : []}
        initial={changeForm?.row ?? (changeForm ? { [changeConfigs[changeForm.kind].dateKey]: TODAY } : {})}
        onSubmit={(values) => changeForm && saveChangeSlip(changeForm.kind, values)}
        submitLabel={changeForm?.row ? "Save Changes" : "Generate Slip"}
      />

      <Dialog open={!!courseView} onOpenChange={(o) => !o && setCourseView(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Course Starting Slip Details</DialogTitle></DialogHeader>
          {courseView && <>
            <KV items={[["Student Name", courseView.name], ["Registration No.", courseView.regNo], ["Course", courseView.course], ["Time", courseView.timing], ["Track", courseView.batchLabel ?? courseView.batch], ["Date", fmtDate(courseView.startDate)], ["Authorised Signatory", courseView.signedBy]]} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setCourseForm(courseView); setCourseView(null); }}>Edit</Button>
              <Button onClick={() => { setPreview(courseView); setCourseView(null); }}><Printer className="mr-1.5 h-4 w-4" />Print Slip</Button>
            </div>
          </>}
        </DialogContent>
      </Dialog>

      <Dialog open={!!lateView} onOpenChange={(o) => !o && setLateView(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Late Permission Slip Details</DialogTitle></DialogHeader>
          {lateView && <>
            <KV items={[["Student Name", lateView.name], ["Registration No.", lateView.regNo], ["Course", lateView.course], ["Arrival Time", lateView.arrival], ["Reason for Late", lateView.reason], ["Date", fmtDate(lateView.date)], ["Authorised Signatory", lateView.signedBy]]} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setLateForm(lateView); setLateView(null); }}>Edit</Button>
              <Button onClick={() => { setPrintLate(lateView); setLateView(null); }}><Printer className="mr-1.5 h-4 w-4" />Print Slip</Button>
            </div>
          </>}
        </DialogContent>
      </Dialog>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Outgoing Slip Details</DialogTitle></DialogHeader>
          {view && <>
            <KV items={[["Student Name", view.name], ["Registration No.", view.regNo], ["Course", view.course], ["Out Time", view.outTime], ["Reason for Going Out", view.reason], ["Date", fmtDate(view.date)], ["Authorised Signatory", view.signedBy]]} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setOutForm(view); setView(null); }}>Edit</Button>
              {view.status === "Out" && <Button variant="outline" onClick={() => { markReturned(view); setView(null); }}><LogIn className="mr-1.5 h-4 w-4" />Mark Returned</Button>}
              <Button onClick={() => { setPrintOut(view); setView(null); }}><Printer className="mr-1.5 h-4 w-4" />Print Slip</Button>
            </div>
          </>}
        </DialogContent>
      </Dialog>

      <Dialog open={!!changeView} onOpenChange={(open) => !open && setChangeView(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>{changeView && `${changeConfigs[changeView.kind].title} Details`}</DialogTitle></DialogHeader>
          {changeView && <>
            <KV items={changeConfigs[changeView.kind].details.map((field) => [field.label, field.date ? fmtDate(changeView.row[field.key]) : changeView.row[field.key]])} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setChangeForm(changeView); setChangeView(null); }}>Edit</Button>
              <Button onClick={() => { setChangePrint(changeView); setChangeView(null); }}><Printer className="mr-1.5 h-4 w-4" />Print Slip</Button>
            </div>
          </>}
        </DialogContent>
      </Dialog>

      <Dialog open={!!completionView} onOpenChange={(open) => !open && setCompletionView(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Course Completion Slip Details</DialogTitle></DialogHeader>
          {completionView && <>
            <KV items={[
              ["Slip No", completionView.id],
              ["Student Name", completionView.name],
              ["Admission Number", completionView.regNo],
              ["Course", completionView.course],
              ["Completion Date", fmtDate(completionView.completionDate)],
              ["Authorised Signatory", completionView.signedBy],
              ["Remarks", completionView.remarks || "—"],
            ]} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setCompletionForm({ ...completionView, student: `${completionView.name} (${completionView.regNo})` });
                setCompletionView(null);
              }}>Edit</Button>
              <Button onClick={() => { setCompletionPrint(completionView); setCompletionView(null); }}><Printer className="mr-1.5 h-4 w-4" />Print Slip</Button>
            </div>
          </>}
        </DialogContent>
      </Dialog>

      <PrintDialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)} title="Course Starting Slip">
        {preview && <DocSheet institution={settings.institution} title="Course Starting Slip" number={preview.id} footer={<></>}>
          <KV items={[
            ["Student Name", preview.name],
            ["Registration No.", preview.regNo],
            ["Course", preview.course],
            ["Time", preview.timing],
            ["Track", preview.batchLabel ?? preview.batch],
            ["Date", fmtDate(preview.startDate)],
            ["Authorised Signatory", preview.signedBy],
          ]} />
        </DocSheet>}
      </PrintDialog>
      <PrintDialog open={!!printLate} onOpenChange={(o) => !o && setPrintLate(null)} title="Late Permission Slip">
        {printLate && <DocSheet institution={settings.institution} title="Late Permission Slip" number={printLate.id} footer={<></>}>
          <KV items={[
            ["Student Name", printLate.name],
            ["Registration No.", printLate.regNo],
            ["Course", printLate.course],
            ["Arrival Time", printLate.arrival],
            ["Reason for Late", printLate.reason],
            ["Date", fmtDate(printLate.date)],
            ["Authorised Signatory", printLate.signedBy],
          ]} />
        </DocSheet>}
      </PrintDialog>
      <PrintDialog open={!!printOut} onOpenChange={(o) => !o && setPrintOut(null)} title="Student Outgoing Slip">
        {printOut && <DocSheet institution={settings.institution} title="Student Outgoing Slip" footer={<></>}>
          <KV items={[["Student Name", printOut.name], ["Registration No.", printOut.regNo], ["Course", printOut.course], ["Out Time", printOut.outTime], ["Reason for Going Out", printOut.reason], ["Date", fmtDate(printOut.date)], ["Authorised Signatory", printOut.signedBy]]} />
        </DocSheet>}
      </PrintDialog>
      <PrintDialog
        open={!!changePrint}
        onOpenChange={(open) => !open && setChangePrint(null)}
        title={changePrint ? changeConfigs[changePrint.kind].title : ""}
      >
        {changePrint && <DocSheet institution={settings.institution} title={changeConfigs[changePrint.kind].title} number={changePrint.row.id} footer={<></>}>
          <KV items={changeConfigs[changePrint.kind].details.map((field) => [field.label, field.date ? fmtDate(changePrint.row[field.key]) : changePrint.row[field.key]])} />
        </DocSheet>}
      </PrintDialog>
      <PrintDialog open={!!completionPrint} onOpenChange={(open) => !open && setCompletionPrint(null)} title="Course Completion Slip">
        {completionPrint && <DocSheet institution={settings.institution} title="Course Completion Slip" number={completionPrint.id} footer={<></>}>
          <KV items={[
            ["Student Name", completionPrint.name],
            ["Admission Number", completionPrint.regNo],
            ["Course", completionPrint.course],
            ["Completion Date", fmtDate(completionPrint.completionDate)],
            ["Authorised Signatory", completionPrint.signedBy],
            ["Remarks", completionPrint.remarks || "—"],
          ]} />
        </DocSheet>}
      </PrintDialog>
    </div>
  );
}
