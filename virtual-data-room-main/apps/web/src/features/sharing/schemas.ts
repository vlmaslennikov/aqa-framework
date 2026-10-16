import { z } from "zod";

export const shareByEmailSchema = z.object({
  email: z.email("Enter a valid email").trim().max(255),
});

export type ShareByEmailValues = z.infer<typeof shareByEmailSchema>;
