import { NextFunction, Request, Response } from "express";
import { AUTH_SERVICE_URL } from "./config";
import axios from "axios";

const auth = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.headers["authorization"]) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const token = req.headers["authorization"].split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { data } = await axios.post(`${AUTH_SERVICE_URL}/auth/verify-access-token`, {
      accessToken: token,
    }, {
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
    // An auth rejection is the caller's fault, not ours: pass the upstream
    // status and body through instead of masking it as a 500.
    if (axios.isAxiosError(error) && error.response) {
      return res
        .status(error.response.status)
        .json(error.response.data ?? { message: "Unauthorized" });
    }

    // No response means the auth service itself is unreachable or broken.
    console.error('[AUTH MIDDLEWARE]:', error);
    return res.status(503).json({ message: "Authentication service unavailable" });
  }
}

const middlewares = {
  auth,
};

export default middlewares;