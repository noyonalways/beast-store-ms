import z from "zod";

export const UserCreateDTOSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().min(1).max(255),
  password: z.string().min(6),
})

export const UserLoginDTOSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export const AccessTokenDTOSchema = z.object({
  accessToken: z.string(),
})