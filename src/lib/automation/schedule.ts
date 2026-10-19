/**
 * Schedule helpers — interval minutes and simple 5-field cron.
 * Cron supports: minute hour day-of-month month day-of-week
 * Values: number | * | */n  (no lists/ranges in v1)
 */

export function computeNextRunAt(
  type: "interval" | "cron",
  expression: string,
  from: Date = new Date()
): Date {
  if (type === "interval") {
    const minutes = Number(expression);
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 60 * 24 * 30) {
      throw new Error("Interval must be minutes between 1 and 43200");
    }
    return new Date(from.getTime() + minutes * 60_000);
  }

  // cron
  return nextCronDate(expression, from);
}

function nextCronDate(expression: string, from: Date): Date {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error("Cron must have 5 fields: m h dom mon dow");
  }
  const [minF, hourF, domF, monF, dowF] = parts;

  // Search up to 8 days ahead, minute by minute (acceptable for low volume)
  const cursor = new Date(from.getTime() + 60_000);
  cursor.setSeconds(0, 0);

  for (let i = 0; i < 60 * 24 * 8; i++) {
    if (
      matchField(minF!, cursor.getUTCMinutes()) &&
      matchField(hourF!, cursor.getUTCHours()) &&
      matchField(domF!, cursor.getUTCDate()) &&
      matchField(monF!, cursor.getUTCMonth() + 1) &&
      matchField(dowF!, cursor.getUTCDay())
    ) {
      return cursor;
    }
    cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
  }

  throw new Error("Could not compute next cron run within 8 days");
}

function matchField(field: string, value: number): boolean {
  if (field === "*") return true;
  if (field.startsWith("*/")) {
    const step = Number(field.slice(2));
    if (!Number.isFinite(step) || step <= 0) return false;
    return value % step === 0;
  }
  const n = Number(field);
  return Number.isFinite(n) && n === value;
}

export function parseScheduleInput(input: {
  type: "interval" | "cron";
  expression: string;
}): { type: "interval" | "cron"; expression: string } {
  if (input.type === "interval") {
    const minutes = Number(input.expression);
    if (!Number.isFinite(minutes) || minutes < 1) {
      throw new Error("Interval expression must be a positive number of minutes");
    }
    return { type: "interval", expression: String(Math.floor(minutes)) };
  }
  const parts = input.expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error("Cron expression must have 5 fields");
  }
  return { type: "cron", expression: input.expression.trim() };
}
