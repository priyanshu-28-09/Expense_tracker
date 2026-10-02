const getStatus = (transaction) => transaction.status || "completed";

export const isGrossExpense = (transaction) => transaction.type === "expense" && ["completed", "refunded"].includes(getStatus(transaction));
export const isCompletedExpense = (transaction) => transaction.type === "expense" && getStatus(transaction) === "completed";
export const isCountedIncome = (transaction) => transaction.type === "income" && getStatus(transaction) === "completed";
export const isRefund = (transaction) => transaction.type === "expense" && getStatus(transaction) === "refunded";