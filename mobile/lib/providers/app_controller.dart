import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import '../core/constants/api_config.dart';
import '../models/dashboard_summary.dart';
import '../models/device.dart';
import '../models/auth_response.dart';
import '../models/login_request.dart';
import '../models/register_request.dart';
import '../models/transaction.dart';
import '../models/user.dart';
import '../services/api/api_client.dart';
import '../services/auth/auth_service.dart';
import '../services/notification/native_notification_service.dart';
import '../services/transaction/transaction_repository.dart';

enum AuthState { restoring, unauthenticated, authenticating, authenticated }

class AppController extends ChangeNotifier {
  AppController({
    required ApiClient apiClient,
    required AuthService authService,
    required TransactionRepository transactionRepository,
    required NativeNotificationService notificationService,
  })  : _apiClient = apiClient,
        _authService = authService,
        _transactionRepository = transactionRepository,
        _notificationService = notificationService {
    _apiClient.onUnauthorized = _handleUnauthorized;
  }

  final ApiClient _apiClient;
  final AuthService _authService;
  final TransactionRepository _transactionRepository;
  final NativeNotificationService _notificationService;

  User? user;
  DashboardSummary? summary;
  List<ExpenseTransaction> transactions = const [];
  List<Device> devices = const [];
  String? errorMessage;
  bool initializing = true;
  bool loading = false;
  AuthState authState = AuthState.restoring;
  bool notificationAccessGranted = false;
  int pendingNotificationCount = 0;
  String nativeSyncStatus = 'No notification sync yet.';
  int selectedTab = 0;

  bool get isAuthenticated => authState == AuthState.authenticated && user != null;

  Future<void> initialize() async {
    if (!ApiConfig.isConfigured) {
      errorMessage = 'Build with --dart-define=API_BASE_URL=https://your-api-host/api.';
      authState = AuthState.unauthenticated;
      initializing = false;
      notifyListeners();
      return;
    }
    try {
      user = await _authService.restoreSession();
      if (user != null) {
        authState = AuthState.authenticated;
        await _restoreNativeSession();
        await Future.wait([_refreshDashboard(), _refreshNativeState()]);
      } else {
        authState = AuthState.unauthenticated;
      }
    } on ApiException catch (error) {
      if (error.statusCode == 401) await _authService.signOut();
      errorMessage = error.message;
      authState = user == null ? AuthState.unauthenticated : AuthState.authenticated;
    } catch (_) {
      errorMessage = 'Could not restore your session. Please sign in again.';
      authState = user == null ? AuthState.unauthenticated : AuthState.authenticated;
    } finally {
      initializing = false;
      notifyListeners();
    }
  }

  Future<void> login(String email, String password) => _authenticate(
        () => _authService.login(LoginRequest(email: email, password: password)),
      );

  Future<void> register(String name, String email, String password) =>
      _authenticate(() => _authService.register(RegisterRequest(name: name, email: email, password: password)));

