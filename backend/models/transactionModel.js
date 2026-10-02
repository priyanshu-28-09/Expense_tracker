import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["expense", "income", "transfer"],
      required: true,
      default: "expense",
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
      index: true,
    },
    category: {
      type: String,
      default: "Uncategorized",
      index: true,
    },
    categorySource: {
      type: String,
      enum: ["user", "rule", "ai", "default"],
      default: "user",
    },
    dedupeKey: {
      type: String,
      select: false,
    },
    subCategory: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    merchant: {
      type: String,
      default: "",
    },
    sender: {
      type: String,
      default: "",
    },
    receiver: {
      type: String,
      default: "",
    },
    paymentMethod: {
      type: String,
      enum: ["UPI", "Bank Transfer", "Cash", "Card", "Wallet", "Other"],
      default: "Other",
      index: true,
    },
    source: {
      type: String,
      enum: ["Manual", "Android Notification", "CSV", "Bank Integration", "UPI Integration", "Other"],
      default: "Manual",
      index: true,
    },
    sourceApplication: {
      type: String,
      default: "",
    },
    transactionDate: {
      type: Date,
      required: true,
      index: true,
    },
    transactionTime: {
      type: String,
      default: "",
    },
    transactionId: {
      type: String,
      default: "",
    },
    referenceId: {
      type: String,
      default: "",
    },
    sourceTransactionId: {
      type: String,
      default: undefined,
    },
    status: {
      type: String,
      enum: ["completed", "pending", "failed", "refunded"],
      default: "completed",
      index: true,
    },
    notes: {
      type: String,
      default: "",
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringFrequency: {
      type: String,
      default: "",
    },
    importedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    autoIndex: false,
  }
);

transactionSchema.index(
  { userId: 1, sourceTransactionId: 1 },
  {
    unique: true,
    partialFilterExpression: { sourceTransactionId: { $type: "string" } },
    name: "user_source_transaction_unique",
  }
);
transactionSchema.index(
  { userId: 1, dedupeKey: 1 },
  {
    unique: true,
    partialFilterExpression: { dedupeKey: { $type: "string" } },
    name: "user_transaction_dedupe_unique",
  }
);
transactionSchema.index({ userId: 1, referenceId: 1 }, { sparse: true, name: "user_reference_idx" });
transactionSchema.index({ userId: 1, paymentMethod: 1 }, { name: "user_payment_method_idx" });
transactionSchema.index({ userId: 1, category: 1 }, { name: "user_category_idx" });
transactionSchema.index({ userId: 1, transactionDate: -1 }, { name: "user_transaction_date_idx" });

const transactionModel = mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);

export default transactionModel;
