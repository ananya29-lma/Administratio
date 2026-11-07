import { describe, expect, it } from "vitest";
import { emailDraftHref, feeReminderDraft, instituteVisitDraft } from "@/lib/email";

describe("email draft links", () => {
  it("addresses one selected student and encodes the template", () => {
    const href = emailDraftHref(
      " student@example.edu ",
      "Fee reminder · Python",
      "Dear Student,\nOutstanding: ₹500",
    );

    expect(href.startsWith("mailto:student%40example.edu?")).toBe(true);
    expect(decodeURIComponent(href)).toContain("Fee reminder · Python");
    expect(decodeURIComponent(href)).toContain("Outstanding: ₹500");
    expect(emailDraftHref("", "Subject", "Body")).toBe("");
  });

  it("creates a fee reminder for the selected student with their outstanding balance", () => {
    const draft = feeReminderDraft(
      {
        name: "Aarav Student",
        email: "aarav@example.edu",
        admissionNo: "ADM-1001",
        course: "AI Foundation",
      },
      "October 2026",
      5000,
      2000,
      false,
    );

    expect(decodeURIComponent(draft.href)).toContain("mailto:aarav@example.edu");
    expect(draft.subject).toContain("AI Foundation");
    expect(draft.body).toContain("Aarav Student");
    expect(draft.body).toContain("ADM-1001");
    expect(draft.body).toContain("Outstanding amount: ₹3,000");
    expect(draft.body).toContain("Payment status: Partially paid");
  });

  it("creates an institute visit email draft with the scheduled date, time, and address", () => {
    const draft = instituteVisitDraft(
      { name: "Aarav Student", email: "aarav@example.edu" },
      "09 Nov 2026",
      "10:00",
      "Brightpath Institute",
      "42 Anna Salai",
    );

    expect(draft.subject).toBe("Institute Visit Scheduled");
    expect(draft.body).toContain("Dear Aarav Student");
    expect(draft.body).toContain("09 Nov 2026 at 10:00");
    expect(draft.body).toContain("Institute address: 42 Anna Salai");
    expect(decodeURIComponent(draft.href)).toContain("mailto:aarav@example.edu");
  });
});
