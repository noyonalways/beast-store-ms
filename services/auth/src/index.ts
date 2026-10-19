import express, { NextFunction, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import jwt from "jsonwebtoken";
import { userLogin, userRegistration, verifyAccessToken, verifyEmail } from "./controllers";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "UP" });
});

// app.use((req, res, next) => {
//   const allowedOrigin = ["http://localhost:4000", "http://127.0.0.1:4000"];
//   const origin = req.headers.origin;

//   // Allow internal service-to-service calls, which carry no Origin header
//   if (!origin || allowedOrigin.includes(origin)) {
//     if (origin) {
//       res.setHeader("Access-Control-Allow-Origin", origin);
//     }
//     next();
//   } else {
//     res.status(403).json({
//       message: "Forbidden",
//     });
//   }
// });

// Auth routes
app.post("/auth/login", userLogin);
app.post("/auth/register", userRegistration);
app.post("/auth/verify-access-token", verifyAccessToken);
app.post("/auth/verify-email", verifyEmail);

// 404 handler for undefined routes
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

/// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);

  // jsonwebtoken attaches these to the errors it throws, so an invalid or
  // expired token would otherwise be reported as a server fault.
  if (err instanceof jwt.JsonWebTokenError || err?.name === "JsonWebTokenError") {
    return res.status(401).json({ error: "Invalid access token" });
  }
  if (err instanceof jwt.TokenExpiredError || err?.name === "TokenExpiredError") {
    return res.status(401).json({ error: "Access token expired" });
  }

  // Honor an explicit status set by a thrown error, and fall back to 500 for
  // anything that signals client fault (malformed JSON, Zod errors, ...).
  const status = err?.status ?? err?.statusCode ?? 500;
  res.status(status >= 400 && status < 600 ? status : 500).json({
    error: status < 500 ? err?.message || "Bad Request" : "Internal Server Error",
  });
});

const port = process.env.PORT || 4003;
const serviceName = process.env.SERVICE_NAME || "Auth-Service";

app.listen(port, () => {
  console.log(`${serviceName} is running on port ${port}`);
});
