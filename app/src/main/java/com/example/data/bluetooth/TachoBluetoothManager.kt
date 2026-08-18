package com.example.data.bluetooth

import android.content.Context
import com.example.data.model.BtConnectionState
import com.example.data.model.DriverCardInfo
import com.example.data.model.EuTachoConstants
import com.example.data.model.TachoActivityType
import com.example.data.model.TachoBluetoothDevice
import com.example.data.model.TachoDownloadSession
import com.example.data.model.TachoLiveTelemetry
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlin.random.Random

class TachoBluetoothManager(private val context: Context) {

    private val _connectionState = MutableStateFlow(BtConnectionState.CONNECTED)
    val connectionState: StateFlow<BtConnectionState> = _connectionState.asStateFlow()

    private val _availableDevices = MutableStateFlow<List<TachoBluetoothDevice>>(emptyList())
    val availableDevices: StateFlow<List<TachoBluetoothDevice>> = _availableDevices.asStateFlow()

    private val _liveTelemetry = MutableStateFlow(
        TachoLiveTelemetry(
            speedKmH = 88,
            rpm = 1350,
            currentActivity = TachoActivityType.DRIVING,
            continuousDrivingSeconds = 3 * 3600 + 42 * 60, // 3h 42m (under 4h30)
            dailyDrivingSeconds = 6 * 3600 + 30 * 60,      // 6h 30m
            weeklyDrivingSeconds = 28 * 3600,              // 28h
            remainingUntilBreakSeconds = 48 * 60,          // 48 min until 45m break required
            remainingDailyDriveSeconds = 2 * 3600 + 30 * 60, // 2h 30m remaining today
            currentShiftWorkingSeconds = 7 * 3600 + 15 * 60,
            odometerKm = 482710,
            currentCountry = "SRB"
        )
    )
    val liveTelemetry: StateFlow<TachoLiveTelemetry> = _liveTelemetry.asStateFlow()

    private val _downloadSession = MutableStateFlow(TachoDownloadSession())
    val downloadSession: StateFlow<TachoDownloadSession> = _downloadSession.asStateFlow()

    private var telemetryJob: Job? = null
    private var isSimulatingTrip = true

    init {
        populateDefaultDevices()
        startTelemetryLoop()
    }

    private fun populateDefaultDevices() {
        _availableDevices.value = listOf(
            TachoBluetoothDevice("VDO SmartLink BT Pro", "00:1A:7D:DA:71:02", -54, true, "DTCO Front 6-Pin Interface"),
            TachoBluetoothDevice("Stoneridge DigiDL Key", "00:14:03:05:8B:19", -68, false, "K-Line / CAN-Bus Adapter"),
            TachoBluetoothDevice("Tacho2Safe BT Reader", "24:71:89:11:A4:CC", -75, false, "Smartcard & VU Reader"),
            TachoBluetoothDevice("OBD2 Fleet Tacho Dongle", "A0:B7:65:43:21:FE", -82, false, "OBD-II Telematics Port")
        )
    }

    fun scanDevices(scope: CoroutineScope) {
        scope.launch(Dispatchers.IO) {
            _connectionState.value = BtConnectionState.SCANNING
            delay(1500)
            populateDefaultDevices()
            _connectionState.value = BtConnectionState.DISCONNECTED
        }
    }

    fun connectToDevice(device: TachoBluetoothDevice, scope: CoroutineScope) {
        scope.launch(Dispatchers.IO) {
            _connectionState.value = BtConnectionState.CONNECTING
            delay(1200)
            _connectionState.value = BtConnectionState.CONNECTED
            _liveTelemetry.update {
                it.copy(
                    connectionState = BtConnectionState.CONNECTED,
                    connectedDeviceName = device.name
                )
            }
        }
    }

    fun disconnect() {
        _connectionState.value = BtConnectionState.DISCONNECTED
        _liveTelemetry.update {
            it.copy(
                connectionState = BtConnectionState.DISCONNECTED,
                speedKmH = 0,
                rpm = 0
            )
        }
    }

    // --- Driver Card Identification & Slot Management ---
    fun insertDriverCard(slotNumber: Int, driverName: String, cardNumber: String, country: String) {
        _liveTelemetry.update { current ->
            if (slotNumber == 1) {
                current.copy(
                    driver1 = DriverCardInfo(
                        driverName = driverName,
                        cardNumber = cardNumber,
                        issuingCountry = country,
                        isInserted = true,
                        slotNumber = 1
                    ),
                    isShiftActive = true,
                    shiftStartTimestamp = System.currentTimeMillis(),
                    shiftStartCountry = country,
                    currentCountry = country
                )
            } else {
                current.copy(
                    driver2 = DriverCardInfo(
                        driverName = driverName,
                        cardNumber = cardNumber,
                        issuingCountry = country,
                        isInserted = true,
                        slotNumber = 2
                    )
                )
            }
        }
    }

