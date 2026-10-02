class Category {
  const Category({required this.name, required this.amount});

  final String name;
  final double amount;

  factory Category.fromEntry(String name, dynamic amount) => Category(
        name: name,
        amount: amount is num ? amount.toDouble() : double.tryParse('$amount') ?? 0,
      );
}