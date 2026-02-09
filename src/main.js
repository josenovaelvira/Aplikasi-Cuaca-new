import './style.css';
import { createIcons, icons } from 'lucide';

// Initialize Icons
createIcons({ icons });

// --- INIT: Auto Load Jakarta ---
window.addEventListener('DOMContentLoaded', () => {
    // Langsung cari Jakarta saat aplikasi dibuka
    manualSearch("Jakarta");
});

// --- SUGGESTION LOGIC ---
let debounceTimer;
const searchInput = document.getElementById('searchInput');
const suggestionBox = document.getElementById('suggestionBox');
const suggestionList = document.getElementById('suggestionList');

searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const query = e.target.value;

    if (query.length < 3) {
        suggestionBox.classList.add('hidden');
        return;
    }

    debounceTimer = setTimeout(() => fetchSuggestions(query), 400);
});

async function fetchSuggestions(query) {
    try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=id&format=json`);
        const data = await res.json();

        if (data.results && data.results.length > 0) {
            renderSuggestions(data.results);
        } else {
            suggestionBox.classList.add('hidden');
        }
    } catch (err) {
        console.error("Suggestion error:", err);
    }
}

function renderSuggestions(results) {
    suggestionList.innerHTML = '';
    results.forEach(loc => {
        const div = document.createElement('div');
        div.className = 'suggestion-item p-3 cursor-pointer transition-colors border-b border-white/5 last:border-0';
        div.innerHTML = `
            <div class="font-bold text-sm text-white">${loc.name}</div>
            <div class="text-[10px] text-white/50">${loc.admin1 || ''}, ${loc.country}</div>
        `;
        div.onclick = () => {
            searchInput.value = loc.name;
            suggestionBox.classList.add('hidden');
            processWeather(loc);
        };
        suggestionList.appendChild(div);
    });
    suggestionBox.classList.remove('hidden');
}

document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !suggestionBox.contains(e.target)) {
        suggestionBox.classList.add('hidden');
    }
});

// --- WEATHER LOGIC ---
function getWInfo(code) {
    const map = {
        0: { desc: "Cerah", icon: "Sun" },
        1: { desc: "Cerah Berawan", icon: "CloudSun" },
        2: { desc: "Berawan", icon: "Cloud" },
        3: { desc: "Mendung", icon: "CloudFog" },
        45: { desc: "Berkabut", icon: "AlignJustify" },
        51: { desc: "Gerimis", icon: "CloudDrizzle" },
        61: { desc: "Hujan", icon: "CloudRain" },
        95: { desc: "Badai Petir", icon: "CloudLightning" }
    };
    return map[code] || (code > 90 ? map[95] : (code > 50 ? map[61] : map[0]));
}

function getUVLabel(uv) {
    if (uv <= 2) return { text: "Rendah", color: "text-green-300" };
    if (uv <= 5) return { text: "Sedang", color: "text-yellow-300" };
    if (uv <= 7) return { text: "Tinggi", color: "text-orange-300" };
    if (uv <= 10) return { text: "Sgt Tinggi", color: "text-red-400" };
    return { text: "Ekstrem", color: "text-purple-400" };
}

// Attach to window so it can be called from HTML onclick if needed, though we should prefer event listeners
window.manualSearch = async function (queryOverride = null) {
    const query = queryOverride || searchInput.value;
    if (!query) return;

    suggestionBox.classList.add('hidden');
    showStatus(true, "Mencari lokasi...");

    try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=id&format=json`);
        const data = await res.json();
        if (data.results) processWeather(data.results[0]);
        else {
            // Jika tidak ditemukan dan bukan auto-load, beri alert
            if (!queryOverride) alert("Lokasi tidak ditemukan.");
            showStatus(false);
        }
    } catch (e) {
        console.error(e);
        showStatus(false);
    }
}

