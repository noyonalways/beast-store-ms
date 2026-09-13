import { Request, Response, NextFunction } from "express";
import { UserLoginDTOSchema } from "@/schemas";
import prisma from "@/prisma";
import bcryptjs from "bcryptjs";
import { JWT_SECRET } from "@/config";
import jwt from "jsonwebtoken";
import { LoginAttempt } from "../../generated/prisma/enums";


type LoginHistory = {
  userId: string;
  ipAddress: string;
  userAgent: string;
  attempt: LoginAttempt;

}

const createLoginHistory = async (info: LoginHistory) => {
  return await prisma.loginHistory.create({
    data: {
      userId: info.userId,
      ipAddress: info.ipAddress,
      userAgent: info.userAgent,
      attempt: info.attempt,
    },
  });
}

const userLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ipAddress = req.headers['x-forwarded-for'] || req.ip || '';
    const userAgent = req.headers['user-agent'] || '';

    // Validate request body
    const parsedBody = UserLoginDTOSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: parsedBody.error })
    }

    // check if the user exists
    const user = await prisma.authUser.findUnique({
      where: {
        email: parsedBody.data.email,
      },
    });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    // compare the password
    const isMatched = await bcryptjs.compare(parsedBody.data.password, user.password);
    if (!isMatched) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    // check if the user is verified
    if (!user.verified) {
      return res.status(401).json({ error: "User not verified" })
    }

    // check if the user account is active
    if (user.status !== "ACTIVE") {
      return res.status(400).json({ message: `Your account is ${user.status}` })
    }

    // generate access token
    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });

    return res.status(200).json({ accessToken });
  } catch (error) {
    next(error);
  }
}

export default userLogin;