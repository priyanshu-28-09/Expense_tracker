import '../../models/transaction.dart';
import '../api/api_client.dart';

class TransactionRepository {
  const TransactionRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<List<ExpenseTransaction>> list({int page = 1, int limit = 20}) async {
    final response = await _apiClient.get('/transactions', queryParameters: {'page': page, 'limit': limit});
    final items = response['data'];
    if (items is! List) return const [];
    return items.whereType<Map>().map((item) => ExpenseTransaction.fromJson(Map<String, dynamic>.from(item))).toList();
  }

  Future<ExpenseTransaction> create(ExpenseTransaction transaction) async {
    final response = await _apiClient.post('/transactions', data: transaction.toApiJson());
    final data = response['data'];
    if (response['success'] != true || data is! Map) {
      throw const ApiException('The transaction was not saved.');
    }
    return ExpenseTransaction.fromJson(Map<String, dynamic>.from(data));
  }

  Future<ExpenseTransaction> update(String id, Map<String, dynamic> changes) async {
    final response = await _apiClient.put('/transactions/$id', data: changes);
    final data = response['data'];
    if (response['success'] != true || data is! Map) {
      throw const ApiException('The transaction could not be updated.');
    }
    return ExpenseTransaction.fromJson(Map<String, dynamic>.from(data));
  }

  Future<void> delete(String id) async {
    final response = await _apiClient.delete('/transactions/$id');
    if (response['success'] != true) throw const ApiException('The transaction could not be deleted.');
  }

  Future<Map<String, dynamic>> import(List<ExpenseTransaction> transactions) => _apiClient.post(
        '/transactions/import',
        data: {'transactions': transactions.map((transaction) => transaction.toApiJson()).toList()},
      );
}