import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../providers/app_controller.dart';
import '../../widgets/app_states.dart';
import '../../widgets/notification_access_dialog.dart';
import '../../widgets/summary_card.dart';
import '../../widgets/transaction_card.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  String _money(num value) => NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0).format(value);

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<AppController>();
    final summary = controller.summary;
    if (summary == null && controller.loading) return const LoadingView(label: 'Loading dashboard');
    if (summary == null && controller.errorMessage != null) {
      return ErrorPanel(message: controller.errorMessage!, onRetry: controller.refresh);
    }

    return RefreshIndicator(
      onRefresh: controller.refresh,
      child: ListView(padding: const EdgeInsets.fromLTRB(16, 12, 16, 24), children: [
        Row(children: [
          Expanded(child: Text('Your overview', style: Theme.of(context).textTheme.titleMedium)),
          IconButton(onPressed: controller.refresh, tooltip: 'Refresh', icon: const Icon(Icons.refresh)),
        ]),
        if (controller.errorMessage != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(controller.errorMessage!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ),
        if (summary == null)
          const EmptyState(title: 'No summary yet', message: 'Pull down to try loading your account again.')
        else ...[
          SummaryCard(label: 'Balance', value: _money(summary.balance), icon: Icons.account_balance_wallet_outlined),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(child: SummaryCard(label: 'Income', value: _money(summary.totalIncome), icon: Icons.south_west)),
            const SizedBox(width: 10),
            Expanded(child: SummaryCard(label: 'Net expenses', value: _money(summary.netExpense), icon: Icons.north_east)),
          ]),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(child: SummaryCard(label: 'Today', value: _money(summary.todayExpense))),
            const SizedBox(width: 10),
            Expanded(child: SummaryCard(label: 'Transactions', value: '${summary.transactionCount}')),
          ]),
          const SizedBox(height: 18),
          Card(
            child: ListTile(
              leading: Icon(controller.notificationAccessGranted ? Icons.notifications_active : Icons.notifications_off_outlined),
              title: Text(controller.notificationAccessGranted ? 'Notification access enabled' : 'Set up payment notifications'),
              subtitle: Text('${controller.pendingNotificationCount} pending · ${controller.nativeSyncStatus}'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => explainNotificationAccess(context, controller.openNotificationSettings),
            ),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: () async {
              try {
                final result = await controller.queueMockNotification();
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('${result['type']} · ${result['merchant']} · ${result['paymentMethod']} · ₹${result['amount']}')),
                  );
                }
              } catch (error) {
                if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
              }
            },
            icon: const Icon(Icons.science_outlined),
            label: const Text('Simulate PhonePe payment'),
          ),
          const SizedBox(height: 20),
          Text('Recent transactions', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          if (controller.transactions.isEmpty)
            const EmptyState(title: 'No transactions yet', message: 'Add a transaction or connect notification access.', icon: Icons.receipt_long_outlined)
          else
            ...controller.transactions.take(5).map((transaction) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: TransactionCard(transaction: transaction),
                )),
        ],
      ]),
    );
  }
}