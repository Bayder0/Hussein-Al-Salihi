// Storage
let entries = JSON.parse(localStorage.getItem('autoEntries')) || [];
let currentStudentId = null;
let currentMark = null;
let stream1 = null;
let stream2 = null;

// DOM Elements
const videoElement = document.getElementById('videoElement');
const videoElement2 = document.getElementById('videoElement2');
const canvas = document.getElementById('canvas');
const canvas2 = document.getElementById('canvas2');
const ctx = canvas.getContext('2d');
const ctx2 = canvas2.getContext('2d');

const step1Section = document.getElementById('step1Section');
const step2Section = document.getElementById('step2Section');

const captureBtn = document.getElementById('captureBtn');
const captureBtn2 = document.getElementById('captureBtn2');
const loading = document.getElementById('loading');
const loading2 = document.getElementById('loading2');

const barcodeResult = document.getElementById('barcodeResult');
const markResult = document.getElementById('markResult');
const studentIdValue = document.getElementById('studentIdValue');
const markValue = document.getElementById('markValue');
const correctMarkInput = document.getElementById('correctMark');

const nextBtn = document.getElementById('nextBtn');
const rescanBarcodeBtn = document.getElementById('rescanBarcodeBtn');
const rescanMarkBtn = document.getElementById('rescanMarkBtn');
const saveBtn = document.getElementById('saveBtn');
const exportBtn = document.getElementById('exportBtn');

const tableBody = document.getElementById('tableBody');
const countEl = document.getElementById('count');
const status = document.getElementById('status');
const guideText = document.getElementById('guideText');

// ============================================
// DEBUG FUNCTIONS - Shows logs on screen for mobile
// ============================================
let debugLogs = [];
const maxDebugLogs = 50;

function debugLog(message, type = 'info') {
    // Also log to console
    console.log(message);
    
    // Add to debug box
    const timestamp = new Date().toLocaleTimeString();
    debugLogs.push({
        time: timestamp,
        message: message,
        type: type
    });
    
    // Keep only last 50 logs
    if (debugLogs.length > maxDebugLogs) {
        debugLogs.shift();
    }
    
    updateDebugBox();
}

function updateDebugBox() {
    const debugBox = document.getElementById('debugBox');
    if (!debugBox) return;
    
    debugBox.innerHTML = debugLogs.map(log => {
        let className = 'debug-line';
        if (log.type === 'error') className += ' debug-error';
        if (log.type === 'success') className += ' debug-success';
        if (log.type === 'info') className += ' debug-info';
        
        return `<div class="${className}">[${log.time}] ${log.message}</div>`;
    }).join('');
    
    // Auto scroll to bottom
    debugBox.scrollTop = debugBox.scrollHeight;
}

function toggleDebug() {
    const debugBox = document.getElementById('debugBox');
    if (debugBox.classList.contains('show')) {
        debugBox.classList.remove('show');
    } else {
        debugBox.classList.add('show');
        updateDebugBox();
    }
}

function clearDebug() {
    debugLogs = [];
    updateDebugBox();
}

// Auto-show debug on errors
window.addEventListener('error', function(e) {
    debugLog('❌ Error: ' + e.message, 'error');
    document.getElementById('debugBox').classList.add('show');
});

debugLog('🚀 App started', 'success');

// ============================================
// CAMERA - PROPER START/STOP MANAGEMENT
// ============================================
async function startCamera1() {
    try {
        console.log('📱 Starting camera 1...');
        
        // Stop camera 1 if already running
        stopCamera1();
        
        stream1 = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        });
        
        videoElement.srcObject = stream1;
        
        // Wait for video to be ready
        await new Promise((resolve) => {
            videoElement.onloadedmetadata = () => {
                videoElement.play().then(resolve);
            };
        });
        
        console.log('✅ Camera 1 started!');
        
    } catch (err) {
        console.error('❌ Camera 1 error:', err);
        alert('❌ Camera permission required! Please allow camera access and refresh the page.');
    }
}

