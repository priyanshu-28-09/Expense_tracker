import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/api_config.dart';
import '../../core/utils/auth_validators.dart';
import '../../providers/app_controller.dart';
import '../../widgets/app_button.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirmPassword = TextEditingController();
  bool _passwordVisible = false;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    _confirmPassword.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final controller = context.read<AppController>();
    await controller.register(_name.text.trim(), _email.text.trim(), _password.text);
    if (context.mounted && controller.isAuthenticated) {
      Navigator.of(context).popUntil((route) => route.isFirst);
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<AppController>();
    return Scaffold(
      appBar: AppBar(title: const Text('Create account')),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Form(
                key: _formKey,
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  Text('Create your Expense Tracker account', style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 20),
                  if (!ApiConfig.isConfigured)
                    const Card(child: Padding(padding: EdgeInsets.all(14), child: Text('Configure an HTTPS API_BASE_URL ending in /api.'))),
                  TextFormField(
                    controller: _name,
                    textCapitalization: TextCapitalization.words,
                    autofillHints: const [AutofillHints.name],
                    decoration: const InputDecoration(labelText: 'Name'),
                    validator: AuthValidators.name,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    autofillHints: const [AutofillHints.email],
                    decoration: const InputDecoration(labelText: 'Email'),
                    validator: AuthValidators.email,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _password,
                    obscureText: !_passwordVisible,
                    autofillHints: const [AutofillHints.newPassword],
                    decoration: InputDecoration(
                      labelText: 'Password',
                      suffixIcon: IconButton(
                        tooltip: _passwordVisible ? 'Hide password' : 'Show password',
                        onPressed: () => setState(() => _passwordVisible = !_passwordVisible),
                        icon: Icon(_passwordVisible ? Icons.visibility_off_outlined : Icons.visibility_outlined),
                      ),
                    ),
                    validator: AuthValidators.password,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _confirmPassword,
                    obscureText: !_passwordVisible,
                    decoration: const InputDecoration(labelText: 'Confirm password'),
                    validator: (value) => AuthValidators.confirmPassword(value, _password.text),
                    onFieldSubmitted: (_) => _submit(),
                  ),
                  if (controller.errorMessage != null) ...[
                    const SizedBox(height: 12),
                    Text(controller.errorMessage!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                  ],
                  const SizedBox(height: 18),
                  AppButton(
                    label: 'Create account',
                    icon: Icons.person_add_alt_1,
                    loading: controller.loading,
                    onPressed: controller.loading || !ApiConfig.isConfigured ? null : _submit,
                  ),
                  const SizedBox(height: 10),
                  Text('Registration uses your Expense Tracker account only. Banking credentials are never requested.', textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodySmall),
                ]),
              ),
            ),
          ),
        ),
      ),
    );
  }
}