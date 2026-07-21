// Global state variables
let leaderboardData = [];
let originalHeaders = [];
let activeConfig = {};
let countdownTimer = null;
let currentCountdown = 10;
let isSyncing = false;
let currentSearchQuery = "";

// DOM Elements
const podiumName1 = document.getElementById('podium-name-1');
const podiumScore1 = document.getElementById('podium-score-1');
const podiumName2 = document.getElementById('podium-name-2');
const podiumScore2 = document.getElementById('podium-score-2');
const podiumName3 = document.getElementById('podium-name-3');
const podiumScore3 = document.getElementById('podium-score-3');

const podiumRank1 = document.getElementById('podium-rank-1');
const podiumRank2 = document.getElementById('podium-rank-2');
const podiumRank3 = document.getElementById('podium-rank-3');

const statTotalUsers = document.getElementById('stat-total-users');
const statTotalEntries = document.getElementById('stat-total-entries');
const leaderboardItemsList = document.getElementById('leaderboard-items-list');

const searchInput = document.getElementById('search-input');
const btnClearSearch = document.getElementById('btn-clear-search');
const btnSyncNow = document.getElementById('btn-sync-now');
const syncBtnIcon = document.getElementById('sync-btn-icon');
const countdownText = document.getElementById('countdown-text');
const syncStatusMsg = document.getElementById('sync-status-msg');
const progressRingBar = document.getElementById('progress-ring-bar');
const connectionStatusText = document.getElementById('connection-status-text');

// Banner & Setup Elements
const statusBanner = document.getElementById('status-banner');
const bannerTitle = document.getElementById('banner-title');
const bannerDesc = document.getElementById('banner-desc');
const btnShowInstructions = document.getElementById('btn-show-instructions');
const btnCloseBanner = document.getElementById('btn-close-banner');
const shareInstructions = document.getElementById('share-instructions');
const sheetLinkHelper = document.getElementById('sheet-link-helper');

// Settings Drawer Elements
const settingsOverlay = document.getElementById('settings-overlay');
const settingsDrawer = document.getElementById('settings-drawer');
const floatingSettingsBtn = document.getElementById('floating-settings-btn');
const btnCloseSettings = document.getElementById('btn-close-settings');
const btnCancelSettings = document.getElementById('btn-cancel-settings');
const btnSaveSettings = document.getElementById('btn-save-settings');
const inputSheetUrl = document.getElementById('input-sheet-url');
const selectNameColumn = document.getElementById('select-name-column');
const inputSyncInterval = document.getElementById('input-sync-interval');
const checkboxDemoMode = document.getElementById('checkbox-demo-mode');
const radioDataSources = document.getElementsByName('data_source');
const googleSheetSettings = document.getElementById('google-sheet-settings');
const csvUploadSettings = document.getElementById('csv-upload-settings');

// CSV Upload Elements
const csvDropZone = document.getElementById('csv-drop-zone');
const csvFileInput = document.getElementById('csv-file-input');
const uploadStatus = document.getElementById('upload-status');

// Details Drawer Elements
const detailsOverlay = document.getElementById('details-overlay');
const detailsDrawer = document.getElementById('details-drawer');
const btnCloseDetails = document.getElementById('btn-close-details');
const detailDisplayName = document.getElementById('detail-display-name');
const detailRank = document.getElementById('detail-rank');
const detailSubmissions = document.getElementById('detail-submissions');
const detailCasingTags = document.getElementById('detail-casing-tags');
const detailTimeline = document.getElementById('detail-timeline');

// Progress ring calculations
const radius = 15;
const circumference = 2 * Math.PI * radius;
progressRingBar.style.strokeDasharray = `${circumference} ${circumference}`;
progressRingBar.style.strokeDashoffset = 0;

function setProgress(percent) {
    const offset = circumference - (percent / 100) * circumference;
    progressRingBar.style.strokeDashoffset = offset;
}

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadConfig().then(() => {
        fetchData();
        startSyncTimer();
    });
});

/* ==========================================================================
   EVENT LISTENERS
   ========================================================================== */
