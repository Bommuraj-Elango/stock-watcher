import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { authMiddleware, createToken, getUserContext } from "./auth.js";
import { config } from "./config.js";
import { connectDatabase, ensureCollectionsAndIndexes } from "./db.js";
import { Profile, Stock, Transaction, User, UserRole } from "./models.js";

const app = express();

app.use(
  cors({
    origin: config.frontendOrigin,
    credentials: true,
  })
);
app.use(express.json());

function normalizeError(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unexpected error";
}

function toNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeStockCategory(value, fallback = {}) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const dataInput = source.data ?? source.embedded_data ?? fallback.data ?? fallback.embedded_data ?? {};
  const data =
    dataInput && typeof dataInput === "object" && !Array.isArray(dataInput)
      ? dataInput
      : {};

  const arraysInput = source.arrays ?? fallback.arrays ?? [];
  const documentsInput =
    source.documents ?? source.embedded_documents ?? fallback.documents ?? fallback.embedded_documents ?? [];

  return {
    name: String(source.name ?? source.category_name ?? fallback.name ?? "").trim(),
    arrays: Array.isArray(arraysInput) ? arraysInput : [],
    documents: Array.isArray(documentsInput) ? documentsInput : [],
    data,
  };
}

function buildStockPayload(body, companyId, isCreate) {
  const source = body || {};
  const has = (key) => Object.prototype.hasOwnProperty.call(source, key);

  if (isCreate) {
    const symbolInput = String(source.stock_symbol || "").trim();
    const stockNameInput = String(source.stock_name || "").trim();
    const stockName = stockNameInput || symbolInput;
    const stockSymbol = symbolInput || stockNameInput;
    const currentPrice = toNumber(source.current_price ?? source.stock_price, 0);
    const totalQuantity = Math.max(0, Math.trunc(toNumber(source.total_quantity ?? source.volume, 0)));
    const availableQuantityDefault = totalQuantity;
    const availableQuantity = Math.max(
      0,
      Math.trunc(toNumber(source.available_quantity, availableQuantityDefault))
    );
    const volume = Math.max(0, Math.trunc(toNumber(source.volume, totalQuantity)));
    const tags = toStringArray(source.tags);
    const listedExchanges = toStringArray(source.listed_exchanges);

    return {
      company_id: companyId,
      stock_name: stockName,
      stock_symbol: stockSymbol,
      sector: String(source.sector || "").trim(),
      currency: String(source.currency || "INR").trim().toUpperCase(),
      current_price: currentPrice,
      volume,
      market_cap: toNumber(source.market_cap, currentPrice * totalQuantity),
      pe_ratio: toNumber(source.pe_ratio, 0),
      eps: toNumber(source.eps, 0),
      roe: toNumber(source.roe, 0),
      rsi: toNumber(source.rsi, 0),
      ma_50: toNumber(source.ma_50, 0),
      ma_200: toNumber(source.ma_200, 0),
      day_high: toNumber(source.day_high, 0),
      day_low: toNumber(source.day_low, 0),
      week_52_high: toNumber(source.week_52_high, 0),
      week_52_low: toNumber(source.week_52_low, 0),
      tags,
      listed_exchanges: listedExchanges,
      major_shareholders: String(source.major_shareholders || "").trim(),
      dividend_history: String(source.dividend_history || "").trim(),
      stock_category: normalizeStockCategory(source.stock_category, {
        name: String(source.sector || "").trim(),
        arrays: [...tags, ...listedExchanges],
        documents: [],
        data: {
          major_shareholders: String(source.major_shareholders || "").trim(),
          dividend_history: String(source.dividend_history || "").trim(),
        },
      }),
      is_active: source.is_active === undefined ? true : Boolean(source.is_active),
      stock_price: currentPrice,
      total_quantity: totalQuantity,
      available_quantity: availableQuantity,
      profit_percentage: toNumber(source.profit_percentage, 0),
      description: String(source.description || "").trim(),
    };
  }

  const updates = {};

  if (has("stock_name") || has("stock_symbol")) {
    const symbolInput = String(source.stock_symbol || "").trim();
    const stockNameInput = String(source.stock_name || "").trim();
    if (stockNameInput) {
      updates.stock_name = stockNameInput;
      if (!symbolInput) updates.stock_symbol = stockNameInput;
    }
    if (symbolInput) {
      updates.stock_symbol = symbolInput;
      if (!stockNameInput) updates.stock_name = symbolInput;
    }
  }

  if (has("current_price") || has("stock_price")) {
    const currentPrice = toNumber(source.current_price ?? source.stock_price, 0);
    updates.current_price = currentPrice;
    updates.stock_price = currentPrice;
  }

  if (has("total_quantity") || has("volume")) {
    const totalQuantity = Math.max(0, Math.trunc(toNumber(source.total_quantity ?? source.volume, 0)));
    updates.total_quantity = totalQuantity;
    if (has("volume")) {
      updates.volume = Math.max(0, Math.trunc(toNumber(source.volume, totalQuantity)));
    }
  }

  if (has("available_quantity")) updates.available_quantity = Math.max(0, Math.trunc(toNumber(source.available_quantity, 0)));
  if (has("volume")) updates.volume = Math.max(0, Math.trunc(toNumber(source.volume, 0)));
  if (has("market_cap")) updates.market_cap = toNumber(source.market_cap, 0);
  if (has("pe_ratio")) updates.pe_ratio = toNumber(source.pe_ratio, 0);
  if (has("eps")) updates.eps = toNumber(source.eps, 0);
  if (has("roe")) updates.roe = toNumber(source.roe, 0);
  if (has("rsi")) updates.rsi = toNumber(source.rsi, 0);
  if (has("ma_50")) updates.ma_50 = toNumber(source.ma_50, 0);
  if (has("ma_200")) updates.ma_200 = toNumber(source.ma_200, 0);
  if (has("day_high")) updates.day_high = toNumber(source.day_high, 0);
  if (has("day_low")) updates.day_low = toNumber(source.day_low, 0);
  if (has("week_52_high")) updates.week_52_high = toNumber(source.week_52_high, 0);
  if (has("week_52_low")) updates.week_52_low = toNumber(source.week_52_low, 0);
  if (has("profit_percentage")) updates.profit_percentage = toNumber(source.profit_percentage, 0);
  if (has("sector")) updates.sector = String(source.sector || "").trim();
  if (has("currency")) updates.currency = String(source.currency || "INR").trim().toUpperCase();
  if (has("tags")) updates.tags = toStringArray(source.tags);
  if (has("listed_exchanges")) updates.listed_exchanges = toStringArray(source.listed_exchanges);
  if (has("major_shareholders")) updates.major_shareholders = String(source.major_shareholders || "").trim();
  if (has("dividend_history")) updates.dividend_history = String(source.dividend_history || "").trim();
  if (has("stock_category")) updates.stock_category = normalizeStockCategory(source.stock_category);
  if (has("is_active")) updates.is_active = Boolean(source.is_active);
  if (has("description")) updates.description = String(source.description || "").trim();

  return updates;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, db: config.mongoDbName });
});

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password, fullName, role, industry = "", description = "" } = req.body || {};

    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ error: "email, password, fullName, and role are required" });
    }
    if (!["company", "buyer"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const existing = await User.findOne({ email }).lean();
    if (existing) {
      return res.status(409).json({ error: "Email is already registered" });
    }

    const userId = uuidv4();
    const password_hash = await bcrypt.hash(password, 10);
    const now = new Date();

    await User.create({
      id: userId,
      email,
      password_hash,
      created_at: now,
      updated_at: now,
    });

    await Profile.create({
      id: uuidv4(),
      user_id: userId,
      full_name: fullName,
      email,
      industry,
      description,
      wallet_balance: 10000,
      created_at: now,
      updated_at: now,
    });

    await UserRole.create({
      id: uuidv4(),
      user_id: userId,
      role,
    });

    const token = createToken(userId, email, role);
    const { profile } = await getUserContext(userId);

    return res.status(201).json({
      token,
      user: { id: userId, email },
      role,
      profile,
    });
  } catch (error) {
    return res.status(500).json({ error: normalizeError(error) });
  }
});