async function startCamera2() {
    try {
        console.log('📱 Starting camera 2...');
        
        // Stop camera 2 if already running
        stopCamera2();
        
        stream2 = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        });
        
        videoElement2.srcObject = stream2;
        
        // Wait for video to be ready
        await new Promise((resolve) => {
            videoElement2.onloadedmetadata = () => {
                videoElement2.play().then(resolve);
            };
        });
        
        console.log('✅ Camera 2 started!');
        
    } catch (err) {
        console.error('❌ Camera 2 error:', err);
        alert('❌ Camera permission required!');
    }
}

function stopCamera1() {
    if (stream1) {
        stream1.getTracks().forEach(track => {
            track.stop();
            console.log('🛑 Camera 1 track stopped');
        });
        videoElement.srcObject = null;
        stream1 = null;
    }
}

function stopCamera2() {
    if (stream2) {
        stream2.getTracks().forEach(track => {
            track.stop();
            console.log('🛑 Camera 2 track stopped');
        });
        videoElement2.srcObject = null;
        stream2 = null;
    }
}

// ============================================
// STEP 1: BARCODE
// ============================================
async function captureBarcode() {
    console.log('📸 Capturing barcode...');
    
    // Check if video is ready
    if (!videoElement.videoWidth || videoElement.videoWidth === 0) {
        alert('⚠️ Camera not ready yet. Please wait a moment.');
        return;
    }
    
    loading.classList.add('show');
    captureBtn.style.display = 'none';

    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL('image/png');
    await processBarcode(imageData);
}

async function processBarcode(imageData) {
    try {
        const result = await detectBarcode(imageData);
        
        // Always hide loading
        loading.classList.remove('show');
        
        if (result) {
            currentStudentId = result;
            studentIdValue.textContent = result;
            studentIdValue.classList.remove('error');
            barcodeResult.classList.add('show');
            
            showStatus('✅ Student ID detected! Switching to mark scanning...');
            
            // Auto-switch to step 2 after 1.5 seconds
            setTimeout(() => {
                goToStep2();
            }, 1500);
            
        } else {
            studentIdValue.textContent = '❌ Not detected';
            studentIdValue.classList.add('error');
            barcodeResult.classList.add('show');
            captureBtn.style.display = 'flex';
            
            showStatus('⚠️ Barcode not detected. Try again.');
        }
    } catch (err) {
        console.error('Error:', err);
        loading.classList.remove('show');
        captureBtn.style.display = 'flex';
        alert('❌ Error processing barcode');
    }
}

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

