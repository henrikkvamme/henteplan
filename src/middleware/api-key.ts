import type { MiddlewareHandler } from "hono";

export function apiKeyAuth(): MiddlewareHandler {
  return async (c, next) => {
    const key = c.req.header("x-api-key");
    const validKeys = (process.env.HENTEPLAN_API_KEYS ?? "")
      .split(",")
      .filter(Boolean);
    if (key && validKeys.includes(key)) {
      c.set("trusted", true);
    }
    await next();
  };
}
