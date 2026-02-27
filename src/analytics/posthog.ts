const POSTHOG_KEY = "phc_QLCRxpJfEbVwFfgFTTuuduIXhjLIjQmCab5T0bQ24cb";
const POSTHOG_HOST = "https://eu.i.posthog.com";

const queue: Record<string, unknown>[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
	if (queue.length === 0) return;
	const batch = queue.splice(0);
	fetch(`${POSTHOG_HOST}/batch/`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ api_key: POSTHOG_KEY, batch }),
	}).catch(() => {});
}

export function capture(
	distinctId: string,
	event: string,
	properties?: Record<string, unknown>,
) {
	queue.push({
		distinct_id: distinctId,
		event,
		properties: { ...properties, timestamp: new Date().toISOString() },
	});
	if (!timer) {
		// noinspection MagicNumber
		timer = setTimeout(() => {
			timer = null;
			flush();
		}, 5000);
	}
}
