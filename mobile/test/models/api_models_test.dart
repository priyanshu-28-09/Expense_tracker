import 'package:expense_tracker_mobile/models/api_response.dart';
import 'package:expense_tracker_mobile/models/auth_response.dart';
import 'package:expense_tracker_mobile/models/dashboard_summary.dart';
import 'package:expense_tracker_mobile/models/device.dart';
import 'package:expense_tracker_mobile/models/login_request.dart';
import 'package:expense_tracker_mobile/models/register_request.dart';
import 'package:expense_tracker_mobile/models/transaction.dart';
import 'package:expense_tracker_mobile/models/user.dart';
import 'package:expense_tracker_mobile/core/utils/auth_validators.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('authentication models', () {
    test('auth field validators reject empty fields, malformed emails, and mismatched passwords', () {
      expect(AuthValidators.name('  '), isNotNull);
      expect(AuthValidators.email('not-an-email'), isNotNull);
      expect(AuthValidators.email('person@example.test'), isNull);
      expect(AuthValidators.password('short'), isNotNull);
      expect(AuthValidators.password('eight-or-more'), isNull);
      expect(AuthValidators.confirmPassword('different', 'password123'), isNotNull);
      expect(AuthValidators.confirmPassword('password123', 'password123'), isNull);
    });

    test('login and registration match existing Express request bodies', () {
      expect(const LoginRequest(email: 'user@example.test', password: 'long-test-password').toJson(), {
        'email': 'user@example.test',
        'password': 'long-test-password',
      });
      expect(const RegisterRequest(name: 'Test User', email: 'user@example.test', password: 'long-test-password').toJson(), {
        'name': 'Test User',
        'email': 'user@example.test',
        'password': 'long-test-password',
      });
    });

    test('adapts auto-login registration response with id and JWT', () {
      final response = AuthResponse.fromJson({
        'success': true,
        'token': 'mock.jwt.token',
        'user': {'id': 'user-id', 'name': 'Test User', 'email': 'user@example.test'},
      });

      expect(response.success, isTrue);
      expect(response.token, 'mock.jwt.token');
      expect(response.user?.id, 'user-id');
      expect(response.user?.email, 'user@example.test');
    });
  });

  group('backend response adapters', () {
    test('maps Mongo transaction fields and emits API-compatible JSON', () {
      final transaction = ExpenseTransaction.fromJson({
        '_id': 'mongo-transaction-id',
        'type': 'expense',
        'amount': 500,
        'currency': 'INR',
        'category': 'Food',
        'merchant': 'Swiggy',
        'paymentMethod': 'UPI',
        'source': 'Android Notification',
        'sourceApplication': 'PhonePe',
        'transactionDate': '2026-10-02T09:30:00.000Z',
        'transactionTime': '09:30',
        'sourceTransactionId': 'android:mock-1',
        'status': 'completed',
        'isRecurring': false,
        'createdAt': '2026-10-02T09:30:01.000Z',
        'updatedAt': '2026-10-02T09:30:01.000Z',
      });

      expect(transaction.id, 'mongo-transaction-id');
      expect(transaction.amount, 500);
      expect(transaction.merchant, 'Swiggy');
      expect(transaction.toApiJson()['sourceTransactionId'], 'android:mock-1');
      expect(transaction.toApiJson().containsKey('userId'), isFalse);
    });

    test('maps user id returned by login and me endpoints', () {
      final user = User.fromJson({'id': 'user-1', 'name': 'A User', 'email': 'a@example.test'});
      expect(user.id, 'user-1');
      expect(user.email, 'a@example.test');
    });

    test('unwraps dashboard shape and adapts category and recent transactions', () {
      final summary = DashboardSummary.fromJson({
        'balance': 750,
        'transactionCount': 2,
        'spendByCategory': {'Food': 500},
        'monthlyExpenseTrend': [
          {'month': 'Oct', 'amount': 500},
        ],
        'recentTransactions': [
          {'_id': 'transaction-1', 'type': 'expense', 'amount': 500, 'transactionDate': '2026-10-02T09:30:00Z'},
        ],
      });

      expect(summary.balance, 750);
      expect(summary.spendByCategory.single.name, 'Food');
      expect(summary.monthlyExpenseTrend['Oct'], 500);
      expect(summary.recentTransactions.single.id, 'transaction-1');
    });

    test('maps device last-sync metadata', () {
      final device = Device.fromJson({
        '_id': 'device-record-id',
        'deviceId': 'android-id',
        'deviceName': 'Expense Tracker Android',
        'platform': 'Android',
        'userId': 'user-1',
        'lastSyncAt': '2026-10-02T09:30:00.000Z',
      });

      expect(device.id, 'device-record-id');
      expect(device.lastSyncAt, isNotNull);
    });

    test('keeps API success/message envelope independent of data representation', () {
      final response = ApiResponse<String>.fromJson(
        {'success': true, 'data': 'created', 'message': 'Transaction created.'},
        (data) => data.toString(),
      );
      expect(response.success, isTrue);
      expect(response.data, 'created');
      expect(response.message, 'Transaction created.');
    });
  });
}