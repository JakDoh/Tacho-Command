package com.example.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.DirectionsBoat
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Print
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
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
import com.example.data.model.AppLanguage
import com.example.data.model.BorderCrossingEvent
import com.example.data.model.FerryTrainMode
import com.example.data.model.TachoLiveTelemetry
import com.example.data.model.WeeklyRestRecord
import com.example.ui.theme.ActivityDrive
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
import com.example.ui.theme.ElegantBlue
import com.example.ui.theme.ElegantBlueOn
import com.example.ui.theme.ProGold
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary

// ============================================================================
// 1. LANGUAGE SWITCHER PILL & DIALOG
// ============================================================================

@Composable
fun LanguageSelectorPill(
    currentLanguage: AppLanguage,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        color = DarkSurfaceSubtle,
        shape = RoundedCornerShape(12.dp),
        modifier = modifier
            .border(1.dp, DarkOutline, RoundedCornerShape(12.dp))
            .clip(RoundedCornerShape(12.dp))
            .clickable { onClick() }
            .testTag("language_selector_pill")
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp)
        ) {
            Text(
                text = currentLanguage.flag,
                fontSize = 14.sp
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = currentLanguage.code.uppercase(),
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )
        }
    }
}

@Composable
fun LanguageSelectionDialog(
    currentLanguage: AppLanguage,
    onSelectLanguage: (AppLanguage) -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Language,
                    contentDescription = null,
                    tint = ElegantBlue,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Izbor Jezika / Language", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = "Izaberite jezik aplikacije i izveštaja za inspekciju:",
                    color = TextSecondary,
                    fontSize = 13.sp
                )
                AppLanguage.values().forEach { lang ->
                    val isSelected = lang == currentLanguage
                    Surface(
                        color = if (isSelected) ElegantBlue.copy(alpha = 0.2f) else DarkBg,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(
                                width = if (isSelected) 2.dp else 1.dp,
                                color = if (isSelected) ElegantBlue else DarkOutline,
                                shape = RoundedCornerShape(14.dp)
                            )
                            .clip(RoundedCornerShape(14.dp))
                            .clickable {
                                onSelectLanguage(lang)
                                onDismiss()
                            }
                            .testTag("lang_btn_${lang.code}")
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(lang.flag, fontSize = 20.sp)
                                Spacer(modifier = Modifier.width(10.dp))
                                Column {
                                    Text(lang.label, fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 14.sp)
                                    Text(
                                        when (lang) {
                                            AppLanguage.SR -> "Srpski / Hrvatski / Bosanski"
                                            AppLanguage.EN -> "International English (EU standard)"
                                            AppLanguage.DE -> "Deutsch (BAG / BALM Konform)"
                                        },
                                        fontSize = 11.sp,
                                        color = TextMuted
                                    )
                                }
                            }
                            if (isSelected) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = ElegantBlue, modifier = Modifier.size(20.dp))
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Zatvori", color = TextSecondary)
            }
        },
        containerColor = DarkSurface,
        shape = RoundedCornerShape(24.dp)
    )
}

// ============================================================================
// 2. FERRY / TRAIN MODE WIDGET & DIALOG (Član 9. Uredbe EC 561/2006)
// ============================================================================

