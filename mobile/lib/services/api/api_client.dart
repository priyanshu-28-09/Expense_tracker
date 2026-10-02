import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../core/constants/api_config.dart';

class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({required FlutterSecureStorage secureStorage})
      : _secureStorage = secureStorage,
        _dio = Dio(
          BaseOptions(
            baseUrl: ApiConfig.normalizedBaseUrl,
            connectTimeout: const Duration(seconds: 12),
            receiveTimeout: const Duration(seconds: 18),
            sendTimeout: const Duration(seconds: 18),
            followRedirects: false,
            validateStatus: (status) => status != null && status >= 200 && status < 300,
            headers: const {'Accept': 'application/json'},
          ),
        ) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _secureStorage.read(key: _tokenKey);
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          final path = error.requestOptions.path;
          final isAuthSubmission = path.endsWith('/user/login') || path.endsWith('/user/register');
          if (error.response?.statusCode == 401 && !isAuthSubmission) {
            try {
              await _secureStorage.delete(key: _tokenKey);
              await onUnauthorized?.call();
            } catch (_) {
              // Preserve the original unauthorized response for the request caller.
            }
          }
          handler.next(error);
        },
      ),
    );
  }

  static const String _tokenKey = 'expense_tracker.jwt';
  final FlutterSecureStorage _secureStorage;
  final Dio _dio;
  Future<void> Function()? onUnauthorized;

  Future<Map<String, dynamic>> get(String path, {Map<String, dynamic>? queryParameters}) async {
    try {
      return _asMap((await _dio.get<Object?>(_relativePath(path), queryParameters: queryParameters)).data);
    } on DioException catch (error) {
      throw _toApiException(error);
    }
  }

  Future<Map<String, dynamic>> post(String path, {Object? data}) async {
    try {
      return _asMap((await _dio.post<Object?>(_relativePath(path), data: data)).data);
    } on DioException catch (error) {
      throw _toApiException(error);
    }
  }

  Future<Map<String, dynamic>> put(String path, {Object? data}) async {
    try {
      return _asMap((await _dio.put<Object?>(_relativePath(path), data: data)).data);
    } on DioException catch (error) {
      throw _toApiException(error);
    }
  }

  Future<Map<String, dynamic>> delete(String path) async {
    try {
      return _asMap((await _dio.delete<Object?>(_relativePath(path))).data);
    } on DioException catch (error) {
      throw _toApiException(error);
    }
  }

  Map<String, dynamic> _asMap(Object? value) {
    if (value is Map) return Map<String, dynamic>.from(value);
    throw const ApiException('The server returned an unexpected response.');
  }

  String _relativePath(String path) => path.replaceFirst(RegExp(r'^/+'), '');

  ApiException _toApiException(DioException error) {
    final responseData = error.response?.data;
    final rawMessage = responseData is Map && responseData['message'] is String ? responseData['message'] as String : null;
    final responseMessage = rawMessage != null &&
            rawMessage.length <= 180 &&
            !rawMessage.contains('\n') &&
            !rawMessage.contains('\r') &&
            !rawMessage.contains(' at ') &&
            !rawMessage.contains('Error:')
        ? rawMessage
        : null;
    final statusCode = error.response?.statusCode;
    final path = error.requestOptions.path;
    final isLogin = path.endsWith('/user/login');
    final message = switch (statusCode) {
      400 => responseMessage ?? 'Check the information and try again.',
      401 => isLogin ? 'Email or password is incorrect.' : 'Your session expired. Please sign in again.',
      403 => 'You do not have permission to do that.',
      404 => 'The requested account information was not found.',
      409 => path.endsWith('/user/register') ? 'An account with this email already exists.' : 'This record conflicts with existing data.',
      500 => 'The server could not complete the request. Try again later.',
      _ when error.type == DioExceptionType.connectionTimeout ||
              error.type == DioExceptionType.sendTimeout ||
              error.type == DioExceptionType.receiveTimeout => 'The connection timed out. Check your internet and try again.',
      _ when error.type == DioExceptionType.connectionError => 'Could not reach the server. Check your internet connection.',
      _ when error.type == DioExceptionType.badCertificate => 'The server security certificate could not be verified.',
      _ => 'The request could not be completed. Try again.',
    };
    return ApiException(message, statusCode: statusCode);
  }
}