# Fraction classifier

Henteplan classifies provider fraction labels behind one interface in `src/fractions/classifier.ts`.

## Runtime behavior

1. Normalize Unicode, casing, dash variants, and whitespace.
2. Prefer a provider-specific approved database route, then a global built-in route.
3. Apply conservative keyword classification, including multiple categories when several explicit waste streams occur in one label.
4. Record an unknown provider-scoped label as pending and return `other` until it is reviewed.

Every pickup exposes `categories`, which contains all represented waste streams. The singular `category` field remains as a deprecated compatibility field.

The first-class categories are `food`, `garden`, `glass_metal`, `hazardous`, `paper`, `plastic`, `residual`, and `other`. Former zero-observation groups such as carton, Christmas tree, textile, and wood route to `other`. Garden and hazardous remain first-class because production schedules contain real dated pickups from multiple providers.

## Learning table

The `fraction_classifications` SQLite table is stored in the existing persistent Henteplan database. Its key is `(provider_id, normalized_label)`. It records:

- pending or approved state;
- ordered categories and compatibility primary category;
- built-in, deterministic heuristic, or Codex source;
- a bounded example label and provider fraction ID;
- first/last observation timestamps and observation count;
- review rationale and timestamp.

Provider-specific approved routes override global built-ins. Invalid category combinations are rejected transactionally. `other` cannot be combined with a specific category.

## Operator commands

```sh
bun run classifier:pending -- 100
bun run classifier:scan
bun run classifier:apply -- /path/to/routes.json
```

The apply file is a JSON array:

```json
[
  {
    "providerId": "example",
    "normalizedLabel": "papir og plastemballasje",
    "categories": ["paper", "plastic"],
    "primaryCategory": "paper",
    "rationale": "Both waste streams are explicit in the provider label"
  }
]
```

Nightly maintenance follows `.github/prompts/codex-nightly-maintenance.md`. It may resolve high-confidence classifier labels, but it must leave ambiguous labels pending and must not reinterpret provider outages as classifier problems.
