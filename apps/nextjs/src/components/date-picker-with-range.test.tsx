import { describe, expect, it } from "vitest";

import type { DateRange } from "@package/ui/calendar";

import {
  defaultDateRange,
  formatTime,
  updateDateRange,
  updateDateRangeTime,
} from "~/components/date-picker-with-range";

describe("DatePickerWithRange", () => {
  describe("defaultDateRange", () => {
    it("should return a DateRange with from and to dates", () => {
      const result = defaultDateRange();

      expect(result.from).toBeInstanceOf(Date);
      expect(result.to).toBeInstanceOf(Date);
    });

    it("should set 'to' date to 7 days after 'from' date", () => {
      const result = defaultDateRange();

      const fromDateOnly = new Date(result.from);
      fromDateOnly.setHours(0, 0, 0, 0);
      const toDateOnly = new Date(result.to);
      toDateOnly.setHours(0, 0, 0, 0);

      const fromMs = fromDateOnly.getTime();
      const toMs = toDateOnly.getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      expect(toMs - fromMs).toBe(sevenDaysMs);
    });

    it("should set 'to' time to 23:59:59.999", () => {
      const result = defaultDateRange();

      expect(result.to.getHours()).toBe(23);
      expect(result.to.getMinutes()).toBe(59);
      expect(result.to.getSeconds()).toBe(59);
      expect(result.to.getMilliseconds()).toBe(999);
    });
  });

  describe("formatTime", () => {
    it("should return empty string for undefined", () => {
      expect(formatTime(undefined)).toBe("");
    });

    it("should return formatted time with leading zeros", () => {
      const date = new Date();
      date.setHours(9, 5, 0, 0);

      expect(formatTime(date)).toBe("09:05");
    });

    it("should handle double-digit hours and minutes", () => {
      const date = new Date();
      date.setHours(14, 30, 0, 0);

      expect(formatTime(date)).toBe("14:30");
    });

    it("should handle zero values", () => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);

      expect(formatTime(date)).toBe("00:00");
    });
  });

  describe("updateDateRangeTime", () => {
    it("should return defaultDateRange when dateRange is undefined", () => {
      const result = updateDateRangeTime(undefined, "from", "10:30");

      expect(result.from).toBeInstanceOf(Date);
      expect(result.to).toBeInstanceOf(Date);
    });

    it("should update the 'from' time", () => {
      const dateRange: DateRange = {
        from: new Date(2024, 0, 1, 8, 0),
        to: new Date(2024, 0, 8, 23, 59),
      };

      const result = updateDateRangeTime(dateRange, "from", "14:30");

      expect(result.from?.getHours()).toBe(14);
      expect(result.from?.getMinutes()).toBe(30);
    });

    it("should update the 'to' time and set seconds/milliseconds for end of day", () => {
      const dateRange: DateRange = {
        from: new Date(2024, 0, 1, 8, 0),
        to: new Date(2024, 0, 8, 23, 59),
      };

      const result = updateDateRangeTime(dateRange, "to", "23:45");

      expect(result.to?.getHours()).toBe(23);
      expect(result.to?.getMinutes()).toBe(45);
      expect(result.to?.getSeconds()).toBe(59);
      expect(result.to?.getMilliseconds()).toBe(999);
    });

    it("should preserve the date portion", () => {
      const dateRange: DateRange = {
        from: new Date(2024, 5, 15, 8, 0),
        to: new Date(2024, 5, 22, 23, 59),
      };

      const result = updateDateRangeTime(dateRange, "from", "12:00");

      expect(result.from?.getFullYear()).toBe(2024);
      expect(result.from?.getMonth()).toBe(5);
      expect(result.from?.getDate()).toBe(15);
    });

    it("should return original dateRange when field date is undefined", () => {
      const dateRange: DateRange = {
        from: undefined,
        to: new Date(2024, 0, 8, 23, 59),
      };

      const result = updateDateRangeTime(dateRange, "from", "10:00");

      expect(result.from).toBeUndefined();
      expect(result.to).toBe(dateRange.to);
    });
  });

  describe("updateDateRange", () => {
    it("should return the original dateRange when newDateRange is undefined", () => {
      const dateRange: DateRange = {
        from: new Date(2024, 0, 1, 8, 0),
        to: new Date(2024, 0, 8, 23, 59),
      };

      const result = updateDateRange(dateRange, undefined);

      expect(result.from).toBe(dateRange.from);
      expect(result.to).toBe(dateRange.to);
    });

    it("should preserve time from original dateRange 'from'", () => {
      const dateRange: DateRange = {
        from: new Date(2024, 0, 1, 10, 30),
        to: new Date(2024, 0, 8, 23, 59),
      };

      const newDateRange: DateRange = {
        from: new Date(2024, 1, 15),
        to: new Date(2024, 1, 20),
      };

      const result = updateDateRange(dateRange, newDateRange);

      expect(result.from?.getHours()).toBe(10);
      expect(result.from?.getMinutes()).toBe(30);
      expect(result.from?.getDate()).toBe(15);
      expect(result.from?.getMonth()).toBe(1);
    });

    it("should preserve time from original dateRange 'to'", () => {
      const dateRange: DateRange = {
        from: new Date(2024, 0, 1, 8, 0),
        to: new Date(2024, 0, 8, 14, 45),
      };

      const newDateRange: DateRange = {
        from: new Date(2024, 1, 15),
        to: new Date(2024, 1, 20),
      };

      const result = updateDateRange(dateRange, newDateRange);

      expect(result.to?.getHours()).toBe(14);
      expect(result.to?.getMinutes()).toBe(45);
      expect(result.to?.getSeconds()).toBe(59);
      expect(result.to?.getMilliseconds()).toBe(999);
      expect(result.to?.getDate()).toBe(20);
      expect(result.to?.getMonth()).toBe(1);
    });

    it("should use default hours when original dateRange has no time", () => {
      const dateRange: DateRange = {
        from: new Date(2024, 0, 1),
        to: new Date(2024, 0, 8),
      };

      const newDateRange: DateRange = {
        from: new Date(2024, 1, 15),
        to: new Date(2024, 1, 20),
      };

      const result = updateDateRange(dateRange, newDateRange);

      expect(result.from?.getHours()).toBe(0);
      expect(result.from?.getMinutes()).toBe(0);
    });

    it("should preserve year from new dateRange", () => {
      const dateRange: DateRange = {
        from: new Date(2024, 0, 1, 8, 0),
        to: new Date(2024, 0, 8, 23, 59),
      };

      const newDateRange: DateRange = {
        from: new Date(2025, 5, 15),
        to: new Date(2025, 5, 20),
      };

      const result = updateDateRange(dateRange, newDateRange);

      expect(result.from?.getFullYear()).toBe(2025);
      expect(result.to?.getFullYear()).toBe(2025);
    });

    it("should handle newDateRange with only 'from' set", () => {
      const dateRange: DateRange = {
        from: new Date(2024, 0, 1, 8, 0),
        to: new Date(2024, 0, 8, 23, 59),
      };

      const newDateRange: DateRange = {
        from: new Date(2024, 1, 15),
        to: undefined,
      };

      const result = updateDateRange(dateRange, newDateRange);

      expect(result.from?.getDate()).toBe(15);
      expect(result.from?.getMonth()).toBe(1);
      expect(result.to).toBeUndefined();
    });

    it("should return original dateRange when both have same dates but preserve time", () => {
      const dateRange: DateRange = {
        from: new Date(2024, 0, 1, 10, 30),
        to: new Date(2024, 0, 8, 14, 45),
      };

      const newDateRange: DateRange = {
        from: new Date(2024, 0, 1),
        to: new Date(2024, 0, 8),
      };

      const result = updateDateRange(dateRange, newDateRange);

      expect(result.from?.getHours()).toBe(10);
      expect(result.from?.getMinutes()).toBe(30);
      expect(result.to?.getHours()).toBe(14);
      expect(result.to?.getMinutes()).toBe(45);
      expect(result.to?.getSeconds()).toBe(59);
      expect(result.to?.getMilliseconds()).toBe(999);
    });
  });
});
