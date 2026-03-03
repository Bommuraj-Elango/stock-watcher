import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/stock_watcher_app",
  mongoDbName: process.env.MONGODB_DB_NAME || "stock_watcher_app",
  jwtSecret: process.env.JWT_SECRET || "change_me_in_env",
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:8080",
};

