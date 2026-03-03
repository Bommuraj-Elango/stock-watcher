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

function parseOptionalNumber(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
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
    const symbolInput = String(source.stock_symbol || source.security_symbol || "").trim();
    const stockNameInput = String(source.security_name || source.stock_name || "").trim();
    const stockName = stockNameInput || symbolInput;
    const stockSymbol = symbolInput || stockNameInput;
    const currentPrice = toNumber(
      source.current_market_price ?? source.current_price ?? source.stock_price,
      0
    );
    const totalQuantity = Math.max(
      0,
      Math.trunc(toNumber(source.total_listed_quantity ?? source.total_quantity ?? source.volume, 0))
    );
    const availableQuantityDefault = totalQuantity;
    const availableQuantity = Math.max(
      0,
      Math.trunc(toNumber(source.available_trading_quantity ?? source.available_quantity, availableQuantityDefault))
    );
    const volume = Math.max(0, Math.trunc(toNumber(source.volume, totalQuantity)));
    const tags = toStringArray(source.tags);
    const listedExchanges = toStringArray(source.listed_exchanges);
    const marketCapitalization = toNumber(
      source.market_metrics?.market_capitalization ?? source.market_capitalization ?? source.market_cap,
      currentPrice * totalQuantity
    );
    const peRatio = toNumber(
      source.market_metrics?.price_to_earnings_ratio ?? source.price_to_earnings_ratio ?? source.pe_ratio,
      0
    );
    const dividendYield = toNumber(
      source.market_metrics?.dividend_yield_percentage ?? source.dividend_yield_percentage,
      0
    );
    const fiftyTwoWeekHigh = toNumber(
      source.market_metrics?.fifty_two_week_high ?? source.fifty_two_week_high ?? source.week_52_high,
      0
    );
    const fiftyTwoWeekLow = toNumber(
      source.market_metrics?.fifty_two_week_low ?? source.fifty_two_week_low ?? source.week_52_low,
      0
    );
    const now = new Date();
    const incomingPriceHistory = Array.isArray(source.price_history) ? source.price_history : [];
    const priceHistory =
      incomingPriceHistory.length > 0
        ? incomingPriceHistory.map((entry) => ({
            recorded_price: toNumber(entry?.recorded_price, currentPrice),
            recorded_at: entry?.recorded_at ? new Date(entry.recorded_at) : now,
          }))
        : [{ recorded_price: currentPrice, recorded_at: now }];
    const tradingActivityLog = Array.isArray(source.trading_activity_log) ? source.trading_activity_log : [];

    return {
      company_id: companyId,
      issuing_company_id: companyId,
      stock_name: stockName,
      security_name: stockName,
      stock_symbol: stockSymbol,
      sector: String(source.sector || "").trim(),
      currency: String(source.currency || "INR").trim().toUpperCase(),
      current_price: currentPrice,
      current_market_price: currentPrice,
      volume,
      market_cap: marketCapitalization,
      pe_ratio: peRatio,
      eps: toNumber(source.eps, 0),
      roe: toNumber(source.roe, 0),
      rsi: toNumber(source.rsi, 0),
      ma_50: toNumber(source.ma_50, 0),
      ma_200: toNumber(source.ma_200, 0),
      day_high: toNumber(source.day_high, 0),
      day_low: toNumber(source.day_low, 0),
      week_52_high: fiftyTwoWeekHigh,
      week_52_low: fiftyTwoWeekLow,
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
      is_trading_active:
        source.is_trading_active === undefined
          ? source.is_active === undefined
            ? true
            : Boolean(source.is_active)
          : Boolean(source.is_trading_active),
      stock_price: currentPrice,
      total_quantity: totalQuantity,
      total_listed_quantity: totalQuantity,
      available_quantity: availableQuantity,
      available_trading_quantity: availableQuantity,
      profit_percentage: toNumber(source.profit_percentage, 0),
      description: String(source.description || "").trim(),
      listed_timestamp: source.listed_timestamp ? new Date(source.listed_timestamp) : now,
      last_updated_timestamp: source.last_updated_timestamp ? new Date(source.last_updated_timestamp) : now,
      price_history: priceHistory,
      market_metrics: {
        market_capitalization: marketCapitalization,
        price_to_earnings_ratio: peRatio,
        dividend_yield_percentage: dividendYield,
        fifty_two_week_high: fiftyTwoWeekHigh,
        fifty_two_week_low: fiftyTwoWeekLow,
      },
      trading_activity_log: tradingActivityLog,
    };
  }

  const updates = {};

  if (has("stock_name") || has("security_name") || has("stock_symbol")) {
    const symbolInput = String(source.stock_symbol || "").trim();
    const stockNameInput = String(source.security_name || source.stock_name || "").trim();
    if (stockNameInput) {
      updates.stock_name = stockNameInput;
      updates.security_name = stockNameInput;
      if (!symbolInput) updates.stock_symbol = stockNameInput;
    }
    if (symbolInput) {
      updates.stock_symbol = symbolInput;
      if (!stockNameInput) updates.stock_name = symbolInput;
    }
  }

  if (has("current_price") || has("current_market_price") || has("stock_price")) {
    const currentPrice = toNumber(source.current_market_price ?? source.current_price ?? source.stock_price, 0);
    updates.current_price = currentPrice;
    updates.current_market_price = currentPrice;
    updates.stock_price = currentPrice;
    updates.$push = {
      ...(updates.$push || {}),
      price_history: {
        recorded_price: currentPrice,
        recorded_at: new Date(),
      },
    };
  }

  if (has("total_quantity") || has("total_listed_quantity") || has("volume")) {
    const totalQuantity = Math.max(
      0,
      Math.trunc(toNumber(source.total_listed_quantity ?? source.total_quantity ?? source.volume, 0))
    );
    updates.total_quantity = totalQuantity;
    updates.total_listed_quantity = totalQuantity;
    if (has("volume")) {
      updates.volume = Math.max(0, Math.trunc(toNumber(source.volume, totalQuantity)));
    }
  }

  if (has("available_quantity") || has("available_trading_quantity")) {
    const availableQuantity = Math.max(
      0,
      Math.trunc(toNumber(source.available_trading_quantity ?? source.available_quantity, 0))
    );
    updates.available_quantity = availableQuantity;
    updates.available_trading_quantity = availableQuantity;
  }
  if (has("volume")) updates.volume = Math.max(0, Math.trunc(toNumber(source.volume, 0)));
  if (has("market_cap") || has("market_capitalization") || has("market_metrics")) {
    const marketCap = toNumber(
      source.market_metrics?.market_capitalization ?? source.market_capitalization ?? source.market_cap,
      0
    );
    updates.market_cap = marketCap;
    updates["market_metrics.market_capitalization"] = marketCap;
  }
  if (has("pe_ratio") || has("price_to_earnings_ratio") || has("market_metrics")) {
    const pe = toNumber(
      source.market_metrics?.price_to_earnings_ratio ?? source.price_to_earnings_ratio ?? source.pe_ratio,
      0
    );
    updates.pe_ratio = pe;
    updates["market_metrics.price_to_earnings_ratio"] = pe;
  }
  if (has("eps")) updates.eps = toNumber(source.eps, 0);
  if (has("roe")) updates.roe = toNumber(source.roe, 0);
  if (has("rsi")) updates.rsi = toNumber(source.rsi, 0);
  if (has("ma_50")) updates.ma_50 = toNumber(source.ma_50, 0);
  if (has("ma_200")) updates.ma_200 = toNumber(source.ma_200, 0);
  if (has("day_high")) updates.day_high = toNumber(source.day_high, 0);
  if (has("day_low")) updates.day_low = toNumber(source.day_low, 0);
  if (has("week_52_high") || has("fifty_two_week_high") || has("market_metrics")) {
    const high52 = toNumber(
      source.market_metrics?.fifty_two_week_high ?? source.fifty_two_week_high ?? source.week_52_high,
      0
    );
    updates.week_52_high = high52;
    updates["market_metrics.fifty_two_week_high"] = high52;
  }
  if (has("week_52_low") || has("fifty_two_week_low") || has("market_metrics")) {
    const low52 = toNumber(
      source.market_metrics?.fifty_two_week_low ?? source.fifty_two_week_low ?? source.week_52_low,
      0
    );
    updates.week_52_low = low52;
    updates["market_metrics.fifty_two_week_low"] = low52;
  }
  if (has("dividend_yield_percentage") || has("market_metrics")) {
    const dividendYield = toNumber(
      source.market_metrics?.dividend_yield_percentage ?? source.dividend_yield_percentage,
      0
    );
    updates["market_metrics.dividend_yield_percentage"] = dividendYield;
  }
  if (has("profit_percentage")) updates.profit_percentage = toNumber(source.profit_percentage, 0);
  if (has("sector")) updates.sector = String(source.sector || "").trim();
  if (has("currency")) updates.currency = String(source.currency || "INR").trim().toUpperCase();
  if (has("tags")) updates.tags = toStringArray(source.tags);
  if (has("listed_exchanges")) updates.listed_exchanges = toStringArray(source.listed_exchanges);
  if (has("major_shareholders")) updates.major_shareholders = String(source.major_shareholders || "").trim();
  if (has("dividend_history")) updates.dividend_history = String(source.dividend_history || "").trim();
  if (has("stock_category")) updates.stock_category = normalizeStockCategory(source.stock_category);
  if (has("is_active") || has("is_trading_active")) {
    const isTradingActive = has("is_trading_active") ? Boolean(source.is_trading_active) : Boolean(source.is_active);
    updates.is_active = isTradingActive;
    updates.is_trading_active = isTradingActive;
  }
  if (has("issuing_company_id")) {
    updates.issuing_company_id = String(source.issuing_company_id || companyId || "").trim();
  }
  if (has("security_name")) {
    const securityName = String(source.security_name || "").trim();
    if (securityName) {
      updates.security_name = securityName;
      if (!has("stock_name")) updates.stock_name = securityName;
    }
  }
  if (has("price_history") && Array.isArray(source.price_history)) {
    updates.price_history = source.price_history.map((entry) => ({
      recorded_price: toNumber(entry?.recorded_price, 0),
      recorded_at: entry?.recorded_at ? new Date(entry.recorded_at) : new Date(),
    }));
  }
  if (has("trading_activity_log") && Array.isArray(source.trading_activity_log)) {
    updates.trading_activity_log = source.trading_activity_log;
  }
  if (has("listed_timestamp")) updates.listed_timestamp = new Date(source.listed_timestamp);
  if (has("last_updated_timestamp")) updates.last_updated_timestamp = new Date(source.last_updated_timestamp);
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
      query.$and = [
        ...(query.$and || []),
        {
          $or: [{ available_trading_quantity: { $gt: 0 } }, { available_quantity: { $gt: 0 } }],
        },
        {
          $or: [{ is_trading_active: true }, { is_active: true }],
        },
      ];
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
      listed_timestamp: payload.listed_timestamp || now,
      last_updated_timestamp: payload.last_updated_timestamp || now,
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
    updates.last_updated_timestamp = new Date();

    Object.keys(updates).forEach((key) => updates[key] === undefined && delete updates[key]);
    const pushUpdates = updates.$push || undefined;
    if (pushUpdates) delete updates.$push;
    const queryUpdate = pushUpdates ? { $set: updates, $push: pushUpdates } : { $set: updates };

    const updated = await Stock.findOneAndUpdate({ id: stockId }, queryUpdate, { new: true }).lean();
    return res.json({ data: updated });
  } catch (error) {
    return res.status(500).json({ error: normalizeError(error) });
  }
});

