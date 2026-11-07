import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  KeyRound,
  Link2,
  LockKeyhole,
  Send,
  Upload,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DataTable, PageHeader } from "@/components/app/kit";
import { useStore } from "@/lib/store";
import { courseCategoryName, feeStatus, type Row } from "@/lib/mock";
import { fmtDate, fmtINR } from "@/lib/format";
import { studentIdForRecord } from "@/lib/student-records";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { emailDraftHref, instituteVisitDraft } from "@/lib/email";
import { studentDemoPassword, studentLmsUserIdPreview } from "@/lib/administration";

export const Route = createFileRoute("/student-records")({
  head: pageHead("Student Records", "Search student profiles and view saved admission records."),
  component: StudentRecords,
});

function localDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateFromLocalDateString(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function makeDemoQrPattern(seed: string): boolean[][] {
  let state = 0;
  for (const character of seed || "student") {
    state = (state * 31 + character.charCodeAt(0)) >>> 0;
  }
  const nextBit = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state >>> 31 === 1;
  };
  const size = 21;
  const matrix = Array.from({ length: size }, () => Array.from({ length: size }, () => nextBit()));
  const finderOrigins: [number, number][] = [
    [0, 0],
    [14, 0],
    [0, 14],
  ];
  for (const [left, top] of finderOrigins) {
    for (let y = 0; y < 7; y += 1) {
      for (let x = 0; x < 7; x += 1) {
        matrix[top + y][left + x] =
          x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4);
      }
    }
  }
  return matrix;
}

