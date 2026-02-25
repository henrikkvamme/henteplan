import { describe, expect, test } from "bun:test";
import { generateIcal } from "@/ical/generate";
import type { WastePickup } from "@/providers/types";

const samplePickups: WastePickup[] = [
  {
    date: "2026-03-05",
    fraction: "Restavfall",
    fractionId: "1",
    category: "residual",
    color: "#71717a",
  },
  {
    date: "2026-03-12",
    fraction: "Papir",
    fractionId: "2",
    category: "paper",
    color: "#3b82f6",
  },
];

describe("generateIcal", () => {
  test("returns valid iCal string", () => {
    const result = generateIcal("trv", "loc-123", samplePickups);

    expect(result).toContain("BEGIN:VCALENDAR");
    expect(result).toContain("END:VCALENDAR");
    expect(result).toContain("BEGIN:VEVENT");
    expect(result).toContain("END:VEVENT");
  });

  test("includes provider name in calendar name", () => {
    const result = generateIcal("trv", "loc-123", samplePickups);
    expect(result).toContain("trv");
  });

  test("includes fraction names as event summaries", () => {
    const result = generateIcal("trv", "loc-123", samplePickups);
    expect(result).toContain("Restavfall");
    expect(result).toContain("Papir");
  });

  test("includes event UIDs with provider and location", () => {
    const result = generateIcal("trv", "loc-123", samplePickups);
    expect(result).toContain("trv:loc-123");
    expect(result).toContain("@henteplan.no");
  });

  test("handles empty pickups array", () => {
    const result = generateIcal("trv", "loc-123", []);

    expect(result).toContain("BEGIN:VCALENDAR");
    expect(result).toContain("END:VCALENDAR");
    expect(result).not.toContain("BEGIN:VEVENT");
  });

  test("creates one event per pickup", () => {
    const result = generateIcal("trv", "loc-123", samplePickups);
    const eventCount = (result.match(/BEGIN:VEVENT/g) || []).length;
    expect(eventCount).toBe(2);
  });

  test("sets METHOD to PUBLISH", () => {
    const result = generateIcal("trv", "loc-123", samplePickups);
    expect(result).toContain("METHOD:PUBLISH");
  });
});
