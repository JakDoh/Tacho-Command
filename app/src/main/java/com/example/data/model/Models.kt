package com.example.data.model

import androidx.compose.ui.graphics.Color
import com.example.ui.theme.ActivityDrive
import com.example.ui.theme.ActivityPoa
import com.example.ui.theme.ActivityRest
import com.example.ui.theme.ActivityWork

object EuTachoConstants {
    const val MAX_SPEED_KMH = 90
    const val MAX_CONTINUOUS_DRIVE_SECONDS = 4 * 3600 + 30 * 60 // 4h 30m (16,200 seconds)
    const val REGULAR_DAILY_DRIVE_SECONDS = 9 * 3600 // 9 hours (32,400 seconds)
    const val EXTENDED_DAILY_DRIVE_SECONDS = 10 * 3600 // 10 hours (max 2 times per week)
    const val MANDATORY_BREAK_SECONDS = 45 * 60 // 45 minutes
    const val REGULAR_DAILY_REST_SECONDS = 11 * 3600 // 11 hours
    const val REDUCED_DAILY_REST_SECONDS = 9 * 3600 // 9 hours
    const val MAX_DAILY_SPREAD_SECONDS = 13 * 3600 // Regular shift span (15h for reduced rest)
}

enum class TachoActivityType(val labelSr: String, val labelEn: String, val color: Color, val symbol: String) {
    DRIVING("Vožnja", "Driving", ActivityDrive, "⯈"),
    WORK("Rad", "Work", ActivityWork, "⚒"),
    AVAILABILITY("Raspoloživost", "Availability", ActivityPoa, "⧉"),
    REST("Odmor / Pauza", "Rest / Break", ActivityRest, "🛏")
}

enum class InfringementSeverity(val labelSr: String, val colorHex: Long) {
    MINOR("Neznatan prekršaj (MI)", 0xFFF59E0B),
    SERIOUS("Ozbiljan prekršaj (SI)", 0xFFF97316),
    VERY_SERIOUS("Vrlo ozbiljan prekršaj (VSI)", 0xFFEF4444)
}

enum class LicenseTier(val titleSr: String, val maxDays: Int, val canArchive: Boolean, val badge: String) {
    DEMO_3_DAYS("Demo Verzija (3 Dana)", 3, false, "DEMO"),
    PRO_2_MONTHS("Puna Verzija (2 Meseca / 60 Dana)", 60, true, "PRO ACTIVE")
}

enum class BtConnectionState {
    DISCONNECTED,
    SCANNING,
    CONNECTING,
    CONNECTED,
    DOWNLOADING_DATA
}

data class TachoBluetoothDevice(
    val name: String,
    val address: String,
    val rssi: Int = -65,
    val isPaired: Boolean = false,
    val deviceType: String = "Tacho BT Dongle (ISO 14229)"
)

data class DriverCardInfo(
    val driverName: String,
    val cardNumber: String,
    val cardExpiryDate: String = "2029-10-15",
    val issuingCountry: String = "SRB",
    val isInserted: Boolean = true,
    val slotNumber: Int = 1 // 1 for Driver, 2 for Co-Driver
)

enum class AppLanguage(val code: String, val label: String, val flag: String) {
    SR("sr", "Srpski", "🇷🇸"),
    EN("en", "English", "🇬🇧"),
    DE("de", "Deutsch", "🇩🇪")
}

data class FerryTrainMode(
    val isActive: Boolean = false,
    val interruptionsCount: Int = 0, // Max 2 interruptions allowed
    val totalInterruptionSeconds: Long = 0L, // Max 3600 seconds (1 hour)
    val accumulatedRestSeconds: Long = 0L, // Must reach 11h (39600s)
    val hasSleeperCabin: Boolean = true
)

data class WeeklyRestRecord(
    val week1RestHours: Int = 45, // Regular 45h or Reduced 24h
    val week2RestHours: Int = 24, // Reduced 24h (needs 21h compensation)
    val compensationDueHours: Int = 21,
    val compensationDeadline: String = "2026-09-06", // End of 3rd week
    val isCompensated: Boolean = false,
    val biWeeklyDriveHours: Int = 78 // Max 90h
)

