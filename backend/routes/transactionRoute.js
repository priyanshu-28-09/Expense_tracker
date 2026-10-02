import express from "express";
import authMiddleware from "../middleware/auth.js";
import {
  createTransaction,
  deleteTransaction,
  getTransactionById,
  getTransactions,
  importTransactions,
  updateTransaction,
} from "../controllers/transactionController.js";

const transactionRouter = express.Router();

transactionRouter.get("/", authMiddleware, getTransactions);
transactionRouter.get("/:id", authMiddleware, getTransactionById);
transactionRouter.post("/", authMiddleware, createTransaction);
transactionRouter.put("/:id", authMiddleware, updateTransaction);
transactionRouter.delete("/:id", authMiddleware, deleteTransaction);
transactionRouter.post("/import", authMiddleware, importTransactions);

export default transactionRouter;
