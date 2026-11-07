import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BatchRecurrenceField } from "@/components/app/BatchRecurrenceField";

vi.mock("@/lib/store", () => ({
  useCollection: () => ({ rows: [] }),
  useStore: () => ({
    settings: { holidays: [], subjectCurriculum: [] },
  }),
}));

function plan(daysOfWeek: number[], sessionCount: number) {
  return {
    startDate: "2026-10-27",
    endDate: "2027-01-26",
    daysOfWeek,
    sessions: Array.from({ length: sessionCount }, (_, index) => `session-${index}`),
    totalSessions: sessionCount,
    weeks: 13,
    skippedDates: [],
    lastWeekSessions: 1,
    endMode: "afterSessions" as const,
    selectedEndDate: "2027-01-26",
    holidayDates: [],
    unavailableDates: [],
  };
}

describe("BatchRecurrenceField summary", () => {
  it("shows a short summary clearly within the schedule button", () => {
    render(
      <BatchRecurrenceField
        values={{ date: "2026-10-27", schedulePlan: plan([2, 3, 4], 40) }}
        setValues={vi.fn()}
      />,
    );

    const button = screen.getByRole("button", {
      name: "Schedule",
    });
    expect(button).toHaveTextContent("Tue, Wed, Thu · Oct 27, 2026 – Jan 26, 2027 · 40 sessions");
    expect(button).toHaveAttribute(
      "title",
      "Tue, Wed, Thu · Oct 27, 2026 – Jan 26, 2027 · 40 sessions",
    );
    expect(button.querySelector("span")).toHaveClass("truncate", "min-w-0");
    expect(button).toHaveClass("overflow-hidden", "min-w-0");
  });

  it("keeps a long summary in a single truncatable line and preserves the full text in its tooltip", () => {
    render(
      <BatchRecurrenceField
        values={{
          date: "2026-10-27",
          schedulePlan: plan([0, 1, 2, 3, 4, 5, 6], 125),
        }}
        setValues={vi.fn()}
      />,
    );

    const button = screen.getByRole("button", { name: "Schedule" });
    expect(button).toHaveClass("overflow-hidden", "min-w-0");
    expect(button.querySelector("span")).toHaveClass("truncate");
    expect(button.getAttribute("title")).toBe(
      "Sun, Mon, Tue, Wed, Thu, Fri, Sat · Oct 27, 2026 – Jan 26, 2027 · 125 sessions",
    );
  });
});
