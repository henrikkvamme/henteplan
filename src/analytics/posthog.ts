import { PostHog } from "posthog-node";

export const posthog = new PostHog(
	"phc_QLCRxpJfEbVwFfgFTTuuduIXhjLIjQmCab5T0bQ24cb",
	{ host: "https://eu.i.posthog.com" },
);

process.on("beforeExit", () => posthog.shutdown());
