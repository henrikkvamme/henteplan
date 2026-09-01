import { z } from "zod";
import type { FractionCategory, WastePickup } from "../providers/types";
import { db } from "../storage/database";
import { CATEGORIES } from "./categories";

export const fractionCategoryValues = [
  "food",
  "garden",
  "glass_metal",
  "hazardous",
  "paper",
  "plastic",
  "residual",
  "other",
] as const satisfies readonly FractionCategory[];

const fractionCategorySchema = z.enum(fractionCategoryValues);
const categoriesSchema = z
  .array(fractionCategorySchema)
  .min(1)
  .max(fractionCategoryValues.length)
  .superRefine((categories, context) => {
    if (new Set(categories).size !== categories.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Categories must be unique",
      });
    }
    if (categories.includes("other") && categories.length > 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Other cannot be combined with a specific category",
      });
    }
  });

const routeInputSchema = z
  .object({
    categories: categoriesSchema,
    normalizedLabel: z.string().min(1).max(200),
    primaryCategory: fractionCategorySchema,
    providerId: z.string().min(1).max(100),
    rationale: z.string().min(8).max(500),
  })
  .superRefine((route, context) => {
    if (!route.categories.includes(route.primaryCategory)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Primary category must be included in categories",
        path: ["primaryCategory"],
      });
    }
    if (
      normalizeFractionLabel(route.normalizedLabel) !== route.normalizedLabel
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Label must already be normalized",
        path: ["normalizedLabel"],
      });
    }
  });

export type FractionRouteInput = z.infer<typeof routeInputSchema>;

export interface FractionClassification {
  categories: FractionCategory[];
  primaryCategory: FractionCategory;
  source: "builtin" | "codex" | "heuristic" | "pending";
}

interface StoredRoute {
  categories_json: string | null;
  normalized_label: string;
  primary_category: FractionCategory | null;
  provider_id: string;
  source: "builtin" | "codex" | "heuristic";
  state: "approved" | "pending";
}

interface PendingRow {
  example_label: string;
  first_seen_at: number;
  fraction_id: string | null;
  last_seen_at: number;
  normalized_label: string;
  observation_count: number;
  provider_id: string;
}

const categoryOrder = new Map(
  fractionCategoryValues.map((category, index) => [category, index])
);

const serviceLabelPattern =
  /(?:^|\W)(?:utkjøring|utlevering|poser|sekker)(?:$|\W)/u;
const categoryKeywordPatterns: ReadonlyArray<
  readonly [RegExp, FractionCategory]
> = [
  [/(?:^|\W)(?:matavfall|bioavfall|organic|mat)(?:$|\W)/u, "food"],
  [/(?:^|\W)(?:restavfall|rest)(?:$|\W)/u, "residual"],
  [/(?:^|\W)(?:papir|papp)(?:$|\W)/u, "paper"],
  [/(?:^|\W)(?:plastemballasje|plast)(?:$|\W)/u, "plastic"],
  [/(?:^|\W)(?:glass|metallemb|hermetikk)(?:$|\W)/u, "glass_metal"],
  [/(?:^|\W)(?:hageavfall|hage)(?:$|\W)/u, "garden"],
  [/(?:^|\W)farlig avfall(?:$|\W)/u, "hazardous"],
];

const classificationTableSql = `
  CREATE TABLE IF NOT EXISTS fraction_classifications (
    provider_id TEXT NOT NULL,
    normalized_label TEXT NOT NULL,
    example_label TEXT NOT NULL,
    fraction_id TEXT,
    state TEXT NOT NULL CHECK (state IN ('pending', 'approved')),
    categories_json TEXT,
    primary_category TEXT,
    source TEXT NOT NULL CHECK (source IN ('builtin', 'codex', 'heuristic')),
    rationale TEXT,
    observation_count INTEGER NOT NULL DEFAULT 0,
    first_seen_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL,
    reviewed_at INTEGER,
    PRIMARY KEY (provider_id, normalized_label),
    CHECK (
      (state = 'pending' AND categories_json IS NULL AND primary_category IS NULL) OR
      (state = 'approved' AND categories_json IS NOT NULL AND primary_category IS NOT NULL)
    )
  )
`;

db.exec(classificationTableSql);
const storedTableDefinition = db
  .query<{ sql: string }, []>(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'fraction_classifications'"
  )
  .get()?.sql;