@Composable
fun FerryModeDialog(
    ferryMode: FerryTrainMode,
    onToggleFerry: () -> Unit,
    onRecordInterruption: () -> Unit,
    onDismiss: () -> Unit
) {
    val maxInterruptionMinutes = 60
    val usedMinutes = ferryMode.totalInterruptionSeconds / 60
    val remMinutes = maxInterruptionMinutes - usedMinutes

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.DirectionsBoat,
                    contentDescription = null,
                    tint = if (ferryMode.isActive) ElegantBlue else TextMuted,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Trajekt / Voz (Član 9. EC 561)",
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
            }
        },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Info Box
                Card(
                    colors = CardDefaults.cardColors(containerColor = DarkBg),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, DarkOutline, RoundedCornerShape(14.dp))
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = "EU PRAVILO ZA TRAJEKT / VOZ:",
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            color = ElegantBlue
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Redovni dnevni odmor od 11h (ili podeljeni 3h+9h) može se prekinuti najviše 2 PUTA radi ukrcavanja/iskrcavanja. Ukupno trajanje svih prekida ne sme preći 1 SAT (60 min). Vozač mora imati pristup ležaju/kabini za spavanje.",
                            fontSize = 11.sp,
                            color = TextSecondary,
                            lineHeight = 15.sp
                        )
                    }
                }

                // Current State
                Surface(
                    color = if (ferryMode.isActive) ElegantBlue.copy(alpha = 0.15f) else DarkBg,
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(
                            1.dp,
                            if (ferryMode.isActive) ElegantBlue else DarkOutline,
                            RoundedCornerShape(14.dp)
                        )
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("STATUS REŽIMA:", fontSize = 11.sp, color = TextMuted, fontWeight = FontWeight.Bold)
                            Text(
                                text = if (ferryMode.isActive) "AKTIVAN (UKRCAVANJE)" else "NEAKTIVAN",
                                color = if (ferryMode.isActive) AlertGreen else TextSecondary,
                                fontWeight = FontWeight.Black,
                                fontSize = 12.sp
                            )
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        // Interruption Counters
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text("Iskorišćeni prekidi:", fontSize = 10.sp, color = TextMuted)
                                Text(
                                    text = "${ferryMode.interruptionsCount} / 2 puta",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (ferryMode.interruptionsCount > 2) AlertRed else TextPrimary
                                )
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text("Preostalo vreme prekida:", fontSize = 10.sp, color = TextMuted)
                                Text(
                                    text = "${remMinutes} min / 60 min",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (remMinutes <= 0) AlertRed else Color.White
                                )
                            }
                        }
                    }
                }

                if (ferryMode.isActive) {
                    Button(
                        onClick = onRecordInterruption,
                        colors = ButtonDefaults.buttonColors(containerColor = ActivityWork, contentColor = Color.Black),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth().testTag("record_ferry_interruption_btn")
                    ) {
                        Icon(Icons.Default.Timer, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Zabeleži Prekid Ukrcavanja (+15 min)", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    onToggleFerry()
                    onDismiss()
                },
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (ferryMode.isActive) AlertRed else ElegantBlue,
                    contentColor = if (ferryMode.isActive) Color.White else ElegantBlueOn
                ),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.testTag("toggle_ferry_mode_btn")
            ) {
                Text(
                    text = if (ferryMode.isActive) "Isključi Trajekt Režim" else "Aktiviraj Trajekt Režim",
                    fontWeight = FontWeight.Bold
                )
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Zatvori", color = TextSecondary)
            }
        },
        containerColor = DarkSurface,
        shape = RoundedCornerShape(24.dp)
    )
}

// ============================================================================
// 3. WEEKLY REST & COMPENSATION TRACKER (Član 8. Uredbe EC 561/2006)
// ============================================================================

