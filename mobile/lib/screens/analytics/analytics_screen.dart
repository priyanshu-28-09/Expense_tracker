import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../providers/app_controller.dart';
import '../../widgets/app_states.dart';
import '../../widgets/summary_card.dart';

class AnalyticsScreen extends StatelessWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final summary = context.watch<AppController>().summary;
    if (summary == null) return const EmptyState(title: 'Analytics unavailable', message: 'Refresh the dashboard to load account analytics.');
    final trend = summary.monthlyExpenseTrend.entries.toList();
    final categories = [...summary.spendByCategory]..sort((a, b) => b.amount.compareTo(a.amount));
    final maxExpense = trend.map((entry) => entry.value).fold<double>(0, (a, b) => a > b ? a : b);
    final chartMaxY = maxExpense > 0 ? maxExpense * 1.15 : 1.0;

    return ListView(padding: const EdgeInsets.all(16), children: [
      Text('Cash flow and spending', style: Theme.of(context).textTheme.titleMedium),
      const SizedBox(height: 12),
      Row(children: [
        Expanded(child: SummaryCard(label: 'Monthly income', value: _format(summary.monthlyIncome))),
        const SizedBox(width: 10),
        Expanded(child: SummaryCard(label: 'Monthly expense', value: _format(summary.monthlyNetExpense))),
      ]),
      const SizedBox(height: 18),
      Text('Expense trend', style: Theme.of(context).textTheme.titleSmall),
      const SizedBox(height: 8),
      Card(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(8, 20, 16, 12),
          child: SizedBox(
            height: 230,
            child: trend.isEmpty
                ? const Center(child: Text('No monthly data yet.'))
                : BarChart(
                    BarChartData(
                      alignment: BarChartAlignment.spaceAround,
                      maxY: chartMaxY,
                      borderData: FlBorderData(show: false),
                      gridData: const FlGridData(show: true, drawVerticalLine: false),
                      barTouchData: BarTouchData(enabled: false),
                      titlesData: FlTitlesData(
                        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        leftTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            reservedSize: 44,
                            getTitlesWidget: (value, meta) => SideTitleWidget(
                              axisSide: meta.axisSide,
                              child: Text(NumberFormat.compact().format(value), style: Theme.of(context).textTheme.labelSmall),
                            ),
                          ),
                        ),
                        bottomTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            getTitlesWidget: (value, meta) {
                              final index = value.toInt();
                              return SideTitleWidget(
                                axisSide: meta.axisSide,
                                child: Text(index >= 0 && index < trend.length ? trend[index].key : '', style: Theme.of(context).textTheme.labelSmall),
                              );
                            },
                          ),
                        ),
                      ),
                      barGroups: [
                        for (var index = 0; index < trend.length; index++)
                          BarChartGroupData(
                            x: index,
                            barRods: [
                              BarChartRodData(
                                toY: trend[index].value,
                                width: 18,
                                color: Theme.of(context).colorScheme.primary,
                                borderRadius: BorderRadius.circular(4),
                              ),
                            ],
                          ),
                      ],
                    ),
                  ),
          ),
        ),
      ),
      const SizedBox(height: 18),
      Text('Spending by category', style: Theme.of(context).textTheme.titleSmall),
      const SizedBox(height: 8),
      if (categories.isEmpty)
        const EmptyState(title: 'No category totals', message: 'Completed expenses will be grouped here.')
      else
        ...categories.map((category) => Card(
              child: ListTile(
                title: Text(category.name),
                trailing: Text(_format(category.amount), style: const TextStyle(fontWeight: FontWeight.w600)),
              ),
            )),
    ]);
  }

  String _format(num amount) => NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0).format(amount);
}