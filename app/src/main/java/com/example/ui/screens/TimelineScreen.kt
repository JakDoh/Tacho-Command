package com.example.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.local.ActivityEntity
import com.example.data.model.LicenseTier
import com.example.data.model.TachoActivityType
import com.example.ui.theme.ActivityDrive
import com.example.ui.theme.ActivityPoa
import com.example.ui.theme.ActivityRest
import com.example.ui.theme.ActivityWork
import com.example.ui.theme.DarkBg
import com.example.ui.theme.DarkOutline
import com.example.ui.theme.DarkSurface
import com.example.ui.theme.DarkSurfaceSubtle
import com.example.ui.theme.DemoYellow
import com.example.ui.theme.ElegantBlue
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary

@Composable
fun TimelineScreen(
    activities: List<ActivityEntity>,
    selectedDate: String,
    licenseTier: LicenseTier,
    onSelectDate: (String) -> Unit,
    onOpenUpgradeModal: () -> Unit,
    modifier: Modifier = Modifier
) {
    val sampleDays = listOf(
        Pair("2026-08-18", "Danas (18. Avg)"),
        Pair("2026-08-17", "Juče (17. Avg)"),
        Pair("2026-08-16", "16. Avg (Pre 2 dana)"),
        Pair("2026-08-04", "04. Avg (Pre 2 nedelje)"),
        Pair("2026-07-22", "22. Jul (Pre 1 mesec)")
    )

    val currentDayActivities = activities.filter { it.eventDate == selectedDate }

    // Aggregate totals for the selected date
    val drivingMinutes = currentDayActivities.filter { it.activityType == "DRIVING" }.sumOf { it.durationMinutes }
    val workMinutes = currentDayActivities.filter { it.activityType == "WORK" }.sumOf { it.durationMinutes }
    val restMinutes = currentDayActivities.filter { it.activityType == "REST" }.sumOf { it.durationMinutes }
    val poaMinutes = currentDayActivities.filter { it.activityType == "AVAILABILITY" }.sumOf { it.durationMinutes }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Date Selector Carousel
        item {
            Text(
                text = "Izbor datuma (EU 24h tahografski listić)",
                color = TextSecondary,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium
            )
            Spacer(modifier = Modifier.height(8.dp))

            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                items(sampleDays) { (dateStr, label) ->
                    val isSelected = selectedDate == dateStr
                    val isLocked = licenseTier == LicenseTier.DEMO_3_DAYS && dateStr !in listOf("2026-08-18", "2026-08-17", "2026-08-16")

                    Surface(
                        color = if (isSelected) ElegantBlue else (if (isLocked) DarkBg else DarkSurface),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier
                            .border(1.dp, if (isSelected) ElegantBlue else DarkOutline, RoundedCornerShape(16.dp))
                            .clip(RoundedCornerShape(16.dp))
                            .clickable {
                                if (isLocked) onOpenUpgradeModal() else onSelectDate(dateStr)
                            }
                            .testTag("date_pill_$dateStr")
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                        ) {
                            Icon(
                                imageVector = if (isLocked) Icons.Default.Lock else Icons.Default.CalendarToday,
                                contentDescription = null,
                                tint = if (isSelected) Color.Black else (if (isLocked) DemoYellow else TextMuted),
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = label,
                                color = if (isSelected) Color.Black else (if (isLocked) TextMuted else TextPrimary),
                                fontSize = 12.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                            )
                        }
                    }
                }
            }
        }

        // 24-Hour Continuous Tachograph Activity Bar Chart (Analog/Digital style)
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = DarkSurface),
                shape = RoundedCornerShape(24.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, DarkOutline, RoundedCornerShape(24.dp))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Grafikon aktivnosti (00:00 - 24:00)",
                        color = TextPrimary,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(14.dp))

                    // 24h Bar Canvas
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(DarkBg)
                            .border(1.dp, DarkOutline, RoundedCornerShape(12.dp))
                    ) {
                        Canvas(modifier = Modifier.fillMaxSize()) {
                            val totalDayMinutes = 24 * 60f

                            currentDayActivities.forEach { act ->
                                val startParts = act.startTime.split(":")
                                val endParts = act.endTime.split(":")
                                val startMins = (startParts.getOrNull(0)?.toIntOrNull() ?: 0) * 60 + (startParts.getOrNull(1)?.toIntOrNull() ?: 0)
                                val endMins = (endParts.getOrNull(0)?.toIntOrNull() ?: 24) * 60 + (endParts.getOrNull(1)?.toIntOrNull() ?: 0)

                                val leftRatio = startMins / totalDayMinutes
                                val widthRatio = (endMins - startMins) / totalDayMinutes

                                val actColor = when (act.activityType) {
                                    "DRIVING" -> ActivityDrive
                                    "WORK" -> ActivityWork
                                    "AVAILABILITY" -> ActivityPoa
                                    else -> ActivityRest
                                }

                                drawRect(
                                    color = actColor,
                                    topLeft = Offset(leftRatio * size.width, 0f),
                                    size = Size((widthRatio * size.width).coerceAtLeast(2f), size.height)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    // Hour Markers
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        listOf("00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00").forEach { marker ->
                            Text(
                                text = marker,
                                color = TextMuted,
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // Legend
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceAround
                    ) {
                        listOf(
                            Triple("Vožnja", ActivityDrive, "⯈"),
                            Triple("Rad", ActivityWork, "⚒"),
                            Triple("Pauza", ActivityRest, "🛏"),
                            Triple("Raspol.", ActivityPoa, "⧉")
                        ).forEach { (name, col, sym) ->
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(10.dp)
                                        .background(col, RoundedCornerShape(2.dp))
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "$sym $name",
                                    color = TextSecondary,
                                    fontSize = 11.sp
                                )
                            }
                        }
                    }
                }
            }
        }

        // Daily Statistics Summary Card
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = DarkSurface),
                shape = RoundedCornerShape(24.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, DarkOutline, RoundedCornerShape(24.dp))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Sumarni pregled za $selectedDate",
                        color = TextPrimary,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        StatBox("Ukupna Vožnja", "${drivingMinutes / 60}h ${drivingMinutes % 60}m", ActivityDrive, Modifier.weight(1f))
                        StatBox("Ostali Rad", "${workMinutes / 60}h ${workMinutes % 60}m", ActivityWork, Modifier.weight(1f))
                        StatBox("Dnevni Odmor", "${restMinutes / 60}h ${restMinutes % 60}m", ActivityRest, Modifier.weight(1f))
                    }
                }
            }
        }

        // Detailed Event List for the Selected Day
        item {
            Text(
                text = "Hronološki zapis aktivnosti tahografa",
                color = TextSecondary,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium
            )
        }

        items(currentDayActivities) { act ->
            val actType = when (act.activityType) {
                "DRIVING" -> TachoActivityType.DRIVING
                "WORK" -> TachoActivityType.WORK
                "AVAILABILITY" -> TachoActivityType.AVAILABILITY
                else -> TachoActivityType.REST
            }

            Card(
                colors = CardDefaults.cardColors(containerColor = DarkBg),
                shape = RoundedCornerShape(18.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, DarkOutline, RoundedCornerShape(18.dp))
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(14.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .background(actType.color.copy(alpha = 0.2f), CircleShape)
                            .border(1.dp, actType.color, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = actType.symbol,
                            color = actType.color,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = actType.labelSr,
                                color = TextPrimary,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = "${act.durationMinutes} min",
                                color = ElegantBlue,
                                fontSize = 13.sp,
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Text(
                            text = "${act.startTime} - ${act.endTime} • ${act.vehiclePlate} (${act.startOdometerKm} - ${act.endOdometerKm} km)",
                            color = TextMuted,
                            fontSize = 11.sp
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun StatBox(
    title: String,
    value: String,
    accentColor: Color,
    modifier: Modifier = Modifier
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = DarkBg),
        shape = RoundedCornerShape(16.dp),
        modifier = modifier.border(1.dp, DarkOutline, RoundedCornerShape(16.dp))
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            Text(text = title, color = TextMuted, fontSize = 10.sp, maxLines = 1)
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = value,
                color = accentColor,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace
            )
        }
    }
}