app.get("/api/analysis/dashboard", authMiddleware, async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.max(1, Math.min(100, Number.parseInt(String(req.query.limit || "10"), 10) || 10));
    const skip = (page - 1) * limit;
    const minPrice = parseOptionalNumber(req.query.minPrice);
    const maxPrice = parseOptionalNumber(req.query.maxPrice);

    const andFilters = [];
    if (minPrice !== undefined) andFilters.push({ current_market_price: { $gte: minPrice } });
    if (maxPrice !== undefined) andFilters.push({ current_market_price: { $lte: maxPrice } });
    const filter = andFilters.length ? { $and: andFilters } : {};

    const [marketOverviewRaw, topStocks, paginatedStocks, investorPortfolio, totalCount] = await Promise.all([
      Stock.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            total_market_capitalization: {
              $sum: {
                $ifNull: ["$market_metrics.market_capitalization", { $ifNull: ["$market_cap", 0] }],
              },
            },
            average_market_price: {
              $avg: {
                $ifNull: ["$current_market_price", { $ifNull: ["$current_price", "$stock_price"] }],
              },
            },
          },
        },
      ]),
      Stock.find(filter, {
        security_name: 1,
        current_market_price: 1,
        "market_metrics.market_capitalization": 1,
        _id: 0,
      })
        .sort({ current_market_price: -1 })
        .limit(5)
        .lean(),
      Stock.find(filter, {
        security_name: 1,
        current_market_price: 1,
        "market_metrics.market_capitalization": 1,
        _id: 0,
      })
        .sort({ current_market_price: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Stock.find(
        {
          trading_activity_log: {
            $elemMatch: { investor_id: req.auth.userId },
          },
        },
        {
          security_name: 1,
          current_market_price: 1,
          "market_metrics.market_capitalization": 1,
          _id: 0,
        }
      )
        .sort({ current_market_price: -1 })
        .limit(20)
        .lean(),
      Stock.countDocuments(filter),
    ]);

    const marketOverview = marketOverviewRaw[0] || {
      total_market_capitalization: 0,
      average_market_price: 0,
    };

    return res.json({
      data: {
        market_overview: marketOverview,
        stock_rankings: paginatedStocks,
        top_5_stocks: topStocks,
        investor_portfolio: investorPortfolio,
        pagination: {
          page,
          limit,
          total: totalCount,
          total_pages: Math.max(1, Math.ceil(totalCount / limit)),
        },
        filters: {
          min_price: minPrice,
          max_price: maxPrice,
        },
      },
    });
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
    if (quantity > Number(stock.available_trading_quantity ?? stock.available_quantity ?? 0)) {
      return res.status(400).json({ error: "Not enough stock quantity available" });
    }

    const effectivePrice = Number(
      stock.current_market_price ?? stock.current_price ?? stock.stock_price ?? 0
    );
    const totalPrice = quantity * effectivePrice;
    if (buyerProfile.wallet_balance < totalPrice) {
      return res.status(400).json({ error: "Insufficient wallet balance" });
    }

    const decreasedStock = await Stock.findOneAndUpdate(
      { id: stockId, available_quantity: { $gte: quantity } },
      {
        $inc: { available_quantity: -quantity, available_trading_quantity: -quantity },
        $set: { updated_at: new Date(), last_updated_timestamp: new Date() },
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
        {
          $inc: { available_quantity: quantity, available_trading_quantity: quantity },
          $set: { updated_at: new Date(), last_updated_timestamp: new Date() },
        }
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

      await Stock.updateOne(
        { id: stockId },
        {
          $push: {
            trading_activity_log: {
              investor_id: buyerId,
              transaction_type: "BUY",
              transaction_quantity: quantity,
              execution_price: effectivePrice,
              transaction_timestamp: new Date(),
            },
          },
          $set: { last_updated_timestamp: new Date(), updated_at: new Date() },
        }
      );

      return res.status(201).json({ data: transaction, wallet_balance: updatedProfile.wallet_balance });
    } catch (error) {
      await Promise.all([
        Stock.updateOne(
          { id: stockId },
          {
            $inc: { available_quantity: quantity, available_trading_quantity: quantity },
            $set: { updated_at: new Date(), last_updated_timestamp: new Date() },
          }
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
