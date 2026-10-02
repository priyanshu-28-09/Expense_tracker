import { createHash } from "node:crypto";
import Transaction from "../models/transactionModel.js";

const normalizeIdentityText = (value) => String(value || "").trim().toLowerCase();
const normalizeIdentifier = (value) => String(value || "").trim();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function createTransactionDedupeKey(transaction) {
  const identity = transaction.sourceTransactionId
    ? ["source", normalizeIdentifier(transaction.sourceTransactionId)]
    : [
      "composite",
      String(transaction.userId),
      transaction.type,
      String(Number(transaction.amount)),
      transaction.currency || "INR",
      normalizeIdentityText(transaction.merchant || transaction.description),
      new Date(transaction.transactionDate).toISOString(),
      normalizeIdentityText(transaction.transactionTime),
      normalizeIdentifier(transaction.referenceId),
    ];

  return createHash("sha256").update(JSON.stringify(identity)).digest("hex");
}

export async function findDuplicateTransaction(transaction, { excludeId } = {}) {
  const query = {
    userId: transaction.userId,
    $or: [{ dedupeKey: createTransactionDedupeKey(transaction) }],
  };
  if (transaction.sourceTransactionId) {
    query.$or.push({ sourceTransactionId: transaction.sourceTransactionId });
  } else {
    const merchant = transaction.merchant || transaction.description || "";
    const referenceId = normalizeIdentifier(transaction.referenceId);
    const merchantRegex = { $regex: `^${escapeRegex(merchant.trim())}$`, $options: "i" };
    query.$or.push({
      type: transaction.type,
      amount: Number(transaction.amount),
      currency: transaction.currency || "INR",
      transactionDate: new Date(transaction.transactionDate),
      transactionTime: transaction.transactionTime || "",
      referenceId,
      $or: [
        { merchant: merchantRegex },
        { merchant: { $in: ["", null] }, description: merchantRegex },
      ],
    });
  }
  if (excludeId) query._id = { $ne: excludeId };
  return Transaction.findOne(query).lean();
}

export function isDuplicateKeyError(error) {
  return error?.code === 11000;
}