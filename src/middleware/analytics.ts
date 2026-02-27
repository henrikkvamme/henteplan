import type { MiddlewareHandler } from "hono";
import { capture } from "../analytics/posthog";

export function analytics(): MiddlewareHandler {
	return async (c, next) => {
		const start = Date.now();
		await next();

		const path = new URL(c.req.url).pathname;
		const query = c.req.query();

		capture(c.req.header("x-forwarded-for") ?? "anonymous", "api_request", {
			path,
			method: c.req.method,
			status: c.res.status,
			duration_ms: Date.now() - start,
			provider: query.provider,
			user_agent: c.req.header("user-agent"),
		});
	};
}
