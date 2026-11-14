import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DataTable, PageHeader } from "@/components/app/kit";
import { useStore } from "@/lib/store";
import { courseCategoryName, feeStatus, type Row } from "@/lib/mock";
import { batchCategory } from "@/lib/administration";
import { fmtDate, fmtINR } from "@/lib/format";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/records")({
  head: pageHead(
    "Student Admission Records",
    "Central admission register with student profiles, fees and history.",
  ),
  component: Records,
});

function formValue(value: unknown): string {
  return value === undefined || value === null || value === "" ? "Not provided" : String(value);
}

function formDate(value: unknown): string {
  return typeof value === "string" && value.trim() ? fmtDate(value) : "Not provided";
}

function formCheck(value: unknown): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return formValue(value);
}

function isDocumentEnclosed(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  return ["true", "yes", "1"].includes(
    String(value ?? "")
      .trim()
      .toLowerCase(),
  );
}

function ageFromDob(value: unknown): string {
  if (typeof value !== "string" || !value) return "Not provided";
  const dob = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return "Not provided";
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  if (
    today.getMonth() < dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())
  ) {
    age -= 1;
  }
  return age >= 0 ? String(age) : "Not provided";
}

function Records() {
  const { data, saveCommittedStudentRecord } = useStore();
  const [profile, setProfile] = useState<Row | null>(null);

  const rows = useMemo(
    () =>
      data.admissions
        .map((a) => ({
          ...a,
          batch: batchCategory(a.batch, data.batches),
          generated: data.committedStudents.some(
            (record) =>
              record.applicationNumber === a.regNo ||
              record.regNo === a.regNo ||
              (a.admissionNo &&
                (record.admissionNumber === a.admissionNo || record.admissionNo === a.admissionNo)),
          ),
        }))
        .filter((admission) => !admission.generated)
        .map((admission, index) => ({ ...admission, serialNo: index + 1 })),
    [data.admissions, data.batches, data.committedStudents],
  );

  const p = profile
    ? { ...(data.students.find((s) => s.regNo === profile.regNo) ?? {}), ...profile }
    : null;
  const studentPhotoUrl = p
    ? [p.photoUrl, p.photo, p.avatarUrl, p.avatar].find(
        (value): value is string => typeof value === "string" && value.trim().length > 0,
      )
    : undefined;
  const studentPayments = p
    ? data.payments.filter(
        (payment) =>
          payment.verified === true &&
          (payment.regNo === p.regNo ||
            (p.appNo && payment.appNo === p.appNo) ||
            (p.admissionNo && payment.appNo === p.admissionNo)),
      )
    : [];
  const paymentTotal = studentPayments.reduce(
    (total, payment) => total + Number(payment.amount ?? 0),
    0,
  );
  const totalPaid = paymentTotal || Number(p?.paid ?? 0);
  const totalFees = Number(p?.fee ?? 0);
  const payable = p ? totalFees - Number(p.discount ?? 0) : 0;
  const balance = Math.max(0, payable - totalPaid);
  const formField = (label: string, value: unknown, className = "") => (
    <div
      className={`grid min-w-0 grid-cols-[minmax(0,0.85fr)_auto_minmax(0,1.15fr)] items-baseline gap-x-2 py-0.5 ${className}`}
    >
      <dt className="text-xs leading-tight text-muted-foreground">{label}</dt>
      <span aria-hidden="true" className="text-xs leading-tight text-muted-foreground">
        :
      </span>
      <dd className="break-words text-xs font-medium leading-tight">{formValue(value)}</dd>
    </div>
  );
  const formSectionHeading = (title: string) => (
    <h3 className="border-b border-border bg-muted/50 px-2 py-1 text-sm font-bold leading-tight text-foreground">
      {title}
    </h3>
  );
  const commitToStudentRecord = () => {
    if (!p?.regNo || !data.students.some((student) => student.regNo === p.regNo)) {
      toast.error("Could not find this student in Student Records");
      return;
    }
    try {
      const student = data.students.find((item) => item.regNo === p.regNo);
      saveCommittedStudentRecord({
        ...student,
        ...p,
        studentId: p.studentId ?? student?.studentId ?? p.regNo,
        applicationNumber: p.regNo,
        admissionNumber: p.admissionNo,
        photoUrl: studentPhotoUrl ?? student?.photoUrl ?? student?.avatarUrl,
        balance: payable - Number(p.paid ?? 0),
        feeStatus: feeStatus(p),
        committedAt: new Date().toISOString(),
      });
      toast.success(`${p.name}'s details were saved to Student Records`);
    } catch (error) {
      console.error("Failed to save student admission record", error);
      toast.error(
        error instanceof Error
          ? `Could not save student record: ${error.message}`
          : "Could not save student record. Please try again.",
      );
    }
  };
  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Admission Records"
        description="Central register of every admitted student."
      />
      <DataTable
        rows={rows}
        searchKeys={["admissionNo", "appNo", "regNo", "name", "mobile"]}
        pagination={false}
        onRowDoubleClick={setProfile}
        columns={[
          {
            key: "serialNo",
            label: "Sl.No",
            sortable: false,
            render: (r) => r.serialNo,
          },
          {
            key: "regNo",
            label: "Application No",
            render: (r) => <span className="font-mono text-xs">{r.regNo}</span>,
          },
          {
            key: "name",
            label: "Student",
            render: (r) => <span className="font-medium">{r.name}</span>,
          },
          {
            key: "mobile",
            label: "Contact Number",
            render: (r) => <span className="font-mono text-xs">{r.mobile}</span>,
          },
          { key: "course", label: "Course", render: (r) => courseCategoryName(r.course) },
          { key: "admissionDate", label: "Admitted", render: (r) => fmtDate(r.admissionDate) },
        ]}
      />

      <Dialog open={!!p} onOpenChange={(o) => !o && setProfile(null)}>
        <DialogContent className="h-dvh w-screen max-w-none grid-rows-[minmax(0,1fr)] overflow-y-auto p-1 sm:max-w-none sm:p-2">
          {p && (
            <div className="student-detail-dashboard flex h-full min-h-0 flex-col gap-1">
              <style>{`
                @media print {
                  @page { size: landscape; margin: 0.35in; }
                  body * { visibility: hidden !important; }
                  .student-detail-dashboard, .student-detail-dashboard * { visibility: visible !important; }
                  .student-detail-dashboard { position: fixed !important; inset: 0 !important; width: 100% !important; height: auto !important; overflow: visible !important; padding: 0 !important; background: white !important; }
                  .student-detail-dashboard .print-hidden { display: none !important; }
                  .student-detail-dashboard section { break-inside: avoid; }
                }
              `}</style>
              <DialogHeader className="sr-only">
                <DialogTitle>Student Details: {formValue(p.name)}</DialogTitle>
              </DialogHeader>

              <div className="print-hidden flex shrink-0 flex-wrap justify-end gap-2 border-b pb-1 pr-8">
                <Button type="button" size="sm" onClick={commitToStudentRecord}>
                  Generate Admission
                </Button>
              </div>

              <div className="grid shrink-0 gap-2 lg:min-h-40 lg:grid-cols-2">
                <section className="flex min-w-0 items-center gap-3 rounded-lg border bg-card p-2">
                  <Avatar className="h-[136px] w-32 shrink-0 rounded-md border">
                    <AvatarFallback className="rounded-md text-5xl font-bold">
                      {String(p.name ?? "")
                        .trim()
                        .charAt(0)
                        .toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 space-y-1">
                    <h2 className="truncate text-base font-bold">{formValue(p.name)}</h2>
                    <p className="text-xs text-muted-foreground">
                      Application No:{" "}
                      <span className="inline-flex rounded-full border border-[#9de5d9] bg-[#d9f6f1] px-3 py-0.5 font-semibold text-[#164e63]">
                        {formValue(p.regNo)}
                      </span>
                    </p>
                    <p className="text-xs">Course: {formValue(p.course)}</p>
                    <p className="text-xs">Date: {formDate(p.appDate ?? p.regDate)}</p>
                  </div>
                </section>
                <section className="rounded-lg border bg-card p-2">
                  <h3 className="mb-1 text-base font-bold">Payment Summary</h3>
                  <dl className="grid grid-cols-2 gap-2">
                    {[
                      ["Total Fees", fmtINR(totalFees)],
                      ["Total Paid", fmtINR(totalPaid)],
                      ["Outstanding Balance", fmtINR(balance)],
                      ["Next Due Date", formDate(p.dueDate)],
                    ].map(([label, value], index) => (
                      <div
                        key={label}
                        className={`min-w-0 ${index % 2 === 1 ? "border-l pl-2" : ""} ${index > 1 ? "border-t pt-2" : ""}`}
                      >
                        <dt className="text-[10px] text-muted-foreground">{label}</dt>
                        <dd className="mt-1 break-words text-xs font-semibold">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-1 auto-rows-min gap-1 lg:grid-cols-2 lg:grid-rows-[repeat(4,minmax(min-content,1fr))]">
                <section className="flex flex-col rounded-lg border bg-card">
                  {formSectionHeading("1. Personal Details")}
                  <div className="grid flex-1 grid-cols-1 sm:grid-cols-2">
                    <dl className="grid content-around px-2 py-2">
                      {formField("Date of Birth", formDate(p.dob))}
                      {formField("Age", ageFromDob(p.dob))}
                      {formField("Gender", p.gender)}
                    </dl>
                    <dl className="grid content-around px-2 py-2">
                      {formField("Mobile Number", p.mobile)}
                      {formField("Email", p.email)}
                      {formField("Permanent Address", p.address)}
                    </dl>
                  </div>
                </section>

                <section className="flex flex-col rounded-lg border bg-card">
                  {formSectionHeading("2. Guardian Details")}
                  <dl className="grid flex-1 content-around grid-cols-1 px-2 py-2 sm:grid-cols-2">
                    {formField(
                      "Guardian Name and Relation",
                      p.guardianRelationship
                        ? `${formValue(p.guardian)} (${formValue(p.guardianRelationship)})`
                        : p.guardian,
                    )}
                    {formField("Guardian Mobile Number", p.guardianMobile)}
                  </dl>
                </section>

                <section className="flex flex-col rounded-lg border bg-card">
                  {formSectionHeading("3. Educational Qualification / Work Experience")}
                  <dl className="grid flex-1 content-around grid-cols-1 px-2 py-2 sm:grid-cols-2">
                    {formField("Qualification / Role", p.qualification)}
                    {formField("Institute / Company", p.prevInstitution)}
                    {formField("Year of Passing", p.qualificationYear)}
                    {formField("Percentage / Grade", p.gradePercent)}
                  </dl>
                </section>

                <section className="flex flex-col rounded-lg border bg-card">
                  {formSectionHeading("4. Lead Source & Reference")}
                  <dl className="grid flex-1 content-around grid-cols-1 px-2 py-2 sm:grid-cols-2">
                    {formField("Lead Source", p.source)}
                    {formField(
                      "More Details",
                      p.sourceDetails ?? p.referenceDetails ?? p.reference ?? p.otherSourceDetails,
                    )}
                  </dl>
                </section>

                <section className="flex flex-col rounded-lg border bg-card">
                  {formSectionHeading("5. Course Preference")}
                  <dl className="grid flex-1 content-around grid-cols-1 px-2 py-2 sm:grid-cols-2">
                    {formField("Course Applied For", courseCategoryName(p.course))}
                    {formField("Fee Plan Preferred", p.feePlanPreferred)}
                    {formField(
                      "Instalments",
                      formCheck(
                        p.instalments ??
                          p.installments ??
                          (p.feePlanPreferred === "Installment"
                            ? true
                            : p.feePlanPreferred === "Full Payment"
                              ? false
                              : undefined),
                      ),
                    )}
                    {formField("Preferred Number of Instalments", p.preferredInstallments)}
                  </dl>
                </section>

                <section className="flex flex-col rounded-lg border bg-card">
                  {formSectionHeading("6. Documents Enclosed")}
                  <div className="grid flex-1 content-around grid-cols-1 gap-2 p-2 sm:grid-cols-3">
                    {[
                      ["ID Proof", p.idEnclosed ?? p.docs?.id],
                      ["Latest Marksheet", p.qualificationEnclosed ?? p.docs?.marksheet],
                      ["Passport-size Photos", p.photoEnclosed ?? p.docs?.photo],
                    ].map(([label, isSubmitted]) => {
                      const submitted = isDocumentEnclosed(isSubmitted);
                      return (
                        <div
                          key={label}
                          className="flex min-w-0 items-center justify-between gap-1 rounded-md border p-2"
                        >
                          <span className="text-xs font-medium">{label}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {submitted ? "Submitted" : "Not provided"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="flex flex-col rounded-lg border bg-card lg:col-span-2">
                  {formSectionHeading("7. Declaration")}
                  <p className="flex flex-1 items-center p-3 text-xs leading-relaxed">
                    I declare that the information given in this form is true and correct. I agree
                    to follow the rules and regulations of Skill AI and understand that admission is
                    subject to written approval.
                  </p>
                </section>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
