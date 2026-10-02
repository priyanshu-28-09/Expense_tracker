class ApiConfig {
  ApiConfig._();

  static const String baseUrl = String.fromEnvironment('API_BASE_URL');
  static Uri? get _uri => Uri.tryParse(baseUrl.trim());
  static bool get isConfigured {
    final uri = _uri;
    return uri != null &&
        uri.scheme == 'https' &&
        uri.host.isNotEmpty &&
        uri.userInfo.isEmpty &&
        !uri.hasQuery &&
        !uri.hasFragment &&
        RegExp(r'/api/?$').hasMatch(uri.path);
  }

  static String get normalizedBaseUrl {
    final value = (_uri?.toString() ?? '').replaceFirst(RegExp(r'/+$'), '');
    return value.isEmpty ? '' : '$value/';
  }

  static String get nativeBackendOrigin => normalizedBaseUrl.replaceFirst(RegExp(r'/api/$'), '');
}