    fun ejectDriverCard(slotNumber: Int, endCountry: String) {
        _liveTelemetry.update { current ->
            if (slotNumber == 1) {
                current.copy(
                    driver1 = current.driver1.copy(isInserted = false),
                    isShiftActive = false,
                    currentCountry = endCountry,
                    currentActivity = TachoActivityType.REST,
                    speedKmH = 0,
                    rpm = 0
                )
            } else {
                current.copy(
                    driver2 = current.driver2.copy(isInserted = false)
                )
            }
        }
    }

    fun setCountry(countryCode: String) {
        _liveTelemetry.update {
            it.copy(currentCountry = countryCode)
        }
    }

    fun setActivity(activity: TachoActivityType) {
        _liveTelemetry.update { current ->
            val newSpeed = if (activity == TachoActivityType.DRIVING) 85 else 0
            val newRpm = if (activity == TachoActivityType.DRIVING) 1300 else if (activity == TachoActivityType.WORK) 650 else 0
            current.copy(
                currentActivity = activity,
                speedKmH = newSpeed,
                rpm = newRpm
            )
        }
    }

    fun toggleHighSpeedExceedDemo() {
        // Toggle overspeed > 90 km/h (e.g. 94 km/h) for testing red alert
        _liveTelemetry.update { current ->
            if (current.speedKmH > 90) {
                current.copy(speedKmH = 86)
            } else {
                current.copy(speedKmH = 94, currentActivity = TachoActivityType.DRIVING)
            }
        }
    }

    fun toggleContinuousDriveExceedDemo() {
        // Toggle > 4h30m (e.g. 4h 38m = 16680s) for testing red alert
        _liveTelemetry.update { current ->
            if (current.continuousDrivingSeconds > EuTachoConstants.MAX_CONTINUOUS_DRIVE_SECONDS) {
                current.copy(
                    continuousDrivingSeconds = 3 * 3600 + 20 * 60,
                    remainingUntilBreakSeconds = 1 * 3600 + 10 * 60
                )
            } else {
                current.copy(
                    continuousDrivingSeconds = 4 * 3600 + 38 * 60, // 4h 38m (Exceeded)
                    remainingUntilBreakSeconds = 0
                )
            }
        }
    }

    fun toggleFerryMode() {
        _liveTelemetry.update { current ->
            val isNowActive = !current.ferryMode.isActive
            val updatedFerry = if (isNowActive) {
                current.ferryMode.copy(
                    isActive = true,
                    interruptionsCount = 0,
                    totalInterruptionSeconds = 0L,
                    accumulatedRestSeconds = 0L
                )
            } else {
                current.ferryMode.copy(isActive = false)
            }
            current.copy(
                ferryMode = updatedFerry,
                currentActivity = if (isNowActive) TachoActivityType.REST else current.currentActivity
            )
        }
    }

    fun recordFerryInterruption(durationSeconds: Long) {
        _liveTelemetry.update { current ->
            if (!current.ferryMode.isActive) return@update current
            val newCount = (current.ferryMode.interruptionsCount + 1).coerceAtMost(2)
            val newSecs = (current.ferryMode.totalInterruptionSeconds + durationSeconds).coerceAtMost(3600L)
            current.copy(
                ferryMode = current.ferryMode.copy(
                    interruptionsCount = newCount,
                    totalInterruptionSeconds = newSecs
                )
            )
        }
    }

    fun markWeeklyCompensationDone() {
        _liveTelemetry.update { current ->
            current.copy(
                weeklyRest = current.weeklyRest.copy(
                    isCompensated = true,
                    compensationDueHours = 0
                )
            )
        }
    }

    fun recordBorderCrossing(countryCode: String) {
        _liveTelemetry.update { current ->
            current.copy(
                currentCountry = countryCode
            )
        }
    }

    fun toggleTripSimulation() {
        isSimulatingTrip = !isSimulatingTrip
    }

