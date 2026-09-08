import prisma from "@/prisma";
import { Request, Response, NextFunction } from "express";

const getInventoryDetailsById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const inventoryId = Array.isArray(id) ? id[0] : id;
    const inventory = await prisma.inventory.findUnique({
      where: { id: inventoryId },
      include: {
        histories: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!inventory) {
      return res.status(404).json({ message: "Inventory not found" });
    }
    return res.status(200).json(inventory);
  } catch (error) {
    next(error);
  }
};

export default getInventoryDetailsById;
