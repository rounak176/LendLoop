import { defineApp } from "convex/server";
import { v } from "convex/values";
export default defineApp({ env: {
  CONVEX_TO_N8N_SECRET: v.optional(v.string()),
  N8N_TO_CONVEX_SECRET: v.optional(v.string()),
  N8N_REQUEST_WEBHOOK_URL: v.optional(v.string()),
} });
