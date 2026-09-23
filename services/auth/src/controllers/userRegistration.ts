import prisma from "@/prisma";
import { UserCreateDTOSchema } from "@/schemas";
import { Request, Response, NextFunction } from "express";
import bcryptjs from "bcryptjs";
import axios from "axios";
import { EMAIL_SERVICE_URL, USER_SERVICE_URL } from "@/config";
import generateVerificationCode from "@/utils/generateVerificationCode";
import { VerificationCodeType } from "../../generated/prisma/enums";

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
    await axios.post(`${USER_SERVICE_URL}/users`, {
      name: authUser.name,
      email: authUser.email,
      authUserId: authUser.id,
    });

    // generate verification code
    const verificationCode = generateVerificationCode();
    await prisma.verificationCode.create({
      data: {
        userId: authUser.id,
        type: VerificationCodeType.USER_REGISTRATION,
        code: verificationCode,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
      }
    })
    console.log(`Verification code created: ${verificationCode}`);
    // send verification email
    await axios.post(`${EMAIL_SERVICE_URL}/emails/send`, {
      recipient: authUser.email,
      subject: "Account Activation",
      body: `Your verification code is ${verificationCode}`,
      source: "user-registration",
    });
    console.log(`Verification email sent to: ${authUser.email}`);

    // return the user
    return res.status(201).json({
      message: "User registered successfully. Please check your email for verification.",
      user: authUser,
    });
  } catch (error) {
    next(error);
  }
}

export default userRegistration;