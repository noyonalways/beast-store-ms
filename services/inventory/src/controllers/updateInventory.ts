import prisma from "@/prisma";
import { InventoryCreateDTOSchema, InventoryUpdateDTOSchema } from "@/schemas";
import { Request, Response, NextFunction } from "express";

const updateInventory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // check if the inventory exists
    const { id } = req.params;
    const inventoryId = Array.isArray(id) ? id[0] : id;
    const inventory = await prisma.inventory.findUnique({
      where: { id: inventoryId },
    });
    if (!inventory) {
      return res.status(404).json({ message: "Inventory not found" });
    }

    // update the inventory
    const parsedBody = await InventoryUpdateDTOSchema.safeParseAsync(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: parsedBody.error });
    }

    // find the last history
    const lastHistory = await prisma.history.findFirst({
      where: { inventoryId: inventoryId },
      orderBy: { createdAt: "desc" },
    });

    // calculate the new quantity
    let newQuantity = inventory.quantity;
    if (parsedBody.data.actionType === "IN") {
      newQuantity += parsedBody.data.quantity ?? 0;
    } else if (parsedBody.data.actionType === "OUT") {
      newQuantity -= parsedBody.data.quantity ?? 0;
    } else {
      return res.status(400).json({ message: "Invalid action type" });
    }

    // update the inventory
    const updatedInventory = await prisma.inventory.update({
      where: { id: inventoryId },
      data: {
        quantity: newQuantity,
        histories: {
          create: {
            actionType: parsedBody.data.actionType,
            quantityChanged: parsedBody.data.quantity ?? 0,
            lastQuantity: lastHistory
              ? lastHistory.newQuantity
              : inventory.quantity,
            newQuantity: newQuantity,
          },
        },
      },
      select: {
        id: true,
        quantity: true,
      },
    });

    return res.status(200).json(updatedInventory);
  } catch (error) {
    next(error);
  }
};

export default updateInventory;
