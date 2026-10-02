import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:provider/provider.dart';

import 'expense_tracker_app.dart';
import 'providers/app_controller.dart';
import 'services/api/api_client.dart';
import 'services/auth/auth_service.dart';
import 'services/notification/native_notification_service.dart';
import 'services/transaction/transaction_repository.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  const secureStorage = FlutterSecureStorage();
  final apiClient = ApiClient(secureStorage: secureStorage);
  runApp(
    ChangeNotifierProvider(
      create: (_) => AppController(
        apiClient: apiClient,
        authService: AuthService(apiClient: apiClient, secureStorage: secureStorage),
        transactionRepository: TransactionRepository(apiClient),
        notificationService: NativeNotificationService(),
      )..initialize(),
      child: const ExpenseTrackerApp(),
    ),
  );
}