function setupEventListeners() {
    // Sync Button
    btnSyncNow.addEventListener('click', () => {
        fetchData(true);
        resetSyncTimer();
    });

    // Search Input
    searchInput.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value.trim().toLowerCase();
        if (currentSearchQuery.length > 0) {
            btnClearSearch.classList.remove('hidden');
        } else {
            btnClearSearch.classList.add('hidden');
        }
        filterAndRenderData();
    });

    // Clear Search Button
    btnClearSearch.addEventListener('click', () => {
        searchInput.value = '';
        currentSearchQuery = '';
        btnClearSearch.classList.add('hidden');
        filterAndRenderData();
    });

    // Floating Settings Button
    floatingSettingsBtn.addEventListener('click', openSettingsDrawer);
    btnCloseSettings.addEventListener('click', closeSettingsDrawer);
    btnCancelSettings.addEventListener('click', closeSettingsDrawer);
    settingsOverlay.addEventListener('click', closeSettingsDrawer);

    // Save Settings
    btnSaveSettings.addEventListener('click', saveSettings);

    // Toggle Settings Data Intake Mode
    radioDataSources.forEach(radio => {
        radio.addEventListener('change', (e) => {
            toggleSettingsView(e.target.value);
        });
    });

    // Close Details Drawer
    btnCloseDetails.addEventListener('click', closeDetailsDrawer);
    detailsOverlay.addEventListener('click', closeDetailsDrawer);

    // Banner Instruction Panel Toggle
    btnShowInstructions.addEventListener('click', () => {
        shareInstructions.classList.toggle('hidden');
    });
    btnCloseBanner.addEventListener('click', () => {
        statusBanner.classList.add('hidden');
    });

    // Setup CSV drag-and-drop
    setupCSVDragAndDrop();
}

/* ==========================================================================
   TIMER & POLLING ENGINE
   ========================================================================== */
function startSyncTimer() {
    if (countdownTimer) clearInterval(countdownTimer);
    
    currentCountdown = activeConfig.sync_interval || 10;
    countdownText.innerText = currentCountdown;
    setProgress(100);

    countdownTimer = setInterval(() => {
        if (isSyncing) return;
        
        currentCountdown--;
        if (currentCountdown <= 0) {
            fetchData();
        } else {
            countdownText.innerText = currentCountdown;
            const total = activeConfig.sync_interval || 10;
            const percent = (currentCountdown / total) * 100;
            setProgress(percent);
            syncStatusMsg.innerText = `Next update in ${currentCountdown}s`;
        }
    }, 1000);
}

function resetSyncTimer() {
    startSyncTimer();
}

/* ==========================================================================
   NETWORK API SERVICE CALLS
   ========================================================================== */
async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        activeConfig = await response.json();
        
        // Update settings UI values
        inputSheetUrl.value = activeConfig.sheet_url || '';
        inputSyncInterval.value = activeConfig.sync_interval || 10;
        checkboxDemoMode.checked = activeConfig.demo_mode || false;
        
        // Select appropriate radio source
        const radio = document.querySelector(`input[name="data_source"][value="${activeConfig.data_source}"]`);
        if (radio) {
            radio.checked = true;
            toggleSettingsView(activeConfig.data_source);
        }
    } catch (e) {
        console.error("Failed to load backend configurations", e);
    }
}

async function saveSettings() {
    const selectedSource = document.querySelector('input[name="data_source"]:checked').value;
    const syncInterval = parseInt(inputSyncInterval.value) || 10;
    const demoMode = checkboxDemoMode.checked;
    const sheetUrl = inputSheetUrl.value.trim();
    const nameColumn = selectNameColumn.value || null;

    const payload = {
        data_source: selectedSource,
        sync_interval: syncInterval,
        demo_mode: demoMode,
        sheet_url: sheetUrl,
        name_column: nameColumn
    };

    try {
        const response = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        
        if (result.status === 'success') {
            activeConfig = result.config;
            closeSettingsDrawer();
            fetchData(true);
            resetSyncTimer();
        } else {
            alert("Failed to save settings: " + result.message);
        }
    } catch (e) {
        console.error("Settings save error", e);
        alert("An error occurred while saving configs.");
    }
}

async function fetchData(isManualSync = false) {
    if (isSyncing) return;
    
    isSyncing = true;
    btnSyncNow.classList.add('syncing');
    
    // Pulse animation on the progress ring
    progressRingBar.style.animation = 'pulseGlow 1.5s infinite ease-in-out';
    syncStatusMsg.innerText = "Syncing with Google Sheets...";
    countdownText.innerText = "...";
    setProgress(100);

    try {
        const response = await fetch('/api/leaderboard');
        const result = await response.json();
        
        // Check for unauthorized states or errors
        handleAPIResponseStatus(response.status, result);
        
        leaderboardData = result.data || [];
        originalHeaders = result.headers || [];
        
        // Update column selector dropdown in Settings Drawer
        populateColumnSelector(originalHeaders, result.name_column);
        
        // Calculate statistics totals
        updateStatistics(leaderboardData);
        
        // Render data sections
        filterAndRenderData();

        // Successful sync feedback
        syncStatusMsg.innerText = "Synced!";
        syncStatusMsg.style.color = '#10b981'; // Green
        setTimeout(() => {
            syncStatusMsg.style.color = ''; // Reset
        }, 2000);

    } catch (error) {
        console.error("Sync error occurred", error);
        connectionStatusText.innerText = "Connection lost";
        connectionStatusText.classList.add('offline');
        showBanner("Connection Lost", "Failed to connect to the leaderboard backend server.", true);
    } finally {
        isSyncing = false;
        btnSyncNow.classList.remove('syncing');
        progressRingBar.style.animation = ''; // Remove animation
        
        // Restart the countdown only AFTER the sync completes
        currentCountdown = activeConfig.sync_interval || 10;
        countdownText.innerText = currentCountdown;
        setProgress(100);
        syncStatusMsg.innerText = `Next update in ${currentCountdown}s`;
    }
}

