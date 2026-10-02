import 'package:flutter/material.dart';

Future<void> explainNotificationAccess(BuildContext context, Future<void> Function() openSettings) async {
  final approved = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Why notification access is needed'),
      content: const Text(
        'Android only delivers payment alerts to the listener after you grant Notification Access in system settings. The existing Kotlin listener checks supported app notifications locally, extracts transaction fields, and discards the original text. Android exposes notifications broadly while this permission is on; grant it only if you are comfortable with that access. The app never opens or scrapes banking apps and never asks for banking credentials.',
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Not now')),
        FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Open Android settings')),
      ],
    ),
  );
  if (approved == true && context.mounted) await openSettings();
}