import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { checkDataset } from "@/lib/validate";
import {
  getAnalysis,
  getRiskItems,
  getActions,
  emailDraftFor,
  resaleListingFor,
} from "@/lib/service";
import type { Dataset } from "@/lib/types";

/**
 * MCP server exposing the DeskYield engine over streamable HTTP.
 *
 * Route lives at `app/api/[transport]/route.ts` with `basePath: "/api"`, so the
 * streamable HTTP endpoint resolves to `/api/mcp`. The static sibling routes
 * (`/api/analysis`, `/api/risk`, ...) take precedence over this dynamic segment.
 */

const ok = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

const fail = (message: string) => ({
  content: [{ type: "text" as const, text: message }],
  isError: true,
});

const handler = createMcpHandler(
  (server) => {
    server.tool(
      "analyse_dataset",
      "Run the empty-desk revenue-recovery engine. Returns risk-scored agreements, cold vacancies, the top 3 ranked recovery actions, and recoverable PHP totals. Omit `dataset` to use the bundled demo data; pass a Dataset { rooms, occupancy, clients, today } to score your own.",
      { dataset: z.any().optional() },
      async ({ dataset }) => {
        if (dataset !== undefined && dataset !== null) {
          const check = checkDataset(dataset);
          if (!check.ok) {
            return fail(`Invalid dataset: ${check.issues.join("; ")}`);
          }
          return ok(getAnalysis(dataset as Dataset));
        }
        return ok(getAnalysis());
      },
    );

    server.tool(
      "get_risk_items",
      "List active seat agreements scored by their risk of going unused in the next 7 days (demo dataset). Optionally filter by risk band, client (id or name substring), and a result limit.",
      {
        band: z.enum(["Critical", "High", "Medium", "Low"]).optional(),
        client: z.string().optional(),
        limit: z.number().int().positive().optional(),
      },
      async ({ band, client, limit }) =>
        ok(getRiskItems({ band, client, limit })),
    );

    server.tool(
      "get_recovery_actions",
      "Get the top 3 ranked revenue-recovery actions (re-engagement, resale, broker) with PHP recovery estimates and target rooms/clients.",
      {},
      async () => ok(getActions()),
    );

    server.tool(
      "build_email_draft",
      "Build a client re-engagement email draft for a risk item. `id` may be an occId, roomId, or clientId.",
      { id: z.string() },
      async ({ id }) => {
        const draft = emailDraftFor(id);
        return draft ? ok(draft) : fail(`No risk item found for id: ${id}`);
      },
    );

    server.tool(
      "build_resale_listing",
      "Build a marketplace resale listing for a cold vacant room, identified by roomId.",
      { roomId: z.string() },
      async ({ roomId }) => {
        const listing = resaleListingFor(roomId);
        return listing
          ? ok(listing)
          : fail(`No vacant room found for roomId: ${roomId}`);
      },
    );
  },
  { serverInfo: { name: "deskyield", version: "1.0.0" } },
  { basePath: "/api", disableSse: true, maxDuration: 60, verboseLogs: false },
);

export { handler as GET, handler as POST, handler as DELETE };
