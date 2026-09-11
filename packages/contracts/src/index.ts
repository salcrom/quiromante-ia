import { z } from "zod";
export const HandSideSchema = z.enum(["left", "right", "unknown"]);
export const ReadingModeSchema = z.enum(["quick", "complete", "technical", "traditional", "comparative"]);
export const CreatePersonSchema = z.object({ alias: z.string().trim().min(1).max(120), dominantHand: HandSideSchema.optional(), notes: z.string().max(5000).optional() });
export const CreateReadingSchema = z.object({ personId: z.uuid(), mode: ReadingModeSchema });
export type CreatePersonRequest = z.infer<typeof CreatePersonSchema>;
export type CreateReadingRequest = z.infer<typeof CreateReadingSchema>;
