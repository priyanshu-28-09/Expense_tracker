class ApiResponse<T> {
  const ApiResponse({required this.success, this.data, this.message});

  final bool success;
  final T? data;
  final String? message;

  factory ApiResponse.fromJson(Map<String, dynamic> json, T Function(dynamic value) parseData) => ApiResponse<T>(
        success: json['success'] == true,
        data: json.containsKey('data') ? parseData(json['data']) : null,
        message: json['message']?.toString(),
      );
}