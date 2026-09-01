import { describe, expect, test } from "bun:test";
import type { WastePickup } from "../../providers/types";
import { buildScheduleResponse } from "../../routes/schedule";

describe("schedule response", () => {
  test("exposes the unique normalized categories available at the address", () => {
    const pickups: WastePickup[] = [
      {
        categories: ["food", "plastic", "residual"],
        category: "residual",
        color: "#71717a",
        date: "2030-01-02",
        fraction: "Mat-, plast- og restavfall",
        fractionId: "residual",
      },
      {
        categories: ["food"],
        category: "food",
        color: "#10b981",
        date: "2030-01-02",
        fraction: "Matavfall",
        fractionId: "food",
      },
      {
        categories: ["residual"],
        category: "residual",
        color: "#71717a",
        date: "2030-01-09",
        fraction: "Restavfall",
        fractionId: "residual",
      },
      {
        categories: ["glass_metal"],
        category: "glass_metal",
        color: "#0d9488",
        date: "2030-02-01",
        fraction: "Glass og metall",
        fractionId: "glass-metal",
      },
    ];

    expect(buildScheduleResponse("trv", pickups)).toEqual({
      categories: ["food", "glass_metal", "plastic", "residual"],
      pickups,
      provider: "trv",
    });
  });
});
