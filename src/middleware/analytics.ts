import type { MiddlewareHandler } from "hono";
import { posthog } from "@/analytics/posthog";

export function analytics(): MiddlewareHandler {
	return async (c, next) => {
		const start = Date.now();
		await next();

		const path = new URL(c.req.url).pathname;
		const query = c.req.query();

		posthog.capture({
			distinctId: c.req.header("x-forwarded-for") ?? "anonymous",
			event: "api_request",
			properties: {
				path,
				method: c.req.method,
				status: c.res.status,
				duration_ms: Date.now() - start,
				provider: query.provider,
				user_agent: c.req.header("user-agent"),
			},
		});
	};
}
