import { createFileRoute } from "@tanstack/react-router";
import { useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CalendarCheck, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DataTable,
  FormDialog,
  KpiCard,
  PageHeader,
  StatusBadge,
  type Field,
} from "@/components/app/kit";
import { useCollection, useStore } from "@/lib/store";
import { useStudentPicker } from "@/lib/use-students";
import { addDays, TODAY, type Row } from "@/lib/mock";
import { batchCategory } from "@/lib/administration";
import { daysBetween, fmtDate } from "@/lib/format";
import { studentIdForRegistration } from "@/lib/student-records";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/leave")({
  head: pageHead("Leave Approvals", "Review, approve and reject student leave requests."),
  component: Leave,
});

const formatIndianDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
};

const parseIndianDate = (value: string) => {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }
  return `${year}-${month}-${day}`;
};

function Leave() {
  const lv = useCollection("leaves", "id");
  const { data, settings } = useStore();
  const picker = useStudentPicker(true);
  const [tab, setTab] = useState("Pending");
  const [form, setForm] = useState<Row | null>(null);
  const [review, setReview] = useState<Row | null>(null);
  const [letterDate, setLetterDate] = useState("");
  const [rejoinedDate, setRejoinedDate] = useState("");
  const [reasonText, setReasonText] = useState("");
  const reasonFieldRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const field = reasonFieldRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
  }, [reasonText, review]);

  const saveLetterFields = (status?: "Approved" | "Rejected") => {
    if (!review) return false;
    const storedRejoinedDate = parseIndianDate(rejoinedDate);
    if (storedRejoinedDate === null && rejoinedDate.trim() !== "") {
      toast.error("Enter the rejoin date as DD-MM-YYYY.");
      return false;
    }
    lv.update(review.id, {
      ...(status ? { status } : {}),
      letterDate,
      rejoinedDate: storedRejoinedDate ?? "",
      reason: reasonText,
    });
    return true;
  };

  const count = (s: string) => lv.rows.filter((r) => r.status === s).length;
  const rows = (tab === "All" ? lv.rows : lv.rows.filter((r) => r.status === tab)).map((row) => ({
    ...row,
    studentId: studentIdForRegistration(row.regNo, data, settings.prefixes.student),
  }));
  const admissionNoFor = (regNo: unknown) =>
    data.admissions.find((admission) => admission.regNo === regNo)?.admissionNo ?? "—";

  const fields: Field[] = [
    { name: "id", label: "Leave Request No", readOnly: true },
    { name: "submitted", label: "Request Submission Date", type: "date", required: true },
    {
      name: "student",
      label: "Student",
      type: "select",
      options: picker.options,
      required: true,
      full: true,
    },
    { name: "start", label: "Leave Start Date", type: "date", required: true },
    {
      name: "end",
      label: "Leave End Date",
      type: "date",
      required: true,
      validate: (v, all) =>
        v && all.start && v < all.start ? "End date cannot be before start date" : undefined,
    },
    {
      name: "category",
      label: "Leave Category",
      type: "select",
      options: settings.leaveCategories,
      required: true,
    },
    { name: "reason", label: "Reason for Leave", type: "textarea", required: true },
    { name: "remarks", label: "Administrative Remarks", type: "textarea" },
  ];

  const save = (v: Row) => {
    const s = picker.resolve(v.student);
    lv.add({
      ...v,
      name: s.name,
      regNo: s.regNo,
      admissionNo: admissionNoFor(s.regNo),
      course: s.course,
      batch: s.batch,
      days: daysBetween(v.start, v.end),
      rejoinedDate: addDays(v.end, 1),
      status: "Pending",
    });
    toast.success(`Leave request ${v.id} submitted`);
  };
  const decide = (to: "Approved" | "Rejected") => {
    if (!review || !saveLetterFields(to)) return;
    toast.success(`${review.id} ${to.toLowerCase()} for ${review.name}`);
    setReview(null);
  };
  const open = (r: Row) => {
    setReview(r);
    setLetterDate(String(r.letterDate ?? (r.submitted ? fmtDate(r.submitted) : fmtDate(TODAY))));
    setRejoinedDate(formatIndianDate(String(r.rejoinedDate ?? addDays(r.end, 1))));
    setReasonText(String(r.reason ?? ""));
  };
  const closeReview = () => {
    if (!saveLetterFields()) return;
    setReview(null);
  };
  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Approvals"
        description="Review student leave requests and record decisions."
      />
      <div className="kpi-compact-grid grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total Requests" value={lv.rows.length} icon={CalendarCheck} />
        <KpiCard label="Pending Requests" value={count("Pending")} icon={Clock} tone="orange" />
        <KpiCard
          label="Approved Requests"
          value={count("Approved")}
          icon={CheckCircle2}
          tone="green"
        />
        <KpiCard label="Rejected Requests" value={count("Rejected")} icon={XCircle} tone="red" />
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="leave-status-tabs">
          {[
            { value: "Pending", label: "Pending", tone: "pending" },
            { value: "Approved", label: "Approved", tone: "approved" },
            { value: "Rejected", label: "Rejected", tone: "rejected" },
            { value: "All", label: "All Requests", tone: "all" },
          ].map(({ value, label, tone }) => (
            <TabsTrigger
              key={value}
              value={value}
              className={`leave-status-tab leave-status-${tone}`}
            >
              <span>{label}</span>
              <span className="leave-status-count">
                {value === "All" ? lv.rows.length : count(value)}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <DataTable
        rows={rows}
        searchKeys={["id", "name", "regNo", "admissionNo", "reason", "rejoinedDate"]}
        onRowDoubleClick={open}
        emptyText={`No ${tab === "All" ? "" : tab.toLowerCase() + " "}leave requests`}
        columns={[
          {
            key: "id",
            label: "Request No",
            render: (r) => <span className="font-mono text-xs">{r.id}</span>,
          },
          {
            key: "name",
            label: "Student",
            render: (r) => (
              <button
                type="button"
                className="font-medium text-primary underline-offset-4 hover:underline"
                onClick={(event) => {
                  event.stopPropagation();
                  open(r);
                }}
              >
                {r.name}
              </button>
            ),
          },
          {
            key: "studentId",
            label: "Student ID",
            render: (r) => <span className="font-mono text-xs">{r.studentId || "—"}</span>,
          },
          {
            key: "admissionNo",
            label: "Admission No",
            render: (r) => (
              <span className="font-mono text-xs">{r.admissionNo ?? admissionNoFor(r.regNo)}</span>
            ),
          },
          { key: "batch", label: "Batch", render: (r) => batchCategory(r.batch, data.batches) },
          {
            key: "start",
            label: "Leave Dates",
            render: (r) => `${fmtDate(r.start)} – ${fmtDate(r.end)}`,
          },
          {
            key: "rejoinedDate",
            label: "Rejoin Date",
            render: (r) => formatIndianDate(String(r.rejoinedDate ?? addDays(r.end, 1))),
          },
          {
            key: "days",
            label: "Days",
            render: (r) => <span className="font-mono">{r.days}</span>,
          },
          {
            key: "status",
            label: "Status",
            render: (r) => <StatusBadge status={r.status} leave />,
          },
        ]}
      />

      <FormDialog
        open={!!form}
        onOpenChange={(o) => !o && setForm(null)}
        title="New Leave Request"
        wide
        enterMovesNext
        fields={fields}
        initial={form ?? {}}
        onSubmit={save}
        submitLabel="Submit Request"
      >
        {(v) =>
          v.start && v.end && v.end >= v.start ? (
            <p className="rounded-md bg-muted p-3 text-sm">
              Total Leave Days:{" "}
              <span className="font-mono font-semibold">{daysBetween(v.start, v.end)}</span>
            </p>
          ) : null
        }
      </FormDialog>

      <Dialog open={!!review} onOpenChange={(o) => !o && closeReview()}>
        <DialogContent className="print-dialog max-h-[92vh] overflow-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Student Leave Letter</DialogTitle>
          </DialogHeader>
          {review && (
            <div className="space-y-4">
              <div className="print-area skillai-leave-letter">
                <p className="skillai-letter-date">
                  <strong>Date: </strong>
                  <input
                    className="skillai-letter-field skillai-date-field"
                    aria-label="Letter date"
                    value={letterDate}
                    onChange={(event) => setLetterDate(event.target.value)}
                    placeholder="_____________"
                  />
                </p>
                <div className="skillai-letter-recipient">
                  <p>To,</p>
                  <p>The Campus Administrator,</p>
                  <p>Skill AI,</p>
                </div>
                <p className="skillai-letter-subject">
                  <strong>Subject: </strong>
                  <strong>Application for Post Leave Approval</strong>
                </p>
                <p className="skillai-letter-salutation">Respected Sir / Madam,</p>
                <p className="skillai-letter-paragraph">
                  I, <strong>{String(review.name ?? "")}</strong>, a student of{" "}
                  {String(review.course ?? "")} course (Admission No.{" "}
                  <strong>{String(review.admissionNo ?? admissionNoFor(review.regNo))}</strong>),
                  was absent from the campus from {fmtDate(review.start)} to {fmtDate(review.end)} (
                  <strong>{Number(review.days ?? daysBetween(review.start, review.end))}</strong>{" "}
                  days) due to the following reason:
                </p>
                <Textarea
                  ref={reasonFieldRef}
                  aria-label="Reason for absence"
                  className="skillai-reason-field font-bold"
                  rows={1}
                  value={reasonText}
                  onChange={(event) => setReasonText(event.target.value)}
                />
                <p className="skillai-letter-paragraph skillai-rejoin-paragraph">
                  I have rejoined classes on{" "}
                  <input
                    className="skillai-letter-field skillai-rejoined-field"
                    aria-label="Date rejoined classes"
                    type="text"
                    value={rejoinedDate}
                    onChange={(event) => setRejoinedDate(event.target.value)}
                    placeholder="DD-MM-YYYY"
                    style={{ fontWeight: 700 }}
                  />
                  . I sincerely apologise for any inconvenience caused and request you to kindly
                  regularise my absence. I assure you that I will complete all missed lessons,
                  practical works, and I will inform the campus in advance in future.
                </p>
                <p className="skillai-supporting-document">
                  Supporting document attached (if any): {review.doc ? String(review.doc) : ""}
                </p>
                <p className="skillai-letter-closing">Thanking you,</p>
                <p className="skillai-letter-faithfully">Yours faithfully,</p>
                <p className="skillai-student-signature-name">
                  <strong>{String(review.name ?? "")}</strong>
                </p>
              </div>
              <DialogFooter className="no-print">
                <Button variant="outline" onClick={closeReview}>
                  Close
                </Button>
                {review.status === "Pending" && (
                  <>
                    <Button variant="destructive" onClick={() => decide("Rejected")}>
                      <XCircle className="mr-1.5 h-4 w-4" />
                      Reject
                    </Button>
                    <Button onClick={() => decide("Approved")}>
                      <CheckCircle2 className="mr-1.5 h-4 w-4" />
                      Approve
                    </Button>
                  </>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
