package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.Bed
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.local.ShiftEntity
import com.example.data.model.EuTachoConstants
import com.example.data.model.LicenseTier
import com.example.data.model.TachoActivityType
import com.example.data.model.TachoLiveTelemetry
import com.example.ui.components.TachographCardSlotWidget
import com.example.ui.theme.ActivityDrive
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.DirectionsBoat
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.Shield
import com.example.ui.theme.ActivityPoa
import com.example.ui.theme.ActivityRest
import com.example.ui.theme.ActivityWork
import com.example.ui.theme.AlertGreen
import com.example.ui.theme.AlertRed
import com.example.ui.theme.AlertYellow
import com.example.ui.theme.DarkBg
import com.example.ui.theme.DarkOutline
import com.example.ui.theme.DarkSurface
import com.example.ui.theme.DarkSurfaceSubtle
import com.example.ui.theme.DarkSurfaceVariant
import com.example.ui.theme.DemoYellow
import com.example.ui.theme.ElegantBlue
import com.example.ui.theme.ElegantBlueOn
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary

@Composable
fun DashboardScreen(
    telemetry: TachoLiveTelemetry,
    licenseTier: LicenseTier,
    activeShift: ShiftEntity?,
    onSetActivity: (TachoActivityType) -> Unit,
    onToggleTripSimulation: () -> Unit,
    onToggleHighSpeedDemo: () -> Unit,
    onToggleContinuousDriveDemo: () -> Unit,
    onManageSlot1: () -> Unit,
    onManageSlot2: () -> Unit,
    onNavigateDownload: () -> Unit,
    onOpenUpgradeModal: () -> Unit,
    onScanBt: () -> Unit,
    onOpenFerryDialog: () -> Unit = {},
    onOpenWeeklyRestDialog: () -> Unit = {},
    onOpenBorderDialog: () -> Unit = {},
    onOpenInspectionDialog: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val scrollState = rememberScrollState()

    val isSpeedOver90 = telemetry.speedKmH > EuTachoConstants.MAX_SPEED_KMH
    val isContinuousOver4h30 = telemetry.continuousDrivingSeconds > EuTachoConstants.MAX_CONTINUOUS_DRIVE_SECONDS

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Critical Red Alert Banners if EU Limits are Exceeded
        if (isSpeedOver90) {
            Card(
                colors = CardDefaults.cardColors(containerColor = AlertRed.copy(alpha = 0.22f)),
                shape = RoundedCornerShape(20.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(2.dp, AlertRed, RoundedCornerShape(20.dp))
                    .testTag("speed_violation_banner")
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(14.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = null,
                        tint = AlertRed,
                        modifier = Modifier.size(28.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = "PREKORAČENJE BRZINE: ${telemetry.speedKmH} km/h",
                            color = AlertRed,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Black
                        )
                        Text(
                            text = "Zakon EU 92/6/EEC: Maksimalna dozvoljena brzina za autobuse/kamione je 90 km/h!",
                            color = TextPrimary,
                            fontSize = 11.sp
                        )
                    }
                }
            }
        }

        if (isContinuousOver4h30) {
            val contHours = telemetry.continuousDrivingSeconds / 3600
            val contMins = (telemetry.continuousDrivingSeconds % 3600) / 60
            Card(
                colors = CardDefaults.cardColors(containerColor = AlertRed.copy(alpha = 0.22f)),
                shape = RoundedCornerShape(20.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(2.dp, AlertRed, RoundedCornerShape(20.dp))
                    .testTag("drive_time_violation_banner")
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(14.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Timer,
                        contentDescription = null,
                        tint = AlertRed,
                        modifier = Modifier.size(28.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = "PREKORAČENJE VOŽNJE: ${contHours}h ${contMins}m (> 4h 30m)",
                            color = AlertRed,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Black
                        )
                        Text(
                            text = "Uredba EC 561/2006 Art. 7: Obavezna pauza od 45 minuta odmah!",
                            color = TextPrimary,
                            fontSize = 11.sp
                        )
                    }
                }
            }
        }

        if (telemetry.isDrivingWithoutCard) {
            Card(
                colors = CardDefaults.cardColors(containerColor = AlertRed.copy(alpha = 0.25f)),
                shape = RoundedCornerShape(20.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(2.dp, AlertRed, RoundedCornerShape(20.dp))
                    .testTag("no_card_warning_banner")
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(14.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.CreditCard,
                        contentDescription = null,
                        tint = AlertRed,
                        modifier = Modifier.size(28.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "VOŽNJA BEZ KARTICE VOZAČA!",
                            color = AlertRed,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Black
                        )
                        Text(
                            text = "Težak prekršaj (EU 165/2014). Ubacite karticu za početak smene.",
                            color = TextPrimary,
                            fontSize = 11.sp
                        )
                    }
                    Button(
                        onClick = onManageSlot1,
                        colors = ButtonDefaults.buttonColors(containerColor = AlertRed, contentColor = Color.White),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("Ubaci", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // =========================================================================
        // HIGH-END UNIFIED TELEMATICS COCKPIT ("SVE U JEDNOM POLJU SA LINIJAMA KOJE SE PUNE")
        // =========================================================================
        Card(
            colors = CardDefaults.cardColors(containerColor = DarkSurface),
            shape = RoundedCornerShape(26.dp),
            modifier = Modifier
                .fillMaxWidth()
                .border(
                    width = 1.dp,
                    color = if (isSpeedOver90 || isContinuousOver4h30) AlertRed else DarkOutline,
                    shape = RoundedCornerShape(26.dp)
                )
                .testTag("vehicle_status_card")
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Top HUD Row: Vehicle Info & High-Tech Speed
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Left: Vehicle details + Status badge
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .background(
                                        color = if (telemetry.speedKmH == 0) AlertGreen else ElegantBlue,
                                        shape = CircleShape
                                    )
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "${telemetry.truckPlate} • ${telemetry.tachoModel}",
                                color = TextPrimary,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                        Spacer(modifier = Modifier.height(3.dp))
                        Text(
                            text = if (telemetry.speedKmH == 0) "VOZILO U MIROVANJU (SPREMNO)" else "VOZILO U POKRETU",
                            color = if (telemetry.speedKmH == 0) AlertGreen else if (isSpeedOver90) AlertRed else ElegantBlue,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 0.6.sp
                        )
                    }

                    // Right: High-Tech Digital Speed readout
                    Row(
                        verticalAlignment = Alignment.Bottom,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(
                            text = "${telemetry.speedKmH}",
                            fontSize = 38.sp,
                            fontWeight = FontWeight.Black,
                            color = if (isSpeedOver90) AlertRed else Color.White,
                            fontFamily = FontFamily.Monospace,
                            lineHeight = 38.sp
                        )
                        Column(modifier = Modifier.padding(bottom = 4.dp)) {
                            Text(
                                text = "km/h",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isSpeedOver90) AlertRed else TextMuted
                            )
                        }
                    }
                }

                // Speed Progress Line (0 to 120 km/h, marker at 90 km/h)
                Column {
                    val speedProgress = (telemetry.speedKmH / 120f).coerceIn(0f, 1f)
                    val animatedSpeedProgress by animateFloatAsState(
                        targetValue = speedProgress,
                        animationSpec = tween(durationMillis = 300, easing = FastOutSlowInEasing),
                        label = "speed_progress"
                    )

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp)
                            .clip(RoundedCornerShape(3.dp))
                            .background(DarkBg)
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxHeight()
                                .fillMaxWidth(animatedSpeedProgress)
                                .clip(RoundedCornerShape(3.dp))
                                .background(
                                    brush = Brush.horizontalGradient(
                                        colors = if (isSpeedOver90)
                                            listOf(AlertRed, Color(0xFFFF1E1E))
                                        else
                                            listOf(ElegantBlue, Color(0xFF38BDF8))
                                    )
                                )
                        )
                    }
                    Spacer(modifier = Modifier.height(2.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("0 km/h", color = TextMuted, fontSize = 9.sp)
                        Text(
                            text = "LIMIT 90 KM/H (EU 92/6)",
                            color = if (isSpeedOver90) AlertRed else TextMuted,
                            fontSize = 9.sp,
                            fontWeight = if (isSpeedOver90) FontWeight.Bold else FontWeight.Normal
                        )
                        Text("120", color = TextMuted, fontSize = 9.sp)
                    }
                }

                // Subtle Glowing Divider
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(1.dp)
                        .background(DarkOutline)
                )

                // =========================================================================
                // LINIJE KOJE SE PUNE (PROGRESS BARS FOR CONTINUOUS DRIVE, DAILY DRIVE, SHIFT)
                // =========================================================================

                // Line 1: Kontinuirana Vožnja & Preostalo do Pauze (Maks 4h 30m = 16200s)
                val maxContinuous = EuTachoConstants.MAX_CONTINUOUS_DRIVE_SECONDS.toFloat()
                val contSecs = telemetry.continuousDrivingSeconds.toFloat()
                val contFraction = (contSecs / maxContinuous).coerceIn(0f, 1f)
                val animatedContFraction by animateFloatAsState(
                    targetValue = contFraction,
                    animationSpec = tween(durationMillis = 400),
                    label = "cont_fraction"
                )

                val remBreakHours = telemetry.remainingUntilBreakSeconds / 3600
                val remBreakMins = (telemetry.remainingUntilBreakSeconds % 3600) / 60
                val contH = telemetry.continuousDrivingSeconds / 3600
                val contM = (telemetry.continuousDrivingSeconds % 3600) / 60

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("card_next_break_in")
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Timer,
                                contentDescription = null,
                                tint = if (isContinuousOver4h30) AlertRed else ActivityDrive,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "KONTINUIRANA VOŽNJA (DO PAUZE 45M)",
                                color = if (isContinuousOver4h30) AlertRed else TextSecondary,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 0.5.sp
                            )
                        }
                        Text(
                            text = if (isContinuousOver4h30)
                                "PREKORAČENO ${String.format("%02d:%02d", contH, contM)}"
                            else
                                "${String.format("%02d:%02d", contH, contM)} / 04:30 (Još ${String.format("%02d:%02d", remBreakHours, remBreakMins)})",
                            color = if (isContinuousOver4h30) AlertRed else Color.White,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    // Dynamic Filling Bar
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(10.dp)
                            .clip(RoundedCornerShape(5.dp))
                            .background(DarkBg)
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxHeight()
                                .fillMaxWidth(if (isContinuousOver4h30) 1f else animatedContFraction)
                                .clip(RoundedCornerShape(5.dp))
                                .background(
                                    brush = Brush.horizontalGradient(
                                        colors = when {
                                            isContinuousOver4h30 -> listOf(AlertRed, Color(0xFFFF1E1E))
                                            contFraction > 0.85f -> listOf(ActivityDrive, AlertYellow)
                                            else -> listOf(ActivityDrive, Color(0xFF10B981))
                                        }
                                    )
                                )
                        )
                    }
                }

                // Line 2: Dnevna Vožnja (EU Limit 9h = 32400s / Maks 10h)
                val maxDaily = EuTachoConstants.REGULAR_DAILY_DRIVE_SECONDS.toFloat()
                val dailySecs = telemetry.dailyDrivingSeconds.toFloat()
                val dailyFraction = (dailySecs / maxDaily).coerceIn(0f, 1f)
                val animatedDailyFraction by animateFloatAsState(
                    targetValue = dailyFraction,
                    animationSpec = tween(durationMillis = 400),
                    label = "daily_fraction"
                )

                val dailyH = telemetry.dailyDrivingSeconds / 3600
                val dailyM = (telemetry.dailyDrivingSeconds % 3600) / 60
                val remDailyH = telemetry.remainingDailyDriveSeconds / 3600
                val remDailyM = (telemetry.remainingDailyDriveSeconds % 3600) / 60
                val isDailyOver9h = telemetry.dailyDrivingSeconds > EuTachoConstants.REGULAR_DAILY_DRIVE_SECONDS

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("card_driving_time_left")
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.LocalShipping,
                                contentDescription = null,
                                tint = if (isDailyOver9h) AlertYellow else ElegantBlue,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "DNEVNA VOŽNJA (EU MAKS 9H / 10H)",
                                color = if (isDailyOver9h) AlertYellow else TextSecondary,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 0.5.sp
                            )
                        }
                        Text(
                            text = "${String.format("%02d:%02d", dailyH, dailyM)} / 09:00 (Preostalo ${String.format("%02d:%02d", remDailyH, remDailyM)})",
                            color = if (isDailyOver9h) AlertYellow else Color.White,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    // Dynamic Filling Bar
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(10.dp)
                            .clip(RoundedCornerShape(5.dp))
                            .background(DarkBg)
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxHeight()
                                .fillMaxWidth(animatedDailyFraction)
                                .clip(RoundedCornerShape(5.dp))
                                .background(
                                    brush = Brush.horizontalGradient(
                                        colors = if (isDailyOver9h)
                                            listOf(AlertYellow, Color(0xFFF59E0B))
                                        else
                                            listOf(ElegantBlue, Color(0xFF38BDF8))
                                    )
                                )
                        )
                    }
                }

                // Line 3: Dnevna Smena & Ukupno Radno Vreme (Maks 13h / 15h)
                val maxShift = (13 * 3600).toFloat()
                val shiftSecs = telemetry.currentShiftWorkingSeconds.toFloat()
                val shiftFraction = (shiftSecs / maxShift).coerceIn(0f, 1f)
                val animatedShiftFraction by animateFloatAsState(
                    targetValue = shiftFraction,
                    animationSpec = tween(durationMillis = 400),
                    label = "shift_fraction"
                )

                val shiftH = telemetry.currentShiftWorkingSeconds / 3600
                val shiftM = (telemetry.currentShiftWorkingSeconds % 3600) / 60

                Column(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.AccessTime,
                                contentDescription = null,
                                tint = ActivityWork,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "DNEVNA SMENA & UKUPAN RAD",
                                color = TextSecondary,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 0.5.sp
                            )
                        }
                        Text(
                            text = "${String.format("%02d", shiftH)}h ${String.format("%02d", shiftM)}m / 13h (${(shiftFraction * 100).toInt()}%)",
                            color = Color.White,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    // Dynamic Filling Bar
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(10.dp)
                            .clip(RoundedCornerShape(5.dp))
                            .background(DarkBg)
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxHeight()
                                .fillMaxWidth(animatedShiftFraction)
                                .clip(RoundedCornerShape(5.dp))
                                .background(
                                    brush = Brush.horizontalGradient(
                                        colors = listOf(ActivityWork, Color(0xFFF59E0B))
                                    )
                                )
                        )
                    }
                }

                // Line 4: Obavezna Pauza / Odmor (45m kompletirano)
                Column(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Bed,
                                contentDescription = null,
                                tint = ActivityRest,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "OBAVEZNA PAUZA / ODMOR",
                                color = TextSecondary,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 0.5.sp
                            )
                        }
                        Text(
                            text = "45 MIN (ČLAN 7. EC 561)",
                            color = ActivityRest,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    // Dynamic Filling Bar
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(10.dp)
                            .clip(RoundedCornerShape(5.dp))
                            .background(DarkBg)
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxHeight()
                                .fillMaxWidth(1f)
                                .clip(RoundedCornerShape(5.dp))
                                .background(
                                    brush = Brush.horizontalGradient(
                                        colors = listOf(ActivityRest, Color(0xFF8B5CF6))
                                    )
                                )
                        )
                    }
                }

                // Subtle Glowing Divider before Activity Selector
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(1.dp)
                        .background(DarkOutline)
                )

                // =========================================================================
                // INTEGRISANI PREBACIVAČ AKTIVNOSTI VOZAČA (HIGH-END SEGMENTED PILLS)
                // =========================================================================
                Column {
                    Text(
                        text = "TRENUTNI REŽIM VOZAČA:",
                        color = TextMuted,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 0.8.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        TachoActivityType.values().forEach { type ->
                            val isSelected = telemetry.currentActivity == type
                            val activeBgColor = when (type) {
                                TachoActivityType.DRIVING -> ActivityDrive
                                TachoActivityType.WORK -> ActivityWork
                                TachoActivityType.AVAILABILITY -> ActivityPoa
                                TachoActivityType.REST -> ActivityRest
                            }

                            Surface(
                                color = if (isSelected) activeBgColor.copy(alpha = 0.25f) else DarkBg,
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier
                                    .weight(1f)
                                    .border(
                                        width = if (isSelected) 2.dp else 1.dp,
                                        color = if (isSelected) activeBgColor else DarkOutline,
                                        shape = RoundedCornerShape(14.dp)
                                    )
                                    .clip(RoundedCornerShape(14.dp))
                                    .clickable { onSetActivity(type) }
                                    .testTag("act_btn_${type.name}")
                            ) {
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    modifier = Modifier.padding(vertical = 10.dp, horizontal = 2.dp)
                                ) {
                                    Text(
                                        text = type.symbol,
                                        fontSize = 16.sp,
                                        color = if (isSelected) activeBgColor else TextMuted,
                                        fontWeight = FontWeight.Black
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = type.labelSr,
                                        fontSize = 10.sp,
                                        fontWeight = if (isSelected) FontWeight.Black else FontWeight.Medium,
                                        color = if (isSelected) Color.White else TextMuted
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // EU Regulatory Tools (Ferry Mode, Weekly Rest, Border Crossing, Roadside Inspection)
        Card(
            colors = CardDefaults.cardColors(containerColor = DarkSurface),
            shape = RoundedCornerShape(20.dp),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, DarkOutline, RoundedCornerShape(20.dp))
                .testTag("eu_regulatory_tools_card")
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Shield,
                            contentDescription = null,
                            tint = ElegantBlue,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "EU 561 REGULATORNI ALATI",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            color = TextPrimary,
                            letterSpacing = 0.5.sp
                        )
                    }
                    Surface(
                        color = DarkSurfaceSubtle,
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text(
                            text = "MOBILITY PACKAGE 1",
                            fontSize = 8.sp,
                            fontWeight = FontWeight.Bold,
                            color = ElegantBlue,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // 1. Ferry / Train Mode
                    Surface(
                        color = if (telemetry.ferryMode.isActive) AlertGreen.copy(alpha = 0.2f) else DarkBg,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier
                            .weight(1f)
                            .border(
                                1.dp,
                                if (telemetry.ferryMode.isActive) AlertGreen else DarkOutline,
                                RoundedCornerShape(14.dp)
                            )
                            .clip(RoundedCornerShape(14.dp))
                            .clickable { onOpenFerryDialog() }
                            .testTag("open_ferry_dialog_btn")
                    ) {
                        Column(
                            modifier = Modifier.padding(10.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                imageVector = Icons.Default.DirectionsBoat,
                                contentDescription = null,
                                tint = if (telemetry.ferryMode.isActive) AlertGreen else ElegantBlue,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Trajekt/Voz",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Text(
                                text = if (telemetry.ferryMode.isActive) "AKTIVAN" else "Član 9.",
                                fontSize = 9.sp,
                                color = if (telemetry.ferryMode.isActive) AlertGreen else TextMuted
                            )
                        }
                    }

                    // 2. Weekly Rest & Compensation
                    Surface(
                        color = if (!telemetry.weeklyRest.isCompensated) AlertYellow.copy(alpha = 0.15f) else DarkBg,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier
                            .weight(1f)
                            .border(
                                1.dp,
                                if (!telemetry.weeklyRest.isCompensated) AlertYellow else DarkOutline,
                                RoundedCornerShape(14.dp)
                            )
                            .clip(RoundedCornerShape(14.dp))
                            .clickable { onOpenWeeklyRestDialog() }
                            .testTag("open_weekly_rest_dialog_btn")
                    ) {
                        Column(
                            modifier = Modifier.padding(10.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                imageVector = Icons.Default.DateRange,
                                contentDescription = null,
                                tint = if (!telemetry.weeklyRest.isCompensated) AlertYellow else ElegantBlue,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Nedeljni Odmor",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Text(
                                text = if (!telemetry.weeklyRest.isCompensated) "Dug: 21h" else "Usklađeno",
                                fontSize = 9.sp,
                                color = if (!telemetry.weeklyRest.isCompensated) AlertYellow else AlertGreen
                            )
                        }
                    }

                    // 3. Border Crossing
                    Surface(
                        color = DarkBg,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier
                            .weight(1f)
                            .border(1.dp, DarkOutline, RoundedCornerShape(14.dp))
                            .clip(RoundedCornerShape(14.dp))
                            .clickable { onOpenBorderDialog() }
                            .testTag("open_border_dialog_btn")
                    ) {
                        Column(
                            modifier = Modifier.padding(10.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                imageVector = Icons.Default.Flag,
                                contentDescription = null,
                                tint = ElegantBlue,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Granica",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Text(
                                text = "Uneto: ${telemetry.currentCountry}",
                                fontSize = 9.sp,
                                color = ElegantBlue
                            )
                        }
                    }

                    // 4. Roadside Inspection Report
                    Surface(
                        color = ElegantBlue.copy(alpha = 0.15f),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier
                            .weight(1f)
                            .border(1.dp, ElegantBlue, RoundedCornerShape(14.dp))
                            .clip(RoundedCornerShape(14.dp))
                            .clickable { onOpenInspectionDialog() }
                            .testTag("open_inspection_dialog_btn")
                    ) {
                        Column(
                            modifier = Modifier.padding(10.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                imageVector = Icons.Default.Shield,
                                contentDescription = null,
                                tint = AlertGreen,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Inspekcija",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Text(
                                text = "28/56D Izv.",
                                fontSize = 9.sp,
                                color = AlertGreen
                            )
                        }
                    }
                }
            }
        }

        // Tachograph Card Slots (Driver Identification & Shift Management)
        TachographCardSlotWidget(
            driver1 = telemetry.driver1,
            driver2 = telemetry.driver2,
            onManageSlot1 = onManageSlot1,
            onManageSlot2 = onManageSlot2
        )

        // Connected Vehicle & Bluetooth Info Quick Bar
        Card(
            colors = CardDefaults.cardColors(containerColor = DarkSurface),
            shape = RoundedCornerShape(20.dp),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, DarkOutline, RoundedCornerShape(20.dp))
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        text = "Fabrički Ugrađeni Bluetooth (Smart 2)",
                        color = TextSecondary,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = "VIN: ${telemetry.truckVin} • Država: ${telemetry.currentCountry}",
                        color = TextMuted,
                        fontSize = 10.sp
                    )
                }

                Button(
                    onClick = onScanBt,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = ElegantBlue,
                        contentColor = ElegantBlueOn
                    ),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.testTag("rescan_btn")
                ) {
                    Text(
                        text = "SKENIRAJ BT",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        // Interactive Simulation Quick Toggles (For Screenshots & Regulation Testing)
        Card(
            colors = CardDefaults.cardColors(containerColor = DarkBg),
            shape = RoundedCornerShape(20.dp),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, DarkOutline, RoundedCornerShape(20.dp))
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Text(
                    text = "Testiranje EU 561 i Brzinskih Alarma (Screenshot Režim)",
                    color = TextSecondary,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = onToggleHighSpeedDemo,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.outlinedButtonColors(
                            containerColor = if (isSpeedOver90) AlertRed.copy(alpha = 0.2f) else Color.Transparent
                        )
                    ) {
                        Text(
                            text = if (isSpeedOver90) "Brzina 94 km/h (Crveno)" else "Simuliraj >90 km/h",
                            color = if (isSpeedOver90) AlertRed else TextPrimary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    OutlinedButton(
                        onClick = onToggleContinuousDriveDemo,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.outlinedButtonColors(
                            containerColor = if (isContinuousOver4h30) AlertRed.copy(alpha = 0.2f) else Color.Transparent
                        )
                    ) {
                        Text(
                            text = if (isContinuousOver4h30) "Vožnja 4h38m (Crveno)" else "Simuliraj >4h30m",
                            color = if (isContinuousOver4h30) AlertRed else TextPrimary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        // Demo vs Pro Upgrade Banner
        Card(
            colors = CardDefaults.cardColors(containerColor = Color.Transparent),
            shape = RoundedCornerShape(24.dp),
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    brush = Brush.linearGradient(
                        colors = listOf(DarkSurfaceSubtle, DarkBg)
                    ),
                    shape = RoundedCornerShape(24.dp)
                )
                .border(1.dp, DarkOutline, RoundedCornerShape(24.dp))
                .testTag("upgrade_promo_banner")
        ) {
            Column(modifier = Modifier.padding(18.dp)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Surface(
                        color = if (licenseTier == LicenseTier.DEMO_3_DAYS) DemoYellow else ElegantBlue,
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text(
                            text = if (licenseTier == LicenseTier.DEMO_3_DAYS) "DEMO (3 DANA)" else "PUNA VERZIJA (PRO 14.99 €)",
                            color = Color.Black,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Black,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                    Text(
                        text = if (licenseTier == LicenseTier.DEMO_3_DAYS) "Osnovno Očitavanje" else "Kompletna Arhiva & .DDD",
                        color = Color.White,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium
                    )
                }

                Spacer(modifier = Modifier.height(6.dp))

                Text(
                    text = if (licenseTier == LicenseTier.DEMO_3_DAYS)
                        "Demo režim: Prikazuje samo osnovno za 3 dana bez trajnog memorisanja. Pređite na doživotnu Pro licencu (14.99 €) za trajno čuvanje i izvoz .DDD fajlova."
                    else
                        "Puna verzija aktivna: Sva očitavanja kartica i tahografa se trajno čuvaju sa RSA digitalnim potpisom.",
                    color = TextSecondary,
                    fontSize = 12.sp,
                    lineHeight = 16.sp
                )

                Spacer(modifier = Modifier.height(14.dp))

                Button(
                    onClick = onOpenUpgradeModal,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = ElegantBlue,
                        contentColor = ElegantBlueOn
                    ),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(44.dp)
                        .testTag("full_access_btn")
                ) {
                    Icon(
                        imageVector = Icons.Default.WorkspacePremium,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (licenseTier == LicenseTier.DEMO_3_DAYS) "AKTIVIRAJ PUNU VERZIJU (14.99 € JEDNOKRATNO)" else "UPRAVLJANJE LICENCOM",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.5.sp
                    )
                }
            }
        }

        // Action Buttons Row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Button(
                onClick = onNavigateDownload,
                colors = ButtonDefaults.buttonColors(
                    containerColor = DarkSurface,
                    contentColor = TextPrimary
                ),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier
                    .weight(1f)
                    .height(44.dp)
                    .border(1.dp, DarkOutline, RoundedCornerShape(16.dp))
                    .testTag("download_ddd_shortcut")
            ) {
                Icon(
                    imageVector = Icons.Default.Download,
                    contentDescription = null,
                    tint = ElegantBlue,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text("Preuzmi .DDD", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            }

            OutlinedButton(
                onClick = onToggleTripSimulation,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier
                    .weight(1f)
                    .height(44.dp)
                    .border(1.dp, DarkOutline, RoundedCornerShape(16.dp))
                    .testTag("sim_toggle_btn")
            ) {
                Icon(
                    imageVector = Icons.Default.PlayArrow,
                    contentDescription = null,
                    tint = ElegantBlue,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text("Simulacija", color = TextPrimary, fontSize = 12.sp)
            }
        }
    }
}