/* ==========================================================================
   UI STATE & RENDER METHODS
   ========================================================================== */
function handleAPIResponseStatus(statusCode, result) {
    if (result.status === 'success') {
        statusBanner.classList.add('hidden');
        connectionStatusText.classList.remove('offline');
        if (result.source === 'csv_upload') {
            connectionStatusText.innerText = "Using Local CSV Data";
        } else {
            connectionStatusText.innerText = "Synced with Google Sheets";
        }
    } else if (result.status === 'demo') {
        connectionStatusText.innerText = "Running Demo Mode";
        connectionStatusText.classList.add('offline');
        showBanner("Running in Demo Mode", "Click settings at bottom left to hook up your own Google Sheet URL.", false);
    } else if (statusCode === 401 || result.status === 'unauthorized') {
        connectionStatusText.innerText = "Private Sheet (Auth Error)";
        connectionStatusText.classList.add('offline');
        
        // Configure helper link
        sheetLinkHelper.href = activeConfig.sheet_url;
        showBanner(
            "Google Sheet Access Blocked", 
            result.message || "The spreadsheet requires Google sign-in. Leaderboard running in Demo Mode.",
            true
        );
    } else if (result.status === 'no_csv') {
        connectionStatusText.innerText = "Waiting for CSV file";
        connectionStatusText.classList.add('offline');
        showBanner("Offline CSV Mode Active", result.message || "Please upload a CSV file inside the Settings configuration panel.", false);
    } else {
        connectionStatusText.innerText = "Error Fetching Data";
        connectionStatusText.classList.add('offline');
        showBanner("Sync Error", result.message || "An error occurred while fetching spreadsheet records.", false);
    }
}

function showBanner(title, description, showInstructionBtn = false) {
    bannerTitle.innerText = title;
    bannerDesc.innerText = description;
    statusBanner.classList.remove('hidden');
    
    if (showInstructionBtn) {
        btnShowInstructions.classList.remove('hidden');
    } else {
        btnShowInstructions.classList.add('hidden');
        shareInstructions.classList.add('hidden');
    }
}

function updateStatistics(data) {
    statTotalUsers.innerText = data.length;
    
    const sumEntries = data.reduce((acc, current) => acc + current.count, 0);
    statTotalEntries.innerText = sumEntries;
}

function populateColumnSelector(headers, selectedValue) {
    // Keep existing option if no headers
    if (!headers || headers.length === 0) return;
    
    // Clear and build options
    selectNameColumn.innerHTML = '<option value="">Auto-Detect Column</option>';
    headers.forEach(h => {
        const option = document.createElement('option');
        option.value = h;
        option.innerText = h;
        if (h === selectedValue) {
            option.selected = true;
        }
        selectNameColumn.appendChild(option);
    });
}

function toggleSettingsView(source) {
    if (source === 'csv_upload') {
        googleSheetSettings.classList.add('hidden');
        csvUploadSettings.classList.remove('hidden');
    } else {
        googleSheetSettings.classList.remove('hidden');
        csvUploadSettings.classList.add('hidden');
    }
}

/* ==========================================================================
   LEADERBOARD RENDER & ANIMATION CORE (FLIP TECHNIQUE)
   ========================================================================== */
function filterAndRenderData() {
    // 1. Separate data: Top 3 podium items (only if no active search)
    let filteredData = leaderboardData;
    
    if (currentSearchQuery.length > 0) {
        filteredData = leaderboardData.filter(item => 
            item.display_name.toLowerCase().includes(currentSearchQuery)
        );
    }
    
    // Render Podium
    renderPodium(filteredData);
    
    // Render Grid/Table Rows
    // If searching, we show all results in the list (including top ranks).
    // If not searching, podium shows top 3 index items, so list only renders index 3 onwards
    let listItems = [];
    if (currentSearchQuery.length > 0) {
        listItems = filteredData;
    } else {
        listItems = filteredData.slice(3); // Slice everything from index 3 onwards
    }
    
    renderLeaderboardList(listItems);
}

