import { NextFunction, Request, Response } from "express";
import prisma from "@/prisma";
import { User } from "../../generated/prisma/client";

// /users/:id?filed=id|authUserId
const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const filed = (req.query.filed as string) || "id";
    if (!id || typeof id !== "string" || !filed || typeof filed !== "string") {
      return res.status(400).json({ message: "Invalid request" });
    }

    let user: User | null = null;
    switch (filed) {
      case "id":
        user = await prisma.user.findUnique({ where: { id } });
        break;
      case "authUserId":
        user = await prisma.user.findUnique({ where: { authUserId: id } });
        break;
      default:
        return res.status(400).json({ message: "Invalid field" });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

export default getUserById;