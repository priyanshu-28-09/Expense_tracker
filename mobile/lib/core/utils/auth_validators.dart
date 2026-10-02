class AuthValidators {
  AuthValidators._();

  static String? name(String? value) => value == null || value.trim().isEmpty ? 'Enter your name.' : null;

  static String? email(String? value) {
    final normalized = value?.trim() ?? '';
    return RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(normalized) ? null : 'Enter a valid email.';
  }

  static String? password(String? value) => value == null || value.length < 8 ? 'Use at least 8 characters.' : null;

  static String? confirmPassword(String? value, String password) => value != password ? 'Passwords do not match.' : null;
}