function StudentRecords() {
  const { data, saveCommittedStudentRecord, settings } = useStore();
  const [profile, setProfile] = useState<Row | null>(null);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [savedStudentKeys, setSavedStudentKeys] = useState<Set<string>>(() => new Set());
  const [generatedCredentialKeys, setGeneratedCredentialKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const agreementInput = useRef<HTMLInputElement>(null);
  const [visitDate, setVisitDate] = useState("");
  const [visitTime, setVisitTime] = useState("10:00");
  const [visitDatePickerOpen, setVisitDatePickerOpen] = useState(false);

  const rows = useMemo<Row[]>(
    () =>
      data.students.map((student) => {
        const admission = data.admissions.find((record) => record.regNo === student.regNo);
        const committedRecord = data.committedStudents.find(
          (record) =>
            record.admissionNumber === admission?.appNo ||
            record.applicationNumber === student.regNo ||
            record.studentId === student.studentId,
        );
        return {
          ...student,
          ...(admission ?? {}),
          ...(committedRecord ?? {}),
          appNo: admission?.appNo,
          admissionNo: committedRecord?.admissionNumber ?? admission?.admissionNo,
          regNo: committedRecord?.applicationNumber ?? student.regNo,
          balance:
            committedRecord?.balance ??
            (admission ? admission.fee - admission.discount - admission.paid : null),
          admissionStatus: admission?.status ?? "Not admitted",
          committedRecord,
        };
      }),
    [data.students, data.admissions, data.committedStudents],
  );

  const selectedStudent = profile
    ? (rows.find((row) => row.regNo === profile.regNo) ?? profile)
    : null;
  const studentProfile = selectedStudent?.committedRecord
    ? selectedStudent.committedRecord
    : selectedStudent;
  const lmsUserIdPreviews = useMemo(() => {
    const usedIds: string[] = [];
    const previews = new Map<string, string>();
    for (const row of rows) {
      const key = String(row.regNo ?? row.studentId ?? row.admissionNo ?? "");
      const preview = studentLmsUserIdPreview(
        row.name,
        row.admissionNo ?? row.admissionNumber ?? row.appNo,
        usedIds,
      );
      if (preview) {
        usedIds.push(preview);
        previews.set(key, preview);
      }
    }
    return previews;
  }, [rows]);
  const selectedRecordKey = String(
    selectedStudent?.regNo ?? selectedStudent?.studentId ?? selectedStudent?.admissionNo ?? "",
  );
  const lmsUserIdPreview = lmsUserIdPreviews.get(selectedRecordKey);
  const demoPassword = studentDemoPassword(
    studentProfile?.name,
    studentProfile?.admissionNumber ??
      studentProfile?.admissionNo ??
      studentProfile?.applicationNumber ??
      studentProfile?.studentId ??
      selectedRecordKey,
  );
  const demoQrPattern = useMemo(() => makeDemoQrPattern(selectedRecordKey), [selectedRecordKey]);
  useEffect(() => {
    setVisitDate(String(studentProfile?.instituteVisitDate ?? ""));
    setVisitTime(String(studentProfile?.instituteVisitTime ?? "10:00"));
  }, [
    studentProfile?.regNo,
    studentProfile?.instituteVisitDate,
    studentProfile?.instituteVisitTime,
  ]);
  const initials =
    studentProfile?.name
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0])
      .join("")
      .toUpperCase() || "?";
  const showValue = (value: unknown) =>
    value === undefined || value === null || value === "" ? "Not provided" : String(value);
  const showDate = (value: unknown) =>
    typeof value === "string" && value ? fmtDate(value) : "Not provided";
  const showMoney = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) ? fmtINR(value) : "Not provided";
  const fields = studentProfile
    ? ([
        ["Full Name", showValue(studentProfile.name)],
        [
          "Admission No.",
          showValue(
            studentProfile.admissionNumber ??
              studentProfile.admissionNo ??
              studentProfile.appNo ??
              studentProfile.regNo,
          ),
        ],
        ["Date of Birth", showDate(studentProfile.dob)],
        ["Gender", showValue(studentProfile.gender)],
        ["Contact Number", showValue(studentProfile.mobile)],
        ["Email Address", showValue(studentProfile.email)],
        ["Address", showValue(studentProfile.address)],
        ["Guardian Name", showValue(studentProfile.guardian)],
        ["Guardian Contact Number", showValue(studentProfile.guardianMobile)],
        ["Qualification", showValue(studentProfile.qualification)],
        ["Course Name", showValue(courseCategoryName(studentProfile.course))],
        ["Admission Date", showDate(studentProfile.admissionDate)],
        ["Total Course Fees", showMoney(studentProfile.fee)],
      ] as [string, unknown][])
    : [];
  const committedAt = selectedStudent?.committedRecord?.committedAt;
  const visitStatus = String(studentProfile?.instituteVisitStatus ?? "Not Invited");
  const agreementStatus = String(studentProfile?.agreementStatus ?? "Pending");
  const handbookStatus = String(studentProfile?.handbookStatus ?? "Pending");
  const updateInstituteWorkflowFor = (
    student: Row,
    updates: Partial<Row>,
    successMessage: string,
  ): boolean => {
    try {
      const currentRecord = student.committedRecord ?? {};
      const currentProfile = { ...student, ...currentRecord };
      const applicationNumber =
        currentProfile.applicationNumber ?? currentProfile.regNo ?? student.regNo;
      const admissionNumber =
        currentProfile.admissionNumber ??
        currentProfile.admissionNo ??
        student.admissionNo ??
        currentProfile.appNo ??
        student.appNo;
      saveCommittedStudentRecord({
        ...student,
        ...currentRecord,
        studentId: studentIdForRecord(currentProfile, settings.prefixes.student),
        admissionNumber,
        applicationNumber,
        committedAt: currentRecord.committedAt ?? new Date().toISOString(),
        ...updates,
      });
      toast.success(successMessage);
      return true;
    } catch (error) {
      console.error("Failed to update institute visit workflow", error);
      toast.error(
        error instanceof Error
          ? `Could not update institute visit details: ${error.message}`
          : "Could not update institute visit details. Please try again.",
      );
      return false;
    }
  };
  const updateInstituteWorkflow = (updates: Partial<Row>, successMessage: string) => {
    if (!selectedStudent || !studentProfile) return false;
    return updateInstituteWorkflowFor(selectedStudent, updates, successMessage);
  };

  const scheduleInstituteVisit = () => {
    if (!selectedStudent || !studentProfile || !visitDate || !visitTime) return;
    const saved = updateInstituteWorkflow(
      {
        instituteVisitStatus: "Visit Scheduled",
        instituteVisitDate: visitDate,
        instituteVisitTime: visitTime,
      },
      "Institute visit date and time saved",
    );
    if (!saved) return;

    const draft = instituteVisitDraft(
      {
        name: String(studentProfile.name ?? ""),
        email: String(studentProfile.email ?? ""),
      },
      fmtDate(visitDate),
      visitTime,
      settings.institution,
      settings.address,
    );
    if (!draft.href) {
      toast.error("Visit scheduled, but no registered email is available for this student.");
      return;
    }

    toast.success("Email draft opened; send it from your email app to notify the student.");
    window.location.href = draft.href;
  };
  const openCredentialEmailDraft = () => {
    if (!studentProfile) return;
    const email = String(studentProfile.email ?? "").trim();
    if (!email) {
      toast.error("No registered email is available for this student.");
      return;
    }

    const studentName = String(studentProfile.name ?? "Student");
    const studentId = studentIdForRecord(studentProfile, settings.prefixes.student);
    const body = `Dear ${studentName},\n\nHere are example LMS credential details for your reference only. They are not active and cannot be used to sign in.\n\nStudent ID: ${studentId || "Not available"}\nExample User ID: ${lmsUserIdPreview || "Not available"}\nExample password: ${demoPassword || "Not available"}\nExample LMS link: https://lms.students.study/login\n\nNo LMS account has been created and no credentials have been saved. Please do not use these examples to sign in.\n\nRegards,\nAdministration Department`;
    const href = emailDraftHref(email, "Example LMS Credentials (Not Active)", body);
    if (!href) {
      toast.error("Could not prepare an email draft for this student.");
      return;
    }

    window.location.href = href;
    toast.success("Email draft opened; send it from your email app.");
  };
  const submitStudentRecord = () => {
    if (!selectedStudent || !studentProfile) return;
    try {
      const applicationNumber =
        studentProfile.applicationNumber ?? studentProfile.regNo ?? selectedStudent.regNo;
      const admissionNumber =
        studentProfile.admissionNumber ??
        studentProfile.admissionNo ??
        selectedStudent.admissionNo ??
        studentProfile.appNo;
      saveCommittedStudentRecord({
        ...selectedStudent,
        ...(selectedStudent.committedRecord ?? {}),
        studentId: studentIdForRecord(studentProfile, settings.prefixes.student),
        admissionNumber,
        applicationNumber,
        balance:
          studentProfile.balance ??
          selectedStudent.balance ??
          (typeof studentProfile.fee === "number"
            ? studentProfile.fee -
              Number(studentProfile.discount ?? 0) -
              Number(studentProfile.paid ?? 0)
            : undefined),
        feeStatus:
          studentProfile.feeStatus ??
          (selectedStudent.admissionStatus !== "Not admitted"
            ? feeStatus(selectedStudent)
            : undefined),
        committedAt: new Date().toISOString(),
      });
      setSavedStudentKeys((savedKeys) => new Set(savedKeys).add(selectedRecordKey));
      toast.success(`${studentProfile.name}'s record was submitted`);
    } catch (error) {
      console.error("Failed to submit student record", error);
      toast.error(
        error instanceof Error
          ? `Could not submit student record: ${error.message}`
          : "Could not submit student record. Please try again.",
      );
    }
  };

  const uploadAgreement = (file?: File) => {
    if (!file || !selectedStudent || !studentProfile) return;
    if (file.type !== "application/pdf" && !file.type.startsWith("image/")) {
      toast.error("Choose a PDF or image file for the agreement");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Agreement files must be 2 MB or smaller");
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => toast.error("Could not read the selected agreement. Please try again.");
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        toast.error("Could not read the selected agreement. Please try again.");
        return;
      }
      try {
        const admissionNumber = studentProfile.admissionNumber ?? studentProfile.appNo;
        const applicationNumber = studentProfile.applicationNumber ?? studentProfile.regNo;
        saveCommittedStudentRecord({
          ...selectedStudent,
          ...(selectedStudent.committedRecord ?? {}),
          studentId: studentProfile.studentId ?? applicationNumber ?? studentProfile.regNo,
          admissionNumber,
          applicationNumber,
          agreement: {
            name: file.name,
            type: file.type,
            dataUrl: reader.result,
            uploadedAt: new Date().toISOString(),
          },
          balance:
            studentProfile.balance ??
            (typeof studentProfile.fee === "number"
              ? studentProfile.fee -
                Number(studentProfile.discount ?? 0) -
                Number(studentProfile.paid ?? 0)
              : undefined),
          feeStatus:
            studentProfile.feeStatus ??
            (selectedStudent.admissionStatus !== "Not admitted"
              ? feeStatus(selectedStudent)
              : undefined),
          committedAt: new Date().toISOString(),
        });
        toast.success(`${studentProfile.name}'s agreement was saved`);
      } catch (error) {
        console.error("Failed to save student agreement", error);
        toast.error(
          error instanceof Error
            ? `Could not save agreement: ${error.message}`
            : "Could not save agreement. Please try again.",
        );
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Records"
        description="Find student profiles and view their committed records."
      />
      <DataTable
        rows={rows}
        searchKeys={["name", "applicationNumber", "regNo", "admissionNumber", "appNo"]}
        onRowClick={(row) => {
          setProfile(row);
        }}
        columns={[
          {
            key: "admissionNo",
            label: "Admission Number",
            render: (row) => (
              <span className="font-mono text-xs">
                {row.admissionNo ??
                  (row.appNo ? String(row.appNo).replace(/^APP(?=-)/, "ADM") : "Not provided")}
              </span>
            ),
          },
          {
            key: "studentId",
            label: "Student ID",
            render: (row) => (
              <span className="font-mono text-xs">
                {studentIdForRecord(row, settings.prefixes.student) || "Not provided"}
              </span>
            ),
          },
          {
            key: "name",
            label: "Student",
            render: (row) => <span className="font-medium">{row.name}</span>,
          },
          {
            key: "mobile",
            label: "Contact",
            render: (row) => <span className="font-mono text-xs">{row.mobile}</span>,
          },
          { key: "course", label: "Course", render: (row) => courseCategoryName(row.course) },
          {
            key: "handbookStatus",
            label: "Handbook",
            render: (row) => String(row.handbookStatus ?? "Pending"),
          },
          {
            key: "credentialStatus",
            label: "Credential Status",
            render: (row) => {
              const recordKey = String(row.regNo ?? row.studentId ?? row.admissionNo ?? "");
              return generatedCredentialKeys.has(recordKey)
                ? "Generated"
                : String(row.credentialStatus ?? "Not generated");
            },
          },
          {
            key: "instituteVisitDate",
            label: "Visit Date & Time",
            sortable: false,
            render: (row) =>
              row.instituteVisitDate ? (
                <div>
                  <p>{showDate(row.instituteVisitDate)}</p>
                  <p className="text-xs text-muted-foreground">
                    {String(row.instituteVisitTime || "Time not set")}
                  </p>
                </div>
              ) : (
                <span className="text-muted-foreground">Not scheduled</span>
              ),
          },
        ]}
      />

      <Dialog
        open={!!studentProfile}
        onOpenChange={(open) => {
          if (!open) {
            setProfile(null);
          }
        }}
      >
        <DialogContent
          hideClose
          className="fixed inset-0 left-0 top-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-none border-0 p-4 shadow-none sm:rounded-none sm:p-6"
        >
          {studentProfile && (
            <>
              <div className="flex items-start gap-4">
                <DialogHeader className="min-w-0 flex-1">
                  <DialogTitle>{studentProfile.name || "Student Profile"}</DialogTitle>
                  <p className="text-xs text-muted-foreground">
                    Student ID:{" "}
                    {studentIdForRecord(studentProfile, settings.prefixes.student) ||
                      "Not provided"}
                  </p>
                </DialogHeader>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ml-auto shrink-0"
                  onClick={() => setProfile(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to List
                </Button>
              </div>
              <div className="grid gap-6 border-t pt-4 md:grid-cols-[240px_minmax(0,1fr)]">
                <div className="flex flex-col items-center gap-3 md:items-start">
                  <Avatar className="h-64 w-56 rounded-xl">
                    <AvatarFallback className="rounded-xl text-4xl font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-semibold">{studentProfile.name || "Not provided"}</p>
                  <input
                    ref={agreementInput}
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    aria-label="Upload student agreement"
                    onChange={(event) => {
                      uploadAgreement(event.currentTarget.files?.[0]);
                      event.currentTarget.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => agreementInput.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Agreement
                  </Button>
                  <div className="grid w-full gap-3">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Visit date</p>
                      <Popover open={visitDatePickerOpen} onOpenChange={setVisitDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            aria-label="Choose institute visit date"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !visitDate && "text-muted-foreground",
                            )}
                          >
                            <CalendarDays className="mr-2 h-4 w-4" />
                            {visitDate
                              ? new Intl.DateTimeFormat(undefined, {
                                  dateStyle: "long",
                                }).format(dateFromLocalDateString(visitDate))
                              : "Choose a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateFromLocalDateString(visitDate)}
                            onSelect={(date) => {
                              if (date) setVisitDate(localDateString(date));
                              setVisitDatePickerOpen(false);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <div className="space-y-2">
                        <label
                          htmlFor="institute-visit-time"
                          className="text-xs font-medium text-muted-foreground"
                        >
                          Visit time
                        </label>
                        <Input
                          id="institute-visit-time"
                          type="time"
                          value={visitTime}
                          onChange={(event) => setVisitTime(event.currentTarget.value)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={
                          !visitDate || !visitTime || ["Visited", "Completed"].includes(visitStatus)
                        }
                        onClick={scheduleInstituteVisit}
                      >
                        <CalendarDays className="mr-1.5 h-4 w-4" />
                        Schedule Visit
                      </Button>
                    </div>
                  </div>
                  {committedAt && (
                    <p className="text-xs text-muted-foreground">
                      Saved {new Date(committedAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <section className="grid content-start grid-cols-1 gap-x-6 sm:grid-cols-2">
                  {fields.map(([label, value]) => (
                    <div key={label} className="border-b py-3">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-foreground">
                        {String(value)}
                      </p>
                    </div>
                  ))}
                </section>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-56"
                    disabled={agreementStatus === "Signed" && handbookStatus === "Issued"}
                    onClick={() =>
                      updateInstituteWorkflow(
                        {
                          agreementStatus: "Signed",
                          agreementSignedDate:
                            studentProfile.agreementSignedDate || localDateString(),
                          handbookStatus: "Issued",
                          handbookIssuedDate:
                            studentProfile.handbookIssuedDate || localDateString(),
                        },
                        "Agreement signed and handbook issued",
                      )
                    }
                  >
                    <Check className="h-4 w-4" />
                    Agreement &amp; Handbook
                  </Button>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setGeneratedCredentialKeys((keys) => new Set(keys).add(selectedRecordKey));
                      setCredentialsOpen(true);
                    }}
                  >
                    <KeyRound className="h-4 w-4" />
                    Generate Credentials
                  </Button>
                  <Button
                    type="button"
                    className="w-56"
                    onClick={submitStudentRecord}
                    disabled={savedStudentKeys.has(selectedRecordKey)}
                  >
                    {savedStudentKeys.has(selectedRecordKey) ? "Saved" : "Save"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={credentialsOpen} onOpenChange={setCredentialsOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Student LMS Credentials
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {studentProfile?.name || "Selected student"} · Student ID{" "}
              {studentProfile
                ? studentIdForRecord(studentProfile, settings.prefixes.student) || "Not provided"
                : "Not provided"}
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">LMS User ID</p>
              <p className="mt-1 font-mono text-sm font-semibold">
                {lmsUserIdPreview ?? "Cannot create preview: name or admission year is missing"}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <KeyRound className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Student ID</p>
                  <p className="font-mono text-sm font-semibold">
                    {studentProfile
                      ? studentIdForRecord(studentProfile, settings.prefixes.student) ||
                        "Not available"
                      : "Not available"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <LockKeyhole className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Password</p>
                  <p className="break-all text-sm font-semibold">
                    {demoPassword ?? "Example unavailable (not valid)"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <Link2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">LMS login link</p>
                  <p className="break-all text-sm font-semibold">
                    https://lms.students.study/login
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <div className="shrink-0 rounded bg-white p-1 text-slate-950">
                  <svg
                    viewBox="0 0 21 21"
                    className="h-16 w-16"
                    role="img"
                    aria-label="Random example QR-style pattern, not scannable"
                    shapeRendering="crispEdges"
                  >
                    <rect width="21" height="21" fill="white" />
                    {demoQrPattern.flatMap((row, y) =>
                      row.flatMap((isDark, x) =>
                        isDark ? (
                          <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="black" />
                        ) : (
                          []
                        ),
                      ),
                    )}
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">QR code</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={openCredentialEmailDraft}>
                <Send className="h-4 w-4" />
                Send Credentials
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