    private fun startTelemetryLoop() {
        telemetryJob?.cancel()
        telemetryJob = CoroutineScope(Dispatchers.Default).launch {
            while (isActive) {
                delay(1000)
                if (_connectionState.value == BtConnectionState.CONNECTED && isSimulatingTrip) {
                    _liveTelemetry.update { current ->
                        var speed = current.speedKmH
                        var act = current.currentActivity
                        var contDrive = current.continuousDrivingSeconds
                        var dailyDrive = current.dailyDrivingSeconds
                        var remBreak = current.remainingUntilBreakSeconds
                        var remDaily = current.remainingDailyDriveSeconds
                        var odo = current.odometerKm
                        var shiftWork = current.currentShiftWorkingSeconds

                        if (act == TachoActivityType.DRIVING) {
                            // Fluctuate around current speed
                            val baseSpeed = if (speed > 90) 93 else 87
                            speed = (baseSpeed + Random.nextInt(-2, 3)).coerceIn(0, 98)
                            contDrive += 1
                            dailyDrive += 1
                            shiftWork += 1
                            remBreak = (remBreak - 1).coerceAtLeast(0)
                            remDaily = (remDaily - 1).coerceAtLeast(0)
                            if (Random.nextInt(40) == 0) {
                                odo += 1
                            }
                        } else {
                            if (speed > 0 && speed <= 90) speed = 0
                            if (act == TachoActivityType.WORK) {
                                shiftWork += 1
                            } else if (act == TachoActivityType.REST) {
                                // Resting recovers continuous drive if rest reaches 45 min (2700s)
                                remBreak = (remBreak + 1).coerceAtMost(EuTachoConstants.MAX_CONTINUOUS_DRIVE_SECONDS.toLong())
                            }
                        }

                        current.copy(
                            speedKmH = speed,
                            rpm = if (speed > 0) 1200 + (speed * 4) else (if (act == TachoActivityType.WORK) 650 else 0),
                            continuousDrivingSeconds = contDrive,
                            dailyDrivingSeconds = dailyDrive,
                            remainingUntilBreakSeconds = remBreak,
                            remainingDailyDriveSeconds = remDaily,
                            currentShiftWorkingSeconds = shiftWork,
                            odometerKm = odo,
                            lastSyncTimestamp = System.currentTimeMillis()
                        )
                    }
                }
            }
        }
    }

    fun startDownload(
        targetType: String, // "DRIVER_CARD" or "VEHICLE_UNIT"
        periodDays: Int,
        driverName: String,
        scope: CoroutineScope,
        onComplete: (fileName: String, sizeKb: Int, hash: String) -> Unit
    ) {
        scope.launch(Dispatchers.IO) {
            val fileName = if (targetType == "DRIVER_CARD") {
                "C_${System.currentTimeMillis()}_${driverName.replace(" ", "_")}.DDD"
            } else {
                "M_${System.currentTimeMillis()}_BG1842TX.DDD"
            }

            val totalBlocks = if (periodDays <= 3) 40 else (if (periodDays <= 28) 120 else 240)
            val totalBytes = totalBlocks * 1024L

            _downloadSession.value = TachoDownloadSession(
                isDownloading = true,
                progressPercent = 0f,
                currentBlock = 0,
                totalBlocks = totalBlocks,
                bytesTransferred = 0,
                totalBytes = totalBytes,
                currentFileTarget = fileName,
                logMessages = listOf(
                    "Inicijalizacija ISO 14229 / UDS protokola...",
                    "Autentifikacija sa VDO DTCO 4.1 kripto čipom...",
                    "Čitanje EF_Card_Certificate (EU 165/2014)..."
                ),
                isCompleted = false
            )

            for (block in 1..totalBlocks) {
                delay(35) // Rapid BT download simulation
                val progress = block.toFloat() / totalBlocks.toFloat()
                val bytes = (progress * totalBytes).toLong()

                val newLogs = mutableListOf<String>()
                if (block == 10) newLogs.add("Preuzimanje EF_Identification & EF_Driver_Activity...")
                if (block == totalBlocks / 2) newLogs.add("Čitanje brzinskih zapisa (1Hz detaljno)...")
                if (block == (totalBlocks * 0.8f).toInt()) newLogs.add("Verifikacija RSA digitalnog potpisa...")

                _downloadSession.update { current ->
                    current.copy(
                        progressPercent = progress,
                        currentBlock = block,
                        bytesTransferred = bytes,
                        logMessages = if (newLogs.isNotEmpty()) current.logMessages + newLogs else current.logMessages
                    )
                }
            }

            val sha256 = "d41d8cd98f00b204e9800998ecf8427e" + Random.nextInt(1000, 9999)
            val sizeKb = (totalBytes / 1024).toInt()

            _downloadSession.update {
                it.copy(
                    isDownloading = false,
                    isCompleted = true,
                    progressPercent = 1.0f,
                    logMessages = it.logMessages + listOf("Preuzimanje uspešno završeno! Checksum OK.")
                )
            }

            onComplete(fileName, sizeKb, sha256)
        }
    }

    fun resetDownloadSession() {
        _downloadSession.value = TachoDownloadSession()
    }
}
