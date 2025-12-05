// ===================== GLOBAL CHART VARIABLES =====================

let rainChart = null;           // กราฟด้านบนสุด
let waterCompareChart = null;   // กราฟล่างซ้าย
let deficitChart = null;        // กราฟล่างขวา

// ===================== LOADING OVERLAY ELEMENTS =====================

const rainChartLoading = document.getElementById("rainChartLoading");
const waterCompareLoading = document.getElementById("waterCompareLoading");
const deficitChartLoading = document.getElementById("deficitChartLoading");

function setLoading(el, isLoading) {
    if (!el) return;
    if (isLoading) {
        el.classList.remove("hidden");
    } else {
        el.classList.add("hidden");
    }
}

// ===================== GLOBAL MAP VARIABLES =====================

let map = null;         // แผนที่ Leaflet
let areaMarker = null;  // marker แสดงตำแหน่งพื้นที่ปลูก
let riceLayer = null;   // layer สำหรับแสดงนาข้าว (วงกลมสีเหลือง)

// ฟังก์ชัน format ตัวเลขเป็นรูปแบบไทย
function formatNumberTH(value) {
    if (value === null || value === undefined || isNaN(value)) return "-";
    return Number(value).toLocaleString("th-TH");
}

// ===================== ฟังก์ชันสร้าง/อัปเดตกาฟจาก planting_scenario =====================

function buildRainChart(labels, demand, supply) {
    const ctx = document.getElementById('rainChart').getContext('2d');

    if (rainChart) {
        rainChart.data.labels = labels;
        rainChart.data.datasets[0].data = demand;
        rainChart.data.datasets[1].data = supply;
        rainChart.update();
    } else {
        rainChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        type: 'bar',
                        label: 'ความต้องการน้ำรวม',
                        data: demand,
                        backgroundColor: 'rgba(91,155,213,0.7)',
                        // 👇 เพิ่มสามบรรทัดนี้ให้แท่งไม่ใหญ่เกินกรอบ
                        categoryPercentage: 0.7,
                        barPercentage: 0.7,
                        maxBarThickness: 40
                    },
                    {
                        type: 'line',
                        label: 'ปริมาณน้ำที่ใช้ได้',
                        data: supply,
                        borderColor: '#f4a22b',
                        backgroundColor: '#f4a22b',
                        tension: 0.3,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: {
                    x: { grid: { display: false }, offset: false },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'ลบ.ม./ไร่' }
                    }
                }
            }
        });
    }

    setTimeout(syncRiceBarToChart, 0);
}

// วาดกราฟปริมาณน้ำฝน (แท่ง + เส้น)
function updateRainChart(labels, barValues, barColors, prevYear, avg15) {
    const ctx = document.getElementById('rainChart').getContext('2d');
    const n = labels.length || 0;

    function norm(arr) {
        if (!Array.isArray(arr)) return new Array(n).fill(0);
        if (arr.length !== n) return new Array(n).fill(0);
        return arr.map(v => {
            const num = Number(v);
            return Number.isFinite(num) ? num : 0;
        });
    }

    barValues = norm(barValues);
    barColors = Array.isArray(barColors) && barColors.length === n
        ? barColors
        : new Array(n).fill('#5b9bd5');

    prevYear = norm(prevYear);
    avg15 = norm(avg15);

    // เช็กว่า rainChart ที่มีอยู่ “โครงสร้างพร้อมใช้” ไหม (ต้องมี 3 datasets)
    const canReuse =
        rainChart &&
        rainChart.data &&
        Array.isArray(rainChart.data.datasets) &&
        rainChart.data.datasets.length >= 3;

    if (canReuse) {
        // อัปเดตกราฟเดิม
        rainChart.data.labels = labels;
        rainChart.data.datasets[0].data = barValues;
        rainChart.data.datasets[0].backgroundColor = barColors;
        rainChart.data.datasets[1].data = prevYear;
        rainChart.data.datasets[2].data = avg15;
        rainChart.update();

        setTimeout(syncRiceBarToChart, 0);
        return;
    }

    // ถ้ามีกราฟแต่โครงสร้างไม่ตรง (เช่นมาจาก drawFallbackRainChart / buildRainChart)
    if (rainChart) {
        rainChart.destroy();
        rainChart = null;
    }

    // สร้างกราฟใหม่ให้มี 3 datasets เสมอ
    rainChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'ปริมาณน้ำฝน (ค่าจริง / คาดการณ์ / ปัจจุบัน)',
                    data: barValues,
                    backgroundColor: barColors,
                    maxBarThickness: 40
                },
                {
                    type: 'line',
                    label: 'ปริมาณน้ำฝนปีก่อน',
                    data: prevYear,
                    borderColor: '#f4a22b',
                    backgroundColor: '#f4a22b',
                    tension: 0.3,
                    fill: false,
                    spanGaps: true   // ข้ามค่าที่เป็น null
                },
                {
                    type: 'line',
                    label: 'ค่าเฉลี่ยน้ำฝน 15 ปี',
                    data: avg15,
                    borderColor: '#7f7f7f',
                    backgroundColor: '#7f7f7f',
                    tension: 0.3,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'false' }
            },
            scales: {
                x: {
                    grid: { display: false },
                    offset: false        // ให้แท่ง/ช่องข้าวเรียงพอดีขอบ
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'ปริมาณน้ำฝน (หน่วย : ลบ.ม./ไร่)'
                    }
                }
            }
        }
    });

    setTimeout(syncRiceBarToChart, 0);
}


