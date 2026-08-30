import { describe, expect, test } from "bun:test";
import type { WastePickup } from "../../providers/types";
import { buildScheduleResponse } from "../../routes/schedule";

describe("schedule response", () => {
  test("exposes the unique normalized categories available at the address", () => {
    const pickups: WastePickup[] = [
      {
        category: "residual",
        color: "#71717a",
        date: "2030-01-02",
        fraction: "Mat-, plast- og restavfall",
        fractionId: "residual",
      },
      {
        category: "food",
        color: "#10b981",
        date: "2030-01-02",
        fraction: "Matavfall",
        fractionId: "food",
      },
      {
        category: "residual",
        color: "#71717a",
        date: "2030-01-09",
        fraction: "Restavfall",
        fractionId: "residual",
      },
      {
        category: "glass_metal",
        color: "#0d9488",
        date: "2030-02-01",
        fraction: "Glass og metall",
        fractionId: "glass-metal",
      },
    ];

    expect(buildScheduleResponse("trv", pickups)).toEqual({
      provider: "trv",
      categories: ["food", "glass_metal", "plastic", "residual"],
      pickups,
    });
  });
});
