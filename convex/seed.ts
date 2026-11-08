import { internalMutation } from "./_generated/server";

const demoTools = [
  { name: "Cordless drill", category: "Workshop", condition: "good" as const, description: "A reliable drill for shelves, small repairs, and weekend projects." },
  { name: "Pruning shears", category: "Garden", condition: "good" as const, description: "Clean, sharp shears for seasonal garden care." },
  { name: "Folding step ladder", category: "Home", condition: "fair" as const, description: "Four steps with a stable top platform." },
];

export const seedDemo = internalMutation({
  args: {},
  handler: async (ctx) => {
    const clerkId = "lendloop-demo-neighbor";
    let owner = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();
    const now = Date.now();

    if (!owner) {
      const ownerId = await ctx.db.insert("users", {
        clerkId,
        displayName: "Demo Neighbor",
        role: "member",
        trustedLender: true,
        createdAt: now,
        updatedAt: now,
      });
      owner = await ctx.db.get(ownerId);
    }
    if (!owner) throw new Error("Could not create demo owner");

    const existing = await ctx.db.query("tools").withIndex("by_owner", (q) => q.eq("ownerId", owner._id)).collect();
    if (existing.length === 0) {
      for (const tool of demoTools) {
        await ctx.db.insert("tools", {
          ...tool,
          ownerId: owner._id,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return { seeded: existing.length === 0, toolCount: existing.length || demoTools.length };
  },
});