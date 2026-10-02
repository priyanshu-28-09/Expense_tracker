import mongoose from "mongoose";

export const ensureTransactionIndexes = async () => {
   const { default: Transaction } = await import("../models/transactionModel.js");
   let indexes = [];

   try {
      indexes = await Transaction.collection.indexes();
   } catch (err) {
      if (err.codeName !== "NamespaceNotFound") throw err;
   }

   const expectedPartialIndexes = [
      { name: "user_source_transaction_unique", field: "sourceTransactionId" },
      { name: "user_transaction_dedupe_unique", field: "dedupeKey" },
   ];
   for (const { name, field } of expectedPartialIndexes) {
      const existing = indexes.find((index) => index.name === name);
      if (existing && existing.partialFilterExpression?.[field]?.$type !== "string") {
         await Transaction.collection.dropIndex(name);
      }
   }

   await Transaction.createIndexes();
};

export const connectDB = async () => {
   const mongoUri = process.env.MONGO_URI;
   if (!mongoUri) {
      throw new Error('MONGO_URI must be configured in the environment.');
   }

   try {
      await mongoose.connect(mongoUri);
      await ensureTransactionIndexes();
      console.log('DB CONNECTED');
   } catch (err) {
      console.error('MongoDB connection error:', err.message || err);
      throw err;
   }
};