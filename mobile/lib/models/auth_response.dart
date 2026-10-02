import 'user.dart';

class AuthResponse {
  const AuthResponse({required this.success, this.token, this.user, this.message});

  final bool success;
  final String? token;
  final User? user;
  final String? message;

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    final userJson = json['user'];
    return AuthResponse(
      success: json['success'] == true,
      token: json['token']?.toString(),
      user: userJson is Map ? User.fromJson(Map<String, dynamic>.from(userJson)) : null,
      message: json['message']?.toString(),
    );
  }
}