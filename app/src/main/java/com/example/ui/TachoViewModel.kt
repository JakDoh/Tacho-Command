package com.example.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.bluetooth.TachoBluetoothManager
import com.example.data.local.ActivityEntity
import com.example.data.local.DownloadEntity
import com.example.data.local.InfringementEntity
import com.example.data.local.ShiftEntity
import com.example.data.model.AppLanguage
import com.example.data.model.BtConnectionState
import com.example.data.model.FerryTrainMode
import com.example.data.model.LicenseTier
import com.example.data.model.TachoActivityType
import com.example.data.model.TachoBluetoothDevice
import com.example.data.model.TachoDownloadSession
import com.example.data.model.TachoLiveTelemetry
import com.example.data.model.WeeklyRestRecord
import com.example.data.repository.TachoRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

enum class AppTab(val titleSr: String, val iconName: String) {
    DASHBOARD("Kokpit", "Dashboard"),
    DOWNLOAD("Preuzmi .DDD", "Download"),
    TIMELINE("24h Analiza", "Timeline"),
    INFRINGEMENTS("Prekršaji & EU 561", "Infringements"),
    ARCHIVE("Arhiva & Izvoz", "Archive"),
    FAQ_LEGAL("O Aplikaciji & Cene", "Help")
}

data class UiNotification(
    val message: String,
    val isError: Boolean = false,
    val timestamp: Long = System.currentTimeMillis()
)

class TachoViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = TachoRepository(application)
    val bluetoothManager = TachoBluetoothManager(application)

    // Current Navigation Tab
    private val _selectedTab = MutableStateFlow(AppTab.DASHBOARD)
    val selectedTab: StateFlow<AppTab> = _selectedTab.asStateFlow()

    // App Language (Srpski, English, Deutsch)
    private val _currentLanguage = MutableStateFlow(AppLanguage.SR)
    val currentLanguage: StateFlow<AppLanguage> = _currentLanguage.asStateFlow()

    // License Tier (Demo 3 days vs Pro 2 months archive)
    private val _licenseTier = MutableStateFlow(LicenseTier.DEMO_3_DAYS)
    val licenseTier: StateFlow<LicenseTier> = _licenseTier.asStateFlow()

    // Selected Date for Timeline Inspection
    private val _selectedDate = MutableStateFlow("2026-08-18")
    val selectedDate: StateFlow<String> = _selectedDate.asStateFlow()

    // Notification / Toast banner
    private val _notification = MutableStateFlow<UiNotification?>(null)
    val notification: StateFlow<UiNotification?> = _notification.asStateFlow()

    // Bluetooth and Live Telemetry
    val liveTelemetry: StateFlow<TachoLiveTelemetry> = bluetoothManager.liveTelemetry
    val connectionState: StateFlow<BtConnectionState> = bluetoothManager.connectionState
    val availableDevices: StateFlow<List<TachoBluetoothDevice>> = bluetoothManager.availableDevices
    val downloadSession: StateFlow<TachoDownloadSession> = bluetoothManager.downloadSession

    // Database flows
    val allDownloads: StateFlow<List<DownloadEntity>> = repository.getDownloads()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val allActivities: StateFlow<List<ActivityEntity>> = repository.getAllActivities()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val allInfringements: StateFlow<List<InfringementEntity>> = repository.getInfringements()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val activeShift: StateFlow<ShiftEntity?> = repository.getActiveShift()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val allShifts: StateFlow<List<ShiftEntity>> = repository.getAllShifts()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Filtered activities based on License tier
    val filteredActivities: StateFlow<List<ActivityEntity>> = combine(allActivities, licenseTier) { activities, tier ->
        if (tier == LicenseTier.DEMO_3_DAYS) {
            // Only allow viewing the last 3 days in Demo mode
            val allowedDates = listOf("2026-08-18", "2026-08-17", "2026-08-16")
            activities.filter { it.eventDate in allowedDates }
        } else {
            // Full 60 days / 2 months in Pro mode
            activities
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    init {
        viewModelScope.launch {
            repository.seedInitialDataIfEmpty()
        }
    }

    fun selectTab(tab: AppTab) {
        _selectedTab.value = tab
    }

    fun selectDate(date: String) {
        _selectedDate.value = date
    }

    fun setActivity(activity: TachoActivityType) {
        if (activity == TachoActivityType.DRIVING && !liveTelemetry.value.driver1.isInserted) {
            showNotification("UPOZORENJE (EU 165/2014): Pokrenuta vožnja bez ubačene kartice vozača u Slot 1! Ubacite karticu odmah.", true)
        }
        bluetoothManager.setActivity(activity)
        showNotification("Status tahografa postavljen na: ${activity.labelSr}")
    }

    // Driver Identification & Shift Prompts
    fun insertDriverCard(
        slotNumber: Int,
        driverName: String,
        cardNumber: String,
        startCountry: String
    ) {
        bluetoothManager.insertDriverCard(slotNumber, driverName, cardNumber, startCountry)
        viewModelScope.launch {
            repository.startShift(
                ShiftEntity(
                    driverName = driverName,
                    cardNumber = cardNumber,
                    slotNumber = slotNumber,
                    shiftStartTime = System.currentTimeMillis(),
                    startCountry = startCountry,
                    startOdometerKm = liveTelemetry.value.odometerKm,
                    vehiclePlate = liveTelemetry.value.truckPlate,
                    isActive = true
                )
            )
            showNotification("Kartica vozača ubačena u Slot $slotNumber. Započeta smena (Zemlja: $startCountry).")
        }
    }

    fun ejectDriverCard(slotNumber: Int, endCountry: String) {
        bluetoothManager.ejectDriverCard(slotNumber, endCountry)
        viewModelScope.launch {
            repository.endActiveShift(endCountry, liveTelemetry.value.odometerKm)
            showNotification("Kartica vozača izbačena iz Slota $slotNumber. Smena uspešno zatvorena (Krajnja zemlja: $endCountry).")
        }
    }

    fun toggleHighSpeedDemo() {
        bluetoothManager.toggleHighSpeedExceedDemo()
        val currentSpeed = liveTelemetry.value.speedKmH
        if (currentSpeed > 90) {
            showNotification("Vraćeno na standardnu brzinu (86 km/h)")
        } else {
            showNotification("ALARM PREKORAČENJA BRZINE (>90 km/h)! Prikaz crvenom bojom po EU standardu.", true)
        }
    }

    fun toggleContinuousDriveExceedDemo() {
        bluetoothManager.toggleContinuousDriveExceedDemo()
        val contDrive = liveTelemetry.value.continuousDrivingSeconds
        if (contDrive > 16200) {
            showNotification("Vraćeno na regularno vreme vožnje (3h 20m)")
        } else {
            showNotification("ALARM PREKORAČENJA VOŽNJE (>4h30m)! Prikaz crvenom bojom po EC 561/2006.", true)
        }
    }

    fun toggleTripSimulation() {
        bluetoothManager.toggleTripSimulation()
    }

    fun scanDevices() {
        bluetoothManager.scanDevices(viewModelScope)
        showNotification("Skeniranje Bluetooth tahografskih adaptera...")
    }

    fun connectDevice(device: TachoBluetoothDevice) {
        bluetoothManager.connectToDevice(device, viewModelScope)
        showNotification("Povezivanje na ${device.name}...")
    }

    fun disconnectDevice() {
        bluetoothManager.disconnect()
        showNotification("Tahograf adapter diskonektovan.")
    }

    fun triggerDownload(targetType: String, periodDays: Int) {
        if (_licenseTier.value == LicenseTier.DEMO_3_DAYS && periodDays > 3) {
            showNotification("Demo verzija dozvoljava preuzimanje samo za zadnja 3 dana. Aktivirajte Pro za 2 meseca!", true)
            return
        }

        val driverName = liveTelemetry.value.driver1Name
        val vehiclePlate = liveTelemetry.value.truckPlate

        bluetoothManager.startDownload(
            targetType = targetType,
            periodDays = periodDays,
            driverName = driverName,
            scope = viewModelScope
        ) { fileName, sizeKb, hash ->
            viewModelScope.launch {
                val isArchived = _licenseTier.value == LicenseTier.PRO_2_MONTHS
                repository.saveDownload(
                    DownloadEntity(
                        fileName = fileName,
                        fileType = targetType,
                        driverName = driverName,
                        cardOrVin = if (targetType == "DRIVER_CARD") liveTelemetry.value.driver1CardNumber else liveTelemetry.value.truckVin,
                        vehiclePlate = vehiclePlate,
                        downloadTimestamp = System.currentTimeMillis(),
                        periodDays = periodDays,
                        fileSizeKb = sizeKb,
                        sha256Hash = hash,
                        isArchived = isArchived,
                        licenseModeUsed = _licenseTier.value.name
                    )
                )
                if (isArchived) {
                    showNotification("Fajl $fileName arhiviran u trajnu bazu (2 meseca).")
                } else {
                    showNotification("Demo pregled $fileName generisan (bez trajnog arhiviranja).")
                }
            }
        }
    }

    fun resetDownload() {
        bluetoothManager.resetDownloadSession()
    }

    fun setLanguage(language: AppLanguage) {
        _currentLanguage.value = language
        val msg = when (language) {
            AppLanguage.SR -> "Jezik promenjen na: Srpski"
            AppLanguage.EN -> "Language changed to: English"
            AppLanguage.DE -> "Sprache geändert zu: Deutsch"
        }
        showNotification(msg)
    }

    fun toggleFerryMode() {
        bluetoothManager.toggleFerryMode()
        val isActive = liveTelemetry.value.ferryMode.isActive
        val msg = if (isActive) {
            "Trajekt / Voz režim aktiviran (Član 9. EC 561). Dozvoljena 2 prekida do 1h."
        } else {
            "Trajekt / Voz režim isključen."
        }
        showNotification(msg)
    }

    fun recordFerryInterruption(seconds: Long = 900L) {
        bluetoothManager.recordFerryInterruption(seconds)
        val count = liveTelemetry.value.ferryMode.interruptionsCount
        val totalMins = liveTelemetry.value.ferryMode.totalInterruptionSeconds / 60
        showNotification("Zabeležen prekid za trajekt ($count/2 iskorišćeno, ukupno ${totalMins}m / 60m)")
    }

    fun markWeeklyCompensationDone() {
        bluetoothManager.markWeeklyCompensationDone()
        showNotification("Nedeljna kompenzacija (21h) uspešno označena kao odrađena!")
    }

    fun recordBorderCrossing(countryCode: String) {
        bluetoothManager.recordBorderCrossing(countryCode)
        showNotification("Usklađeno sa Mobility Package 1: Unet prelazak granice u $countryCode.")
    }

    fun upgradeToPro(licenseCode: String): Boolean {
        if (licenseCode.trim().uppercase() in listOf("TACHO-PRO-2026", "PRO2M", "TACHO", "SRBIJA", "DEMO-PRO")) {
            _licenseTier.value = LicenseTier.PRO_2_MONTHS
            showNotification("Čestitamo! Puna verzija (2 meseca arhiviranja) je aktivirana.")
            return true
        } else {
            showNotification("Nevažeći licencni ključ. Probajte 'TACHO-PRO-2026' ili kliknite 'Aktiviraj Pro'", true)
            return false
        }
    }

    fun setLicenseTierDirectly(tier: LicenseTier) {
        _licenseTier.value = tier
        if (tier == LicenseTier.PRO_2_MONTHS) {
            showNotification("Prebačeno na: Puna Pro Verzija (2 meseca arhive)")
        } else {
            showNotification("Prebačeno na: Demo Verzija (3 dana bez arhiviranja)")
        }
    }

    fun deleteDownload(id: Long) {
        viewModelScope.launch {
            repository.deleteDownload(id)
            showNotification("Zapis obrisan iz arhive.")
        }
    }

    fun showNotification(msg: String, isError: Boolean = false) {
        _notification.value = UiNotification(msg, isError)
    }

    fun clearNotification() {
        _notification.value = null
    }
}
