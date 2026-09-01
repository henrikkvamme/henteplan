import { z } from "zod";
import {
  applyFractionRoutes,
  listPendingFractionLabels,
  scanCachedFractionLabels,
} from "./classifier";

const limitSchema = z.coerce.number().int().min(1).max(500);

function usage(): never {
  console.error(`Usage:
  bun run src/fractions/cli.ts pending [limit]
  bun run src/fractions/cli.ts scan
  bun run src/fractions/cli.ts apply <json-file>

The apply file must contain a JSON array of validated provider-scoped routes.`);
  process.exit(2);
}

const [command, argument] = process.argv.slice(2);

if (command === "pending") {
  const limit = argument === undefined ? 100 : limitSchema.parse(argument);
  console.log(JSON.stringify(listPendingFractionLabels(limit), null, 2));
} else if (command === "scan") {
  if (argument !== undefined) {
    usage();
  }
  console.log(JSON.stringify(scanCachedFractionLabels()));
} else if (command === "apply") {
  if (!argument) {
    usage();
  }
  const file = Bun.file(argument);
  if (!(await file.exists())) {
    throw new Error(`Route file does not exist: ${argument}`);
  }
  const routes = JSON.parse(await file.text());
  applyFractionRoutes(routes);
  console.log(
    JSON.stringify({ applied: Array.isArray(routes) ? routes.length : 0 })
  );
} else {
  usage();
}