if (storedTableDefinition && !storedTableDefinition.includes("'heuristic'")) {
  const migrateClassifications = db.transaction(() => {
    db.exec(
      "ALTER TABLE fraction_classifications RENAME TO fraction_classifications_legacy"
    );
    db.exec(classificationTableSql);
    db.exec(`
      INSERT INTO fraction_classifications (
        provider_id, normalized_label, example_label, fraction_id, state,
        categories_json, primary_category, source, rationale,
        observation_count, first_seen_at, last_seen_at, reviewed_at
      )
      SELECT provider_id, normalized_label, example_label, fraction_id, state,
             categories_json, primary_category,
             CASE WHEN source IN ('builtin', 'codex', 'heuristic') THEN source ELSE 'codex' END,
             rationale, observation_count, first_seen_at, last_seen_at, reviewed_at
      FROM fraction_classifications_legacy
    `);
    db.exec("DROP TABLE fraction_classifications_legacy");
  });
  migrateClassifications();
}
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_fraction_classifications_pending
  ON fraction_classifications (state, last_seen_at DESC)
`);

const findRoute = db.prepare<StoredRoute, [string, string, string]>(`
  SELECT provider_id, normalized_label, state, categories_json,
         primary_category, source
  FROM fraction_classifications
  WHERE normalized_label = ?1 AND provider_id IN (?2, ?3) AND state = 'approved'
  ORDER BY CASE WHEN provider_id = ?2 THEN 0 ELSE 1 END
  LIMIT 1
`);

const recordPending = db.prepare(`
  INSERT INTO fraction_classifications (
    provider_id, normalized_label, example_label, fraction_id, state,
    categories_json, primary_category, source, rationale,
    observation_count, first_seen_at, last_seen_at, reviewed_at
  ) VALUES (?1, ?2, ?3, ?4, 'pending', NULL, NULL, 'codex', NULL, 1, ?5, ?5, NULL)
  ON CONFLICT (provider_id, normalized_label) DO UPDATE SET
    example_label = excluded.example_label,
    fraction_id = COALESCE(excluded.fraction_id, fraction_classifications.fraction_id),
    observation_count = fraction_classifications.observation_count + 1,
    last_seen_at = excluded.last_seen_at
  WHERE fraction_classifications.state = 'pending'
`);

const recordHeuristic = db.prepare(`
  INSERT INTO fraction_classifications (
    provider_id, normalized_label, example_label, fraction_id, state,
    categories_json, primary_category, source, rationale,
    observation_count, first_seen_at, last_seen_at, reviewed_at
  ) VALUES (?1, ?2, ?3, ?4, 'approved', ?5, ?6, 'heuristic',
            'Conservative deterministic keyword route', 1, ?7, ?7, ?7)
  ON CONFLICT (provider_id, normalized_label) DO UPDATE SET
    example_label = excluded.example_label,
    fraction_id = COALESCE(excluded.fraction_id, fraction_classifications.fraction_id),
    observation_count = fraction_classifications.observation_count + 1,
    last_seen_at = excluded.last_seen_at
  WHERE fraction_classifications.source = 'heuristic'
`);

const listPending = db.prepare<PendingRow, [number]>(`
  SELECT provider_id, normalized_label, example_label, fraction_id,
         observation_count, first_seen_at, last_seen_at
  FROM fraction_classifications
  WHERE state = 'pending'
  ORDER BY observation_count DESC, first_seen_at ASC
  LIMIT ?1
`);

const applyRoute = db.prepare(`
  INSERT INTO fraction_classifications (
    provider_id, normalized_label, example_label, fraction_id, state,
    categories_json, primary_category, source, rationale,
    observation_count, first_seen_at, last_seen_at, reviewed_at
  ) VALUES (?1, ?2, ?2, NULL, 'approved', ?3, ?4, 'codex', ?5, 0, ?6, ?6, ?6)
  ON CONFLICT (provider_id, normalized_label) DO UPDATE SET
    state = 'approved',
    categories_json = excluded.categories_json,
    primary_category = excluded.primary_category,
    source = 'codex',
    rationale = excluded.rationale,
    reviewed_at = excluded.reviewed_at,
    last_seen_at = excluded.last_seen_at
