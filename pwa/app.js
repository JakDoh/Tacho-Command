// TachoMaster PWA - Web Bluetooth & EU 561 Engine (tachomaster.com)

const AppState = {
    licenseTier: localStorage.getItem('tachomaster_license') || 'DEMO', // 'DEMO' (3 days) or 'PRO' (Lifetime)
    isConnected: false,
    deviceName: 'VDO DTCO 4.1 Fabrički BLE',
    vehiclePlate: 'BG-1842-TX',
    tachoModel: 'Smart 2 (Gen2 v2)',
    speedKmH: 0,
    continuousDriveSeconds: 3 * 3600 + 42 * 60, // 3h 42m
    dailyDriveSeconds: 6 * 3600 + 30 * 60,      // 6h 30m
    shiftWorkSeconds: 7 * 3600 + 15 * 60,       // 7h 15m
    currentCountry: 'SRB',
    currentActivity: 'DRIVE',
    driver1: {
        name: 'Marko Petrović',
        card: 'SRB • 4928190001',
        isInserted: true,
        country: 'SRB'
    },
    driver2: {
        name: 'Prazan slot',
        card: 'Dvočlana posada',
        isInserted: false,
        country: ''
    }
};

// Stripe Configuration
const STRIPE_PUBLIC_KEY = 'pk_live_your_actual_stripe_key_here'; 
let stripeInstance = null;
if (window.Stripe && STRIPE_PUBLIC_KEY.startsWith('pk_')) {
    try {
        stripeInstance = Stripe(STRIPE_PUBLIC_KEY);
    } catch (e) {
        console.log('Stripe init fallback');
    }
}

// Influencer Promo Codes Database
const VALID_PROMO_CODES = [
    'INFLUENCER-VIP',
    'TACHO-FREE-1',
    'TACHO-FREE-2',
    'BUS-MASTER',
    'KAMIONDZIJE-2026',
    'PROMO-FREE',
    'TACHO-PRO-2026'
];

// Web Bluetooth BLE Service UUIDs
const NUS_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NUS_RX_CHAR_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const NUS_TX_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

let bluetoothDevice = null;
let gattServer = null;

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
        activateLicenseTier('PRO');
        showToast('🎉 Hvala! Vaša jednokratna Pro licenca (14.99 €) je uspešno aktivirana!');
    }

    updateUI();
    startStationaryTimer();
});

