package com.example.data.repository

import android.content.Context
import androidx.room.Room
import com.example.data.local.ActivityEntity
import com.example.data.local.DownloadEntity
import com.example.data.local.InfringementEntity
import com.example.data.local.ShiftEntity
import com.example.data.local.TachoDatabase
import kotlinx.coroutines.flow.Flow

class TachoRepository(context: Context) {
    private val database: TachoDatabase = Room.databaseBuilder(
        context.applicationContext,
        TachoDatabase::class.java,
        "tachomaster_database.db"
    ).fallbackToDestructiveMigration().build()

    private val tachoDao = database.tachoDao()

    fun getDownloads(): Flow<List<DownloadEntity>> = tachoDao.getAllDownloads()

    suspend fun saveDownload(download: DownloadEntity): Long = tachoDao.insertDownload(download)

    suspend fun deleteDownload(id: Long) = tachoDao.deleteDownload(id)

    suspend fun clearDemoFiles() = tachoDao.clearNonArchivedDemoDownloads()

    fun getAllActivities(): Flow<List<ActivityEntity>> = tachoDao.getAllActivities()

    fun getActivitiesForDate(date: String): Flow<List<ActivityEntity>> = tachoDao.getActivitiesForDate(date)

    suspend fun saveActivities(activities: List<ActivityEntity>) = tachoDao.insertActivities(activities)

    fun getInfringements(): Flow<List<InfringementEntity>> = tachoDao.getAllInfringements()

    suspend fun saveInfringements(infringements: List<InfringementEntity>) = tachoDao.insertInfringements(infringements)

    // Shift & Driver Card Management
    fun getAllShifts(): Flow<List<ShiftEntity>> = tachoDao.getAllShifts()

    fun getActiveShift(): Flow<ShiftEntity?> = tachoDao.getActiveShift()

    suspend fun startShift(shift: ShiftEntity): Long {
        tachoDao.closeActiveShifts(System.currentTimeMillis(), shift.startCountry, shift.startOdometerKm)
        return tachoDao.insertShift(shift)
    }

    suspend fun endActiveShift(endCountry: String, endOdometerKm: Long) {
        tachoDao.closeActiveShifts(System.currentTimeMillis(), endCountry, endOdometerKm)
    }

