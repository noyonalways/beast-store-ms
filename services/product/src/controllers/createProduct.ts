import { INVENTORY_SERVICE_URL } from "@/config";
import prisma from "@/prisma";
import { ProductCreateDTOSchema } from "@/schemas";
import axios from "axios";
import { Request, Response, NextFunction } from "express";

const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // validate request body
    const parsedBody = ProductCreateDTOSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res
        .status(400)
        .json({ message: "Invalid request body", error: parsedBody.error });
    }

    // check if product with the same SKU already exists
    const existingProduct = await prisma.product.findUnique({
      where: { sku: parsedBody.data.sku },
    });
    if (existingProduct) {
      return res
        .status(409)
        .json({ message: "Product with the same SKU already exists" });
    }

    // create product
    const product = await prisma.product.create({
      data: parsedBody.data,
    });
    console.log("Product created successfully", product.id);

    // create inventory record for the product
    const { data: inventory } = await axios.post(
      `${INVENTORY_SERVICE_URL}/inventories`,
      {
        productId: product.id,
        sku: product.sku,
      }
    );
    console.log("Inventory record created successfully", inventory.id);

    // update product and store inventory id
    await prisma.product.update({
      where: { id: product.id },
      data: {
        inventoryId: inventory.id,
      },
    });
    console.log("Product updated with inventory ID", inventory.id);

    return res.status(201).json({ ...product, inventoryId: inventory.id });
  } catch (error) {
    next(error);
  }
};

export default createProduct;
