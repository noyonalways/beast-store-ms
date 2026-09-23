import { Request, Response, NextFunction } from "express";
import { AccessTokenDTOSchema } from "@/schemas";
import { JWT_SECRET } from "@/config";
import prisma from "@/prisma";
import jwt from "jsonwebtoken";

const verifyAccessToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // validate the request body
    const parsedBody = AccessTokenDTOSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: parsedBody.error })
    }
    const { accessToken } = parsedBody.data;
    const decoded = jwt.verify(accessToken, JWT_SECRET) as { userId: string };
    const user = await prisma.authUser.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        verified: true,
      },
    })
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    return res.status(200).json({ message: "Authorized", user })
  } catch (error) {
    return next(error)
  }
}

export default verifyAccessToken;