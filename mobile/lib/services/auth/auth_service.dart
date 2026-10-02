import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../models/auth_response.dart';
import '../../models/login_request.dart';
import '../../models/register_request.dart';
import '../../models/user.dart';
import '../api/api_client.dart';

class AuthService {
  AuthService({required ApiClient apiClient, required FlutterSecureStorage secureStorage})
      : _apiClient = apiClient,
        _secureStorage = secureStorage;

  static const String _tokenKey = 'expense_tracker.jwt';
  static const String _userKey = 'expense_tracker.user';
  final ApiClient _apiClient;
  final FlutterSecureStorage _secureStorage;

  Future<String?> savedToken() async {
    final token = await _secureStorage.read(key: _tokenKey);
    return token == null || token.isEmpty ? null : token;
  }

  Future<bool> get isAuthenticated async => await savedToken() != null;

  Future<AuthResponse> login(LoginRequest request) async {
    final response = AuthResponse.fromJson(await _apiClient.post('/user/login', data: request.toJson()));
    return _storeSession(response);
  }

  Future<AuthResponse> register(RegisterRequest request) async {
    final response = AuthResponse.fromJson(await _apiClient.post('/user/register', data: request.toJson()));
    return _storeSession(response);
  }

  Future<AuthResponse> _storeSession(AuthResponse response) async {
    final token = response.token;
    if (!response.success || token == null || token.isEmpty || response.user == null) {
      throw const ApiException('The server returned an invalid login response.');
    }
    await _secureStorage.write(key: _tokenKey, value: token);
    await _secureStorage.write(key: _userKey, value: jsonEncode(response.user!.toJson()));
    return response;
  }

  Future<User?> getCurrentUser() async {
    final response = await _apiClient.get('/user/me');
    final user = response['user'];
    if (response['success'] != true || user is! Map) {
      throw const ApiException('The server returned an invalid session response.');
    }
    return User.fromJson(Map<String, dynamic>.from(user));
  }

  Future<User?> restoreSession() async {
    if (!await isAuthenticated) return null;
    try {
      final user = await getCurrentUser();
      if (user != null) await _secureStorage.write(key: _userKey, value: jsonEncode(user.toJson()));
      return user;
    } on ApiException catch (error) {
      if (error.statusCode == 401) {
        await signOut();
        return null;
      }
      return _cachedUser();
    } catch (_) {
      return _cachedUser();
    }
  }

  Future<User?> _cachedUser() async {
    final encoded = await _secureStorage.read(key: _userKey);
    if (encoded == null) return null;
    try {
      final decoded = jsonDecode(encoded);
      return decoded is Map ? User.fromJson(Map<String, dynamic>.from(decoded)) : null;
    } on FormatException {
      return null;
    }
  }

  Future<void> signOut() async {
    await _secureStorage.delete(key: _tokenKey);
    await _secureStorage.delete(key: _userKey);
  }
}