async function processWeather(loc) {
    showStatus(true, "Mengambil data...");
    try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,is_day,wind_speed_10m&hourly=temperature_2m,weather_code,uv_index,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`);
        const data = await res.json();
        updateUI(loc.name, loc.admin1 || loc.country, data);
        showStatus(false);
        document.getElementById('weatherDashboard').classList.remove('hidden');
    } catch (e) {
        alert("Gagal memuat data.");
        showStatus(false);
    }
}

function updateUI(name, sub, data) {
    const cur = data.current;
    const hour = data.hourly;
    const info = getWInfo(cur.weather_code);
    const nowHour = new Date().getHours();

    document.getElementById('areaName').textContent = name;
    document.getElementById('areaSub').textContent = sub;
    document.getElementById('tempValue').textContent = Math.round(cur.temperature_2m);
    document.getElementById('weatherDesc').textContent = info.desc;

    // Updated icon handling for Lucide
    const iconContainer = document.getElementById('weatherIconDisplay');
    iconContainer.innerHTML = `<i data-lucide="${info.icon.replace(/[A-Z]/g, m => "-" + m.toLowerCase()).replace(/^-/, "")}" class="w-24 h-24 text-white"></i>`;

    document.getElementById('currentHumValue').textContent = cur.relative_humidity_2m;

    const hIndex = hour.time.findIndex(t => new Date(t).getHours() === nowHour);
    const uvNow = hIndex !== -1 ? hour.uv_index[hIndex] : 0;
    const uvInfo = getUVLabel(uvNow);
    document.getElementById('currentUvValue').innerHTML = `${uvNow} <span class="text-[10px] font-normal opacity-70 ${uvInfo.color}">${uvInfo.text}</span>`;

    const tableBody = document.getElementById('combinedTableBody');
    tableBody.innerHTML = '';
    for (let i = nowHour; i < nowHour + 10; i++) {
        if (!hour.time[i]) break;
        const time = new Date(hour.time[i]).getHours().toString().padStart(2, '0') + ":00";
        const uv = hour.uv_index[i];
        const hum = hour.relative_humidity_2m[i];
        const uvColor = uv > 6 ? 'text-red-400' : (uv > 2 ? 'text-orange-300' : 'text-green-300');

        tableBody.innerHTML += `
            <tr class="uv-row border-b border-white/5">
                <td class="py-2 opacity-60">${time}</td>
                <td class="py-2 text-center font-bold ${uvColor}">${uv}</td>
                <td class="py-2 text-right font-medium text-blue-300">${hum}%</td>
            </tr>`;
    }

    const hScroll = document.getElementById('hourlyScroll');
    hScroll.innerHTML = '';
    for (let i = nowHour; i < nowHour + 24; i++) {
        if (!hour.time[i]) break;
        const hTime = new Date(hour.time[i]).getHours();
        const hInfo = getWInfo(hour.weather_code[i]);
        // Convert camelCase icon name to kebab-case for data-lucide attribute
        const iconName = hInfo.icon.replace(/[A-Z]/g, m => "-" + m.toLowerCase()).replace(/^-/, "");

        hScroll.innerHTML += `
            <div class="glass-light min-w-[65px] p-3 rounded-2xl flex flex-col items-center gap-1.5">
                <span class="text-[10px] opacity-40">${hTime}:00</span>
                <i data-lucide="${iconName}" class="w-5 h-5"></i>
                <span class="font-bold text-xs">${Math.round(hour.temperature_2m[i])}°</span>
            </div>`;
    }

    const dList = document.getElementById('dailyList');
    dList.innerHTML = '';
    for (let i = 1; i < 7; i++) {
        const daily = data.daily;
        const dInfo = getWInfo(daily.weather_code[i]);
        const iconName = dInfo.icon.replace(/[A-Z]/g, m => "-" + m.toLowerCase()).replace(/^-/, "");

        dList.innerHTML += `
            <div class="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl transition-colors">
                <span class="w-12 text-xs font-bold uppercase">${new Date(daily.time[i]).toLocaleDateString('id-ID', { weekday: 'long' })}</span>
                <div class="flex items-center gap-2 flex-1 justify-center opacity-70 text-[10px] uppercase">
                    <i data-lucide="${iconName}" class="w-4 h-4"></i>
                    <span>${dInfo.desc}</span>
                </div>
                <div class="w-16 text-right text-xs">
                    <span class="font-bold">${Math.round(daily.temperature_2m_max[i])}°</span>
                    <span class="opacity-30 ml-1">${Math.round(daily.temperature_2m_min[i])}°</span>
                </div>
            </div>`;
    }

    const body = document.getElementById('appBody');
    body.style.background = cur.is_day ? 'linear-gradient(to bottom right, #3b82f6, #1d4ed8)' : 'linear-gradient(to bottom right, #0f172a, #1e293b)';

    // Re-initialize icons for newly added content
    createIcons({ icons });
}

function showStatus(show, text = "") {
    const box = document.getElementById('statusBox');
    if (show) {
        box.classList.remove('hidden');
        document.getElementById('statusText').textContent = text;
    } else {
        box.classList.add('hidden');
    }
}

document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') manualSearch();
});
