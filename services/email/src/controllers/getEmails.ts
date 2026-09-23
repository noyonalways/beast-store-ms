import prisma from "@/prisma";
import { NextFunction, Request, Response } from "express";

const getEmails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 10 } = req.query as { page: string, limit: string };
    const emails = await prisma.email.findMany({
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    })
    return res.status(200).json({ data: emails })
  } catch (error) {
    next(error)
  }
}

export default getEmails;