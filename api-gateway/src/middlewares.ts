import { NextFunction, Request, Response } from "express";
import { AUTH_SERVICE_URL } from "./config";
import axios from "axios";

const auth = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.headers["authorization"]) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const authUrl =  AUTH_SERVICE_URL || "http://localhost:4003"
  try {
    const token = req.headers["authorization"].split(" ")[1];
    const { data } = await axios.post(`${authUrl}/auth/verify-access-token`, {
      accessToken: token,
      headers: {
        ip: req.ip,
        'user-agent': req.headers['user-agent'],
      }
    });

    // in production, we should use a more secure way to store the user information
    req.headers['x-user-id'] = data.user.id;
    req.headers['x-user-name'] = data.user.name;
    req.headers['x-user-email'] = data.user.email;
    req.headers['x-user-role'] = data.user.role;

    next();
  } catch (error) {
    console.log('[AUTH MIDDLEWARE]:', error);
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

const middlewares = {
  auth,
};

export default middlewares;