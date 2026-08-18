package com.example.ui.screens

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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.LicenseTier
import com.example.data.model.TachoDownloadSession
import com.example.data.model.TachoLiveTelemetry
import com.example.ui.theme.AlertGreen
import com.example.ui.theme.AlertYellow
import com.example.ui.theme.DarkBg
import com.example.ui.theme.DarkOutline
import com.example.ui.theme.DarkSurface
import com.example.ui.theme.DarkSurfaceSubtle
import com.example.ui.theme.DarkSurfaceVariant
import com.example.ui.theme.DemoYellow
import com.example.ui.theme.DemoYellowOn
import com.example.ui.theme.ElegantBlue
import com.example.ui.theme.ElegantBlueOn
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary

@Composable
fun DownloadScreen(
    telemetry: TachoLiveTelemetry,
    licenseTier: LicenseTier,
    downloadSession: TachoDownloadSession,
    onTriggerDownload: (targetType: String, periodDays: Int) -> Unit,
    onResetDownload: () -> Unit,
    onOpenUpgradeModal: () -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedTarget by remember { mutableStateOf("DRIVER_CARD") } // "DRIVER_CARD" or "VEHICLE_UNIT"
    var selectedPeriodDays by remember { mutableIntStateOf(if (licenseTier == LicenseTier.DEMO_3_DAYS) 3 else 60) }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Source Selector Card (Kartica Vozača vs Tahograf Masa)
        item {
            Text(
                text = "Izvor za preuzimanje (.DDD)",
                color = TextSecondary,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium
            )
            Spacer(modifier = Modifier.height(6.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Option 1: Driver Card
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = if (selectedTarget == "DRIVER_CARD") DarkSurfaceSubtle else DarkSurface
                    ),
                    shape = RoundedCornerShape(20.dp),
                    modifier = Modifier
                        .weight(1f)
                        .border(
                            1.dp,
                            if (selectedTarget == "DRIVER_CARD") ElegantBlue else DarkOutline,
                            RoundedCornerShape(20.dp)
                        )
                        .clickable { selectedTarget = "DRIVER_CARD" }
                        .testTag("select_driver_card_btn")
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Icon(
                            imageVector = Icons.Default.CreditCard,
                            contentDescription = null,
                            tint = if (selectedTarget == "DRIVER_CARD") ElegantBlue else TextMuted,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            text = "Kartica Vozača",
                            color = TextPrimary,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = telemetry.driver1Name,
                            color = TextMuted,
                            fontSize = 11.sp,
                            maxLines = 1
                        )
                    }
                }

                // Option 2: Vehicle Unit
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = if (selectedTarget == "VEHICLE_UNIT") DarkSurfaceSubtle else DarkSurface
                    ),
                    shape = RoundedCornerShape(20.dp),
                    modifier = Modifier
                        .weight(1f)
                        .border(
                            1.dp,
                            if (selectedTarget == "VEHICLE_UNIT") ElegantBlue else DarkOutline,
                            RoundedCornerShape(20.dp)
                        )
                        .clickable { selectedTarget = "VEHICLE_UNIT" }
                        .testTag("select_vehicle_unit_btn")
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Icon(
                            imageVector = Icons.Default.LocalShipping,
                            contentDescription = null,
                            tint = if (selectedTarget == "VEHICLE_UNIT") ElegantBlue else TextMuted,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            text = "Tahograf Masa (VU)",
                            color = TextPrimary,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = telemetry.truckPlate,
                            color = TextMuted,
                            fontSize = 11.sp,
                            maxLines = 1
                        )
                    }
                }
            }
        }

        // Period Selection Card (3 dana vs 28 dana vs 60 dana / 2 meseca)
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
                        text = "Vremenski opseg očitavanja",
                        color = TextPrimary,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    val periods = listOf(
                        Triple(3, "3 Dana (Demo)", false),
                        Triple(28, "28 Dana (Zakonski minimum)", licenseTier == LicenseTier.DEMO_3_DAYS),
                        Triple(60, "2 Meseca (60 Dana Pro)", licenseTier == LicenseTier.DEMO_3_DAYS)
                    )

                    periods.forEach { (days, label, isLocked) ->
                        val isSelected = selectedPeriodDays == days
                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = if (isSelected) DarkSurfaceSubtle else DarkBg
                            ),
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                                .border(
                                    1.dp,
                                    if (isSelected) ElegantBlue else DarkOutline,
                                    RoundedCornerShape(16.dp)
                                )
                                .clickable {
                                    if (isLocked) {
                                        onOpenUpgradeModal()
                                    } else {
                                        selectedPeriodDays = days
                                    }
                                }
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(
                                        modifier = Modifier
                                            .size(18.dp)
                                            .border(2.dp, if (isSelected) ElegantBlue else TextMuted, CircleShape),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        if (isSelected) {
                                            Box(
                                                modifier = Modifier
                                                    .size(8.dp)
                                                    .background(ElegantBlue, CircleShape)
                                            )
                                        }
                                    }
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Text(
                                        text = label,
                                        color = if (isLocked) TextMuted else TextPrimary,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Medium
                                    )
                                }

                                if (isLocked) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(
                                            imageVector = Icons.Default.Lock,
                                            contentDescription = "Zaključano",
                                            tint = DemoYellow,
                                            modifier = Modifier.size(16.dp)
                                        )
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("PRO", color = DemoYellow, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Active Download Session Status / Progress
        if (downloadSession.isDownloading || downloadSession.isCompleted) {
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = DarkSurface),
                    shape = RoundedCornerShape(24.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, if (downloadSession.isCompleted) AlertGreen else ElegantBlue, RoundedCornerShape(24.dp))
                        .testTag("download_progress_card")
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = if (downloadSession.isCompleted) "Preuzimanje Završeno" else "Preuzimanje preko Bluetooth-a",
                                color = if (downloadSession.isCompleted) AlertGreen else ElegantBlue,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "${(downloadSession.progressPercent * 100).toInt()}%",
                                color = TextPrimary,
                                fontSize = 14.sp,
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        LinearProgressIndicator(
                            progress = { downloadSession.progressPercent },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(8.dp)
                                .clip(RoundedCornerShape(4.dp)),
                            color = if (downloadSession.isCompleted) AlertGreen else ElegantBlue,
                            trackColor = DarkBg
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        Text(
                            text = "Fajl: ${downloadSession.currentFileTarget}",
                            color = TextSecondary,
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace
                        )
                        Text(
                            text = "Paketi: ${downloadSession.currentBlock} / ${downloadSession.totalBlocks} (${downloadSession.bytesTransferred / 1024} KB)",
                            color = TextMuted,
                            fontSize = 11.sp
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        // Terminal Log Stream
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(DarkBg, RoundedCornerShape(12.dp))
                                .padding(10.dp)
                        ) {
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                downloadSession.logMessages.takeLast(4).forEach { msg ->
                                    Text(
                                        text = "> $msg",
                                        color = TextSecondary,
                                        fontSize = 10.sp,
                                        fontFamily = FontFamily.Monospace
                                    )
                                }
                            }
                        }

                        if (downloadSession.isCompleted) {
                            Spacer(modifier = Modifier.height(12.dp))
                            Button(
                                onClick = onResetDownload,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = DarkSurfaceSubtle,
                                    contentColor = TextPrimary
                                ),
                                shape = RoundedCornerShape(16.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("Završi i očisti sesiju")
                            }
                        }
                    }
                }
            }
        }

        // Trigger Button
        if (!downloadSession.isDownloading) {
            item {
                Button(
                    onClick = {
                        onTriggerDownload(selectedTarget, selectedPeriodDays)
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = ElegantBlue,
                        contentColor = ElegantBlueOn
                    ),
                    shape = RoundedCornerShape(18.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp)
                        .testTag("start_download_btn")
                ) {
                    Icon(
                        imageVector = Icons.Default.Download,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "POKRENI BRZO OČITAVANJE",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.5.sp
                    )
                }
            }
        }

        // Legal & Technical Specification Note
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = DarkBg),
                shape = RoundedCornerShape(20.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, DarkOutline, RoundedCornerShape(20.dp))
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.Top
                ) {
                    Icon(
                        imageVector = Icons.Default.Info,
                        contentDescription = null,
                        tint = ElegantBlue,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = "Generisani .DDD fajlovi su potpisani RSA ključem tahografa prema uredbi EU 165/2014 i Pravilniku o tahografima RS. Zvanično su validni za inspekciju i arhiviranje.",
                        color = TextSecondary,
                        fontSize = 11.sp,
                        lineHeight = 15.sp
                    )
                }
            }
        }
    }
}