function goToStep2() {
    if (!currentStudentId) {
        alert('⚠️ Please scan barcode first!');
        return;
    }
    
    // Enable step 2
    step2Section.classList.remove('disabled');
    
    // Hide camera 1 capture button
    captureBtn.style.display = 'none';
    
    // Stop camera 1 and start camera 2 only if camera 2 isn't already running
    stopCamera1();
    
    // Only start camera 2 if mark hasn't been captured yet
    if (!currentMark) {
        captureBtn2.style.display = 'flex';
        startCamera2();
    }
    
    // Scroll to step 2 smoothly
    step2Section.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function rescanBarcode() {
    console.log('🔄 Rescanning barcode only...');
    
    // Reset ONLY barcode state (keep mark data!)
    currentStudentId = null;
    barcodeResult.classList.remove('show');
    captureBtn.style.display = 'flex';
    loading.classList.remove('show');
    
    // Stop camera 2 if running, but DON'T reset mark data
    stopCamera2();
    
    // Keep step 2 enabled if mark was already scanned
    // Just hide the camera 2 capture button temporarily
    if (currentMark) {
        captureBtn2.style.display = 'none';
    }
    
    // Restart camera 1
    startCamera1();
    
    // Scroll to step 1
    step1Section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================
// STEP 2: MARK DETECTION (AI-POWERED!)
// ============================================
async function captureMark() {
    console.log('📸 Capturing mark...');
    
    // Check if video is ready
    if (!videoElement2.videoWidth || videoElement2.videoWidth === 0) {
        alert('⚠️ Camera not ready yet. Please wait a moment.');
        return;
    }
    
    loading2.classList.add('show');
    captureBtn2.style.display = 'none';

    // Capture at LOWER resolution to reduce file size
    const maxWidth = 800;  // Reduced from full camera resolution
    const scale = Math.min(1, maxWidth / videoElement2.videoWidth);
    
    canvas2.width = videoElement2.videoWidth * scale;
    canvas2.height = videoElement2.videoHeight * scale;
    ctx2.drawImage(videoElement2, 0, 0, canvas2.width, canvas2.height);

    // Compress to JPEG with 70% quality instead of PNG
    const imageData = canvas2.toDataURL('image/jpeg', 0.7);
    
    debugLog('📸 Compressed image size: ' + Math.round(imageData.length / 1024) + 'KB', 'info');
    
    await processMark(imageData);
}

async function processMark(imageData) {
    try {
        const result = await detectMark(imageData);
        
        // Always hide loading
        loading2.classList.remove('show');
        
        if (result) {
            currentMark = result;
            markValue.textContent = result;
            markValue.classList.remove('error');
            correctMarkInput.value = result;
            markResult.classList.add('show');
            
            showStatus('✅ Mark detected by AI!');
        } else {
            markValue.textContent = '❌ Not detected';
            markValue.classList.add('error');
            markResult.classList.add('show');
            captureBtn2.style.display = 'flex';
            
            showStatus('⚠️ Mark not detected. Enter manually or rescan.');
        }
    } catch (err) {
        console.error('Error:', err);
        loading2.classList.remove('show');
        captureBtn2.style.display = 'flex';
        alert('❌ Error processing mark');
    }
}

/**
 * AI-POWERED MARK DETECTION
 * Uses Cloudflare Worker + OpenAI GPT-4 Vision
 */
async function detectMark(imageData) {
    try {
        debugLog('🤖 Detecting mark using AI...', 'info');
        debugLog('📸 Image size: ' + Math.round(imageData.length / 1024) + 'KB', 'info');
        
        // ✅ YOUR CLOUDFLARE WORKER URL - ALREADY SET!
        const WORKER_URL = 'https://mark-detector.baydershghl.workers.dev';
        
        debugLog('📡 Worker: ' + WORKER_URL.substring(0, 40) + '...', 'info');
        debugLog('⏰ Sending request...', 'info');
        
        // Send image to Cloudflare Worker (which calls OpenAI)
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image: imageData // Send the base64 image
            })
        });
        
        debugLog('📬 Response: ' + response.status + ' ' + response.statusText, 
                 response.ok ? 'success' : 'error');
        
        if (!response.ok) {
            const error = await response.json();
            debugLog('❌ Error: ' + JSON.stringify(error), 'error');
            
            // Show user-friendly error
            if (response.status === 401) {
                alert('❌ API Key Error!\n\nYour OpenAI API key is invalid or not set correctly in Cloudflare Worker.\n\nSteps to fix:\n1. Go to Cloudflare Worker\n2. Settings → Variables\n3. Check OPENAI_API_KEY is encrypted\n4. Try adding it again');
            } else {
                alert('❌ Worker Error!\nStatus: ' + response.status + '\n\nCheck debug log (bug button) for details.');
            }
            
            // Auto-show debug
            document.getElementById('debugBox').classList.add('show');
            return null;
        }
        
        const result = await response.json();
        debugLog('📊 Response: ' + JSON.stringify(result), 'success');
        debugLog('🔍 Mark: ' + result.mark, result.mark ? 'success' : 'error');
        
        if (result.mark) {
            debugLog(`✅ AI detected: ${result.mark}`, 'success');
            return result.mark.toString();
        } else if (result.mark === null || result.mark === undefined) {
            debugLog('❌ AI returned null/undefined', 'error');
            
            if (result.raw_response) {
                debugLog('⚠️ AI said: ' + result.raw_response, 'error');
                alert('⚠️ AI couldn\'t detect mark\n\nAI response: "' + result.raw_response + '"\n\nTry:\n• Clearer handwriting\n• Better lighting\n• Bigger numbers\n• Dark marker');
            } else {
                alert('⚠️ AI couldn\'t detect mark\n\nTry:\n• Write number BIGGER\n• Use BLACK marker\n• Good lighting\n• Fill the green frame');
            }
            
            // Auto-show debug
            document.getElementById('debugBox').classList.add('show');
            return null;
        } else {
            debugLog('⚠️ Unexpected response format', 'error');
            return null;
        }
        
    } catch (err) {
        debugLog('❌ Exception: ' + err.message, 'error');
        debugLog('❌ Stack: ' + err.stack, 'error');
        
        alert('❌ Error!\n\n' + err.message + '\n\nClick bug button (🐛) to see details.');
        
        // Auto-show debug
        document.getElementById('debugBox').classList.add('show');
        return null;
    }
}