app.post("/api/auth/signin", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await User.findOne({ email }).lean();
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const { role, profile } = await getUserContext(user.id);
    const token = createToken(user.id, user.email, role);

    return res.json({
      token,
      user: { id: user.id, email: user.email },
      role,
      profile,
    });
  } catch (error) {
    return res.status(500).json({ error: normalizeError(error) });
  }
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const authUserId = req.auth.userId;
    const user = await User.findOne({ id: authUserId }).lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { role, profile } = await getUserContext(authUserId);
    return res.json({
      user: { id: user.id, email: user.email },
      role,
      profile,
    });
  } catch (error) {
    return res.status(500).json({ error: normalizeError(error) });
  }
});

app.get("/api/profiles", authMiddleware, async (req, res) => {
  try {
    const userIds = (req.query.userIds || "")
      .toString()
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    const query = userIds.length ? { user_id: { $in: userIds } } : {};
    const profiles = await Profile.find(query).lean();
    return res.json({ data: profiles });
  } catch (error) {
    return res.status(500).json({ error: normalizeError(error) });
  }
});

app.get("/api/stocks", authMiddleware, async (req, res) => {
  try {
    const { companyId, availableOnly, ids } = req.query;
    const query = {};

    if (companyId) {
      query.company_id = companyId.toString();
    }
    if (availableOnly === "true") {
      query.available_quantity = { $gt: 0 };
      query.is_active = true;
    }
    if (ids) {
      const idList = ids
        .toString()
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      if (idList.length) {
        query.id = { $in: idList };
      }
    }

    const stocks = await Stock.find(query).sort({ created_at: -1 }).lean();
    return res.json({ data: stocks });
  } catch (error) {
    return res.status(500).json({ error: normalizeError(error) });
  }
});

