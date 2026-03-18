import { describe, expect, test } from "bun:test";
import { getProvider } from "@/providers/registry";
import {
  assertValidAddress,
  assertValidPickup,
  PROVIDER_FIXTURES,
} from "../setup";

// noinspection MagicNumber
const RETRY_DELAY_MS = 2 * 60 * 1000; // 2 minutes
// Per-provider timeout: normal run + potential 2-min retry + second run
const PROVIDER_TIMEOUT = 6 * 60 * 1000; // noinspection MagicNumber

interface AddressTestResult {
  error?: string;
  passed: boolean;
  query: string;
}

async function testAddress(
  provider: NonNullable<ReturnType<typeof getProvider>>,
  query: string
): Promise<AddressTestResult> {
  try {
    const searchResults = await provider.searchAddress(query);
    if (searchResults.length === 0) {
      return {
        query,
        passed: false,
        error: "searchAddress returned 0 results",
      };
    }
    for (const result of searchResults) {
      assertValidAddress(result as unknown as Record<string, unknown>);
    }

    const pickups = await provider.getPickups(searchResults[0].locationId);
    if (!Array.isArray(pickups)) {
      throw new Error("getPickups did not return an array");
    }

    for (const pickup of pickups) {
      assertValidPickup(pickup as unknown as Record<string, unknown>);
    }

    return { query, passed: true };
  } catch (err) {
    return {
      query,
      passed: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function testAllAddresses(
  provider: NonNullable<ReturnType<typeof getProvider>>,
  addresses: string[]
): Promise<AddressTestResult[]> {
  const results: AddressTestResult[] = [];
  for (const query of addresses) {
    results.push(await testAddress(provider, query));
  }
  return results;
}

function formatFailures(results: AddressTestResult[]): string {
  return results
    .filter((r) => !r.passed)
    .map((r) => `  - "${r.query}": ${r.error}`)
    .join("\n");
}

for (const [providerId, addresses] of Object.entries(PROVIDER_FIXTURES)) {
  describe(`provider: ${providerId}`, () => {
    test("provider exists in registry", () => {
      expect(getProvider(providerId)).not.toBeNull();
    });

    test(
      "all addresses return valid results",
      async () => {
        const provider = getProvider(providerId);
        if (!provider) {
          throw new Error(`Provider ${providerId} not found in registry`);
        }

        const results = await testAllAddresses(provider, addresses);
        const failures = results.filter((r) => !r.passed);
        const passed = results.length - failures.length;

        if (failures.length === 0) {
          console.log(
            `[status] provider=${providerId} passed=${passed} total=${results.length}`
          );
          return;
        }

        // Partial failure: some addresses failed but not all — likely stale
        // addresses, not a provider outage. Fail immediately.
        if (failures.length < addresses.length) {
          console.log(
            `[status] provider=${providerId} passed=${passed} total=${results.length}`
          );
          throw new Error(
            `${failures.length}/${addresses.length} addresses failed:\n${formatFailures(results)}`
          );
        }

        // Full outage: ALL addresses failed — likely a transient provider
        // issue. Wait 2 minutes and retry before declaring failure.
        console.warn(
          `Provider ${providerId}: all ${addresses.length} addresses failed, retrying in 2 minutes...`
        );
        console.warn(formatFailures(results));

        await Bun.sleep(RETRY_DELAY_MS);

        console.warn(`Provider ${providerId}: retrying all addresses...`);
        const retryResults = await testAllAddresses(provider, addresses);
        const retryFailures = retryResults.filter((r) => !r.passed);

        const retryPassed = retryResults.length - retryFailures.length;
        console.log(
          `[status] provider=${providerId} passed=${retryPassed} total=${retryResults.length}`
        );

        if (retryFailures.length > 0) {
          throw new Error(
            `Provider ${providerId}: retry still failed for ${retryFailures.length}/${addresses.length} addresses:\n${formatFailures(retryResults)}`
          );
        }

        console.warn(
          `Provider ${providerId}: retry passed — outage was transient`
        );
      },
      PROVIDER_TIMEOUT
    );
  });
}
