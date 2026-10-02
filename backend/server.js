import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import userRouter from './routes/userRoute.js';
import incomeRouter from './routes/incomeRoute.js';
import expenseRouter from './routes/expenseRoute.js';
import dashboardRouter from './routes/dashboardRoute.js';
import transactionRouter from './routes/transactionRoute.js';
import mobileRouter from './routes/mobileRoute.js';

const app = express();
const port = process.env.PORT || 4000;
const corsOrigins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

if (process.env.NODE_ENV === "production" && corsOrigins.length === 0) {
    throw new Error("CORS_ORIGIN must list the deployed frontend origin in production.");
}

// MIDDLEWARES
app.use(cors({ origin: corsOrigins.length ? corsOrigins : true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ROUTES
app.use("/api/user", userRouter);
app.use("/api/income", incomeRouter);
app.use("/api/expense",expenseRouter);
app.use("/api/transactions", transactionRouter);
app.use("/api/mobile", mobileRouter);
app.use("/api/dashboard", dashboardRouter);

app.get('/', (req, res) => {
    res.send("API WORKING");
});

const startServer = async () => {
    try {
        await connectDB();
        console.log("DB CONNECTED");

        app.listen(port, () => {
            console.log(`Server Started on http://localhost:${port}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error.message);
        process.exit(1);
    }
};

startServer();