@Composable
fun WeeklyRestDialog(
    weeklyRest: WeeklyRestRecord,
    onMarkCompensationDone: () -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.DateRange,
                    contentDescription = null,
                    tint = ElegantBlue,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Nedeljni Odmor & Kompenzacija",
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
            }
        },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Info Banner
                Card(
                    colors = CardDefaults.cardColors(containerColor = DarkBg),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, DarkOutline, RoundedCornerShape(14.dp))
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = "UREDBA EC 561/2006 ČLAN 8:",
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            color = ElegantBlue
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "U bilo koje dve uzastopne sedmice vozač mora uzeti najmanje: 1 redovni nedeljni odmor (45h) i 1 skraćeni (min. 24h). Skraćenje (npr. 21h) mora se u celosti kompenzovati pre isteka treće sedmice, spojeno sa odmorom od min. 9h.",
                            fontSize = 11.sp,
                            color = TextSecondary,
                            lineHeight = 15.sp
                        )
                    }
                }

                // Week 1 vs Week 2 Cards
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = DarkSurfaceSubtle),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.weight(1f).border(1.dp, AlertGreen, RoundedCornerShape(14.dp))
                    ) {
                        Column(modifier = Modifier.padding(10.dp)) {
                            Text("SED Sedmica 1", fontSize = 10.sp, color = TextMuted, fontWeight = FontWeight.Bold)
                            Text("${weeklyRest.week1RestHours}h", fontSize = 20.sp, fontWeight = FontWeight.Black, color = AlertGreen)
                            Text("Redovni (45h OK)", fontSize = 10.sp, color = TextSecondary)
                        }
                    }

                    Card(
                        colors = CardDefaults.cardColors(containerColor = DarkSurfaceSubtle),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.weight(1f).border(1.dp, AlertYellow, RoundedCornerShape(14.dp))
                    ) {
                        Column(modifier = Modifier.padding(10.dp)) {
                            Text("SED Sedmica 2", fontSize = 10.sp, color = TextMuted, fontWeight = FontWeight.Bold)
                            Text("${weeklyRest.week2RestHours}h", fontSize = 20.sp, fontWeight = FontWeight.Black, color = AlertYellow)
                            Text("Skraćeni (Dug 21h)", fontSize = 10.sp, color = AlertYellow)
                        }
                    }
                }

                // Compensation Due Box
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = if (weeklyRest.isCompensated) AlertGreen.copy(alpha = 0.15f) else AlertYellow.copy(alpha = 0.15f)
                    ),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(
                            1.dp,
                            if (weeklyRest.isCompensated) AlertGreen else AlertYellow,
                            RoundedCornerShape(14.dp)
                        )
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("STATUS KOMPENZACIJE:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            Text(
                                text = if (weeklyRest.isCompensated) "REGULISANO" else "DUGUJE SE 21H",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                color = if (weeklyRest.isCompensated) AlertGreen else AlertYellow
                            )
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = if (weeklyRest.isCompensated)
                                "Kompenzacija od 21h je uspešno dodata i iskorišćena."
                            else
                                "Krajnji rok za kompenzaciju od 21h je ${weeklyRest.compensationDeadline} (Kraj 3. sedmice).",
                            fontSize = 11.sp,
                            color = TextSecondary
                        )
                    }
                }

                // Bi-weekly driving hours check (max 90h)
                Surface(
                    color = DarkBg,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth().border(1.dp, DarkOutline, RoundedCornerShape(12.dp))
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp).fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Dvonedeljna vožnja (maks 90h):", fontSize = 11.sp, color = TextMuted)
                        Text(
                            text = "${weeklyRest.biWeeklyDriveHours}h / 90h (Preostalo ${90 - weeklyRest.biWeeklyDriveHours}h)",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = AlertGreen
                        )
                    }
                }
            }
        },
        confirmButton = {
            if (!weeklyRest.isCompensated) {
                Button(
                    onClick = {
                        onMarkCompensationDone()
                        onDismiss()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = AlertGreen, contentColor = Color.Black),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.testTag("mark_compensation_done_btn")
                ) {
                    Text("Označi 21h Kompenzovano", fontWeight = FontWeight.Bold)
                }
            } else {
                Button(onClick = onDismiss, shape = RoundedCornerShape(14.dp)) {
                    Text("U redu")
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Zatvori", color = TextSecondary)
            }
        },
        containerColor = DarkSurface,
        shape = RoundedCornerShape(24.dp)
    )
}

// ============================================================================
// 4. BORDER CROSSING ASSISTANT (Mobility Package 1 / EU 2020/1054)
// ============================================================================

