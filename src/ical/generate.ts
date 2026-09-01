import ical, { ICalCalendarMethod } from "ical-generator";
import { CATEGORIES } from "../fractions/categories";
import type { WastePickup } from "../providers/types";

export function generateIcal(
  providerId: string,
  locationId: string,
  pickups: WastePickup[]
): string {
  // noinspection MagicNumber
  const calendar = ical({
    description: `Renovasjonskalender (${providerId})`,
    method: ICalCalendarMethod.PUBLISH,
    name: `Henteplan - ${providerId}`,
    timezone: "Europe/Oslo",
    ttl: 6 * 60 * 60,
  });

  for (const pickup of pickups) {
    const categoryInfos = pickup.categories.map(
      (category) => CATEGORIES[category]
    );
    calendar.createEvent({
      allDay: true,
      categories: categoryInfos.map((category) => ({
        name: category.displayName,
      })),
      description: categoryInfos
        .map((category) => category.displayName)
        .join(", "),
      id: `${providerId}:${locationId}:${pickup.date}:${pickup.fractionId}@henteplan.no`,
      start: new Date(pickup.date),
      summary: pickup.fraction,
    });
  }

  return calendar.toString();
}
