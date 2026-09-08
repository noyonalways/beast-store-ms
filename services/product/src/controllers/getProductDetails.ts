import { INVENTORY_SERVICE_URL } from "@/config";
import prisma from "@/prisma";
import axios from "axios";
import { Request, Response, NextFunction } from "express";

const getProductDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const product = await prisma.product.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        sku: true,
        name: true,
        price: true,
        inventoryId: true,
      },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.inventoryId === null) {
      const { data: inventory } = await axios.post(
        `${INVENTORY_SERVICE_URL}/inventories`,
        {
          productId: product.id,
          sku: product.sku,
        }
      );
      console.log("Inventory created successfully", inventory.id);

      await prisma.product.update({
        where: { id: product.id },
        data: {
          inventoryId: inventory.id,
        },
      });
      console.log("Product updated with inventory ID", inventory.id);

      return res.status(200).json({
        ...product,
        inventoryId: inventory.id,
        stock: inventory.quantity || 0,
        stockStatus: inventory.quantity > 0 ? "In Stock" : "Out of Stock",
      });
    }

    // fetch inventory
    const { data: inventory } = await axios.get(
      `${INVENTORY_SERVICE_URL}/inventories/${product.inventoryId}`
    );

    return res.status(200).json({
      ...product,
      stock: inventory.quantity || 0,
      stockStatus: inventory.quantity > 0 ? "In Stock" : "Out of Stock",
    });
  } catch (error) {
    next(error);
  }
};

export default getProductDetails;
