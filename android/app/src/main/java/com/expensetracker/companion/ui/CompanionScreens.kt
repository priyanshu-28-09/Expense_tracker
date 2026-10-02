package com.expensetracker.companion.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Apps
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle

private val CompanionColorScheme = lightColorScheme(
    primary = Color(0xFF176B5B),
    onPrimary = Color.White,
    secondary = Color(0xFFB24C35),
    background = Color(0xFFF4F6F2),
    surface = Color.White,
    onSurface = Color(0xFF17231F),
    surfaceVariant = Color(0xFFE5ECE7),
)

private enum class Destination(val label: String) {
    Dashboard("Home"),
    NotificationAccess("Access"),
    SupportedApps("Apps"),
    SyncStatus("Sync"),
    Settings("Settings"),
}

@Composable
fun ExpenseCompanionApp(viewModel: MainViewModel) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var destination by rememberSaveable { mutableStateOf(Destination.Dashboard) }
    LaunchedEffect(state.isLoggedIn) {
        if (state.isLoggedIn) destination = Destination.Dashboard
    }

    MaterialTheme(colorScheme = CompanionColorScheme) {
        Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            if (!state.isLoggedIn) {
                LoginScreen(state, viewModel::login)
            } else {
                Scaffold(
                    containerColor = MaterialTheme.colorScheme.background,
                    bottomBar = {
                        NavigationBar {
                            Destination.entries.forEach { item ->
                                NavigationBarItem(
                                    selected = destination == item,
                                    onClick = { destination = item },
                                    icon = { Icon(item.icon(), contentDescription = item.label) },
                                    label = { Text(item.label) },
                                )
                            }
                        }
                    },
                ) { padding ->
                    Column(
                        Modifier
                            .fillMaxSize()
                            .padding(padding)
                            .verticalScroll(rememberScrollState())
                            .padding(horizontal = 20.dp, vertical = 18.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp),
                    ) {
                        Text("EXPENSE TRACKER", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                        Text(destination.title(), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                        when (destination) {
                            Destination.Dashboard -> DashboardScreen(state, viewModel::parseMockNotification) {
                                destination = Destination.NotificationAccess
                            }
                            Destination.NotificationAccess -> NotificationAccessScreen(
                                state.notificationAccessGranted,
                                viewModel::openNotificationAccessSettings,
                            )
                            Destination.SupportedApps -> SupportedAppsScreen()
                            Destination.SyncStatus -> SyncStatusScreen(state, viewModel::syncNow)
                            Destination.Settings -> SettingsScreen(state, viewModel::updateBackendUrl, viewModel::signOut)
                        }
                        if (state.message.isNotBlank()) {
                            Text(state.message, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun LoginScreen(state: CompanionUiState, onLogin: (String, String, String) -> Unit) {
    var backendUrl by rememberSaveable(state.backendUrl) { mutableStateOf(state.backendUrl) }
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 24.dp, vertical = 42.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Spacer(Modifier.height(30.dp))
        Text("EXPENSE TRACKER", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
        Text("Companion", style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Bold)
        Text("Connect your Expense Tracker account to sync transactions you choose to send.")
        OutlinedTextField(
            value = backendUrl,
            onValueChange = { backendUrl = it },
            label = { Text("Backend URL") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Expense Tracker email") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Expense Tracker password") },
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        Button(
            onClick = { onLogin(backendUrl, email, password); password = "" },
            enabled = !state.loading,
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (state.loading) CircularProgressIndicator() else Text("Connect account")
        }
        Text("Use only your Expense Tracker account here. This app never asks for UPI PINs, OTPs, bank passwords, card PINs, or CVVs.", style = MaterialTheme.typography.bodySmall)
        Text("HTTPS is required. Use a trusted TLS endpoint; do not enter production credentials into a mock server.", style = MaterialTheme.typography.bodySmall)
        if (state.message.isNotBlank()) Text(state.message, color = MaterialTheme.colorScheme.secondary)
    }
}

@Composable
private fun DashboardScreen(state: CompanionUiState, onParseMock: () -> Unit, onSetupAccess: () -> Unit) {
    Text("Transactions are parsed on this device, queued locally, and sent automatically when a network is available.")
    SummaryCard("Waiting to sync", "${state.queuedCount}", "Normalized transactions on this device")
    SummaryCard("Notification access", if (state.notificationAccessGranted) "On" else "Off", "You control this permission in Android settings")
    Button(onClick = onParseMock, modifier = Modifier.fillMaxWidth()) {
        Text("Parse mock payment notification")
    }
    OutlinedButton(onClick = onSetupAccess, modifier = Modifier.fillMaxWidth()) {
        Text("Set up notification access")
    }
    Text("Start with the mock example. It follows the same parser and normalizer used for OS notifications.", style = MaterialTheme.typography.bodySmall)
}

@Composable
private fun NotificationAccessScreen(granted: Boolean, onOpenSettings: () -> Unit) {
    SummaryCard("Permission", if (granted) "Granted" else "Not granted", "Android controls and can revoke this access")
    Text("Why this access is needed", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
    Text("Android provides payment alerts to this app through its notification-listener service. Without your approval in system settings, the service receives no notifications.")
    Text("What the app does", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
    Text("While enabled, Android may expose notification content to the listener. The app checks supported app package identifiers, parses matching text in memory, and stores only normalized transaction fields. Original notification text is discarded.")
    Text("What the app does not do", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
    Text("It does not open, scrape, or inspect banking app screens, and it never requests UPI PINs, OTPs, bank passwords, card PINs, or CVVs. Access can include notifications from other apps at the Android service level; do not grant it unless you are comfortable with that scope.")
    Button(onClick = onOpenSettings, modifier = Modifier.fillMaxWidth()) {
        Text(if (granted) "Review Android permission" else "Open Android Notification Access")
    }
}

@Composable
private fun SupportedAppsScreen() {
    Text("Recognition is best-effort and depends on notification wording, package ID, language, and app version. Unrecognized messages are ignored.")
    listOf(
        "PhonePe" to "Separate parser; sample format available",
        "Google Pay" to "Separate parser; format-dependent",
        "Paytm" to "Separate parser; format-dependent",
        "BHIM" to "Separate parser; format-dependent",
        "Bank applications" to "Limited package identifiers and shared patterns; not every bank is recognized",
    ).forEach { (name, detail) ->
        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(detail, style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
    Text("Parser formats should be tested with mock notifications before being enabled for real alerts.", style = MaterialTheme.typography.bodySmall)
}

@Composable
private fun SyncStatusScreen(state: CompanionUiState, onSync: () -> Unit) {
    SummaryCard("Last result", state.lastSyncMessage, state.lastSyncedAt ?: "No successful sync recorded")
    SummaryCard("Queued locally", "${state.queuedCount}", "Only normalized fields are queued")
    Button(onClick = onSync, enabled = !state.loading && state.queuedCount > 0, modifier = Modifier.fillMaxWidth()) {
        if (state.loading) CircularProgressIndicator() else Text("Sync now")
    }
    Text("Queued transactions retry through Android WorkManager when connectivity returns. Sync now adds an immediate retry. The authenticated MERN endpoint is configured in Settings.")
}

@Composable
private fun SettingsScreen(state: CompanionUiState, onSaveBackendUrl: (String) -> Unit, onSignOut: () -> Unit) {
    var backendUrl by rememberSaveable(state.backendUrl) { mutableStateOf(state.backendUrl) }
    Text("Backend connection", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
    OutlinedTextField(
        value = backendUrl,
        onValueChange = { backendUrl = it },
        label = { Text("API base URL") },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
    )
    OutlinedButton(onClick = { onSaveBackendUrl(backendUrl) }, modifier = Modifier.fillMaxWidth()) {
        Text("Save backend URL")
    }
    Text("The account token is encrypted with Android Keystore. HTTPS is required for every backend connection.")
    Text("Privacy", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
    Text("Only transaction fields produced by the local normalizer are sent. Notification text is not sent. Banking credentials are never requested.")
    TextButton(onClick = onSignOut) { Text("Sign out") }
}

@Composable
private fun SummaryCard(title: String, value: String, detail: String) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(title, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
            Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(detail, style = MaterialTheme.typography.bodySmall)
        }
    }
}

private fun Destination.icon() = when (this) {
    Destination.Dashboard -> Icons.Filled.Home
    Destination.NotificationAccess -> Icons.Filled.Notifications
    Destination.SupportedApps -> Icons.Filled.Apps
    Destination.SyncStatus -> Icons.Filled.Sync
    Destination.Settings -> Icons.Filled.Settings
}

private fun Destination.title() = when (this) {
    Destination.Dashboard -> "Dashboard"
    Destination.NotificationAccess -> "Notification access"
    Destination.SupportedApps -> "Supported apps"
    Destination.SyncStatus -> "Sync status"
    Destination.Settings -> "Settings"
}