  Future<void> _authenticate(Future<AuthResponse> Function() authenticate) async {
    loading = true;
    authState = AuthState.authenticating;
    errorMessage = null;
    notifyListeners();
    try {
      final response = await authenticate();
      if (!response.success || response.user == null) throw const ApiException('Could not authenticate this account.');
      user = response.user;
      final token = await _authService.savedToken();
      if (token == null) throw const ApiException('The secure session could not be saved. Please sign in again.');
      await _notificationService.configureSession(
        apiBaseUrl: ApiConfig.nativeBackendOrigin,
        token: token,
        accountUserId: user!.id,
      );
      authState = AuthState.authenticated;
      notifyListeners();
      try {
        await Future.wait([_refreshDashboard(), _refreshNativeState()]);
      } on ApiException catch (error) {
        errorMessage = error.message;
      } catch (_) {
        errorMessage = 'Signed in, but account data could not be loaded.';
      }
      await _notificationService.enqueueSync();
    } on ApiException catch (error) {
      await _authService.signOut();
      errorMessage = error.message;
      user = null;
      authState = AuthState.unauthenticated;
    } on PlatformException catch (error) {
      await _authService.signOut();
      errorMessage = error.code == 'pending_account_mismatch'
          ? 'Pending notification transactions belong to a different account. Sign in to that account to sync them.'
          : 'Could not establish the secure Android session. Check the API connection and try again.';
      user = null;
      authState = AuthState.unauthenticated;
    } catch (_) {
      await _authService.signOut();
      errorMessage = 'Could not connect. Check the HTTPS API URL and try again.';
      user = null;
      authState = AuthState.unauthenticated;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> _restoreNativeSession() async {
    final token = await _authService.savedToken();
    final currentUser = user;
    if (token == null || currentUser == null) return;
    await _notificationService.configureSession(
      apiBaseUrl: ApiConfig.nativeBackendOrigin,
      token: token,
      accountUserId: currentUser.id,
    );
    await _notificationService.enqueueSync();
  }

  Future<void> _handleUnauthorized() async {
    await _authService.signOut();
    try {
      await _notificationService.clearSession();
    } catch (_) {
      // Flutter auth is still cleared if the native bridge is unavailable.
    }
    user = null;
    summary = null;
    transactions = const [];
    devices = const [];
    authState = AuthState.unauthenticated;
    errorMessage = 'Your session expired. Please sign in again.';
    notifyListeners();
  }

  Future<void> refresh() async {
    if (!isAuthenticated) return;
    loading = true;
    errorMessage = null;
    notifyListeners();
    try {
      await Future.wait([_refreshDashboard(), _refreshNativeState()]);
    } on ApiException catch (error) {
      errorMessage = error.message;
    } catch (_) {
      errorMessage = 'Could not refresh account data.';
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> _refreshDashboard() async {
    final results = await Future.wait<Object>([
      _apiClient.get('/dashboard'),
      _transactionRepository.list(),
    ]);
    final dashboardResponse = results.first as Map<String, dynamic>;
    final dashboard = dashboardResponse['data'];
    summary = dashboard is Map ? DashboardSummary.fromJson(Map<String, dynamic>.from(dashboard)) : const DashboardSummary();
    transactions = results[1] as List<ExpenseTransaction>;
  }

  Future<void> _refreshNativeState() async {
    final values = await Future.wait([
      _notificationService.accessGranted,
      _notificationService.pendingCount,
      _notificationService.syncStatus,
    ]);
    notificationAccessGranted = values[0] as bool;
    pendingNotificationCount = values[1] as int;
    nativeSyncStatus = values[2] as String;
  }

  Future<void> createTransaction(ExpenseTransaction transaction) async {
    await _transactionRepository.create(transaction);
    await _refreshDashboard();
    notifyListeners();
  }

  Future<void> deleteTransaction(String id) async {
    await _transactionRepository.delete(id);
    await _refreshDashboard();
    notifyListeners();
  }

  Future<void> importTransactions(List<ExpenseTransaction> items) async {
    await _transactionRepository.import(items);
    await _refreshDashboard();
    notifyListeners();
  }

  Future<void> refreshDevices() async {
    try {
      final response = await _apiClient.get('/mobile/devices');
      final data = response['data'];
      devices = data is List
          ? data.whereType<Map>().map((item) => Device.fromJson(Map<String, dynamic>.from(item))).toList()
          : const [];
    } on ApiException catch (error) {
      errorMessage = error.message;
    } catch (_) {
      errorMessage = 'Could not load registered devices.';
    } finally {
      notifyListeners();
    }
  }

  Future<void> removeDevice(String id) async {
    final response = await _apiClient.delete('/mobile/devices/$id');
    if (response['success'] != true) throw const ApiException('Could not disconnect this device.');
    await refreshDevices();
  }

  Future<void> openNotificationSettings() async {
    await _notificationService.openAccessSettings();
    await _refreshNativeState();
    notifyListeners();
  }

  Future<Map<String, dynamic>> queueMockNotification() async {
    final result = await _notificationService.queueMockNotification();
    if (result == null) throw const ApiException('Mock notifications are only available on Android.');
    await _refreshNativeState();
    notifyListeners();
    return result;
  }

  Future<void> syncPending() async {
    await _notificationService.enqueueSync();
    await _refreshNativeState();
    notifyListeners();
  }

  Future<void> signOut() async {
    await _authService.signOut();
    await _notificationService.clearSession();
    user = null;
    summary = null;
    transactions = const [];
    devices = const [];
    errorMessage = null;
    authState = AuthState.unauthenticated;
    notifyListeners();
  }

  void setSelectedTab(int index) {
    selectedTab = index;
    errorMessage = null;
    notifyListeners();
  }
}