// วาดกราฟ fallback เวลาโหลดข้อมูลฝนไม่ได้ / API error
function drawFallbackRainChart() {
    const canvas = document.getElementById('rainChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // ถ้ามีกราฟอยู่แล้ว ให้เคลียร์ข้อมูลแล้วอัปเดตเป็นค่าว่าง
    if (rainChart) {
        rainChart.data.labels = [];
        rainChart.data.datasets.forEach(ds => {
            ds.data = [];
        });
        rainChart.update();
        return;
    }

    // ถ้ายังไม่เคยมีกราฟ สร้างกราฟเปล่า ๆ ไว้
    rainChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    type: 'bar',
                    label: 'ปริมาณน้ำฝน (ไม่มีข้อมูล)',
                    data: [],
                    backgroundColor: '#5b9bd5',
                    maxBarThickness: 40
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                x: { grid: { display: false } },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'ปริมาณน้ำฝน (หน่วย : ลบ.ม./ไร่)'
                    }
                }
            }
        }
    });
}


function buildWaterCompareChart(labels, demand, supply) {
    const ctx = document.getElementById('waterCompareChart').getContext('2d');

    // ใช้ข้อมูล per-dekad ตรง ๆ
    if (waterCompareChart) {
        waterCompareChart.data.labels = labels;
        waterCompareChart.data.datasets[0].data = supply;
        waterCompareChart.data.datasets[1].data = demand;
        waterCompareChart.update();
    } else {
        waterCompareChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        type: 'bar',
                        label: 'ปริมาณน้ำที่ใช้ได้',
                        data: supply,
                        backgroundColor: 'rgba(91,155,213,0.7)'
                    },
                    {
                        type: 'line',
                        label: 'ความต้องการน้ำรวม',
                        data: demand,
                        borderColor: '#7030a0',
                        backgroundColor: '#7030a0',
                        tension: 0.3,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        color: '#000',
                        font: { size: 10 },
                        formatter: (v) => v.toFixed(0)
                    }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'ลบ.ม./ไร่' }
                    }
                }
            },
            plugins: [ChartDataLabels]

        });
    }
}


function buildDeficitChart(labels, demand, supply) {
    const ctx = document.getElementById('deficitChart').getContext('2d');

    const deficits = demand.map((d, i) => {
        const s = supply[i] ?? 0;
        return Math.max(0, d - s);
    });

    if (deficitChart) {
        deficitChart.data.labels = labels;
        deficitChart.data.datasets[0].data = deficits;
        deficitChart.update();
    } else {
        deficitChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'ปริมาณการขาดแคลนน้ำ',
                    data: deficits,
                    borderColor: '#ff0000',
                    backgroundColor: '#ff0000',
                    tension: 0.3,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        color: '#000',
                        font: { size: 10 },
                        formatter: (v) => v.toFixed(0)
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        offset: false,
                        ticks: { maxRotation: 60, minRotation: 60 }
                    },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'ลบ.ม./ไร่' }
                    }
                }
            },
            plugins: [ChartDataLabels]

        });
    }
}

