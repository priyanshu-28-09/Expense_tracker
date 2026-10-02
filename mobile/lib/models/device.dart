class Device {
  const Device({
    required this.id,
    required this.deviceId,
    required this.deviceName,
    required this.platform,
    required this.userId,
    this.lastSyncAt,
    this.isActive = true,
  });

  final String id;
  final String deviceId;
  final String deviceName;
  final String platform;
  final String userId;
  final DateTime? lastSyncAt;
  final bool isActive;

  factory Device.fromJson(Map<String, dynamic> json) => Device(
        id: (json['_id'] ?? json['id'] ?? '').toString(),
        deviceId: (json['deviceId'] ?? '').toString(),
        deviceName: (json['deviceName'] ?? 'Android Device').toString(),
        platform: (json['platform'] ?? 'Android').toString(),
        userId: (json['userId'] ?? '').toString(),
        lastSyncAt: DateTime.tryParse(json['lastSyncAt']?.toString() ?? ''),
        isActive: json['isActive'] != false,
      );
}