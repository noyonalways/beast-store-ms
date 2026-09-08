import prisma from "@/prisma";
import { InventoryCreateDTOSchema } from "@/schemas";
import { Request, Response, NextFunction } from "express";

const createInventory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // validate request body
    const parsedBody = await InventoryCreateDTOSchema.safeParseAsync(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: parsedBody.error });
    }

    

    // create inventory
    const inventory = await prisma.inventory.create({
      data: {
        ...parsedBody.data,
        histories: {
          create: {
            actionType: "IN",
            quantityChanged: parsedBody.data.quantity,
            lastQuantity: 0,
            newQuantity: parsedBody.data.quantity,
          },
        },
      },
      select: {
        id: true,
        productId: true,
      },
    });

    return res.status(201).json(inventory);
  } catch (error) {
    next(error);
  }
};

export default createInventory;
