import { z } from "zod";

export const HandSideSchema = z.enum(["left", "right", "unknown"]);
export const ReadingModeSchema = z.enum(["quick", "complete", "technical", "traditional", "comparative"]);
export const ReadingStatusSchema = z.enum([
  "draft",
  "capturing",
  "validating",
  "ready",
  "analyzing",
  "review_required",
  "completed",
  "completed_with_limitations",
  "failed",
  "cancelled",
  "archived",
]);

export const CreatePersonSchema = z.object({
  alias: z.string().trim().min(1).max(120),
  dominantHand: HandSideSchema.optional().default("unknown"),
  notes: z.string().trim().max(5000).optional(),
});

export const UpdatePersonSchema = CreatePersonSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required",
);

export const CreateReadingSchema = z.object({
  personId: z.uuid(),
  mode: ReadingModeSchema.default("complete"),
});

export type CreatePersonRequest = z.infer<typeof CreatePersonSchema>;
export type UpdatePersonRequest = z.infer<typeof UpdatePersonSchema>;
export type CreateReadingRequest = z.infer<typeof CreateReadingSchema>;
export type HandSide = z.infer<typeof HandSideSchema>;
export type ReadingMode = z.infer<typeof ReadingModeSchema>;
export type ReadingStatus = z.infer<typeof ReadingStatusSchema>;
