import { createApp } from "./app";

const app = createApp();

// noinspection MagicNumber
const port = Number(process.env.PORT) || 4000;

console.log(`Henteplan API running on http://localhost:${port}`);
console.log(`  API docs: http://localhost:${port}/docs`);
console.log(`  OpenAPI spec: http://localhost:${port}/openapi.json`);

export default {
  port,
  fetch: app.fetch,
};
