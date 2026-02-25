import { rateLimiter as createRateLimiter } from "hono-rate-limiter";

// noinspection MagicNumber
export function rateLimiter(opts: { max: number; window: number }) {
  return createRateLimiter({
    windowMs: opts.window * 1000,
    limit: opts.max,
    standardHeaders: "draft-7",
    keyGenerator: (c) =>
      c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "unknown",
  });
}
