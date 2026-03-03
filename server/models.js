import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    password_hash: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { collection: "users", versionKey: false }
);

const profileSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    user_id: { type: String, required: true, unique: true, index: true },
    full_name: { type: String, default: "" },
    email: { type: String, required: true, index: true },
    industry: { type: String, default: "" },
    description: { type: String, default: "" },
    wallet_balance: { type: Number, default: 10000 },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { collection: "profiles", versionKey: false }
);

const userRoleSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    user_id: { type: String, required: true, index: true },
    role: { type: String, enum: ["company", "buyer"], required: true },
  },
  { collection: "user_roles", versionKey: false }
);

const stockCategorySchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    arrays: { type: [mongoose.Schema.Types.Mixed], default: [] },
    documents: { type: [mongoose.Schema.Types.Mixed], default: [] },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false, strict: false }
);

const stockSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    company_id: { type: String, required: true, index: true },
    stock_name: { type: String, required: true },
    stock_symbol: { type: String, default: "" },
    sector: { type: String, default: "" },
    currency: { type: String, default: "INR" },
    current_price: { type: Number, required: true, default: 0 },
    volume: { type: Number, required: true, default: 0 },
    market_cap: { type: Number, required: true, default: 0 },
    pe_ratio: { type: Number, default: 0 },
    eps: { type: Number, default: 0 },
    roe: { type: Number, default: 0 },
    rsi: { type: Number, default: 0 },
    ma_50: { type: Number, default: 0 },
    ma_200: { type: Number, default: 0 },
    day_high: { type: Number, default: 0 },
    day_low: { type: Number, default: 0 },
    week_52_high: { type: Number, default: 0 },
    week_52_low: { type: Number, default: 0 },
    tags: { type: [String], default: [] },
    listed_exchanges: { type: [String], default: [] },
    major_shareholders: { type: String, default: "" },
    dividend_history: { type: String, default: "" },
    stock_category: {
      type: stockCategorySchema,
      default: () => ({
        name: "",
        arrays: [],
        documents: [],
        data: {},
      }),
    },
    is_active: { type: Boolean, default: true },
    stock_price: { type: Number, required: true, default: 0 },
    total_quantity: { type: Number, required: true, default: 0 },
    available_quantity: { type: Number, required: true, default: 0 },
    profit_percentage: { type: Number, default: 0 },
    description: { type: String, default: "" },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { collection: "stocks", versionKey: false }
);

const transactionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    buyer_id: { type: String, required: true, index: true },
    stock_id: { type: String, required: true, index: true },
    company_id: { type: String, required: true, index: true },
    quantity: { type: Number, required: true },
    price_per_unit: { type: Number, required: true },
    total_price: { type: Number, required: true },
    created_at: { type: Date, default: Date.now },
  },
  { collection: "transactions", versionKey: false }
);

profileSchema.pre("save", function updateTimestamp(next) {
  this.updated_at = new Date();
  next();
});

stockSchema.pre("save", function updateTimestamp(next) {
  this.updated_at = new Date();
  next();
});

export const User = mongoose.model("User", userSchema);
export const Profile = mongoose.model("Profile", profileSchema);
export const UserRole = mongoose.model("UserRole", userRoleSchema);
export const Stock = mongoose.model("Stock", stockSchema);
export const Transaction = mongoose.model("Transaction", transactionSchema);
