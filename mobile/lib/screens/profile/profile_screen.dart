import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../providers/app_controller.dart';
import '../../widgets/app_states.dart';
import '../../widgets/notification_access_dialog.dart';
import '../settings/settings_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<AppController>().refreshDevices();
    });
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<AppController>();
    final user = controller.user;
    return ListView(padding: const EdgeInsets.all(16), children: [
      Text('Your account', style: Theme.of(context).textTheme.titleMedium),
      const SizedBox(height: 10),
      Card(
        child: ListTile(
          leading: const CircleAvatar(child: Icon(Icons.person_outline)),
          title: Text(user?.name ?? 'Account'),
          subtitle: Text(user?.email ?? ''),
        ),
      ),
      const SizedBox(height: 16),
      Card(
        child: Column(children: [
          ListTile(
            leading: const Icon(Icons.notifications_outlined),
            title: const Text('Notification access'),
            subtitle: Text(controller.notificationAccessGranted ? 'Enabled' : 'Not enabled'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => explainNotificationAccess(context, controller.openNotificationSettings),
          ),
          const Divider(height: 1),
          ListTile(
            leading: const Icon(Icons.settings_outlined),
            title: const Text('Settings'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => const SettingsScreen())),
          ),
        ]),
      ),
      const SizedBox(height: 18),
      Row(children: [
        Expanded(child: Text('Registered devices', style: Theme.of(context).textTheme.titleSmall)),
        IconButton(onPressed: controller.refreshDevices, icon: const Icon(Icons.refresh), tooltip: 'Refresh devices'),
      ]),
      if (controller.devices.isEmpty)
        const EmptyState(title: 'No registered devices', message: 'Android devices appear after their first sync.', icon: Icons.devices_outlined)
      else
        ...controller.devices.map((device) => Card(
              child: ListTile(
                leading: const Icon(Icons.phone_android),
                title: Text(device.deviceName),
                subtitle: Text(device.lastSyncAt == null
                    ? device.platform
                    : 'Last sync ${DateFormat.yMMMd().add_jm().format(device.lastSyncAt!.toLocal())}'),
                trailing: IconButton(
                  tooltip: 'Disconnect device',
                  onPressed: () async {
                    try {
                      await controller.removeDevice(device.id);
                    } catch (error) {
                      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
                    }
                  },
                  icon: Icon(device.isActive ? Icons.link_off : Icons.pause_circle_outline),
                ),
              ),
            )),
      const SizedBox(height: 12),
      OutlinedButton.icon(
        onPressed: () async {
          await controller.signOut();
          if (context.mounted) Navigator.of(context).popUntil((route) => route.isFirst);
        },
        icon: const Icon(Icons.logout),
        label: const Text('Sign out'),
      ),
    ]);
  }
}