// ===================== ICON BAR + SYNC กับกราฟบน =====================

const riceStageBar = document.getElementById('riceStageBar');

function syncRiceBarToChart() {
    if (!rainChart || !rainChart.chartArea || !riceStageBar) return;

    const ca = rainChart.chartArea;
    const canvasRect = rainChart.canvas.getBoundingClientRect();
    const leftPadding = ca.left - canvasRect.left;

    // ใช้ระยะคงที่ ไม่อิง chartArea แล้ว จะได้ไม่วิ่งไปวิ่งมาเวลา resize/zoom
    riceStageBar.style.paddingLeft = "48px";  // ถ้าอยากขยับอีกนิดค่อยปรับเลขนี้
    riceStageBar.style.paddingRight = "8px";
}

window.addEventListener('resize', syncRiceBarToChart);

/**
 * สร้างแถบรูปข้าวจากข้อมูล crop_calendar
 * data: array ของ object ที่มี dekad, date_start, date_end, dekad_label,
 *       is_planting_period, yield_reduction_level, yield_reduction_desc
 */
function renderRiceStageBar(data) {
    if (!riceStageBar) return;

    riceStageBar.innerHTML = "";
    if (!Array.isArray(data) || data.length === 0) return;

    const plantingCells = [];  // เก็บ cell ที่เป็นช่วงปลูกไว้เผื่อใช้ set active เริ่มต้น

    data.forEach((item, index) => {
        const cell = document.createElement("div");
        cell.className = "icon-cell";

        const isPlanting = !!item.is_planting_period;

        cell.dataset.index = index;
        cell.dataset.dekad = item.dekad;
        cell.dataset.dekadLabel = item.dekad_label || "";
        cell.dataset.dateStart = item.date_start || "";
        cell.dataset.dateEnd = item.date_end || "";
        cell.dataset.isPlanting = isPlanting ? "1" : "0";
        cell.dataset.yieldLevel = item.yield_reduction_level ?? "";

        // แสดงไอคอนข้าวเฉพาะ dekad ที่เป็นช่วงปลูก
        if (isPlanting) {
            cell.textContent = "🌾";
            plantingCells.push(cell);
        } else {
            cell.textContent = "";           // ช่องว่าง
            cell.classList.add("no-crop");   // ไว้เผื่ออยากแต่งสีจาง ๆ ทีหลัง
        }

        // tooltip
        const rangeText = item.date_start && item.date_end
            ? `${item.date_start} - ${item.date_end}`
            : "";
        const descText = item.yield_reduction_desc || "";
        cell.title = `${item.dekad_label || ""}\n${rangeText}\n${descText}`.trim();

        // เน้นช่วงปลูกด้วยเส้นใต้ (ถ้าพี่เลี้ยงชอบ)
        if (isPlanting) {
            cell.classList.add("planting");
        }

        // สีตามระดับผลผลิตลดลง (0 = เขียว, 1 = เหลือง, 2 = แดง)
        const lvl = item.yield_reduction_level;
        if (lvl === 0) cell.classList.add("level-0");
        else if (lvl === 1) cell.classList.add("level-1");
        else if (lvl === 2) cell.classList.add("level-2");

        // ✅ ให้ "คลิกได้ทุก dekad" ทั้ง 36 ช่อง (ไม่ต้องมี if(isPlanting) แล้ว)
        cell.addEventListener("click", () => {
            // ขยับ pointer ตาม dekad ที่คลิก (ใช้ level จาก crop_calendar)
            updateCostPointerFromYieldReduction([item]);

            // เปลี่ยน active
            const all = riceStageBar.querySelectorAll(".icon-cell");
            all.forEach(c => c.classList.remove("active"));
            cell.classList.add("active");

            // date สำหรับ planting_scenario (dd-mm-yyyy)
            const dateScenario = formatDateForScenario(item.date_start);
            // month_year สำหรับ yield_reduction_calendar (mm-yyyy)
            const monthYear = extractMonthYear(item.date_start);

            if (currentAreaCode) {
                // อัปเดตกราฟสถานการณ์น้ำตาม dekad ที่เลือก
                loadPlantingScenario(currentAreaCode, dateScenario);

                // อัปเดตปฏิทินระดับความเสี่ยงตามเดือนของ dekad ที่คลิก
                if (monthYear) {
                    loadYieldReduction(currentAreaCode, monthYear);
                } else {
                    loadYieldReduction(currentAreaCode);
                }
            }
        });

        riceStageBar.appendChild(cell);
    });

    // ปรับ grid ให้มีคอลัมน์เท่าจำนวน dekad ทั้งปี (36 ช่อง)
    riceStageBar.style.gridTemplateColumns = `repeat(${data.length}, 1fr)`;

    // ตั้ง active เริ่มต้น = ช่องแรกที่เป็นช่วงปลูก (ถ้ามี)
    const firstActive = plantingCells[0] || riceStageBar.querySelector(".icon-cell");
    if (firstActive) {
        firstActive.classList.add("active");
    }

    // sync ตำแหน่งกับกราฟ
    setTimeout(syncRiceBarToChart, 0);
}


