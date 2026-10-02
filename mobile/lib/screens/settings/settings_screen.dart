import 'package:flutter/material.dart';

import '../../core/constants/api_config.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Settings')),
        body: ListView(padding: const EdgeInsets.all(16), children: [
          Text('Connection', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              leading: const Icon(Icons.lock_outline),
              title: const Text('Secure API connection'),
              subtitle: Text(ApiConfig.isConfigured ? ApiConfig.normalizedBaseUrl : 'API_BASE_URL is not configured'),
            ),
          ),
          const SizedBox(height: 16),
          Text('Privacy', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('The account token is stored using platform secure storage. Notification text is processed by the Android listener and is not uploaded by this Flutter app.'),
            ),
          ),
          const SizedBox(height: 12),
          Text('Build the app with a different --dart-define=API_BASE_URL value to switch development and production endpoints.'),
        ]),
      );
}