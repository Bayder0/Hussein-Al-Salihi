// Storage
let entries = JSON.parse(localStorage.getItem('autoEntries')) || [];
let currentStudentId = null;
let currentMark = null;
let stream = null;

// DOM Elements
const videoElement = document.getElementById('videoElement');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const captureBtn = document.getElementById('captureBtn');
const loading = document.getElementById('loading');

const resultsContainer = document.getElementById('resultsContainer');
const studentIdValue = document.getElementById('studentIdValue');
const markValue = document.getElementById('markValue');
const correctMarkInput = document.getElementById('correctMark');

const rescanBtn = document.getElementById('rescanBtn');
const saveBtn = document.getElementById('saveBtn');
const exportBtn = document.getElementById('exportBtn');

const tableBody = document.getElementById('tableBody');
const countEl = document.getElementById('count');
const status = document.getElementById('status');

// ============================================
// CAMERA MANAGEMENT
// ============================================
async function startCamera() {
    try {
        console.log('📱 Starting camera...');
        
        stopCamera();
        
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        });
        
        videoElement.srcObject = stream;
        
        await new Promise((resolve) => {
            videoElement.onloadedmetadata = () => {
                videoElement.play().then(resolve);
            };
        });
        
        console.log('✅ Camera started!');
        
    } catch (err) {
        console.error('❌ Camera error:', err);
        alert('❌ يرجى السماح بالوصول للكاميرا وتحديث الصفحة');
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => {
            track.stop();
            console.log('🛑 Camera track stopped');
        });
        videoElement.srcObject = null;
        stream = null;
    }
}

// ============================================
// CAPTURE AND PROCESS - ONE STEP!
// ============================================
async function captureImage() {
    console.log('📸 Capturing image...');
    
    if (!videoElement.videoWidth || videoElement.videoWidth === 0) {
        alert('⚠️ انتظر قليلاً حتى تصبح الكاميرا جاهزة');
        return;
    }
    
    loading.classList.add('show');
    captureBtn.style.display = 'none';

    // Capture image
    const maxWidth = 800;
    const scale = Math.min(1, maxWidth / videoElement.videoWidth);
    
    canvas.width = videoElement.videoWidth * scale;
    canvas.height = videoElement.videoHeight * scale;
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL('image/jpeg', 0.7);
    
    console.log('📸 Image size: ' + Math.round(imageData.length / 1024) + 'KB');
    
    // Process BOTH barcode and mark
    await processBoth(imageData);
}

async function processBoth(imageData) {
    try {
        console.log('🔍 Processing barcode and mark...');
        
        // Process barcode and mark in parallel
        const [barcodeResult, markResult] = await Promise.all([
            detectBarcode(imageData),
            detectMark(imageData)
        ]);
        
        loading.classList.remove('show');
        
        // Display barcode result
        if (barcodeResult) {
            currentStudentId = barcodeResult;
            studentIdValue.textContent = barcodeResult;
            studentIdValue.classList.remove('error');
            console.log('✅ Barcode: ' + barcodeResult);
        } else {
            currentStudentId = null;
            studentIdValue.textContent = '❌ لم يتم الكشف';
            studentIdValue.classList.add('error');
            console.log('❌ Barcode not detected');
        }
        
        // Display mark result
        if (markResult) {
            currentMark = markResult;
            markValue.textContent = markResult;
            markValue.classList.remove('error');
            correctMarkInput.value = markResult;
            console.log('✅ Mark: ' + markResult);
        } else {
            currentMark = null;
            markValue.textContent = '❌ لم يتم الكشف';
            markValue.classList.add('error');
            correctMarkInput.value = '';
            console.log('❌ Mark not detected');
        }
        
        // Show results
        resultsContainer.classList.add('show');
        
        // Show status
        if (barcodeResult && markResult) {
            showStatus('✅ تم الكشف بنجاح!');
        } else if (barcodeResult || markResult) {
            showStatus('⚠️ تم الكشف جزئياً - تحقق من النتائج');
        } else {
            showStatus('❌ لم يتم الكشف - حاول مجدداً');
            captureBtn.style.display = 'flex';
        }
        
    } catch (err) {
        console.error('Error:', err);
        loading.classList.remove('show');
        captureBtn.style.display = 'flex';
        alert('❌ خطأ في معالجة الصورة');
    }
}

// ============================================
// BARCODE DETECTION
// ============================================
function detectBarcode(imageData) {
    return new Promise((resolve) => {
        Quagga.decodeSingle({
            src: imageData,
            numOfWorkers: 0,
            decoder: {
                readers: [
                    "code_128_reader",
                    "ean_reader",
                    "ean_8_reader",
                    "code_39_reader",
                    "upc_reader"
                ]
            },
            locate: true
        }, function(result) {
            if (result && result.codeResult) {
                console.log('✅ Barcode:', result.codeResult.code);
                resolve(result.codeResult.code);
            } else {
                console.log('❌ No barcode');
                resolve(null);
            }
        });
    });
}

