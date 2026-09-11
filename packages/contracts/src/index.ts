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
export const ImageRoleSchema = z.enum(["palm", "thumb", "edge", "detail"]);
export const CaptureMimeTypeSchema = z.enum(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
export const ImageValidationStatusSchema = z.enum(["pending", "accepted", "rejected"]);

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

export const CreateUploadIntentSchema = z.object({
  readingId: z.uuid(),
  handSide: HandSideSchema.refine((value) => value !== "unknown", "Hand side is required"),
  imageRole: ImageRoleSchema.default("palm"),
  fileName: z.string().trim().min(1).max(180),
  mimeType: CaptureMimeTypeSchema,
  byteSize: z.number().int().positive().max(15 * 1024 * 1024),
});

export const CaptureQualitySchema = z.object({
  brightness: z.number().min(0).max(255),
  contrast: z.number().nonnegative(),
  sharpness: z.number().nonnegative(),
  aspectRatio: z.number().positive(),
  issues: z.array(z.string().trim().min(1).max(180)).max(8),
});

export const RegisterReadingImageSchema = CreateUploadIntentSchema.extend({
  storagePath: z.string().min(1).max(500),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  validationStatus: ImageValidationStatusSchema,
  quality: CaptureQualitySchema,
});

export const VisionPalmValidationRequestSchema = z.object({
  readingId: z.uuid(),
  imageId: z.uuid(),
  handSide: HandSideSchema.refine((value) => value !== "unknown", "Known hand side is required"),
  imageRole: ImageRoleSchema,
  storagePath: z.string().min(1).max(500),
  technicalQuality: CaptureQualitySchema,
});

export const VisionPalmValidationResultSchema = z.object({
  imageId: z.uuid(),
  accepted: z.boolean(),
  confidence: z.number().min(0).max(1),
  anatomy: z.object({
    palmDetected: z.boolean(),
    fullPalmVisible: z.boolean(),
    fingersVisible: z.number().int().min(0).max(5),
    wristVisible: z.boolean(),
    expectedHandSide: HandSideSchema,
    detectedHandSide: HandSideSchema,
  }),
  issues: z.array(z.enum([
    "no_palm_detected",
    "partial_palm",
    "fingers_cut",
    "wrist_missing",
    "wrong_hand_side",
    "occlusion",
    "perspective_too_extreme",
    "other",
  ])).max(8),
  notes: z.array(z.string().trim().min(1).max(240)).max(8).default([]),
  validatorVersion: z.string().trim().min(1).max(80),
});

export type CreatePersonRequest = z.infer<typeof CreatePersonSchema>;
export type UpdatePersonRequest = z.infer<typeof UpdatePersonSchema>;
export type CreateReadingRequest = z.infer<typeof CreateReadingSchema>;
export type CreateUploadIntentRequest = z.infer<typeof CreateUploadIntentSchema>;
export type RegisterReadingImageRequest = z.infer<typeof RegisterReadingImageSchema>;
export type CaptureQuality = z.infer<typeof CaptureQualitySchema>;
export type VisionPalmValidationRequest = z.infer<typeof VisionPalmValidationRequestSchema>;
export type VisionPalmValidationResult = z.infer<typeof VisionPalmValidationResultSchema>;
export type HandSide = z.infer<typeof HandSideSchema>;
export type ReadingMode = z.infer<typeof ReadingModeSchema>;
export type ReadingStatus = z.infer<typeof ReadingStatusSchema>;
