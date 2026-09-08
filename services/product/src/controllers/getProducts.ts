import prisma from "@/prisma";
import { Request, Response, NextFunction } from "express";

const getProducts = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        sku: true,
        name: true,
        price: true,
        inventoryId: true,
      }
    })

    // todo: implement pagination and filtering

    return res.status(200).json({data: products});
  } catch (error) {
    next(error);
  }
};

export default getProducts;
