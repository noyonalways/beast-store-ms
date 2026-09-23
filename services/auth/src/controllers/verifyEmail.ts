import { EMAIL_SERVICE_URL } from "@/config";
import prisma from "@/prisma";
import { EmailVerificationDTOSchema } from "@/schemas";
import axios from "axios";
import { NextFunction, Request, Response } from "express";


const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // validate the request body
    const parsedBody = EmailVerificationDTOSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: parsedBody.error })
    }
    
    // check if the user exists with the given email
    const user = await prisma.authUser.findUnique({
      where: { email: parsedBody.data.email },
      select: {
        id: true,
        email: true,
        verified: true,
      },
    })

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    // if the account is already verified, reject the request
    if (user.verified) {
      return res.status(400).json({ error: "Email already verified" })
    }

    // find the verification code
    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        code: parsedBody.data.code,
        status: "PENDING",
      }
    })
    if (!verificationCode) {
      return res.status(400).json({ error: "Invalid verification code" })
    }

    // if the code is expired
    if (verificationCode.expiresAt < new Date()) {
      return res.status(400).json({ error: "Verification code expired" })
    }

    // update the user's verified status
    await prisma.authUser.update({
      where: { id: user.id },
      data: { verified: true, status: "ACTIVE" },
    })

    // update the verification code status to used
    await prisma.verificationCode.update({
      where: { id: verificationCode.id },
      data: { status: "USED", verifiedAt: new Date() },
    })

    // send success email
    await axios.post(`${EMAIL_SERVICE_URL}/emails/send`, {
      recipient: user.email,
      subject: "Email Verified",
      body: "Your email has been verified successfully",
      source: "email-verification",
    })

    // return the user
    return res.status(200).json({ message: "Email verified successfully" })
  } catch (error) {
    next(error)
  }
}

export default verifyEmail;