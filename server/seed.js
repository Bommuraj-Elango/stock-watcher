import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import { connectDatabase, ensureCollectionsAndIndexes } from "./db.js";
import { Profile, Stock, Transaction, User, UserRole } from "./models.js";

const DEFAULT_PASSWORD = "123456";

function buildCompanyStock(companyUserId, companyIndex, stockIndex, now) {
  const symbol = `C${companyIndex}STK${stockIndex}`;
  const currentPrice = 50 + companyIndex * 9 + stockIndex * 7;
  const totalQuantity = 400 + companyIndex * 35 + stockIndex * 45;
  const availableQuantity = totalQuantity - (stockIndex - 1) * 20;
  const marketCap = currentPrice * totalQuantity;
  const sector = ["Tech", "Finance", "Healthcare", "Energy", "Retail"][(stockIndex - 1) % 5];
  const tags = [`sector-${stockIndex}`, `company-${companyIndex}`];
  const listedExchanges = stockIndex % 2 === 0 ? ["NSE", "BSE"] : ["NSE"];
  const majorShareholders = `Founder:${20 + stockIndex},Institution:${15 + companyIndex}`;
  const dividendHistory = `2024:${(1 + stockIndex * 0.2).toFixed(2)},2025:${(1.2 + stockIndex * 0.25).toFixed(2)}`;

  return {
    id: uuidv4(),
    company_id: companyUserId,
    stock_name: symbol,
    stock_symbol: symbol,
    sector,
    currency: "INR",
    current_price: currentPrice,
    volume: totalQuantity,
    market_cap: marketCap,
    pe_ratio: 10 + companyIndex + stockIndex,
    eps: Number((2 + companyIndex * 0.4 + stockIndex * 0.6).toFixed(2)),
    roe: Number((8 + companyIndex * 0.8 + stockIndex * 0.7).toFixed(2)),
    rsi: Math.min(80, 35 + companyIndex + stockIndex * 3),
    ma_50: Number((currentPrice * 0.95).toFixed(2)),
    ma_200: Number((currentPrice * 0.88).toFixed(2)),
    day_high: Number((currentPrice * 1.03).toFixed(2)),
    day_low: Number((currentPrice * 0.97).toFixed(2)),
    week_52_high: Number((currentPrice * 1.25).toFixed(2)),
    week_52_low: Number((currentPrice * 0.62).toFixed(2)),
    tags,
    listed_exchanges: listedExchanges,
    major_shareholders: majorShareholders,
    dividend_history: dividendHistory,
    stock_category: {
      name: sector,
      arrays: [...tags, ...listedExchanges],
      documents: [
        { type: "exchange_detail", exchange: listedExchanges[0], priority: 1 },
        {
          type: "valuation_snapshot",
          pe_ratio: 10 + companyIndex + stockIndex,
          eps: Number((2 + companyIndex * 0.4 + stockIndex * 0.6).toFixed(2)),
          roe: Number((8 + companyIndex * 0.8 + stockIndex * 0.7).toFixed(2)),
        },
      ],
      data: {
        major_shareholders: majorShareholders,
        dividend_history: dividendHistory,
      },
    },
    is_active: true,
    stock_price: currentPrice,
    total_quantity: totalQuantity,
    available_quantity: availableQuantity,
    profit_percentage: Number((4 + companyIndex * 0.6 + stockIndex * 0.9).toFixed(2)),
    description: `Stock ${symbol} issued by company${companyIndex}`,
    created_at: now,
    updated_at: now,
  };
}

async function seed() {
  await connectDatabase();
  await ensureCollectionsAndIndexes();

  const now = new Date();
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  await Promise.all([
    Stock.deleteMany({}),
    Transaction.deleteMany({}),
    UserRole.deleteMany({}),
    Profile.deleteMany({}),
    User.deleteMany({}),
  ]);

  const users = [];
  const profiles = [];
  const roles = [];
  const companyUserIds = [];

  for (let i = 1; i <= 10; i += 1) {
    const buyerUserId = uuidv4();
    const buyerEmail = `user${i}@stockfund.local`;
    users.push({
      id: buyerUserId,
      email: buyerEmail,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
    });
    profiles.push({
      id: uuidv4(),
      user_id: buyerUserId,
      full_name: `user${i}`,
      email: buyerEmail,
      industry: "Individual Investor",
      description: `Demo buyer account user${i}`,
      wallet_balance: 100000,
      created_at: now,
      updated_at: now,
    });
    roles.push({
      id: uuidv4(),
      user_id: buyerUserId,
      role: "buyer",
    });

    const companyUserId = uuidv4();
    const companyEmail = `company${i}@stockfund.local`;
    companyUserIds.push(companyUserId);
    users.push({
      id: companyUserId,
      email: companyEmail,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
    });
    profiles.push({
      id: uuidv4(),
      user_id: companyUserId,
      full_name: `company${i}`,
      email: companyEmail,
      industry: "Stock Issuer",
      description: `Demo company account company${i}`,
      wallet_balance: 0,
      created_at: now,
      updated_at: now,
    });
    roles.push({
      id: uuidv4(),
      user_id: companyUserId,
      role: "company",
    });
  }

  const stocks = [];
  companyUserIds.forEach((companyUserId, companyOffset) => {
    const companyIndex = companyOffset + 1;
    for (let stockIndex = 1; stockIndex <= 5; stockIndex += 1) {
      stocks.push(buildCompanyStock(companyUserId, companyIndex, stockIndex, now));
    }
  });

  await User.insertMany(users, { ordered: true });
  await Profile.insertMany(profiles, { ordered: true });
  await UserRole.insertMany(roles, { ordered: true });
  await Stock.insertMany(stocks, { ordered: true });

  console.log("Seed complete");
  console.log("Buyer accounts: user1@stockfund.local ... user10@stockfund.local");
  console.log("Company accounts: company1@stockfund.local ... company10@stockfund.local");
  console.log(`Password for all accounts: ${DEFAULT_PASSWORD}`);
  console.log(`Stocks inserted: ${stocks.length}`);
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