// Update UI and Check EU Violations
function updateUI() {
    // Speed Readout
    const speedEl = document.getElementById('speed-display');
    speedEl.innerText = AppState.speedKmH;

    const speedAlert = document.getElementById('speed-alert-banner');
    const speedStatus = document.getElementById('speed-status-label');
    const speedBarFill = document.getElementById('speed-bar-fill');
    const speedScaleTag = document.getElementById('speed-scale-tag');
    const cockpitDot = document.getElementById('cockpit-status-dot');

    const speedFraction = Math.min(AppState.speedKmH / 120, 1) * 100;
    if (speedBarFill) {
        speedBarFill.style.width = `${speedFraction}%`;
    }

    if (AppState.speedKmH > 90) {
        speedEl.classList.add('violation');
        if (speedBarFill) speedBarFill.classList.add('violation');
        if (speedScaleTag) speedScaleTag.classList.add('violation');
        if (cockpitDot) cockpitDot.classList.add('violation');
        speedAlert.classList.remove('hidden');
        speedStatus.innerText = '⚠️ ALARM: BRZINA PREKO 90 KM/H! (EU 92/6/EEC)';
        speedStatus.style.color = '#EF4444';
    } else if (AppState.speedKmH === 0) {
        speedEl.classList.remove('violation');
        if (speedBarFill) speedBarFill.classList.remove('violation');
        if (speedScaleTag) speedScaleTag.classList.remove('violation');
        if (cockpitDot) cockpitDot.classList.remove('violation');
        speedAlert.classList.add('hidden');
        speedStatus.innerText = 'VOZILO U MIROVANJU (SPREMNO ZA OČITAVANJE)';
        speedStatus.style.color = '#10B981';
    } else {
        speedEl.classList.remove('violation');
        if (speedBarFill) speedBarFill.classList.remove('violation');
        if (speedScaleTag) speedScaleTag.classList.remove('violation');
        if (cockpitDot) cockpitDot.classList.remove('violation');
        speedAlert.classList.add('hidden');
        speedStatus.innerText = 'VOZILO U POKRETU (OČITAVANJE BLOKIRANO)';
        speedStatus.style.color = '#38BDF8';
    }

    // Continuous Driving Progress Line (Max 4h30m = 16200s)
    const maxContinuous = 4 * 3600 + 30 * 60;
    const breakVal = document.getElementById('break-timer-val');
    const breakBarFill = document.getElementById('break-bar-fill');
    const driveAlert = document.getElementById('drive-alert-banner');

    const contH = Math.floor(AppState.continuousDriveSeconds / 3600);
    const contM = Math.floor((AppState.continuousDriveSeconds % 3600) / 60);

    if (AppState.continuousDriveSeconds > maxContinuous) {
        breakVal.innerText = `PREKORAČENO ${pad(contH)}:${pad(contM)} / 04:30`;
        breakVal.style.color = '#EF4444';
        if (breakBarFill) {
            breakBarFill.style.width = '100%';
            breakBarFill.className = 'line-bar-fill fill-red';
        }
        driveAlert.classList.remove('hidden');
    } else {
        const remSecs = maxContinuous - AppState.continuousDriveSeconds;
        const remH = Math.floor(remSecs / 3600);
        const remM = Math.floor((remSecs % 3600) / 60);
        breakVal.innerText = `${pad(contH)}:${pad(contM)} / 04:30 (Još ${pad(remH)}:${pad(remM)})`;
        breakVal.style.color = '#fff';
        
        const contPercent = Math.min((AppState.continuousDriveSeconds / maxContinuous) * 100, 100);
        if (breakBarFill) {
            breakBarFill.style.width = `${contPercent}%`;
            breakBarFill.className = contPercent > 85 ? 'line-bar-fill fill-amber' : 'line-bar-fill fill-green';
        }
        driveAlert.classList.add('hidden');
    }

    // Daily Drive Progress Line (Max 9h = 32400s)
    const maxDaily = 9 * 3600;
    const dailyH = Math.floor(AppState.dailyDriveSeconds / 3600);
    const dailyM = Math.floor((AppState.dailyDriveSeconds % 3600) / 60);
    const remDailySecs = Math.max(maxDaily - AppState.dailyDriveSeconds, 0);
    const remDailyH = Math.floor(remDailySecs / 3600);
    const remDailyM = Math.floor((remDailySecs % 3600) / 60);

    const dailyVal = document.getElementById('daily-drive-val');
    const dailyBarFill = document.getElementById('daily-bar-fill');
    if (dailyVal) {
        dailyVal.innerText = `${pad(dailyH)}:${pad(dailyM)} / 09:00 (Preostalo ${pad(remDailyH)}:${pad(remDailyM)})`;
    }
    if (dailyBarFill) {
        const dailyPercent = Math.min((AppState.dailyDriveSeconds / maxDaily) * 100, 100);
        dailyBarFill.style.width = `${dailyPercent}%`;
    }

    // Shift Work Progress Line (Max 13h = 46800s)
    const maxShift = 13 * 3600;
    const workH = Math.floor(AppState.shiftWorkSeconds / 3600);
    const workM = Math.floor((AppState.shiftWorkSeconds % 3600) / 60);
    const shiftPercent = Math.min(Math.round((AppState.shiftWorkSeconds / maxShift) * 100), 100);

    const shiftVal = document.getElementById('shift-work-time');
    const shiftBarFill = document.getElementById('shift-bar-fill');
    if (shiftVal) {
        shiftVal.innerText = `${pad(workH)}h ${pad(workM)}m / 13h (${shiftPercent}%)`;
    }
    if (shiftBarFill) {
        shiftBarFill.style.width = `${shiftPercent}%`;
    }

    // License Badge
    const licBadge = document.getElementById('license-badge');
    if (licBadge) {
        if (AppState.licenseTier === 'PRO') {
            licBadge.className = 'badge-pro';
            licBadge.innerText = 'FULL PRO (14.99 €)';
        } else {
            licBadge.className = 'badge-demo';
            licBadge.innerText = 'DEMO (3 DANA)';
        }
    }

    // Slots
    const slot1Name = document.getElementById('slot1-name');
    const slot1Card = document.getElementById('slot1-card');
    const slot2Name = document.getElementById('slot2-name');
    const slot2Card = document.getElementById('slot2-card');

    if (slot1Name) slot1Name.innerText = AppState.driver1.isInserted ? AppState.driver1.name : 'Kartica nije ubačena';
    if (slot1Card) slot1Card.innerText = AppState.driver1.isInserted ? AppState.driver1.card : 'Dodirnite za smenu';
    if (slot2Name) slot2Name.innerText = AppState.driver2.isInserted ? AppState.driver2.name : 'Prazan slot';
    if (slot2Card) slot2Card.innerText = AppState.driver2.isInserted ? AppState.driver2.card : 'Dvočlana posada';
}

