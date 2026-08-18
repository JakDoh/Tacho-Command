package com.example.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Bluetooth
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Eject
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.BtConnectionState
import com.example.data.model.DriverCardInfo
import com.example.data.model.LicenseTier
import com.example.data.model.TachoBluetoothDevice
import com.example.ui.UiNotification
import com.example.ui.theme.AlertGreen
import com.example.ui.theme.AlertRed
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
import com.example.ui.theme.ProGold
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary

@Composable
fun NotificationBanner(
    notification: UiNotification?,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    AnimatedVisibility(
        visible = notification != null,
        enter = slideInVertically() + fadeIn(),
        exit = slideOutVertically() + fadeOut(),
        modifier = modifier
    ) {
        if (notification != null) {
            val bg = if (notification.isError) AlertRed.copy(alpha = 0.2f) else DarkSurfaceSubtle
            val borderCol = if (notification.isError) AlertRed else ElegantBlue
            val icon = if (notification.isError) Icons.Default.Error else Icons.Default.CheckCircle

            Card(
                colors = CardDefaults.cardColors(containerColor = bg),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp)
                    .border(1.dp, borderCol, RoundedCornerShape(16.dp))
                    .testTag("notification_banner")
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(12.dp)
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = if (notification.isError) AlertRed else ElegantBlue,
                        modifier = Modifier.size(22.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = notification.message,
                        color = TextPrimary,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.weight(1f)
                    )
                    IconButton(
                        onClick = onDismiss,
                        modifier = Modifier.size(24.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Zatvori",
                            tint = TextMuted
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun BluetoothStatusPill(
    connectionState: BtConnectionState,
    connectedDeviceName: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val (dotColor, label) = when (connectionState) {
        BtConnectionState.CONNECTED -> Pair(AlertGreen, "BT ACTIVE")
        BtConnectionState.CONNECTING, BtConnectionState.SCANNING, BtConnectionState.DOWNLOADING_DATA -> Pair(ElegantBlue, "BT SYNC")
        BtConnectionState.DISCONNECTED -> Pair(AlertRed, "BT DISCONNECTED")
    }

    Surface(
        color = DarkSurface,
        shape = RoundedCornerShape(20.dp),
        modifier = modifier
            .border(1.dp, DarkOutline, RoundedCornerShape(20.dp))
            .clip(RoundedCornerShape(20.dp))
            .clickable(onClick = onClick)
            .testTag("bluetooth_status_pill")
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .background(dotColor, CircleShape)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = label,
                color = ElegantBlue,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 1.sp
            )
        }
    }
}

@Composable
fun LicenseBadge(
    tier: LicenseTier,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val isPro = tier == LicenseTier.PRO_2_MONTHS
    val bgColor = if (isPro) ProGold else DemoYellow
    val textColor = if (isPro) Color.Black else DemoYellowOn

    Surface(
        color = bgColor,
        shape = RoundedCornerShape(8.dp),
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .testTag("license_badge_btn")
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
        ) {
            if (isPro) {
                Icon(
                    imageVector = Icons.Default.Star,
                    contentDescription = "Pro",
                    tint = textColor,
                    modifier = Modifier.size(12.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
            }
            Text(
                text = tier.badge,
                color = textColor,
                fontSize = 10.sp,
                fontWeight = FontWeight.Black,
                fontFamily = FontFamily.Monospace
            )
        }
    }
}

// Tachograph Card Slot Widget (Slot 1 - Driver, Slot 2 - Co-Driver)
@Composable
fun TachographCardSlotWidget(
    driver1: DriverCardInfo,
    driver2: DriverCardInfo,
    onManageSlot1: () -> Unit,
    onManageSlot2: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = DarkSurface),
        shape = RoundedCornerShape(24.dp),
        modifier = modifier
            .fillMaxWidth()
            .border(1.dp, DarkOutline, RoundedCornerShape(24.dp))
            .testTag("tacho_card_slots_card")
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.CreditCard,
                        contentDescription = null,
                        tint = ElegantBlue,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Slotovi Tahografa (Identifikacija)",
                        color = TextPrimary,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Surface(
                    color = if (driver1.isInserted) AlertGreen.copy(alpha = 0.15f) else AlertRed.copy(alpha = 0.15f),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = if (driver1.isInserted) "SLOT 1 AKTIVAN" else "SLOT 1 PRAZAN",
                        color = if (driver1.isInserted) AlertGreen else AlertRed,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Slot 1 (Driver)
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = if (driver1.isInserted) DarkSurfaceSubtle else DarkBg
                    ),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier
                        .weight(1f)
                        .border(
                            1.dp,
                            if (driver1.isInserted) ElegantBlue else DarkOutline,
                            RoundedCornerShape(16.dp)
                        )
                        .clickable(onClick = onManageSlot1)
                        .testTag("slot1_card_btn")
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = "SLOT 1 (VOZAČ)",
                                color = ElegantBlue,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 0.5.sp
                            )
                            Icon(
                                imageVector = if (driver1.isInserted) Icons.Default.CheckCircle else Icons.Default.Add,
                                contentDescription = null,
                                tint = if (driver1.isInserted) AlertGreen else TextMuted,
                                modifier = Modifier.size(16.dp)
                            )
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        if (driver1.isInserted) {
                            Text(
                                text = driver1.driverName,
                                color = TextPrimary,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                maxLines = 1
                            )
                            Text(
                                text = "${driver1.issuingCountry} • ${driver1.cardNumber.takeLast(7)}",
                                color = TextSecondary,
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Monospace
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = "Dodirni za izbacivanje/kraj",
                                color = AlertYellow,
                                fontSize = 10.sp
                            )
                        } else {
                            Text(
                                text = "Kartica nije ubačena",
                                color = AlertRed,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "+ Ubaci karticu za smenu",
                                color = ElegantBlue,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }

                // Slot 2 (Co-Driver / Suvozač)
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = if (driver2.isInserted) DarkSurfaceSubtle else DarkBg
                    ),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier
                        .weight(1f)
                        .border(
                            1.dp,
                            if (driver2.isInserted) ElegantBlue else DarkOutline,
                            RoundedCornerShape(16.dp)
                        )
                        .clickable(onClick = onManageSlot2)
                        .testTag("slot2_card_btn")
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = "SLOT 2 (SUVOZAČ)",
                                color = TextMuted,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 0.5.sp
                            )
                            Icon(
                                imageVector = if (driver2.isInserted) Icons.Default.CheckCircle else Icons.Default.Add,
                                contentDescription = null,
                                tint = if (driver2.isInserted) AlertGreen else TextMuted,
                                modifier = Modifier.size(16.dp)
                            )
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        if (driver2.isInserted) {
                            Text(
                                text = driver2.driverName,
                                color = TextPrimary,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                maxLines = 1
                            )
                            Text(
                                text = "${driver2.issuingCountry} • ${driver2.cardNumber.takeLast(7)}",
                                color = TextSecondary,
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Monospace
                            )
                        } else {
                            Text(
                                text = "Prazan slot",
                                color = TextMuted,
                                fontSize = 12.sp
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "+ Dodaj dvočlanu posadu",
                                color = TextSecondary,
                                fontSize = 10.sp
                            )
                        }
                    }
                }
            }
        }
    }
}