`);

const cachedRows = db.prepare<{ data: string; key: string }, []>(
  "SELECT key, data FROM cache"
);
const updateCachedRow = db.prepare("UPDATE cache SET data = ?1 WHERE key = ?2");

const builtinRoutes: ReadonlyArray<{
  categories: FractionCategory[];
  labels: string[];
  primaryCategory: FractionCategory;
}> = [
  {
    categories: ["residual"],
    labels: [
      "restavfall",
      "rest",
      "restavfall til forbrenning",
      "restavfall/ residual waste",
    ],
    primaryCategory: "residual",
  },
  {
    categories: ["food"],
    labels: [
      "matavfall",
      "matavfall uten hageavfall",
      "bioavfall",
      "mat",
      "matavfall/ organic",
    ],
    primaryCategory: "food",
  },
  {
    categories: ["paper"],
    labels: [
      "papir",
      "papir og papp",
      "papp og papir",
      "papp- og papiravfall",
      "papp/papir",
      "papiravfall",
      "papir, papp",
      "papir/ paper",
      "papp, papir og drikkekartong",
      "papp, papir og kartong",
      "papp, papir, kartong",
      "papir og drikkekartong",
    ],
    primaryCategory: "paper",
  },
  {
    categories: ["plastic"],
    labels: ["plastemballasje", "plast", "plastemballasje/ plastic packaging"],
    primaryCategory: "plastic",
  },
  {
    categories: ["glass_metal"],
    labels: [
      "glass og metallemballasje",
      "glass- og metallemballasje",
      "glass og metall",
      "glass/metallemballasje",
      "glas- og metallemballasje",
      "glass-/metallemb",
      "hermetikk- og glassemballasje",
    ],
    primaryCategory: "glass_metal",
  },
  {
    categories: ["garden"],
    labels: ["hageavfall", "hage"],
    primaryCategory: "garden",
  },
  {
    categories: ["hazardous"],
    labels: ["farlig avfall"],
    primaryCategory: "hazardous",
  },
  {
    categories: ["food", "plastic", "residual"],
    labels: ["mat-, plast- og restavfall"],
    primaryCategory: "residual",
  },
  {
    categories: ["food", "residual"],
    labels: ["mat-/restavfall"],
    primaryCategory: "residual",
  },
  {
    categories: ["paper", "plastic"],
    labels: [
      "papir og plast",
      "papir og plastemballasje",
      "papir/plastemballasje",
    ],
    primaryCategory: "paper",
  },
  {
    categories: ["other"],
    labels: [
      "drikkekartonger",
      "juletre",
      "tekstiler",
      "tekstil",
      "trevirke",
      "utkjøring plast- og matposer",
    ],
    primaryCategory: "other",
  },
];

const insertBuiltin = db.prepare(`
  INSERT OR IGNORE INTO fraction_classifications (
    provider_id, normalized_label, example_label, fraction_id, state,
    categories_json, primary_category, source, rationale,
    observation_count, first_seen_at, last_seen_at, reviewed_at
  ) VALUES ('*', ?1, ?1, NULL, 'approved', ?2, ?3, 'builtin',
            'Built-in deterministic route', 0, ?4, ?4, ?4)