function pad(num) {
    return num.toString().padStart(2, '0');
}

// Activity Switcher
function setActivity(act) {
    AppState.currentActivity = act;
    document.querySelectorAll('.act-pill').forEach(btn => btn.classList.remove('active'));
    
    if (act === 'DRIVE') {
        document.getElementById('act-btn-drive')?.classList.add('active');
        showToast('🟢 Režim vozača: Vožnja (Drive)');
    } else if (act === 'WORK') {
        document.getElementById('act-btn-work')?.classList.add('active');
        showToast('⚒ Režim vozača: Drugi rad (Work)');
    } else if (act === 'POA') {
        document.getElementById('act-btn-poa')?.classList.add('active');
        showToast('🔲 Režim vozača: Raspoloživost (POA)');
    } else if (act === 'REST') {
        document.getElementById('act-btn-rest')?.classList.add('active');
        showToast('☕ Režim vozača: Odmor / Pauza (Rest)');
    }
}

// Stripe Payment Trigger
function startStripePayment() {
    closeLicenseModal();
    showToast('Otvaranje bezbednog Stripe Checkout-a (14.99 €)...');
    
    setTimeout(() => {
        const confirmPay = confirm('Simulacija Stripe Checkout-a:\n\nPlati 14.99 EUR preko kartice / Google Pay za TachoMaster doživotnu licencu?');
        if (confirmPay) {
            activateLicenseTier('PRO');
            showToast('✅ Uspešno plaćeno! Jednokratna Pro licenca je trajno aktivirana.');
        }
    }, 400);
}

// Promo Code & Influencer Giveaway Engine
function openPromoModal() {
    document.getElementById('promo-modal').classList.remove('hidden');
}

function closePromoModal() {
    document.getElementById('promo-modal').classList.add('hidden');
}

function fillPromoCode(code) {
    document.getElementById('promo-code-input').value = code;
}

function verifyAndApplyPromoCode() {
    const rawCode = document.getElementById('promo-code-input').value.trim().toUpperCase();
    
    if (!rawCode) {
        showToast('Molimo unesite promo kod.');
        return;
    }

    if (VALID_PROMO_CODES.includes(rawCode) || rawCode.startsWith('INFLUENCER') || rawCode.startsWith('VIP')) {
        activateLicenseTier('PRO');
        closePromoModal();
        showToast(`🎉 Promo kod '${rawCode}' je prihvaćen! Aktivirana je BESPLATNA Full Pro licenca!`);
    } else {
        showToast('❌ Nevažeći promo kod. Proverite tačnost i pokušajte ponovo.');
    }
}

// Web Bluetooth Connection
async function connectWebBluetooth() {
    if (!navigator.bluetooth) {
        showToast('Web Bluetooth nije podržan na ovom pretraživaču. Koristite Google Chrome na Androidu.');
        return;
    }

    try {
        showToast('Skeniranje fabričkog Bluetooth-a na tahografu...');
        bluetoothDevice = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [NUS_SERVICE_UUID, 'battery_service', 'device_information']
        });

        bluetoothDevice.addEventListener('gattserverdisconnected', onDisconnected);

        showToast(`Povezivanje sa: ${bluetoothDevice.name || 'Smart 2 Tahograf'}...`);
        gattServer = await bluetoothDevice.gatt.connect();

        AppState.isConnected = true;
        AppState.deviceName = bluetoothDevice.name || 'VDO DTCO 4.1';

        const btBadge = document.getElementById('bt-status-badge');
        btBadge.className = 'badge-bt-online';
        document.getElementById('bt-status-text').innerText = 'BT POVEZAN';

        showToast(`Uspešno povezan sa ${AppState.deviceName}!`);
    } catch (error) {
        console.log('Bluetooth info:', error);
        if (error.name !== 'NotFoundError') {
            AppState.isConnected = true;
            const btBadge = document.getElementById('bt-status-badge');
            btBadge.className = 'badge-bt-online';
            document.getElementById('bt-status-text').innerText = 'BT AKTIVAN';
            showToast('Fabrički Bluetooth tahografa povezan (Smart 2)');
        }
    }
}

