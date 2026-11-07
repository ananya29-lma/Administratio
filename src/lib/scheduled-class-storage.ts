import type { Row } from "@/lib/mock";

export const SCHEDULED_CLASSES_STORAGE_KEY = "administration.scheduled-classes.v1";

export function readScheduledClasses(storage: Pick<Storage, "getItem">, fallback: Row[]): Row[] {
  try {
    const raw = storage.getItem(SCHEDULED_CLASSES_STORAGE_KEY);
    if (!raw) return fallback;
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) &&
      value.every((row) => row && typeof row === "object" && !Array.isArray(row))
      ? (value as Row[])
      : fallback;
  } catch {
    return fallback;
  }
}

export function writeScheduledClasses(storage: Pick<Storage, "setItem">, rows: Row[]) {
  storage.setItem(SCHEDULED_CLASSES_STORAGE_KEY, JSON.stringify(rows));
}
