const CATEGORY_RULES = [
  { category: "Food", merchants: ["swiggy", "zomato"] },
  { category: "Groceries", merchants: ["blinkit", "zepto"] },
  { category: "Shopping", merchants: ["amazon", "flipkart"] },
  { category: "Transport", merchants: ["uber", "ola"] },
  { category: "Entertainment", merchants: ["netflix", "spotify"] },
  { category: "Bills", merchants: ["electricity", "recharge"] },
  { category: "Housing", merchants: ["rent"] },
];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function categorizeByRules(transaction) {
  const searchableText = `${transaction.merchant || ""} ${transaction.description || ""}`.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.merchants.some((merchant) => new RegExp(`(^|[^a-z0-9])${escapeRegex(merchant)}([^a-z0-9]|$)`, "i").test(searchableText))) {
      return { category: rule.category, categorySource: "rule" };
    }
  }
  return null;
}

const categorizationProviders = [categorizeByRules];

export async function categorizeTransaction(transaction, { categoryProvided = false, providers = categorizationProviders } = {}) {
  if (categoryProvided) {
    return { category: transaction.category, categorySource: "user" };
  }

  for (const provider of providers) {
    const result = await provider(transaction);
    if (result?.category) return result;
  }

  return { category: "Uncategorized", categorySource: "default" };
}