app.post("/api/stocks", authMiddleware, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const role = req.auth.role;
    if (role !== "company") {
      return res.status(403).json({ error: "Only company users can add stocks" });
    }

    const payload = buildStockPayload(req.body || {}, userId, true);
    if (!payload.stock_name || payload.current_price < 0 || payload.total_quantity < 0) {
      return res.status(400).json({ error: "Invalid stock payload" });
    }

    const now = new Date();
    const stock = await Stock.create({
      id: uuidv4(),
      ...payload,
      created_at: now,
      updated_at: now,
    });

    return res.status(201).json({ data: stock });
  } catch (error) {
    return res.status(500).json({ error: normalizeError(error) });
  }
});

app.patch("/api/stocks/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const role = req.auth.role;
    if (role !== "company") {
      return res.status(403).json({ error: "Only company users can update stocks" });
    }

    const stockId = req.params.id;
    const stock = await Stock.findOne({ id: stockId }).lean();
    if (!stock) {
      return res.status(404).json({ error: "Stock not found" });
    }
    if (stock.company_id !== userId) {
      return res.status(403).json({ error: "You can update only your own stocks" });
    }

    const updates = buildStockPayload(req.body || {}, userId, false);
    updates.updated_at = new Date();

    Object.keys(updates).forEach((key) => updates[key] === undefined && delete updates[key]);

    const updated = await Stock.findOneAndUpdate({ id: stockId }, { $set: updates }, { new: true }).lean();
    return res.json({ data: updated });
  } catch (error) {
    return res.status(500).json({ error: normalizeError(error) });
  }
});

app.delete("/api/stocks/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const role = req.auth.role;
    if (role !== "company") {
      return res.status(403).json({ error: "Only company users can delete stocks" });
    }

    const stockId = req.params.id;
    const stock = await Stock.findOne({ id: stockId }).lean();
    if (!stock) {
      return res.status(404).json({ error: "Stock not found" });
    }
    if (stock.company_id !== userId) {
      return res.status(403).json({ error: "You can delete only your own stocks" });
    }

    await Stock.deleteOne({ id: stockId });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: normalizeError(error) });
  }
});

