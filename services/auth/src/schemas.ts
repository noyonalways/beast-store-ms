import z from "zod";


export const UserCreateDTOSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
})


export const UserLoginDTOSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})
