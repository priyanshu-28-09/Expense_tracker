class ExpenseTransaction {
  const ExpenseTransaction({
    this.id,
    required this.type,
    required this.amount,
    this.currency = 'INR',
    this.category = 'Uncategorized',
    this.subCategory = '',
    this.description = '',
    this.merchant = '',
    this.sender = '',
    this.receiver = '',
    this.paymentMethod = 'Other',
    this.source = 'Manual',
    this.sourceApplication = '',
    required this.transactionDate,
    this.transactionTime = '',
    this.transactionId = '',
    this.referenceId = '',
    this.sourceTransactionId,
    this.status = 'completed',
    this.notes = '',
    this.isRecurring = false,
    this.recurringFrequency = '',
    this.createdAt,
    this.updatedAt,
  });

  final String? id;
  final String type;
  final double amount;
  final String currency;
  final String category;
  final String subCategory;
  final String description;
  final String merchant;
  final String sender;
  final String receiver;
  final String paymentMethod;
  final String source;
  final String sourceApplication;
  final DateTime transactionDate;
  final String transactionTime;
  final String transactionId;
  final String referenceId;
  final String? sourceTransactionId;
  final String status;
  final String notes;
  final bool isRecurring;
  final String recurringFrequency;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  factory ExpenseTransaction.fromJson(Map<String, dynamic> json) {
    DateTime parseDate(dynamic value) {
      if (value is DateTime) return value;
      return DateTime.tryParse(value?.toString() ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0);
    }

    double parseAmount(dynamic value) => value is num ? value.toDouble() : double.tryParse('$value') ?? 0;
    String stringValue(String key, [String fallback = '']) => (json[key] ?? fallback).toString();

    return ExpenseTransaction(
      id: (json['_id'] ?? json['id'])?.toString(),
      type: stringValue('type', 'expense'),
      amount: parseAmount(json['amount']),
      currency: stringValue('currency', 'INR'),
      category: stringValue('category', 'Uncategorized'),
      subCategory: stringValue('subCategory'),
      description: stringValue('description'),
      merchant: stringValue('merchant'),
      sender: stringValue('sender'),
      receiver: stringValue('receiver'),
      paymentMethod: stringValue('paymentMethod', 'Other'),
      source: stringValue('source', 'Manual'),
      sourceApplication: stringValue('sourceApplication'),
      transactionDate: parseDate(json['transactionDate'] ?? json['date']),
      transactionTime: stringValue('transactionTime'),
      transactionId: stringValue('transactionId'),
      referenceId: stringValue('referenceId'),
      sourceTransactionId: json['sourceTransactionId']?.toString(),
      status: stringValue('status', 'completed'),
      notes: stringValue('notes'),
      isRecurring: json['isRecurring'] == true,
      recurringFrequency: stringValue('recurringFrequency'),
      createdAt: json['createdAt'] == null ? null : parseDate(json['createdAt']),
      updatedAt: json['updatedAt'] == null ? null : parseDate(json['updatedAt']),
    );
  }

  Map<String, dynamic> toApiJson() => {
        'type': type,
        'amount': amount,
        'currency': currency,
        if (category != 'Uncategorized') 'category': category,
        'subCategory': subCategory,
        'description': description,
        'merchant': merchant,
        'sender': sender,
        'receiver': receiver,
        'paymentMethod': paymentMethod,
        'source': source,
        'sourceApplication': sourceApplication,
        'transactionDate': transactionDate.toIso8601String(),
        'transactionTime': transactionTime,
        'transactionId': transactionId,
        'referenceId': referenceId,
        if (sourceTransactionId != null) 'sourceTransactionId': sourceTransactionId,
        'status': status,
        'notes': notes,
        'isRecurring': isRecurring,
        'recurringFrequency': recurringFrequency,
      };
}