import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";


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

// 404 handler for undefined routes
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

/// Error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

const port = process.env.PORT || 4003;
const serviceName = process.env.SERVICE_NAME || "Auth-Service";

app.listen(port, () => {
  console.log(`${serviceName} is running on port ${port}`);
});
