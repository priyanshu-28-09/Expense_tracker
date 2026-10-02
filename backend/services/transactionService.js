import mongoose from "mongoose";
import Transaction from "../models/transactionModel.js";
import { createTransactionDedupeKey, findDuplicateTransaction, isDuplicateKeyError } from "./transactionDeduplicator.js";
import { categorizeTransaction } from "./transactionCategorizer.js";
import { normalizeTransaction } from "./transactionNormalizer.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function parseListOptions(query) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  if (!Number.isInteger(page) || page < 1) throw Object.assign(new Error("page must be a positive integer."), { status: 400, field: "page" });
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw Object.assign(new Error("limit must be an integer from 1 to 100."), { status: 400, field: "limit" });

  const filter = { userId: query.userId };
  const options = {
    type: ["expense", "income", "transfer"],
    paymentMethod: ["UPI", "Bank Transfer", "Cash", "Card", "Wallet", "Other"],
    source: ["Manual", "Android Notification", "CSV", "Bank Integration", "UPI Integration", "Other"],
    status: ["completed", "pending", "failed", "refunded"],
  };
  for (const [field, allowed] of Object.entries(options)) {
    if (query[field] !== undefined) {
      if (!allowed.includes(query[field])) throw Object.assign(new Error(`${field} has an unsupported value.`), { status: 400, field });
      filter[field] = query[field];
    }
  }
  for (const field of ["category", "merchant", "search"]) {
    if (query[field] !== undefined) {
      if (typeof query[field] !== "string" || query[field].length > 200) {
        throw Object.assign(new Error(`${field} must be a string of at most 200 characters.`), { status: 400, field });
      }
      if (field === "merchant") filter.merchant = { $regex: escapeRegex(query[field]), $options: "i" };
      else if (field === "category") filter.category = query[field];
    }
  }
  if (query.search) {
    const search = { $regex: escapeRegex(query.search), $options: "i" };
    filter.$or = [
      { description: search },
      { merchant: search },
      { category: search },
      { transactionId: search },
      { referenceId: search },
      { sourceTransactionId: search },
      { notes: search },
    ];
  }
  for (const [queryField, operator] of [["minAmount", "$gte"], ["maxAmount", "$lte"]]) {
    if (query[queryField] !== undefined) {
      const amount = Number(query[queryField]);
      if (!Number.isFinite(amount) || amount < 0) {
        throw Object.assign(new Error(`${queryField} must be a non-negative number.`), { status: 400, field: queryField });
      }
      filter.amount ??= {};
      filter.amount[operator] = amount;
    }
  }
  if (filter.amount?.$gte !== undefined && filter.amount?.$lte !== undefined && filter.amount.$gte > filter.amount.$lte) {
    throw Object.assign(new Error("minAmount must be less than or equal to maxAmount."), { status: 400, field: "minAmount" });
  }
  if (query.fromDate !== undefined || query.toDate !== undefined) {
    filter.transactionDate = {};
    if (query.fromDate !== undefined) {
      const fromDate = new Date(query.fromDate);
      if (!Number.isFinite(fromDate.getTime())) throw Object.assign(new Error("fromDate must be a valid date."), { status: 400, field: "fromDate" });
      filter.transactionDate.$gte = fromDate;
    }
    if (query.toDate !== undefined) {
      const toDate = new Date(query.toDate);
      if (!Number.isFinite(toDate.getTime())) throw Object.assign(new Error("toDate must be a valid date."), { status: 400, field: "toDate" });
      if (/^\d{4}-\d{2}-\d{2}$/.test(query.toDate)) toDate.setUTCHours(23, 59, 59, 999);
      filter.transactionDate.$lte = toDate;
    }
    if (filter.transactionDate.$gte && filter.transactionDate.$lte && filter.transactionDate.$gte > filter.transactionDate.$lte) {
      throw Object.assign(new Error("fromDate must be on or before toDate."), { status: 400, field: "fromDate" });
    }
  }
  return { filter, page, limit };
}

