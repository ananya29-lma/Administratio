import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, KV, PageHeader, StatusBadge } from "@/components/app/kit";
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
      data.admissions.map((a) => ({
        ...a,
        batch: batchCategory(a.batch, data.batches),
        generated: data.committedStudents.some(
          (record) =>
            record.applicationNumber === a.regNo ||
            record.regNo === a.regNo ||
            (a.admissionNo &&
              (record.admissionNumber === a.admissionNo || record.admissionNo === a.admissionNo)),
        ),
      })),
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
  const payable = p ? Number(p.fee ?? 0) - Number(p.discount ?? 0) : 0;
  const formField = (label: string, value: unknown, className = "") => (
    <div className={`min-w-0 px-2 py-1.5 ${className}`}>
      <dt className="text-[10px] leading-snug text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-xs font-medium">{formValue(value)}</dd>
    </div>
  );
  const formSectionHeading = (title: string) => (
    <h3 className="text-[12px] font-semibold uppercase leading-snug text-[#E86F2A]">{title}</h3>
  );
  const formCheckbox = (value: unknown) => {
    if (typeof value === "boolean") return value ? "☒" : "☐";
    if (value === undefined || value === null || String(value).trim() === "") return "—";
    const normalized = String(value ?? "")
      .trim()
      .toLowerCase();
    if (normalized === "yes" || normalized === "true") return "☒";
    if (normalized === "no" || normalized === "false") return "☐";
    return formValue(value);
  };
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
        onRowDoubleClick={setProfile}
        columns={[
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
          {
            key: "generated",
            label: "Generated",
            render: (r) => (r.generated ? "Generated" : "Not generated"),
          },
        ]}
      />

      <Dialog open={!!p} onOpenChange={(o) => !o && setProfile(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          {p && (
            <>
              <DialogHeader>
                <div className="relative flex min-h-24 items-center justify-center">
                  <div
                    aria-label={`${p.name} initial`}
                    className="absolute left-0 flex h-24 w-24 items-center justify-center rounded-lg border border-[#D9D9D9] bg-white text-2xl font-semibold"
                  >
                    {String(p.name ?? "")
                      .trim()
                      .charAt(0)
                      .toUpperCase() || "?"}
                  </div>
                  <DialogTitle className="text-center text-base font-bold tracking-wide">
                    APPLICATION FORM
                  </DialogTitle>
                </div>
              </DialogHeader>
              <div className="mt-2 space-y-4">
                <div className="flex flex-col items-end gap-y-1 text-[11px]">
                  <p>
                    <span className="font-semibold text-[#E86F2A]">Date:</span>{" "}
                    {fmtDate(p.appDate ?? p.regDate)}
                  </p>
                  <p>
                    <span className="font-semibold text-[#E86F2A]">Application No:</span>{" "}
                    {formValue(p.regNo)}
                  </p>
                </div>

                <section className="space-y-1.5">
                  {formSectionHeading("1. PERSONAL DETAILS")}
                  <dl className="grid grid-cols-1 sm:grid-cols-6">
                    {formField("Student full name", p.name, "sm:col-span-4")}
                    {formField("Date of birth", fmtDate(p.dob), "sm:col-span-2")}
                    {formField("Age", ageFromDob(p.dob), "sm:col-span-2")}
                    {formField("Gender", p.gender, "sm:col-span-2")}
                    {formField("Mobile no", p.mobile, "sm:col-span-2")}
                    {formField("Email", p.email, "sm:col-span-6")}
                    {formField("Permanent address", p.address, "sm:col-span-6")}
                  </dl>
                </section>

                <section className="space-y-1.5">
                  {formSectionHeading("2. GUARDIAN DETAILS")}
                  <dl className="grid grid-cols-1 sm:grid-cols-2">
                    {formField(
                      "Guardian Name & Relation",
                      p.guardianRelationship
                        ? `${formValue(p.guardian)} (${formValue(p.guardianRelationship)})`
                        : p.guardian,
                    )}
                    {formField("Guardian mobile no", p.guardianMobile)}
                  </dl>
                </section>

                <section className="space-y-1.5">
                  {formSectionHeading("3. EDUCATIONAL QUALIFICATION / WORK EXP")}
                  <dl className="grid grid-cols-1 sm:grid-cols-[31.7%_32.5%_18.5%_17.3%]">
                    {formField("Qualification / Role", p.qualification)}
                    {formField("Institute / Company", p.prevInstitution)}
                    {formField("Year of passing", p.qualificationYear)}
                    {formField("% / Grade", p.gradePercent)}
                  </dl>
                </section>

                <section className="space-y-1.5">
                  {formSectionHeading("4. LEAD SOURCE & REFERENCE")}
                  <dl className="grid grid-cols-1 sm:grid-cols-2">
                    {formField("Lead source", p.source)}
                    {formField(
                      "More details",
                      p.sourceDetails ?? p.referenceDetails ?? p.reference ?? p.otherSourceDetails,
                    )}
                  </dl>
                </section>

                <section className="space-y-1.5">
                  {formSectionHeading("5. COURSE PREFERENCE")}
                  <dl className="grid grid-cols-1 sm:grid-cols-2">
                    {formField("Course applied for", courseCategoryName(p.course))}
                    {formField("Fee plan preferred", p.feePlanPreferred)}
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
                    {formField("Preferred number of instalments", p.preferredInstallments)}
                  </dl>
                </section>

                <section className="space-y-1.5">
                  {formSectionHeading("6. DOCUMENTS ENCLOSED")}
                  <div className="flex flex-wrap gap-x-4 gap-y-2 p-2 text-xs">
                    {[
                      ["ID proof", p.idEnclosed ?? p.docs?.id],
                      ["Address proof", p.addressProofEnclosed ?? p.docs?.address],
                      ["Latest marksheet", p.qualificationEnclosed ?? p.docs?.marksheet],
                      ["Passport-size photos", p.photoEnclosed ?? p.docs?.photo],
                      ["TC", p.transferEnclosed ?? p.docs?.transfer],
                    ]
                      .filter(([, enclosed]) => isDocumentEnclosed(enclosed))
                      .map(([document]) => (
                        <span key={document}>☒ {document}</span>
                      ))}
                    {![
                      p.idEnclosed ?? p.docs?.id,
                      p.addressProofEnclosed ?? p.docs?.address,
                      p.qualificationEnclosed ?? p.docs?.marksheet,
                      p.photoEnclosed ?? p.docs?.photo,
                      p.transferEnclosed ?? p.docs?.transfer,
                    ].some(isDocumentEnclosed) && <span>No documents marked as enclosed</span>}
                  </div>
                </section>

                <section className="space-y-1.5">{formSectionHeading("7. DECLARATION")}</section>

                <section className="space-y-1.5">
                  {formSectionHeading("8. FOR OFFICE USE ONLY")}
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    The following two roles must independently verify their respective
                    responsibilities and sign before the admission is treated as fully verified.
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <section>
                      <h4 className="bg-[#F3F3F3] px-2 py-1 text-xs font-semibold">
                        Administrator
                      </h4>
                      <dl className="grid grid-cols-1 sm:grid-cols-2">
                        {formField("Verification", formCheckbox(p.administratorVerified))}
                        {formField("Name", p.administratorName)}
                        {formField(
                          "Verification date",
                          fmtDate(p.administratorDate),
                          "sm:col-span-2",
                        )}
                      </dl>
                    </section>
                    <section>
                      <h4 className="bg-[#F3F3F3] px-2 py-1 text-xs font-semibold">Accountant</h4>
                      <dl className="grid grid-cols-1 sm:grid-cols-2">
                        {formField("Verification", formCheckbox(p.accountantVerified))}
                        {formField("Name", p.accountantName)}
                        {formField("Verification date", fmtDate(p.accountantDate), "sm:col-span-2")}
                      </dl>
                    </section>
                  </div>
                  <p className="p-2 text-xs leading-relaxed">
                    I declare that the information given in this form is true and correct. I agree
                    to follow the rules and regulations of Skill AI and understand that admission is
                    subject to written approval.
                  </p>
                </section>
                <section className="space-y-3 border-t pt-4">
                  <h3 className="text-sm font-semibold">Payment History</h3>
                  <KV
                    items={[
                      ["Total Fees", fmtINR(p.fee)],
                      ["Total Paid", fmtINR(p.paid)],
                      ["Outstanding Balance", fmtINR(payable - Number(p.paid ?? 0))],
                      ["Next Due Date", fmtDate(p.dueDate)],
                      [
                        "Fee Status",
                        <StatusBadge key="profile-fee-status" status={feeStatus(p)} />,
                      ],
                    ]}
                  />
                </section>
              </div>
              <div className="flex justify-end gap-2 border-t pt-4">
                <Button onClick={commitToStudentRecord}>Generate Admission</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