// ===================== LEAFLET MAP =====================

const mapDiv = document.getElementById('map');
if (mapDiv) {
    const centerLatLng = [7.617, 100.077];

    // ใช้ตัวแปร global แทน const local
    map = L.map('map').setView(centerLatLng, 11);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // เก็บ marker ไว้ในตัวแปร global เพื่อนำไปขยับทีหลัง
    areaMarker = L.marker(centerLatLng)
        .addTo(map)
        // .bindPopup('พื้นที่ตัวอย่างปลูกข้าว<br>อ.เมือง จ.พัทลุง')
        .openPopup();
}

function updateMapFromRainForecast(data) {
    // กันพลาด ถ้า map ยังไม่ถูกสร้างขึ้น หรือไม่มี data
    if (!map || !data) return;

    const lat = data.lat;
    const lon = data.lon;

    // ตรวจว่ามี lat/lon เป็นตัวเลขจริง ๆ
    if (typeof lat !== "number" || typeof lon !== "number") {
        console.warn("rain_forecast: ไม่มี lat/lon หรือไม่ใช่ตัวเลข", lat, lon);
        return;
    }

    // ถ้ายังไม่มี marker ให้สร้างใหม่
    if (!areaMarker) {
        areaMarker = L.marker([lat, lon]).addTo(map);
    } else {
        // ถ้ามีแล้ว ขยับตำแหน่ง
        areaMarker.setLatLng([lat, lon]);
    }

    // เลื่อนมุมมองแผนที่ไปยังตำแหน่งนั้น
    map.setView([lat, lon], 11);    // จะเพิ่ม/ลด zoom level ก็ปรับเลขนี้ได้

    // 🔶 วาดพื้นที่นาข้าวเป็นวงกลมสีเหลืองรอบจุดนี้
    showRiceAreaFromPoint(lat, lon, 800);   // ปรับ 800 เป็นรัศมีที่อยากให้ครอบพื้นที่
}

function showRiceAreaFromPoint(lat, lon, radius = 800) {
    if (!map) return;

    // ลบ layer เก่า ถ้ามี
    if (riceLayer) {
        map.removeLayer(riceLayer);
    }

    // วาดวงกลมสีเหลืองรอบจุดที่สนใจ
    riceLayer = L.circle([lat, lon], {
        radius: radius,        // หน่วยเมตร ปรับใหญ่/เล็กได้
        color: '#ffcc00',      // เส้นขอบเหลือง
        weight: 2,
        fillColor: '#fff4a3',  // พื้นเหลืองอ่อน
        fillOpacity: 0.5
    }).addTo(map);
}



// ===================== YIELD REDUCTION (ปฏิทิน + ต้นทุน) =====================

// เพิ่มพารามิเตอร์ monthYearOverride (เช่น "09-2025")
async function loadYieldReduction(areaCode, monthYearOverride) {
    areaCode = areaCode || currentAreaCode;

    if (!areaCode) return;

    try {
        const params = new URLSearchParams({
            area_code: areaCode,
            rice_variety: currentRiceVariety,
            planting_method: currentPlantingMethod
        });

        // ถ้ามีส่ง monthYearOverride มาด้วย ให้ส่งขึ้น backend เป็น month_year
        if (monthYearOverride) {
            params.append("month_year", monthYearOverride);
        }

        const res = await fetch(`/api/yield_reduction?${params.toString()}`);
        if (!res.ok) {
            throw new Error("HTTP status " + res.status);
        }

        const data = await res.json();
        console.log("yield_reduction data:", data);

        updateCostPointerFromYieldReduction(data);
        renderYieldReductionCalendar(data);

    } catch (err) {
        console.error("โหลดข้อมูล yield_reduction ไม่ได้:", err);
    }
}