function renderPodium(items) {
    // If search is active, hide podium completely since search is linear
    if (currentSearchQuery.length > 0) {
        document.getElementById('podium-container').style.display = 'none';
        return;
    }
    
    document.getElementById('podium-container').style.display = 'flex';

    // Find entries by sorted array index instead of rank matching
    // (This guarantees ties in Ranks 1, 2, or 3 do not hide participants)
    const rank1Item = leaderboardData[0]; // 1st Place
    const rank2Item = leaderboardData[1]; // 2nd Place
    const rank3Item = leaderboardData[2]; // 3rd Place

    // Render Rank 1
    if (rank1Item) {
        podiumName1.innerText = rank1Item.display_name;
        podiumScore1.innerText = rank1Item.count;
        podiumRank1.classList.remove('hidden');
        document.getElementById('podium-btn-1').onclick = () => openDetails(rank1Item.username);
    } else {
        podiumName1.innerText = "-";
        podiumScore1.innerText = "0";
        document.getElementById('podium-btn-1').onclick = null;
    }

    // Render Rank 2
    if (rank2Item) {
        podiumName2.innerText = rank2Item.display_name;
        podiumScore2.innerText = rank2Item.count;
        podiumRank2.classList.remove('hidden');
        document.getElementById('podium-btn-2').onclick = () => openDetails(rank2Item.username);
    } else {
        podiumName2.innerText = "-";
        podiumScore2.innerText = "0";
        document.getElementById('podium-btn-2').onclick = null;
    }

    // Render Rank 3
    if (rank3Item) {
        podiumName3.innerText = rank3Item.display_name;
        podiumScore3.innerText = rank3Item.count;
        podiumRank3.classList.remove('hidden');
        document.getElementById('podium-btn-3').onclick = () => openDetails(rank3Item.username);
    } else {
        podiumName3.innerText = "-";
        podiumScore3.innerText = "0";
        document.getElementById('podium-btn-3').onclick = null;
    }
}