// Driver Shift & Card Insertion/Ejection Dialog (Mobility Package 1 Compliant)
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DriverShiftDialog(
    showDialog: Boolean,
    slotNumber: Int,
    currentCard: DriverCardInfo,
    onInsertCard: (slotNumber: Int, name: String, cardNum: String, country: String) -> Unit,
    onEjectCard: (slotNumber: Int, endCountry: String) -> Unit,
    onDismiss: () -> Unit
) {
    if (!showDialog) return

    val countries = listOf("SRB", "DE", "AUT", "HU", "HR", "SLO", "BIH", "MK", "BG", "RO", "IT", "FR", "NL", "PL")
    var driverName by remember { mutableStateOf(if (currentCard.driverName != "Prazno (Jedan vozač)") currentCard.driverName else "Marko Petrović") }
    var cardNumber by remember { mutableStateOf(if (currentCard.cardNumber != "N/A") currentCard.cardNumber else "SRB000004928190001") }
    var selectedCountry by remember { mutableStateOf(if (currentCard.issuingCountry.isNotEmpty()) currentCard.issuingCountry else "SRB") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.CreditCard,
                    contentDescription = null,
                    tint = ElegantBlue
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = if (currentCard.isInserted) "Zatvaranje Smene / Izbacivanje Kartice" else "Početak Smene (Ubacivanje Kartice)",
                    color = TextPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            }
        },
        text = {
            Column(modifier = Modifier.fillMaxWidth()) {
                if (currentCard.isInserted) {
                    // Eject / Shift End Flow
                    Text(
                        text = "Vozač: ${currentCard.driverName}",
                        color = TextPrimary,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp
                    )
                    Text(
                        text = "Kartica: ${currentCard.cardNumber} (Slot $slotNumber)",
                        color = TextMuted,
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    Text(
                        text = "Izaberite državu završetka smene (Uredba EU 2020/1054):",
                        color = TextSecondary,
                        fontSize = 12.sp
                    )
                    Spacer(modifier = Modifier.height(6.dp))

                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        items(countries) { c ->
                            Surface(
                                color = if (selectedCountry == c) ElegantBlue else DarkBg,
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier
                                    .border(1.dp, if (selectedCountry == c) ElegantBlue else DarkOutline, RoundedCornerShape(10.dp))
                                    .clickable { selectedCountry = c }
                            ) {
                                Text(
                                    text = c,
                                    color = if (selectedCountry == c) Color.Black else TextPrimary,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))
                    Text(
                        text = "Izbacivanjem kartice zabeležiće se završno stanje odometra i zatvoriti dnevna smena u bazi tahografa.",
                        color = TextMuted,
                        fontSize = 11.sp,
                        lineHeight = 15.sp
                    )
                } else {
                    // Insert / Shift Start Flow
                    Text(
                        text = "Unesite podatke vozača za Slot $slotNumber i državu polaska:",
                        color = TextSecondary,
                        fontSize = 12.sp
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedTextField(
                        value = driverName,
                        onValueChange = { driverName = it },
                        label = { Text("Ime i Prezime Vozača", color = TextMuted) },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = ElegantBlue,
                            unfocusedBorderColor = DarkOutline,
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary
                        ),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("input_driver_name")
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = cardNumber,
                        onValueChange = { cardNumber = it },
                        label = { Text("Broj Tahografske Kartice", color = TextMuted) },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = ElegantBlue,
                            unfocusedBorderColor = DarkOutline,
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary
                        ),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("input_card_number")
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = "Država početka smene:",
                        color = TextSecondary,
                        fontSize = 12.sp
                    )
                    Spacer(modifier = Modifier.height(6.dp))

                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        items(countries) { c ->
                            Surface(
                                color = if (selectedCountry == c) ElegantBlue else DarkBg,
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier
                                    .border(1.dp, if (selectedCountry == c) ElegantBlue else DarkOutline, RoundedCornerShape(10.dp))
                                    .clickable { selectedCountry = c }
                            ) {
                                Text(
                                    text = c,
                                    color = if (selectedCountry == c) Color.Black else TextPrimary,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                                )
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            if (currentCard.isInserted) {
                Button(
                    onClick = {
                        onEjectCard(slotNumber, selectedCountry)
                        onDismiss()
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = AlertRed,
                        contentColor = Color.White
                    ),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.testTag("confirm_eject_btn")
                ) {
                    Icon(imageVector = Icons.Default.Eject, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Zatvori i Izbaci", fontWeight = FontWeight.Bold)
                }
            } else {
                Button(
                    onClick = {
                        onInsertCard(slotNumber, driverName, cardNumber, selectedCountry)
                        onDismiss()
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = ElegantBlue,
                        contentColor = ElegantBlueOn
                    ),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.testTag("confirm_insert_btn")
                ) {
                    Icon(imageVector = Icons.Default.CreditCard, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Ubaci i Započni", fontWeight = FontWeight.Bold)
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Otkaži", color = TextSecondary)
            }
        },
        containerColor = DarkSurface,
        shape = RoundedCornerShape(24.dp)
    )
}

@Composable
fun BluetoothDialog(
    showDialog: Boolean,
    connectionState: BtConnectionState,
    availableDevices: List<TachoBluetoothDevice>,
    onScan: () -> Unit,
    onConnect: (TachoBluetoothDevice) -> Unit,
    onDisconnect: () -> Unit,
    onDismiss: () -> Unit
) {
    if (!showDialog) return

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Bluetooth,
                    contentDescription = null,
                    tint = ElegantBlue
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Bluetooth Tahograf Adapteri", color = TextPrimary, fontWeight = FontWeight.Bold)
            }
        },
        text = {
            Column(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = "Povežite se direktno na VDO SmartLink, Stoneridge DigiDL, Tacho2Safe ili CAN-Bus bežični dongle u vozilu.",
                    color = TextSecondary,
                    fontSize = 13.sp
                )
                Spacer(modifier = Modifier.height(16.dp))

                if (connectionState == BtConnectionState.SCANNING) {
                    LinearProgressIndicator(
                        modifier = Modifier.fillMaxWidth(),
                        color = ElegantBlue,
                        trackColor = DarkSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Text("Pretraživanje uređaja u kabini...", color = ElegantBlue, fontSize = 12.sp)
                }

                Spacer(modifier = Modifier.height(8.dp))
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    availableDevices.forEach { dev ->
                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = if (dev.isPaired) DarkSurfaceSubtle else DarkSurface
                            ),
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .border(1.dp, DarkOutline, RoundedCornerShape(16.dp))
                                .clickable { onConnect(dev) }
                                .testTag("bt_device_${dev.address}")
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(12.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(36.dp)
                                        .background(DarkBg, CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Bluetooth,
                                        contentDescription = null,
                                        tint = if (dev.isPaired) AlertGreen else TextMuted,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = dev.name,
                                        color = TextPrimary,
                                        fontWeight = FontWeight.SemiBold,
                                        fontSize = 14.sp
                                    )
                                    Text(
                                        text = "${dev.deviceType} • ${dev.address}",
                                        color = TextMuted,
                                        fontSize = 11.sp
                                    )
                                }
                                Text(
                                    text = "${dev.rssi} dBm",
                                    color = ElegantBlue,
                                    fontSize = 11.sp,
                                    fontFamily = FontFamily.Monospace
                                )
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onScan,
                colors = ButtonDefaults.buttonColors(containerColor = ElegantBlue, contentColor = ElegantBlueOn),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.testTag("scan_bt_btn")
            ) {
                Text("Skeniraj", fontWeight = FontWeight.Bold)
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

@Composable
fun ProUpgradeDialog(
    showDialog: Boolean,
    currentTier: LicenseTier,
    onActivateCode: (String) -> Boolean,
    onDirectSwitch: (LicenseTier) -> Unit,
    onDismiss: () -> Unit
) {
    if (!showDialog) return

    var inputCode by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Star,
                    contentDescription = null,
                    tint = DemoYellow
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Aktivacija Licence", color = TextPrimary, fontWeight = FontWeight.Bold)
            }
        },
        text = {
            Column(modifier = Modifier.fillMaxWidth()) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = DarkBg),
                    shape = RoundedCornerShape(20.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, DarkOutline, RoundedCornerShape(20.dp))
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Trenutni plan:", color = TextSecondary, fontSize = 12.sp)
                            LicenseBadge(tier = currentTier, onClick = {})
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = if (currentTier == LicenseTier.DEMO_3_DAYS)
                                "Demo verzija: Pregled za 3 dana bez trajnog memorisanja i arhive."
                            else
                                "Puna verzija: 2 meseca (60 dana) očitavanja, arhiviranja i izvoza .DDD fajlova.",
                            color = TextPrimary,
                            fontSize = 13.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
                Text("Unesite aktivacioni kod (npr. TACHO-PRO-2026)", color = TextMuted, fontSize = 12.sp)
                Spacer(modifier = Modifier.height(6.dp))

                OutlinedTextField(
                    value = inputCode,
                    onValueChange = {
                        inputCode = it
                        errorMessage = null
                    },
                    placeholder = { Text("TACHO-PRO-2026", color = TextMuted) },
                    singleLine = true,
                    isError = errorMessage != null,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = ElegantBlue,
                        unfocusedBorderColor = DarkOutline,
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary
                    ),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("license_code_input")
                )

                if (errorMessage != null) {
                    Text(
                        text = errorMessage ?: "",
                        color = AlertRed,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                Text("Direktan izbor (demo testiranje):", color = TextMuted, fontSize = 12.sp)
                Spacer(modifier = Modifier.height(6.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = {
                            onDirectSwitch(LicenseTier.DEMO_3_DAYS)
                            onDismiss()
                        },
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.outlinedButtonColors(
                            containerColor = if (currentTier == LicenseTier.DEMO_3_DAYS) DarkSurfaceSubtle else Color.Transparent
                        )
                    ) {
                        Text("Demo 3D", fontSize = 12.sp, color = TextPrimary)
                    }
                    Button(
                        onClick = {
                            onDirectSwitch(LicenseTier.PRO_2_MONTHS)
                            onDismiss()
                        },
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (currentTier == LicenseTier.PRO_2_MONTHS) ElegantBlue else DarkSurfaceSubtle,
                            contentColor = if (currentTier == LicenseTier.PRO_2_MONTHS) ElegantBlueOn else TextPrimary
                        )
                    ) {
                        Text("Puna 2 Meseca", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (inputCode.isBlank()) {
                        onDirectSwitch(LicenseTier.PRO_2_MONTHS)
                        onDismiss()
                    } else {
                        val success = onActivateCode(inputCode)
                        if (success) onDismiss() else errorMessage = "Nevažeći kod. Koristite 'TACHO-PRO-2026'"
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = ElegantBlue, contentColor = ElegantBlueOn),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.testTag("activate_pro_btn")
            ) {
                Text("Aktiviraj", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Otkaži", color = TextSecondary)
            }
        },
        containerColor = DarkSurface,
        shape = RoundedCornerShape(24.dp)
    )
}
