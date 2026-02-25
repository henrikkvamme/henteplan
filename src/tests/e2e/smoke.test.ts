import { describe, expect, test } from "bun:test";
import { getProvider } from "@/providers/registry";
import {
  PROVIDER_FIXTURES,
  assertValidAddress,
  assertValidPickup,
} from "../setup";

// noinspection MagicNumber
const TIMEOUT = 30_000;

for (const [providerId, addresses] of Object.entries(PROVIDER_FIXTURES)) {
  describe(`provider: ${providerId}`, () => {
    const provider = getProvider(providerId);

    test("provider exists in registry", () => {
      expect(provider).not.toBeNull();
    });

    for (const query of addresses) {
      describe(`address: "${query}"`, () => {
        let searchResults: Awaited<
          ReturnType<NonNullable<typeof provider>["searchAddress"]>
        >;

        test(
          "searchAddress returns results",
          async () => {
            searchResults = await provider!.searchAddress(query);
            expect(searchResults.length).toBeGreaterThan(0);

            for (const result of searchResults) {
              assertValidAddress(result);
            }
          },
          TIMEOUT,
        );

        test(
          "getPickups returns valid pickups for first result",
          async () => {
            if (!searchResults || searchResults.length === 0) {
              // Re-run search if previous test result isn't available
              searchResults = await provider!.searchAddress(query);
              if (searchResults.length === 0) {
                console.warn(
                  `Skipping getPickups for ${providerId}/${query}: no search results`,
                );
                return;
              }
            }

            const pickups = await provider!.getPickups(
              searchResults[0].locationId,
            );
            expect(Array.isArray(pickups)).toBe(true);

            // Some addresses may legitimately have no upcoming pickups, but most should
            if (pickups.length > 0) {
              for (const pickup of pickups) {
                assertValidPickup(pickup);
              }
            }
          },
          TIMEOUT,
        );
      });
    }
  });
}
