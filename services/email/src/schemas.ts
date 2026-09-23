import z from "zod";

export const EmailCreateDTOSchema = z.object({
  recipient: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  source: z.string().min(1),
  sender: z.string().email().optional(),
})