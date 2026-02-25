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
    name: `Henteplan - ${providerId}`,
    description: `Renovasjonskalender (${providerId})`,
    method: ICalCalendarMethod.PUBLISH,
    timezone: "Europe/Oslo",
    ttl: 6 * 60 * 60,
  });

  for (const pickup of pickups) {
    const categoryInfo = CATEGORIES[pickup.category];
    calendar.createEvent({
      id: `${providerId}:${locationId}:${pickup.date}:${pickup.fractionId}@henteplan.no`,
      start: new Date(pickup.date),
      allDay: true,
      summary: pickup.fraction,
      description: categoryInfo.displayName,
      categories: [{ name: categoryInfo.displayName }],
    });
  }

  return calendar.toString();
}
