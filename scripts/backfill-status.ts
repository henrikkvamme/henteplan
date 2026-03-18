/**
 * Backfill provider_checks from historical GitHub Actions smoke test runs.
 * Usage: HENTEPLAN_API_KEY=xxx bun run scripts/backfill-status.ts [--url https://henteplan.no]
 */

const API_URL = process.argv.includes("--url")
  ? process.argv[process.argv.indexOf("--url") + 1]
  : "https://henteplan.no";
const API_KEY = process.env.HENTEPLAN_API_KEY;

if (!API_KEY) {
  console.error("HENTEPLAN_API_KEY is required");
  process.exit(1);
}

interface RunInfo {
  databaseId: number;
  createdAt: string;
  conclusion: string;
}

async function getRuns(): Promise<RunInfo[]> {
  const proc = Bun.spawn(
    [
      "gh", "run", "list",
      "--workflow=smoke-tests.yml",
      "--limit", "100",
      "--json", "databaseId,conclusion,createdAt",
    ],
    { stdout: "pipe" }
  );
  const text = await new Response(proc.stdout).text();
  return JSON.parse(text) as RunInfo[];
}

async function getRunLog(runId: number): Promise<string> {
  const proc = Bun.spawn(
    ["gh", "run", "view", String(runId), "--log"],
    { stdout: "pipe", stderr: "pipe" }
  );
  return new Response(proc.stdout).text();
}

interface ProviderResult {
  providerId: string;
  total: number;
  passed: number;
}

function parseLog(log: string): ProviderResult[] {
  const counts = new Map<string, { total: number; passed: number }>();

  for (const line of log.split("\n")) {
    // Old format: (pass) provider: trv > address: "..." > testName
    const match = line.match(/\((pass|fail)\) provider: (\w+) > address:/);
    if (!match) continue;

    const [, result, provider] = match;
    if (!counts.has(provider)) {
      counts.set(provider, { total: 0, passed: 0 });
    }
    const entry = counts.get(provider)!;
    entry.total++;
    if (result === "pass") {
      entry.passed++;
    }
  }

  return Array.from(counts.entries()).map(([providerId, { total, passed }]) => ({
    providerId,
    // Each address has 2 test lines (searchAddress + getPickups), normalize to address count
    total: Math.ceil(total / 2),
    passed: Math.ceil(passed / 2),
  }));
}

async function reportChecks(checks: ProviderResult[], checkedAt: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/api/v1/status/report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY!,
    },
    body: JSON.stringify({
      checks,
      checkedAt, // Will be ignored by current API — we'll need to handle this
    }),
  });
  return res.ok;
}

async function main() {
  console.log(`Fetching workflow runs...`);
  const runs = await getRuns();
  const validRuns = runs.filter((r) => r.conclusion !== "cancelled");
  console.log(`Found ${validRuns.length} runs to backfill\n`);

  // Process oldest first so timestamps are in order
  for (const run of validRuns.reverse()) {
    process.stdout.write(`Run ${run.databaseId} (${run.createdAt.slice(0, 10)})... `);

    const log = await getRunLog(run.databaseId);
    const checks = parseLog(log);

    if (checks.length === 0) {
      console.log("no provider data found, skipping");
      continue;
    }

    const ok = await reportChecks(checks, run.createdAt);
    const summary = checks
      .map((c) => `${c.providerId}:${c.passed}/${c.total}`)
      .join(" ");
    console.log(ok ? `OK (${summary})` : "FAILED to report");
  }

  console.log("\nDone!");
}

main();
