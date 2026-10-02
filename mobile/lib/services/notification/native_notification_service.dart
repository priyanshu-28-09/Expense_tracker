import 'dart:io';

import 'package:flutter/services.dart';

class NativeNotificationService {
  static const MethodChannel _channel = MethodChannel('com.expensetracker.mobile/notifications');

  Future<bool> get accessGranted async {
    if (!Platform.isAndroid) return false;
    return await _invoke<bool>('accessGranted') ?? false;
  }

  Future<int> get pendingCount async {
    if (!Platform.isAndroid) return 0;
    return await _invoke<int>('pendingCount') ?? 0;
  }

  Future<String> get syncStatus async {
    if (!Platform.isAndroid) return 'Notification sync is Android-only.';
    return await _invoke<String>('syncStatus') ?? 'Notification sync status unavailable.';
  }

  Future<void> openAccessSettings() async {
    if (Platform.isAndroid) await _invoke<void>('openAccessSettings');
  }

  Future<void> configureSession({required String apiBaseUrl, required String token, required String accountUserId}) async {
    if (Platform.isAndroid) {
      await _invoke<void>('configureSession', {
        'apiBaseUrl': apiBaseUrl,
        'token': token,
        'accountUserId': accountUserId,
      });
    }
  }

  Future<void> clearSession() async {
    if (Platform.isAndroid) await _invoke<void>('clearSession');
  }

  Future<void> enqueueSync() async {
    if (Platform.isAndroid) await _invoke<void>('enqueueSync');
  }

  Future<Map<String, dynamic>?> queueMockNotification() async {
    if (!Platform.isAndroid) return null;
    final result = await _invoke<Map<Object?, Object?>>('queueMockNotification');
    return result == null ? null : Map<String, dynamic>.from(result);
  }

  Future<T?> _invoke<T>(String method, [Object? arguments]) async {
    try {
      return await _channel.invokeMethod<T>(method, arguments);
    } on MissingPluginException {
      return null;
    }
  }
}