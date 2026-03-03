import mongoose from "mongoose";
import { config } from "./config.js";

const REQUIRED_COLLECTIONS = ["users", "profiles", "user_roles", "stocks", "transactions"];

export async function connectDatabase() {
  await mongoose.connect(config.mongoUri, {
    dbName: config.mongoDbName,
  });
}

export async function ensureCollectionsAndIndexes() {
  const db = mongoose.connection.db;

  const existingCollections = await db.listCollections({}, { nameOnly: true }).toArray();
  const existingNames = new Set(existingCollections.map((c) => c.name));

  for (const name of REQUIRED_COLLECTIONS) {
    if (!existingNames.has(name)) {
      await db.createCollection(name);
    }
  }

  await db.collection("users").createIndex({ id: 1 }, { unique: true });
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("profiles").createIndex({ id: 1 }, { unique: true });
  await db.collection("profiles").createIndex({ user_id: 1 }, { unique: true });
  await db.collection("user_roles").createIndex({ id: 1 }, { unique: true });
  await db.collection("user_roles").createIndex({ user_id: 1, role: 1 }, { unique: true });
  await db.collection("stocks").createIndex({ id: 1 }, { unique: true });
  await db.collection("stocks").createIndex({ company_id: 1, created_at: -1 });
  await db.collection("transactions").createIndex({ id: 1 }, { unique: true });
  await db.collection("transactions").createIndex({ buyer_id: 1, created_at: -1 });
  await db.collection("transactions").createIndex({ company_id: 1, created_at: -1 });
}

