import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/theme/app_theme.dart';
import 'providers/app_controller.dart';
import 'screens/auth/login_screen.dart';
import 'screens/navigation/app_shell.dart';
import 'widgets/app_states.dart';

class ExpenseTrackerApp extends StatelessWidget {
  const ExpenseTrackerApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'Expense Tracker',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light,
        home: Consumer<AppController>(
          builder: (context, controller, _) {
            if (controller.initializing) return const LoadingView(label: 'Loading your account');
            if (!controller.isAuthenticated) return const LoginScreen();
            return const AppShell();
          },
        ),
      );
}