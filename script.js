let students = JSON.parse(localStorage.getItem("students")) || [];
let attendance = JSON.parse(localStorage.getItem("attendance")) || [];

document.getElementById('generateBtn').addEventListener('click', () => {
    let name = document.getElementById('name').value.trim();
    let roll = document.getElementById('roll').value.trim();
    let department = document.getElementById('department') ? document.getElementById('department').value : '';
    let qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = "";

    if (!name || !roll) {
        alert('Please Enter both name and roll number')
        return;
    }

    if (!department) {
        alert('Please enter Department');
        return;
    }

    const qrData = `${roll}|${name}|${department}`;
    new QRCode(qrContainer, {
        text: qrData,
        width: 180,
        height: 180,
    })

    if (!students.some((s) => s.roll === roll)) {
        students.push({ roll, name, department })
        localStorage.setItem('students', JSON.stringify(students));
    }

    const qrDisplayContainer = document.getElementById("qrDisplayContainer");
    const userInfo = document.getElementById("userInfo")
    userInfo.innerHTML = `<strong>Name:</strong> ${name} <br> <strong>Roll:</strong> ${roll} <br> <strong>Department:</strong> ${department}`;
    qrDisplayContainer.style.display = 'block';

    document.getElementById("name").value = '';
    document.getElementById("roll").value = '';
    // clear department input as well
    const deptEl = document.getElementById("department");
    if (deptEl) deptEl.value = '';
    displayAttendance()
})

function onScanSuccess(decodedText, decodedResult) {
    const parts = (decodedText || '').split('|');
    const roll = (parts[0] || '').trim();
    const name = (parts[1] || '').trim();
    const department = (parts[2] || '').trim();

    if (!roll || !name) {
        alert('Invalid QR Code!');
        return;
    }

    const now = new Date();
    const date = now.toLocaleDateString();
    const time = now.toLocaleTimeString();

    // Reload attendance from storage to avoid stale data
    const stored = JSON.parse(localStorage.getItem('attendance')) || [];

    // Prevent multiple scans for the same user on the same date
    const alreadyMarked = stored.some(item => item.roll === roll && item.date === date);
    if (alreadyMarked) {
        const statusEl = document.getElementById('scanStatus');
        if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.style.background = '#fff3cd';
            statusEl.style.color = '#856404';
            statusEl.innerText = 'Attendance already marked for this user today.';
            setTimeout(() => {
                statusEl.style.display = 'none';
                statusEl.innerText = '';
            }, 3000);
        } else {
            alert('Attendance already marked for this user today.');
        }
        return;
    }

    const entry = {
        roll,
        name,
        department,
        status: 'Present',
        date: date,
        time: time
    };

    stored.push(entry);
    localStorage.setItem('attendance', JSON.stringify(stored));
    // update in-memory array too
    attendance = stored;
    displayAttendance();
}

function onScanError(err) {
    console.log('scan error', err)
    const statusEl = document.getElementById('scanStatus');
    if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.style.background = '#fff3cd';
        statusEl.style.color = '#856404';
        const msg = (err && err.message) ? err.message : String(err || 'Unknown error');
        statusEl.innerText = 'Scanner error: ' + msg;
        setTimeout(() => {
            statusEl.style.display = 'none';
            statusEl.innerText = '';
        }, 4000);
    }
}

// Prefer manual Html5Qrcode control (better camera error handling) when available
let html5QrCode = null;
let currentCameraId = null;

function populateCameras() {
    const select = document.getElementById('cameraSelect');
    if (!select || typeof Html5Qrcode === 'undefined') return;
    select.innerHTML = '';
    Html5Qrcode.getCameras().then(cameras => {
        if (!cameras || cameras.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.text = 'No cameras found';
            select.appendChild(opt);
            return;
        }
        cameras.forEach((cam, idx) => {
            const opt = document.createElement('option');
            opt.value = cam.id;
            opt.text = cam.label || `Camera ${idx + 1}`;
            select.appendChild(opt);
        });
        // enable start button if cameras found
        const startBtn = document.getElementById('startScanBtn');
        if (startBtn) startBtn.disabled = false;
    }).catch(err => {
        console.warn('Could not get cameras', err);
        const opt = document.createElement('option');
        opt.value = '';
        opt.text = 'Unable to access cameras';
        select.appendChild(opt);
    });
}

