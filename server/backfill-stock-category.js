import mongoose from "mongoose";
import { connectDatabase, ensureCollectionsAndIndexes } from "./db.js";
import { Stock } from "./models.js";

function asStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function buildStockCategory(stock) {
  const existing = asObject(stock.stock_category);
  const tags = asStringArray(stock.tags);
  const listedExchanges = asStringArray(stock.listed_exchanges);

  const data = {
    ...asObject(existing.data),
    ...asObject(existing.embedded_data),
    major_shareholders: String(stock.major_shareholders || "").trim(),
    dividend_history: String(stock.dividend_history || "").trim(),
  };

  const rawDocuments = Array.isArray(existing.documents)
    ? existing.documents
    : Array.isArray(existing.embedded_documents)
      ? existing.embedded_documents
      : [];
  const documents = rawDocuments.filter((doc) => doc && typeof doc === "object" && !Array.isArray(doc));

  if (!documents.some((doc) => doc.type === "exchange_detail") && listedExchanges.length > 0) {
    documents.unshift({
      type: "exchange_detail",
      exchange: listedExchanges[0],
      priority: 1,
    });
  }

  if (!documents.some((doc) => doc.type === "valuation_snapshot")) {
    documents.push({
      type: "valuation_snapshot",
      pe_ratio: Number(stock.pe_ratio || 0),
      eps: Number(stock.eps || 0),
      roe: Number(stock.roe || 0),
    });
  }

  const arrays = Array.isArray(existing.arrays) ? existing.arrays : [...tags, ...listedExchanges];

  return {
    name: String(existing.name || stock.sector || "").trim(),
    arrays,
    documents,
    data,
  };
}

function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function backfillStockCategory() {
  await connectDatabase();
  await ensureCollectionsAndIndexes();

  const stocks = await Stock.find({}, {
    id: 1,
    sector: 1,
    tags: 1,
    listed_exchanges: 1,
    major_shareholders: 1,
    dividend_history: 1,
    pe_ratio: 1,
    eps: 1,
    roe: 1,
    stock_category: 1,
  }).lean();

  if (!stocks.length) {
    console.log("No stocks found. Nothing to backfill.");
    return;
  }

  const now = new Date();
  const ops = [];

  for (const stock of stocks) {
    const nextCategory = buildStockCategory(stock);
    const prevCategory = asObject(stock.stock_category);

    if (!sameJson(prevCategory, nextCategory)) {
      ops.push({
        updateOne: {
          filter: { id: stock.id },
          update: {
            $set: {
              stock_category: nextCategory,
              updated_at: now,
            },
          },
        },
      });
    }
  }

  if (!ops.length) {
    console.log("All stocks already have the expected stock_category structure.");
    return;
  }

  const result = await Stock.bulkWrite(ops, { ordered: false });
  console.log(`Backfill complete. Updated ${result.modifiedCount} stock documents.`);
}

backfillStockCategory()
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