    suspend fun seedInitialDataIfEmpty() {
        // Populate standard sample tacho data for immediate testing
        val initialActivities = listOf(
            // Today (2026-08-18)
            ActivityEntity(eventDate = "2026-08-18", startTime = "06:00", endTime = "06:30", durationMinutes = 30, activityType = "WORK", vehiclePlate = "BG-1842-TX", driverName = "Marko Petrović", startOdometerKm = 482400, endOdometerKm = 482400),
            ActivityEntity(eventDate = "2026-08-18", startTime = "06:30", endTime = "10:30", durationMinutes = 240, activityType = "DRIVING", vehiclePlate = "BG-1842-TX", driverName = "Marko Petrović", startOdometerKm = 482400, endOdometerKm = 482720),
            ActivityEntity(eventDate = "2026-08-18", startTime = "10:30", endTime = "11:15", durationMinutes = 45, activityType = "REST", vehiclePlate = "BG-1842-TX", driverName = "Marko Petrović", startOdometerKm = 482720, endOdometerKm = 482720),
            ActivityEntity(eventDate = "2026-08-18", startTime = "11:15", endTime = "13:45", durationMinutes = 150, activityType = "DRIVING", vehiclePlate = "BG-1842-TX", driverName = "Marko Petrović", startOdometerKm = 482720, endOdometerKm = 482920),
            ActivityEntity(eventDate = "2026-08-18", startTime = "13:45", endTime = "14:15", durationMinutes = 30, activityType = "WORK", vehiclePlate = "BG-1842-TX", driverName = "Marko Petrović", startOdometerKm = 482920, endOdometerKm = 482920),

            // Yesterday (2026-08-17)
            ActivityEntity(eventDate = "2026-08-17", startTime = "07:00", endTime = "07:30", durationMinutes = 30, activityType = "WORK", vehiclePlate = "BG-1842-TX", driverName = "Marko Petrović", startOdometerKm = 481750, endOdometerKm = 481750),
            ActivityEntity(eventDate = "2026-08-17", startTime = "07:30", endTime = "12:00", durationMinutes = 270, activityType = "DRIVING", vehiclePlate = "BG-1842-TX", driverName = "Marko Petrović", startOdometerKm = 481750, endOdometerKm = 482110),
            ActivityEntity(eventDate = "2026-08-17", startTime = "12:00", endTime = "12:45", durationMinutes = 45, activityType = "REST", vehiclePlate = "BG-1842-TX", driverName = "Marko Petrović", startOdometerKm = 482110, endOdometerKm = 482110),
            ActivityEntity(eventDate = "2026-08-17", startTime = "12:45", endTime = "16:45", durationMinutes = 240, activityType = "DRIVING", vehiclePlate = "BG-1842-TX", driverName = "Marko Petrović", startOdometerKm = 482110, endOdometerKm = 482400),
            ActivityEntity(eventDate = "2026-08-17", startTime = "16:45", endTime = "24:00", durationMinutes = 435, activityType = "REST", vehiclePlate = "BG-1842-TX", driverName = "Marko Petrović", startOdometerKm = 482400, endOdometerKm = 482400),

            // 2 Days Ago (2026-08-16)
            ActivityEntity(eventDate = "2026-08-16", startTime = "08:00", endTime = "12:30", durationMinutes = 270, activityType = "DRIVING", vehiclePlate = "BG-1842-TX", driverName = "Marko Petrović", startOdometerKm = 481200, endOdometerKm = 481550),
            ActivityEntity(eventDate = "2026-08-16", startTime = "12:30", endTime = "13:30", durationMinutes = 60, activityType = "REST", vehiclePlate = "BG-1842-TX", driverName = "Marko Petrović", startOdometerKm = 481550, endOdometerKm = 481550),
            ActivityEntity(eventDate = "2026-08-16", startTime = "13:30", endTime = "16:00", durationMinutes = 150, activityType = "DRIVING", vehiclePlate = "BG-1842-TX", driverName = "Marko Petrović", startOdometerKm = 481550, endOdometerKm = 481750),

            // Historical data (Archived in Pro version - e.g., 2 weeks ago)
            ActivityEntity(eventDate = "2026-08-04", startTime = "06:00", endTime = "11:00", durationMinutes = 300, activityType = "DRIVING", vehiclePlate = "BG-1842-TX", driverName = "Marko Petrović", startOdometerKm = 478100, endOdometerKm = 478500),
            ActivityEntity(eventDate = "2026-08-04", startTime = "11:00", endTime = "11:45", durationMinutes = 45, activityType = "REST", vehiclePlate = "BG-1842-TX", driverName = "Marko Petrović", startOdometerKm = 478500, endOdometerKm = 478500),
            ActivityEntity(eventDate = "2026-07-22", startTime = "08:00", endTime = "16:00", durationMinutes = 480, activityType = "DRIVING", vehiclePlate = "BG-1842-TX", driverName = "Marko Petrović", startOdometerKm = 475200, endOdometerKm = 475850)
        )
        tachoDao.insertActivities(initialActivities)

        val initialInfringements = listOf(
            InfringementEntity(
                ruleCode = "EC 561/2006 Art. 7",
                title = "Prekoračenje neprekidne vožnje (> 4h30m)",
                description = "Vozač je vozio 4 sata i 48 minuta bez propisane pauze od 45 minuta (ili 15+30 min). Prekoračenje označeno crvenom bojom.",
                occurredDate = "2026-08-12 14:18",
                excessMinutes = 18,
                severity = "SERIOUS",
                fineRange = "150 € - 300 € (RS: 20.000 RSD)",
                resolutionNote = "Obavezno zaustaviti vozilo na najbližem bezbednom parkingu i uneti ručni unos 'Odmor' uz obrazloženje na poleđini ispisa ako je u pitanju bezbednost (Art. 12)."
            ),
            InfringementEntity(
                ruleCode = "EC 92/6 & 2002/85",
                title = "Prekoračenje brzine (> 90 km/h)",
                description = "Evidentirana brzina teretnog vozila od 94 km/h u trajanju dužem od 60 sekundi. Označeno crvenom bojom u telemetriji.",
                occurredDate = "2026-08-14 11:22",
                excessMinutes = 4,
                severity = "SERIOUS",
                fineRange = "100 € - 250 € (RS: 15.000 RSD)",
                resolutionNote = "Proveriti podešavanje fabričkog limitatora brzine na 90 km/h (Uredba EU 165/2014)."
            ),
            InfringementEntity(
                ruleCode = "EC 561/2006 Art. 8.2",
                title = "Skraćeni dnevni odmor (< 9h)",
                description = "Dnevni odmor je iznosio 8 sati i 30 minuta umesto minimalnih 9 sati (dozvoljeno maks. 3 puta nedeljno).",
                occurredDate = "2026-08-08 05:30",
                excessMinutes = 30,
                severity = "VERY_SERIOUS",
                fineRange = "300 € - 600 € (RS: 35.000 RSD)",
                resolutionNote = "Nadoknaditi skraćeni odmor pre kraja treće naredne nedelje."
            )
        )
        tachoDao.insertInfringements(initialInfringements)

        val initialDownloads = listOf(
            DownloadEntity(
                fileName = "C_20260818_1120_M_Petrovic.DDD",
                fileType = "DRIVER_CARD",
                driverName = "Marko Petrović",
                cardOrVin = "SRB000004928190001",
                vehiclePlate = "BG-1842-TX",
                downloadTimestamp = System.currentTimeMillis() - 3600000 * 4,
                periodDays = 3,
                fileSizeKb = 38,
                sha256Hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                isArchived = true,
                licenseModeUsed = "PRO_2_MONTHS"
            ),
            DownloadEntity(
                fileName = "M_20260815_0915_BG1842TX.DDD",
                fileType = "VEHICLE_UNIT",
                driverName = "Tahograf Masa (VU)",
                cardOrVin = "WDB9634031L894210",
                vehiclePlate = "BG-1842-TX",
                downloadTimestamp = System.currentTimeMillis() - 86400000 * 3,
                periodDays = 60,
                fileSizeKb = 412,
                sha256Hash = "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
                isArchived = true,
                licenseModeUsed = "PRO_2_MONTHS"
            )
        )
        initialDownloads.forEach { tachoDao.insertDownload(it) }

        val initialShift = ShiftEntity(
            driverName = "Marko Petrović",
            cardNumber = "SRB000004928190001",
            slotNumber = 1,
            shiftStartTime = System.currentTimeMillis() - 6 * 3600 * 1000L,
            startCountry = "SRB",
            startOdometerKm = 482400,
            vehiclePlate = "BG-1842-TX",
            totalDriveMinutes = 390,
            totalWorkMinutes = 60,
            totalRestMinutes = 45,
            isActive = true
        )
        tachoDao.insertShift(initialShift)
    }
}
