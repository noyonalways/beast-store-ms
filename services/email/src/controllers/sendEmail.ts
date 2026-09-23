import { EmailCreateDTOSchema } from "@/schemas";
import { NextFunction, Request, Response } from "express";
import { DEFAULT_SENDER, transporter } from "@/config";
import prisma from "@/prisma";
import { EmailStatus } from "../../generated/prisma/enums";

const sendEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // parse the body
    const parsedBody = EmailCreateDTOSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: parsedBody.error })
    }

    // create email option
    const { recipient, subject, body, source, sender } = parsedBody.data;
    const from = sender || DEFAULT_SENDER;
    const emailOptions = {
      from,
      to: recipient,
      subject,
      text: body,
      html: body,
      source,
    }

    // send the mail
    const { rejected } = await transporter.sendMail(emailOptions)
    if (rejected.length > 0) {
      console.log('Email rejected:', rejected);
      return res.status(500).json({ error: "Failed to send email" })
    }

    await prisma.email.create({
      data: {
        sender: from,
        recipient,
        subject,
        body,
        source,
        status: EmailStatus.SENT,
      }
    })
    return res.status(200).json({ message: "Email sent successfully" })
  } catch (error) {
    next(error)
  }
}

export default sendEmail;