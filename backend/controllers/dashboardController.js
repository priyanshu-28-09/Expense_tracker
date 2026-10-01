import incomeModel from "../models/incomeModel.js";
import expenseModel from "../models/expenseModel.js";
export async function getDeshboardOverview(req, res){
    const userId = req.user._id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    try {
        // monthly records (current month)
        const income = await incomeModel.find({
            userId,
            date : {$gte: startOfMonth, $lte: now},
        }).lean();

        const expenses = await expenseModel.find({
            userId,
            date: {$gte: startOfMonth, $lte: now},
        }).lean();

        // all-time totals
        const allIncomes = await incomeModel.find({ userId }).lean();
        const allExpenses = await expenseModel.find({ userId }).lean();

        

    const monthlyIncome = income.reduce((acc, cur) => acc + Number(cur.amount || 0), 0);

  const monthlyExpense = expenses.reduce((acc, cur) => acc + Number(cur.amount || 0), 0);

  const savings = monthlyIncome - monthlyExpense;

  const savingsRate = monthlyIncome === 0 ? 0 : Math.round((savings / monthlyIncome) * 100);

  const totalIncome = allIncomes.reduce((acc, cur) => acc + Number(cur.amount || 0), 0);
  const totalExpense = allExpenses.reduce((acc, cur) => acc + Number(cur.amount || 0), 0);
  const balance = totalIncome - totalExpense;

const recentTransactions = [
    ...income.map((i) => ({ ...i, type: "income" })),
    ...expenses.map((e) => ({ ...e, type: "expense" })),
].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);


    const spendByCategory = {};
    for (const exp of expenses) {
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
        // totals (all-time)
        totalIncome,
        totalExpense,
        balance,

        // monthly snapshot
        monthlyIncome,
        monthlyExpense,
        savings,
        savingsRate,

        recentTransactions,
        spendByCategory,
        expenseDistribution
    }
});
    } catch (err) {
        console.error("GetDashboardOverview Error:", err);
        return res.status(500).json({
            success: false,
            message: "dashboard Fetch failed"
        });
        
    }
}