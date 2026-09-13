import prisma from "@/prisma";
import { UserCreateDTOSchema } from "@/schemas";
import { Request, Response, NextFunction } from "express";
import bcryptjs from "bcryptjs";
import axios from "axios";
import { USER_SERVICE_URL } from "@/config";

const userRegistration = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const parsedBody = UserCreateDTOSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: parsedBody.error })
    }

    // check if the user already exists
    const existingUser = await prisma.authUser.findUnique({
      where: {
        email: parsedBody.data.email,
      },
    });
    if (existingUser) {
      return res.status(409).json({ error: "User already exists" })
    }

    // hash the password
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(parsedBody.data.password, salt);

    // create the auth user
    const authUser = await prisma.authUser.create({
      data: {
        name: parsedBody.data.name,
        email: parsedBody.data.email,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        verified: true,
      },
    });
    console.log(`User created: ${authUser.id}`);

    // create the user profile by calling the user service
    await axios.post(`${USER_SERVICE_URL}/api/v1/users`, {
      name: authUser.name,
      email: authUser.email,
      authUserId: authUser.id,
    });

    // todo: generate verification code
    // todo: send verification email

    // return the user
    return res.status(201).json(authUser);
  } catch (error) {
    next(error);
  }
}

export default userRegistration;