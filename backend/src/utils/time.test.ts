import { expect, test, describe } from "bun:test";
import {
  timestampToMinutes,
  getTimeSlotFromTimestamp,
  validateTimestampInTimeSlot,
  formatTimestampToTime,
} from "./time";

describe("time utilities", () => {
  describe("timestampToMinutes", () => {
    test("converts midnight to 0", () => {
      const date = new Date("2025-10-02T00:00:00Z");
      expect(timestampToMinutes(date)).toBe(0);
    });

    test("converts noon to 720", () => {
      const date = new Date("2025-10-02T12:00:00Z");
      expect(timestampToMinutes(date)).toBe(720);
    });

    test("handles minutes correctly", () => {
      const date = new Date("2025-10-02T14:30:00Z");
      expect(timestampToMinutes(date)).toBe(870); // 14*60 + 30
    });

    test("handles early morning hours", () => {
      const date = new Date("2025-10-02T04:30:00Z");
      expect(timestampToMinutes(date)).toBe(270); // 4*60 + 30
    });

    test("handles late evening hours", () => {
      const date = new Date("2025-10-02T23:59:00Z");
      expect(timestampToMinutes(date)).toBe(1439); // 23*60 + 59
    });

    test("handles single digit hours and minutes", () => {
      const date = new Date("2025-10-02T01:05:00Z");
      expect(timestampToMinutes(date)).toBe(65); // 1*60 + 5
    });
  });

  describe("getTimeSlotFromTimestamp", () => {
    test("returns 'morning' for 4:30 AM (boundary start)", () => {
      const date = new Date("2025-10-02T04:30:00Z");
      expect(getTimeSlotFromTimestamp(date)).toBe("morning");
    });

    test("returns 'morning' for 8:00 AM", () => {
      const date = new Date("2025-10-02T08:00:00Z");
      expect(getTimeSlotFromTimestamp(date)).toBe("morning");
    });

    test("returns 'morning' for 11:59 AM", () => {
      const date = new Date("2025-10-02T11:59:00Z");
      expect(getTimeSlotFromTimestamp(date)).toBe("morning");
    });

    test("returns 'afternoon' for 12:00 PM (noon boundary)", () => {
      const date = new Date("2025-10-02T12:00:00Z");
      expect(getTimeSlotFromTimestamp(date)).toBe("afternoon");
    });

    test("returns 'afternoon' for 2:00 PM", () => {
      const date = new Date("2025-10-02T14:00:00Z");
      expect(getTimeSlotFromTimestamp(date)).toBe("afternoon");
    });

    test("returns 'afternoon' for 5:59 PM", () => {
      const date = new Date("2025-10-02T17:59:00Z");
      expect(getTimeSlotFromTimestamp(date)).toBe("afternoon");
    });

    test("returns 'night' for 6:00 PM (boundary start)", () => {
      const date = new Date("2025-10-02T18:00:00Z");
      expect(getTimeSlotFromTimestamp(date)).toBe("night");
    });

    test("returns 'night' for 8:00 PM", () => {
      const date = new Date("2025-10-02T20:00:00Z");
      expect(getTimeSlotFromTimestamp(date)).toBe("night");
    });

    test("returns 'night' for 11:59 PM", () => {
      const date = new Date("2025-10-02T23:59:00Z");
      expect(getTimeSlotFromTimestamp(date)).toBe("night");
    });

    test("returns 'night' for early morning hours before 4:30 AM", () => {
      const date = new Date("2025-10-02T02:00:00Z");
      expect(getTimeSlotFromTimestamp(date)).toBe("night");
    });

    test("returns 'night' for 4:29 AM (just before morning)", () => {
      const date = new Date("2025-10-02T04:29:00Z");
      expect(getTimeSlotFromTimestamp(date)).toBe("night");
    });
  });

  describe("validateTimestampInTimeSlot", () => {
    describe("morning validation", () => {
      test("validates morning slot at 4:30 AM", () => {
        const morningTime = new Date("2025-10-02T04:30:00Z");
        expect(validateTimestampInTimeSlot("morning", morningTime)).toBe(true);
      });

      test("validates morning slot at 8:00 AM", () => {
        const morningTime = new Date("2025-10-02T08:00:00Z");
        expect(validateTimestampInTimeSlot("morning", morningTime)).toBe(true);
      });

      test("validates morning slot at 11:59 AM", () => {
        const morningTime = new Date("2025-10-02T11:59:00Z");
        expect(validateTimestampInTimeSlot("morning", morningTime)).toBe(true);
      });

      test("rejects morning slot at noon", () => {
        const afternoonTime = new Date("2025-10-02T12:00:00Z");
        expect(validateTimestampInTimeSlot("morning", afternoonTime)).toBe(false);
      });

      test("rejects morning slot at 4:29 AM", () => {
        const nightTime = new Date("2025-10-02T04:29:00Z");
        expect(validateTimestampInTimeSlot("morning", nightTime)).toBe(false);
      });
    });

    describe("afternoon validation", () => {
      test("validates afternoon slot at noon", () => {
        const afternoonTime = new Date("2025-10-02T12:00:00Z");
        expect(validateTimestampInTimeSlot("afternoon", afternoonTime)).toBe(true);
      });

      test("validates afternoon slot at 2:00 PM", () => {
        const afternoonTime = new Date("2025-10-02T14:00:00Z");
        expect(validateTimestampInTimeSlot("afternoon", afternoonTime)).toBe(true);
      });

      test("validates afternoon slot at 5:59 PM", () => {
        const afternoonTime = new Date("2025-10-02T17:59:00Z");
        expect(validateTimestampInTimeSlot("afternoon", afternoonTime)).toBe(true);
      });

      test("rejects afternoon slot at 6:00 PM", () => {
        const nightTime = new Date("2025-10-02T18:00:00Z");
        expect(validateTimestampInTimeSlot("afternoon", nightTime)).toBe(false);
      });

      test("rejects afternoon slot at 11:59 AM", () => {
        const morningTime = new Date("2025-10-02T11:59:00Z");
        expect(validateTimestampInTimeSlot("afternoon", morningTime)).toBe(false);
      });
    });

    describe("night validation", () => {
      test("validates night slot at 6:00 PM", () => {
        const nightTime = new Date("2025-10-02T18:00:00Z");
        expect(validateTimestampInTimeSlot("night", nightTime)).toBe(true);
      });

      test("validates night slot at 8:00 PM", () => {
        const nightTime = new Date("2025-10-02T20:00:00Z");
        expect(validateTimestampInTimeSlot("night", nightTime)).toBe(true);
      });

      test("validates night slot at 11:59 PM", () => {
        const nightTime = new Date("2025-10-02T23:59:00Z");
        expect(validateTimestampInTimeSlot("night", nightTime)).toBe(true);
      });

      test("rejects night slot at noon", () => {
        const afternoonTime = new Date("2025-10-02T12:00:00Z");
        expect(validateTimestampInTimeSlot("night", afternoonTime)).toBe(false);
      });

      test("rejects night slot at 4:30 AM", () => {
        const morningTime = new Date("2025-10-02T04:30:00Z");
        expect(validateTimestampInTimeSlot("night", morningTime)).toBe(false);
      });
    });

    describe("edge cases", () => {
      test("returns true for empty timeSlot", () => {
        const anyTime = new Date("2025-10-02T14:00:00Z");
        expect(validateTimestampInTimeSlot("", anyTime)).toBe(true);
      });

      test("returns false for invalid timeSlot", () => {
        const anyTime = new Date("2025-10-02T14:00:00Z");
        expect(validateTimestampInTimeSlot("invalid", anyTime)).toBe(false);
      });

      test("handles null timestamp gracefully", () => {
        expect(validateTimestampInTimeSlot("morning", null as any)).toBe(true);
      });

      test("handles null timeSlot gracefully", () => {
        const anyTime = new Date("2025-10-02T14:00:00Z");
        expect(validateTimestampInTimeSlot(null as any, anyTime)).toBe(true);
      });
    });
  });

  describe("formatTimestampToTime", () => {
    test("formats midnight correctly", () => {
      const date = new Date("2025-10-02T00:00:00Z");
      expect(formatTimestampToTime(date)).toBe("00:00");
    });

    test("formats time with leading zeros for hours", () => {
      const date = new Date("2025-10-02T08:05:00Z");
      expect(formatTimestampToTime(date)).toBe("08:05");
    });

    test("formats time with leading zeros for minutes", () => {
      const date = new Date("2025-10-02T14:05:00Z");
      expect(formatTimestampToTime(date)).toBe("14:05");
    });

    test("formats time without leading zeros needed", () => {
      const date = new Date("2025-10-02T14:30:00Z");
      expect(formatTimestampToTime(date)).toBe("14:30");
    });

    test("formats noon correctly", () => {
      const date = new Date("2025-10-02T12:00:00Z");
      expect(formatTimestampToTime(date)).toBe("12:00");
    });

    test("formats late evening correctly", () => {
      const date = new Date("2025-10-02T23:59:00Z");
      expect(formatTimestampToTime(date)).toBe("23:59");
    });

    test("formats early morning correctly", () => {
      const date = new Date("2025-10-02T01:05:00Z");
      expect(formatTimestampToTime(date)).toBe("01:05");
    });

    test("ignores seconds in formatting", () => {
      const date = new Date("2025-10-02T14:30:45Z");
      expect(formatTimestampToTime(date)).toBe("14:30");
    });

    test("handles different dates with same time", () => {
      const date1 = new Date("2025-01-01T14:30:00Z");
      const date2 = new Date("2025-12-31T14:30:00Z");
      expect(formatTimestampToTime(date1)).toBe("14:30");
      expect(formatTimestampToTime(date2)).toBe("14:30");
    });
  });
});