function startScanner() {
    const select = document.getElementById('cameraSelect');
    const startBtn = document.getElementById('startScanBtn');
    const stopBtn = document.getElementById('stopScanBtn');
    const statusEl = document.getElementById('scanStatus');

    if (!select) return;
    const cameraId = select.value || null;
    if (!cameraId) {
        if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.style.background = '#f8d7da';
            statusEl.style.color = '#721c24';
            statusEl.innerText = 'Please select a camera first.';
            setTimeout(() => {
                statusEl.style.display = 'none';
                statusEl.innerText = '';
            }, 3000);
        }
        return;
    }

    if (!html5QrCode && typeof Html5Qrcode !== 'undefined') {
        try {
            html5QrCode = new Html5Qrcode('reader');
        } catch (e) {
            console.error('Html5Qrcode init failed', e);
            if (statusEl) {
                statusEl.style.display = 'block';
                statusEl.style.background = '#f8d7da';
                statusEl.style.color = '#721c24';
                statusEl.innerText = 'Failed to initialize scanner.';
            }
            return;
        }
    }

    const config = { fps: 10, qrbox: 250 };
    html5QrCode.start(cameraId, config, (decodedText, decodedResult) => {
        try { onScanSuccess(decodedText, decodedResult); } catch (e) { console.error(e); }
    }, (errorMessage) => {
        // non-fatal scan error
        onScanError(errorMessage);
    }).then(() => {
        currentCameraId = cameraId;
        if (startBtn) startBtn.disabled = true;
        if (stopBtn) stopBtn.disabled = false;
        if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.style.background = '#d4edda';
            statusEl.style.color = '#155724';
            statusEl.innerText = 'Camera started.';
            setTimeout(() => {
                statusEl.style.display = 'none';
                statusEl.innerText = '';
            }, 1500);
        }
    }).catch(err => {
        console.error('Start failed', err);
        if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.style.background = '#f8d7da';
            statusEl.style.color = '#721c24';
            statusEl.innerText = 'Failed to start camera: ' + (err && err.message ? err.message : String(err));
        }
    });
}

function stopScanner() {
    const startBtn = document.getElementById('startScanBtn');
    const stopBtn = document.getElementById('stopScanBtn');
    const statusEl = document.getElementById('scanStatus');
    if (!html5QrCode) return;
    html5QrCode.stop().then(() => {
        try { html5QrCode.clear(); } catch (e) {}
        currentCameraId = null;
        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
        if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.style.background = '#d1ecf1';
            statusEl.style.color = '#0c5460';
            statusEl.innerText = 'Camera stopped.';
            setTimeout(() => {
                statusEl.style.display = 'none';
                statusEl.innerText = '';
            }, 1200);
        }
    }).catch(err => {
        console.warn('Stop failed', err);
        if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.style.background = '#f8d7da';
            statusEl.style.color = '#721c24';
            statusEl.innerText = 'Failed to stop camera: ' + (err && err.message ? err.message : String(err));
        }
    });
}

function initCameraUI() {
    try {
        populateCameras();
    } catch (e) {
        console.warn('populateCameras failed', e);
    }
    const startBtn = document.getElementById('startScanBtn');
    const stopBtn = document.getElementById('stopScanBtn');
    const select = document.getElementById('cameraSelect');

    if (startBtn) startBtn.addEventListener('click', startScanner);
    if (stopBtn) stopBtn.addEventListener('click', stopScanner);
    if (select) select.addEventListener('change', () => {
        const startBtn = document.getElementById('startScanBtn');
        if (startBtn) startBtn.disabled = false;
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCameraUI);
} else {
    // DOM already ready
    initCameraUI();
}

window.addEventListener('beforeunload', () => {
    if (html5QrCode) {
        try { html5QrCode.stop().catch(() => {}); } catch (e) {}
    }
});

function displayAttendance() {
    const tbody = document.querySelector("#attendanceTable tbody")
    tbody.innerHTML = ""

    const data = JSON.parse(localStorage.getItem("attendance")) || [];

    const countMap = {}
    data.forEach(item => {
        if (!countMap[item.roll]) {
            countMap[item.roll] = {
                name: item.name,
                department: item.department || '',
                count: 0,
                status: item.status,
                lastDate: item.date || '',
                lastTime: item.time || ''
            }
        }
        countMap[item.roll].count++;
        // Update last date, time and department
        if (item.date && item.time) {
            countMap[item.roll].lastDate = item.date;
            countMap[item.roll].lastTime = item.time;
        }
        if (item.department) {
            countMap[item.roll].department = item.department;
        }
    });

    Object.entries(countMap).forEach(([roll, info]) => {
        let row = `
            <tr> 
                <td>${roll}</td>
                <td>${info.name}</td>
                <td>${info.department}</td>
                <td style=\"color: green; font-weight: bold;\">${info.status}</td>
                <td>${info.lastDate}</td>
                <td>${info.lastTime}</td>
                <td style=\"color: blue;\">${info.count}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    })
}

displayAttendance();

document.getElementById('downloadQrBtn').addEventListener('click', () => {
    const qrDisplayContainer = document.getElementById('qrDisplayContainer');
    html2canvas(qrDisplayContainer).then(canvas => {
        const link = document.createElement('a');
        link.download = 'qr_code.png';
        link.href = canvas.toDataURL();
        link.click();
    })
})