function updateCostPointerFromYieldReduction(data) {
    const pointer = document.querySelector(".cost-pointer");
    if (!pointer || !Array.isArray(data) || data.length === 0) return;

    const avgLevel =
        data.reduce((sum, d) => sum + (d.yield_reduction_level ?? 0), 0) / data.length;

    if (avgLevel < 0.5) {
        pointer.style.left = "15%";  // ตามเกณฑ์ (เขียว)
    } else if (avgLevel < 1.5) {
        pointer.style.left = "50%";  // ต่ำกว่าเกณฑ์ (เหลือง)
    } else {
        pointer.style.left = "85%";  // ต่ำกว่าเกณฑ์มาก (แดง)
    }
}

function renderYieldReductionCalendar(data) {
    const grid = document.getElementById("yield-calendar-grid");
    const titleEl = document.getElementById("yield-calendar-title");
    if (!grid || !Array.isArray(data) || data.length === 0) return;

    const items = data.map(d => ({
        dateObj: new Date(d.date),
        level: d.yield_reduction_level ?? 0,
        desc: d.yield_reduction_desc || ""
    }));

    const first = items[0].dateObj;
    const year = first.getFullYear();
    const month = first.getMonth();

    const monthNamesTh = [
        "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
        "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];
    if (titleEl) {
        titleEl.textContent = `ปฏิทิน ${monthNamesTh[month]} ${year + 543}`;
    }

    const dayMap = {};
    items.forEach(it => {
        const day = it.dateObj.getDate();
        dayMap[day] = it;
    });

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1);
    const startWeekday = (firstDay.getDay() + 6) % 7;  // Monday=0

    const weekdayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    grid.innerHTML = "";

    grid.appendChild(document.createElement("div"));
    weekdayNames.forEach(name => {
        const hd = document.createElement("div");
        hd.className = "calendar-day-header";
        hd.textContent = name;
        grid.appendChild(hd);
    });

    let day = 1;
    let weekIndex = 1;

    while (day <= daysInMonth) {
        const weekLabel = document.createElement("div");
        weekLabel.className = "calendar-week-label";
        weekLabel.textContent = `Week ${weekIndex}`;
        grid.appendChild(weekLabel);

        for (let wd = 0; wd < 7; wd++) {
            const cell = document.createElement("div");
            cell.className = "calendar-cell";

            const box = document.createElement("div");
            box.className = "calendar-cell-box";

            if ((weekIndex === 1 && wd < startWeekday) || day > daysInMonth) {
                box.textContent = "";
                box.classList.add("no-data");
            } else {
                const info = dayMap[day];
                box.textContent = day.toString();

                if (info) {
                    const lvl = info.level;
                    if (lvl === 0) box.classList.add("level-0");
                    else if (lvl === 1) box.classList.add("level-1");
                    else box.classList.add("level-2");
                    box.title = info.desc || "";
                } else {
                    box.classList.add("no-data");
                }

                day++;
            }

            cell.appendChild(box);
            grid.appendChild(cell);
        }

        weekIndex++;
    }
}

// ===================== DROPDOWN จังหวัด-อำเภอ-ตำบล =====================

const provinceSelect = document.getElementById("provinceSelect");
const districtSelect = document.getElementById("districtSelect");
const subdistrictSelect = document.getElementById("subdistrictSelect");
const riceVarietySelect = document.getElementById("riceVarietySelect");
const plantingMethodSelect = document.getElementById("plantingMethodSelect");

let currentAmphoeMap = {};
let currentAreaCode = "";  // ค่าเริ่มต้นตอนเปิดหน้า (พัทลุงที่ใช้ demo)

// helper แปลง '2025-09-11' -> '11-09-2025' สำหรับ planting_scenario
function formatDateForScenario(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return "";
    const [y, m, d] = parts;
    return `${d}-${m}-${y}`;
}

