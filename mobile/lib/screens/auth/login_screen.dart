import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/api_config.dart';
import '../../core/utils/auth_validators.dart';
import '../../providers/app_controller.dart';
import '../../widgets/app_button.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _passwordVisible = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final controller = context.read<AppController>();
    await controller.login(_email.text.trim(), _password.text);
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<AppController>();
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Form(
                key: _formKey,
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  Icon(Icons.account_balance_wallet, size: 42, color: Theme.of(context).colorScheme.primary),
                  const SizedBox(height: 18),
                  Text('Expense Tracker', textAlign: TextAlign.center, style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  const Text('Sign in to your account', textAlign: TextAlign.center),
                  const SizedBox(height: 28),
                  if (!ApiConfig.isConfigured)
                    const Card(
                      child: Padding(
                        padding: EdgeInsets.all(14),
                        child: Text('Set API_BASE_URL at build time. Use an HTTPS API origin ending in /api.'),
                      ),
                    ),
                  TextFormField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    autofillHints: const [AutofillHints.username, AutofillHints.email],
                    decoration: const InputDecoration(labelText: 'Email'),
                    validator: AuthValidators.email,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _password,
                    obscureText: !_passwordVisible,
                    autofillHints: const [AutofillHints.password],
                    decoration: InputDecoration(
                      labelText: 'Password',
                      suffixIcon: IconButton(
                        tooltip: _passwordVisible ? 'Hide password' : 'Show password',
                        onPressed: () => setState(() => _passwordVisible = !_passwordVisible),
                        icon: Icon(_passwordVisible ? Icons.visibility_off_outlined : Icons.visibility_outlined),
                      ),
                    ),
                    validator: AuthValidators.password,
                    onFieldSubmitted: (_) => _submit(),
                  ),
                  if (controller.errorMessage != null) ...[
                    const SizedBox(height: 12),
                    Text(controller.errorMessage!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                  ],
                  const SizedBox(height: 18),
                  AppButton(
                    label: 'Sign in',
                    icon: Icons.lock_open_outlined,
                    loading: controller.loading,
                    onPressed: controller.loading || !ApiConfig.isConfigured ? null : _submit,
                  ),
                  TextButton(
                    onPressed: controller.loading
                        ? null
                        : () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => const RegisterScreen())),
                    child: const Text('Create an account'),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Use only your Expense Tracker credentials. Never enter a bank password, UPI PIN, OTP, card PIN, or CVV.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ]),
              ),
            ),
          ),
        ),
      ),
    );
  }
}