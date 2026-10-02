import incomeModel from "../models/incomeModel.js";
import expenseModel from "../models/expenseModel.js";
import Transaction from "../models/transactionModel.js";
import { isCompletedExpense, isCountedIncome, isGrossExpense, isRefund } from "../services/transactionAccounting.js";

export async function getDeshboardOverview(req, res) {
    const userId = req.user._id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    try {
        const unifiedTransactions = await Transaction.find({ userId }).lean();

        let incomes = [];
        let expenses = [];
        let refunds = [];
        let allIncomes = [];
        let allExpenses = [];
        let allRefunds = [];
        let transactionCount = 0;

        if (unifiedTransactions.length > 0) {
            const currentMonthTransactions = unifiedTransactions.filter((item) => {
                const date = new Date(item.transactionDate || item.createdAt);
                return date >= startOfMonth && date <= now;
            });
            incomes = currentMonthTransactions.filter(isCountedIncome);
            expenses = currentMonthTransactions.filter(isGrossExpense);
            refunds = currentMonthTransactions.filter(isRefund);
            allIncomes = unifiedTransactions.filter(isCountedIncome);
            allExpenses = unifiedTransactions.filter(isGrossExpense);
            allRefunds = unifiedTransactions.filter(isRefund);
            transactionCount = unifiedTransactions.length;
        } else {
            incomes = await incomeModel.find({ userId, date: { $gte: startOfMonth, $lte: now } }).lean();
            expenses = await expenseModel.find({ userId, date: { $gte: startOfMonth, $lte: now } }).lean();
            allIncomes = await incomeModel.find({ userId }).lean();
            allExpenses = await expenseModel.find({ userId }).lean();
            transactionCount = allIncomes.length + allExpenses.length;
        }

        const monthlyIncome = incomes.reduce((acc, cur) => acc + Number(cur.amount || 0), 0);
        const monthlyExpense = expenses.reduce((acc, cur) => acc + Number(cur.amount || 0), 0);
        const monthlyRefunds = refunds.reduce((acc, cur) => acc + Number(cur.amount || 0), 0);

        const monthlyNetExpense = monthlyExpense - monthlyRefunds;
        const savings = monthlyIncome - monthlyNetExpense;
        const savingsRate = monthlyIncome === 0 ? 0 : Math.round((savings / monthlyIncome) * 100);

        const totalIncome = allIncomes.reduce((acc, cur) => acc + Number(cur.amount || 0), 0);
        const totalExpense = allExpenses.reduce((acc, cur) => acc + Number(cur.amount || 0), 0);
        const totalRefunds = allRefunds.reduce((acc, cur) => acc + Number(cur.amount || 0), 0);
        const netExpense = totalExpense - totalRefunds;
        const balance = totalIncome - netExpense;

        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayExpense = unifiedTransactions.length > 0
            ? unifiedTransactions.filter((item) => {
                const date = new Date(item.transactionDate || item.createdAt);
                return isCompletedExpense(item) && date >= startOfDay && date <= now;
            }).reduce((acc, item) => acc + Number(item.amount || 0), 0)
            : allExpenses.filter((item) => new Date(item.date) >= startOfDay && new Date(item.date) <= now)
                .reduce((acc, item) => acc + Number(item.amount || 0), 0);

        const analyticsTransactions = unifiedTransactions.length > 0
            ? unifiedTransactions
            : [...allIncomes.map((item) => ({ ...item.toObject?.() || item, type: "income", transactionDate: item.date })),
                ...allExpenses.map((item) => ({ ...item.toObject?.() || item, type: "expense", transactionDate: item.date }))];

        const monthlyExpenseTrend = Array.from({ length: 6 }, (_, index) => {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
            const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
            const amount = analyticsTransactions.filter((item) => {
                const date = new Date(item.transactionDate || item.date || item.createdAt);
                return isCompletedExpense(item) && date >= monthStart && date < nextMonth;
            }).reduce((sum, item) => sum + Number(item.amount || 0), 0);
            return {
                month: monthStart.toLocaleDateString("en", { month: "short" }),
                amount,
            };
        });

        const paymentMethodBreakdown = {};
        for (const expense of expenses.filter((item) => item.status !== "refunded")) {
            const method = expense.paymentMethod || "Other";
            paymentMethodBreakdown[method] = (paymentMethodBreakdown[method] || 0) + Number(expense.amount || 0);
        }

        const recentTransactions = [
            ...incomes.map((i) => ({ ...i, type: "income", date: i.transactionDate || i.date || i.createdAt })),
            ...expenses.filter((expense) => expense.status !== "refunded").map((e) => ({ ...e, type: "expense", date: e.transactionDate || e.date || e.createdAt })),
            ...refunds.map((refund) => ({ ...refund, type: "refund", date: refund.transactionDate || refund.createdAt })),
        ].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)).slice(0, 10);

        const spendByCategory = {};
        for (const exp of expenses.filter(isCompletedExpense)) {
            const cat = exp.category || "Other";
            spendByCategory[cat] = (spendByCategory[cat] || 0) + Number(exp.amount || 0);
        }

        const expenseDistribution = Object.entries(spendByCategory).map(([category, amount]) => ({
            category,
            amount,
            percent: monthlyExpense === 0 ? 0 : Math.round((amount / monthlyExpense) * 100),
        }));

        return res.status(200).json({
            success: true,
            data: {
                totalIncome,
                totalExpense,
                totalRefunds,
                netExpense,
                balance,
                monthlyIncome,
                monthlyExpense,
                monthlyRefunds,
                monthlyNetExpense,
                todayExpense,
                transactionCount,
                savings,
                savingsRate,
                monthlyExpenseTrend,
                recentTransactions,
                spendByCategory,
                expenseDistribution,
                paymentMethodBreakdown,
            },
        });
    } catch (err) {
        console.error("GetDashboardOverview Error:", err);
        return res.status(500).json({
            success: false,
            message: "dashboard Fetch failed",
        });
    }
}