`);

const now = Date.now();
const seedBuiltins = db.transaction(() => {
  for (const route of builtinRoutes) {
    for (const label of route.labels) {
      insertBuiltin.run(
        normalizeFractionLabel(label),
        JSON.stringify(route.categories),
        route.primaryCategory,
        now
      );
    }
  }
});
seedBuiltins();

export function normalizeFractionLabel(fraction: string): string {
  return fraction
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("nb-NO")
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, " ");
}

function parseStoredRoute(route: StoredRoute): FractionClassification | null {
  if (
    route.state !== "approved" ||
    route.categories_json === null ||
    route.primary_category === null
  ) {
    return null;
  }
  const categories = categoriesSchema.parse(JSON.parse(route.categories_json));
  if (!categories.includes(route.primary_category)) {
    throw new Error(
      `Stored fraction route has an invalid primary category: ${route.provider_id}/${route.normalized_label}`
    );
  }
  return {
    categories: [...categories],
    primaryCategory: route.primary_category,
    source: route.source,
  };
}

function keywordClassification(
  normalizedLabel: string
): FractionClassification | null {
  if (serviceLabelPattern.test(normalizedLabel)) {
    return null;
  }
  const categories = new Set<FractionCategory>();
  for (const [pattern, category] of categoryKeywordPatterns) {
    if (pattern.test(normalizedLabel)) {
      categories.add(category);
    }
  }

  if (categories.size === 0) {
    return null;
  }
  const sorted = [...categories].sort(
    (left, right) =>
      (categoryOrder.get(left) ?? 0) - (categoryOrder.get(right) ?? 0)
  );
  const primaryCategory = categories.has("residual")
    ? "residual"
    : (sorted[0] ?? "other");
  return { categories: sorted, primaryCategory, source: "heuristic" };
}

export function classifyFraction(input: {
  fraction: string;
  fractionId?: string;
  providerId: string;
}): FractionClassification {
  const normalizedLabel = normalizeFractionLabel(input.fraction);
  const storedRoute = findRoute.get(normalizedLabel, input.providerId, "*");
  const stored = storedRoute ? parseStoredRoute(storedRoute) : null;
  if (stored) {
    return stored;
  }

  const inferred = keywordClassification(normalizedLabel);
  if (inferred) {
    recordHeuristic.run(
      input.providerId,
      normalizedLabel,
      input.fraction.slice(0, 200),
      input.fractionId?.slice(0, 200) ?? null,
      JSON.stringify(inferred.categories),
      inferred.primaryCategory,
      Date.now()
    );
    return inferred;
  }

  recordPending.run(
    input.providerId,
    normalizedLabel || "<empty>",
    input.fraction.slice(0, 200) || "<empty>",
    input.fractionId?.slice(0, 200) ?? null,
    Date.now()
  );
  return {
    categories: ["other"],
    primaryCategory: "other",
    source: "pending",
  };
}

export function normalizePickups(
  providerId: string,
  raw: Array<{ date: string; fraction: string; fractionId: string }>
): WastePickup[] {
  return raw.map((pickup) => {
    const classification = classifyFraction({
      fraction: pickup.fraction,
      fractionId: pickup.fractionId,
      providerId,
    });
    return {
      ...pickup,
      categories: classification.categories,
      category: classification.primaryCategory,
      color: CATEGORIES[classification.primaryCategory].color,
    };
  });
}

export function listPendingFractionLabels(limit = 100) {
  const boundedLimit = Math.max(1, Math.min(500, Math.trunc(limit)));
  return listPending.all(boundedLimit).map((row) => ({
    exampleLabel: row.example_label,
    firstSeenAt: new Date(row.first_seen_at).toISOString(),
    fractionId: row.fraction_id,
    lastSeenAt: new Date(row.last_seen_at).toISOString(),
    normalizedLabel: row.normalized_label,
    observationCount: row.observation_count,
    providerId: row.provider_id,
  }));
}

export function applyFractionRoutes(inputs: FractionRouteInput[]): void {
  const routes = z.array(routeInputSchema).min(1).max(100).parse(inputs);
  const reviewedAt = Date.now();
  const apply = db.transaction(() => {
    for (const route of routes) {
      applyRoute.run(
        route.providerId,
        route.normalizedLabel,
        JSON.stringify(route.categories),
        route.primaryCategory,
        route.rationale,
        reviewedAt
      );
    }
  });
  apply();
}

export function scanCachedFractionLabels() {
  let cacheEntries = 0;
  let pickups = 0;
  const labels = new Set<string>();

  const scan = db.transaction(() => {
    for (const row of cachedRows.all()) {
      let value: unknown;
      try {
        value = JSON.parse(row.data);
      } catch {
        continue;
      }
      if (
        !Array.isArray(value) ||
        value.length === 0 ||
        !value.every(
          (item) =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as { date?: unknown }).date === "string" &&
            typeof (item as { fraction?: unknown }).fraction === "string" &&
            typeof (item as { fractionId?: unknown }).fractionId === "string"
        )
      ) {
        continue;
      }
      const providerId = row.key.split(":", 1)[0] ?? "unknown";
      const classified = normalizePickups(
        providerId,
        value as Array<{ date: string; fraction: string; fractionId: string }>
      );
      updateCachedRow.run(JSON.stringify(classified), row.key);
      cacheEntries += 1;
      pickups += classified.length;
      for (const pickup of classified) {
        labels.add(`${providerId}\0${normalizeFractionLabel(pickup.fraction)}`);
      }
    }
  });
  scan();

  return { cacheEntries, labels: labels.size, pickups };
}