// helper แปลง '2025-09-11' -> '09-2025' สำหรับ yield_reduction_calendar
function extractMonthYear(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return "";
    const [y, m, d] = parts;   // รูปแบบเดิมคือ YYYY-MM-DD
    return `${m}-${y}`;        // แปลงเป็น MM-YYYY ให้ตรงกับ backend
}


// โหลดข้อมูล crop_calendar ตาม area_code แล้ววาดช่องรูปข้าว
async function loadCropCalendar(areaCode, riceVariety, plantingMethod) {
    areaCode = areaCode || currentAreaCode;
    riceVariety = riceVariety || currentRiceVariety;
    plantingMethod = plantingMethod || currentPlantingMethod;

    if (!areaCode) return;

    try {
        const params = new URLSearchParams({
            area_code: areaCode,
            rice_variety: riceVariety,
            planting_method: plantingMethod
        });

        const res = await fetch(`/api/crop_calendar?${params.toString()}`);
        if (!res.ok) {
            throw new Error("HTTP " + res.status);
        }

        const data = await res.json();
        console.log("crop_calendar data:", data);

        renderRiceStageBar(data);
        updateCostPointerFromYieldReduction(data);   // ขยับ pointer ตาม dekad

    } catch (err) {
        console.error("โหลดข้อมูล crop_calendar ไม่ได้:", err);
    }
}



async function loadSubdistrictsForProvince(provinceName) {
    if (!provinceName) return;

    try {
        const res = await fetch(
            `/api/subdistricts?province_name=${encodeURIComponent(provinceName)}`
        );

        if (!res.ok) {
            throw new Error("HTTP " + res.status);
        }

        const data = await res.json();
        console.log("subdistricts data:", data);

        const provinceData = data[provinceName] || {};

        currentAmphoeMap = provinceData;
        renderDistrictOptions(provinceData);
        clearSubdistrictOptions();
    } catch (err) {
        console.error("โหลดข้อมูล subdistricts ไม่ได้:", err);
    }
}

function renderDistrictOptions(amphoeMap) {
    districtSelect.innerHTML = '<option value="">-- กรุณาเลือกอำเภอ --</option>';

    Object.keys(amphoeMap).forEach((amphoeName) => {
        const opt = document.createElement("option");
        opt.value = amphoeName;
        opt.textContent = amphoeName;
        districtSelect.appendChild(opt);
    });
}

function clearSubdistrictOptions() {
    subdistrictSelect.innerHTML = '<option value="">-- กรุณาเลือกตำบล --</option>';
}

function renderSubdistrictOptions(amphoeName) {
    clearSubdistrictOptions();

    const list = currentAmphoeMap[amphoeName] || [];
    list.forEach((item) => {
        const opt = document.createElement("option");
        opt.value = item.area_code;
        opt.textContent = item.sub_district;
        opt.dataset.areaCode = item.area_code;
        subdistrictSelect.appendChild(opt);
    });
}

// ===================== NEW: โหลด planting_scenario ตาม area_code =====================