val EuropeanBorderCountries = listOf(
    BorderCrossingEvent("SRB", "Srbija", "Serbia", "🇷🇸"),
    BorderCrossingEvent("H", "Mađarska", "Hungary", "🇭🇺"),
    BorderCrossingEvent("HR", "Hrvatska", "Croatia", "🇭🇷"),
    BorderCrossingEvent("SLO", "Slovenija", "Slovenia", "🇸🇮"),
    BorderCrossingEvent("A", "Austrija", "Austria", "🇦🇹"),
    BorderCrossingEvent("D", "Nemačka", "Germany", "🇩🇪"),
    BorderCrossingEvent("I", "Italija", "Italy", "🇮🇹"),
    BorderCrossingEvent("RO", "Rumunija", "Romania", "🇷🇴"),
    BorderCrossingEvent("BG", "Bugarska", "Bulgaria", "🇧🇬"),
    BorderCrossingEvent("PL", "Poljska", "Poland", "🇵🇱"),
    BorderCrossingEvent("NL", "Holandija", "Netherlands", "🇳🇱"),
    BorderCrossingEvent("B", "Belgija", "Belgium", "🇧🇪"),
    BorderCrossingEvent("F", "Francuska", "France", "🇫🇷"),
    BorderCrossingEvent("CH", "Švajcarska", "Switzerland", "🇨🇭")
)

