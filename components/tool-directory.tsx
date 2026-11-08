"use client";

import { useMemo, useState } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";

const hasBackendConfiguration = Boolean(
  process.env.NEXT_PUBLIC_CONVEX_URL && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
);

export function ToolDirectory() {
  if (!hasBackendConfiguration) {
    return (
      <div className="setup-state">
        <h2>The tool shelf is ready.</h2>
        <p>Connect Clerk and Convex to load the public tool directory.</p>
      </div>
    );
  }

  return <ConnectedToolDirectory />;
}

function ConnectedToolDirectory() {
  const [category, setCategory] = useState("All tools");
  const [search, setSearch] = useState("");
  const { isAuthenticated, isLoading } = useConvexAuth();
  const publicTools = useQuery(api.tools.listPublic, isAuthenticated ? "skip" : {});
  const memberTools = useQuery(api.tools.listForMembers, isAuthenticated ? {} : "skip");
  const tools = isAuthenticated ? memberTools : publicTools;
  const availableCategories: string[] = [
    "All tools",
    ...new Set<string>((tools ?? []).map((tool: { category: string }) => tool.category)),
  ];
  const filteredTools = useMemo(
    () => (tools ?? []).filter((tool: { name: string; category: string }) => {
      const matchesCategory = category === "All tools" || tool.category === category;
      return matchesCategory && tool.name.toLowerCase().includes(search.trim().toLowerCase());
    }),
    [category, search, tools],
  );

  return (
    <section aria-label="Available tools">
      <div className="directory-toolbar">
        <div className="category-list" aria-label="Filter by category">
          {availableCategories.map((item) => (
            <button
              key={item}
              type="button"
              className="category-chip"
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <label className="visually-hidden" htmlFor="tool-search">Search tools</label>
        <input
          id="tool-search"
          className="search-field"
          type="search"
          placeholder="Search the neighborhood"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      {isLoading || tools === undefined ? (
        <div className="loading-state" role="status">Loading neighborhood tools…</div>
      ) : filteredTools.length === 0 ? (
        <div className="empty-state">
          <h2>{tools.length === 0 ? "No tools on the shelf yet." : "No tools found."}</h2>
          <p>Try another search, or be the first neighbor to add a listing.</p>
          {isAuthenticated && <Link className="text-action" href="/tools/new">List a tool</Link>}
        </div>
      ) : (
        <div className="tool-grid">
          {filteredTools.map((tool: { _id: string; name: string; category: string; condition?: string; description?: string; ownerName?: string; trustedLender?: boolean; availability?: string; isOwner?: boolean }) => (
            <article className="tool-card" key={tool._id}>
              <div className="tool-card-top">
                <span className="tool-symbol" aria-hidden="true">{tool.name.slice(0, 1).toUpperCase()}</span>
                <span className="tool-category">{tool.category}</span>
              </div>
              <h2>{tool.name}</h2>
              {isAuthenticated && <p>{tool.availability}</p>}
              {isAuthenticated && <p className="tool-owner">Shared by {tool.ownerName}{tool.trustedLender ? " · Trusted lender" : ""}</p>}
              <div className="tool-card-footer">
                {tool.condition ? <span className="tool-condition">Condition: {tool.condition}</span> : <span className="tool-condition">Available nearby</span>}
                {isAuthenticated && !tool.isOwner && <Link className="text-action" href={`/tools/${tool._id}/request`}>Request dates</Link>}
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="directory-count">{filteredTools.length} {filteredTools.length === 1 ? "tool" : "tools"} nearby</p>
    </section>
  );
}