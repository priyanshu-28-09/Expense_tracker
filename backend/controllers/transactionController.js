import {
  createTransaction as createTransactionRecord,
  deleteTransaction as deleteTransactionRecord,
  getTransaction,
  importTransactions as importTransactionRecords,
  listTransactions,
  updateTransaction as updateTransactionRecord,
} from "../services/transactionService.js";

const sendError = (res, error) => {
  if (error.name === "TransactionValidationError" || error.name === "ValidationError" || error.status === 400) {
    return res.status(400).json({
      success: false,
      message: error.message,
      ...(error.field ? { field: error.field } : {}),
    });
  }
  if (error.code === 11000) {
    return res.status(409).json({ success: false, message: "A transaction with this external identifier already exists." });
  }
  console.error("Transaction API error:", error);
  return res.status(500).json({ success: false, message: "The transaction request could not be completed." });
};

export const getTransactions = async (req, res) => {
  try {
    const result = await listTransactions(req.user._id, req.query);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getTransactionById = async (req, res) => {
  try {
    const data = await getTransaction(req.user._id, req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Transaction not found." });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const createTransaction = async (req, res) => {
  try {
    const result = await createTransactionRecord(req.user._id, req.body);
    if (result.duplicate) {
      return res.status(409).json({ success: false, duplicate: true, message: "This transaction has already been recorded.", data: result.data });
    }
    return res.status(201).json({ success: true, message: "Transaction created.", data: result.data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const updateTransaction = async (req, res) => {
  try {
    const result = await updateTransactionRecord(req.user._id, req.params.id, req.body);
    if (!result) return res.status(404).json({ success: false, message: "Transaction not found." });
    if (result.duplicate) {
      return res.status(409).json({ success: false, duplicate: true, message: "Another transaction already uses this external identifier.", data: result.data });
    }
    return res.status(200).json({ success: true, data: result, message: "Transaction updated." });
  } catch (error) {
    return sendError(res, error);
  }
};

export const deleteTransaction = async (req, res) => {
  try {
    const data = await deleteTransactionRecord(req.user._id, req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Transaction not found." });
    return res.status(200).json({ success: true, message: "Transaction deleted." });
  } catch (error) {
    return sendError(res, error);
  }
};

export const importTransactions = async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : req.body?.transactions;
    const result = await importTransactionRecords(req.user._id, items);
    return res.status(200).json({ success: true, message: "Transaction import processed.", ...result });
  } catch (error) {
    return sendError(res, error);
  }
};
