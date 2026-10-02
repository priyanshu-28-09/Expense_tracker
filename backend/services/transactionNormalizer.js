const VALID_TYPES = ["expense", "income", "transfer"];
const VALID_PAYMENT_METHODS = ["UPI", "Bank Transfer", "Cash", "Card", "Wallet", "Other"];
const VALID_SOURCES = ["Manual", "Android Notification", "CSV", "Bank Integration", "UPI Integration", "Other"];
const VALID_STATUSES = ["completed", "pending", "failed", "refunded"];

const STRING_LIMITS = {
  category: 100,
  subCategory: 100,
  description: 500,
  merchant: 200,
  sender: 200,
  receiver: 200,
  sourceApplication: 150,
  transactionTime: 5,
  transactionId: 200,
  referenceId: 200,
  sourceTransactionId: 256,
  notes: 2000,
  recurringFrequency: 40,
};

const TRANSACTION_FIELDS = new Set([
  "type", "amount", "currency", "category", "subCategory", "description", "merchant",
  "sender", "receiver", "paymentMethod", "source", "sourceApplication", "transactionDate",
  "transactionTime", "transactionId", "referenceId", "sourceTransactionId", "status", "notes",
  "isRecurring", "recurringFrequency", "importedAt",
]);

export class TransactionValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = "TransactionValidationError";
    this.field = field;
  }
}

const fail = (field, message) => {
  throw new TransactionValidationError(message, field);
};

const normalizeDate = (value, field) => {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) fail(field, `${field} must be a valid date.`);
  return date;
};

const normalizeString = (value, field, maxLength) => {
  if (typeof value !== "string") fail(field, `${field} must be a string.`);
  const normalized = value.trim();
  if (normalized.length > maxLength) fail(field, `${field} must be at most ${maxLength} characters.`);
  return normalized;
};

export function normalizeTransaction(input, { userId, sourceDefault, partial = false } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    fail("body", "Transaction must be a JSON object.");
  }

  for (const key of Object.keys(input)) {
    if (key !== "userId" && !TRANSACTION_FIELDS.has(key)) {
      fail(key, `Unsupported transaction field: ${key}.`);
    }
    if (key !== "userId" && input[key] === null) fail(key, `${key} cannot be null.`);
  }

  const output = partial ? {} : {
    userId,
    type: input.type,
    amount: input.amount,
    currency: input.currency ?? "INR",
    category: input.category ?? "Uncategorized",
    subCategory: input.subCategory ?? "",
    description: input.description ?? input.merchant ?? "Transaction",
    merchant: input.merchant || input.description || "",
    sender: input.sender ?? "",
    receiver: input.receiver ?? "",
    paymentMethod: input.paymentMethod ?? "Other",
    source: input.source ?? sourceDefault ?? "Manual",
    sourceApplication: input.sourceApplication ?? "",
    transactionDate: input.transactionDate ?? new Date(),
    transactionTime: input.transactionTime ?? "",
    transactionId: input.transactionId ?? "",
    referenceId: input.referenceId ?? "",
    ...(input.sourceTransactionId === undefined ? {} : { sourceTransactionId: input.sourceTransactionId }),
    status: input.status ?? "completed",
    notes: input.notes ?? "",
    isRecurring: input.isRecurring ?? false,
    recurringFrequency: input.recurringFrequency ?? "",
    importedAt: input.importedAt ?? new Date(),
  };

  if (partial) {
    for (const key of TRANSACTION_FIELDS) {
      if (Object.hasOwn(input, key)) output[key] = input[key];
    }
  }

  if (!partial || Object.hasOwn(input, "type")) {
    if (!VALID_TYPES.includes(output.type)) fail("type", "type must be expense, income, or transfer.");
  }
  if (!partial || Object.hasOwn(input, "amount")) {
    const amount = typeof output.amount === "number" || typeof output.amount === "string"
      ? Number(output.amount)
      : NaN;
    if (!Number.isFinite(amount) || amount <= 0) fail("amount", "amount must be a finite number greater than zero.");
    output.amount = amount;
  }

  for (const [field, maxLength] of Object.entries(STRING_LIMITS)) {
    if (Object.hasOwn(output, field)) {
      if (output[field] === undefined || output[field] === null) {
        if (partial) delete output[field];
        else fail(field, `${field} must be a string.`);
      } else {
        output[field] = normalizeString(output[field], field, maxLength);
      }
    }
  }

  if (output.sourceTransactionId === "") delete output.sourceTransactionId;

  if (Object.hasOwn(output, "currency")) {
    if (typeof output.currency !== "string" || !/^[A-Za-z]{3}$/.test(output.currency)) {
      fail("currency", "currency must be a three-letter currency code.");
    }
    output.currency = output.currency.toUpperCase();
  }

  for (const [field, values] of Object.entries({
    type: VALID_TYPES,
    paymentMethod: VALID_PAYMENT_METHODS,
    source: VALID_SOURCES,
    status: VALID_STATUSES,
  })) {
    if (Object.hasOwn(output, field) && !values.includes(output[field])) {
      fail(field, `${field} has an unsupported value.`);
    }
  }

  for (const field of ["transactionDate", "importedAt"]) {
    if (Object.hasOwn(output, field)) output[field] = normalizeDate(output[field], field);
  }

  if (Object.hasOwn(output, "transactionTime") && output.transactionTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(output.transactionTime)) {
    fail("transactionTime", "transactionTime must use 24-hour HH:mm format.");
  }

  if (Object.hasOwn(output, "isRecurring") && typeof output.isRecurring !== "boolean") {
    fail("isRecurring", "isRecurring must be a boolean.");
  }

  if (!partial) {
    if (!output.type) fail("type", "type is required.");
    output.userId = userId;
    if (!output.transactionTime) output.transactionTime = output.transactionDate.toTimeString().slice(0, 5);
  }

  if (partial) output.userId = userId;
  return output;
}

export const transactionFieldOptions = {
  types: VALID_TYPES,
  paymentMethods: VALID_PAYMENT_METHODS,
  sources: VALID_SOURCES,
  statuses: VALID_STATUSES,
};