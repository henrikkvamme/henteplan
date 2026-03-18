import { db } from "../providers/cache";

db.exec(`
  CREATE TABLE IF NOT EXISTS provider_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id TEXT NOT NULL,
    checked_at TEXT NOT NULL,
    total INTEGER NOT NULL,
    passed INTEGER NOT NULL,
    status TEXT NOT NULL,
    errors TEXT
  )
`);
db.exec(
  "CREATE INDEX IF NOT EXISTS idx_checks_provider ON provider_checks(provider_id, checked_at)"
);

const stmtInsert = db.prepare(
  "INSERT INTO provider_checks (provider_id, checked_at, total, passed, status, errors) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
);

const stmtLatest = db.prepare<
  {
    provider_id: string;
    checked_at: string;
    total: number;
    passed: number;
    status: string;
    errors: string | null;
  },
  []
>(`
  SELECT provider_id, checked_at, total, passed, status, errors
  FROM provider_checks
  WHERE id IN (
    SELECT MAX(id) FROM provider_checks GROUP BY provider_id
  )
  ORDER BY provider_id
`);

const stmtHistory = db.prepare<
  { checked_at: string; total: number; passed: number; status: string },
  [string, number]
>(`
  SELECT checked_at, total, passed, status
  FROM provider_checks
  WHERE provider_id = ?1
  ORDER BY checked_at DESC
  LIMIT ?2
`);

// noinspection MagicNumber
const stmtUptime = db.prepare<
  { total_checks: number; up_checks: number },
  [string, string]
>(`
  SELECT
    COUNT(*) as total_checks,
    SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END) as up_checks
  FROM provider_checks
  WHERE provider_id = ?1 AND checked_at >= ?2
`);

interface CheckReport {
  errors?: string[];
  passed: number;
  providerId: string;
  total: number;
}

function deriveStatus(total: number, passed: number): string {
  if (passed === total) {
    return "up";
  }
  if (passed === 0) {
    return "down";
  }
  return "degraded";
}

export function reportChecks(checks: CheckReport[], checkedAt?: string): void {
  const now = checkedAt ?? new Date().toISOString();
  const insert = db.transaction(() => {
    for (const check of checks) {
      const status = deriveStatus(check.total, check.passed);
      stmtInsert.run(
        check.providerId,
        now,
        check.total,
        check.passed,
        status,
        check.errors ? JSON.stringify(check.errors) : null
      );
    }
  });
  insert();
}

export function getLatestChecks() {
  return stmtLatest.all();
}

// noinspection MagicNumber
export function getProviderHistory(providerId: string, limit = 90) {
  return stmtHistory.all(providerId, limit);
}

// noinspection MagicNumber
export function getProviderUptime(providerId: string, days = 90): number {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const row = stmtUptime.get(providerId, since);
  if (!row || row.total_checks === 0) {
    return -1;
  }
  return row.up_checks / row.total_checks;
}
