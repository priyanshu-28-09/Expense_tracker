import mongoose from "mongoose";

export const connectDB = async () => {
   const mongoUri = process.env.MONGO_URI || "mongodb+srv://priyanshuvishwakarma3133_db_user:Nw4MJBir88X6SwCS@cluster0.xqb5bsx.mongodb.net/Expense";
   if (!mongoUri) {
      throw new Error('MONGO_URI not set in environment');
   }

   try {
      await mongoose.connect(mongoUri);
      console.log('DB CONNECTED');
   } catch (err) {
      console.error('MongoDB connection error:', err.message || err);
      throw err;
   }
};