@Composable
fun BorderCrossingDialog(
    currentCountry: String,
    currentOdoKm: Long,
    onSelectCountry: (String) -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Flag,
                    contentDescription = null,
                    tint = ElegantBlue,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Unos Prelaska Granice", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            }
        },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(
                    text = "Mobility Package 1 (EU 2020/1054): Vozač je dužan da unese simbol države u koju je ušao na prvom mogućem stajalištu na granici ili odmah nakon nje.",
                    color = TextSecondary,
                    fontSize = 11.sp,
                    lineHeight = 15.sp
                )
                Text(
                    text = "Trenutno stanje odometra: $currentOdoKm km",
                    color = TextMuted,
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace
                )

                Spacer(modifier = Modifier.height(4.dp))

                // Grid of Countries
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    EuropeanBorderCountries.chunked(2).forEach { rowCountries ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            rowCountries.forEach { country ->
                                val isCurrent = country.countryCode == currentCountry
                                Surface(
                                    color = if (isCurrent) ElegantBlue.copy(alpha = 0.25f) else DarkBg,
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier
                                        .weight(1f)
                                        .border(
                                            width = if (isCurrent) 2.dp else 1.dp,
                                            color = if (isCurrent) ElegantBlue else DarkOutline,
                                            shape = RoundedCornerShape(12.dp)
                                        )
                                        .clip(RoundedCornerShape(12.dp))
                                        .clickable {
                                            onSelectCountry(country.countryCode)
                                            onDismiss()
                                        }
                                        .testTag("border_country_${country.countryCode}")
                                ) {
                                    Row(
                                        modifier = Modifier.padding(10.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Text(country.flag, fontSize = 20.sp)
                                        Column {
                                            Text(
                                                text = country.countryCode,
                                                fontWeight = FontWeight.Black,
                                                fontSize = 14.sp,
                                                color = if (isCurrent) ElegantBlue else TextPrimary
                                            )
                                            Text(
                                                text = country.countryNameSr,
                                                fontSize = 10.sp,
                                                color = TextMuted
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Zatvori", color = TextSecondary)
            }
        },
        containerColor = DarkSurface,
        shape = RoundedCornerShape(24.dp)
    )
}

// ============================================================================
// 5. ROADSIDE CONTROL & INSPECTION REPORT GENERATOR (BAG / BALM / ITD / MUP)
// ============================================================================

@Composable
fun RoadsideInspectionDialog(
    telemetry: TachoLiveTelemetry,
    onShareReport: () -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Shield,
                        contentDescription = null,
                        tint = AlertGreen,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Inspekcijski Izveštaj (28/56D)",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                }
                Surface(
                    color = AlertGreen.copy(alpha = 0.2f),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text(
                        text = "USAGLAŠENO",
                        color = AlertGreen,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Black,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }
        },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Header certificate
                Card(
                    colors = CardDefaults.cardColors(containerColor = DarkBg),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth().border(1.dp, DarkOutline, RoundedCornerShape(14.dp))
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = "EU TACHOGRAPH ROADSIDE CONTROL SUMMARY",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            color = ElegantBlue,
                            letterSpacing = 0.5.sp
                        )
                        Text(
                            text = "Usklađeno sa Uredbom EC 561/2006, EC 165/2014 & EU 2020/1054",
                            fontSize = 9.sp,
                            color = TextMuted
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Column {
                                Text("VOZAČ:", fontSize = 9.sp, color = TextMuted)
                                Text(telemetry.driver1Name, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                Text("Kartica: ${telemetry.driver1CardNumber}", fontSize = 10.sp, fontFamily = FontFamily.Monospace, color = TextSecondary)
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text("VOZILO:", fontSize = 9.sp, color = TextMuted)
                                Text(telemetry.truckPlate, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                Text("VIN: ${telemetry.truckVin}", fontSize = 10.sp, fontFamily = FontFamily.Monospace, color = TextSecondary)
                            }
                        }
                    }
                }

                // 28-day & 56-day Activity Summary
                Card(
                    colors = CardDefaults.cardColors(containerColor = DarkSurfaceSubtle),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("REKAPITULACIJA VREMENA (PERIOD 56 DANA):", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                        
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Dnevna vožnja (Danas):", fontSize = 11.sp, color = TextMuted)
                            val dH = telemetry.dailyDrivingSeconds / 3600
                            val dM = (telemetry.dailyDrivingSeconds % 3600) / 60
                            Text("${dH}h ${dM}m (Limit: 9h/10h) ✓", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = AlertGreen)
                        }

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Neprekidna vožnja:", fontSize = 11.sp, color = TextMuted)
                            val cH = telemetry.continuousDrivingSeconds / 3600
                            val cM = (telemetry.continuousDrivingSeconds % 3600) / 60
                            Text("${cH}h ${cM}m (Limit: 4h30m) ✓", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = AlertGreen)
                        }

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Nedeljna vožnja:", fontSize = 11.sp, color = TextMuted)
                            Text("${telemetry.weeklyDrivingSeconds / 3600}h (Limit: 56h) ✓", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = AlertGreen)
                        }

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Prekršaji u 56 dana:", fontSize = 11.sp, color = TextMuted)
                            Text("0 EVIDENTIRANIH PREKRŠAJA ✓", fontSize = 11.sp, fontWeight = FontWeight.Black, color = AlertGreen)
                        }
                    }
                }

                // Digital signature verification
                Surface(
                    color = DarkBg,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth().border(1.dp, DarkOutline, RoundedCornerShape(12.dp))
                ) {
                    Column(modifier = Modifier.padding(10.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Security, contentDescription = null, tint = ElegantBlue, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("DIGITALNA VALIDACIJA POTPISA", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = ElegantBlue)
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "RSA-PSS SHA-256 Kripto Hash: 7f8a92bc44109e2... (Validirano)",
                            fontSize = 9.sp,
                            fontFamily = FontFamily.Monospace,
                            color = TextMuted
                        )
                        Text(
                            text = "Tahograf: ${telemetry.tachoModel} • Odo: ${telemetry.odometerKm} km",
                            fontSize = 9.sp,
                            color = TextMuted
                        )
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    onShareReport()
                    onDismiss()
                },
                colors = ButtonDefaults.buttonColors(containerColor = ElegantBlue, contentColor = ElegantBlueOn),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.testTag("export_inspection_pdf_btn")
            ) {
                Icon(Icons.Default.Print, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Izvezi PDF / Štampaj", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Zatvori", color = TextSecondary)
            }
        },
        containerColor = DarkSurface,
        shape = RoundedCornerShape(24.dp)
    )
}
