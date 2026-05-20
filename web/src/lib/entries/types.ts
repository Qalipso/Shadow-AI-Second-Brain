import { z } from "zod";

// Client-facing entry shape. Trimmed subset of EntrySchema in @/types/db.
// camelCase here to keep client code clean; API route maps to snake_case
// when writing to Supabase.

export const EntryStatusSchema = z.enum(["unprocessed", "processed", "failed"]);
export type EntryStatus = z.infer<typeof EntryStatusSchema>;

export const InboxEntrySchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  status: EntryStatusSchema,
  createdAt: z.string(), // ISO
  // Classification surfaces in Phase 3.3 — placeholders here.
  summary: z.string().nullable().optional(),
  entryType: z.string().nullable().optional(),
  lifeAreaSlug: z.string().nullable().optional(),
  emotionPrimary: z.string().nullable().optional(),
});
export type InboxEntry = z.infer<typeof InboxEntrySchema>;

export const CreateEntryInputSchema = z.object({
  text: z.string().trim().min(1).max(8000),
});
export type CreateEntryInput = z.infer<typeof CreateEntryInputSchema>;

export const ListEntriesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListEntriesQuery = z.infer<typeof ListEntriesQuerySchema>;
