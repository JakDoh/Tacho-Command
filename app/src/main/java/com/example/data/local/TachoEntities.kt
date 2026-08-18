package com.example.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "tacho_downloads")
data class DownloadEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val fileName: String,
    val fileType: String, // "DRIVER_CARD" or "VEHICLE_UNIT"
    val driverName: String,
    val cardOrVin: String,
    val vehiclePlate: String,
    val downloadTimestamp: Long,
    val periodDays: Int,
    val fileSizeKb: Int,
    val sha256Hash: String,
    val isArchived: Boolean,
    val licenseModeUsed: String // "DEMO_3_DAYS" or "PRO_2_MONTHS"
)

@Entity(tableName = "tacho_activities")
data class ActivityEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val eventDate: String, // "YYYY-MM-DD"
    val startTime: String, // "HH:mm"
    val endTime: String,   // "HH:mm"
    val durationMinutes: Int,
    val activityType: String, // "DRIVING", "WORK", "AVAILABILITY", "REST"
    val vehiclePlate: String,
    val driverName: String,
    val startOdometerKm: Long,
    val endOdometerKm: Long
)

@Entity(tableName = "tacho_infringements")
data class InfringementEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val ruleCode: String,
    val title: String,
    val description: String,
    val occurredDate: String,
    val excessMinutes: Int,
    val severity: String,
    val fineRange: String,
    val resolutionNote: String
)

@Entity(tableName = "driver_shifts")
data class ShiftEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val driverName: String,
    val cardNumber: String,
    val slotNumber: Int, // 1 (Driver) or 2 (Co-driver)
    val shiftStartTime: Long,
    val shiftEndTime: Long? = null,
    val startCountry: String, // e.g., "SRB", "DE", "HU"
    val endCountry: String? = null,
    val startOdometerKm: Long,
    val endOdometerKm: Long? = null,
    val totalDriveMinutes: Int = 0,
    val totalWorkMinutes: Int = 0,
    val totalRestMinutes: Int = 0,
    val vehiclePlate: String,
    val isActive: Boolean = true
)
