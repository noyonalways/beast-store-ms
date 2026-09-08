import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import { createProduct, getProductDetails, getProducts } from "./controllers";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "UP" });
});

// Product routes
app.get("/products/:id", getProductDetails);
app.post("/products", createProduct);
app.get("/products", getProducts);

// 404 handler for undefined routes
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

/// Error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

const port = process.env.PORT || 4001;
const serviceName = process.env.SERVICE_NAME || "Product-Service";

app.listen(port, () => {
  console.log(`${serviceName} is running on port ${port}`);
});