function renderLeaderboardList(items) {
    // 1. FIRST: Capture the vertical screen positions of all existing rows
    const firstRects = {};
    const existingRows = leaderboardItemsList.querySelectorAll('.leaderboard-row');
    existingRows.forEach(row => {
        const id = row.dataset.id;
        if (id) {
            firstRects[id] = row.getBoundingClientRect().top;
        }
    });

    // 2. Modify DOM: Rebuild list items
    leaderboardItemsList.innerHTML = '';
    
    if (items.length === 0) {
        leaderboardItemsList.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v-2M12 11a4 4 0 100-8 4 4 0 000 8z"/></svg>
                <p>No participants found in list.</p>
            </div>
        `;
        return;
    }

    items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'leaderboard-row';
        row.dataset.id = item.username;
        
        let badgeClass = '';
        if (item.rank === 1) badgeClass = 'top-rank-1';
        else if (item.rank === 2) badgeClass = 'top-rank-2';
        else if (item.rank === 3) badgeClass = 'top-rank-3';

        row.innerHTML = `
            <div class="col-rank">
                <div class="rank-badge ${badgeClass}">${item.rank}</div>
            </div>
            <div class="col-name">
                <div class="participant-name-container">
                    <div class="avatar-sm">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v-2M12 11a4 4 0 100-8 4 4 0 000 8z"/></svg>
                    </div>
                    <span>${item.display_name}</span>
                </div>
            </div>
            <div class="col-score">
                <span class="row-score-value">${item.count}</span>
            </div>
            <div class="col-action">
                <button class="btn btn-sm btn-outline btn-row-details">View Details</button>
            </div>
        `;

        row.querySelector('.btn-row-details').addEventListener('click', () => openDetails(item.username));
        leaderboardItemsList.appendChild(row);
    });

    // 3. LAST & INVERT: Measure new positions and immediately invert via transform offsets
    const newRows = leaderboardItemsList.querySelectorAll('.leaderboard-row');
    newRows.forEach(row => {
        const id = row.dataset.id;
        const firstTop = firstRects[id];
        
        if (firstTop !== undefined) {
            const lastTop = row.getBoundingClientRect().top;
            const deltaY = firstTop - lastTop;
            
            if (deltaY !== 0) {
                // Instantly displace element back to where it was (disable transition)
                row.style.transform = `translateY(${deltaY}px)`;
                row.style.transition = 'none';
                
                // 4. PLAY: Wait for next frame, add movement classes, and slide back to natural index position
                requestAnimationFrame(() => {
                    row.classList.add('row-move');
                    row.style.transform = '';
                });
                
                // Remove transition class after animation completes to reset layout rules
                setTimeout(() => {
                    row.classList.remove('row-move');
                }, 600);
            }
        } else {
            // Animating newly spawned elements
            row.style.opacity = '0';
            row.style.transform = 'translateY(20px)';
            requestAnimationFrame(() => {
                row.style.transition = 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
                row.style.opacity = '1';
                row.style.transform = '';
            });
        }
    });
}

/* ==========================================================================
   DETAILS DRAWER MODAL SYSTEM
   ========================================================================== */
function openDetails(username) {
    const user = leaderboardData.find(item => item.username === username);
    if (!user) return;

    detailDisplayName.innerText = user.display_name;
    detailRank.innerText = `#${user.rank}`;
    detailSubmissions.innerText = user.count;

    // 1. Gather distinct casing spellings count
    const casingsMap = {};
    user.entries.forEach(entry => {
        const raw = entry.raw_casing;
        casingsMap[raw] = (casingsMap[raw] || 0) + 1;
    });

    // Render casing variation tags
    detailCasingTags.innerHTML = '';
    Object.keys(casingsMap).forEach(tag => {
        const span = document.createElement('span');
        span.className = 'casing-tag';
        span.innerHTML = `${tag} <span>x${casingsMap[tag]}</span>`;
        detailCasingTags.appendChild(span);
    });

    // 2. Render Timeline Entries
    detailTimeline.innerHTML = '';
    if (user.entries.length === 0) {
        detailTimeline.innerHTML = '<p class="text-muted text-sm">No entries available.</p>';
    } else {
        user.entries.forEach(entry => {
            const item = document.createElement('div');
            item.className = 'timeline-item';
            
            // Format Timestamp string neatly
            const timeVal = entry.timestamp ? entry.timestamp : 'Date Unknown';
            
            item.innerHTML = `
                <div class="timeline-time">${timeVal}</div>
                <div class="timeline-content">
                    <div>Spelled as: <span class="timeline-spelling">${entry.raw_casing}</span></div>
                </div>
            `;
            detailTimeline.appendChild(item);
        });
    }

    // Toggle open classes
    detailsOverlay.classList.remove('hidden');
    detailsDrawer.classList.add('open');
    detailsDrawer.classList.remove('hidden');
}

function closeDetailsDrawer() {
    detailsOverlay.classList.add('hidden');
    detailsDrawer.classList.remove('open');
}

/* ==========================================================================
   SETTINGS DRAWER MODAL SYSTEM
   ========================================================================== */
function openSettingsDrawer() {
    loadConfig();
    settingsOverlay.classList.remove('hidden');
    settingsDrawer.classList.add('open');
    settingsDrawer.classList.remove('hidden');
}

function closeSettingsDrawer() {
    settingsOverlay.classList.add('hidden');
    settingsDrawer.classList.remove('open');
}

/* ==========================================================================
   LOCAL CSV DRAG AND DROP FUNCTIONALITY
   ========================================================================== */
function setupCSVDragAndDrop() {
    csvDropZone.addEventListener('click', () => csvFileInput.click());

    csvFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleCSVFileUpload(file);
    });

    // Drag-over highlights
    ['dragenter', 'dragover'].forEach(eventName => {
        csvDropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            csvDropZone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        csvDropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            csvDropZone.classList.remove('dragover');
        }, false);
    });

    // Drop handler
    csvDropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const file = dt.files[0];
        if (file) handleCSVFileUpload(file);
    });
}

async function handleCSVFileUpload(file) {
    if (!file.name.endsWith('.csv')) {
        showUploadStatus("Error: File must be a .csv format", "error");
        return;
    }

    const formData = new FormData();
    formData.append('file', file);
    showUploadStatus("Uploading CSV...", "success");

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        
        if (result.status === 'success') {
            showUploadStatus(`Success! Loaded ${file.name}`, "success");
            
            // Sync current configurations & states
            await loadConfig();
            
            // Refresh data immediately
            fetchData(true);
            resetSyncTimer();
        } else {
            showUploadStatus(result.message || "Failed to process uploaded file", "error");
        }
    } catch (e) {
        console.error("CSV Upload failed", e);
        showUploadStatus("Network error uploading CSV.", "error");
    }
}

function showUploadStatus(message, type) {
    uploadStatus.innerText = message;
    uploadStatus.className = `upload-status-msg ${type}`;
    uploadStatus.classList.remove('hidden');
}
