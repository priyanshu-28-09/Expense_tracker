import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/transaction.dart';

class TransactionCard extends StatelessWidget {
  const TransactionCard({super.key, required this.transaction, this.onDelete});

  final ExpenseTransaction transaction;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    final isCredit = transaction.type == 'income' || transaction.status == 'refunded';
    final amountColor = transaction.status == 'failed'
        ? Colors.grey
        : isCredit
            ? Colors.green.shade800
            : Theme.of(context).colorScheme.onSurface;
    final merchant = transaction.merchant.isEmpty ? transaction.description : transaction.merchant;
    final formattedAmount = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0).format(transaction.amount);

    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(children: [
          CircleAvatar(
            backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
            child: Icon(isCredit ? Icons.south_west : Icons.north_east, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(merchant.isEmpty ? 'Transaction' : merchant, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 3),
              Text('${transaction.category} · ${transaction.paymentMethod}', maxLines: 1, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.bodySmall),
              const SizedBox(height: 3),
              Text(DateFormat('d MMM, h:mm a').format(transaction.transactionDate), style: Theme.of(context).textTheme.labelSmall),
              if (transaction.status != 'completed')
                Text('${transaction.type} · ${transaction.status}', style: Theme.of(context).textTheme.labelSmall),
            ]),
          ),
          const SizedBox(width: 8),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text('${isCredit ? '+' : '−'}$formattedAmount', style: TextStyle(color: amountColor, fontWeight: FontWeight.w700)),
            if (onDelete != null)
              IconButton(onPressed: onDelete, icon: const Icon(Icons.delete_outline), tooltip: 'Delete transaction', visualDensity: VisualDensity.compact),
          ]),
        ]),
      ),
    );
  }
}