async function loadPlantingScenario(areaCode, dateOverride, riceVariety, plantingMethod) {
    areaCode = areaCode || currentAreaCode;
    riceVariety = riceVariety || currentRiceVariety;
    plantingMethod = plantingMethod || currentPlantingMethod;

    if (!areaCode) return;

    currentAreaCode = areaCode;

    const params = new URLSearchParams({
        area_code: areaCode,
        rice_variety: riceVariety,
        planting_method: plantingMethod
    });
    if (dateOverride) {
        params.append("date", dateOverride);
    }

    // ✅ เริ่มโหลด: โชว์ overlay ทั้งสองกราฟล่าง
    setLoading(waterCompareLoading, true);
    setLoading(deficitChartLoading, true);

    try {
        const res = await fetch(`/api/planting_scenario?${params.toString()}`);
        if (!res.ok) {
            throw new Error("HTTP " + res.status);
        }

        const data = await res.json();
        console.log("planting_scenario data:", data);

        const totalDemand = data.total_demand ?? 0;
        const totalSupply = data.total_supply ?? 0;
        const totalWB = data.total_water_balance ?? (totalDemand - totalSupply);
        const dateStartStr = data.date_start;
        const dateEndStr = data.date_end;

        const kpiDeficitEl = document.getElementById("kpi-water-deficit");
        const kpiDemandEl = document.getElementById("kpi-water-demand");
        const kpiSupplyEl = document.getElementById("kpi-water-supply");
        const kpiPeriodEl = document.getElementById("kpi-planting-period");

        if (kpiDeficitEl) kpiDeficitEl.textContent = formatNumberTH(totalWB);
        if (kpiDemandEl) kpiDemandEl.textContent = formatNumberTH(totalDemand);
        if (kpiSupplyEl) kpiSupplyEl.textContent = formatNumberTH(totalSupply);

        if (kpiPeriodEl && dateStartStr && dateEndStr) {
            kpiPeriodEl.textContent = `กำลังปลูก ${dateStartStr} - ${dateEndStr}`;
        }

        const wb = data.water_balance_data || {};
        let labelsRaw = wb.time_line || [];
        const demand = wb.demand || [];
        const supply = wb.supply || [];

        const labels = labelsRaw.map(item => {
            if (typeof item === "string") return item;
            if (item && item.dekad_label) return item.dekad_label;
            if (item && item.label) return item.label;
            return "";
        });

        buildWaterCompareChart(labels, demand, supply);
        buildDeficitChart(labels, demand, supply);

    } catch (err) {
        console.error("โหลดข้อมูล planting_scenario ไม่ได้:", err);
        // ถ้าอยากทำ fallback กราฟล่างก็ทำเพิ่มได้
    } finally {
        // ✅ โหลดเสร็จ หรือ error ก็ปิด overlay
        setLoading(waterCompareLoading, false);
        setLoading(deficitChartLoading, false);
    }
}


// ---------------------- EVENT LISTENERS ----------------------

if (provinceSelect) {
    provinceSelect.addEventListener("change", (e) => {
        const provinceName = e.target.value;
        loadSubdistrictsForProvince(provinceName);
    });

    if (provinceSelect.value) {
        loadSubdistrictsForProvince(provinceSelect.value);
    }
}

if (districtSelect) {
    districtSelect.addEventListener("change", (e) => {
        const amphoeName = e.target.value;
        renderSubdistrictOptions(amphoeName);
    });
}

// เปลี่ยนตำบล
if (subdistrictSelect) {
    subdistrictSelect.addEventListener("change", (e) => {
        const areaCode = e.target.value;
        console.log("เลือกตำบล area_code =", areaCode);

        currentAreaCode = areaCode;

        // โหลดข้อมูลตามตำบลใหม่ + ชนิดข้าว + วิธีปลูก
        loadRainForecast(areaCode);
        loadPlantingScenario(areaCode);
        loadCropCalendar(areaCode);
        loadYieldReduction(areaCode);
    });
}

// เปลี่ยนชนิดข้าว
if (riceVarietySelect) {
    riceVarietySelect.addEventListener("change", (e) => {
        currentRiceVariety = e.target.value;
        console.log("เลือกชนิดข้าว =", currentRiceVariety);

        if (!currentAreaCode) return;

        loadRainForecast(currentAreaCode);
        loadPlantingScenario(currentAreaCode);
        loadCropCalendar(currentAreaCode);
        loadYieldReduction(currentAreaCode);
    });
}

// เปลี่ยนวิธีปลูก
if (plantingMethodSelect) {
    plantingMethodSelect.addEventListener("change", (e) => {
        currentPlantingMethod = e.target.value;
        console.log("เลือกวิธีปลูก =", currentPlantingMethod);

        if (!currentAreaCode) return;

        loadRainForecast(currentAreaCode);
        loadPlantingScenario(currentAreaCode);
        loadCropCalendar(currentAreaCode);
        loadYieldReduction(currentAreaCode);
    });
}