function rescanMark() {
    console.log('🔄 Rescanning mark only...');
    
    // Reset ONLY mark state (keep barcode data!)
    currentMark = null;
    markResult.classList.remove('show');
    captureBtn2.style.display = 'flex';
    loading2.classList.remove('show');
    correctMarkInput.value = '';
    
    // Stop camera 1 if running, but DON'T reset barcode data
    stopCamera1();
    
    // Keep barcode result visible
    // Just hide the camera 1 capture button
    captureBtn.style.display = 'none';
    
    // Restart camera 2
    startCamera2();
    
    // Scroll to step 2
    step2Section.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ============================================
// SAVE
// ============================================
function saveEntry() {
    let finalMark = correctMarkInput.value || currentMark;

    if (!currentStudentId) {
        alert('⚠️ Student ID missing!');
        return;
    }

    if (!finalMark) {
        alert('⚠️ Mark missing!');
        return;
    }

    const markNum = parseInt(finalMark);
    if (isNaN(markNum) || markNum < 0 || markNum > 100) {
        alert('⚠️ Invalid mark!');
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

    showStatus(`✅ Saved: ${currentStudentId} - ${markNum}`);
    updateTable();
    resetAll();
}

function resetAll() {
    currentStudentId = null;
    currentMark = null;
    
    barcodeResult.classList.remove('show');
    markResult.classList.remove('show');
    captureBtn.style.display = 'flex';
    captureBtn2.style.display = 'flex';
    correctMarkInput.value = '';
    
    // Disable step 2, keep it visible
    step2Section.classList.add('disabled');
    
    // Scroll back to top
    step1Section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    stopCamera2();
    startCamera1();
}

// ============================================
// TABLE
// ============================================
function updateTable() {
    countEl.textContent = entries.length;

    if (entries.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #999; padding: 40px;">No entries yet</td></tr>';
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
        alert('⚠️ No data!');
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

    showStatus('💾 CSV exported!');
}

function showStatus(message) {
    status.textContent = message;
    status.classList.add('show');
    setTimeout(() => status.classList.remove('show'), 3000);
}

// ============================================
// EVENT LISTENERS
// ============================================
captureBtn.addEventListener('click', captureBarcode);
captureBtn2.addEventListener('click', captureMark);
rescanBarcodeBtn.addEventListener('click', rescanBarcode);
rescanMarkBtn.addEventListener('click', rescanMark);
saveBtn.addEventListener('click', saveEntry);
exportBtn.addEventListener('click', exportToCSV);

// ============================================
// INIT
// ============================================
debugLog('🚀 Starting app...', 'info');

if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    debugLog('⚠️ Not HTTPS! Camera may not work', 'error');
    alert('⚠️ HTTPS REQUIRED! Camera needs HTTPS. Make sure URL starts with https://');
}

updateTable();
startCamera1();

debugLog('✅ App initialized', 'success');
debugLog('📱 Click 🐛 button to see debug info', 'info');