import { z } from "zod";

/**
 * Gatekeeping schema for an incoming Dataset (POST body / MCP arg).
 *
 * Intentionally validates only the essential keys the engine relies on. We use
 * `safeParse` purely as a yes/no gate and then forward the ORIGINAL object to
 * `analyse()` — never the parsed output — so extra fields are not stripped.
 */
export const datasetSchema = z.object({
  rooms: z
    .array(z.object({ roomId: z.string() }))
    .min(1, "rooms must contain at least one room"),
  occupancy: z.array(
    z.object({
      occId: z.string(),
      roomId: z.string(),
      clientId: z.string(),
    }),
  ),
  clients: z.array(z.object({ clientId: z.string() })),
  today: z.string(),
});

export type DatasetInput = z.infer<typeof datasetSchema>;

/** Returns the original value typed as Dataset, or a list of issues. */
export function checkDataset(value: unknown):
  | { ok: true }
  | { ok: false; issues: string[] } {
  const result = datasetSchema.safeParse(value);
  if (result.success) return { ok: true };
  return {
    ok: false,
    issues: result.error.issues.map(
      (i) => `${i.path.join(".") || "(root)"}: ${i.message}`,
    ),
  };
}
