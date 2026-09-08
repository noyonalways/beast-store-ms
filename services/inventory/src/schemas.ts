import z from "zod";
import { ActionType } from "../generated/prisma/enums";

export const InventoryCreateDTOSchema = z.object({
  productId: z.string(),
  sku: z.string(),
  quantity: z.number().int().optional().default(0),
});

export type InventoryCreateDTO = z.infer<typeof InventoryCreateDTOSchema>;


export const InventoryUpdateDTOSchema = z.object({
  quantity: z.number().int().optional(),
  actionType: z.nativeEnum(ActionType)
});