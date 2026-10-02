import 'category.dart';
import 'transaction.dart';

class DashboardSummary {
  const DashboardSummary({
    this.totalIncome = 0,
    this.totalExpense = 0,
    this.totalRefunds = 0,
    this.netExpense = 0,
    this.balance = 0,
    this.monthlyIncome = 0,
    this.monthlyExpense = 0,
    this.monthlyNetExpense = 0,
    this.todayExpense = 0,
    this.transactionCount = 0,
    this.savingsRate = 0,
    this.spendByCategory = const [],
    this.monthlyExpenseTrend = const {},
    this.recentTransactions = const [],
  });

  final double totalIncome;
  final double totalExpense;
  final double totalRefunds;
  final double netExpense;
  final double balance;
  final double monthlyIncome;
  final double monthlyExpense;
  final double monthlyNetExpense;
  final double todayExpense;
  final int transactionCount;
  final double savingsRate;
  final List<Category> spendByCategory;
  final Map<String, double> monthlyExpenseTrend;
  final List<ExpenseTransaction> recentTransactions;

  factory DashboardSummary.fromJson(Map<String, dynamic> json) {
    double number(String key) => json[key] is num ? (json[key] as num).toDouble() : double.tryParse('${json[key]}') ?? 0;
    final categories = json['spendByCategory'];
    final trend = json['monthlyExpenseTrend'];
    final recent = json['recentTransactions'];

    return DashboardSummary(
      totalIncome: number('totalIncome'),
      totalExpense: number('totalExpense'),
      totalRefunds: number('totalRefunds'),
      netExpense: number('netExpense'),
      balance: number('balance'),
      monthlyIncome: number('monthlyIncome'),
      monthlyExpense: number('monthlyExpense'),
      monthlyNetExpense: number('monthlyNetExpense'),
      todayExpense: number('todayExpense'),
      transactionCount: json['transactionCount'] is num ? (json['transactionCount'] as num).toInt() : 0,
      savingsRate: number('savingsRate'),
      spendByCategory: categories is Map
          ? categories.entries.map((entry) => Category.fromEntry(entry.key.toString(), entry.value)).toList()
          : const [],
      monthlyExpenseTrend: trend is List
          ? {
              for (final item in trend.whereType<Map>())
                (item['month'] ?? '').toString():
                    item['amount'] is num ? (item['amount'] as num).toDouble() : double.tryParse('${item['amount']}') ?? 0,
            }
          : const {},
      recentTransactions: recent is List
          ? recent.whereType<Map>().map((item) => ExpenseTransaction.fromJson(Map<String, dynamic>.from(item))).toList()
          : const [],
    );
  }
}