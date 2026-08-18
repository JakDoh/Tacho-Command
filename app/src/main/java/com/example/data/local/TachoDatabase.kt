package com.example.data.local

import androidx.room.Dao
import androidx.room.Database
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.RoomDatabase
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface TachoDao {
    // Downloads
    @Query("SELECT * FROM tacho_downloads ORDER BY downloadTimestamp DESC")
    fun getAllDownloads(): Flow<List<DownloadEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertDownload(download: DownloadEntity): Long

    @Query("DELETE FROM tacho_downloads WHERE id = :id")
    suspend fun deleteDownload(id: Long)

    @Query("DELETE FROM tacho_downloads WHERE isArchived = 0")
    suspend fun clearNonArchivedDemoDownloads()

    // Activities
    @Query("SELECT * FROM tacho_activities ORDER BY eventDate DESC, startTime ASC")
    fun getAllActivities(): Flow<List<ActivityEntity>>

    @Query("SELECT * FROM tacho_activities WHERE eventDate = :date ORDER BY startTime ASC")
    fun getActivitiesForDate(date: String): Flow<List<ActivityEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertActivities(activities: List<ActivityEntity>)

    // Infringements
    @Query("SELECT * FROM tacho_infringements ORDER BY id DESC")
    fun getAllInfringements(): Flow<List<InfringementEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertInfringements(infringements: List<InfringementEntity>)

    @Query("DELETE FROM tacho_infringements")
    suspend fun clearInfringements()

    // Driver Shifts (Driver Identification & Card Management)
    @Query("SELECT * FROM driver_shifts ORDER BY shiftStartTime DESC")
    fun getAllShifts(): Flow<List<ShiftEntity>>

    @Query("SELECT * FROM driver_shifts WHERE isActive = 1 ORDER BY shiftStartTime DESC LIMIT 1")
    fun getActiveShift(): Flow<ShiftEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertShift(shift: ShiftEntity): Long

    @Update
    suspend fun updateShift(shift: ShiftEntity)

    @Query("UPDATE driver_shifts SET isActive = 0, shiftEndTime = :endTime, endCountry = :endCountry, endOdometerKm = :endOdo WHERE isActive = 1")
    suspend fun closeActiveShifts(endTime: Long, endCountry: String, endOdo: Long)
}

@Database(
    entities = [DownloadEntity::class, ActivityEntity::class, InfringementEntity::class, ShiftEntity::class],
    version = 2,
    exportSchema = false
)
abstract class TachoDatabase : RoomDatabase() {
    abstract fun tachoDao(): TachoDao
}
