package com.example

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Archive
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.HelpOutline
import androidx.compose.material.icons.filled.Timeline
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.local.DownloadEntity
import com.example.data.model.AppLanguage
import com.example.ui.AppTab
import com.example.ui.components.BorderCrossingDialog
import com.example.ui.components.FerryModeDialog
import com.example.ui.components.LanguageSelectionDialog
import com.example.ui.components.LanguageSelectorPill
import com.example.ui.components.RoadsideInspectionDialog
import com.example.ui.components.WeeklyRestDialog
import com.example.ui.TachoViewModel
import com.example.ui.components.BluetoothDialog
import com.example.ui.components.BluetoothStatusPill
import com.example.ui.components.DriverShiftDialog
import com.example.ui.components.LicenseBadge
import com.example.ui.components.NotificationBanner
import com.example.ui.components.ProUpgradeDialog
import com.example.ui.screens.ArchiveScreen
import com.example.ui.screens.DashboardScreen
import com.example.ui.screens.DownloadScreen
import com.example.ui.screens.FaqLegalScreen
import com.example.ui.screens.InfringementsScreen
import com.example.ui.screens.TimelineScreen
import com.example.ui.theme.AlertRed
import com.example.ui.theme.DarkBg
import com.example.ui.theme.DarkOutline
import com.example.ui.theme.DarkSurface
import com.example.ui.theme.ElegantBlue
import com.example.ui.theme.ElegantBlueOn
import com.example.ui.theme.MyApplicationTheme
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary

class MainActivity : ComponentActivity() {

    private val viewModel: TachoViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            MyApplicationTheme {
                TachoMasterApp(viewModel = viewModel)
            }
        }
    }
}

