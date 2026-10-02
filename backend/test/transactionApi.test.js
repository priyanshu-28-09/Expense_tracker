import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import dotenv from "dotenv";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Device from "../models/deviceModel.js";
import Transaction from "../models/transactionModel.js";
import expenseModel from "../models/expenseModel.js";
import incomeModel from "../models/incomeModel.js";
import User from "../models/userModel.js";

dotenv.config();
process.env.JWT_SECRET = "test-only-jwt-secret-for-transaction-api-tests";

const { default: transactionRouter } = await import("../routes/transactionRoute.js");
const { default: mobileRouter } = await import("../routes/mobileRoute.js");
const { default: dashboardRouter } = await import("../routes/dashboardRoute.js");
const { default: expenseRouter } = await import("../routes/expenseRoute.js");
const { default: incomeRouter } = await import("../routes/incomeRoute.js");

test("transaction APIs enforce auth, ownership, validation, and deduplication", { skip: !process.env.MONGO_URI }, async (t) => {
  await connectDB();

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const primaryUser = await User.create({ name: "Transaction API Test", email: `transaction-api-${suffix}@example.test`, password: "test-only" });
  const otherUser = await User.create({ name: "Other API Test", email: `transaction-api-other-${suffix}@example.test`, password: "test-only" });
  const secret = process.env.JWT_SECRET;
  const token = jwt.sign({ id: primaryUser._id }, secret, { expiresIn: "1h" });
  const app = express();
  app.use(express.json());
  app.use("/api/transactions", transactionRouter);
  app.use("/api/mobile", mobileRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/expense", expenseRouter);
  app.use("/api/income", incomeRouter);
  const server = app.listen(0);
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const request = (path, { method = "GET", body, auth = token, headers: extraHeaders = {} } = {}) => fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(auth ? { authorization: `Bearer ${auth}` } : {}),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...extraHeaders,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  let ownedId;
  let otherId;
  try {
    const otherTransaction = await Transaction.create({
      userId: otherUser._id,
      type: "expense",
      amount: 99,
      transactionDate: new Date(),
      description: "Private transaction",
    });
    otherId = otherTransaction._id.toString();

    await t.test("all requested endpoints require authentication", async () => {
      const protectedRequests = [
        ["/api/transactions", "GET"],
        ["/api/transactions/000000000000000000000001", "GET"],
        ["/api/transactions", "POST"],
        ["/api/transactions/000000000000000000000001", "PUT"],
        ["/api/transactions/000000000000000000000001", "DELETE"],
        ["/api/transactions/import", "POST"],
        ["/api/mobile/transactions", "POST"],
      ];
      for (const [path, method] of protectedRequests) {
        const response = await request(path, { method, auth: null, body: method === "POST" || method === "PUT" ? {} : undefined });
        assert.equal(response.status, 401, `${method} ${path}`);
      }
    });

    await t.test("create validates data, assigns authenticated owner, and rejects duplicates", async () => {
      const body = {
        userId: otherUser._id.toString(),
        type: "expense",
        amount: 12.5,
        description: "Lunch",
        sourceTransactionId: `api-test:${suffix}`,
      };
      const response = await request("/api/transactions", { method: "POST", body });
      assert.equal(response.status, 201);
      const result = await response.json();
      ownedId = result.data._id;
      assert.equal(result.data.userId.toString(), primaryUser._id.toString());

      const duplicate = await request("/api/transactions", { method: "POST", body });
      assert.equal(duplicate.status, 409);

      const sameSourceIdDifferentFields = await request("/api/transactions", {
        method: "POST",
        body: { ...body, amount: 999, merchant: "A different merchant" },
      });
      assert.equal(sameSourceIdDifferentFields.status, 409);

      const invalid = await request("/api/transactions", { method: "POST", body: { type: "expense", amount: -1 } });
      assert.equal(invalid.status, 400);

      const invalidField = await request("/api/transactions", {
        method: "POST",
        body: { type: "expense", amount: 1, paymentMethod: "Unsupported", currency: null },
      });
      assert.equal(invalidField.status, 400);

      const nullField = await request("/api/transactions", {
        method: "POST",
        body: { type: "expense", amount: 1, currency: null },
      });
      assert.equal(nullField.status, 400);

      for (const amount of [3, 4]) {
        const withoutExternalId = await request("/api/transactions", {
          method: "POST",
          body: { type: "expense", amount, description: "No external id" },
        });
        assert.equal(withoutExternalId.status, 201);
      }
    });

    await t.test("composite deduplication distinguishes same-amount purchases and works across sources", async () => {
      const manualTransaction = {
        type: "expense",
        amount: 61,
        merchant: "Corner Cafe",
        description: "Coffee",
        transactionDate: "2026-10-02T09:30:00.000Z",
        transactionTime: "09:30",
        referenceId: `receipt-${suffix}`,
      };
      const created = await request("/api/transactions", { method: "POST", body: manualTransaction });
      assert.equal(created.status, 201);
      const createdTransaction = (await created.json()).data;

      const dateRange = await request("/api/transactions?fromDate=2026-10-02&toDate=2026-10-02&limit=100");
      assert.equal(dateRange.status, 200);
      assert.ok((await dateRange.json()).data.some((item) => item._id === createdTransaction._id));

      const repeatedByCsv = await request("/api/transactions/import", {
        method: "POST",
        body: { transactions: [{ ...manualTransaction, source: "CSV" }] },
      });
      assert.equal((await repeatedByCsv.json()).rejectedItems[0].reason, "duplicate");

      const sameAmountDifferentMerchant = await request("/api/transactions", {
        method: "POST",
        body: { ...manualTransaction, merchant: "Bookshop" },
      });
      assert.equal(sameAmountDifferentMerchant.status, 201);

      const sameMerchantDifferentTime = await request("/api/transactions", {
        method: "POST",
        body: { ...manualTransaction, transactionTime: "09:31", referenceId: `receipt-later-${suffix}` },
      });
      assert.equal(sameMerchantDifferentTime.status, 201);

      const repeatedByAndroid = await request("/api/mobile/transactions", {
        method: "POST",
        body: { transactions: [{ ...manualTransaction, source: "Android Notification" }] },
      });
      assert.equal((await repeatedByAndroid.json()).rejectedItems[0].reason, "duplicate");

      await Transaction.create({
        userId: primaryUser._id,
        type: "expense",
        amount: 73,
        merchant: "",
        description: "Legacy Corner Store",
        transactionDate: "2026-10-02T11:00:00.000Z",
        transactionTime: "11:00",
        referenceId: `legacy-receipt-${suffix}`,
      });
      const legacyRepeat = await request("/api/transactions", {
        method: "POST",
        body: {
          type: "expense",
          amount: 73,
          description: "Legacy Corner Store",
          transactionDate: "2026-10-02T11:00:00.000Z",
          transactionTime: "11:00",
          referenceId: `legacy-receipt-${suffix}`,
        },
      });
      assert.equal(legacyRepeat.status, 409);
    });

    await t.test("categorizes known merchants and preserves manual category choices", async () => {
      const examples = [
        ["Swiggy", "Food"], ["Zomato", "Food"],
        ["Blinkit", "Groceries"], ["Zepto", "Groceries"],
        ["Amazon", "Shopping"], ["Flipkart", "Shopping"],
        ["Uber", "Transport"], ["Ola", "Transport"],
        ["Netflix", "Entertainment"], ["Spotify", "Entertainment"],
        ["Electricity", "Bills"], ["Recharge", "Bills"], ["Rent", "Housing"],
      ];

      for (const [index, [merchant, category]] of examples.entries()) {
        const response = await request("/api/transactions", {
          method: "POST",
          body: {
            type: "expense",
            amount: index + 1,
            merchant,
            sourceTransactionId: `category-${suffix}-${index}`,
          },
        });
        assert.equal(response.status, 201, merchant);
        const result = await response.json();
        assert.equal(result.data.category, category, merchant);
        assert.equal(result.data.categorySource, "rule", merchant);
      }

      const manual = await request("/api/transactions", {
        method: "POST",
        body: {
          type: "expense",
          amount: 5,
          merchant: "Swiggy",
          category: "Meals with team",
          sourceTransactionId: `manual-category-${suffix}`,
        },
      });
      const manualResult = await manual.json();
      assert.equal(manualResult.data.categorySource, "user");

      const manualId = manualResult.data._id;
      const updated = await request(`/api/transactions/${manualId}`, {
        method: "PUT",
        body: { merchant: "Netflix", notes: "Keep my category" },
      });
      const updatedResult = await updated.json();
      assert.equal(updatedResult.data.category, "Meals with team");
      assert.equal(updatedResult.data.categorySource, "user");
    });

    await t.test("dashboard excludes failed and transfer records and reports refunds separately", async () => {
      const beforeResponse = await request("/api/dashboard");
      assert.equal(beforeResponse.status, 200);
      const before = (await beforeResponse.json()).data;
      assert.equal(typeof before.transactionCount, "number");
      assert.ok(Array.isArray(before.monthlyExpenseTrend));
      assert.ok(before.paymentMethodBreakdown);
      const records = [
        { type: "expense", amount: 41, category: "Test accounting", status: "completed" },
        { type: "expense", amount: 29, category: "Test accounting", status: "failed" },
        { type: "expense", amount: 19, category: "Test accounting", status: "refunded" },
        { type: "transfer", amount: 200, category: "Test accounting", status: "completed" },
      ];
      for (const [index, record] of records.entries()) {
        const response = await request("/api/transactions", {
          method: "POST",
          body: { ...record, sourceTransactionId: `accounting-${suffix}-${index}` },
        });
        assert.equal(response.status, 201);
      }

      const afterResponse = await request("/api/dashboard");
      assert.equal(afterResponse.status, 200);
      const after = (await afterResponse.json()).data;
      assert.equal(after.totalExpense - before.totalExpense, 60);
      assert.equal(after.totalRefunds - before.totalRefunds, 19);
      assert.equal(after.netExpense - before.netExpense, 41);
      assert.equal(after.balance - before.balance, -41);
      assert.equal(after.monthlyExpense - before.monthlyExpense, 60);
      assert.equal(after.monthlyRefunds - before.monthlyRefunds, 19);
      assert.equal(after.monthlyNetExpense - before.monthlyNetExpense, 41);
      assert.equal(after.todayExpense - before.todayExpense, 41);
      assert.equal(after.transactionCount - before.transactionCount, 4);
      assert.equal(after.paymentMethodBreakdown.Other - (before.paymentMethodBreakdown.Other || 0), 41);
    });

    await t.test("legacy manual expense and income routes use the intelligence service", async () => {
      const expenseResponse = await request("/api/expense/add", {
        method: "POST",
        body: {
          description: "Swiggy legacy order",
          amount: 13,
          category: "Food",
          date: "2026-10-02T12:00:00.000Z",
        },
      });
      assert.equal(expenseResponse.status, 200);
      const legacyExpense = await expenseModel.findOne({ userId: primaryUser._id, description: "Swiggy legacy order" }).sort({ createdAt: -1 });
      const expenseMirror = await Transaction.findOne({
        userId: primaryUser._id,
        sourceTransactionId: `manual-expense-${legacyExpense._id}`,
      }).select("+dedupeKey");
      assert.equal(expenseMirror.categorySource, "user");
      assert.ok(expenseMirror.dedupeKey);

      const updateExpenseResponse = await request(`/api/expense/update/${legacyExpense._id}`, {
        method: "PUT",
        body: { description: "Swiggy legacy order updated", amount: 14 },
      });
      assert.equal(updateExpenseResponse.status, 200);
      const updatedExpenseMirror = await Transaction.findById(expenseMirror._id);
      assert.equal(updatedExpenseMirror.amount, 14);
      assert.equal(updatedExpenseMirror.description, "Swiggy legacy order updated");

      const incomeResponse = await request("/api/income/add", {
        method: "POST",
        body: {
          description: "Monthly salary",
          amount: 100,
          category: "Salary",
          date: "2026-10-02T12:00:00.000Z",
        },
      });
      assert.equal(incomeResponse.status, 201);
      const legacyIncome = await incomeModel.findOne({ userId: primaryUser._id, description: "Monthly salary" }).sort({ createdAt: -1 });
      const incomeMirror = await Transaction.findOne({
        userId: primaryUser._id,
        sourceTransactionId: `manual-income-${legacyIncome._id}`,
      }).select("+dedupeKey");
      assert.equal(incomeMirror.categorySource, "user");
      assert.ok(incomeMirror.dedupeKey);
    });

    await t.test("list and get-by-id return only the authenticated user's data", async () => {
      const list = await request("/api/transactions?type=expense&page=1&limit=100");
      assert.equal(list.status, 200);
      const listResult = await list.json();
      assert.ok(listResult.data.some((item) => item._id === ownedId));
      assert.ok(listResult.data.every((item) => item.userId.toString() === primaryUser._id.toString()));

      const get = await request(`/api/transactions/${ownedId}`);
      assert.equal(get.status, 200);
      assert.equal((await get.json()).data._id, ownedId);

      const searched = await request(`/api/transactions?search=${encodeURIComponent(`api-test:${suffix}`)}&limit=100`);
      assert.equal(searched.status, 200);
      assert.ok((await searched.json()).data.some((item) => item._id === ownedId));

      const amountRange = await request("/api/transactions?minAmount=12&maxAmount=13&limit=100");
      assert.equal(amountRange.status, 200);
      assert.ok((await amountRange.json()).data.some((item) => item._id === ownedId));

      const foreign = await request(`/api/transactions/${otherId}`);
      assert.equal(foreign.status, 404);
    });

    await t.test("update is partial and cannot change transaction ownership", async () => {
      const response = await request(`/api/transactions/${ownedId}`, {
        method: "PUT",
        body: { amount: 15, userId: otherUser._id.toString() },
      });
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.data.amount, 15);
      assert.equal(result.data.description, "Lunch");
      assert.equal(result.data.userId.toString(), primaryUser._id.toString());

      const foreign = await request(`/api/transactions/${otherId}`, { method: "PUT", body: { amount: 1 } });
      assert.equal(foreign.status, 404);
      assert.equal((await Transaction.findById(otherId)).amount, 99);
    });

    await t.test("import reports created and rejected rows", async () => {
      const response = await request("/api/transactions/import", {
        method: "POST",
        body: {
          transactions: [
            { type: "income", amount: 50, description: "Imported", sourceTransactionId: `import:${suffix}` },
            { type: "income", amount: 50, description: "Repeat", sourceTransactionId: `import:${suffix}` },
            { type: "income", amount: 0 },
          ],
        },
      });
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.created, 1);
      assert.equal(result.rejected, 2);
      assert.equal(result.data[0].source, "CSV");
    });

    await t.test("mobile endpoint normalizes source and deduplicates safely", async () => {
      const body = {
        transactions: [{
          userId: otherUser._id.toString(),
          type: "expense",
          amount: 24,
          description: "Mobile purchase",
          sourceTransactionId: `mobile:${suffix}`,
        }],
      };
      const response = await request("/api/mobile/transactions", { method: "POST", body });
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.received, 1);
      assert.equal(result.data[0].source, "Android Notification");
      assert.equal(result.data[0].userId.toString(), primaryUser._id.toString());

      const duplicate = await request("/api/mobile/transactions", { method: "POST", body });
      assert.equal(duplicate.status, 200);
      assert.equal((await duplicate.json()).rejectedItems[0].reason, "duplicate");

      const sync = await request("/api/mobile/sync", {
        method: "POST",
        body: {
          deviceId: `device-${suffix}`,
          transactions: [{ type: "income", amount: 7, sourceTransactionId: `sync:${suffix}` }],
        },
      });
      assert.equal(sync.status, 200);
      assert.equal((await sync.json()).inserted, 1);
    });

    await t.test("single Android upload returns transaction and duplicate contract and registers device", async () => {
      const deviceId = `android-${suffix}`;
      const body = {
        userId: otherUser._id.toString(),
        amount: 500,
        merchant: "Swiggy",
        type: "expense",
        paymentMethod: "UPI",
        source: "Android Notification",
        sourceApplication: "PhonePe",
        sourceTransactionId: `android-notification:${suffix}`,
      };
      const headers = {
        "x-device-id": deviceId,
        "x-device-name": "Expense Tracker Android",
      };
      const response = await request("/api/mobile/transactions", { method: "POST", body, headers });
      assert.equal(response.status, 200);
      const created = await response.json();
      assert.deepEqual({ success: created.success, duplicate: created.duplicate }, { success: true, duplicate: false });
      assert.ok(created.transactionId);

      const record = await Transaction.findById(created.transactionId).lean();
      assert.equal(record.userId.toString(), primaryUser._id.toString());
      assert.equal(record.category, "Food");
      assert.equal(record.sourceApplication, "PhonePe");
      assert.equal(record.paymentMethod, "UPI");

      const duplicateResponse = await request("/api/mobile/transactions", { method: "POST", body, headers });
      assert.equal(duplicateResponse.status, 200);
      assert.deepEqual(await duplicateResponse.json(), {
        success: true,
        duplicate: true,
        transactionId: created.transactionId,
      });
      assert.equal(
        await Transaction.countDocuments({ userId: primaryUser._id, sourceTransactionId: body.sourceTransactionId }),
        1,
      );

      const dashboardTransactions = await request("/api/transactions?search=Swiggy&limit=100");
      const dashboardRows = (await dashboardTransactions.json()).data;
      const dashboardTransaction = dashboardRows.find((item) => item._id === created.transactionId);
      assert.equal(dashboardTransaction.merchant, "Swiggy");
      assert.equal(dashboardTransaction.category, "Food");
      assert.equal(dashboardTransaction.paymentMethod, "UPI");
      assert.equal(dashboardTransaction.amount, 500);

      const devicesResponse = await request("/api/mobile/devices");
      const devices = (await devicesResponse.json()).data;
      const device = devices.find((item) => item.deviceId === deviceId);
      assert.equal(device.deviceName, "Expense Tracker Android");
      assert.ok(device.lastSyncAt);
      assert.equal(device.userId.toString(), primaryUser._id.toString());
    });

    await t.test("delete is user-scoped", async () => {
      const deleted = await request(`/api/transactions/${ownedId}`, { method: "DELETE" });
      assert.equal(deleted.status, 200);
      assert.equal((await request(`/api/transactions/${ownedId}`)).status, 404);

      const foreign = await request(`/api/transactions/${otherId}`, { method: "DELETE" });
      assert.equal(foreign.status, 404);
      assert.ok(await Transaction.findById(otherId));
    });
  } finally {
    server.close();
    await once(server, "close");
    await Transaction.deleteMany({ userId: { $in: [primaryUser._id, otherUser._id] } });
    await Device.deleteMany({ userId: { $in: [primaryUser._id, otherUser._id] } });
    await expenseModel.deleteMany({ userId: { $in: [primaryUser._id, otherUser._id] } });
    await incomeModel.deleteMany({ userId: { $in: [primaryUser._id, otherUser._id] } });
    await User.deleteMany({ _id: { $in: [primaryUser._id, otherUser._id] } });
    await mongoose.disconnect();
  }
});