data class BorderCrossingEvent(
    val countryCode: String,
    val countryNameSr: String,
    val countryNameEn: String,
    val flag: String,
    val timestamp: Long = System.currentTimeMillis(),
    val odometerKm: Long = 482619L
)

data class TachoLiveTelemetry(
    val speedKmH: Int = 0,
    val rpm: Int = 0,
    val currentActivity: TachoActivityType = TachoActivityType.REST,
    val continuousDrivingSeconds: Long = 0L,     // Current continuous driving block (max 4h30m)
    val dailyDrivingSeconds: Long = 0L,          // Total driving today (max 9h/10h)
    val weeklyDrivingSeconds: Long = 0L,         // Total driving this week (max 56h)
    val biWeeklyDrivingSeconds: Long = 0L,       // Total driving past 2 weeks (max 90h)
    val remainingUntilBreakSeconds: Long = 4 * 3600 + 30 * 60, // Count down from 4h30m
    val remainingDailyDriveSeconds: Long = 9 * 3600,          // Count down from 9h (or 10h)
    val currentShiftWorkingSeconds: Long = 0L,   // Directive 2002/15/EC total working time
    val ferryMode: FerryTrainMode = FerryTrainMode(),
    val weeklyRest: WeeklyRestRecord = WeeklyRestRecord(),
    val driver1: DriverCardInfo = DriverCardInfo(
        driverName = "Marko Petrović",
        cardNumber = "SRB000004928190001",
        cardExpiryDate = "2029-05-12",
        issuingCountry = "SRB",
        isInserted = true,
        slotNumber = 1
    ),
    val driver2: DriverCardInfo = DriverCardInfo(
        driverName = "Prazno (Jedan vozač)",
        cardNumber = "N/A",
        cardExpiryDate = "",
        issuingCountry = "",
        isInserted = false,
        slotNumber = 2
    ),
    val truckPlate: String = "BG-1842-TX",
    val truckVin: String = "WDB9634031L894210",
    val tachoModel: String = "VDO DTCO 4.1 Smart 2",
    val odometerKm: Long = 482619,
    val connectionState: BtConnectionState = BtConnectionState.CONNECTED,
    val connectedDeviceName: String = "VDO SmartLink BT Pro",
    val batteryVolt: Float = 24.2f,
    val currentCountry: String = "SRB",
    val isShiftActive: Boolean = true,
    val shiftStartTimestamp: Long = System.currentTimeMillis() - (4 * 3600 + 15 * 60) * 1000L,
    val shiftStartCountry: String = "SRB",
    val lastSyncTimestamp: Long = System.currentTimeMillis()
) {
    val driver1Name: String get() = driver1.driverName
    val driver1CardNumber: String get() = driver1.cardNumber
    val driver1CardInserted: Boolean get() = driver1.isInserted
    val driver2Name: String get() = driver2.driverName
    val driver2CardInserted: Boolean get() = driver2.isInserted

    // Regulation Compliance checks
    val isSpeedViolation: Boolean get() = speedKmH > EuTachoConstants.MAX_SPEED_KMH
    val isContinuousDriveViolation: Boolean get() = continuousDrivingSeconds > EuTachoConstants.MAX_CONTINUOUS_DRIVE_SECONDS
    val isDailyDriveViolation: Boolean get() = dailyDrivingSeconds > EuTachoConstants.REGULAR_DAILY_DRIVE_SECONDS
    val isDrivingWithoutCard: Boolean get() = currentActivity == TachoActivityType.DRIVING && !driver1.isInserted
}

data class TachoDownloadSession(
    val isDownloading: Boolean = false,
    val progressPercent: Float = 0f,
    val currentBlock: Int = 0,
    val totalBlocks: Int = 100,
    val bytesTransferred: Long = 0,
    val totalBytes: Long = 245760, // 240 KB typical DDD
    val currentFileTarget: String = "C_20260818_1120_M_Petrovic.DDD",
    val logMessages: List<String> = emptyList(),
    val isCompleted: Boolean = false
)
