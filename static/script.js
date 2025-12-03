// ===================== GLOBAL CHART VARIABLES =====================

let rainChart = null;           // กราฟด้านบนสุด
let waterCompareChart = null;   // กราฟล่างซ้าย
let deficitChart = null;        // กราฟล่างขวา

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
                    x: { grid: { display: false } },
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
                plugins: { legend: { position: 'top' } },
                scales: {
                    x: { grid: { display: false } },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'ลบ.ม./ไร่' }
                    }
                }
            }
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
                plugins: { legend: { position: 'top' } },
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
            }
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

    // ให้เริ่มตรงกับกราฟด้านซ้าย
    riceStageBar.style.paddingLeft = leftPadding + 'px';
    // ด้านขวาชิดกรอบไปเลย
    riceStageBar.style.paddingRight = '0px';
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

    data.forEach((item, index) => {
        const cell = document.createElement("div");
        cell.className = "icon-cell";
        cell.textContent = "🌾";

        cell.dataset.index = index;
        cell.dataset.dekad = item.dekad;
        cell.dataset.dekadLabel = item.dekad_label || "";
        cell.dataset.dateStart = item.date_start || "";
        cell.dataset.dateEnd = item.date_end || "";
        cell.dataset.isPlanting = item.is_planting_period ? "1" : "0";
        cell.dataset.yieldLevel = item.yield_reduction_level ?? "";

        // tooltip
        const rangeText = item.date_start && item.date_end
            ? `${item.date_start} - ${item.date_end}`
            : "";
        const descText = item.yield_reduction_desc || "";
        cell.title = `${item.dekad_label || ""}\n${rangeText}\n${descText}`.trim();

        // แสดงช่วงที่เป็น "ช่วงปลูก" ให้เด่นขึ้น
        if (item.is_planting_period) {
            cell.classList.add("planting");
        }

        // สีตามระดับผลผลิตลดลง (0 = เขียว, 1 = เหลือง, 2 = แดง)
        const lvl = item.yield_reduction_level;
        if (lvl === 0) cell.classList.add("level-0");
        else if (lvl === 1) cell.classList.add("level-1");
        else if (lvl === 2) cell.classList.add("level-2");

        // event เมื่อกดแต่ละ dekad
        cell.addEventListener("click", () => {
            updateCostPointerFromYieldReduction([item]);
            // เปลี่ยน active
            const all = riceStageBar.querySelectorAll(".icon-cell");
            all.forEach(c => c.classList.remove("active"));
            cell.classList.add("active");

            // เรียก planting_scenario ตาม dekad นี้ (ใช้ date_start)
            const dateScenario = formatDateForScenario(item.date_start);
            if (currentAreaCode) {
                loadPlantingScenario(currentAreaCode, dateScenario);
            }
        });

        riceStageBar.appendChild(cell);
    });

    // ปรับ grid ให้มีคอลัมน์เท่าจำนวน dekad
    riceStageBar.style.gridTemplateColumns = `repeat(${data.length}, 1fr)`;

    // mark อันแรกเป็น active เริ่มต้น
    const firstCell = riceStageBar.querySelector(".icon-cell");
    if (firstCell) {
        firstCell.classList.add("active");
    }

    // sync ตำแหน่งกับกราฟ
    setTimeout(syncRiceBarToChart, 0);
}

// ===================== LEAFLET MAP =====================

const mapDiv = document.getElementById('map');
if (mapDiv) {
    const centerLatLng = [7.617, 100.077];

    const map = L.map('map').setView(centerLatLng, 11);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    L.marker(centerLatLng)
        .addTo(map)
        .bindPopup('พื้นที่ตัวอย่างปลูกข้าว<br>อ.เมือง จ.พัทลุง')
        .openPopup();
}

// ===================== YIELD REDUCTION (ปฏิทิน + ต้นทุน) =====================

async function loadYieldReduction() {
    try {
        const res = await fetch("/api/yield_reduction");
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

let currentAmphoeMap = {};
let currentAreaCode = "930606";  // ค่าเริ่มต้นตอนเปิดหน้า (พัทลุงที่ใช้ demo)

// helper แปลง '2025-09-11' -> '11-09-2025' สำหรับ planting_scenario
function formatDateForScenario(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return "";
    const [y, m, d] = parts;
    return `${d}-${m}-${y}`;
}

// โหลดข้อมูล crop_calendar ตาม area_code แล้ววาดช่องรูปข้าว
async function loadCropCalendar(areaCode) {
    if (!areaCode) return;

    try {
        const res = await fetch(
            `/api/crop_calendar?area_code=${encodeURIComponent(areaCode)}`
        );
        if (!res.ok) {
            throw new Error("HTTP " + res.status);
        }

        const data = await res.json();
        console.log("crop_calendar data:", data);

        renderRiceStageBar(data);
        // 👉 ขยับต้นทุนผลผลิตตามข้อมูล dekad ของพื้นที่นี้
        updateCostPointerFromYieldReduction(data);

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

async function loadPlantingScenario(areaCode, dateOverride) {
    if (!areaCode) return;

    // เก็บค่า areaCode ปัจจุบันไว้ใช้เวลาเปลี่ยน dekad
    currentAreaCode = areaCode;

    // ถ้ามี dateOverride ให้ส่งไปด้วย
    let url = `/api/planting_scenario?area_code=${encodeURIComponent(areaCode)}`;
    if (dateOverride) {
        url += `&date=${encodeURIComponent(dateOverride)}`;
    }

    try {
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error("HTTP " + res.status);
        }

        const data = await res.json();
        console.log("planting_scenario data:", data);

        // ---- (โค้ดเดิม: อัปเดต KPI + กราฟ) ----
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

        buildRainChart(labels, demand, supply);
        buildWaterCompareChart(labels, demand, supply);
        buildDeficitChart(labels, demand, supply);

    } catch (err) {
        console.error("โหลดข้อมูล planting_scenario ไม่ได้:", err);
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

if (subdistrictSelect) {
    subdistrictSelect.addEventListener("change", (e) => {
        const areaCode = e.target.value;
        console.log("เลือกตำบล area_code =", areaCode);

        currentAreaCode = areaCode;

        // โหลดข้อมูลน้ำตามตำบล
        loadPlantingScenario(areaCode);

        // โหลด crop_calendar มาแสดงช่องรูปข้าว
        loadCropCalendar(areaCode);
    });
}


// ===================== เมื่อโหลดหน้าเสร็จ =====================

window.addEventListener("load", () => {
    // โหลดปฏิทินความเสี่ยง
    loadYieldReduction();

    // ค่าเริ่มต้น demo: พัทลุง 930606
    const defaultArea = "930606";

    loadPlantingScenario(defaultArea);
    loadCropCalendar(defaultArea);
});

