import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../models/transaction.dart';
import '../../providers/app_controller.dart';
import '../../widgets/app_button.dart';

class AddTransactionScreen extends StatefulWidget {
  const AddTransactionScreen({super.key});

  @override
  State<AddTransactionScreen> createState() => _AddTransactionScreenState();
}

class _AddTransactionScreenState extends State<AddTransactionScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amount = TextEditingController();
  final _merchant = TextEditingController();
  final _description = TextEditingController();
  final _category = TextEditingController(text: 'Uncategorized');
  final _notes = TextEditingController();
  String _type = 'expense';
  String _paymentMethod = 'UPI';
  DateTime _date = DateTime.now();
  bool _saving = false;

  static const _types = ['expense', 'income', 'transfer'];
  static const _paymentMethods = ['UPI', 'Bank Transfer', 'Cash', 'Card', 'Wallet', 'Other'];

  @override
  void dispose() {
    _amount.dispose();
    _merchant.dispose();
    _description.dispose();
    _category.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _saving = true);
    final merchant = _merchant.text.trim();
    final transaction = ExpenseTransaction(
      type: _type,
      amount: double.parse(_amount.text.trim()),
      merchant: merchant,
      description: _description.text.trim().isEmpty ? merchant : _description.text.trim(),
      category: _category.text.trim().isEmpty ? 'Uncategorized' : _category.text.trim(),
      paymentMethod: _paymentMethod,
      source: 'Manual',
      transactionDate: _date,
      transactionTime: DateFormat('HH:mm').format(_date),
      notes: _notes.text.trim(),
    );
    try {
      await context.read<AppController>().createTransaction(transaction);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Transaction saved.')));
      context.read<AppController>().setSelectedTab(0);
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => Form(
        key: _formKey,
        child: ListView(padding: const EdgeInsets.all(16), children: [
          Text('Record a transaction', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            value: _type,
            decoration: const InputDecoration(labelText: 'Transaction type'),
            items: _types.map((type) => DropdownMenuItem(value: type, child: Text(type[0].toUpperCase() + type.substring(1)))).toList(),
            onChanged: (value) => setState(() => _type = value ?? _type),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _amount,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(labelText: 'Amount', prefixText: '₹ '),
            validator: (value) {
              final amount = double.tryParse(value?.trim() ?? '');
              return amount == null || amount <= 0 ? 'Enter an amount greater than zero.' : null;
            },
          ),
          const SizedBox(height: 12),
          TextFormField(controller: _merchant, decoration: const InputDecoration(labelText: 'Merchant / payee')),
          const SizedBox(height: 12),
          TextFormField(controller: _description, decoration: const InputDecoration(labelText: 'Description')),
          const SizedBox(height: 12),
          TextFormField(controller: _category, decoration: const InputDecoration(labelText: 'Category')),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _paymentMethod,
            decoration: const InputDecoration(labelText: 'Payment method'),
            items: _paymentMethods.map((method) => DropdownMenuItem(value: method, child: Text(method))).toList(),
            onChanged: (value) => setState(() => _paymentMethod = value ?? _paymentMethod),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () async {
              final selected = await showDatePicker(context: context, initialDate: _date, firstDate: DateTime(2000), lastDate: DateTime.now());
              if (selected != null) setState(() => _date = DateTime(selected.year, selected.month, selected.day, _date.hour, _date.minute));
            },
            icon: const Icon(Icons.calendar_today_outlined),
            label: Text(DateFormat.yMMMd().format(_date)),
          ),
          const SizedBox(height: 12),
          TextFormField(controller: _notes, maxLines: 2, decoration: const InputDecoration(labelText: 'Notes (optional)')),
          const SizedBox(height: 18),
          AppButton(label: 'Save transaction', icon: Icons.check, onPressed: _save, loading: _saving),
        ]),
      );
}