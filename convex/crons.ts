import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
const crons = cronJobs();
crons.interval("Remove expired integration nonces", { minutes: 10 }, internal.automation.cleanupNonces, {});
export default crons;
