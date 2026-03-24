"use client";

import type { DateRange } from "@package/ui/calendar";
import { Calendar } from "@package/ui/calendar";
import { Input } from "@package/ui/input";
import { Label } from "@package/ui/label";

export function DatePickerWithRange({
  className,
  date,
  onDateChange,
  required,
}: {
  className?: string;
  date: DateRange;
  onDateChange: (dateRange: DateRange) => void;
  required?: boolean;
}) {
  return (
    <div className={className}>
      <Label aria-label="availability-period">Availability Period</Label>
      <Calendar
        className="w-full"
        mode="range"
        defaultMonth={date.from}
        selected={date}
        onSelect={(newDateRange: DateRange | undefined) =>
          onDateChange(updateDateRange(date, newDateRange))
        }
        numberOfMonths={2}
        showOutsideDays={false}
        required={required}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="release-time">Start Time</Label>
          <Input
            id="release-time"
            type="time"
            required={required}
            // can't figure out a proper way to colour this. Colouring the text
            // and background don't work, so we'll settle with inverting the colour
            className="[&::-webkit-calendar-picker-indicator]:invert"
            value={formatTime(date.from)}
            onChange={(event) =>
              onDateChange(
                updateDateRangeTime(date, "from", event.target.value),
              )
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="due-time">End Time</Label>
          <Input
            id="due-time"
            type="time"
            required={required}
            // can't figure out a proper way to colour this. Colouring the text
            // and background don't work, so we'll settle with inverting the colour
            className="[&::-webkit-calendar-picker-indicator]:invert"
            value={formatTime(date.to)}
            onChange={(event) =>
              onDateChange(updateDateRangeTime(date, "to", event.target.value))
            }
          />
        </div>
      </div>
    </div>
  );
}

export function defaultDateRange() {
  const from = new Date();
  const to = new Date(from);
  to.setDate(to.getDate() + 7);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

export function updateDateRange(
  dateRange: DateRange,
  newDateRange?: DateRange,
): DateRange {
  if (!newDateRange) {
    return dateRange;
  }

  let newFrom = undefined;
  if (newDateRange.from) {
    newFrom = new Date(newDateRange.from);
    newFrom.setHours(
      dateRange.from?.getHours() ?? 0,
      dateRange.from?.getMinutes() ?? 0,
    );
  }

  let newTo = undefined;
  if (newDateRange.to) {
    newTo = new Date(newDateRange.to);
    newTo.setHours(
      dateRange.to?.getHours() ?? 0,
      dateRange.to?.getMinutes() ?? 0,
      59,
      999,
    );
  }

  return { from: newFrom, to: newTo };
}

export function updateDateRangeTime(
  dateRange: DateRange | undefined,
  field: "from" | "to",
  time: string,
) {
  if (!dateRange) return defaultDateRange();
  const currentDate = dateRange[field];
  if (!currentDate) return dateRange;
  const [hours, minutes] = time.split(":").map(Number) as [number, number];
  const newDate = new Date(currentDate);
  newDate.setHours(
    hours,
    minutes,
    field === "to" ? 59 : 0,
    field === "to" ? 999 : 0,
  );
  return { ...dateRange, [field]: newDate };
}

export function formatTime(date: Date | undefined) {
  if (!date) return "";
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}
