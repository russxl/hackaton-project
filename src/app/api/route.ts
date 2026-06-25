import { json, preflight } from "@/lib/http";

export function OPTIONS() {
  return preflight();
}

export function GET() {
  return json({
    service: "DeskYield API",
    description:
      "Empty-desk revenue recovery engine. Scores reserved seats at risk of going unused in the next 7 days and surfaces ranked recovery actions.",
    version: "1.0.0",
    endpoints: {
      "GET /api/analysis": "Full analysis over the bundled demo dataset.",
      "POST /api/analysis":
        "Analyse a supplied dataset. JSON body = Dataset { rooms, occupancy, clients, today }.",
      "GET /api/risk":
        "Risk-scored agreements. Filters: ?band=Critical|High|Medium|Low &client=<id|name> &limit=N",
      "POST /api/risk": "Same as GET /api/risk but scored over a supplied dataset (body = Dataset).",
      "GET /api/vacancies": "Cold vacant rooms with 7-day resale yield.",
      "GET /api/actions": "Top 3 ranked recovery actions with PHP recovery estimates.",
      "ALL /api/mcp": "Model Context Protocol endpoint (streamable HTTP transport).",
    },
    mcp: {
      transport: "streamable-http",
      url: "/api/mcp",
      tools: [
        "analyse_dataset",
        "get_risk_items",
        "get_recovery_actions",
        "build_email_draft",
        "build_resale_listing",
      ],
    },
  });
}