export async function listTransactions(userId, query) {
  const { filter, page, limit } = parseListOptions({ ...query, userId });
  const [data, total] = await Promise.all([
    Transaction.find(filter).sort({ transactionDate: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Transaction.countDocuments(filter),
  ]);
  return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function getTransaction(userId, id) {
  if (!mongoose.isValidObjectId(id)) throw Object.assign(new Error("Transaction id is invalid."), { status: 400, field: "id" });
  return Transaction.findOne({ _id: id, userId }).lean();
}

export async function createTransaction(userId, body, sourceDefault) {
  const payload = normalizeTransaction(body, { userId, sourceDefault });
  const categorization = await categorizeTransaction(payload, { categoryProvided: Object.hasOwn(body, "category") });
  payload.category = categorization.category;
  payload.categorySource = categorization.categorySource;
  payload.dedupeKey = createTransactionDedupeKey(payload);
  const duplicate = await findDuplicateTransaction(payload);
  if (duplicate) return { duplicate: true, data: duplicate };
  try {
    const data = await Transaction.create(payload);
    return { duplicate: false, data };
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const racedDuplicate = await findDuplicateTransaction(payload);
    if (racedDuplicate) return { duplicate: true, data: racedDuplicate };
    throw error;
  }
}

export async function updateTransaction(userId, id, body) {
  if (!mongoose.isValidObjectId(id)) throw Object.assign(new Error("Transaction id is invalid."), { status: 400, field: "id" });
  const payload = normalizeTransaction(body, { userId, partial: true });
  const current = await Transaction.findOne({ _id: id, userId });
  if (!current) return null;

  const candidate = { ...current.toObject(), ...payload, userId };
  const categorization = await categorizeTransaction(candidate, {
    categoryProvided: Object.hasOwn(body, "category") || (current.categorySource || "user") === "user",
  });
  payload.category = categorization.category;
  payload.categorySource = categorization.categorySource;
  const updatedCandidate = { ...candidate, ...payload };
  payload.dedupeKey = createTransactionDedupeKey(updatedCandidate);

  const duplicate = await findDuplicateTransaction(updatedCandidate, { excludeId: id });
  if (duplicate) return { duplicate: true, data: duplicate };
  Object.assign(current, payload);
  return current.save({ validateBeforeSave: true });
}

export async function upsertLinkedTransaction(userId, body) {
  const existing = await Transaction.findOne({ userId, sourceTransactionId: body.sourceTransactionId }).select("_id");
  if (existing) return updateTransaction(userId, existing._id, body);
  return createTransaction(userId, body, "Manual");
}

export async function deleteTransaction(userId, id) {
  if (!mongoose.isValidObjectId(id)) throw Object.assign(new Error("Transaction id is invalid."), { status: 400, field: "id" });
  return Transaction.findOneAndDelete({ _id: id, userId });
}

export async function importTransactions(userId, items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw Object.assign(new Error("Provide a non-empty transactions array."), { status: 400, field: "transactions" });
  }
  if (items.length > 500) throw Object.assign(new Error("A maximum of 500 transactions can be imported at once."), { status: 400, field: "transactions" });

  const data = [];
  const rejected = [];
  for (const [index, item] of items.entries()) {
    try {
      const result = await createTransaction(userId, item, "CSV");
      if (result.duplicate) rejected.push({ index, reason: "duplicate", transactionId: result.data._id });
      else data.push(result.data);
    } catch (error) {
      if (error.name === "TransactionValidationError" || error.name === "ValidationError") {
        rejected.push({ index, reason: "invalid", field: error.field || error.errors && Object.keys(error.errors)[0], message: error.message });
      } else {
        throw error;
      }
    }
  }
  return { created: data.length, rejected: rejected.length, data, rejectedItems: rejected };
}

export async function receiveMobileTransactions(userId, items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw Object.assign(new Error("Provide a non-empty transactions array."), { status: 400, field: "transactions" });
  }
  if (items.length > 500) throw Object.assign(new Error("A maximum of 500 transactions can be uploaded at once."), { status: 400, field: "transactions" });

  const data = [];
  const rejected = [];
  for (const [index, item] of items.entries()) {
    try {
      const result = await createTransaction(userId, item, "Android Notification");
      if (result.duplicate) rejected.push({ index, reason: "duplicate", transactionId: result.data._id });
      else data.push(result.data);
    } catch (error) {
      if (error.name === "TransactionValidationError" || error.name === "ValidationError") {
        rejected.push({ index, reason: "invalid", field: error.field || error.errors && Object.keys(error.errors)[0], message: error.message });
      } else {
        throw error;
      }
    }
  }
  return { received: data.length, rejected: rejected.length, data, rejectedItems: rejected };
}