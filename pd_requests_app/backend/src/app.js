import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import requestRoutes from "./routes/requests.js";
import dictRoutes from "./routes/dicts.js";
import auditRoutes from "./routes/audit.js";
import commentRoutes from "./routes/comments.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

const configuredOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "https://85.28.47.237",
].filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || configuredOrigins.includes(origin)) {
        return callback(null, true);
      }

      const error = new Error("Источник запроса запрещён политикой CORS");
      error.status = 403;
      return callback(error);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "100kb" }));
app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
  return res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api", dictRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/comments", commentRoutes);

app.use((req, res) => {
  return res.status(404).json({ message: "Маршрут не найден" });
});

app.use(errorHandler);

export default app;