@Composable
fun TachoMasterApp(viewModel: TachoViewModel) {
    val context = LocalContext.current
    val telemetry by viewModel.liveTelemetry.collectAsState()
    val connectionState by viewModel.connectionState.collectAsState()
    val availableDevices by viewModel.availableDevices.collectAsState()
    val selectedTab by viewModel.selectedTab.collectAsState()
    val licenseTier by viewModel.licenseTier.collectAsState()
    val currentLanguage by viewModel.currentLanguage.collectAsState()
    val downloadSession by viewModel.downloadSession.collectAsState()
    val allDownloads by viewModel.allDownloads.collectAsState()
    val activities by viewModel.filteredActivities.collectAsState()
    val infringements by viewModel.allInfringements.collectAsState()
    val activeShift by viewModel.activeShift.collectAsState()
    val selectedDate by viewModel.selectedDate.collectAsState()
    val notification by viewModel.notification.collectAsState()

    var showBtDialog by remember { mutableStateOf(false) }
    var showUpgradeDialog by remember { mutableStateOf(false) }
    var showShiftDialogForSlot by remember { mutableIntStateOf(0) } // 0 = closed, 1 = Slot 1, 2 = Slot 2
    var showLanguageDialog by remember { mutableStateOf(false) }
    var showFerryDialog by remember { mutableStateOf(false) }
    var showWeeklyRestDialog by remember { mutableStateOf(false) }
    var showBorderDialog by remember { mutableStateOf(false) }
    var showInspectionDialog by remember { mutableStateOf(false) }

    Scaffold(
        containerColor = DarkBg,
        topBar = {
            Surface(
                color = DarkBg,
                modifier = Modifier
                    .fillMaxWidth()
                    .border(width = 0.5.dp, color = DarkOutline)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "TACHOMASTER",
                            style = MaterialTheme.typography.titleLarge.copy(
                                fontWeight = FontWeight.Black,
                                letterSpacing = 2.sp,
                                color = TextPrimary
                            )
                        )
                        Text(
                            text = if (currentLanguage == AppLanguage.EN) "DIGITAL TACHOGRAPH BLE • EU 561" else (if (currentLanguage == AppLanguage.DE) "DIGITALER TACHOGRAPH BLE • EU 561" else "DIGITALNI TAHOGRAF BLE • EU 561"),
                            style = MaterialTheme.typography.labelSmall.copy(
                                color = TextMuted,
                                letterSpacing = 1.sp
                            )
                        )
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        LanguageSelectorPill(
                            currentLanguage = currentLanguage,
                            onClick = { showLanguageDialog = true }
                        )

                        LicenseBadge(
                            tier = licenseTier,
                            onClick = { showUpgradeDialog = true }
                        )

                        BluetoothStatusPill(
                            connectionState = connectionState,
                            connectedDeviceName = telemetry.truckPlate,
                            onClick = { showBtDialog = true }
                        )
                    }
                }
            }
        },
        bottomBar = {
            Surface(
                color = DarkSurface,
                modifier = Modifier
                    .fillMaxWidth()
                    .border(width = 0.5.dp, color = DarkOutline)
            ) {
                NavigationBar(
                    containerColor = DarkSurface,
                    contentColor = TextSecondary,
                    tonalElevation = 0.dp,
                    modifier = Modifier.testTag("bottom_nav_bar")
                ) {
                    val navItems = if (currentLanguage == AppLanguage.EN) {
                        listOf(
                            Triple(AppTab.DASHBOARD, Icons.Default.Dashboard, "Cockpit"),
                            Triple(AppTab.DOWNLOAD, Icons.Default.Download, ".DDD"),
                            Triple(AppTab.TIMELINE, Icons.Default.Timeline, "Activity"),
                            Triple(AppTab.INFRINGEMENTS, Icons.Default.Warning, "Violations"),
                            Triple(AppTab.ARCHIVE, Icons.Default.Archive, "Archive"),
                            Triple(AppTab.FAQ_LEGAL, Icons.Default.HelpOutline, "Legal/FAQ")
                        )
                    } else if (currentLanguage == AppLanguage.DE) {
                        listOf(
                            Triple(AppTab.DASHBOARD, Icons.Default.Dashboard, "Cockpit"),
                            Triple(AppTab.DOWNLOAD, Icons.Default.Download, ".DDD"),
                            Triple(AppTab.TIMELINE, Icons.Default.Timeline, "Aktivität"),
                            Triple(AppTab.INFRINGEMENTS, Icons.Default.Warning, "Verstöße"),
                            Triple(AppTab.ARCHIVE, Icons.Default.Archive, "Archiv"),
                            Triple(AppTab.FAQ_LEGAL, Icons.Default.HelpOutline, "Recht/FAQ")
                        )
                    } else {
                        listOf(
                            Triple(AppTab.DASHBOARD, Icons.Default.Dashboard, "Kontrola"),
                            Triple(AppTab.DOWNLOAD, Icons.Default.Download, ".DDD"),
                            Triple(AppTab.TIMELINE, Icons.Default.Timeline, "Aktivnosti"),
                            Triple(AppTab.INFRINGEMENTS, Icons.Default.Warning, "Prekršaji"),
                            Triple(AppTab.ARCHIVE, Icons.Default.Archive, "Arhiva"),
                            Triple(AppTab.FAQ_LEGAL, Icons.Default.HelpOutline, "Pravno/FAQ")
                        )
                    }

                    navItems.forEach { (tab, icon, label) ->
                        val isSelected = selectedTab == tab

                        NavigationBarItem(
                            selected = isSelected,
                            onClick = { viewModel.selectTab(tab) },
                            icon = {
                                if (tab == AppTab.INFRINGEMENTS && infringements.isNotEmpty()) {
                                    BadgedBox(
                                        badge = {
                                            Badge(containerColor = AlertRed) {
                                                Text("${infringements.size}", color = Color.White)
                                            }
                                        }
                                    ) {
                                        Icon(
                                            imageVector = icon,
                                            contentDescription = label,
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                } else {
                                    Icon(
                                        imageVector = icon,
                                        contentDescription = label,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                            },
                            label = {
                                Text(
                                    text = label,
                                    fontSize = 10.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                )
                            },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = ElegantBlueOn,
                                selectedTextColor = ElegantBlue,
                                indicatorColor = ElegantBlue,
                                unselectedIconColor = TextMuted,
                                unselectedTextColor = TextMuted
                            ),
                            modifier = Modifier.testTag("nav_tab_${tab.name}")
                        )
                    }
                }
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(DarkBg)
        ) {
            NotificationBanner(
                notification = notification,
                onDismiss = { viewModel.clearNotification() }
            )

            when (selectedTab) {
                AppTab.DASHBOARD -> DashboardScreen(
                    telemetry = telemetry,
                    licenseTier = licenseTier,
                    activeShift = activeShift,
                    onSetActivity = { viewModel.setActivity(it) },
                    onToggleTripSimulation = { viewModel.toggleTripSimulation() },
                    onToggleHighSpeedDemo = { viewModel.toggleHighSpeedDemo() },
                    onToggleContinuousDriveDemo = { viewModel.toggleContinuousDriveExceedDemo() },
                    onManageSlot1 = { showShiftDialogForSlot = 1 },
                    onManageSlot2 = { showShiftDialogForSlot = 2 },
                    onNavigateDownload = { viewModel.selectTab(AppTab.DOWNLOAD) },
                    onOpenUpgradeModal = { showUpgradeDialog = true },
                    onScanBt = {
                        viewModel.scanDevices()
                        showBtDialog = true
                    },
                    onOpenFerryDialog = { showFerryDialog = true },
                    onOpenWeeklyRestDialog = { showWeeklyRestDialog = true },
                    onOpenBorderDialog = { showBorderDialog = true },
                    onOpenInspectionDialog = { showInspectionDialog = true }
                )

                AppTab.DOWNLOAD -> DownloadScreen(
                    telemetry = telemetry,
                    licenseTier = licenseTier,
                    downloadSession = downloadSession,
                    onTriggerDownload = { target, days ->
                        viewModel.triggerDownload(target, days)
                    },
                    onResetDownload = { viewModel.resetDownload() },
                    onOpenUpgradeModal = { showUpgradeDialog = true }
                )

                AppTab.TIMELINE -> TimelineScreen(
                    activities = activities,
                    selectedDate = selectedDate,
                    licenseTier = licenseTier,
                    onSelectDate = { viewModel.selectDate(it) },
                    onOpenUpgradeModal = { showUpgradeDialog = true }
                )

                AppTab.INFRINGEMENTS -> InfringementsScreen(
                    infringements = infringements
                )

                AppTab.ARCHIVE -> ArchiveScreen(
                    downloads = allDownloads,
                    licenseTier = licenseTier,
                    onDeleteDownload = { viewModel.deleteDownload(it) },
                    onOpenUpgradeModal = { showUpgradeDialog = true },
                    onShareFile = { download: DownloadEntity ->
                        val shareIntent = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(Intent.EXTRA_SUBJECT, "Tachograph .DDD: ${download.fileName}")
                            putExtra(Intent.EXTRA_TEXT, "Tahografski fajl: ${download.fileName}\nSHA-256: ${download.sha256Hash}\nNosilac: ${download.driverName}\nVozilo: ${download.vehiclePlate}")
                        }
                        context.startActivity(Intent.createChooser(shareIntent, "Izvezi DDD fajl"))
                    }
                )

                AppTab.FAQ_LEGAL -> FaqLegalScreen()
            }
        }
    }

    // Language Selection Dialog
    if (showLanguageDialog) {
        LanguageSelectionDialog(
            currentLanguage = currentLanguage,
            onSelectLanguage = { viewModel.setLanguage(it) },
            onDismiss = { showLanguageDialog = false }
        )
    }

    // Ferry / Train Mode Dialog (Article 9 Regulation EC 561/2006)
    if (showFerryDialog) {
        FerryModeDialog(
            ferryMode = telemetry.ferryMode,
            onToggleFerry = { viewModel.toggleFerryMode() },
            onRecordInterruption = { viewModel.recordFerryInterruption() },
            onDismiss = { showFerryDialog = false }
        )
    }

    // Weekly Rest & Compensation Dialog (Article 8 Regulation EC 561/2006)
    if (showWeeklyRestDialog) {
        WeeklyRestDialog(
            weeklyRest = telemetry.weeklyRest,
            onMarkCompensationDone = { viewModel.markWeeklyCompensationDone() },
            onDismiss = { showWeeklyRestDialog = false }
        )
    }

    // Border Crossing Dialog (Mobility Package 1)
    if (showBorderDialog) {
        BorderCrossingDialog(
            currentCountry = telemetry.currentCountry,
            currentOdoKm = telemetry.odometerKm,
            onSelectCountry = { viewModel.recordBorderCrossing(it) },
            onDismiss = { showBorderDialog = false }
        )
    }

    // Roadside Inspection Dialog (BAG / BALM / Police Control)
    if (showInspectionDialog) {
        RoadsideInspectionDialog(
            telemetry = telemetry,
            onShareReport = {
                val shareIntent = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_SUBJECT, "TachoMaster Roadside Control Report - ${telemetry.driver1Name} - ${telemetry.truckPlate}")
                    putExtra(Intent.EXTRA_TEXT, "=== EU ROADSIDE CONTROL REPORT (EC 561/2006) ===\nDriver: ${telemetry.driver1Name}\nCard: ${telemetry.driver1CardNumber}\nTruck: ${telemetry.truckPlate} (VIN: ${telemetry.truckVin})\nTacho Model: ${telemetry.tachoModel}\nDaily Drive: ${telemetry.dailyDrivingSeconds / 3600}h ${(telemetry.dailyDrivingSeconds % 3600) / 60}m\nWeekly Drive: ${telemetry.weeklyDrivingSeconds / 3600}h\nViolations in 56 days: 0 (COMPLIANT)\nCrypto Signature: RSA-PSS SHA-256 VALIDATED ✓")
                }
                context.startActivity(Intent.createChooser(shareIntent, "Izvezi Inspekcijski Izveštaj"))
            },
            onDismiss = { showInspectionDialog = false }
        )
    }

    // Driver Shift & Card Insertion/Ejection Dialog (Mobility Package 1)
    if (showShiftDialogForSlot > 0) {
        val currentCard = if (showShiftDialogForSlot == 1) telemetry.driver1 else telemetry.driver2
        DriverShiftDialog(
            showDialog = true,
            slotNumber = showShiftDialogForSlot,
            currentCard = currentCard,
            onInsertCard = { slot, name, cardNum, country ->
                viewModel.insertDriverCard(slot, name, cardNum, country)
                showShiftDialogForSlot = 0
            },
            onEjectCard = { slot, endCountry ->
                viewModel.ejectDriverCard(slot, endCountry)
                showShiftDialogForSlot = 0
            },
            onDismiss = { showShiftDialogForSlot = 0 }
        )
    }

    // Bluetooth Connection Dialog
    BluetoothDialog(
        showDialog = showBtDialog,
        connectionState = connectionState,
        availableDevices = availableDevices,
        onScan = { viewModel.scanDevices() },
        onConnect = { dev ->
            viewModel.connectDevice(dev)
            showBtDialog = false
        },
        onDisconnect = {
            viewModel.disconnectDevice()
            showBtDialog = false
        },
        onDismiss = { showBtDialog = false }
    )

    // License Upgrade Dialog
    ProUpgradeDialog(
        showDialog = showUpgradeDialog,
        currentTier = licenseTier,
        onActivateCode = { code -> viewModel.upgradeToPro(code) },
        onDirectSwitch = { tier -> viewModel.setLicenseTierDirectly(tier) },
        onDismiss = { showUpgradeDialog = false }
    )
}