app.get("/api/transactions", authMiddleware, async (req, res) => {
  try {
    const { buyerId, companyId } = req.query;
    const query = {};
    if (buyerId) {
      query.buyer_id = buyerId.toString();
    }
    if (companyId) {
      query.company_id = companyId.toString();
    }

    const transactions = await Transaction.find(query).sort({ created_at: -1 }).lean();
    return res.json({ data: transactions });
  } catch (error) {
    return res.status(500).json({ error: normalizeError(error) });
  }
});

app.post("/api/transactions/purchase", authMiddleware, async (req, res) => {
  try {
    const buyerId = req.auth.userId;
    if (req.auth.role !== "buyer") {
      return res.status(403).json({ error: "Only buyer users can purchase stocks" });
    }

    const quantity = Number(req.body.quantity || 0);
    const stockId = String(req.body.stockId || "");

    if (!stockId || !Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ error: "stockId and valid quantity are required" });
    }

    const buyerProfile = await Profile.findOne({ user_id: buyerId }).lean();
    if (!buyerProfile) {
      return res.status(404).json({ error: "Buyer profile not found" });
    }

    const stock = await Stock.findOne({ id: stockId }).lean();
    if (!stock) {
      return res.status(404).json({ error: "Stock not found" });
    }
    if (quantity > stock.available_quantity) {
      return res.status(400).json({ error: "Not enough stock quantity available" });
    }

    const effectivePrice = Number(stock.current_price ?? stock.stock_price ?? 0);
    const totalPrice = quantity * effectivePrice;
    if (buyerProfile.wallet_balance < totalPrice) {
      return res.status(400).json({ error: "Insufficient wallet balance" });
    }

    const decreasedStock = await Stock.findOneAndUpdate(
      { id: stockId, available_quantity: { $gte: quantity } },
      {
        $inc: { available_quantity: -quantity },
        $set: { updated_at: new Date() },
      },
      { new: true }
    ).lean();

    if (!decreasedStock) {
      return res.status(409).json({ error: "Stock quantity changed. Try again." });
    }

    const updatedProfile = await Profile.findOneAndUpdate(
      { user_id: buyerId, wallet_balance: { $gte: totalPrice } },
      {
        $inc: { wallet_balance: -totalPrice },
        $set: { updated_at: new Date() },
      },
      { new: true }
    ).lean();

    if (!updatedProfile) {
      await Stock.updateOne(
        { id: stockId },
        { $inc: { available_quantity: quantity }, $set: { updated_at: new Date() } }
      );
      return res.status(409).json({ error: "Wallet balance changed. Try again." });
    }

    try {
      const transaction = await Transaction.create({
        id: uuidv4(),
        buyer_id: buyerId,
        stock_id: stockId,
        company_id: stock.company_id,
        quantity,
        price_per_unit: effectivePrice,
        total_price: totalPrice,
        created_at: new Date(),
      });

      return res.status(201).json({ data: transaction, wallet_balance: updatedProfile.wallet_balance });
    } catch (error) {
      await Promise.all([
        Stock.updateOne(
          { id: stockId },
          { $inc: { available_quantity: quantity }, $set: { updated_at: new Date() } }
        ),
        Profile.updateOne(
          { user_id: buyerId },
          { $inc: { wallet_balance: totalPrice }, $set: { updated_at: new Date() } }
        ),
      ]);
      return res.status(500).json({ error: normalizeError(error) });
    }
  } catch (error) {
    return res.status(500).json({ error: normalizeError(error) });
  }
});

async function start() {
  await connectDatabase();
  await ensureCollectionsAndIndexes();

  app.listen(config.port, () => {
    console.log(`API running on http://localhost:${config.port}`);
    console.log(`Mongo database: ${config.mongoDbName}`);
  });
}

start().catch((error) => {
  console.error("Failed to start API:", error);
  process.exit(1);
});
