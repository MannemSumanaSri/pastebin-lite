import { z } from "zod";

export const MAX_CONTENT_LENGTH = 100_000; // 100,000 characters (~100 KB ASCII)
export const MIN_EXPIRY_SECONDS = 1;
export const MAX_EXPIRY_SECONDS = 31_536_000; // 365 days
export const MAX_VIEWS_LIMIT = 1_000_000;

export const createPasteSchema = z.object({
  content: z
    .string({
      required_error: "Paste content is required.",
      invalid_type_error: "Paste content must be a string.",
    })
    .refine((val) => val.trim().length > 0, {
      message: "Paste content cannot be empty.",
    })
    .refine((val) => val.length <= MAX_CONTENT_LENGTH, {
      message: `Paste content cannot exceed ${MAX_CONTENT_LENGTH.toLocaleString()} characters.`,
    }),

  expiresInSeconds: z
    .number({
      invalid_type_error: "Expiry duration must be a number of seconds.",
    })
    .int("Expiry duration must be a whole number of seconds.")
    .min(MIN_EXPIRY_SECONDS, `Expiry duration must be at least ${MIN_EXPIRY_SECONDS} second.`)
    .max(MAX_EXPIRY_SECONDS, `Expiry duration cannot exceed ${MAX_EXPIRY_SECONDS} seconds (1 year).`)
    .nullable()
    .optional(),

  maxViews: z
    .number({
      invalid_type_error: "Maximum views must be a number.",
    })
    .int("Maximum views must be a whole number.")
    .min(1, "Maximum views must be at least 1.")
    .max(MAX_VIEWS_LIMIT, `Maximum views cannot exceed ${MAX_VIEWS_LIMIT.toLocaleString()}.`)
    .nullable()
    .optional(),
});

export type CreatePasteInput = z.infer<typeof createPasteSchema>;
