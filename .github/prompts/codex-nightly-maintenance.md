# Henteplan Nightly Maintenance

Work on two independent tracks. Never treat a provider failure as fraction-classification evidence.

## Track 1: pending fraction labels

1. Use the Dokploy production workflow to run `bun run classifier:scan`, then `bun run classifier:pending -- 100`, inside the running Henteplan container. Never print environment values, API keys, cache keys, location IDs, or addresses.
2. Review only returned provider ID, normalized fraction label, fraction ID, and observation count.
3. Classify a label only when the Norwegian waste meaning is unambiguous. Allowed categories are `food`, `garden`, `glass_metal`, `hazardous`, `paper`, `plastic`, `residual`, and `other`.
4. A pickup may have several categories. For example, `papir og plastemballasje` is both `paper` and `plastic`. `other` must never be combined with a specific category.
5. Set `primaryCategory` to an included compatibility category. Prefer `residual` for compounds containing residual waste; otherwise use the first clearly named waste stream.
6. Leave ambiguous labels pending. Do not guess from a provider outage, an empty schedule, a test failure, or a generic term such as `optisk sortert avfall` without authoritative context.
7. Write a temporary JSON file containing only high-confidence routes, run `bun run classifier:apply -- <file>` inside the production container, then delete the temporary file. Re-run the scan and pending commands and verify those exact routes disappeared.

## Track 2: provider health

1. Inspect the latest `Provider Smoke Tests` result and open `provider-alert` issues.
2. Reproduce a failing provider at least twice before changing code.
3. Do not change code when the provider is unavailable, rate-limited, returning transient 5xx responses, blocking automation, or no longer exposes a feasible integration. Record the external condition on the existing issue and stop that provider track.
4. A code change is allowed only when deterministic evidence shows that Henteplan's adapter, parser, endpoint, or fixture is stale and a replacement works against the provider.
5. Keep provider changes surgical. Run the affected test and the full provider smoke suite. Create and merge a pull request only when the failing provider improves without introducing a new provider failure.

If neither track has safe work, finish without modifying code or production routes.