// ============================================
// AI MARK DETECTION
// ============================================
async function detectMark(imageData) {
    try {
        console.log('🤖 Detecting mark using AI...');
        
        const WORKER_URL = 'https://mark-detector.baydershghl.workers.dev';
        
        console.log('📡 Sending to Worker...');
        
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image: imageData
            })
        });
        
        console.log('📬 Response: ' + response.status);
        
        if (!response.ok) {
            const error = await response.json();
            console.error('❌ Error:', error);
            
            if (response.status === 401) {
                alert('❌ خطأ في مفتاح API! تحقق من إعدادات Cloudflare Worker');
            } else {
                alert('❌ خطأ في Worker! الحالة: ' + response.status);
            }
            
            return null;
        }
        
        const result = await response.json();
        console.log('📊 Result:', result);
        
        if (result.mark) {
            console.log(`✅ AI detected: ${result.mark}`);
            return result.mark.toString();
        } else {
            console.log('❌ AI returned null');
            
            if (result.raw_response) {
                console.log('⚠️ AI said: ' + result.raw_response);
            }
            
            return null;
        }
        
    } catch (err) {
        console.error('❌ Exception:', err);
        return null;
    }
}

// ============================================
// RESCAN
// ============================================
function rescan() {
    console.log('🔄 Rescanning...');
    
    currentStudentId = null;
    currentMark = null;
    
    resultsContainer.classList.remove('show');
    captureBtn.style.display = 'flex';
    loading.classList.remove('show');
    correctMarkInput.value = '';
    
    startCamera();
}

// ============================================
// SAVE
// ============================================
function saveEntry() {
    let finalMark = correctMarkInput.value || currentMark;

    if (!currentStudentId) {
        alert('⚠️ رقم الطالب مفقود!');
        return;
    }

    if (!finalMark) {
        alert('⚠️ الدرجة مفقودة!');
        return;
    }

    const markNum = parseInt(finalMark);
    if (isNaN(markNum) || markNum < 0 || markNum > 100) {
        alert('⚠️ درجة غير صحيحة!');
        return;
    }

    const entry = {
        id: Date.now(),
        studentId: currentStudentId,
        mark: markNum,
        timestamp: new Date().toLocaleString()
    };

    entries.unshift(entry);
    localStorage.setItem('autoEntries', JSON.stringify(entries));

    showStatus(`✅ تم الحفظ: ${currentStudentId} - ${markNum}`);
    updateTable();
    resetAll();
}

function resetAll() {
    currentStudentId = null;
    currentMark = null;
    
    resultsContainer.classList.remove('show');
    captureBtn.style.display = 'flex';
    correctMarkInput.value = '';
    
    startCamera();
}

// ============================================
// TABLE
// ============================================
function updateTable() {
    countEl.textContent = entries.length;

    if (entries.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #999; padding: 40px;">لا توجد بيانات</td></tr>';
        return;
    }

    tableBody.innerHTML = entries.map((entry, index) => `
        <tr>
            <td>${index + 1}</td>
            <td><strong>${entry.studentId}</strong></td>
            <td><span style="font-size: 1.5em; font-weight: bold; color: ${getColor(entry.mark)}">${entry.mark}</span></td>
            <td style="font-size: 0.9em;">${entry.timestamp}</td>
        </tr>
    `).join('');
}

function getColor(mark) {
    if (mark >= 90) return '#10b981';
    if (mark >= 70) return '#3b82f6';
    if (mark >= 50) return '#f59e0b';
    return '#ef4444';
}

function exportToCSV() {
    if (entries.length === 0) {
        alert('⚠️ لا توجد بيانات!');
        return;
    }

    const csv = [
        ['Student ID', 'Mark', 'Timestamp'],
        ...entries.map(e => [e.studentId, e.mark, e.timestamp])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marks-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showStatus('💾 تم التصدير!');
}

function showStatus(message) {
    status.textContent = message;
    status.classList.add('show');
    setTimeout(() => status.classList.remove('show'), 3000);
}

// ============================================
// EVENT LISTENERS
// ============================================
captureBtn.addEventListener('click', captureImage);
rescanBtn.addEventListener('click', rescan);
saveBtn.addEventListener('click', saveEntry);
exportBtn.addEventListener('click', exportToCSV);

// ============================================
// INIT
// ============================================
console.log('🚀 Starting app...');

if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    console.warn('⚠️ Not HTTPS! Camera may not work');
    alert('⚠️ HTTPS مطلوب! الكاميرا تحتاج HTTPS.');
}

updateTable();
startCamera();

console.log('✅ App initialized');