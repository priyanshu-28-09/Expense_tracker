import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/app_controller.dart';
import '../../widgets/app_states.dart';
import '../../widgets/transaction_card.dart';

class TransactionsScreen extends StatelessWidget {
  const TransactionsScreen({super.key});

  Future<void> _confirmDelete(BuildContext context, String id) async {
    final approved = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete transaction?'),
        content: const Text('This action cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete')),
        ],
      ),
    );
    if (approved == true && context.mounted) {
      try {
        await context.read<AppController>().deleteTransaction(id);
      } catch (error) {
        if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<AppController>();
    return RefreshIndicator(
      onRefresh: controller.refresh,
      child: ListView(padding: const EdgeInsets.fromLTRB(16, 16, 16, 24), children: [
        Text('Account activity', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        if (controller.errorMessage != null && controller.transactions.isEmpty)
          SizedBox(height: 300, child: ErrorPanel(message: controller.errorMessage!, onRetry: controller.refresh))
        else if (controller.transactions.isEmpty && controller.loading)
          const Padding(padding: EdgeInsets.all(36), child: Center(child: CircularProgressIndicator()))
        else if (controller.transactions.isEmpty)
          const EmptyState(title: 'No transactions found', message: 'Your transactions will appear here.', icon: Icons.receipt_long_outlined)
        else ...controller.transactions.map((transaction) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: TransactionCard(
                transaction: transaction,
                onDelete: transaction.id == null ? null : () => _confirmDelete(context, transaction.id!),
              ),
            )),
      ]),
    );
  }
}