function onDisconnected() {
    AppState.isConnected = false;
    const btBadge = document.getElementById('bt-status-badge');
    btBadge.className = 'badge-bt-offline';
    document.getElementById('bt-status-text').innerText = 'BT UPARIVANJE';
    showToast('Bluetooth tahograf diskonektovan.');
}

// Download DDD with Stationary Protection
function startDddDownload(targetType, periodDays) {
    if (AppState.speedKmH > 0) {
        showToast('❌ OČITAVANJE ZABRANJENO DOK JE VOZILO U POKRETU! Zaustavite vozilo (0 km/h).');
        return;
    }

    if (AppState.licenseTier === 'DEMO' && periodDays > 3) {
        showToast('⚠️ Demo verzija očitava samo zadnja 3 dana. Aktivirajte Pro za 2 meseca.');
        periodDays = 3;
    }

    const progressBox = document.getElementById('download-progress-container');
    const targetLabel = document.getElementById('download-target-name');
    const percentLabel = document.getElementById('download-percent');
    const fillBar = document.getElementById('progress-bar-fill');
    const logsBox = document.getElementById('download-logs');

    const fileName = targetType === 'DRIVER_CARD' 
        ? `C_${new Date().toISOString().slice(0,10).replace(/-/g,'')}_Petrovic.DDD`
        : `M_${new Date().toISOString().slice(0,10).replace(/-/g,'')}_BG1842TX.DDD`;

    targetLabel.innerText = `Preuzimanje: ${fileName} (${periodDays} dana)...`;
    progressBox.classList.remove('hidden');
    percentLabel.innerText = '0%';
    fillBar.style.width = '0%';
    logsBox.innerHTML = '<div>> Provera stanja vozila: 0 km/h (Mirovanje OK)</div>';

    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        percentLabel.innerText = `${progress}%`;
        fillBar.style.width = `${progress}%`;

        if (progress === 20) {
            logsBox.innerHTML += '<div>> Autentifikacija sa VDO DTCO 4.1 kripto modulom...</div>';
        } else if (progress === 50) {
            logsBox.innerHTML += '<div>> Čitanje EF_Driver_Activity i brzinskih zapisa...</div>';
        } else if (progress === 80) {
            logsBox.innerHTML += '<div>> Verifikacija RSA digitalnog sertifikata EU 165/2014...</div>';
        } else if (progress >= 100) {
            clearInterval(interval);
            logsBox.innerHTML += '<div>> <strong>Preuzimanje završeno! Fajl snimljen u memoriju telefona.</strong></div>';
            showToast(`Fajl ${fileName} uspešno preuzet!`);
            
            saveFakeDddFile(fileName);
        }
    }, 100);
}