// โหลดข้อมูลปริมาณน้ำฝน แล้วอัปเดตกราฟด้านบนสุด
// โหลดข้อมูลปริมาณน้ำฝน แล้วอัปเดตกราฟด้านบนสุด
// โหลดข้อมูลปริมาณน้ำฝน แล้วอัปเดตกราฟด้านบนสุด
// โหลดข้อมูลปริมาณน้ำฝน แล้วอัปเดตกราฟด้านบนสุด
async function loadRainForecast(areaCode) {
    areaCode = areaCode || currentAreaCode;
    if (!areaCode) return;

    // ✅ เริ่มโหลด: โชว์ overlay กราฟฝน
    setLoading(rainChartLoading, true);

    try {
        const params = new URLSearchParams({
            area_code: areaCode,
            date: "01-06-2025",          // ไว้เดี๋ยวค่อยปรับทีหลัง
            rice_variety: currentRiceVariety,
            planting_method: currentPlantingMethod
        });

        const res = await fetch(`/api/rain_forecast?${params.toString()}`);

        if (!res.ok) {
            console.error("rain_forecast HTTP status:", res.status);
            drawFallbackRainChart();
            return;
        }

        const data = await res.json();
        console.log("rain_forecast data:", data);

        // ⭐ อัปเดตแผนที่จาก lat/lon ที่ได้มาจาก API
        updateMapFromRainForecast(data);

        if (!data || !data.rainfall_data) {
            drawFallbackRainChart();
            return;
        }

        const rf = data.rainfall_data;

        // ---------- labels 36 dekad ----------
        const labels = Array.isArray(rf.time_line) ? rf.time_line : [];
        if (!labels.length) {
            drawFallbackRainChart();
            return;
        }
        const n = labels.length;

        function norm(arr) {
            const out = new Array(n).fill(0);
            if (!Array.isArray(arr)) return out;

            for (let i = 0; i < n; i++) {
                const raw = arr[i];
                const num = Number(raw);
                out[i] = Number.isFinite(num) ? num : 0;
            }
            return out;
        }

        const currentLabel =
            data.current_dakad_label ||
            data.current_dekad_label ||
            rf.current_dakad_label ||
            rf.current_dekad_label ||
            "";

        let currentIndex = -1;
        if (currentLabel) {
            currentIndex = labels.indexOf(currentLabel);
        }

        console.log("labels:", labels);
        console.log("currentLabel:", currentLabel, "currentIndex:", currentIndex);

        const rainfallArr = Array.isArray(rf.rainfall) ? rf.rainfall : [];
        const barValues = new Array(n).fill(0);
        const barColors = new Array(n).fill("#5b9bd5");

        for (let i = 0; i < n; i++) {
            const item = rainfallArr[i] || {};
            const val = (typeof item.precipitation === "number" && !isNaN(item.precipitation))
                ? item.precipitation
                : 0;
            barValues[i] = val;

            let color = "#5b9bd5"; // คาดการณ์
            if (currentIndex >= 0) {
                if (i < currentIndex) {
                    color = "#1f4e79"; // ก่อนปัจจุบัน = ค่าจริง
                } else if (i === currentIndex) {
                    color = "#00b0f0"; // ปัจจุบัน
                } else {
                    color = "#5b9bd5"; // หลังปัจจุบัน = คาดการณ์
                }
            }
            barColors[i] = color;
        }

        const prevYearArr = norm(rf.last_year_rainfall || []);
        const avg15Arr = norm(rf.avg_15yrs || []);

        console.log("barValues :", barValues);
        console.log("prevYearArr:", prevYearArr);
        console.log("avg15Arr   :", avg15Arr);

        updateRainChart(labels, barValues, barColors, prevYearArr, avg15Arr);

    } catch (err) {
        console.error("โหลด rain forecast ไม่ได้:", err);
        drawFallbackRainChart();
    } finally {
        // ✅ โหลดเสร็จ หรือ error ก็ปิด overlay
        setLoading(rainChartLoading, false);
    }
}



// ===================== เมื่อโหลดหน้าเสร็จ =====================

window.addEventListener("load", () => {
    if (riceVarietySelect && riceVarietySelect.value) {
        currentRiceVariety = riceVarietySelect.value;
    }
    if (plantingMethodSelect && plantingMethodSelect.value) {
        currentPlantingMethod = plantingMethodSelect.value;
    }

    // ถ้าอยาก preload รายชื่ออำเภอ/ตำบลของจังหวัดเริ่มต้น จะเรียกเฉพาะ subdistricts ก็ได้
    if (provinceSelect && provinceSelect.value) {
        loadSubdistrictsForProvince(provinceSelect.value);
    }

    // ❌ ไม่ต้องเรียก loadRainForecast / loadPlantingScenario ฯลฯ ในนี้แล้ว
});