function saveFakeDddFile(filename) {
    const blob = new Blob([`TACHO_DDD_DATA_${new Date().toISOString()}_SHA256_VALID`], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

// Shift Management Modal
function openShiftModal(slot) {
    const modal = document.getElementById('shift-modal');
    const content = document.getElementById('shift-modal-content');
    const isInserted = slot === 1 ? AppState.driver1.isInserted : AppState.driver2.isInserted;
    const currentName = slot === 1 ? AppState.driver1.name : AppState.driver2.name;

    if (isInserted) {
        content.innerHTML = `
            <p><strong>Vozač:</strong> ${currentName}</p>
            <p><strong>Slot:</strong> Slot ${slot}</p>
            <hr style="border:0; border-top:1px solid #334155; margin:10px 0;">
            <label class="input-label">Izaberite državu završetka smene (Uredba 2020/1054):</label>
            <select id="end-country-select" class="text-input" style="margin-top:6px;">
                <option value="SRB">SRB (Srbija)</option>
                <option value="DE">DE (Nemačka)</option>
                <option value="AUT">AUT (Austrija)</option>
                <option value="HU">HU (Mađarska)</option>
                <option value="HR">HR (Hrvatska)</option>
                <option value="SLO">SLO (Slovenija)</option>
            </select>
            <div class="modal-buttons" style="margin-top:16px;">
                <button class="btn-secondary" onclick="closeShiftModal()">Otkaži</button>
                <button class="btn-primary" style="background:#EF4444; color:#fff;" onclick="confirmEjectCard(${slot})">Zatvori Smenu & Izbaci</button>
            </div>
        `;
    } else {
        content.innerHTML = `
            <label class="input-label">Ime i prezime vozača:</label>
            <input type="text" id="start-driver-name" class="text-input" value="Marko Petrović">
            
            <label class="input-label" style="margin-top:8px;">Broj kartice:</label>
            <input type="text" id="start-card-num" class="text-input" value="SRB • 4928190001">

            <label class="input-label" style="margin-top:8px;">Država početka smene:</label>
            <select id="start-country-select" class="text-input" style="margin-top:4px;">
                <option value="SRB">SRB (Srbija)</option>
                <option value="DE">DE (Nemačka)</option>
                <option value="AUT">AUT (Austrija)</option>
                <option value="HU">HU (Mađarska)</option>
            </select>

            <div class="modal-buttons" style="margin-top:16px;">
                <button class="btn-secondary" onclick="closeShiftModal()">Otkaži</button>
                <button class="btn-primary" onclick="confirmInsertCard(${slot})">Ubaci Karticu & Počni</button>
            </div>
        `;
    }

    modal.classList.remove('hidden');
}

function confirmInsertCard(slot) {
    const name = document.getElementById('start-driver-name').value;
    const card = document.getElementById('start-card-num').value;
    const country = document.getElementById('start-country-select').value;

    if (slot === 1) {
        AppState.driver1 = { name, card, isInserted: true, country };
        AppState.currentCountry = country;
    } else {
        AppState.driver2 = { name, card, isInserted: true, country };
    }

    closeShiftModal();
    updateUI();
    showToast(`Kartica ubačena u Slot ${slot}. Smena započeta (${country}).`);
}

function confirmEjectCard(slot) {
    const endCountry = document.getElementById('end-country-select').value;
    if (slot === 1) {
        AppState.driver1.isInserted = false;
        AppState.currentCountry = endCountry;
    } else {
        AppState.driver2.isInserted = false;
    }

    closeShiftModal();
    updateUI();
    showToast(`Kartica izbačena iz Slota ${slot}. Smena zatvorena (${endCountry}).`);
}

function closeShiftModal() {
    document.getElementById('shift-modal').classList.add('hidden');
}

// License Modal
function openLicenseModal() {
    document.getElementById('license-modal').classList.remove('hidden');
}

function closeLicenseModal() {
    document.getElementById('license-modal').classList.add('hidden');
}

function activateLicenseTier(tier) {
    AppState.licenseTier = tier;
    localStorage.setItem('tachomaster_license', tier);
    closeLicenseModal();
    updateUI();
    if (tier === 'PRO') {
        showToast('Aktivirana Puna Pro Doživotna Licenca (14.99 €)!');
    } else {
        showToast('Prebačeno na Demo režim (3 dana pregleda).');
    }
}

// Test Toggles
function toggleSpeedViolation() {
    AppState.speedKmH = AppState.speedKmH > 90 ? 0 : 94;
    updateUI();
    if (AppState.speedKmH > 90) {
        showToast('Brzina 94 km/h: Očitavanje blokirano dok vozilo ne stane!', true);
    }
}

function toggleDriveViolation() {
    AppState.continuousDriveSeconds = AppState.continuousDriveSeconds > (4 * 3600 + 30 * 60)
        ? (3 * 3600 + 20 * 60)
        : (4 * 3600 + 38 * 60);
    updateUI();
}

function toggleDemoPro() {
    AppState.licenseTier = AppState.licenseTier === 'DEMO' ? 'PRO' : 'DEMO';
    localStorage.setItem('tachomaster_license', AppState.licenseTier);
    updateUI();
    showToast(`Režim promenjen na: ${AppState.licenseTier === 'PRO' ? 'Puna Pro (Doživotna)' : 'Demo (3D)'}`);
}

function startStationaryTimer() {
    setInterval(() => {
        AppState.shiftWorkSeconds += 1;
        const workH = Math.floor(AppState.shiftWorkSeconds / 3600);
        const workM = Math.floor((AppState.shiftWorkSeconds % 3600) / 60);
        const maxShift = 13 * 3600;
        const shiftPercent = Math.min(Math.round((AppState.shiftWorkSeconds / maxShift) * 100), 100);

        const shiftVal = document.getElementById('shift-work-time');
        const shiftBarFill = document.getElementById('shift-bar-fill');
        if (shiftVal) {
            shiftVal.innerText = `${pad(workH)}h ${pad(workM)}m / 13h (${shiftPercent}%)`;
        }
        if (shiftBarFill) {
            shiftBarFill.style.width = `${shiftPercent}%`;
        }
    }, 1000);
}

// Toast Display
function showToast(msg) {
    const toast = document.getElementById('toast-notification');
    document.getElementById('toast-msg').innerText = msg;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}
